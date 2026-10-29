# Master Road

A separate section (tab **Master Road**) on the website: one road with 23 stations at professional level.

- **Unlock:** from 100 reached achievement levels (every level counts individually, value `gate` in `road.json`). Before that you see a lock with a progress bar.
- **Only the next station is visible.** Completed stations are gold, after that there is only a "?" in the fog.
- **Hover/tap** a station to see: goal, why it matters, how it is checked, proof, your path, effort.
- Stations are strictly sequential. Only once a station is listed in `road-state.json` the next one is revealed.

## Completing a station

Add an entry to `road-state.json` (same order as in `road.json`):

```json
{ "completed": [ { "id": "bottleneck-buster", "proof": "https://github.com/.../pull/1", "date": "2027-01-15" } ] }
```

## Changing content

Names, texts, check questions and steps live in `road.json`. Order in the array = order on the road.

Direct link: `index.html#achievements=road`
