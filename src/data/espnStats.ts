import { toTeamRef } from './countries';
import { MatchStats } from './types';

/**
 * Full per-match team stats from ESPN's public summary endpoint (keyless,
 * CORS-enabled). openfootball carries results + scorers but no stats/cards for
 * past games, so for a finished match we locate its ESPN event (by date + the
 * two teams) and pull possession, shots, corners, fouls and card counts.
 */
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';

type AnyObj = Record<string, any>;

function espnCode(t: AnyObj | undefined): string {
  return toTeamRef(t?.displayName ?? t?.name ?? t?.shortDisplayName ?? '').code;
}

/** "20260613" shifted by ±days, for the rare date-boundary mismatch. */
function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function findEventId(ymd: string, homeCode: string, awayCode: string): Promise<string | null> {
  const want = new Set([homeCode, awayCode]);
  for (const dd of [ymd, shiftYmd(ymd, 1), shiftYmd(ymd, -1)]) {
    try {
      const sb = (await fetch(`${SCOREBOARD}?dates=${dd}`).then((r) => (r.ok ? r.json() : null))) as AnyObj;
      const events: AnyObj[] = sb?.events ?? [];
      const ev = events.find((e) => {
        const comps: AnyObj[] = e.competitions?.[0]?.competitors ?? [];
        const codes = comps.map((c) => espnCode(c.team));
        return codes.length >= 2 && codes.every((c) => want.has(c));
      });
      if (ev) return String(ev.id);
    } catch {
      // try next candidate date
    }
  }
  return null;
}

export async function fetchEspnMatchStats(
  ymd: string,
  homeCode: string,
  awayCode: string
): Promise<MatchStats[] | null> {
  try {
    const eventId = await findEventId(ymd, homeCode, awayCode);
    if (!eventId) return null;
    const sum = (await fetch(`${SUMMARY}?event=${eventId}`).then((r) => (r.ok ? r.json() : null))) as AnyObj;
    const teams: AnyObj[] = sum?.boxscore?.teams ?? [];
    if (teams.length < 2) return null;

    const statsOf = (t: AnyObj) => {
      const m = new Map<string, number>();
      for (const s of t.statistics ?? []) {
        const v = Number(s.displayValue);
        if (Number.isFinite(v)) m.set(s.name, v);
      }
      return m;
    };
    const home = teams.find((t) => espnCode(t.team) === homeCode);
    const away = teams.find((t) => espnCode(t.team) === awayCode);
    if (!home || !away) return null;
    const h = statsOf(home);
    const a = statsOf(away);

    const rows: MatchStats[] = [];
    const add = (label: string, key: string, percent = false) => {
      const hv = h.get(key);
      const av = a.get(key);
      if (hv != null && av != null) rows.push({ label, home: hv, away: av, percent });
    };
    add('Possession', 'possessionPct', true);
    add('Shots', 'totalShots');
    add('On target', 'shotsOnTarget');
    add('Corners', 'wonCorners');
    add('Fouls', 'foulsCommitted');
    add('Yellow cards', 'yellowCards');
    add('Red cards', 'redCards');
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}
