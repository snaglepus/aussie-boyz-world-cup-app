import { toTeamRef } from './countries';
import { TeamRef } from './types';

/**
 * Tournament-winner odds from The Odds API (https://the-odds-api.com) — a free,
 * keyed, CORS-enabled aggregator of bookmaker prices, so it works straight from
 * the serverless web build. We average the implied probability across the UK
 * books' "outrights" market and normalise it to a clean win-chance percentage.
 *
 * Gated behind EXPO_PUBLIC_ODDS_API_KEY; without a key the favourites strip is
 * simply hidden. The free tier is ~500 requests/month, so the hook that calls
 * this caches aggressively (see useTitleOdds).
 */

const BASE = 'https://api.the-odds-api.com/v4';
const SPORT = 'soccer_fifa_world_cup_winner';

export type TitleOdd = {
  team: TeamRef;
  /** Approx. market decimal odds (from the averaged implied probability). */
  decimal: number;
  /** Normalised win-chance percentage (the field sums to ~100%). */
  impliedPct: number;
};

function getKey(): string | null {
  const k = (process.env.EXPO_PUBLIC_ODDS_API_KEY ?? '').trim();
  return k ? k : null;
}

export function hasOddsSource(): boolean {
  return getKey() !== null;
}

type AnyObj = Record<string, any>;

export async function fetchTitleOdds(): Promise<TitleOdd[] | null> {
  const key = getKey();
  if (!key) return null;
  const url = `${BASE}/sports/${SPORT}/odds/?apiKey=${key}&regions=uk&markets=outrights&oddsFormat=decimal`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as AnyObj[];
    if (!Array.isArray(data)) return null;

    // Average implied probability (1/price) per team across the books' winner
    // market. We skip Betfair's "outrights_lay" market and any junk prices.
    const tally = new Map<string, { sum: number; n: number }>();
    for (const event of data) {
      for (const bk of event.bookmakers ?? []) {
        const market = (bk.markets ?? []).find((m: AnyObj) => m.key === 'outrights');
        if (!market) continue;
        for (const o of market.outcomes ?? []) {
          const price = Number(o.price);
          if (!o.name || !Number.isFinite(price) || price <= 1) continue;
          const cur = tally.get(o.name) ?? { sum: 0, n: 0 };
          cur.sum += 1 / price;
          cur.n += 1;
          tally.set(o.name, cur);
        }
      }
    }
    if (!tally.size) return null;

    const averaged = [...tally.entries()].map(([name, { sum, n }]) => ({ name, implied: sum / n }));
    const total = averaged.reduce((acc, t) => acc + t.implied, 0) || 1;

    return averaged
      .map(({ name, implied }) => ({
        team: toTeamRef(name),
        decimal: 1 / implied,
        impliedPct: (implied / total) * 100,
      }))
      .sort((a, b) => b.impliedPct - a.impliedPct);
  } catch {
    return null;
  }
}
