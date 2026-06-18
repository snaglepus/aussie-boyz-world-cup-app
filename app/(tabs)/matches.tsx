import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { LiveBadge } from '../../src/components/LiveBadge';
import { MatchRow } from '../../src/components/MatchRow';
import { MatchRowSkeleton } from '../../src/components/Skeleton';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { liveMatches, playedMatches, upcomingMatches } from '../../src/data/service';
import { Match } from '../../src/data/types';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { formatMatchDay } from '../../src/utils/time';

type Filter = 'upcoming' | 'played';

export default function MatchesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const live = data ? liveMatches(data) : [];

  const sections = useMemo(() => {
    if (!data) return [];
    const list = filter === 'upcoming' ? upcomingMatches(data) : playedMatches(data);
    return groupByDay(list, filter === 'played');
  }, [data, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader
        title="Matches"
        subtitle="World Cup 2026"
        right={
          <View style={styles.headerRight}>
            {data?.source === 'bundled' ? <OfflineChip /> : null}
            <GlobeButton onPress={() => router.push('/map')} />
          </View>
        }
      />

      <View style={styles.controls}>
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Played', value: 'played' },
          ]}
        />
      </View>

      {live.length > 0 ? (
        <LiveBanner count={live.length} onPress={() => router.push('/live')} />
      ) : null}

      {isLoading ? (
        <View style={styles.body}>
          {[0, 1, 2, 3, 4].map((i) => (
            <MatchRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.body}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.dayHeader, { color: theme.colors.textSecondary, backgroundColor: theme.colors.bg }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => <MatchRow match={item} />}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={filter === 'upcoming' ? 'time-outline' : 'checkmark-done-outline'}
              title={filter === 'upcoming' ? 'No upcoming matches' : 'No played matches yet'}
              message={filter === 'upcoming' ? 'The schedule is all done — check the results.' : 'Results will show here once games are completed.'}
            />
          }
        />
      )}
    </View>
  );
}

function LiveBanner({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.bannerWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.bannerRow, { backgroundColor: theme.colors.accentSoft, opacity: pressed ? 0.7 : 1 }]}
      >
        <LiveBadge label="LIVE" />
        <Text style={[styles.bannerText, { color: theme.colors.text }]}>
          {count} match{count > 1 ? 'es' : ''} in progress — tap to watch
        </Text>
      </Pressable>
    </View>
  );
}

function GlobeButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open match map"
      hitSlop={8}
      style={({ pressed }) => [
        styles.globeBtn,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name="globe-outline" size={20} color={theme.colors.text} />
    </Pressable>
  );
}

function OfflineChip() {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>Offline data</Text>
    </View>
  );
}

function groupByDay(matches: Match[], _played: boolean): { title: string; data: Match[] }[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = formatMatchDay(m.kickoff ? new Date(m.kickoff) : null, m.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()].map(([title, data]) => ({ title, data }));
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 32 },
  dayHeader: { fontSize: 13, fontWeight: '800', paddingVertical: 8, letterSpacing: 0.2 },
  bannerWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  bannerText: { fontSize: 13, fontWeight: '700', flex: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: 11, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  globeBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
