import { useQuery } from '@tanstack/react-query';
import { fetchEspnMatchStats } from '../data/espnStats';
import { Match, MatchStats } from '../data/types';

/**
 * On-demand full match stats from ESPN for a finished fixture that doesn't
 * already carry them. Cached for an hour; never refetched on focus.
 */
export function useMatchStats(match?: Match) {
  const enabled =
    !!match &&
    match.status === 'finished' &&
    match.stats.length === 0 &&
    !match.home.isPlaceholder &&
    !match.away.isPlaceholder;
  const ymd = (match?.date ?? '').replace(/-/g, '');

  return useQuery<MatchStats[] | null>({
    queryKey: ['match-stats', match?.id],
    queryFn: () => fetchEspnMatchStats(ymd, match!.home.code, match!.away.code),
    enabled,
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
