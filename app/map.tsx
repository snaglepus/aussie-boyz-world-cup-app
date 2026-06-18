import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EmptyState } from '../src/components/EmptyState';
import { MatchMapChrome } from '../src/components/MatchMapChrome';
import { NativeMatchMap } from '../src/components/NativeMatchMap';
import { useMatchMap } from '../src/hooks/useMatchMap';
import { useTheme } from '../src/theme/ThemeProvider';

export default function MapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoading, day, markers, unplaced, hasPrev, hasNext, goPrev, goNext } = useMatchMap();

  return (
    <MatchMapChrome
      dayLabel={day ? day.label : '—'}
      daySub={daySubtitle(day?.matches.length ?? 0, unplaced)}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={goPrev}
      onNext={goNext}
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : !day ? (
        <EmptyState icon="map-outline" title="No fixtures to map" message="There are no matches in the schedule yet." />
      ) : markers.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Nothing to show here"
          message="None of this day's venues could be placed on the map. Try another date."
        />
      ) : (
        <NativeMatchMap markers={markers} onSelect={(id) => router.push(`/match/${encodeURIComponent(id)}`)} />
      )}
    </MatchMapChrome>
  );
}

function daySubtitle(count: number, unplaced: number): string {
  if (count === 0) return 'No fixtures';
  return `${count} match${count === 1 ? '' : 'es'}${unplaced > 0 ? ` · ${unplaced} not mapped` : ''}`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
