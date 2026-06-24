import type { TeamRef } from '../data/types';

/**
 * Deep-link target for a team's profile on the Teams tab. Passes the team name
 * (the Teams screen resolves it to the canonical squad name by code).
 */
export function teamHref(team: TeamRef) {
  return { pathname: '/teams', params: { team: team.name } } as const;
}

/** Placeholder slots ("Winner of match 73", "1A") have no profile to open. */
export function canOpenTeam(team: TeamRef): boolean {
  return !team.isPlaceholder;
}
