// Fetches the World Cup winner odds once at build time and writes them to
// dist/odds.json, so every visitor reads one shared, cached snapshot instead of
// each browser calling The Odds API (keeps the API key off the client entirely
// and usage proportional to builds, not users). Best-effort: never fails the
// build — if the key is missing or the request errors, it just skips.
import fs from 'node:fs';
import path from 'node:path';

const key = (process.env.EXPO_PUBLIC_ODDS_API_KEY ?? '').trim();
const OUT = path.resolve('dist', 'odds.json');
const SPORT = 'soccer_fifa_world_cup_winner';

if (!key) {
  console.log('[odds] No EXPO_PUBLIC_ODDS_API_KEY set — skipping odds snapshot.');
  process.exit(0);
}

const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${key}&regions=uk&markets=outrights&oddsFormat=decimal`;

try {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    console.log(`[odds] HTTP ${res.status} — skipping snapshot.`);
    process.exit(0);
  }
  const json = await res.json();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(json));
  const books = json?.[0]?.bookmakers?.length ?? 0;
  console.log(`[odds] Wrote ${OUT} (${books} bookmakers). Requests remaining: ${res.headers.get('x-requests-remaining') ?? '?'}`);
} catch (e) {
  console.log('[odds] Fetch failed:', e.message, '— skipping snapshot.');
}
process.exit(0);
