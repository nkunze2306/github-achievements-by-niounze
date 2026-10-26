// GitHub Achievements by niounze
// Reads your GitHub (and optionally WakaTime) data, evaluates achievements.config.json and writes
//   achievements.svg      the achievements closest to their next level
//   achievements-all.svg  every achievement
//   achievements.json     all values (for your own site)
// The config is always loaded from this repo (next to this file), it cannot be overridden from the outside.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPage } from './web/page.mjs';

const ICONS = JSON.parse(readFileSync(new URL('./web/icons.json', import.meta.url), 'utf8')); // 12x12 pixel icons, one per achievement id
const CONFIG = JSON.parse(readFileSync(new URL('./achievements.config.json', import.meta.url), 'utf8'));
const S = CONFIG.settings;

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; };
const DEMO = process.argv.includes('--demo');
const OUT = arg('out', process.env.ACH_OUT || '.');
const TOKEN = (process.env.STATS_TOKEN || process.env.GITHUB_TOKEN || '').trim();
const LOGIN = (process.env.STATS_LOGIN || process.env.GITHUB_REPOSITORY_OWNER || '').trim();
const WAKA_KEY = (process.env.WAKATIME_API_KEY || '').trim();
const TZ = (process.env.ACH_TZ || S.timezone || 'UTC').trim();
const MAX_PAGES = Number(process.env.ACH_MAX_PAGES || 30);
const AI_RE = new RegExp(S.aiCoAuthorPattern, 'i');

// ---------------------------------------------------------------- GitHub
async function api(url, init = {}) {
  let last;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt * attempt));
    try {
      const res = await fetch(url, { ...init, headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', ...init.headers } });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { last = new Error(`HTTP ${res.status}: non-JSON response`); continue; } // GitHub liefert bei Timeouts/502 manchmal HTML
      if (res.status >= 500) { last = new Error(`HTTP ${res.status}`); continue; }
      if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 300));
      return json;
    } catch (e) { if (!/^HTTP [0-9]+|fetch failed/.test(e.message)) throw e; last = e; }
  }
  throw last;
}
async function gql(query, variables = {}) {
  const json = await api('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  return json.data;
}
async function pages(query, variables, pick) {
  const nodes = [];
  for (let after = null, more = true; more; ) {
    const c = pick(await gql(query, { ...variables, after }));
    nodes.push(...c.nodes);
    more = c.pageInfo.hasNextPage;
    after = c.pageInfo.endCursor;
  }
  return nodes;
}
const searchCount = async (q) => (await gql('query($q:String!){ search(query:$q,type:ISSUE,first:1){ issueCount } }', { q })).search.issueCount;

const REPO_FIELDS = `nameWithOwner isPrivate isFork stargazerCount forkCount languages(first:20,orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name } } }`;

async function collectGitHub() {
  if (!TOKEN || !LOGIN) throw new Error('STATS_TOKEN (or GITHUB_TOKEN) and STATS_LOGIN are required');
  const m = {};
  const { user: u } = await gql(`query($login:String!){ user(login:$login){
    id createdAt followers{totalCount}
    issues(states:CLOSED){totalCount} pullRequests(states:MERGED){totalCount}
  } }`, { login: LOGIN });
  m.followers = u.followers.totalCount;
  m.issuesClosed = u.issues.totalCount;
  m.prsMerged = u.pullRequests.totalCount;

  // repos: own, collaborations, orgs and everything contributed to
  const repoMap = new Map();
  const q1 = `query($login:String!,$after:String){ user(login:$login){ repositories(affiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER],first:100,after:$after){ pageInfo{hasNextPage endCursor} nodes{ ${REPO_FIELDS} } } } }`;
  (await pages(q1, { login: LOGIN }, (d) => d.user.repositories)).forEach((r) => repoMap.set(r.nameWithOwner, r));
  const q2 = `query($login:String!,$after:String){ user(login:$login){ repositoriesContributedTo(first:100,after:$after,contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY]){ pageInfo{hasNextPage endCursor} nodes{ ${REPO_FIELDS} } } } }`;
  const contributed = await pages(q2, { login: LOGIN }, (d) => d.user.repositoriesContributedTo);
  contributed.forEach((r) => repoMap.set(r.nameWithOwner, r));
  const repos = [...repoMap.values()].sort((a, b) => Number(a.isFork) - Number(b.isFork));
  const mine = (r) => r.nameWithOwner.toLowerCase().startsWith(`${LOGIN.toLowerCase()}/`);
  const owned = repos.filter((r) => mine(r) && !r.isFork);

  m.ownRepos = owned.length;
  m.stars = owned.reduce((s, r) => s + r.stargazerCount, 0);
  m.forks = owned.reduce((s, r) => s + r.forkCount, 0);
  m.maxRepoStars = Math.max(0, ...owned.map((r) => r.stargazerCount));
  m.foreignRepos = contributed.filter((r) => !mine(r)).length;

  // commit history of all branches, de-duplicated by commit id
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
  const seen = new Set(), daily = new Map(), committed = new Set();
  Object.assign(m, { commits: 0, nightCommits: 0, earlyCommits: 0, weekendCommits: 0, aiCommits: 0, linesAdded: 0, linesDeleted: 0, handLines: 0, unicornCommits: 0, christmasCommits: 0, newYearCommits: 0 });
  for (const r of repos) {
    const [owner, name] = r.nameWithOwner.split('/');
    try {
      const branches = [];
      for (let after = null, p = 0; p < 4; p++) {
        const b = (await gql(`query($owner:String!,$name:String!,$after:String){ repository(owner:$owner,name:$name){ refs(refPrefix:"refs/heads/",first:50,after:$after){ pageInfo{hasNextPage endCursor} nodes{ name } } } }`, { owner, name, after })).repository?.refs;
        if (!b) break;
        branches.push(...b.nodes.map((n) => n.name));
        if (!b.pageInfo.hasNextPage) break;
        after = b.pageInfo.endCursor;
      }
      for (const br of branches) {
        let after = null;
        for (let page = 0; page < MAX_PAGES; page++) {
          const h = (await gql(`query($owner:String!,$name:String!,$ref:String!,$id:ID!,$after:String){ repository(owner:$owner,name:$name){
            ref(qualifiedName:$ref){ target{ ... on Commit{ history(first:100,after:$after,author:{id:$id}){ pageInfo{hasNextPage endCursor} nodes{ oid committedDate additions deletions message parents{totalCount} } } } } } } }`,
          { owner, name, ref: `refs/heads/${br}`, id: u.id, after })).repository?.ref?.target?.history;
          if (!h) break;
          for (const c of h.nodes) {
            if (seen.has(c.oid)) continue;
            seen.add(c.oid);
            committed.add(r.nameWithOwner);
            const p = Object.fromEntries(fmt.formatToParts(new Date(c.committedDate)).map((x) => [x.type, x.value]));
            const hour = Number(p.hour), day = `${p.year}-${p.month}-${p.day}`, md = `${p.month}-${p.day}`;
            daily.set(day, (daily.get(day) || 0) + 1);
            if (hour >= S.nightHours[0] && hour < S.nightHours[1]) m.nightCommits++;
            if (hour >= S.earlyHours[0] && hour < S.earlyHours[1]) m.earlyCommits++;
            if (p.weekday === 'Sat' || p.weekday === 'Sun') m.weekendCommits++;
            if (md === '02-29') m.unicornCommits++;
            if (md === '12-24' || md === '12-25') m.christmasCommits++;
            if (md === '01-01') m.newYearCommits++;
            const ai = AI_RE.test(c.message);
            if (ai) m.aiCommits++;
            if (c.parents.totalCount > 1) continue; // merge commits carry other people's code
            m.linesAdded += c.additions;
            m.linesDeleted += c.deletions;
            if (!ai) m.handLines += c.additions;
          }
          if (!h.pageInfo.hasNextPage) break;
          after = h.pageInfo.endCursor;
        }
      }
    } catch (e) { console.warn(`skipped ${r.nameWithOwner}: ${e.message.slice(0, 120)}`); }
  }
  m.commits = seen.size;
  // languages: from every repo you committed to; lines per language = your added lines split by the language share (estimate)
  const lang = new Map();
  for (const r of repos.filter((x) => committed.has(x.nameWithOwner))) for (const e of r.languages.edges) lang.set(e.node.name, (lang.get(e.node.name) || 0) + e.size);
  const langTotal = [...lang.values()].reduce((a, b) => a + b, 0) || 1;
  m.languages = lang.size;
  m.topLanguageLines = Math.round(m.linesAdded * Math.max(0, ...lang.values()) / langTotal);
  m.maxCommitsPerDay = Math.max(0, ...daily.values());

  // streak and active days: GitHub calendar per year, merged with own commits
  const now = new Date();
  const startYear = new Date(u.createdAt).getUTCFullYear();
  let yq = 'query($login:String!){ user(login:$login){';
  for (let y = startYear; y <= now.getUTCFullYear(); y++) {
    const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    yq += `y${y}: contributionsCollection(from:"${y}-01-01T00:00:00Z",to:"${to}"){ totalPullRequestReviewContributions contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } }`;
  }
  const years = (await gql(yq + '} }', { login: LOGIN })).user;
  const days = new Map(daily);
  let reviewsContrib = 0;
  for (const y of Object.values(years)) {
    reviewsContrib += y.totalPullRequestReviewContributions;
    for (const w of y.contributionCalendar.weeks) for (const d of w.contributionDays) days.set(d.date, Math.max(d.contributionCount, days.get(d.date) || 0));
  }
  const active = [...days].filter(([, n]) => n > 0).map(([d]) => d).sort();
  m.activeDays = active.length;
  m.longestStreak = longestRun(active);

  m.reviews = Math.max(reviewsContrib, await searchCount(`type:pr reviewed-by:${LOGIN}`));
  m.foreignMergedPRs = await searchCount(`type:pr author:${LOGIN} is:merged -user:${LOGIN}`);

  // PR / issue details: huge PRs, clean sweeps, quick closes
  const prs = await pages(`query($login:String!,$after:String){ user(login:$login){ pullRequests(first:100,after:$after,states:[MERGED,CLOSED]){ pageInfo{hasNextPage endCursor} nodes{ merged createdAt closedAt additions deletions } } } }`, { login: LOGIN }, (d) => d.user.pullRequests);
  const iss = await pages(`query($login:String!,$after:String){ user(login:$login){ issues(first:100,after:$after,states:CLOSED){ pageInfo{hasNextPage endCursor} nodes{ createdAt closedAt } } } }`, { login: LOGIN }, (d) => d.user.issues);
  m.monsterPRs = prs.filter((p) => p.merged && p.additions + p.deletions > S.monsterPrLines).length;
  m.cleanSweeps = prs.filter((p) => p.merged && p.deletions > p.additions).length;
  const quick = (x) => x.closedAt && Date.parse(x.closedAt) - Date.parse(x.createdAt) <= S.quickdrawMinutes * 60000;
  m.quickdraws = prs.filter(quick).length + iss.filter(quick).length;
  // custom achievements: { "metric": "search", "query": "type:pr author:{login} is:merged" }
  for (const a of CONFIG.achievements.filter((x) => x.metric === 'search')) m['search:' + a.id] = await searchCount(a.query.replaceAll('{login}', LOGIN));
  return m;
}

function longestRun(sortedDates) {
  let best = 0, run = 0, prev = null;
  for (const d of sortedDates) {
    const t = Date.parse(d + 'T00:00:00Z');
    run = prev !== null && t - prev === 864e5 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

// ---------------------------------------------------------------- WakaTime (optional)
async function wakaGet(path) {
  const res = await fetch('https://wakatime.com/api/v1/' + path + (path.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(WAKA_KEY));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 120)}`);
  return json;
}
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

async function collectWaka(stateFile) {
  const st = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
  st.days ||= {}; st.sessions ||= {}; st.apiSec ||= 0;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  for (const back of [200, 90, 30, 13, 6, 2]) { // as many days as the account allows (free plan: few)
    try {
      const r = await wakaGet(`users/current/summaries?start=${addDays(today, -back)}&end=${today}&timezone=${encodeURIComponent(TZ)}`);
      for (const d of r.data) st.days[d.range.date] = Math.round(d.grand_total.total_seconds);
      break;
    } catch (e) { console.warn(`WakaTime summaries (${back + 1} days): ${e.message}`); }
  }
  try { st.apiSec = Math.max(st.apiSec, Math.round((await wakaGet('users/current/all_time_since_today')).data.total_seconds || 0)); } catch (e) { console.warn(`WakaTime all-time: ${e.message}`); }
  // longest session without a break, per finished day (cached, every day is fetched once)
  let fetched = 0;
  for (const d of Object.keys(st.days).sort().reverse()) {
    if (d >= today || st.sessions[d] !== undefined || st.days[d] <= 0 || fetched >= 40) continue;
    try {
      const r = await wakaGet(`users/current/durations?date=${d}&timezone=${encodeURIComponent(TZ)}`);
      const gap = S.marathonGapMinutes * 60;
      let best = 0, start = null, end = null;
      for (const b of [...r.data].sort((x, y) => x.time - y.time)) {
        if (start !== null && b.time - end <= gap) end = Math.max(end, b.time + b.duration);
        else { start = b.time; end = b.time + b.duration; }
        best = Math.max(best, end - start);
      }
      st.sessions[d] = Math.round(best);
      fetched++;
    } catch (e) { console.warn(`WakaTime durations ${d}: ${e.message}`); break; }
  }
  writeFileSync(stateFile, JSON.stringify(st));
  const tracked = Object.values(st.days).reduce((a, b) => a + b, 0);
  const good = Object.entries(st.days).filter(([, s]) => s >= S.consistentMinHours * 3600).map(([d]) => d).sort();
  return {
    wakaHours: (st.apiSec || tracked) / 3600, // same rule as the dashboard: WakaTime's all-time total first (daily sums also contain non-coding categories)
    marathonHours: Math.max(0, ...Object.values(st.sessions)) / 3600,
    consistentDays: longestRun(good),
  };
}

// ---------------------------------------------------------------- Evaluation
function evaluate(metrics, hasWaka) {
  const list = CONFIG.achievements.filter((a) => !a.requires || (a.requires === 'wakatime' && hasWaka)).map((a) => {
    const value = a.metric === 'search' ? metrics['search:' + a.id] || 0 : metrics[a.metric] ?? 0;
    return { ...a, value, tiers: a.tiers.slice(), icon: ICONS[a.icon || a.id] || null };
  });
  // Grandmaster: all other achievements on their highest level
  const others = list.filter((a) => a.metric !== 'maxedOthers');
  const maxed = (a) => a.value >= a.tiers[a.tiers.length - 1];
  for (const a of list) {
    if (a.metric === 'maxedOthers') { a.value = others.filter(maxed).length; a.tiers = [others.length]; }
    a.level = a.tiers.filter((t) => a.value >= t).length;
    a.next = a.tiers[a.level] ?? null;
    a.maxed = a.next === null;
    a.progress = a.maxed ? 1 : Math.min(1, a.value / a.next);
  }
  return list;
}

// ---------------------------------------------------------------- Rendering
const COL = { green: '#34f5a0', blue: '#38bdf8', pink: '#ff5c9a', purple: '#b794ff', yellow: '#ffcf4d', orange: '#ff9f43', gold: '#ffd34e',
  consistency: '#34f5a0', collaboration: '#38bdf8', impact: '#ffcf4d', craft: '#ff5c9a', ai: '#b794ff', time: '#6b8cff', fun: '#ff9f43', legendary: '#ffd34e' }; // ring colour by category
const colorOf = (a) => (a.legendary || a.maxed ? COL.gold : COL[a.color] || a.color || COL.blue); // finished = gold
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const compact = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
const fmtVal = (a, v) => (a.format === 'hours' ? `${Math.round(v)}h` : compact(v));
const T = (x, y, s, { size = 13, fill = '#8b8b8b', weight = 400, anchor = 'start', spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ''}>${esc(s)}</text>`;

// Every icon is cropped to its pixels, scaled so its longest side equals `size`, and centred on (cx, cy)
function iconSvg(ic, cx, cy, size, opacity = 1) {
  let x1 = 12, x2 = -1, y1 = 12, y2 = -1;
  ic.rows.forEach((row, y) => { for (let x = 0; x < 12; x++) if (row[x] !== '.') { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } });
  const w = x2 - x1 + 1, h = y2 - y1 + 1, p = size / Math.max(w, h), ox = cx - (w * p) / 2 - x1 * p, oy = cy - (h * p) / 2 - y1 * p;
  let s = `<g shape-rendering="crispEdges"${opacity < 1 ? ` opacity="${opacity}"` : ''}>`;
  ic.rows.forEach((row, y) => {
    for (let x = 0; x < 12; ) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let e = x;
      while (e < 12 && row[e] === ch) e++;
      s += `<rect x="${(ox + x * p).toFixed(2)}" y="${(oy + y * p).toFixed(2)}" width="${((e - x) * p + 0.03).toFixed(2)}" height="${(p + 0.03).toFixed(2)}" fill="${ic.palette[ch]}"/>`;
      x = e;
    }
  });
  return s + '</g>';
}

function card(a, x, y, w, h = 92) {
  const k = h / 92; // compact cards scale all inner sizes
  const c = colorOf(a), locked = a.level === 0 && !a.legendary;
  const r = 29 * k, cx = x + 16 * k + r + 4, cy = y + h / 2, circ = 2 * Math.PI * r, sw = 7 * k;
  const ring = a.maxed ? circ : circ * a.progress;
  const ox = cx + r + 14 * k, ow = w - (ox - x) - 16;
  const label = a.legendary ? `★ ${a.name}` : a.name;
  const badge = a.legendary ? (a.maxed ? 'UNLOCKED' : 'LEGENDARY') : `${a.level} / ${a.tiers.length}`;
  const bw = (badge.length * 7.2 + 18) * Math.max(k, 0.85);
  const sub = a.maxed ? `${fmtVal(a, a.value)} ${a.unit} · max level` : `${fmtVal(a, a.value)} / ${fmtVal(a, a.next)} ${a.unit}`;
  const pct = a.maxed ? '100%' : `${Math.floor(a.progress * 100)}%`;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#121212" stroke="${a.legendary || a.maxed ? c + '55' : '#262626'}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#242424" stroke-width="${sw}"/>`,
    ring > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${ring.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` : '',
    a.icon ? iconSvg(a.icon, cx, cy, r * 0.945, locked ? 0.45 : 1) : T(cx, cy + 9 * k, a.legendary ? (a.maxed ? '★' : '☆') : a.level, { size: 26 * k, fill: locked ? '#555' : '#fff', weight: 700, anchor: 'middle' }),
    a.icon ? `<circle cx="${(cx + r * 0.74).toFixed(1)}" cy="${(cy + r * 0.74).toFixed(1)}" r="${(9 * k).toFixed(1)}" fill="#0b0b0b" stroke="${c}" stroke-width="${1.6 * k}"/>` + T(cx + r * 0.74, cy + r * 0.74 + 4 * k, a.legendary ? (a.maxed ? '★' : '☆') : a.level, { size: 11.5 * k, fill: locked ? '#777' : '#fff', weight: 700, anchor: 'middle' }) : '',
    T(ox, y + 32 * k, label, { size: 15 * Math.max(k, 0.9), fill: locked ? '#9a9a9a' : '#fff', weight: 700 }),
    `<rect x="${x + w - 18 - bw}" y="${y + 16 * k}" width="${bw}" height="${22 * k}" rx="${11 * k}" fill="${c}1c" stroke="${c}88"/>`,
    T(x + w - 18 - bw / 2, y + 31 * k - (k < 1 ? 1 : 0), badge, { size: 11.5 * Math.max(k, 0.85), fill: c, weight: 700, anchor: 'middle' }),
    `<rect x="${ox}" y="${y + 47 * k}" width="${ow}" height="${6 * k}" rx="${3 * k}" fill="#242424"/>`,
    a.progress > 0 ? `<rect x="${ox}" y="${y + 47 * k}" width="${Math.max(6, ow * a.progress).toFixed(1)}" height="${6 * k}" rx="${3 * k}" fill="${c}"/>` : '',
    T(ox, y + 74 * k, sub, { size: 12 * Math.max(k, 0.9), fill: '#8b8b8b' }),
    T(x + w - 18, y + 74 * k, pct, { size: 12 * Math.max(k, 0.9), fill: '#8b8b8b', anchor: 'end' }),
  ].join('');
}

function frame(width, height, title, rightHtml, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<rect width="${width}" height="${height}" rx="22" fill="#000"/>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="22" fill="none" stroke="#262626"/>
<circle cx="52" cy="48" r="12" fill="none" stroke="${COL.blue}" stroke-width="1.6"/><circle cx="52" cy="48" r="4.5" fill="${COL.blue}"/>
${T(76, 53, title, { size: 13.5, fill: '#b5b5b5', weight: 600, spacing: 1.6 })}
${rightHtml}
${inner}
</svg>
`;
}

function pickClosest(list) { return list.filter((a) => !a.maxed).sort((a, b) => b.progress - a.progress || b.level - a.level).slice(0, S.closestCount); }

// Highlights: what reads best to an employer. score = weight x (0.4 + 0.6 x overall progress), unlocked ones first
function pickHighlights(list) {
  const fixed = (S.highlights || []).map((id) => list.find((a) => a.id === id)).filter(Boolean); // order from the config
  if (fixed.length >= S.closestCount) return fixed.slice(0, S.closestCount);
  const score = (a) => (a.weight ?? 1) * (0.4 + 0.6 * Math.min(1, (a.level + (a.maxed ? 0 : a.progress)) / a.tiers.length));
  const ranked = [...list].sort((a, b) => score(b) - score(a));
  const rest = [...ranked.filter((a) => a.level > 0), ...ranked.filter((a) => a.level === 0)].filter((a) => !fixed.includes(a));
  return [...fixed, ...rest].slice(0, S.closestCount);
}

function renderCompact(items, title, unlocked, total) {
  const W = 1200, M = 30, PADX = 30, G = 16, cols = 3;
  const cw = (W - 2 * M - 2 * PADX + 2 * PADX - (cols - 1) * G) / cols; // = (W - 2M - 2G) / 3
  const CH = S.compactCardHeight || 70;
  const rows = Math.ceil(items.length / cols), H = 78 + rows * CH + (rows - 1) * 12 + 24;
  const right = `${T(W - M - PADX + 30, 53, ` / ${total} unlocked`, { size: 14, fill: '#8b8b8b', anchor: 'end' })}${T(W - M - PADX + 30 - (` / ${total} unlocked`.length * 6.9), 53, unlocked, { size: 14, fill: '#fff', weight: 700, anchor: 'end' })}`;
  const inner = items.map((a, i) => card(a, M + (i % cols) * (cw + G), 76 + Math.floor(i / cols) * (CH + 12), cw, CH)).join('');
  return frame(W, H, title, right, inner);
}

function renderAll(list, unlocked, total) {
  const W = 1200, M = 30, G = 16, cols = 3, cw = (W - 2 * M - 2 * G) / cols;
  let y = 86, inner = '';
  for (const [gid, gname] of Object.entries(CONFIG.groups)) {
    const items = list.filter((a) => a.group === gid);
    if (!items.length) continue;
    inner += T(M + 4, y + 14, gname.toUpperCase(), { size: 11.5, fill: '#777', weight: 700, spacing: 1.6 });
    y += 28;
    items.forEach((a, i) => { inner += card(a, M + (i % cols) * (cw + G), y + Math.floor(i / cols) * (92 + G), cw); });
    y += Math.ceil(items.length / cols) * (92 + G) + 8;
  }
  const right = `${T(W - M, 53, ` / ${total} unlocked`, { size: 14, fill: '#8b8b8b', anchor: 'end' })}${T(W - M - (` / ${total} unlocked`.length * 6.9), 53, unlocked, { size: 14, fill: '#fff', weight: 700, anchor: 'end' })}`;
  return frame(W, y + 22, 'ACHIEVEMENTS · ALL', right, inner);
}

// ---------------------------------------------------------------- main
async function main() {
  mkdirSync(OUT, { recursive: true });
  let metrics, hasWaka;
  if (DEMO) {
    metrics = { commits: 358, aiCommits: 32, prsMerged: 6, linesAdded: 81000, languages: 6, wakaHours: 116, longestStreak: 12, activeDays: 140, nightCommits: 60, earlyCommits: 12, weekendCommits: 90, maxCommitsPerDay: 14, reviews: 8, issuesClosed: 21, foreignRepos: 2, foreignMergedPRs: 3, quickdraws: 0, stars: 4, forks: 1, followers: 12, linesDeleted: 19000, topLanguageLines: 30000, ownRepos: 9, handLines: 74000, marathonHours: 6, consistentDays: 4, christmasCommits: 1, maxRepoStars: 4 };
    hasWaka = true;
  } else {
    metrics = await collectGitHub();
    hasWaka = Boolean(WAKA_KEY);
    if (hasWaka) Object.assign(metrics, await collectWaka(join(OUT, '.achievements-state.json')));
  }
  const list = evaluate(metrics, hasWaka);
  // every single level counts; one-level achievements count as 1
  const unlocked = list.reduce((s, a) => s + a.level, 0), totalLevels = list.reduce((s, a) => s + a.tiers.length, 0);
  const highlights = pickHighlights(list), closest = pickClosest(list);
  writeFileSync(join(OUT, 'achievements.svg'), renderCompact(highlights, 'ACHIEVEMENTS · HIGHLIGHTS', unlocked, totalLevels));
  writeFileSync(join(OUT, 'achievements-closest.svg'), renderCompact(closest, 'ACHIEVEMENTS · CLOSEST TO NEXT LEVEL', unlocked, totalLevels));
  writeFileSync(join(OUT, 'achievements-all.svg'), renderAll(list, unlocked, totalLevels));
  const data = {
    updated: new Date().toISOString(), login: LOGIN || null, unlocked, total: totalLevels, achievementsUnlocked: list.filter((a) => a.level > 0).length, achievementsTotal: list.length, highlights: highlights.map((a) => a.id), metrics,
    achievements: list.map((a) => ({ id: a.id, name: a.name, group: a.group, legendary: !!a.legendary, color: colorOf(a), icon: a.icon, weight: a.weight ?? 1, unit: a.unit, format: a.format || null, description: a.description || '', value: a.value, tiers: a.tiers, level: a.level, next: a.next, maxed: a.maxed, progress: a.progress })),
    groups: CONFIG.groups,
  };
  writeFileSync(join(OUT, 'achievements.json'), JSON.stringify(data, null, 1));
  copyFileSync(new URL('./web/achievements-ui.js', import.meta.url), join(OUT, 'achievements-ui.js'));
  writeFileSync(join(OUT, 'achievements.html'), renderPage(data));
  console.log(`written to ${OUT}: ${unlocked} / ${totalLevels} levels, ${list.filter((a) => a.level > 0).length} / ${list.length} achievements started`);
}
main().catch((e) => { console.error(e); process.exit(1); });
