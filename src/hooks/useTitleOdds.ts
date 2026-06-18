import { useQuery } from '@tanstack/react-query';
import { fetchTitleOdds, TitleOdd } from '../data/odds';

/**
 * Title-winner odds, read from the shared static snapshot. Cached for 30 minutes
 * with no focus/interval refetch — the file itself is refreshed by the deploy.
 */
export function useTitleOdds() {
  return useQuery<TitleOdd[] | null>({
    queryKey: ['title-odds'],
    queryFn: () => fetchTitleOdds(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });
}
