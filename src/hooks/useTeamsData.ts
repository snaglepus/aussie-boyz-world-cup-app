import { useQuery } from '@tanstack/react-query';
import { fetchTeamInfo, TeamInfoIndex } from '../data/teamInfo';

/**
 * Squad + team metadata. Static for the tournament, so fetched once and cached
 * indefinitely; only loaded when the Teams screen mounts.
 */
export function useTeamsData() {
  return useQuery<TeamInfoIndex | null>({
    queryKey: ['team-info'],
    queryFn: () => fetchTeamInfo(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}
