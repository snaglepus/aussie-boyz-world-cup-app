import { GroupTable, Match, Standing, TeamRef } from '../data/types';

/**
 * Builds group tables from finished group-stage matches. openfootball doesn't
 * ship standings, so we compute them — and it means the table updates the moment
 * a result lands. Sort order follows FIFA's primary tiebreakers: points, then
 * goal difference, then goals for (head-to-head is omitted for simplicity).
 */
export function computeGroupTables(matches: Match[]): GroupTable[] {
  const groups = new Map<string, Map<string, Standing>>();

  const ensure = (group: string, team: TeamRef): Standing => {
    if (!groups.has(group)) groups.set(group, new Map());
    const table = groups.get(group)!;
    const key = team.code + team.name;
    if (!table.has(key)) {
      table.set(key, { team, mp: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0, gd: 0, form: [] });
    }
    return table.get(key)!;
  };

  const groupMatches = matches
    .filter((m) => m.group && !m.home.isPlaceholder && !m.away.isPlaceholder)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));

  for (const m of groupMatches) {
    const home = ensure(m.group!, m.home);
    const away = ensure(m.group!, m.away);
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null) continue;

    home.mp++; away.mp++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.w++; home.pts += 3; away.l++;
      home.form.push('W'); away.form.push('L');
    } else if (m.homeScore < m.awayScore) {
      away.w++; away.pts += 3; home.l++;
      away.form.push('W'); home.form.push('L');
    } else {
      home.d++; away.d++; home.pts++; away.pts++;
      home.form.push('D'); away.form.push('D');
    }
  }

  const result: GroupTable[] = [];
  for (const [group, table] of groups) {
    const rows = [...table.values()].map((s) => ({ ...s, gd: s.gf - s.ga }));
    rows.sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
    );
    for (const r of rows) r.form = r.form.slice(-5);
    result.push({ group, rows });
  }

  result.sort((a, b) => a.group.localeCompare(b.group));
  return result;
}

/** Stable key identifying a team within the computed tables. */
export function teamKey(t: TeamRef): string {
  return t.code + t.name;
}

const GROUP_GAMES = 3; // matches each team plays in the group stage

export type ThirdPlaceAssessment = {
  /** Keys of the best `slots` third-placed teams (would qualify right now). */
  qualifiers: Set<string>;
  /** team key → heuristic confidence (0–100) of holding a top-`slots` spot. */
  confidence: Map<string, number>;
  /** Overall confidence in the current cut: mean confidence of the qualifiers. */
  overall: number;
};

/**
 * Ranks the third-placed team from every group (FIFA tiebreakers we can derive:
 * points → goal difference → goals for; conduct/world-ranking aren't in the feed)
 * and estimates, for each, a heuristic confidence of finishing among the best
 * `slots` (default 8) that take a Round-of-32 wildcard.
 *
 * The heuristic is deliberately simple and transparent: a team's confidence is
 * driven by its points margin to the cut-off line, scaled by how many points are
 * still in play (3 per remaining group game). With the groups complete the margin
 * is decisive (100% in / 0% out); early on, when lots of points remain, every
 * team trends toward 50%. It does not model team strength or intra-group movement.
 */
export function assessThirdPlaced(groups: GroupTable[], slots = 8): ThirdPlaceAssessment {
  const thirds = groups
    .map((g) => g.rows[2])
    .filter((r): r is Standing => !!r)
    .sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
    );

  const remaining = (s: Standing) => Math.max(0, GROUP_GAMES - s.mp);
  const swing = GROUP_GAMES * thirds.reduce((mx, s) => Math.max(mx, remaining(s)), 0);

  const qualifiers = new Set<string>();
  const confidence = new Map<string, number>();

  thirds.forEach((s, i) => {
    const inSlot = i < slots;
    if (inSlot) qualifiers.add(teamKey(s.team));

    let conf: number;
    if (swing === 0) {
      conf = inSlot ? 100 : 0; // group stage done → the cut is final
    } else {
      // Compare to the team on the other side of the 8th/9th boundary.
      const boundary = inSlot ? thirds[slots] : thirds[slots - 1];
      const margin = boundary ? s.pts - boundary.pts : inSlot ? swing : -swing;
      conf = Math.round(clamp01(0.5 + (0.5 * margin) / swing) * 100);
    }
    confidence.set(teamKey(s.team), conf);
  });

  const inConfs = thirds.slice(0, slots).map((s) => confidence.get(teamKey(s.team)) ?? 0);
  const overall = inConfs.length ? Math.round(inConfs.reduce((a, b) => a + b, 0) / inConfs.length) : 0;

  return { qualifiers, confidence, overall };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
