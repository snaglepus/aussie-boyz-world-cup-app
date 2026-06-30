import { useQuery } from '@tanstack/react-query';
import { fetchShootouts, ShootoutIndex } from '../data/shootouts';

/**
 * Per-match penalty-shootout takers, read from the shared static snapshot.
 * Cached for 30 minutes with no focus/interval refetch — the file is refreshed
 * by the deploy.
 */
export function useShootouts() {
  return useQuery<ShootoutIndex | null>({
    queryKey: ['shootouts'],
    queryFn: () => fetchShootouts(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });
}
