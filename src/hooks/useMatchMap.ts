import { useMemo, useState } from 'react';
import { Match } from '../data/types';
import { declutterMarkers, locateMatches, PlacedMatch } from '../data/venues';
import { useWorldCup } from './useWorldCup';

export type DayGroup = { key: string; label: string; time: number; matches: Match[] };

export type MatchMapState = {
  isLoading: boolean;
  days: DayGroup[];
  index: number;
  day: DayGroup | undefined;
  markers: PlacedMatch[];
  /** Matches on this day whose venue could not be placed on the map. */
  unplaced: number;
  hasPrev: boolean;
  hasNext: boolean;
  goPrev: () => void;
  goNext: () => void;
};

/**
 * All the data + navigation logic behind the match map, shared by the web and
 * native screens. The only thing they don't share is how the markers are drawn.
 */
export function useMatchMap(): MatchMapState {
  const { data, isLoading } = useWorldCup();
  const days = useMemo(() => groupByDay(data?.matches ?? []), [data]);

  // Track the chosen day by its date key, not a positional index, so the live
  // refetch (which produces a fresh `days` array on every poll) can't reset the
  // user's selection back to today.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Resolve the active index: the user's selection if it still exists, otherwise
  // the nearest day with fixtures (today if it has matches, else the closest
  // upcoming day, else the last day).
  const index = useMemo(() => {
    if (!days.length) return 0;
    if (selectedKey) {
      const i = days.findIndex((d) => d.key === selectedKey);
      if (i !== -1) return i;
    }
    const today = startOfToday();
    const i = days.findIndex((d) => d.time >= today);
    return i === -1 ? days.length - 1 : i;
  }, [days, selectedKey]);

  const day = days[index];

  const { markers, unplaced } = useMemo(() => {
    if (!day) return { markers: [] as PlacedMatch[], unplaced: 0 };
    const located = locateMatches(day.matches);
    return { markers: declutterMarkers(located), unplaced: day.matches.length - located.length };
  }, [day]);

  return {
    isLoading,
    days,
    index,
    day,
    markers,
    unplaced,
    hasPrev: index > 0,
    hasNext: index < days.length - 1,
    goPrev: () => {
      if (index > 0) setSelectedKey(days[index - 1].key);
    },
    goNext: () => {
      if (index < days.length - 1) setSelectedKey(days[index + 1].key);
    },
  };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupByDay(matches: Match[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const m of matches) {
    const d = m.kickoff ? new Date(m.kickoff) : new Date(`${m.date}T00:00:00`);
    if (isNaN(d.getTime())) continue;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const key = day.toDateString();
    if (!map.has(key)) {
      map.set(key, {
        key,
        time: day.getTime(),
        label: day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        matches: [],
      });
    }
    map.get(key)!.matches.push(m);
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}
