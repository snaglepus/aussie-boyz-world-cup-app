import { deriveLiveInfo, parseKickoff } from '../utils/time';
import { toTeamRef } from './countries';
import { GoalEvent, Match } from './types';

const SOURCE_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

type RawGoal = { name: string; minute?: string | number; score?: unknown; penalty?: boolean; owngoal?: boolean };
export type RawMatch = {
  num?: number;
  round?: string;
  group?: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  ground?: string;
  score?: { ft?: [number, number]; ht?: [number, number] };
  goals1?: RawGoal[];
  goals2?: RawGoal[];
};

/**
 * Keyless, public-domain fallback feed. Always available, always free — it
 * provides the full 104-match schedule and goal scorers. It has no live in-match
 * push, so "live" status is derived from the kickoff window (see time.ts).
 */
export async function fetchOpenFootball(now: Date = new Date()): Promise<Match[]> {
  const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`);
  const json = (await res.json()) as { matches: RawMatch[] };
  return normaliseMatches(json.matches ?? [], now);
}

/** Normalises openfootball-shaped raw matches; reused by the bundled snapshot. */
export function normaliseMatches(raw: RawMatch[], now: Date = new Date()): Match[] {
  return raw.map((m, i) => normalise(m, i, now));
}

function normalise(m: RawMatch, index: number, now: Date): Match {
  const kickoff = parseKickoff(m.date, m.time);
  const ft = m.score?.ft ?? null;
  const ht = m.score?.ht ?? null;
  const hasFinal = Array.isArray(ft) && ft.length === 2;

  const goals: GoalEvent[] = [
    ...(m.goals1 ?? []).map((g) => mapGoal(g, 'home')),
    ...(m.goals2 ?? []).map((g) => mapGoal(g, 'away')),
  ].sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute));

  const live = deriveLiveInfo(kickoff, hasFinal, now);
  const home = toTeamRef(m.team1);
  const away = toTeamRef(m.team2);

  return {
    id: `of-${m.num ?? index}`,
    round: m.round ?? '',
    group: m.group,
    date: m.date,
    time: m.time ?? '',
    kickoff: kickoff ? kickoff.toISOString() : null,
    ground: m.ground,
    home,
    away,
    homeScore: hasFinal ? ft![0] : null,
    awayScore: hasFinal ? ft![1] : null,
    htScore: Array.isArray(ht) && ht.length === 2 ? [ht[0], ht[1]] : null,
    goals,
    cards: [], // openfootball does not carry cards
    stats: [],
    penalties: null,
    status: live.status,
    statusLabel: live.label,
    source: 'static',
    homeSlot: m.team1,
    awaySlot: m.team2,
  };
}

function mapGoal(g: RawGoal, team: 'home' | 'away'): GoalEvent {
  return {
    name: g.name,
    minute: String(g.minute ?? ''),
    penalty: g.penalty === true,
    ownGoal: g.owngoal === true,
    team,
  };
}

function minuteValue(minute: string): number {
  const m = minute.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 999;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 100 : 0);
}
