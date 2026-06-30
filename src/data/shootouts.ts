/**
 * Penalty-shootout takers, read from a shared static snapshot the deploy writes
 * at build time from ESPN's keyless summary feed (see scripts/fetch-players.mjs).
 * openfootball gives the shootout totals (parsed onto Match.penalties); this adds
 * the per-taker breakdown (who took each kick and whether they scored) for the
 * match-detail screen. Absent snapshot → no taker list, totals still show.
 */
const SNAPSHOT_URL = '/aussie-boyz-world-cup-app/shootouts.json';

export type ShootoutKick = { player: string; scored: boolean };
export type Shootout = { home: ShootoutKick[]; away: ShootoutKick[] };
/** Map of match id (e.g. "of-74") → that match's shootout. */
export type ShootoutIndex = Map<string, Shootout>;

type AnyObj = Record<string, any>;

function takers(v: unknown): ShootoutKick[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => ({ player: String((s as AnyObj)?.player ?? ''), scored: (s as AnyObj)?.scored === true }));
}

export async function fetchShootouts(): Promise<ShootoutIndex | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as AnyObj;
    const shootouts = data?.shootouts;
    if (!shootouts || typeof shootouts !== 'object') return null;
    const map: ShootoutIndex = new Map();
    for (const [id, v] of Object.entries(shootouts)) {
      const s = v as AnyObj;
      map.set(id, { home: takers(s?.home), away: takers(s?.away) });
    }
    return map;
  } catch {
    return null;
  }
}
