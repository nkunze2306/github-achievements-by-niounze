// Optional GitLab source: returns only commits that were authored by YOU.
//
// Configuration (all via environment, nothing is read when GITLAB_SOURCES is empty):
//   GITLAB_SOURCES        JSON array: [{ "host": "https://gitlab.example.org", "token": "<personal access token, scope read_api>" }]
//   GITLAB_AUTHOR_EMAILS  comma separated list of your commit e-mail addresses (a commit counts only if its author e-mail is in this list)
//   GITLAB_MAX_PAGES      pages of 100 commits per project (default 50)
//
// What counts: commits of projects you are a member of whose author e-mail is one of yours. Merge commits keep their
// parent count so the callers can leave them out of line statistics, exactly like the GitHub commits.
// What never happens: no project names, no commit messages and no tokens are logged; the token is only ever sent to the
// configured host (redirects are not followed, so it cannot leak to another host).
const MAX_PAGES = Number(process.env.GITLAB_MAX_PAGES || 50);

function parseSources() {
  const raw = (process.env.GITLAB_SOURCES || '').trim();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return (Array.isArray(list) ? list : []).filter((s) => s && s.host && s.token).map((s) => ({ host: String(s.host).replace(/\/+$/, ''), token: String(s.token).trim() }));
  } catch { console.warn('GitLab: GITLAB_SOURCES is not valid JSON, GitLab skipped'); return []; }
}

async function get(host, token, path) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt * attempt));
    try {
      const res = await fetch(`${host}/api/v4${path}`, { redirect: 'manual', headers: { 'PRIVATE-TOKEN': token } });
      if (res.status >= 300 && res.status < 400) throw new Error(`HTTP ${res.status} redirect (not followed)`);
      if (res.status === 429 || res.status >= 500) { last = new Error(`HTTP ${res.status}`); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { json: await res.json(), next: res.headers.get('x-next-page') || '' };
    } catch (e) { if (!/^HTTP (429|5)/.test(e.message) && !/fetch failed/.test(e.message)) throw e; last = e; }
  }
  throw last;
}

export async function collectGitLabCommits() {
  const sources = parseSources();
  const mine = new Set((process.env.GITLAB_AUTHOR_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
  if (!sources.length) return [];
  if (!mine.size) { console.warn('GitLab: GITLAB_AUTHOR_EMAILS is empty, nothing is counted (only your own commits may count)'); return []; }
  const out = [], seen = new Set();
  for (const { host, token } of sources) {
    const label = new URL(host).hostname;
    try {
      const me = (await get(host, token, '/user')).json; // verifies the token and the host
      console.log(`GitLab ${label}: token ok for user ${me.username}`);
    } catch (e) { console.warn(`GitLab ${label}: skipped (${e.message}); check host and token scope read_api`); continue; }
    let projects = 0, commits = 0;
    try {
      for (let page = '1'; page; ) {
        const r = await get(host, token, `/projects?membership=true&simple=true&per_page=100&page=${page}`);
        for (const p of r.json) {
          projects++;
          try {
            for (let cp = '1', n = 0; cp && n < MAX_PAGES; n++) {
              const c = await get(host, token, `/projects/${p.id}/repository/commits?all=true&with_stats=true&per_page=100&page=${cp}`);
              for (const x of c.json) {
                if (!mine.has(String(x.author_email || '').toLowerCase())) continue; // only commits authored by you
                if (seen.has(x.id)) continue;
                seen.add(x.id);
                commits++;
                out.push({ oid: x.id, committedDate: x.committed_date, additions: x.stats?.additions || 0, deletions: x.stats?.deletions || 0, message: x.message || '', parents: { totalCount: (x.parent_ids || []).length } });
              }
              cp = c.next;
            }
          } catch (e) { console.warn(`GitLab ${label}: one project skipped (${e.message})`); }
        }
        page = r.next;
      }
    } catch (e) { console.warn(`GitLab ${label}: project list failed (${e.message})`); }
    console.log(`GitLab ${label}: ${commits} own commits in ${projects} projects`);
  }
  return out;
}
