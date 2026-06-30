import { toTeamRef } from './countries';
import { devig, impliedFromAmerican } from '../utils/winprob';
import { CardEvent, GoalEvent, Match, MatchOdds } from './types';

/**
 * ESPN's public, keyless scoreboard endpoint — the real-time source. Unlike
 * BALLDONTLIE (whose live data is paywalled), this is free, requires no API key
 * and sends permissive CORS headers, so it works straight from the browser in a
 * serverless static build. It powers live in-match scores, the match clock and
 * goal/card events, which are then overlaid onto the openfootball schedule.
 *
 * The scoreboard returns the current matchday's fixtures. Responses are read
 * defensively — ESPN's schema is stable but we never want a shape change to
 * crash the app, so anything unexpected silently degrades to the fallback.
 */

const SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

type AnyObj = Record<string, any>;

export async function fetchEspnLive(): Promise<Match[] | null> {
  try {
    const res = await fetch(SCOREBOARD, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as AnyObj;
    const events: AnyObj[] = Array.isArray(json.events) ? json.events : [];
    return events.map(normaliseEvent).filter((m): m is Match => m !== null);
  } catch {
    return null;
  }
}

function normaliseEvent(ev: AnyObj): Match | null {
  const comp = ev.competitions?.[0];
  const competitors: AnyObj[] = comp?.competitors ?? [];
  const homeC = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const awayC = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  if (!homeC || !awayC) return null;

  const home = toTeamRef(teamName(homeC.team));
  const away = toTeamRef(teamName(awayC.team));

  const status = comp.status ?? ev.status ?? {};
  const state = String(status.type?.state ?? '').toLowerCase(); // pre | in | post
  const matchStatus: Match['status'] =
    state === 'in' ? 'live' : state === 'post' ? 'finished' : 'scheduled';

  // Map each side's ESPN team id so we can attribute goal/card events.
  const teamSide = new Map<string, 'home' | 'away'>();
  if (homeC.team?.id != null) teamSide.set(String(homeC.team.id), 'home');
  if (awayC.team?.id != null) teamSide.set(String(awayC.team.id), 'away');
  const { goals, cards } = extractEvents(comp.details ?? [], teamSide);
  const odds = extractOdds(comp, state);

  return {
    id: `espn-${ev.id ?? `${home.code}-${away.code}`}`,
    round: '', // overlay preserves openfootball's round/group
    group: undefined,
    date: String(ev.date ?? '').slice(0, 10),
    time: '',
    kickoff: ev.date ?? null,
    ground: comp.venue?.fullName ?? undefined,
    home,
    away,
    homeScore: numOrNull(homeC.score),
    awayScore: numOrNull(awayC.score),
    htScore: null,
    goals,
    cards,
    stats: [],
    penalties: null,
    odds,
    status: matchStatus,
    statusLabel: liveLabel(matchStatus, status),
    source: 'live',
  };
}

/**
 * Three-way match odds from ESPN's moneyline block. We prefer the `current`
 * (in-play) price, falling back to `close` then `open`, and de-vig the trio into
 * a clean probability distribution. Finished games carry no odds (returns null).
 */
function extractOdds(comp: AnyObj, state: string): MatchOdds | null {
  const o: AnyObj | undefined = (comp.odds ?? [])[0];
  if (!o) return null;
  const ml: AnyObj = o.moneyline ?? {};
  const pick = (side: AnyObj | undefined, topFallback?: unknown): number | null => {
    const price = side?.current?.odds ?? side?.close?.odds ?? side?.open?.odds;
    return impliedFromAmerican(price) ?? (topFallback != null ? impliedFromAmerican(topFallback as string) : null);
  };
  const h = pick(ml.home);
  const a = pick(ml.away);
  const d = pick(ml.draw, o.drawOdds?.moneyLine);
  if (h == null || a == null || d == null) return null;
  const dv = devig(h, d, a);
  if (!dv) return null;
  return { ...dv, live: state === 'in' };
}

/** ESPN nests the country name a few ways depending on the feed. */
function teamName(t: AnyObj | undefined): string {
  if (!t) return '';
  return t.displayName ?? t.name ?? t.location ?? t.shortDisplayName ?? t.abbreviation ?? '';
}

function liveLabel(status: Match['status'], raw: AnyObj): string {
  if (status === 'finished') return 'FT';
  if (status !== 'live') return '';
  const desc = String(raw.type?.description ?? '');
  if (/half\s?time|^ht$/i.test(desc)) return 'HT';
  // displayClock is the in-match minute, e.g. "23'"; shortDetail is a backstop.
  return String(raw.displayClock ?? raw.type?.shortDetail ?? 'LIVE').trim() || 'LIVE';
}

function extractEvents(details: AnyObj[], teamSide: Map<string, 'home' | 'away'>) {
  const goals: GoalEvent[] = [];
  const cards: CardEvent[] = [];
  if (!Array.isArray(details)) return { goals, cards };

  for (const d of details) {
    const side = teamSide.get(String(d.team?.id ?? '')) ?? 'home';
    const minute = cleanMinute(d.clock?.displayValue ?? d.clock?.value);
    const name = d.athletesInvolved?.[0]?.displayName ?? d.athletesInvolved?.[0]?.shortName ?? '';
    const typeText = String(d.type?.text ?? '');

    if (d.scoringPlay === true || /goal/i.test(typeText)) {
      goals.push({
        name,
        minute,
        penalty: d.penaltyKick === true || /penalt/i.test(typeText),
        ownGoal: d.ownGoal === true || /own goal/i.test(typeText),
        team: side,
      });
    }
    if (d.redCard === true || d.yellowCard === true || /card/i.test(typeText)) {
      cards.push({ name, minute, color: d.redCard === true ? 'red' : 'yellow', team: side });
    }
  }
  return { goals, cards };
}

/** "23'" → "23"; the UI appends its own apostrophe. */
function cleanMinute(v: unknown): string {
  const s = String(v ?? '').trim();
  const m = s.match(/\d+(?:\+\d+)?/);
  return m ? m[0] : s.replace(/'+$/, '');
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
