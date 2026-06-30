import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Match } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { penaltyWinner } from '../utils/penalties';
import { formatKickoffTime, formatMatchDay } from '../utils/time';
import { Flag } from './Flag';

/**
 * One fixture. The right-hand slot shows kickoff time for upcoming matches and
 * the score for live/finished ones — the eye stays in a single column. Pass
 * `showDate` (e.g. on the stadium view, which has no per-day headers) to add the
 * match date above the teams.
 */
export function MatchRow({ match, showDate = false }: { match: Match; showDate?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;

  const scoreColor = live ? theme.colors.live : theme.colors.text;
  const pens = match.penalties;
  const pk = penaltyWinner(match);

  return (
    <Pressable
      onPress={() => router.push(`/match/${encodeURIComponent(match.id)}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: live ? theme.colors.live : theme.colors.hairline,
          borderWidth: live ? 1 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {showDate ? (
        <Text style={[styles.dateLine, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
          {formatMatchDay(match.kickoff ? new Date(match.kickoff) : null, match.date)}
        </Text>
      ) : null}

      <View style={styles.mainRow}>
        <View style={styles.teams}>
          <TeamLine name={match.home.name} flag={<Flag team={match.home} size={22} />} muted={match.home.isPlaceholder} />
          <TeamLine name={match.away.name} flag={<Flag team={match.away} size={22} />} muted={match.away.isPlaceholder} />
        </View>

        <View style={styles.right}>
          {showScore ? (
            <View style={styles.scoreCol}>
              <Text style={[styles.score, tabularNums, { color: scoreColor, fontFamily: theme.fonts.display }]}>
                {match.homeScore ?? 0}
                {pens ? <Text style={[styles.penSmall, { color: pk === 'home' ? theme.colors.accent : theme.colors.textMuted, fontFamily: theme.fonts.monoBold }]}> ({pens.home})</Text> : null}
              </Text>
              <Text style={[styles.score, tabularNums, { color: scoreColor, fontFamily: theme.fonts.display }]}>
                {match.awayScore ?? 0}
                {pens ? <Text style={[styles.penSmall, { color: pk === 'away' ? theme.colors.accent : theme.colors.textMuted, fontFamily: theme.fonts.monoBold }]}> ({pens.away})</Text> : null}
              </Text>
            </View>
          ) : (
            <Text style={[styles.kickoff, tabularNums, { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }]}>
              {formatKickoffTime(match.kickoff ? new Date(match.kickoff) : null) || 'TBD'}
            </Text>
          )}
          <View style={styles.statusCol}>
            {live ? (
              <Text style={[styles.liveLabel, { color: theme.colors.live, fontFamily: theme.fonts.monoBold }]}>{match.statusLabel}</Text>
            ) : finished ? (
              <Text style={[styles.ftLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>FT</Text>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function TeamLine({ name, flag, muted }: { name: string; flag: React.ReactNode; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.teamLine}>
      {flag}
      <Text
        numberOfLines={1}
        style={[styles.teamName, { color: muted ? theme.colors.textMuted : theme.colors.text, fontFamily: theme.fonts.bodyBold }]}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  dateLine: { fontSize: 11, letterSpacing: 0.3, marginBottom: 9 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teams: { flex: 1, gap: 10 },
  teamLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreCol: { alignItems: 'flex-end', gap: 10, minWidth: 18 },
  score: { fontSize: 16, fontWeight: '800' },
  penSmall: { fontSize: 12, fontWeight: '700' },
  kickoff: { fontSize: 14, fontWeight: '600', minWidth: 52, textAlign: 'right' },
  statusCol: { alignItems: 'center', width: 34 },
  liveLabel: { fontSize: 10, fontWeight: '800' },
  ftLabel: { fontSize: 10, fontWeight: '700' },
});
