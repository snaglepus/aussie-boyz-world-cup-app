import { toTeamRef } from './countries';
import { TeamRef } from './types';

/**
 * Tournament-winner odds, read from a shared static snapshot (odds.json) that the
 * deploy writes once at build time from The Odds API (see scripts/fetch-odds.mjs).
 * Every visitor reads the same cached file — the API key never reaches the
 * browser, and usage scales with builds, not users. We average the implied
 * probability across the UK books' "outrights" market and normalise it to a
 * clean win-chance percentage. If the snapshot is absent the strip stays hidden.
 */

// Same-origin static file under the Pages base path (matches app.json baseUrl).
const SNAPSHOT_URL = '/aussie-boyz-world-cup-app/odds.json';

export type TitleOdd = {
  team: TeamRef;
  /** Market decimal odds (averaged across books) — e.g. 5.0 → "$5.00". */
  decimal: number;
  /** Normalised win-chance percentage (the field sums to ~100%). */
  impliedPct: number;
};

type AnyObj = Record<string, any>;

export async function fetchTitleOdds(): Promise<TitleOdd[] | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, { headers: { Accept: 'application/json' } });
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
