import { useQuery } from '@tanstack/react-query';
import { liveMatches, loadWorldCup } from '../data/service';
import { WorldCupData } from '../data/types';

const LIVE_POLL_MS = 25_000; // real-time-ish while a match is on
const IDLE_POLL_MS = 5 * 60_000; // gentle background refresh otherwise

export function useWorldCup() {
  return useQuery<WorldCupData>({
    queryKey: ['worldcup'],
    queryFn: () => loadWorldCup(),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && liveMatches(data).length > 0) return LIVE_POLL_MS;
      return IDLE_POLL_MS;
    },
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
