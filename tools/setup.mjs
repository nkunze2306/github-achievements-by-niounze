#!/usr/bin/env node
// Guided setup for the GitHub Stats & Achievements kit. Needs Node 20+, git and the GitHub CLI (gh).
//   npx github:nkunze2306/github-achievements-by-niounze        (one command, everything else is asked)
//   or: git clone https://github.com/nkunze2306/github-achievements-by-niounze && node github-achievements-by-niounze/tools/setup.mjs
//   add --dry-run to see what would happen without changing anything, --reset to forget a saved, unfinished setup
//
// It never loses your progress: your answers (never tokens) and the finished steps are saved in ~/.github-achievements-setup.json.
// If anything fails, fix the cause and run the same command again: it continues at the failed step.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const KIT = 'nkunze2306/github-achievements-by-niounze';
const KIT_REF = 'stable'; // a branch that only moves forward after a release is tested: workflows that use it upgrade themselves
const KIT_DIR = fileURLToPath(new URL('..', import.meta.url));
const STATE_FILE = join(homedir(), '.github-achievements-setup.json');

// ---------- small helpers
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: false, ...opts });
const out = (cmd, args, opts) => { const r = run(cmd, args, opts); return r.status === 0 ? String(r.stdout).trim() : null; };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
class StepError extends Error { constructor(msg, hint = '') { super(msg); this.hint = hint; } }
// runs a command; in dry-run mode only prints it
const act = (label, cmd, args, opts = {}) => {
  if (DRY) { console.log(`  [dry-run] ${label}: ${cmd} ${args.join(' ')}`); return { status: 0, stdout: '', stderr: '' }; }
  const r = run(cmd, args, { stdio: opts.input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'], ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new StepError(`${cmd} ${args.slice(0, 3).join(' ')} failed${r.stderr ? `: ${String(r.stderr).trim().split('\n').slice(-3).join(' | ')}` : ''}`);
  return r;
};

if (process.argv.includes('--reset') && existsSync(STATE_FILE)) { unlinkSync(STATE_FILE); console.log('Saved setup forgotten.'); }

// log in first (before the prompt reader owns stdin), so a fresh machine needs no extra step
if (spawnSync('gh', ['--version'], { encoding: 'utf8' }).status !== 0) {
  console.error('The GitHub CLI (gh) is missing. Install it once and run this command again:\n  Windows: winget install GitHub.cli\n  macOS:   brew install gh\n  Linux:   https://github.com/cli/cli#installation');
  process.exit(1);
}
if (spawnSync('git', ['--version'], { encoding: 'utf8' }).status !== 0) { console.error('git is missing. Install it from https://git-scm.com and run this command again.'); process.exit(1); }
if (spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status !== 0) {
  console.log('You are not logged in to GitHub yet. Starting the login (a browser window opens):');
  spawnSync('gh', ['auth', 'login', '--web', '--git-protocol', 'https'], { stdio: 'inherit' });
}

// ---------- prompts (also work with piped input)
const rl = createInterface({ input: process.stdin, output: process.stdout });
let closing = false;
rl.on('close', () => { if (!closing) { console.log('\nInput closed. Your answers so far are saved: run the command again to continue.'); process.exit(1); } });
const lines = []; let waiting = null;
rl.on('line', (l) => { if (waiting) { const w = waiting; waiting = null; w(l); } else lines.push(l); });
const ask = (q, def = '') => new Promise((ok) => {
  process.stdout.write(`${q}${def !== '' ? ` [${def}]` : ''} `);
  const done = (l) => ok(l.trim() || def);
  if (lines.length) { const l = lines.shift(); console.log(l); done(l); } else waiting = done;
});
const yes = async (q, def = true) => /^y/i.test(await ask(`${q} (${def ? 'Y/n' : 'y/N'})`, def ? 'y' : 'n'));
// hidden input: not echoed, never printed or saved
const secret = (q) => new Promise((ok) => {
  process.stdout.write(`${q} (input is hidden) `);
  if (lines.length) { ok(lines.shift().trim()); return; }
  if (process.stdin.isTTY) { const orig = rl._writeToOutput; rl._writeToOutput = () => {}; waiting = (l) => { rl._writeToOutput = orig; process.stdout.write('\n'); ok(l.trim()); }; }
  else waiting = (l) => ok(l.trim());
});
const section = (t, why = '') => { console.log(`\n== ${t}`); if (why) console.log(why); };

// ---------- saved progress
let state = { a: {}, done: {} };
try { if (existsSync(STATE_FILE)) state = { a: {}, done: {}, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) }; } catch { /* start fresh */ }
const save = () => { if (!DRY) { try { writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch { /* optional */ } } };
const A = state.a;

// one finished step is never repeated; a failing step stops with a clear message and keeps everything else
async function step(name, fn) {
  if (state.done[name] && !DRY) { console.log(`  ok (already done): ${name}`); return; }
  console.log(`  ${name} ...`);
  try { await fn(); } catch (e) {
    console.error(`\nThis step did not work: ${name}\n  ${e.message}${e.hint ? `\n  What to do: ${e.hint}` : ''}`);
    console.error(`\nNothing is lost. Fix the cause and run the same command again: it continues at this step.\nSaved answers: ${STATE_FILE} (tokens are never saved).`);
    process.exit(1);
  }
  if (!DRY) { state.done[name] = true; save(); }
}

console.log(`GitHub Stats & Achievements setup${DRY ? ' (dry run, nothing is changed)' : ''}`);
console.log('It takes about three minutes. You can stop at any time and continue later by running the same command.');

// ---------- 1. account
section('1. GitHub account');
const login = out('gh', ['api', 'user', '--jq', '.login']);
if (!login) { console.error('Could not read your GitHub account. Run "gh auth login", then start this again.'); process.exit(1); }
console.log(`Logged in to GitHub as: ${login}`);
if (!(await yes('Is this the account the stats are for?'))) { console.log('Switch with "gh auth switch" (or log in with "gh auth login"), then start this again.'); process.exit(0); }
if (A.login && A.login !== login) { state.done = {}; for (const k of Object.keys(A)) delete A[k]; }
A.login = login;
if (Object.keys(state.done).length > 0) {
  console.log(`\nFound an unfinished setup for ${A.repo || login} (${Object.keys(state.done).length} step(s) done).`);
  if (!(await yes('Continue where you stopped? (no = start over)'))) { state.done = {}; for (const k of Object.keys(A)) if (k !== 'login') delete A[k]; }
}

// ---------- 2. questions (nothing is changed yet)
section('2. What do you want?', 'Nothing is changed until you confirm the summary.');
const profileRepo = `${login}/${login}`;
const ask2 = async (key, fn) => { if (A[key] === undefined) { A[key] = await fn(); save(); } return A[key]; };
await ask2('wantStats', () => yes('Stats card (stats.svg for your profile README)?'));
await ask2('wantAch', () => yes('Achievements (cards and skill tree)?'));
await ask2('dash', async () => {
  console.log('\nThe dashboard is an interactive website with your stats, all achievements, the skill tree and the Master Road, hosted free on GitHub Pages.');
  const r = await ask('Do you want the dashboard website too? (no / new = new site / add = add it to a website you already have)', 'new');
  return /^new/i.test(r) ? 'new' : /^a/i.test(r) ? 'add' : 'no';
});
await ask2('wantRoad', async () => (A.dash !== 'no' ? yes('Master Road (23 hard, real pro-level challenges, unlocks at 100 achievement levels)?') : false));
await ask2('repo', async () => (A.dash === 'add' ? ask('Repo of your existing website (owner/name)?', `${login}/${login}.github.io`) : profileRepo));
await ask2('outDir', async () => (A.dash === 'add' ? ask('Subfolder inside that repo for the dashboard?', 'stats') : '.'));
await ask2('tz', () => ask('Time zone for night/weekend statistics?', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'));
await ask2('exclude', () => ask('Folders or files that are NOT your code (asset packs, imported libraries)? Comma separated, empty = none.\n  Lock files, dependencies, generated code and Unity/Unreal project files are left out automatically.\n ', ''));
await ask2('useToken', () => yes('Count your PRIVATE repos too? (needs a personal access token, you create it in the next step)'));
await ask2('useWaka', () => yes('Do you use WakaTime (coding time, language and editor stats)?', false));
await ask2('useGitlab', () => yes('Do you also commit to GitLab (only your own commits get counted)?', false));
if (A.useGitlab) {
  await ask2('gitlabHost', () => ask('GitLab address?', 'https://gitlab.com'));
  await ask2('gitlabEmails', () => ask('Your commit e-mail address(es) on GitLab, comma separated (only commits with these count)?', out('git', ['config', 'user.email']) || ''));
}
await ask2('useTracker', () => yes('Track your Claude Code token usage (extra card; a small script runs on this PC and only stores numbers)?', false));
const components = [A.wantStats && 'stats', A.wantAch && 'achievements', A.dash !== 'no' && 'dashboard', A.wantRoad && 'road'].filter(Boolean);
if (!components.length) { console.log('Nothing selected.'); process.exit(0); }
const repo = A.repo;
if (A.dash === 'add' && out('gh', ['repo', 'view', repo, '--json', 'name', '--jq', '.name']) === null) {
  delete A.repo; save();
  console.error(`The repo ${repo} was not found with this account. Check the name and start again.`); process.exit(1);
}

console.log('\nSummary');
console.log(`  account      ${login}`);
console.log(`  repo         ${repo}${A.outDir !== '.' ? ` (folder ${A.outDir}/)` : ''}`);
console.log(`  components   ${components.join(', ')}`);
console.log(`  private data ${A.useToken ? 'yes (token)' : 'no, public only'}   WakaTime ${A.useWaka ? 'yes' : 'no'}   GitLab ${A.useGitlab ? A.gitlabHost : 'no'}   token card ${A.useTracker ? 'yes' : 'no'}`);
const dirArg = A.dirArg || await ask('Folder for the local clone of the repo?', join(dirname(resolve(KIT_DIR)), repo.split('/')[1]));
A.dirArg = dirArg; save();
if (!(await yes(`Create/clone ${repo} in ${dirArg}, store the secrets, push the workflow and start the first run?`))) { console.log('Nothing was changed. Your answers are saved.'); process.exit(0); }

// ---------- helpers that need the answers
const hasSecret = (name) => (out('gh', ['secret', 'list', '-R', repo, '--json', 'name', '--jq', '.[].name']) || '').split('\n').includes(name);
async function checkGithubToken(t) {
  const r = await fetch('https://api.github.com/user', { headers: { Authorization: `bearer ${t}`, 'User-Agent': 'stats-setup' } }).catch(() => null);
  if (!r) return 'could not reach github.com, check your connection';
  if (r.status !== 200) return `GitHub rejected this token (HTTP ${r.status}). Copy the whole token, it starts with ghp_ or github_pat_`;
  const who = (await r.json()).login;
  if (who.toLowerCase() !== login.toLowerCase()) return `this token belongs to ${who}, but the stats are for ${login}. Create it while logged in as ${login}`;
  const scopes = r.headers.get('x-oauth-scopes');
  if (scopes && !/(^|,\s*)repo(,|$)/.test(scopes)) return `the scope "repo" is missing (this token has: ${scopes || 'none'}). Tick "repo" and "read:org" when creating it`;
  return '';
}
async function checkWaka(k) {
  const r = await fetch('https://wakatime.com/api/v1/users/current', { headers: { Authorization: `Basic ${Buffer.from(k).toString('base64')}` } }).catch(() => null);
  if (!r) return 'could not reach wakatime.com';
  return r.status === 200 ? '' : `WakaTime rejected this key (HTTP ${r.status}). Copy it again from https://wakatime.com/settings/api-key`;
}
async function checkGitlab(host, t) {
  const r = await fetch(`${host.replace(/\/+$/, '')}/api/v4/user`, { headers: { 'PRIVATE-TOKEN': t }, redirect: 'manual' }).catch(() => null);
  if (!r) return `could not reach ${host}`;
  return r.status === 200 ? '' : `GitLab rejected this token (HTTP ${r.status}). It needs the scope read_api`;
}
// asks until the value passes the check (3 tries); an empty answer skips the secret
async function secretStep(label, help, check, nameInRepo) {
  await step(`secret ${nameInRepo}`, async () => {
    if (!DRY && hasSecret(nameInRepo) && !(await yes(`${nameInRepo} is already stored. Replace it?`, false))) return;
    console.log(help);
    for (let i = 0; i < 3; i++) {
      const v = DRY ? 'dry-run-value' : await secret(`${label} (empty = skip):`);
      if (!v) { console.log('  skipped'); state.skipped = { ...(state.skipped || {}), [nameInRepo]: true }; return; }
      const problem = DRY ? '' : await check(v);
      if (problem) { console.log(`  ${problem}. Try again.`); continue; }
      act(`store secret ${nameInRepo}`, 'gh', ['secret', 'set', nameInRepo, '-R', repo], { input: v });
      return;
    }
    throw new StepError(`${label} was not accepted three times`, 'Create a fresh one and run the command again.');
  });
}

// ---------- 3. repo and local clone
section('3. Repository');
await step('create the repo', async () => {
  const exists = out('gh', ['repo', 'view', repo, '--json', 'name', '--jq', '.name']) !== null;
  if (exists) { console.log(`  ${repo} exists, it will be used.`); return; }
  if (A.dash === 'add') throw new StepError(`${repo} does not exist`, 'Check the name or choose "new" for the dashboard.');
  act('create the profile repo', 'gh', ['repo', 'create', repo, '--public', '--add-readme']);
});
const branch = DRY ? 'main' : (out('gh', ['repo', 'view', repo, '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name']) || 'main');
await step('clone the repo', async () => {
  if (existsSync(join(dirArg, '.git'))) { act('update the clone', 'git', ['-C', dirArg, 'pull', '--rebase', '--autostash'], { allowFail: true }); return; }
  act('clone', 'gh', ['repo', 'clone', repo, dirArg]);
});

// ---------- 4. secrets
section('4. Secrets', 'They are stored as encrypted GitHub secrets in your repo. They are never printed, saved to a file or sent anywhere else.');
if (A.useToken) await secretStep('Paste the token', 'Create a token with the scopes "repo" and "read:org":\n  https://github.com/settings/tokens/new?scopes=repo,read:org&description=stats-kit\n  (choose a long expiry or none, otherwise the stats stop when it runs out)', checkGithubToken, 'STATS_TOKEN');
if (A.useWaka) await secretStep('Paste the WakaTime API key', 'Your key: https://wakatime.com/settings/api-key', checkWaka, 'WAKATIME_API_KEY');
if (A.useGitlab) await secretStep('Paste the GitLab token', `Create a token with the scope read_api: ${A.gitlabHost.replace(/\/+$/, '')}/-/user_settings/personal_access_tokens`, (v) => checkGitlab(A.gitlabHost, v), 'GITLAB_TOKEN');
const skipped = state.skipped || {};

// ---------- 5. workflow files
section('5. Workflow', 'The workflow runs every hour on GitHub. It uses the kit from the "stable" branch, so you always get the tested latest version without doing anything.');
const wfLines = [
  'name: Update stats', 'on:', '  schedule:', "    - cron: '17 * * * *'", '  workflow_dispatch:', 'permissions:', '  contents: write',
  'concurrency:', '  group: update-stats', '  cancel-in-progress: false', 'jobs:', '  update:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4',
  `      - uses: ${KIT}@${KIT_REF}`, '        with:',
  `          token: \${{ secrets.${A.useToken && !skipped.STATS_TOKEN ? 'STATS_TOKEN' : 'GITHUB_TOKEN'} }}`,
  `          components: ${components.join(',')}`, `          output-dir: ${A.outDir}`, `          timezone: ${A.tz}`,
];
if (A.useWaka && !skipped.WAKATIME_API_KEY) wfLines.push('          wakatime-key: ${{ secrets.WAKATIME_API_KEY }}');
if (A.useGitlab && !skipped.GITLAB_TOKEN) {
  wfLines.push(`          gitlab-sources: '[{"host":"${A.gitlabHost.replace(/\/+$/, '')}","token":"\${{ secrets.GITLAB_TOKEN }}"}]'`, `          gitlab-author-emails: ${A.gitlabEmails}`);
}
if (A.exclude) wfLines.push(`          exclude-lines: '${A.exclude.replace(/'/g, '')}'`);
wfLines.push("          commit: 'true'");
const yml = wfLines.join('\n') + '\n';
console.log(yml);
await step('write the workflow files', async () => {
  if (DRY) return;
  const wfDir = join(dirArg, '.github', 'workflows');
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(join(wfDir, 'stats.yml'), yml);
  // "Save & rebuild" of the dashboard needs this one, and it only works when the files live in the repo root
  if (A.dash !== 'no' && A.outDir === '.') {
    const t = readFileSync(join(KIT_DIR, 'examples', 'apply-theme.yml'), 'utf8').replace(/apply-theme@v\d+/g, `apply-theme@${KIT_REF}`).replace('--ref main', `--ref ${branch}`);
    writeFileSync(join(wfDir, 'apply-theme.yml'), t);
  }
  if (A.useTracker) { mkdirSync(join(dirArg, A.outDir), { recursive: true }); copyFileSync(join(KIT_DIR, 'tools', 'track-tokens.mjs'), join(dirArg, A.outDir, 'track-tokens.mjs')); }
});
await step('commit and push', async () => {
  act('stage', 'git', ['-C', dirArg, 'add', '-A', '.github', ...(A.useTracker ? [join(A.outDir, 'track-tokens.mjs')] : [])]);
  const nothing = DRY ? false : run('git', ['-C', dirArg, 'diff', '--cached', '--quiet']).status === 0;
  if (nothing) { console.log('  nothing new to commit (already there)'); return; }
  act('commit', 'git', ['-C', dirArg, 'commit', '-m', 'Add stats and achievements workflow']);
  const p = act('push', 'git', ['-C', dirArg, 'push'], { allowFail: true });
  if (p.status !== 0) { act('sync', 'git', ['-C', dirArg, 'pull', '--rebase', '--autostash']); act('push again', 'git', ['-C', dirArg, 'push']); }
});

// ---------- 6. pages, first run
section('6. Website and first run');
if (A.dash !== 'no') {
  await step('enable GitHub Pages', async () => {
    const r = act('enable GitHub Pages', 'gh', ['api', '-X', 'POST', `repos/${repo}/pages`, '-f', `source[branch]=${branch}`, '-f', 'source[path]=/'], { allowFail: true });
    if (r.status !== 0 && !/already|409|422/i.test(`${r.stderr}`)) throw new StepError(`Pages could not be enabled: ${String(r.stderr).trim().slice(-160)}`, `Open https://github.com/${repo}/settings/pages, choose "Deploy from a branch", branch ${branch}, folder /.`);
  });
}
await step('start the first run', async () => {
  for (let i = 0; i < 8; i++) {
    const r = act('first run', 'gh', ['workflow', 'run', 'stats.yml', '-R', repo], { allowFail: true });
    if (r.status === 0) return;
    await sleep(5000); // GitHub needs a few seconds to see the new workflow
  }
  throw new StepError('The workflow could not be started', `Open https://github.com/${repo}/actions, choose "Update stats" and press "Run workflow".`);
});
if (!DRY) {
  await sleep(6000);
  const runId = out('gh', ['run', 'list', '-R', repo, '--workflow', 'stats.yml', '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId']) || '';
  if (runId) {
    console.log('  waiting for the first run (about two minutes) ...');
    const w = run('gh', ['run', 'watch', runId, '-R', repo, '--exit-status'], { stdio: ['ignore', 'ignore', 'ignore'] });
    if (w.status !== 0) {
      console.log('\nThe first run failed. The end of its log:');
      console.log((out('gh', ['run', 'view', runId, '-R', repo, '--log-failed']) || '').split('\n').slice(-25).join('\n'));
      console.log(`\nCommon causes: the token is missing the scope "repo", it expired, or Actions are disabled in the repo.\nFix it, then press "Run workflow" at https://github.com/${repo}/actions (no need to run this setup again).`);
    } else console.log('  the first run worked.');
  }
}

// ---------- 7. token card
if (A.useTracker) {
  section('7. Claude Code token card');
  const script = join(dirArg, A.outDir, 'track-tokens.mjs');
  await step('first token upload', async () => { act('track tokens', process.execPath, [script, '--push'], { allowFail: true }); });
  console.log('Run it regularly so the card stays current (it reads only token numbers, never your chats):');
  console.log(`  Windows: schtasks /create /sc hourly /tn "stats-tokens" /tr "node \\"${script}\\" --push"`);
  console.log(`  macOS/Linux (crontab -e): 0 * * * * node "${script}" --push`);
}

// ---------- done
section('Done');
const [owner, name] = repo.split('/');
const base = A.outDir === '.' ? '' : `${A.outDir}/`;
if (A.wantStats) console.log(`\nAdd this to your profile README (${profileRepo}):\n  ![Stats](https://raw.githubusercontent.com/${repo}/${branch}/${base}stats.svg)`);
if (A.dash !== 'no') {
  const site = `https://${owner}.github.io/${name === `${owner}.github.io` ? '' : `${name}/`}${base}`;
  console.log(`\nDashboard (a minute after the first run): ${site}`);
  console.log(`To change themes and settings: open ${site} and click "Customize" in the footer (or add #settings to the address).`);
}
console.log(`\nUpdates: the workflow follows the "${KIT_REF}" branch of the kit, new versions arrive on their own.`);
console.log('More options (themes, intro text, GitLab, Master Road, excluding files): README of the kit.');
closing = true; rl.close();
