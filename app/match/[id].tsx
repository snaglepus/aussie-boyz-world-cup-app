import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { Collapsible } from '../../src/components/Collapsible';
import { CommentaryFeed } from '../../src/components/CommentaryFeed';
import { EmptyState } from '../../src/components/EmptyState';
import { EventsTimeline } from '../../src/components/EventsTimeline';
import { Lineups } from '../../src/components/Lineups';
import { OddsBar } from '../../src/components/OddsBar';
import { ScoreHero } from '../../src/components/ScoreHero';
import { Shootout } from '../../src/components/Shootout';
import { StatBars } from '../../src/components/StatBars';
import { VenueMiniMap } from '../../src/components/VenueMiniMap';
import { Match } from '../../src/data/types';
import { resolveVenue } from '../../src/data/venues';
import { useMatchStats } from '../../src/hooks/useMatchStats';
import { useShootouts } from '../../src/hooks/useShootouts';
import { useTitleOdds } from '../../src/hooks/useTitleOdds';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/theme';
import { buildBracket } from '../../src/utils/bracket';
import { formatMatchDay } from '../../src/utils/time';

export default function MatchDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useWorldCup();
  const { data: odds } = useTitleOdds();
  const matchId = decodeURIComponent(id ?? '');
  const match = data?.matches.find((m: Match) => m.id === matchId);

  // Resolve knockout slot placeholders ("1A", "3A/B/…", "W73") to projected
  // teams so the summary shows the same line-up as the bracket, not raw codes.
  const bracket = useMemo(() => (data ? buildBracket(data, odds) : null), [data, odds]);
  const bnode = useMemo(
    () => bracket?.columns.flatMap((c) => c.matches).find((m) => m.id === matchId) ?? null,
    [bracket, matchId]
  );
  // Pull full team stats + booking events from ESPN for finished games that lack them.
  const { data: fetchedDetail } = useMatchStats(match);
  // Per-taker shootout breakdown (build-time ESPN snapshot), only for pens games.
  const { data: shootouts } = useShootouts();

  if (!match) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <EmptyState icon="search-outline" title="Match not found" />
      </View>
    );
  }

  // For knockout fixtures, swap in the projected teams where we have them.
  const base: Match = bnode
    ? { ...match, home: bnode.home.team ?? match.home, away: bnode.away.team ?? match.away }
    : match;
  // Overlay ESPN stats/cards only where the base feed is missing them.
  const display: Match = fetchedDetail
    ? {
        ...base,
        stats: base.stats.length === 0 && fetchedDetail.stats.length ? fetchedDetail.stats : base.stats,
        cards: base.cards.length === 0 && fetchedDetail.cards.length ? fetchedDetail.cards : base.cards,
      }
    : base;
  // Projected while either side is still a guess (not yet confirmed).
  const projected = !!bnode && (!bnode.home.confirmed || !bnode.away.confirmed);

  const venue = resolveVenue(match.ground);

  return (
    <>
      <Stack.Screen options={{ title: `${display.home.code} v ${display.away.code}` }} />
      <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.body}>
        <Card>
          <ScoreHero match={display} />
          {projected ? (
            <View style={[styles.estChip, { backgroundColor: theme.colors.playoff }]}>
              <Ionicons name="information-circle-outline" size={13} color={theme.colors.text} />
              <Text style={[styles.estText, { color: theme.colors.text }]}>
                Projected match-up · a guess from form, odds &amp; FIFA ranking
              </Text>
            </View>
          ) : null}
        </Card>

        {display.odds && display.status !== 'finished' ? (
          <Card title={display.status === 'live' ? 'Live win probability' : 'Win probability'}>
            <OddsBar odds={display.odds} home={display.home} away={display.away} />
          </Card>
        ) : null}

        {display.goals.length || display.cards.length || fetchedDetail?.subs.length ? (
          <Card title="Events">
            <EventsTimeline match={display} subs={fetchedDetail?.subs} />
          </Card>
        ) : null}

        {display.penalties && shootouts?.get(matchId) ? (
          <Card title="Penalty shootout">
            <Shootout shootout={shootouts.get(matchId)!} home={display.home} away={display.away} />
          </Card>
        ) : null}

        {display.stats.length ? (
          <Card title="Match stats">
            <StatBars stats={display.stats} />
          </Card>
        ) : null}

        {fetchedDetail?.lineups ? (
          <Card>
            <Collapsible title="Lineups">
              <Lineups
                home={fetchedDetail.lineups.home}
                away={fetchedDetail.lineups.away}
                homeTeam={display.home}
                awayTeam={display.away}
              />
            </Collapsible>
          </Card>
        ) : null}

        {fetchedDetail?.commentary.length ? (
          <Card>
            <Collapsible title="Commentary">
              <CommentaryFeed items={fetchedDetail.commentary} limit={40} />
            </Collapsible>
          </Card>
        ) : null}

        <Card title="Match info">
          <InfoRow icon="trophy-outline" label={match.group ? `${match.group} · ${match.round}` : match.round} />
          <InfoRow icon="calendar-outline" label={formatMatchDay(match.kickoff ? new Date(match.kickoff) : null, match.date)} />
          <InfoRow
            icon="location-outline"
            label={venue ? `${venue.stadium} · ${venue.city}` : match.ground ?? 'Venue TBC'}
            last={!venue}
          />
          {venue ? (
            <InfoRow
              icon={match.source === 'live' ? 'flash-outline' : 'cloud-download-outline'}
              label={match.source === 'live' ? 'Real-time data' : 'Schedule & results feed'}
              last
            />
          ) : null}
        </Card>

        {venue ? (
          <Card title="Location">
            <VenueMiniMap match={display} venue={venue} />
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

function InfoRow({
  icon,
  label,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: theme.colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <Text style={[styles.infoText, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  infoText: { fontSize: 15, fontFamily: fonts.bodyMedium, flex: 1 },
  estChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, marginTop: 4 },
  estText: { fontSize: 12, fontFamily: fonts.mono },
});
