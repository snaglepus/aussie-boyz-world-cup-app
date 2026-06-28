import { TitleOdd } from '../data/odds';
import { toTeamRef } from '../data/countries';
import { Match, MatchStatus, TeamRef, WorldCupData } from '../data/types';
import { assessThirdPlaced, teamKey } from './standings';
import { buildStrength } from './strength';

/**
 * Resolves the knockout bracket from the (possibly incomplete) group data.
 *
 * openfootball ships the bracket skeleton: each knockout fixture carries slot
 * codes — "1A"/"2B" (group winner/runner-up), "3A/B/C/D/F" (a best third from
 * one of those groups) and "W73"/"L101" (winner/loser of an earlier match) —
 * plus real dates and venues. We fill those slots from the standings we already
 * compute. Before the group stage finishes the placements are estimates:
 *   - group winners/runners-up come from the live table,
 *   - the 8 best thirds are assigned to their candidate slots by a deterministic
 *     matching (an approximation of FIFA's official allocation table, which only
 *     becomes authoritative once the 8 qualifiers are known).
 * Anything not yet determined (e.g. a match winner) resolves to a TBD label.
 */

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'] as const;
export type KnockoutRound = (typeof ROUND_ORDER)[number];

export type Side = {
  team: TeamRef | null;
  label: string;
  /** True when this team is actually decided (group/match played), not a guess. */
  confirmed: boolean;
};

export type BracketMatch = {
  id: string;
  round: KnockoutRound;
  date: string;
  kickoff: string | null;
  ground?: string;
  home: Side;
  away: Side;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  statusLabel: string;
  /** Vertical position (in Round-of-32 row units) from the real feeder tree, so
   * each match lines up between the two it actually draws from. */
  row: number;
  /** Ids of the (up to two) earlier-round matches that feed this one — used to
   * draw the bracket connector lines. Empty for Round-of-32. */
  feeders: string[];
};

export type BracketColumn = { round: KnockoutRound; matches: BracketMatch[] };
export type Bracket = {
  columns: BracketColumn[];
  /** True once the group stage is decided (R32 teams are confirmed, not guessed). */
  finalised: boolean;
  /** True while any shown match-up is still a projection (i.e. not yet played). */
  estimated: boolean;
};

function letter(group: string): string {
  return group.replace(/group/i, '').trim();
}

function numOf(m: Match): number {
  const mt = m.id.match(/(\d+)\s*$/);
  return mt ? Number(mt[1]) : NaN;
}

export function buildBracket(data: WorldCupData, odds?: TitleOdd[] | null): Bracket {
  const groups = data.groups;
  const strength = buildStrength(groups, odds);

  // Group letter → teams in current finishing order.
  const rank = new Map<string, TeamRef[]>();
  for (const g of groups) rank.set(letter(g.group), g.rows.map((r) => r.team));

  // Best-8 thirds → map of qualifying group letter → that group's third team.
  const { qualifiers } = assessThirdPlaced(groups);
  const qualGroupTeam = new Map<string, TeamRef>();
  for (const g of groups) {
    const third = g.rows[2];
    if (third && qualifiers.has(teamKey(third.team))) qualGroupTeam.set(letter(g.group), third.team);
  }

  const ko = data.matches.filter(
    (m) => (ROUND_ORDER as readonly string[]).includes(m.round) || m.round === 'Match for third place'
  );
  const byNum = new Map<number, Match>();
  for (const m of ko) {
    const n = numOf(m);
    if (!Number.isNaN(n)) byNum.set(n, m);
  }

  const thirdSlotAssign = assignThirds(ko, qualGroupTeam);

  // Group winners/runners-up are locked once every group fixture is played.
  const groupGames = data.matches.filter((m) => m.group && !m.home.isPlaceholder && !m.away.isPlaceholder);
  const groupFinalised = groupGames.length > 0 && groupGames.every((m) => m.status === 'finished');

  // Per-group completion: a winner/runner-up slot (1X/2X) is settled the moment
  // ITS group finishes, even while other groups are still playing.
  const groupDone = new Map<string, boolean>();
  for (const m of groupGames) {
    const L = letter(m.group ?? '');
    groupDone.set(L, (groupDone.get(L) ?? true) && m.status === 'finished');
  }

  // Vertical layout rows from the actual feeder tree: walk down from the Final
  // following each match's W## feeders to order the R32 leaves, then place every
  // parent at the midpoint of its two children. This makes each card line up
  // between the two matches it really draws from (not by match number).
  const feedersOf = (m: Match): Match[] => {
    const fs: Match[] = [];
    for (const slot of [m.homeSlot, m.awaySlot]) {
      const w = (slot ?? '').match(/^W(\d+)$/);
      const f = w ? byNum.get(Number(w[1])) : undefined;
      if (f) fs.push(f);
    }
    return fs;
  };
  const rowByNum = new Map<number, number>();
  const leaves: number[] = [];
  const collectLeaves = (m: Match) => {
    const fs = feedersOf(m);
    if (fs.length === 0) leaves.push(numOf(m));
    else fs.forEach(collectLeaves);
  };
  const finalMatch = ko.find((m) => m.round === 'Final');
  if (finalMatch) collectLeaves(finalMatch);
  leaves.forEach((n, i) => rowByNum.set(n, i));
  const rowOf = (m: Match): number => {
    const n = numOf(m);
    const cached = rowByNum.get(n);
    if (cached !== undefined) return cached;
    rowByNum.set(n, 0); // cycle guard
    const fs = feedersOf(m);
    const r = fs.length ? fs.reduce((s, f) => s + rowOf(f), 0) / fs.length : 0;
    rowByNum.set(n, r);
    return r;
  };
  for (const m of ko) rowOf(m);

  type Resolved = {
    home: Side;
    away: Side;
    winner: TeamRef | null;
    loser: TeamRef | null;
    /** True when the result is real (match played), so winner/loser are confirmed. */
    decided: boolean;
  };
  const resolved = new Map<number, Resolved>();

  function resolveSide(raw: string | undefined, matchNum: number): Side {
    const s = (raw ?? '').trim();
    let g: RegExpMatchArray | null;
    if ((g = s.match(/^([12])([A-L])$/))) {
      const team = (rank.get(g[2]) ?? [])[Number(g[1]) - 1];
      // Confirmed once this slot's own group is fully played (top-2 are then set).
      if (team && !team.isPlaceholder) return { team, label: team.name, confirmed: groupDone.get(g[2]) === true };
      return { team: null, label: g[1] === '1' ? `Winner Grp ${g[2]}` : `Runner-up ${g[2]}`, confirmed: false };
    }
    if (/^3[A-L/]+$/.test(s)) {
      // Once every group is done the 8 best thirds are locked in, so the team is
      // confirmed into the Round of 32. (Which exact slot a third fills follows
      // FIFA's allocation table; our assignment is one valid option among several.)
      const team = thirdSlotAssign.get(matchNum);
      return team
        ? { team, label: team.name, confirmed: groupFinalised }
        : { team: null, label: `3rd ${s.slice(1)}`, confirmed: false };
    }
    if ((g = s.match(/^W(\d+)$/))) {
      const r = resolveMatch(Number(g[1]));
      return r.winner
        ? { team: r.winner, label: r.winner.name, confirmed: r.decided }
        : { team: null, label: `Winner M${g[1]}`, confirmed: false };
    }
    if ((g = s.match(/^L(\d+)$/))) {
      const r = resolveMatch(Number(g[1]));
      return r.loser
        ? { team: r.loser, label: r.loser.name, confirmed: r.decided }
        : { team: null, label: `Loser M${g[1]}`, confirmed: false };
    }
    // openfootball fills the real team name into a slot once it's confirmed.
    if (s) {
      const t = toTeamRef(s);
      if (!t.isPlaceholder) return { team: t, label: t.name, confirmed: true };
    }
    return { team: null, label: s || 'TBD', confirmed: false };
  }

  function resolveMatch(num: number): Resolved {
    const cached = resolved.get(num);
    if (cached) return cached;
    const m = byNum.get(num);
    const placeholder: Resolved = {
      home: { team: null, label: 'TBD', confirmed: false },
      away: { team: null, label: 'TBD', confirmed: false },
      winner: null,
      loser: null,
      decided: false,
    };
    if (!m) {
      resolved.set(num, placeholder);
      return placeholder;
    }
    resolved.set(num, placeholder); // guard against cycles during recursion
    const home = resolveSide(m.homeSlot, num);
    const away = resolveSide(m.awaySlot, num);
    let winner: TeamRef | null = null;
    let loser: TeamRef | null = null;
    let decided = false;
    if (m.status === 'finished' && m.homeScore != null && m.awayScore != null && home.team && away.team) {
      // Decided by the actual result.
      let homeWins: boolean | null = null;
      if (m.homeScore > m.awayScore) homeWins = true;
      else if (m.awayScore > m.homeScore) homeWins = false;
      else if (m.penalties) homeWins = m.penalties.home >= m.penalties.away;
      if (homeWins !== null) {
        winner = homeWins ? home.team : away.team;
        loser = homeWins ? away.team : home.team;
        decided = true;
      }
    } else if (home.team && away.team) {
      // Not played yet → project the stronger side through (a guess, see banner).
      const sh = strength.get(teamKey(home.team)) ?? 0;
      const sa = strength.get(teamKey(away.team)) ?? 0;
      const homeWins = sh !== sa ? sh > sa : home.team.code <= away.team.code;
      winner = homeWins ? home.team : away.team;
      loser = homeWins ? away.team : home.team;
    }
    const out: Resolved = { home, away, winner, loser, decided };
    resolved.set(num, out);
    return out;
  }

  const columns: BracketColumn[] = ROUND_ORDER.map((round) => {
    const matches = ko
      .filter((m) => m.round === round)
      .sort((a, b) => numOf(a) - numOf(b))
      .map((m): BracketMatch => {
        const r = resolveMatch(numOf(m));
        return {
          id: m.id,
          round,
          date: m.date,
          kickoff: m.kickoff,
          ground: m.ground,
          home: r.home,
          away: r.away,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          status: m.status,
          statusLabel: m.statusLabel,
          row: rowByNum.get(numOf(m)) ?? 0,
          feeders: feedersOf(m).map((f) => f.id),
        };
      });
    return { round, matches };
  });

  // Estimated while any shown side is still a projection (not yet confirmed).
  const estimated = columns.some((c) => c.matches.some((m) => !m.home.confirmed || !m.away.confirmed));

  return { columns, finalised: groupFinalised, estimated };
}

/**
 * Assigns each qualifying third's group to a distinct R32 third-place slot whose
 * candidate set includes it (deterministic backtracking — slots in match order,
 * groups alphabetical). Returns slot match number → that group's third team.
 */
// FIFA's official Round-of-32 allocation of the eight best third-placed teams,
// keyed by the set of qualifying third-placed groups, then by each slot's
// candidate set → the group whose third fills it. Candidate-set matching alone is
// ambiguous (many valid bijections), so the official table is the source of truth;
// any combination not listed falls back to the deterministic backtracking below.
const THIRD_ALLOCATION: Record<string, Record<string, string>> = {
  'B,D,E,F,I,J,K,L': {
    'A,B,C,D,F': 'D',
    'C,D,F,G,H': 'F',
    'C,E,F,H,I': 'E',
    'B,E,F,I,J': 'B',
    'A,E,H,I,J': 'I',
    'E,F,G,I,J': 'J',
    'E,H,I,J,K': 'K',
    'D,E,I,J,L': 'L',
  },
};

function assignThirds(ko: Match[], qualGroupTeam: Map<string, TeamRef>): Map<number, TeamRef> {
  const slots = ko
    .filter((m) => m.round === 'Round of 32')
    .map((m) => {
      const raw = [m.homeSlot, m.awaySlot].find((x) => /^3[A-L/]+$/.test(x ?? ''));
      return raw ? { num: numOf(m), cands: raw.slice(1).split('/').sort() } : null;
    })
    .filter((s): s is { num: number; cands: string[] } => !!s)
    .sort((a, b) => a.num - b.num);

  const groups = [...qualGroupTeam.keys()].sort();

  // Official table first — exact, matches the published bracket.
  const official = THIRD_ALLOCATION[groups.join(',')];
  if (official) {
    const map = new Map<number, TeamRef>();
    for (const slot of slots) {
      const grp = official[slot.cands.join(',')];
      const team = grp ? qualGroupTeam.get(grp) : undefined;
      if (team) map.set(slot.num, team);
    }
    if (map.size === slots.length) return map;
  }

  const assign: Record<number, string> = {};
  const usedSlot = new Set<number>();

  const rec = (i: number): boolean => {
    if (i === groups.length) return true;
    const grp = groups[i];
    for (const slot of slots) {
      if (!usedSlot.has(slot.num) && slot.cands.includes(grp)) {
        usedSlot.add(slot.num);
        assign[slot.num] = grp;
        if (rec(i + 1)) return true;
        usedSlot.delete(slot.num);
        delete assign[slot.num];
      }
    }
    return false;
  };
  rec(0);

  const map = new Map<number, TeamRef>();
  for (const [num, grp] of Object.entries(assign)) {
    const team = qualGroupTeam.get(grp);
    if (team) map.set(Number(num), team);
  }
  return map;
}
