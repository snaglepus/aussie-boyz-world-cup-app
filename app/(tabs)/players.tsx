import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { Flag } from '../../src/components/Flag';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { Match } from '../../src/data/types';
import { usePlayerStats } from '../../src/hooks/usePlayerStats';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts, tabularNums } from '../../src/theme/theme';
import { teamHref } from '../../src/utils/nav';
import { buildGoldenBoot, ScorerRow } from '../../src/utils/scorers';

export default function PlayersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const { data: stats } = usePlayerStats();

  const rows = useMemo(() => buildGoldenBoot(data?.matches ?? [], stats), [data, stats]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Golden Boot" subtitle="Top scorers · World Cup 2026" />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />}
      >
        <Text style={[styles.note, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>
          The tournament&apos;s top scorer. Own goals don&apos;t count; penalties do. Ranked by goals, then assists, then
          fewest minutes played — the official tie-breakers (G = goals, A = assists).
        </Text>

        {isLoading && !data ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} style={{ height: 56, borderRadius: 14, marginBottom: 8 }} />
          ))
        ) : rows.length === 0 ? (
          <EmptyState icon="football-outline" title="No goals yet" message="The scorers table fills in as goals go in." />
        ) : (
          rows.map((r, i) => <ScorerCard key={`${r.player}-${r.team.code}`} row={r} prev={rows[i - 1]} />)
        )}
      </ScrollView>
    </View>
  );
}

function ScorerCard({ row, prev }: { row: ScorerRow; prev?: ScorerRow }) {
  const theme = useTheme();
  const router = useRouter();
  const leader = row.rank === 1;
  // Only print the rank on the first row of a joint group (cleaner shared ranks).
  const showRank = !prev || prev.rank !== row.rank;
  const rankColor = leader ? theme.colors.gold : row.rank <= 3 ? theme.colors.accent : theme.colors.textMuted;

  return (
    <Pressable
      onPress={() => router.navigate(teamHref(row.team))}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: leader ? theme.colors.gold : theme.colors.hairline,
          borderWidth: leader ? 1 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.rank, tabularNums, { color: rankColor, fontFamily: fonts.monoBold }]}>
        {showRank ? row.rank : ''}
      </Text>
      <Flag team={row.team} size={30} />
      <View style={styles.who}>
        <Text numberOfLines={1} style={[styles.player, { color: theme.colors.text, fontFamily: fonts.bodyBold }]}>
          {row.player}
        </Text>
        <Text numberOfLines={1} style={[styles.team, { color: theme.colors.textSecondary, fontFamily: fonts.mono }]}>
          {row.team.name}
          {row.penalties > 0 ? ` · ${row.penalties} pen` : ''}
        </Text>
      </View>
      {leader ? <MaterialCommunityIcons name="shoe-cleat" size={18} color={theme.colors.gold} style={styles.boot} /> : null}
      <View style={styles.statCol}>
        <Text style={[styles.goals, tabularNums, { color: leader ? theme.colors.gold : theme.colors.text, fontFamily: fonts.display }]}>
          {row.goals}
        </Text>
        <Text style={[styles.statLabel, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>
          {row.assists > 0 ? `${row.goals}G ${row.assists}A` : 'GOALS'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 2 },
  note: { fontSize: 11, lineHeight: 16, marginBottom: 14, marginHorizontal: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  rank: { width: 24, fontSize: 15, textAlign: 'center' },
  who: { flex: 1 },
  player: { fontSize: 15 },
  team: { fontSize: 11, marginTop: 2 },
  boot: { marginRight: -2 },
  statCol: { alignItems: 'flex-end', minWidth: 40 },
  goals: { fontSize: 22, textAlign: 'right' },
  statLabel: { fontSize: 9, letterSpacing: 0.4, marginTop: 1 },
});
