import { TitleOdd } from '../data/odds';
import { FIFA_DEFAULT, FIFA_POINTS } from '../data/fifaRankings';
import { GroupTable } from '../data/types';
import { teamKey } from './standings';

/**
 * A blended 0–1 "strength" score per team, used purely to *estimate* who wins
 * each knockout tie. It combines three signals, each normalised across the field:
 *   - betting odds (implied title chance) — the market's all-things view,
 *   - FIFA ranking points — baseline pedigree,
 *   - current World Cup form (group points + goal difference).
 * Odds are weighted highest; when no odds snapshot is available we fall back to
 * ranking + form. This is a guess, not a prediction model.
 */
export function buildStrength(groups: GroupTable[], odds?: TitleOdd[] | null): Map<string, number> {
  const teams = new Map<string, { code: string }>();
  const perf = new Map<string, number>();
  for (const g of groups) {
    for (const r of g.rows) {
      const k = teamKey(r.team);
      teams.set(k, { code: r.team.code });
      perf.set(k, r.pts + 0.4 * r.gd); // simple form score
    }
  }

  const oddsByKey = new Map<string, number>();
  for (const o of odds ?? []) oddsByKey.set(teamKey(o.team), o.impliedPct);
  const hasOdds = oddsByKey.size > 0;

  const norm = (vals: number[]) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return (v: number) => (v - min) / range;
  };

  const perfVals = [...perf.values()];
  const fifaVals = [...teams.values()].map((t) => FIFA_POINTS[t.code] ?? FIFA_DEFAULT);
  const oddsVals = hasOdds ? [...oddsByKey.values()] : [0];
  const nPerf = norm(perfVals.length ? perfVals : [0]);
  const nFifa = norm(fifaVals);
  const nOdds = norm(oddsVals);

  const out = new Map<string, number>();
  for (const [k, t] of teams) {
    const p = nPerf(perf.get(k) ?? 0);
    const f = nFifa(FIFA_POINTS[t.code] ?? FIFA_DEFAULT);
    if (hasOdds) {
      const o = nOdds(oddsByKey.get(k) ?? 0);
      out.set(k, 0.5 * o + 0.3 * f + 0.2 * p);
    } else {
      out.set(k, 0.6 * f + 0.4 * p);
    }
  }
  return out;
}
