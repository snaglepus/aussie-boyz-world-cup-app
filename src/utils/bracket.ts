import { Match, MatchStatus, TeamRef, WorldCupData } from '../data/types';
import { assessThirdPlaced, teamKey } from './standings';

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

export type Side = { team: TeamRef | null; label: string };

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
};

export type BracketColumn = { round: KnockoutRound; matches: BracketMatch[] };
export type Bracket = { columns: BracketColumn[]; finalised: boolean };

function letter(group: string): string {
  return group.replace(/group/i, '').trim();
}

function numOf(m: Match): number {
  const mt = m.id.match(/(\d+)\s*$/);
  return mt ? Number(mt[1]) : NaN;
}

export function buildBracket(data: WorldCupData): Bracket {
  const groups = data.groups;

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

  type Resolved = { home: Side; away: Side; winner: TeamRef | null; loser: TeamRef | null };
  const resolved = new Map<number, Resolved>();

  function resolveSide(raw: string | undefined, matchNum: number): Side {
    const s = (raw ?? '').trim();
    let g: RegExpMatchArray | null;
    if ((g = s.match(/^([12])([A-L])$/))) {
      const team = (rank.get(g[2]) ?? [])[Number(g[1]) - 1];
      if (team && !team.isPlaceholder) return { team, label: team.name };
      return { team: null, label: g[1] === '1' ? `Winner Grp ${g[2]}` : `Runner-up ${g[2]}` };
    }
    if (/^3[A-L/]+$/.test(s)) {
      const team = thirdSlotAssign.get(matchNum);
      return team ? { team, label: team.name } : { team: null, label: `3rd ${s.slice(1)}` };
    }
    if ((g = s.match(/^W(\d+)$/))) {
      const w = sideWinner(Number(g[1]));
      return w ? { team: w, label: w.name } : { team: null, label: `Winner M${g[1]}` };
    }
    if ((g = s.match(/^L(\d+)$/))) {
      const l = sideLoser(Number(g[1]));
      return l ? { team: l, label: l.name } : { team: null, label: `Loser M${g[1]}` };
    }
    return { team: null, label: s || 'TBD' };
  }

  function resolveMatch(num: number): Resolved {
    const cached = resolved.get(num);
    if (cached) return cached;
    const m = byNum.get(num);
    const placeholder: Resolved = {
      home: { team: null, label: 'TBD' },
      away: { team: null, label: 'TBD' },
      winner: null,
      loser: null,
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
    if (m.status === 'finished' && m.homeScore != null && m.awayScore != null && home.team && away.team) {
      let homeWins: boolean | null = null;
      if (m.homeScore > m.awayScore) homeWins = true;
      else if (m.awayScore > m.homeScore) homeWins = false;
      else if (m.penalties) homeWins = m.penalties.home >= m.penalties.away;
      if (homeWins !== null) {
        winner = homeWins ? home.team : away.team;
        loser = homeWins ? away.team : home.team;
      }
    }
    const out: Resolved = { home, away, winner, loser };
    resolved.set(num, out);
    return out;
  }
  const sideWinner = (n: number) => resolveMatch(n).winner;
  const sideLoser = (n: number) => resolveMatch(n).loser;

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
        };
      });
    return { round, matches };
  });

  // Finalised once every group fixture has been played.
  const groupGames = data.matches.filter((m) => m.group && !m.home.isPlaceholder && !m.away.isPlaceholder);
  const finalised = groupGames.length > 0 && groupGames.every((m) => m.status === 'finished');

  return { columns, finalised };
}

/**
 * Assigns each qualifying third's group to a distinct R32 third-place slot whose
 * candidate set includes it (deterministic backtracking — slots in match order,
 * groups alphabetical). Returns slot match number → that group's third team.
 */
function assignThirds(ko: Match[], qualGroupTeam: Map<string, TeamRef>): Map<number, TeamRef> {
  const slots = ko
    .filter((m) => m.round === 'Round of 32')
    .map((m) => {
      const raw = [m.homeSlot, m.awaySlot].find((x) => /^3[A-L/]+$/.test(x ?? ''));
      return raw ? { num: numOf(m), cands: raw.slice(1).split('/') } : null;
    })
    .filter((s): s is { num: number; cands: string[] } => !!s)
    .sort((a, b) => a.num - b.num);

  const groups = [...qualGroupTeam.keys()].sort();
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
