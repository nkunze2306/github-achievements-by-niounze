# GitHub Achievements by niounze

Custom, self-updating achievements for your GitHub profile. 34 achievements in 7 groups, most with several levels, plus legendary ones.
The card shows the achievements closest to their next level, a second image lists all of them.

```md
![Achievements](achievements.svg)
```

## Use it (no copying, no editing)

1. In your profile repo (`<you>/<you>`) create `.github/workflows/achievements.yml` from [`examples/achievements-workflow.yml`](examples/achievements-workflow.yml).
2. Add the secret `STATS_TOKEN` (a personal access token with `repo` and `read:org` scope counts private repos too; without it only public data is used).
3. Optional: add `WAKATIME_API_KEY` (API key or OAuth token) for Coding Time, Marathon and Consistent.
4. Run the workflow once. It commits `achievements.svg`, `achievements-all.svg` and `achievements.json`.

The achievement list and all thresholds are read from this repo's [`achievements.config.json`](achievements.config.json) at the pinned version (`@v1`). They cannot be changed from your side. Only the owner of this repo can change them (see `.github/CODEOWNERS`).

## Config

All values live in `achievements.config.json`:

- `settings`: time zone, night/early hours, quickdraw minutes, monster PR size, AI co-author pattern, number of cards.
- `achievements[]`: `id`, `group`, `name`, `metric`, `unit`, `tiers` (the thresholds), `color`, optional `legendary`, `requires: "wakatime"`.
- Add an achievement by adding an entry. Use a built-in metric or a GitHub search:
  `{ "id": "my-prs", "group": "collaboration", "name": "My PRs", "metric": "search", "query": "type:pr author:{login} is:merged", "unit": "PRs", "tiers": [1, 10, 100] }`

Built-in metrics: `commits`, `longestStreak`, `activeDays`, `nightCommits`, `earlyCommits`, `weekendCommits`, `maxCommitsPerDay`, `prsMerged`, `reviews`, `issuesClosed`, `foreignRepos`, `foreignMergedPRs`, `quickdraws`, `stars`, `forks`, `followers`, `linesAdded`, `linesDeleted`, `languages`, `topLanguageLines`, `ownRepos`, `handLines`, `aiCommits`, `wakaHours`, `marathonHours`, `consistentDays`, `unicornCommits`, `christmasCommits`, `newYearCommits`, `monsterPRs`, `cleanSweeps`, `maxRepoStars`.

## Notes

- Commits are counted on all branches and in all repos you can see (merge commits excluded from line counts), so numbers are higher than GitHub's own contribution counter.
- `topLanguageLines` is an estimate: your added lines split by language share.
- Run locally: `STATS_TOKEN=... STATS_LOGIN=you node achievements.mjs --out out` (`--demo` for sample data).

by niounze
