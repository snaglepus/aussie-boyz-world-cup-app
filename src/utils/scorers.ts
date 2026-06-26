import { Match, TeamRef } from '../data/types';

/**
 * Golden Boot leaderboard, built from the goal events the schedule feed already
 * carries. The Golden Boot goes to the tournament's top scorer; own goals never
 * count, penalties do. The official tie-breakers are (1) goals, (2) assists,
 * (3) fewest minutes played — but our feed only has goals, so players level on
 * goals share a rank until the assists/minutes overlay is wired in.
 */
export type ScorerRow = {
  rank: number; // joint: players level on goals share a rank
  player: string;
  team: TeamRef;
  goals: number;
  penalties: number;
};

export function buildGoldenBoot(matches: Match[]): ScorerRow[] {
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

  // Sort by goals; within a tie, show fewer-penalty (more open-play) scorers first,
  // then alphabetically. Rank itself is by goals only, so ties are joint.
  const sorted = [...agg.values()].sort(
    (a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.localeCompare(b.player)
  );

  let rank = 0;
  let prevGoals = -1;
  return sorted.map((r, i) => {
    if (r.goals !== prevGoals) {
      rank = i + 1;
      prevGoals = r.goals;
    }
    return { rank, player: r.player, team: r.team, goals: r.goals, penalties: r.penalties };
  });
}
