import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { StandingsTable } from '../../src/components/StandingsTable';
import { GroupTable } from '../../src/data/types';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TableScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const groups = data?.groups ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Groups" subtitle="Standings · World Cup 2026" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
        }
      >
        <Legend />
        {isLoading ? (
          [0, 1, 2].map((i) => <SkeletonBlock key={i} style={{ height: 220, borderRadius: 16, marginBottom: 22 }} />)
        ) : groups.length === 0 ? (
          <EmptyState icon="list-outline" title="Standings not available" message="Group tables will appear once the data loads." />
        ) : (
          groups.map((g: GroupTable) => <StandingsTable key={g.group} table={g} />)
        )}
      </ScrollView>
    </View>
  );
}

function Legend() {
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
      {item(theme.colors.gold, 'Best-third spot')}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  legend: { flexDirection: 'row', gap: 18, marginBottom: 18, marginLeft: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontWeight: '600' },
});
