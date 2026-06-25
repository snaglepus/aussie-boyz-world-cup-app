import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { PlayoffList } from '../../src/components/PlayoffList';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { StandingsTable } from '../../src/components/StandingsTable';
import { TitleFavourites } from '../../src/components/TitleFavourites';
import { GroupTable } from '../../src/data/types';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/theme';
import { buildPlayoffPicture } from '../../src/utils/playoffRanking';
import { assessThirdPlaced } from '../../src/utils/standings';

type View_ = 'groups' | 'playoffs';

export default function TableScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const groups = data?.groups ?? [];
  const [view, setView] = useState<View_>('groups');

  // Best 8 of the 12 third-placed teams take a Round-of-32 wildcard; each gets a
  // heuristic confidence, and the legend shows the mean confidence of those 8.
  const thirds = useMemo(() => assessThirdPlaced(groups), [groups]);
  // Recomputed on every data refresh (5s live poll), so it tracks each result.
  const bands = useMemo(() => buildPlayoffPicture(groups), [groups]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Groups" subtitle="Standings · World Cup 2026" />

      <View style={styles.controls}>
        <SegmentedControl<View_>
          value={view}
          onChange={setView}
          options={[
            { label: 'Groups', value: 'groups' },
            { label: 'Playoffs', value: 'playoffs' },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
        }
      >
        {isLoading ? (
          [0, 1, 2].map((i) => <SkeletonBlock key={i} style={{ height: 220, borderRadius: 16, marginBottom: 22 }} />)
        ) : groups.length === 0 ? (
          <EmptyState icon="list-outline" title="Standings not available" message="Group tables will appear once the data loads." />
        ) : view === 'groups' ? (
          <>
            <TitleFavourites />
            <Legend confidence={thirds.overall} />
            {groups.map((g: GroupTable) => (
              <StandingsTable key={g.group} table={g} bestThirds={thirds.qualifiers} confidence={thirds.confidence} />
            ))}
          </>
        ) : (
          <>
            <Text style={[styles.note, { color: theme.colors.textMuted }]}>
              Live ranking, recalculated after every result. Badges show clinched fate: 1st = group won · QUAL =
              through · OUT = eliminated.
            </Text>
            <PlayoffList bands={bands} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Legend({ confidence }: { confidence: number }) {
  const theme = useTheme();
  const item = (color: string, label: string) => (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
  return (
    <View style={styles.legend}>
      {item(theme.colors.accent, 'Advance')}
      {item(theme.colors.gold, `Best-third spot (${confidence}% confidence)`)}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
  note: { fontSize: 12, fontFamily: fonts.mono, lineHeight: 18, marginBottom: 16, marginLeft: 2 },
  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  legend: { flexDirection: 'row', gap: 18, marginBottom: 18, marginLeft: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontFamily: fonts.bodyMedium },
});
