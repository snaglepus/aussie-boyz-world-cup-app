import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Match } from '../data/types';
import { VenueLocation } from '../data/venues';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/theme';
import { formatMatchDay } from '../utils/time';

/** Competition round, kickoff day, venue and data source — shared by the match
 * detail screen and the Live card. */
export function MatchInfo({ match, venue }: { match: Match; venue: VenueLocation | null }) {
  return (
    <View>
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
    </View>
  );
}

function InfoRow({ icon, label, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <Text style={[styles.text, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  text: { fontSize: 15, fontFamily: fonts.bodyMedium, flex: 1 },
});
