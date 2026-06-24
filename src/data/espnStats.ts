import { toTeamRef } from './countries';
import { CardEvent, MatchStats } from './types';

export type EspnMatchDetail = {
  stats: MatchStats[];
  /** Card events parsed from the summary, used when the base feed has none. */
  cards: CardEvent[];
};

/**
 * Full per-match team stats from ESPN's public summary endpoint (keyless,
 * CORS-enabled). openfootball carries results + scorers but no stats/cards for
 * past games, so for a finished match we locate its ESPN event (by date + the
 * two teams) and pull possession, shots, corners, fouls and card counts — plus
 * the individual booking events so the timeline matches the stat counts.
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

/** Pull booking events from the summary's keyEvents, mapped to home/away. */
function parseCards(sum: AnyObj, homeId?: string, awayId?: string): CardEvent[] {
  const events: AnyObj[] = sum?.keyEvents ?? sum?.commentary ?? [];
  const cards: CardEvent[] = [];
  for (const ev of Array.isArray(events) ? events : []) {
    const text = String(ev?.type?.text ?? ev?.type?.name ?? '').toLowerCase();
    const isRed = ev?.redCard === true || text.includes('red');
    const isYellow = ev?.yellowCard === true || text.includes('yellow');
    if (!isRed && !isYellow) continue;
    const teamId = String(ev?.team?.id ?? '');
    const team: 'home' | 'away' | null =
      teamId && teamId === String(homeId) ? 'home' : teamId && teamId === String(awayId) ? 'away' : null;
    if (!team) continue;
    const who =
      ev?.athletesInvolved?.[0]?.displayName ??
      ev?.participants?.[0]?.athlete?.displayName ??
      ev?.athletesInvolved?.[0]?.shortName ??
      'Booking';
    const minute = String(ev?.clock?.displayValue ?? ev?.time?.displayValue ?? '').replace(/'/g, '').trim();
    cards.push({ name: who, minute, color: isRed ? 'red' : 'yellow', team });
  }
  return cards;
}

export async function fetchEspnMatchStats(
  ymd: string,
  homeCode: string,
  awayCode: string
): Promise<EspnMatchDetail | null> {
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

    const cards = parseCards(sum, home.team?.id, away.team?.id).sort(
      (x, y) => minuteNum(x.minute) - minuteNum(y.minute)
    );

    if (!rows.length && !cards.length) return null;
    return { stats: rows, cards };
  } catch {
    return null;
  }
}

function minuteNum(minute: string): number {
  const m = minute.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 999;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 100 : 0);
}
