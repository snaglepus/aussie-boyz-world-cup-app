import { computeGroupTables } from '../utils/standings';
import { fetchEspnLive } from './espn';
import { fetchOpenFootball, normaliseMatches } from './openfootball';
import { SAMPLE_RAW_MATCHES } from './sampleData';
import { Match, WorldCupData } from './types';

/**
 * Single entry point the UI consumes. Resolution strategy:
 *   1. openfootball provides the full schedule + scorers (the backbone).
 *   2. ESPN's free, keyless scoreboard overlays real-time status, scores and
 *      goal/card events onto the matching fixtures (no API key required).
 *   3. Standings are computed on-device from results.
 *   4. If openfootball fails, fall back to the bundled snapshot.
 */
export async function loadWorldCup(now: Date = new Date()): Promise<WorldCupData> {
  let base: Match[] = [];
  let source: WorldCupData['source'] = 'static';

  try {
    base = await fetchOpenFootball(now);
  } catch {
    base = normaliseMatches(SAMPLE_RAW_MATCHES, now);
    source = 'bundled';
  }

  const live = await fetchEspnLive().catch(() => null);
  if (live && live.length) {
    const overlaid = overlayLive(base, live);
    if (overlaid.some((m) => m.source === 'live')) {
      base = overlaid;
      if (source !== 'bundled') source = 'live';
    }
  }

  const standings = computeGroupTables(base);

  return {
    matches: sortByKickoff(base),
    groups: standings,
    updatedAt: now.toISOString(),
    source,
  };
}

/** Matches live games onto the static schedule by the two team codes. */
function overlayLive(base: Match[], live: Match[]): Match[] {
  const liveByPair = new Map<string, Match>();
  for (const m of live) liveByPair.set(pairKey(m), m);

  return base.map((m) => {
    const hit = liveByPair.get(pairKey(m));
    if (!hit) return m;
    return {
      ...m,
      homeScore: hit.homeScore ?? m.homeScore,
      awayScore: hit.awayScore ?? m.awayScore,
      goals: hit.goals.length ? hit.goals : m.goals,
      cards: hit.cards.length ? hit.cards : m.cards,
      stats: hit.stats.length ? hit.stats : m.stats,
      penalties: hit.penalties ?? m.penalties,
      status: hit.status,
      statusLabel: hit.statusLabel,
      source: 'live',
    };
  });
}

function pairKey(m: Match): string {
  return [m.home.code, m.away.code].join('-');
}

function sortByKickoff(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
}

export function liveMatches(data: WorldCupData): Match[] {
  return data.matches.filter((m) => m.status === 'live');
}

export function upcomingMatches(data: WorldCupData): Match[] {
  return data.matches.filter((m) => m.status === 'scheduled');
}

export function playedMatches(data: WorldCupData): Match[] {
  return data.matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) => (b.kickoff ?? '').localeCompare(a.kickoff ?? ''));
}
