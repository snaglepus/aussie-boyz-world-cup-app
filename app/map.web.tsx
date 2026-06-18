import { useRouter } from 'expo-router';
import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EmptyState } from '../src/components/EmptyState';
import { MatchMapChrome } from '../src/components/MatchMapChrome';
import { useMatchMap } from '../src/hooks/useMatchMap';
import { useTheme } from '../src/theme/ThemeProvider';

// Leaflet touches the DOM at import time, so the map is loaded lazily on the
// client only — never during static (server) rendering of this route.
const MatchMapLazy = React.lazy(() =>
  import('../src/components/MatchMap').then((m) => ({ default: m.MatchMap }))
);

export default function MapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoading, day, markers, unplaced, hasPrev, hasNext, goPrev, goNext } = useMatchMap();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <MatchMapChrome
      dayLabel={day ? day.label : '—'}
      daySub={daySubtitle(day?.matches.length ?? 0, unplaced)}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={goPrev}
      onNext={goNext}
    >
      {isLoading || !mounted ? (
        <Centered>
          <ActivityIndicator color={theme.colors.accent} />
        </Centered>
      ) : !day ? (
        <EmptyState icon="map-outline" title="No fixtures to map" message="There are no matches in the schedule yet." />
      ) : markers.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Nothing to show here"
          message="None of this day's venues could be placed on the map. Try another date."
        />
      ) : (
        <Suspense
          fallback={
            <Centered>
              <ActivityIndicator color={theme.colors.accent} />
            </Centered>
          }
        >
          <MatchMapLazy
            markers={markers}
            theme={theme}
            onSelect={(id) => router.push(`/match/${encodeURIComponent(id)}`)}
          />
        </Suspense>
      )}
    </MatchMapChrome>
  );
}

function daySubtitle(count: number, unplaced: number): string {
  if (count === 0) return 'No fixtures';
  return `${count} match${count === 1 ? '' : 'es'}${unplaced > 0 ? ` · ${unplaced} not mapped` : ''}`;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
