import { MatchOdds } from '../data/types';

/**
 * Win-probability helpers for the knockout projection.
 *
 * Match odds come from a bookmaker moneyline (American format) via ESPN. We turn
 * them into a clean, de-vigged 3-way distribution, then into each side's chance
 * of *advancing* from a knockout tie. When in play, ESPN's `current` price already
 * moves with the game, so the projection shifts live for free; for a live match
 * with no market line we fall back to nudging a prior by the scoreline.
 */

/** American moneyline ("+175", "-150") → implied probability (vig included). */
export function impliedFromAmerican(odds: string | number | undefined | null): number | null {
  if (odds == null) return null;
  const n = typeof odds === 'number' ? odds : parseInt(String(odds).replace(/[^0-9+-]/g, ''), 10);
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? 100 / (n + 100) : -n / (-n + 100);
}

/** Strip the book's overround so home + draw + away sum to exactly 1. */
export function devig(home: number, draw: number, away: number): { home: number; draw: number; away: number } | null {
  const sum = home + draw + away;
  if (!(sum > 0)) return null;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

/**
 * Each side's chance of advancing from a knockout tie. A draw after 90' goes to
 * extra time / penalties; we split that draw probability between the sides in
 * proportion to their win chances — a fair proxy that still leans to the stronger
 * side without treating a shootout as a pure coin-flip.
 */
export function advanceProb(odds: MatchOdds): { home: number; away: number } {
  const base = odds.home + odds.away;
  const share = base > 0 ? odds.home / base : 0.5;
  return { home: odds.home + odds.draw * share, away: odds.away + odds.draw * (1 - share) };
}

/**
 * Crude in-play nudge for a live match with NO market odds: shifts a pre-match
 * prior (home's advance chance, 0–1) toward whoever leads, more strongly as the
 * clock runs down. Only a fallback — when odds exist they already reflect this.
 */
export function liveNudge(prior: number, homeScore: number, awayScore: number, minute: number): number {
  const lead = homeScore - awayScore;
  if (lead === 0) return prior;
  const t = Math.max(0, Math.min(1, minute / 90));
  const shift = Math.tanh(lead * 0.8) * (0.2 + 0.5 * t);
  return Math.max(0.02, Math.min(0.98, prior + shift));
}
