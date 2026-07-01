import { toTeamRef } from './countries';
import { CardEvent, MatchStats } from './types';

export type SubEvent = { minute: string; team: 'home' | 'away'; on: string; off: string };
export type LineupPlayer = { name: string; jersey: string; pos: string; starter: boolean };
export type TeamLineup = { formation: string; players: LineupPlayer[] };
export type CommentaryItem = { minute: string; text: string };

export type EspnMatchDetail = {
  stats: MatchStats[];
  /** Card events parsed from the summary, used when the base feed has none. */
  cards: CardEvent[];
  /** Substitutions (in / out + minute), for the live events timeline. */
  subs: SubEvent[];
  /** Starting XIs + formation per side, or null when unavailable. */
  lineups: { home: TeamLineup; away: TeamLineup } | null;
  /** Running play-by-play, oldest → newest. */
  commentary: CommentaryItem[];
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
    add('Passes', 'totalPasses');
    add('Pass accuracy', 'passPct', true);
    add('Crosses', 'totalCrosses');
    add('Corners', 'wonCorners');
    add('Offsides', 'offsides');
    add('Fouls', 'foulsCommitted');
    add('Yellow cards', 'yellowCards');
    add('Red cards', 'redCards');

    const cards = parseCards(sum, home.team?.id, away.team?.id).sort(
      (x, y) => minuteNum(x.minute) - minuteNum(y.minute)
    );
    const subs = parseSubs(sum, home.team?.id, away.team?.id);
    const lineups = parseLineups(sum);
    const commentary = parseCommentary(sum);

    if (!rows.length && !cards.length && !subs.length && !lineups && !commentary.length) return null;
    return { stats: rows, cards, subs, lineups, commentary };
  } catch {
    return null;
  }
}

/** Substitutions from keyEvents: participants[0] comes on, participants[1] goes off. */
function parseSubs(sum: AnyObj, homeId?: string, awayId?: string): SubEvent[] {
  const out: SubEvent[] = [];
  for (const ev of sum?.keyEvents ?? []) {
    if (!/substitution/i.test(ev?.type?.text ?? '')) continue;
    const teamId = String(ev?.team?.id ?? '');
    const team: 'home' | 'away' | null =
      teamId === String(homeId) ? 'home' : teamId === String(awayId) ? 'away' : null;
    if (!team) continue;
    const on = ev?.participants?.[0]?.athlete?.displayName ?? '';
    const off = ev?.participants?.[1]?.athlete?.displayName ?? '';
    const minute = String(ev?.clock?.displayValue ?? '').replace(/'/g, '').trim();
    if (on || off) out.push({ minute, team, on, off });
  }
  return out.sort((a, b) => minuteNum(a.minute) - minuteNum(b.minute));
}

/** Starting XIs + formation from the summary rosters (mapped by homeAway). */
function parseLineups(sum: AnyObj): { home: TeamLineup; away: TeamLineup } | null {
  const rosters: AnyObj[] = sum?.rosters ?? [];
  const build = (r: AnyObj): TeamLineup => ({
    formation: String(r?.formation ?? ''),
    players: (r?.roster ?? [])
      .map((p: AnyObj) => ({
        name: p?.athlete?.displayName ?? '',
        jersey: String(p?.jersey ?? ''),
        pos: String(p?.position?.abbreviation ?? ''),
        starter: p?.starter === true,
      }))
      .filter((p: LineupPlayer) => p.name),
  });
  const home = rosters.find((r) => r?.homeAway === 'home');
  const away = rosters.find((r) => r?.homeAway === 'away');
  if (!home || !away) return null;
  return { home: build(home), away: build(away) };
}

/** Running commentary (oldest → newest), minute + text. */
function parseCommentary(sum: AnyObj): CommentaryItem[] {
  return (sum?.commentary ?? [])
    .map((x: AnyObj) => ({ minute: String(x?.time?.displayValue ?? '').replace(/'/g, '').trim(), text: String(x?.text ?? '') }))
    .filter((x: CommentaryItem) => x.text);
}

function minuteNum(minute: string): number {
  const m = minute.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 999;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 100 : 0);
}
