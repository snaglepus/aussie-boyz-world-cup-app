import { useQuery } from '@tanstack/react-query';
import { fetchPlayerStats, PlayerStatIndex } from '../data/playerStats';

/**
 * Golden Boot tie-breaker stats (assists + minutes), read from the shared static
 * snapshot. Cached for 30 minutes with no focus/interval refetch — the file is
 * refreshed by the deploy.
 */
export function usePlayerStats() {
  return useQuery<PlayerStatIndex | null>({
    queryKey: ['player-stats'],
    queryFn: () => fetchPlayerStats(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });
}
