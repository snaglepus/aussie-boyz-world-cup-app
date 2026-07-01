import { useQuery } from '@tanstack/react-query';
import { EspnMatchDetail, fetchEspnMatchStats } from '../data/espnStats';
import { Match } from '../data/types';

/**
 * Full match detail from ESPN's summary — team stats, booking events, subs,
 * lineups and commentary. Enabled for finished games (cached for an hour) and for
 * live games (polled every 30s so the in-play data stays fresh).
 */
export function useMatchStats(match?: Match) {
  const live = match?.status === 'live';
  const enabled =
    !!match && (match.status === 'finished' || live) && !match.home.isPlaceholder && !match.away.isPlaceholder;
  const ymd = (match?.date ?? '').replace(/-/g, '');

  return useQuery<EspnMatchDetail | null>({
    queryKey: ['match-stats', match?.id],
    queryFn: () => fetchEspnMatchStats(ymd, match!.home.code, match!.away.code),
    enabled,
    staleTime: live ? 20_000 : 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchInterval: live ? 30_000 : false,
    refetchOnWindowFocus: live,
    retry: 1,
  });
}
