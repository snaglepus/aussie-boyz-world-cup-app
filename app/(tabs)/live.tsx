import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { data, isFetching, refetch } = useWorldCup();
  const live = data ? liveMatches(data) : [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />
      }
    >
      <ScreenHeader title="Live" subtitle={live.length ? `${live.length} match${live.length > 1 ? 'es' : ''} in progress` : 'Match centre'} />

      <View style={styles.body}>
        {live.length === 0 ? (
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
  tapHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 14 },
});
