import { PlayerStatIndex, normPlayer } from '../data/playerStats';
import { Match, TeamRef } from '../data/types';

/**
 * Golden Boot leaderboard, built from the goal events the schedule feed already
 * carries. The Golden Boot goes to the tournament's top scorer; own goals never
 * count, penalties do. Official tie-breakers: (1) goals, (2) assists, (3) fewest
 * minutes played. Goals come from openfootball; assists + minutes come from the
 * optional ESPN snapshot (see scripts/fetch-players.mjs). Where that snapshot is
 * missing, players level on goals simply share a rank.
 */
export type ScorerRow = {
  rank: number; // joint: players level on goals (& assists) share a rank
  player: string;
  team: TeamRef;
  goals: number;
  penalties: number;
  assists: number; // 0 when unknown
  minutes: number | null; // null when unknown
};

export function buildGoldenBoot(matches: Match[], stats?: PlayerStatIndex | null): ScorerRow[] {
  const agg = new Map<string, { player: string; team: TeamRef; goals: number; penalties: number }>();

  for (const m of matches) {
    // Only real, contested goals — skip un-played fixtures and placeholder sides.
    if (m.status !== 'finished' && m.status !== 'live') continue;
    for (const g of m.goals) {
      if (g.ownGoal || !g.name.trim()) continue;
      const team = g.team === 'home' ? m.home : m.away;
      if (team.isPlaceholder) continue;
      const key = `${g.name.trim().toLowerCase()}|${team.code}`;
      const cur = agg.get(key) ?? { player: g.name.trim(), team, goals: 0, penalties: 0 };
      cur.goals += 1;
      if (g.penalty) cur.penalties += 1;
      agg.set(key, cur);
    }
  }

  const enriched = [...agg.values()].map((r) => {
    const s = stats?.get(normPlayer(r.player));
    return { ...r, assists: s?.assists ?? 0, minutes: s ? s.minutes : null };
  });

  // Official ordering: goals desc → assists desc → fewest minutes → name.
  // Unknown minutes sort last among an otherwise-equal group.
  enriched.sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      (a.minutes ?? Infinity) - (b.minutes ?? Infinity) ||
      a.player.localeCompare(b.player)
  );

  // Joint rank when goals AND assists tie (minutes is approximate, so it orders
  // within a group but doesn't split the printed rank number).
  let rank = 0;
  let prevGoals = -1;
  let prevAssists = -1;
  return enriched.map((r, i) => {
    if (r.goals !== prevGoals || r.assists !== prevAssists) {
      rank = i + 1;
      prevGoals = r.goals;
      prevAssists = r.assists;
    }
    return {
      rank,
      player: r.player,
      team: r.team,
      goals: r.goals,
      penalties: r.penalties,
      assists: r.assists,
      minutes: r.minutes,
    };
  });
}
