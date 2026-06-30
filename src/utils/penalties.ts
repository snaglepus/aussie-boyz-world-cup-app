import { Match } from '../data/types';

/**
 * A match is only "decided on penalties" when the regulation/extra-time score is
 * level and a shootout total exists. Returns which side won the shootout, or null
 * when the game wasn't settled that way.
 */
export function penaltyWinner(match: Match): 'home' | 'away' | null {
  const p = match.penalties;
  if (!p) return null;
  if (p.home > p.away) return 'home';
  if (p.away > p.home) return 'away';
  return null;
}
