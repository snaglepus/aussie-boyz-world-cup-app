import Constants from 'expo-constants';
import { toTeamRef } from './countries';
import { CardEvent, GoalEvent, GroupTable, Match, MatchStats, Standing } from './types';

/**
 * BALLDONTLIE FIFA World Cup API — the real-time source. It is only used when an
 * API key is present (set EXPO_PUBLIC_BALLDONTLIE_KEY). Without a key the app
 * falls back to openfootball, so the app is fully functional out of the box and
 * "upgrades" to live data the moment a key is supplied.
 *
 * The key ships inside the client bundle (this is a server-less app), which is an
 * accepted trade-off for a free-tier hobby key.
 *
 * Responses are normalised defensively: BALLDONTLIE's exact field names can vary,
 * so we read several likely shapes and silently fall back on anything unexpected.
 */

const BASE = 'https://api.balldontlie.io/fifa/worldcup/v1';

export function getApiKey(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_BALLDONTLIE_KEY;
  const fromExtra = (Constants.expoConfig?.extra as { balldontlieKey?: string } | undefined)
    ?.balldontlieKey;
  const key = fromEnv || fromExtra || '';
  return key.trim() ? key.trim() : null;
}

export function hasLiveSource(): boolean {
  return getApiKey() !== null;
}

async function get<T>(path: string): Promise<T | null> {
  const key = getApiKey();
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: key } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type AnyObj = Record<string, any>;

/** Fetches games and normalises any it can into our Match shape. */
export async function fetchLiveGames(): Promise<Match[] | null> {
  const payload = await get<AnyObj>('/games?seasons[]=2026&per_page=150');
  if (!payload || !Array.isArray(payload.data)) return null;
  return payload.data.map(normaliseGame).filter(Boolean) as Match[];
}

export async function fetchLiveStandings(): Promise<GroupTable[] | null> {
  const payload = await get<AnyObj>('/group_standings?seasons[]=2026');
  if (!payload || !Array.isArray(payload.data)) return null;
  return normaliseStandings(payload.data);
}

function teamName(t: any): string {
  if (!t) return '';
  return t.name ?? t.full_name ?? t.country ?? t.abbreviation ?? String(t);
}

function normaliseGame(g: AnyObj): Match | null {
  if (!g) return null;
  const home = toTeamRef(teamName(g.home_team ?? g.team_home ?? g.home));
  const away = toTeamRef(teamName(g.visitor_team ?? g.away_team ?? g.team_away ?? g.away));
  const homeScore = numOrNull(g.home_team_score ?? g.home_score ?? g.scores?.home);
  const awayScore = numOrNull(g.visitor_team_score ?? g.away_team_score ?? g.away_score ?? g.scores?.away);
  const statusRaw = String(g.status ?? '').toLowerCase();
  const isLive = /live|in.?progress|1st|2nd|half/.test(statusRaw) || g.period > 0;
  const isFinal = /final|finished|ft|ended|complete/.test(statusRaw);

  const goals = extractGoals(g);
  const cards = extractCards(g);

  return {
    id: `bdl-${g.id ?? `${home.code}-${away.code}-${g.date ?? ''}`}`,
    round: g.round ?? g.stage ?? '',
    group: g.group ?? g.group_name ?? undefined,
    date: (g.date ?? g.datetime ?? '').slice(0, 10),
    time: g.time ?? '',
    kickoff: g.datetime ?? g.date ?? null,
    ground: g.stadium?.name ?? g.venue ?? undefined,
    home,
    away,
    homeScore,
    awayScore,
    htScore: null,
    goals,
    cards,
    stats: extractStats(g),
    penalties: g.penalties
      ? { home: numOrZero(g.penalties.home), away: numOrZero(g.penalties.away) }
      : null,
    status: isLive ? 'live' : isFinal ? 'finished' : 'scheduled',
    statusLabel: isLive
      ? g.clock ?? g.period_display ?? g.time ?? 'LIVE'
      : isFinal
        ? 'FT'
        : g.time ?? '',
    source: 'live',
  };
}

function extractGoals(g: AnyObj): GoalEvent[] {
  const events: any[] = g.goals ?? g.events ?? [];
  if (!Array.isArray(events)) return [];
  return events
    .filter((e) => /goal/i.test(e.type ?? 'goal') && !/miss/i.test(e.type ?? ''))
    .map((e) => ({
      name: e.player?.name ?? e.player ?? e.name ?? '',
      minute: String(e.minute ?? e.time ?? ''),
      penalty: /pen/i.test(e.type ?? '') || e.penalty === true,
      ownGoal: /own/i.test(e.type ?? '') || e.own_goal === true,
      team: /away|visitor/i.test(e.team ?? '') ? 'away' : 'home',
    }));
}

function extractCards(g: AnyObj): CardEvent[] {
  const events: any[] = g.cards ?? g.events ?? [];
  if (!Array.isArray(events)) return [];
  return events
    .filter((e) => /card/i.test(e.type ?? ''))
    .map((e) => ({
      name: e.player?.name ?? e.player ?? e.name ?? '',
      minute: String(e.minute ?? e.time ?? ''),
      color: /red/i.test(e.type ?? e.card ?? '') ? 'red' : 'yellow',
      team: /away|visitor/i.test(e.team ?? '') ? 'away' : 'home',
    }));
}

function extractStats(g: AnyObj): MatchStats[] {
  const s = g.statistics ?? g.stats;
  if (!s) return [];
  const out: MatchStats[] = [];
  const add = (label: string, home: any, away: any, percent = false) => {
    const h = numOrNull(home);
    const a = numOrNull(away);
    if (h != null && a != null) out.push({ label, home: h, away: a, percent });
  };
  add('Possession', s.home?.possession ?? s.possession_home, s.away?.possession ?? s.possession_away, true);
  add('Shots', s.home?.shots ?? s.shots_home, s.away?.shots ?? s.shots_away);
  add('On target', s.home?.shots_on_target, s.away?.shots_on_target);
  add('Corners', s.home?.corners, s.away?.corners);
  add('Fouls', s.home?.fouls, s.away?.fouls);
  return out;
}

function normaliseStandings(data: AnyObj[]): GroupTable[] {
  const byGroup = new Map<string, Standing[]>();
  for (const row of data) {
    const group = row.group ?? row.group_name ?? '?';
    const team = toTeamRef(teamName(row.team ?? row.country));
    const standing: Standing = {
      team,
      mp: numOrZero(row.played ?? row.games_played ?? row.mp),
      w: numOrZero(row.wins ?? row.w),
      d: numOrZero(row.draws ?? row.d),
      l: numOrZero(row.losses ?? row.l),
      pts: numOrZero(row.points ?? row.pts),
      gf: numOrZero(row.goals_for ?? row.gf),
      ga: numOrZero(row.goals_against ?? row.ga),
      gd: numOrZero(row.goal_difference ?? row.gd),
      form: [],
    };
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(standing);
  }
  return [...byGroup.entries()]
    .map(([group, rows]) => ({
      group: group.startsWith('Group') ? group : `Group ${group}`,
      rows: rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

function numOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function numOrZero(v: any): number {
  return numOrNull(v) ?? 0;
}
