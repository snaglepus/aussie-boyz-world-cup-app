# Aussie Boyz World Cup App ⚽️🇦🇺

A clean, modern, **fully client-side** React Native (Expo) app for following the
**2026 FIFA World Cup** — live scores, fixtures & results, and group standings.
No server to deploy: all data is fetched and processed on-device.

## Features

- **Live tab** — the default landing screen whenever a match is in progress.
  Big glanceable score, a pulsing live clock, goal scorers with minutes
  (penalties / own goals annotated), cards, penalty shoot-outs and match stats
  when available.
- **Matches tab** — the default view when nothing is live. Segmented
  **Upcoming / Played**, grouped by day, with the "kickoff time becomes score"
  pattern. Tap any match for full detail.
- **Groups tab** — all 12 group tables (`MP · W · D · L · Pts · GF · GA · GD` +
  **Last 5** form), with qualification colour bands, matching the requested
  layout. Standings are computed on-device from results.
- **Countries everywhere** show their **flag + full name**.
- Polished touches: light/dark mode, tabular figures, skeleton loaders,
  pull-to-refresh, empty states, and adaptive polling (fast while live).

## Data sources

The app is designed around "**real-time where possible, near-real-time as a
fallback**":

| Source | Role | Key needed |
| --- | --- | --- |
| [ESPN scoreboard](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard) | Real-time **live** data (in-match scores, clock, goals, cards) | No |
| [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) | Full schedule, scorers & results | No |
| Bundled snapshot | Offline / first-launch fallback | No |

Resolution order lives in `src/data/service.ts`:

1. openfootball provides the full 104-match schedule and goal scorers.
2. ESPN's free, keyless scoreboard is overlaid on top of the matching fixtures
   (authoritative live status, score, clock and goal/card events).
3. Standings are **computed locally** from results, so the table updates the
   instant a result lands.
4. If the network is unavailable, a bundled snapshot keeps the app usable.

Every source is keyless and CORS-friendly, so the serverless static build works
with **no API keys and no secrets** — nothing to configure.

## Getting started

```bash
npm install            # or: pnpm install / yarn

npm start              # then press "i" for the iOS simulator,
                       # or scan the QR code with Expo Go on your iPhone
```

> Requires the [Expo](https://docs.expo.dev/get-started/installation/) toolchain
> and Xcode for the iOS simulator. If dependency versions drift, run
> `npx expo install --fix`.

## Deploy to the web (GitHub Pages)

The app also runs as a static web build — the quickest way to share a test link,
no simulator or Expo Go needed.

**Automatic (recommended).** A workflow at `.github/workflows/deploy-web.yml`
builds and publishes on every push to `main`. One-time setup:

1. Push this project to `github.com/snaglepus/aussie-boyz-world-cup-app`.
2. Repo **Settings → Pages → Source → "GitHub Actions"**.
3. Push to `main` (or run the workflow manually from the Actions tab). It deploys
   to **https://snaglepus.github.io/aussie-boyz-world-cup-app/**

> The site is served from the `/aussie-boyz-world-cup-app/` subpath, so
> `app.json` sets `experiments.baseUrl` to match. **If you rename the repo,
> update that value.** The workflow writes a `404.html` SPA fallback so deep
> links / hard refreshes work.

**Manual one-command deploy.** Publishes `./dist` to the `gh-pages` branch:

```bash
npm install
npm run deploy:web     # build → 404.html/.nojekyll → push to gh-pages
# then: Settings → Pages → Source → "Deploy from a branch" → gh-pages / root
```

**Local preview only.**

```bash
npm run build:web      # outputs ./dist
npx serve dist         # preview locally
```

> **Web caveat:** the keyless openfootball feed (raw.githubusercontent.com) sends
> permissive CORS and works in the browser. The BALLDONTLIE live API may be
> CORS-restricted from a browser; if so the web build still works via the
> openfootball fallback — full live data is best experienced on iOS.

## Project structure

```
app/                      # expo-router screens
  index.tsx               # entry gate → Live if a match is on, else Matches
  (tabs)/                 # Live · Matches · Groups
  match/[id].tsx          # full match detail
src/
  components/             # Flag, ScoreHero, MatchRow, StandingsTable, …
  data/                   # types, country registry, adapters, service layer
  hooks/useWorldCup.ts    # React Query hook with adaptive polling
  theme/                  # design tokens + light/dark provider
  utils/                  # kickoff parsing, live detection, standings math
```

## Notes & limitations

- The keyless openfootball feed has no true in-match push, so "live" status in
  that mode is derived from the kickoff window — genuinely live scores/cards
  require a BALLDONTLIE key.
- Knockout fixtures show placeholder slots (e.g. "Winner of match 73") until the
  bracket is decided.
- Built iOS-first; the Expo setup also runs on Android and web.
