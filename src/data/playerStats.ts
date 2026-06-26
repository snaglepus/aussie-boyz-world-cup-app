/**
 * Golden Boot tie-breaker data (assists + minutes per player), read from a shared
 * static snapshot the deploy writes at build time from ESPN's keyless feed (see
 * scripts/fetch-players.mjs). Goals stay sourced from openfootball on the client;
 * this only resolves players who are level on goals. Absent snapshot → no tie-
 * breaks (joint ranks), but the goals leaderboard is unaffected.
 */
const SNAPSHOT_URL = '/aussie-boyz-world-cup-app/players-stats.json';

export type PlayerStat = { assists: number; minutes: number };
/** Map of normalised player name → tie-breaker stats. */
export type PlayerStatIndex = Map<string, PlayerStat>;

/** Normalise a player name for cross-feed matching. Mirrors fetch-players.mjs. */
export function normPlayer(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type AnyObj = Record<string, any>;

export async function fetchPlayerStats(): Promise<PlayerStatIndex | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as AnyObj;
    const players = data?.players;
    if (!players || typeof players !== 'object') return null;
    const map: PlayerStatIndex = new Map();
    for (const [key, v] of Object.entries(players)) {
      const stat = v as AnyObj;
      map.set(key, { assists: Number(stat.assists) || 0, minutes: Number(stat.minutes) || 0 });
    }
    return map;
  } catch {
    return null;
  }
}
