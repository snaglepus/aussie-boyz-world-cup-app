import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Match, TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { canOpenTeam, teamHref } from '../utils/nav';
import { formatKickoffTime } from '../utils/time';
import { Flag } from './Flag';
import { LiveBadge } from './LiveBadge';

/** Big, glanceable score block: flag + name each side, score is the largest type. */
export function ScoreHero({ match }: { match: Match }) {
  const theme = useTheme();
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;
  const scoreColor = live ? theme.colors.live : theme.colors.text;

  // Each side links to that team's profile on the Teams tab (skip placeholders).
  const renderSide = (team: TeamRef) => {
    const body = (
      <>
        <Flag team={team} size={56} />
        <Text numberOfLines={2} style={[styles.team, { color: theme.colors.text }]}>
          {team.name}
        </Text>
      </>
    );
    if (!canOpenTeam(team)) return <View style={styles.side}>{body}</View>;
    return (
      <Pressable style={styles.side} onPress={() => router.navigate(teamHref(team))} hitSlop={6}>
        {body}
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.statusRow}>
        {live ? (
          <LiveBadge label={match.statusLabel} />
        ) : (
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            {finished ? 'Full time' : formatKickoffTime(match.kickoff ? new Date(match.kickoff) : null)}
          </Text>
        )}
      </View>

      <View style={styles.row}>
        {renderSide(match.home)}

        <View style={styles.center}>
          {showScore ? (
            <Text style={[styles.score, tabularNums, { color: scoreColor }]}>
              {match.homeScore ?? 0}
              <Text style={{ color: theme.colors.textMuted }}> – </Text>
              {match.awayScore ?? 0}
            </Text>
          ) : (
            <Text style={[styles.vs, { color: theme.colors.textMuted }]}>vs</Text>
          )}
          {match.penalties ? (
            <Text style={[styles.pens, { color: theme.colors.textSecondary }]}>
              ({match.penalties.home}–{match.penalties.away} pens)
            </Text>
          ) : match.htScore ? (
            <Text style={[styles.ht, { color: theme.colors.textMuted }]}>
              HT {match.htScore[0]}–{match.htScore[1]}
            </Text>
          ) : null}
        </View>

        {renderSide(match.away)}
      </View>

      {match.ground ? (
        <Text style={[styles.venue, { color: theme.colors.textMuted }]}>
          {match.round}{match.ground ? ` · ${match.ground}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 18, gap: 14 },
  statusRow: { minHeight: 24, justifyContent: 'center' },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch' },
  side: { flex: 1, alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  team: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', minWidth: 120, gap: 4, paddingTop: 14 },
  score: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  vs: { fontSize: 22, fontWeight: '700' },
  ht: { fontSize: 12, fontWeight: '600' },
  pens: { fontSize: 13, fontWeight: '700' },
  venue: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
