import { useQuery } from '@tanstack/react-query';
import { EspnMatchDetail, fetchEspnMatchStats } from '../data/espnStats';
import { Match } from '../data/types';

/**
 * On-demand full match detail (stats + booking events) from ESPN for a finished
 * fixture that doesn't already carry stats. Cached for an hour; no focus refetch.
 */
export function useMatchStats(match?: Match) {
  const enabled =
    !!match &&
    match.status === 'finished' &&
    match.stats.length === 0 &&
    !match.home.isPlaceholder &&
    !match.away.isPlaceholder;
  const ymd = (match?.date ?? '').replace(/-/g, '');

  return useQuery<EspnMatchDetail | null>({
    queryKey: ['match-stats', match?.id],
    queryFn: () => fetchEspnMatchStats(ymd, match!.home.code, match!.away.code),
    enabled,
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Full in-play detail (team stats, subs, lineups, commentary) from ESPN for a LIVE
 * match — powers the richer Live-tab card. Polls every 30s while the game is on.
 */
export function useLiveDetail(match?: Match) {
  const enabled = !!match && match.status === 'live' && !match.home.isPlaceholder && !match.away.isPlaceholder;
  const ymd = (match?.date ?? '').replace(/-/g, '');

  return useQuery<EspnMatchDetail | null>({
    queryKey: ['live-detail', match?.id],
    queryFn: () => fetchEspnMatchStats(ymd, match!.home.code, match!.away.code),
    enabled,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
