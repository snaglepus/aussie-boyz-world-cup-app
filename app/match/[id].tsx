import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { EventsTimeline } from '../../src/components/EventsTimeline';
import { ScoreHero } from '../../src/components/ScoreHero';
import { StatBars } from '../../src/components/StatBars';
import { Match } from '../../src/data/types';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { formatMatchDay } from '../../src/utils/time';

export default function MatchDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useWorldCup();
  const match = data?.matches.find((m: Match) => m.id === decodeURIComponent(id ?? ''));

  if (!match) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <EmptyState icon="search-outline" title="Match not found" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${match.home.code} v ${match.away.code}` }} />
      <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.body}>
        <Card>
          <ScoreHero match={match} />
        </Card>

        {match.goals.length || match.cards.length ? (
          <Card title="Events">
            <EventsTimeline match={match} />
          </Card>
        ) : null}

        {match.stats.length ? (
          <Card title="Match stats">
            <StatBars stats={match.stats} />
          </Card>
        ) : null}

        <Card title="Match info">
          <InfoRow icon="trophy-outline" label={match.group ? `${match.group} · ${match.round}` : match.round} />
          <InfoRow icon="calendar-outline" label={formatMatchDay(match.kickoff ? new Date(match.kickoff) : null, match.date)} />
          {match.ground ? <InfoRow icon="location-outline" label={match.ground} /> : null}
          <InfoRow
            icon={match.source === 'live' ? 'flash-outline' : 'cloud-download-outline'}
            label={match.source === 'live' ? 'Real-time data' : 'Schedule & results feed'}
            last
          />
        </Card>
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
  infoText: { fontSize: 15, fontWeight: '600', flex: 1 },
});
