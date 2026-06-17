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
