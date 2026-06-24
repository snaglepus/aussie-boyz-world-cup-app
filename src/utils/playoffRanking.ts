import { GroupTable, Standing, TeamRef } from '../data/types';
import { assessThirdPlaced, teamKey } from './standings';

const GROUP_GAMES = 3;

/** Mathematically-clinched status of a team, given remaining group games. */
export type Clinch = 'won-group' | 'qualified' | 'eliminated' | 'none';

export type PlayoffRow = {
  rank: number; // overall 1..N across the whole ranking
  team: TeamRef;
  group: string; // group letter
  posInGroup: number; // 1..4
  mp: number;
  pts: number;
  gd: number;
  gf: number;
  clinch: Clinch;
};

export type BandKey = 'winners' | 'runners' | 'thirds' | 'out';

export type PlayoffBand = {
  key: BandKey;
  label: string;
  sublabel: string;
  rows: PlayoffRow[];
};

function letter(group: string): string {
  return group.replace(/group/i, '').trim();
}

const sortStanding = (a: Standing, b: Standing) =>
  b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name);

/**
 * Builds the single ranked "playoff picture": every team placed into one of four
 * bands by its current group position — group winners, runners-up, the best-8
 * third places (qualifying) and the elimination zone (the other 4 thirds + all
 * fourth-placed teams) — sorted by points within each band, with a continuous
 * overall rank. Teams whose fate is mathematically settled are flagged.
 */
export function buildPlayoffPicture(groups: GroupTable[]): PlayoffBand[] {
  const { qualifiers } = assessThirdPlaced(groups);

  const winners: Standing[] = [];
  const runners: Standing[] = [];
  const thirdsAll: Standing[] = [];
  const fourths: Standing[] = [];
  const groupOf = new Map<string, string>();
  const posOf = new Map<string, number>();

  for (const g of groups) {
    const L = letter(g.group);
    g.rows.forEach((s, i) => {
      groupOf.set(teamKey(s.team), L);
      posOf.set(teamKey(s.team), i + 1);
      if (i === 0) winners.push(s);
      else if (i === 1) runners.push(s);
      else if (i === 2) thirdsAll.push(s);
      else fourths.push(s);
    });
  }

  const qualifyingThirds = thirdsAll.filter((s) => qualifiers.has(teamKey(s.team)));
  const cutThirds = thirdsAll.filter((s) => !qualifiers.has(teamKey(s.team)));
  // Points floor of the current best-8 thirds — a team that can't reach it (and
  // can't make its group's top 2) is mathematically out.
  const thirdFloor = qualifyingThirds.length ? Math.min(...qualifyingThirds.map((s) => s.pts)) : 0;

  const clinch = clinchMap(groups, thirdFloor);

  const defs: { key: BandKey; label: string; sublabel: string; list: Standing[] }[] = [
    { key: 'winners', label: 'Group winners', sublabel: '1st in group · into Round of 32', list: winners.sort(sortStanding) },
    { key: 'runners', label: 'Runners-up', sublabel: '2nd in group · into Round of 32', list: runners.sort(sortStanding) },
    { key: 'thirds', label: 'Best third places', sublabel: 'Top 8 of 12 · take the wildcards', list: qualifyingThirds.sort(sortStanding) },
    { key: 'out', label: 'Elimination zone', sublabel: 'Currently going out', list: [...cutThirds, ...fourths].sort(sortStanding) },
  ];

  let rank = 0;
  return defs.map((d) => ({
    key: d.key,
    label: d.label,
    sublabel: d.sublabel,
    rows: d.list.map((s) => ({
      rank: ++rank,
      team: s.team,
      group: groupOf.get(teamKey(s.team)) ?? '',
      posInGroup: posOf.get(teamKey(s.team)) ?? 0,
      mp: s.mp,
      pts: s.pts,
      gd: s.gd,
      gf: s.gf,
      clinch: clinch.get(teamKey(s.team)) ?? 'none',
    })),
  }));
}

/** Per-team clinch status, computed within each group plus the best-third floor. */
function clinchMap(groups: GroupTable[], thirdFloor: number): Map<string, Clinch> {
  const out = new Map<string, Clinch>();
  const maxPoss = (s: Standing) => s.pts + 3 * Math.max(0, GROUP_GAMES - s.mp);

  for (const g of groups) {
    const rows = g.rows;
    for (const s of rows) {
      const rivals = rows.filter((r) => teamKey(r.team) !== teamKey(s.team));
      // Group won: no rival can reach this team's current points.
      if (rivals.every((r) => maxPoss(r) < s.pts)) {
        out.set(teamKey(s.team), 'won-group');
        continue;
      }
      // Top-2 secured: at most one rival can still reach this team's points.
      if (rivals.filter((r) => maxPoss(r) >= s.pts).length <= 1) {
        out.set(teamKey(s.team), 'qualified');
        continue;
      }
      // Out: ≥2 rivals already beat this team's best, and it can't reach the
      // current best-third points floor even if it wins out.
      const guaranteedAbove = rivals.filter((r) => r.pts > maxPoss(s)).length;
      if (guaranteedAbove >= 2 && maxPoss(s) < thirdFloor) {
        out.set(teamKey(s.team), 'eliminated');
        continue;
      }
      out.set(teamKey(s.team), 'none');
    }
  }
  return out;
}
