import { TitleOdd } from '../data/odds';
import { toTeamRef } from '../data/countries';
import { Match, MatchStatus, TeamRef, WorldCupData } from '../data/types';
import { teamKey } from './standings';
import { buildStrength } from './strength';

/**
 * Resolves the knockout bracket from the group data.
 *
 * openfootball ships the bracket skeleton: each knockout fixture carries slot
 * codes — "1A"/"2B" (group winner/runner-up), "3A/B/C/D/F" (a best third from
 * one of those groups) and "W73"/"L101" (winner/loser of an earlier match) —
 * plus real dates and venues. The group stage is over, so the entire Round of 32
 * is locked: we hard-code those 16 match-ups (see R32_FINAL) rather than derive
 * them from the table or guess FIFA's third-place allocation. From the Round of
 * 16 on, each "W##"/"L##" slot resolves through the earlier result; anything not
 * yet played is projected from team strength (flagged as estimated in the UI).
 */

/**
 * The final Round of 32, locked once the group stage finished. Keyed by the
 * openfootball match number → [home, away] (matching the published FIFA/Fox
 * bracket). Names resolve through toTeamRef, so aliases/spellings are handled.
 */
const R32_FINAL: Record<number, [string, string]> = {
  73: ['South Africa', 'Canada'],
  74: ['Germany', 'Paraguay'],
  75: ['Netherlands', 'Morocco'],
  76: ['Brazil', 'Japan'],
  77: ['France', 'Sweden'],
  78: ['Ivory Coast', 'Norway'],
  79: ['Mexico', 'Ecuador'],
  80: ['England', 'DR Congo'],
  81: ['USA', 'Bosnia & Herzegovina'],
  82: ['Belgium', 'Senegal'],
  83: ['Portugal', 'Croatia'],
  84: ['Spain', 'Austria'],
  85: ['Switzerland', 'Algeria'],
  86: ['Argentina', 'Cape Verde'],
  87: ['Colombia', 'Ghana'],
  88: ['Australia', 'Egypt'],
};

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
  /** Shootout totals when the tie was decided on penalties, else null. */
  penalties: { home: number; away: number } | null;
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

function confirmedSide(name: string): Side {
  const t = toTeamRef(name);
  return { team: t, label: t.name, confirmed: true };
}

function numOf(m: Match): number {
  const mt = m.id.match(/(\d+)\s*$/);
  return mt ? Number(mt[1]) : NaN;
}

export function buildBracket(data: WorldCupData, odds?: TitleOdd[] | null): Bracket {
  const groups = data.groups;
  const strength = buildStrength(groups, odds);

  const ko = data.matches.filter(
    (m) => (ROUND_ORDER as readonly string[]).includes(m.round) || m.round === 'Match for third place'
  );
  const byNum = new Map<number, Match>();
  for (const m of ko) {
    const n = numOf(m);
    if (!Number.isNaN(n)) byNum.set(n, m);
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

  function resolveSide(raw: string | undefined): Side {
    const s = (raw ?? '').trim();
    let g: RegExpMatchArray | null;
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
    // Round of 32 is locked — take the hard-coded match-up; everything else
    // (R16+) resolves through the earlier W##/L## results.
    const fixed = R32_FINAL[num];
    const home = fixed ? confirmedSide(fixed[0]) : resolveSide(m.homeSlot);
    const away = fixed ? confirmedSide(fixed[1]) : resolveSide(m.awaySlot);
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
          penalties: m.penalties,
          status: m.status,
          statusLabel: m.statusLabel,
          row: rowByNum.get(numOf(m)) ?? 0,
          feeders: feedersOf(m).map((f) => f.id),
        };
      });
    return { round, matches };
  });

  // Estimated while any shown side is still a projection (not yet confirmed).
  // The Round of 32 is locked, so only unplayed R16+ ties can be estimates.
  const estimated = columns.some((c) => c.matches.some((m) => !m.home.confirmed || !m.away.confirmed));

  return { columns, finalised: true, estimated };
}
