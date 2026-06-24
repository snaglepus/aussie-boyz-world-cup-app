/**
 * Squad + team metadata from openfootball's keyless 2026 feeds. Static for the
 * tournament, so the hook that consumes this caches it indefinitely.
 */
const SQUADS_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json';
const TEAMS_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json';

export type Player = {
  number: number | null;
  pos: string; // GK / DF / MF / FW
  name: string;
  club: string;
  clubCountry?: string;
  dob?: string;
};

export type TeamInfo = {
  name: string;
  code: string; // FIFA 3-letter code
  group?: string;
  confederation?: string;
  continent?: string;
  players: Player[];
};

export type TeamInfoIndex = {
  list: TeamInfo[]; // all teams, sorted by name
  byName: Map<string, TeamInfo>; // lower-cased name → info
};

type AnyObj = Record<string, any>;

export async function fetchTeamInfo(): Promise<TeamInfoIndex | null> {
  try {
    const [sqRes, tmRes] = await Promise.all([
      fetch(SQUADS_URL, { headers: { Accept: 'application/json' } }),
      fetch(TEAMS_URL, { headers: { Accept: 'application/json' } }),
    ]);
    if (!sqRes.ok) return null;
    const squads = (await sqRes.json()) as AnyObj[];
    const teams = (tmRes.ok ? await tmRes.json() : []) as AnyObj[];
    if (!Array.isArray(squads)) return null;

    const metaByCode = new Map<string, AnyObj>();
    for (const t of Array.isArray(teams) ? teams : []) metaByCode.set(t.fifa_code, t);

    const list: TeamInfo[] = squads
      .map((s) => {
        const meta = metaByCode.get(s.fifa_code) ?? {};
        return {
          name: s.name,
          code: s.fifa_code,
          group: s.group,
          confederation: meta.confed,
          continent: meta.continent,
          players: (Array.isArray(s.players) ? s.players : []).map((p: AnyObj) => ({
            number: typeof p.number === 'number' ? p.number : null,
            pos: String(p.pos ?? '').toUpperCase(),
            name: p.name ?? '',
            club: p.club?.name ?? '',
            clubCountry: p.club?.country,
            dob: p.date_of_birth,
          })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const byName = new Map(list.map((t) => [t.name.toLowerCase(), t]));
    return { list, byName };
  } catch {
    return null;
  }
}

/** Order/label outfield positions consistently. */
export const POSITION_GROUPS: { key: string; label: string; match: (pos: string) => boolean }[] = [
  { key: 'GK', label: 'Goalkeepers', match: (p) => p === 'GK' },
  { key: 'DF', label: 'Defenders', match: (p) => p === 'DF' || p === 'DEF' || p === 'D' },
  { key: 'MF', label: 'Midfielders', match: (p) => p === 'MF' || p === 'MID' || p === 'M' },
  { key: 'FW', label: 'Forwards', match: (p) => p === 'FW' || p === 'FWD' || p === 'F' || p === 'ST' },
];

export function groupPlayers(players: Player[]) {
  return POSITION_GROUPS.map((g) => ({
    ...g,
    players: players.filter((p) => g.match(p.pos)).sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  })).filter((g) => g.players.length > 0);
}
