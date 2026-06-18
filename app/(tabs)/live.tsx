import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { EventsTimeline } from '../../src/components/EventsTimeline';
import { GoalScorers } from '../../src/components/GoalScorers';
import { ScoreHero } from '../../src/components/ScoreHero';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatBars } from '../../src/components/StatBars';
import { liveMatches } from '../../src/data/service';
import { Match } from '../../src/data/types';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function LiveScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const live = data ? liveMatches(data) : [];
  // Until the first load resolves we don't yet know if anything is live, so show
  // a "checking" state rather than prematurely claiming there's no match.
  const loading = isLoading || !data;

  // Pull fresh data every time the screen regains focus (tab switch, returning
  // to the app), surfacing the same "refreshing" indicator as the poll.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const subtitle = loading
    ? 'Checking for live matches…'
    : live.length
      ? `${live.length} match${live.length > 1 ? 'es' : ''} in progress`
      : 'Match centre';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
      }
    >
      <ScreenHeader title="Live" subtitle={subtitle} />

      {isFetching && !loading ? (
        <View style={styles.refreshRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.refreshText, { color: theme.colors.textSecondary }]}>
            Refreshing data now…
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <Card>
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Fetching the latest scores…
              </Text>
            </View>
          </Card>
        ) : live.length === 0 ? (
          <Card>
            <EmptyState
              icon="radio-outline"
              title="No match is live right now"
              message="When a game kicks off it'll appear here automatically. Until then, check the schedule."
            />
            <Pressable
              onPress={() => router.push('/matches')}
              style={[styles.cta, { backgroundColor: theme.colors.accent }]}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.colors.onAccent} />
              <Text style={[styles.ctaText, { color: theme.colors.onAccent }]}>View matches</Text>
            </Pressable>
          </Card>
        ) : (
          live.map((m) => <LiveCard key={m.id} match={m} />)
        )}
      </View>
    </ScrollView>
  );
}

function LiveCard({ match }: { match: Match }) {
  const router = useRouter();
  const theme = useTheme();
  const hasStats = match.stats.length > 0;
  const hasEvents = match.cards.length > 0;

  return (
    <Pressable onPress={() => router.push(`/match/${encodeURIComponent(match.id)}`)}>
      <Card style={{ paddingBottom: hasStats || hasEvents ? 16 : 4 }}>
        <ScoreHero match={match} />
        <GoalScorers goals={match.goals} />
        {hasEvents ? (
          <View style={[styles.section, { borderTopColor: theme.colors.hairline }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>EVENTS</Text>
            <EventsTimeline match={match} />
          </View>
        ) : null}
        {hasStats ? (
          <View style={[styles.section, { borderTopColor: theme.colors.hairline }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>STATS</Text>
            <StatBars stats={match.stats} />
          </View>
        ) : null}
        <Text style={[styles.tapHint, { color: theme.colors.textMuted }]}>Tap for full match detail</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  ctaText: { fontSize: 15, fontWeight: '700' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 28 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 10 },
  refreshText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  tapHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 14 },
});
