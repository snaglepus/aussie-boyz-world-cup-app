import { useQuery } from '@tanstack/react-query';
import { fetchTitleOdds, hasOddsSource, TitleOdd } from '../data/odds';

/**
 * Title-winner odds. Deliberately decoupled from the live match polling: odds
 * move slowly and the free API tier is ~500 req/month, so we cache for 30
 * minutes and never auto-refetch on focus or interval.
 */
export function useTitleOdds() {
  return useQuery<TitleOdd[] | null>({
    queryKey: ['title-odds'],
    queryFn: () => fetchTitleOdds(),
    enabled: hasOddsSource(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });
}
