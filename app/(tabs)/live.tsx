import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { EventsTimeline } from '../../src/components/EventsTimeline';
import { GoalScorers } from '../../src/components/GoalScorers';
import { Lineups } from '../../src/components/Lineups';
import { OddsBar } from '../../src/components/OddsBar';
import { ScoreHero } from '../../src/components/ScoreHero';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatBars } from '../../src/components/StatBars';
import { CommentaryItem } from '../../src/data/espnStats';
import { liveMatches } from '../../src/data/service';
import { Match } from '../../src/data/types';
import { useLiveDetail } from '../../src/hooks/useMatchStats';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/theme';

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

        {isFetching && !loading ? (
          <View style={styles.refreshRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={[styles.refreshText, { color: theme.colors.textSecondary }]}>
              Refreshing data now…
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function LiveCard({ match }: { match: Match }) {
  const router = useRouter();
  const theme = useTheme();
  const { data: detail } = useLiveDetail(match);

  const hasOdds = !!match.odds;
  const subs = detail?.subs ?? [];
  const stats = detail?.stats ?? match.stats;
  const lineups = detail?.lineups;
  const hasEvents = match.goals.length > 0 || match.cards.length > 0 || subs.length > 0;
  // Latest commentary first — the last few lines are what matters mid-match.
  const commentary: CommentaryItem[] = (detail?.commentary ?? []).slice(-8).reverse();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[styles.section, { borderTopColor: theme.colors.hairline }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Pressable onPress={() => router.push(`/match/${encodeURIComponent(match.id)}`)}>
      <Card style={{ paddingBottom: 16 }}>
        <ScoreHero match={match} />
        <GoalScorers goals={match.goals} />
        {hasOdds ? (
          <Section title={match.odds!.live ? 'LIVE WIN PROBABILITY' : 'WIN PROBABILITY'}>
            <OddsBar odds={match.odds!} home={match.home} away={match.away} />
          </Section>
        ) : null}
        {hasEvents ? (
          <Section title="EVENTS">
            <EventsTimeline match={match} subs={subs} />
          </Section>
        ) : null}
        {stats.length ? (
          <Section title="STATS">
            <StatBars stats={stats} />
          </Section>
        ) : null}
        {lineups ? (
          <Section title="LINEUPS">
            <Lineups home={lineups.home} away={lineups.away} homeTeam={match.home} awayTeam={match.away} />
          </Section>
        ) : null}
        {commentary.length ? (
          <Section title="COMMENTARY">
            {commentary.map((c, i) => (
              <View key={i} style={styles.commentRow}>
                <Text style={[styles.commentMin, { color: theme.colors.accent }]}>{c.minute ? `${c.minute}'` : '·'}</Text>
                <Text style={[styles.commentText, { color: theme.colors.textSecondary }]}>{c.text}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        <Text style={[styles.tapHint, { color: theme.colors.textMuted }]}>Tap for full match detail</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 14 },
  sectionTitle: { fontSize: 10, fontFamily: fonts.mono, letterSpacing: 0.8, marginBottom: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  ctaText: { fontSize: 15, fontFamily: fonts.bodyBold },
  loadingBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 28 },
  loadingText: { fontSize: 14, fontFamily: fonts.body },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16 },
  refreshText: { fontSize: 12, fontFamily: fonts.mono, letterSpacing: 0.3 },
  tapHint: { fontSize: 12, fontFamily: fonts.mono, textAlign: 'center', marginTop: 14 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  commentMin: { fontSize: 11, fontFamily: fonts.monoBold, minWidth: 30, textAlign: 'right' },
  commentText: { fontSize: 12, fontFamily: fonts.body, flex: 1, lineHeight: 17 },
});
