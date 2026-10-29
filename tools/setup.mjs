#!/usr/bin/env node
// Interactive setup for the GitHub Stats & Achievements kit. Needs Node 20+, git and the GitHub CLI (gh), logged in.
//   npx github:nkunze2306/github-achievements-by-niounze        (one command, everything else is asked)
//   or: git clone https://github.com/nkunze2306/github-achievements-by-niounze && node github-achievements-by-niounze/tools/setup.mjs
//   add --dry-run to see what would happen without changing anything
//
// It: checks which GitHub account is logged in, picks the repo, asks which components you want (and whether you want the
// dashboard website, as a new Pages site or added to an existing one), stores your tokens as secrets (hidden input, never printed),
// writes the workflow, pushes it after you confirm and starts the first run.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const KIT = 'nkunze2306/github-achievements-by-niounze';
const KIT_DIR = fileURLToPath(new URL('..', import.meta.url));

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
const out = (cmd, args, opts) => { const r = run(cmd, args, opts); return r.status === 0 ? r.stdout.trim() : null; };
const act = (label, cmd, args, opts = {}) => {
  if (DRY) { console.log(`  [dry-run] ${label}: ${cmd} ${args.join(' ')}`); return { status: 0, stdout: '' }; }
  const r = run(cmd, args, { stdio: opts.input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'], ...opts });
  if (r.status !== 0) { console.error(`Failed: ${cmd} ${args.join(' ')}`); process.exit(r.status || 1); }
  return r;
};

// log in first (before the prompt reader owns stdin), so a fresh machine needs no extra step
if (spawnSync('gh', ['--version'], { encoding: 'utf8' }).status === 0 && spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status !== 0) {
  console.log('You are not logged in to GitHub yet. Starting the login:');
  spawnSync('gh', ['auth', 'login', '--web', '--git-protocol', 'https'], { stdio: 'inherit' });
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on('close', () => { if (!closing) { console.log('\nInput closed, stopping.'); process.exit(1); } });
let closing = false;
const lines = []; let waiting = null;
rl.on('line', (l) => { if (waiting) { const w = waiting; waiting = null; w(l); } else lines.push(l); });
const ask = (q, def = '') => new Promise((ok) => {
  process.stdout.write(`${q}${def ? ` [${def}]` : ''} `);
  const done = (l) => ok((l.trim() || def));
  if (lines.length) { const l = lines.shift(); console.log(l); done(l); } else waiting = done;
});
const yes = async (q, def = true) => /^y/i.test(await ask(`${q} (${def ? 'Y/n' : 'y/N'})`, def ? 'y' : 'n'));
// hidden input: the text is not echoed and never printed
const secret = (q) => new Promise((ok) => {
  process.stdout.write(`${q} (input is hidden) `);
  if (lines.length) { ok(lines.shift().trim()); return; }
  if (process.stdin.isTTY) { const orig = rl._writeToOutput; rl._writeToOutput = () => {}; waiting = (l) => { rl._writeToOutput = orig; process.stdout.write('\n'); ok(l.trim()); }; }
  else waiting = (l) => ok(l.trim());
});
const section = (t) => console.log(`\n== ${t}`);

console.log(`GitHub Stats & Achievements setup${DRY ? ' (dry run, nothing is changed)' : ''}`);

// 1. account
section('1. GitHub account');
if (out('gh', ['--version']) === null) { console.error('The GitHub CLI (gh) is missing. Install it from https://cli.github.com and run: gh auth login'); process.exit(1); }
const login = out('gh', ['api', 'user', '--jq', '.login']);
if (!login) { console.error('You are not logged in. Run: gh auth login'); process.exit(1); }
console.log(`Logged in to GitHub as: ${login}`);
if (!(await yes('Is this the account the stats are for?'))) { console.log('Switch with "gh auth switch" or log in with "gh auth login", then start this script again.'); process.exit(0); }

// 2. repo
section('2. Repository');
const profileRepo = `${login}/${login}`;
const exists = out('gh', ['repo', 'view', profileRepo, '--json', 'name', '--jq', '.name']) !== null;
let repo = profileRepo;
console.log(exists ? `Your profile repo ${profileRepo} exists.` : `Your profile repo ${profileRepo} does not exist yet.`);

// 3. components
section('3. Components');
const wantStats = await yes('Stats card (stats.svg for your profile README)?');
const wantAch = await yes('Achievements (cards, skill tree)?');
let dash = 'no';
console.log('\nThe dashboard is an interactive website with your stats, all achievements, the skill tree and the Master Road.');
const dashAnswer = await ask('Do you want the dashboard website too? (n = no, new = new GitHub Pages site on your profile repo, add = add it to an existing website)', 'no');
if (/^new/i.test(dashAnswer)) dash = 'new'; else if (/^a/i.test(dashAnswer)) dash = 'add';
const wantRoad = dash !== 'no' ? await yes('Master Road (23 hard pro-level challenges, unlocks at 100 achievement levels)?') : false;
let outDir = '.';
if (dash === 'add') {
  repo = await ask('Repo of your existing website (owner/name)?', `${login}/${login}.github.io`);
  outDir = await ask('Subfolder inside that repo for the dashboard?', 'stats');
  if (out('gh', ['repo', 'view', repo, '--json', 'name', '--jq', '.name']) === null) { console.error(`Repo ${repo} was not found with this account.`); process.exit(1); }
}
const components = [wantStats && 'stats', wantAch && 'achievements', dash !== 'no' && 'dashboard', wantRoad && 'road'].filter(Boolean);
if (!components.length) { console.log('Nothing selected.'); process.exit(0); }

// 4. data sources and secrets
section('4. Data sources');
const tz = await ask('Time zone for night/weekend statistics?', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
console.log('\nA personal access token lets the kit count your private repos too (they stay anonymous, shown as "private repo 1").');
console.log('Create one with the scopes repo and read:org: https://github.com/settings/tokens/new?scopes=repo,read:org&description=stats-kit');
if (await yes('Store a token now? (no = only public data)')) {
  const t = await secret('Paste the token:');
  if (t) act('store secret STATS_TOKEN', 'gh', ['secret', 'set', 'STATS_TOKEN', '-R', repo], { input: t });
}
let waka = false;
if (await yes('Do you use WakaTime (coding time, language and editor stats)?', false)) {
  console.log('Your key: https://wakatime.com/settings/api-key');
  const k = await secret('Paste the WakaTime API key:');
  if (k) { act('store secret WAKATIME_API_KEY', 'gh', ['secret', 'set', 'WAKATIME_API_KEY', '-R', repo], { input: k }); waka = true; }
}

// 5. workflow
section('5. Workflow');
const tag = out('git', ['-C', KIT_DIR, 'describe', '--tags', '--abbrev=0']) || 'v9';
const yml = `name: Update stats
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:
permissions:
  contents: write
concurrency:
  group: update-stats
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${KIT}@${tag}
        with:
          token: \${{ secrets.STATS_TOKEN || secrets.GITHUB_TOKEN }}
          components: ${components.join(',')}
          output-dir: ${outDir}
          timezone: ${tz}
${waka ? '          wakatime-key: ${{ secrets.WAKATIME_API_KEY }}\n' : ''}          commit: 'true'
`;
console.log(yml);
const dirArg = await ask('Folder for the local clone of the repo?', join(dirname(resolve(KIT_DIR)), repo.split('/')[1]));
if (!(await yes(`Create/clone ${repo} there, write .github/workflows/stats.yml and push it?`))) { console.log('Nothing was changed.'); process.exit(0); }

if (!exists && dash !== 'add') act('create the profile repo', 'gh', ['repo', 'create', repo, '--public', '--add-readme']);
if (!existsSync(dirArg)) act('clone', 'gh', ['repo', 'clone', repo, dirArg]);
const wfDir = join(dirArg, '.github/workflows');
if (!DRY) { mkdirSync(wfDir, { recursive: true }); writeFileSync(join(wfDir, 'stats.yml'), yml); }
act('commit', 'git', ['-C', dirArg, 'add', '.github/workflows/stats.yml']);
act('commit', 'git', ['-C', dirArg, 'commit', '-m', 'Add stats and achievements workflow']);
act('push', 'git', ['-C', dirArg, 'push']);

if (dash === 'new') act('enable GitHub Pages', 'gh', ['api', '-X', 'POST', `repos/${repo}/pages`, '-f', 'source[branch]=main', '-f', 'source[path]=/']);
act('first run', 'gh', ['workflow', 'run', 'stats.yml', '-R', repo]);

section('Done');
const base = outDir === '.' ? '' : `${outDir}/`;
console.log(`The first run takes a few minutes: gh run watch -R ${repo}`);
if (wantStats) console.log(`\nAdd this to your profile README (${profileRepo}):\n  ![Stats](https://raw.githubusercontent.com/${repo}/main/${base}stats.svg)`);
if (dash !== 'no') console.log(`\nDashboard (after Pages is built): https://${repo.split('/')[0]}.github.io/${repo.split('/')[1] === `${repo.split('/')[0]}.github.io` ? '' : `${repo.split('/')[1]}/`}${base}`);
console.log('\nMore options (themes, intro text, GitLab, Master Road): README of the kit.');
closing = true; rl.close();
