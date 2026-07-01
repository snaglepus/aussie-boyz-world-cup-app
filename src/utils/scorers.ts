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
/** One of a scorer's goals, with the game and minute it was scored in. */
export type GoalDetail = {
  matchId: string;
  opponent: TeamRef;
  date: string;
  kickoff: string | null;
  minute: string;
  penalty: boolean;
};

export type ScorerRow = {
  rank: number; // joint: players level on goals (& assists) share a rank
  player: string;
  team: TeamRef;
  goals: number;
  penalties: number;
  assists: number; // 0 when unknown
  minutes: number | null; // null when unknown
  shots: number; // attempts at goal (0 when unknown)
  sot: number; // attempts on target (0 when unknown)
  yellow: number;
  red: number;
  jersey: number | null; // squad number, null when unknown
  hasStats: boolean; // a snapshot row matched this player (extra columns are real)
  events: GoalDetail[]; // every goal, oldest → newest
};

function minuteValue(minute: string): number {
  const m = minute.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 999;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 100 : 0);
}

export function buildGoldenBoot(matches: Match[], stats?: PlayerStatIndex | null): ScorerRow[] {
  const agg = new Map<
    string,
    { player: string; team: TeamRef; goals: number; penalties: number; events: GoalDetail[] }
  >();

  for (const m of matches) {
    // Only real, contested goals — skip un-played fixtures and placeholder sides.
    if (m.status !== 'finished' && m.status !== 'live') continue;
    for (const g of m.goals) {
      if (g.ownGoal || !g.name.trim()) continue;
      const team = g.team === 'home' ? m.home : m.away;
      const opponent = g.team === 'home' ? m.away : m.home;
      if (team.isPlaceholder) continue;
      const key = `${g.name.trim().toLowerCase()}|${team.code}`;
      const cur = agg.get(key) ?? { player: g.name.trim(), team, goals: 0, penalties: 0, events: [] };
      cur.goals += 1;
      if (g.penalty) cur.penalties += 1;
      cur.events.push({ matchId: m.id, opponent, date: m.date, kickoff: m.kickoff, minute: g.minute, penalty: !!g.penalty });
      agg.set(key, cur);
    }
  }

  const enriched = [...agg.values()].map((r) => {
    const s = stats?.get(normPlayer(r.player));
    const events = [...r.events].sort(
      (a, b) => (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date) || minuteValue(a.minute) - minuteValue(b.minute)
    );
    return {
      ...r,
      events,
      assists: s?.assists ?? 0,
      minutes: s ? s.minutes : null,
      shots: s?.shots ?? 0,
      sot: s?.sot ?? 0,
      yellow: s?.yellow ?? 0,
      red: s?.red ?? 0,
      jersey: s?.jersey ?? null,
      hasStats: !!s,
    };
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
      shots: r.shots,
      sot: r.sot,
      yellow: r.yellow,
      red: r.red,
      jersey: r.jersey,
      hasStats: r.hasStats,
      events: r.events,
    };
  });
}
