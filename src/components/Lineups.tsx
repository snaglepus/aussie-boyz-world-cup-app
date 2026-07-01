import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamLineup } from '../data/espnStats';
import { TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, tabularNums } from '../theme/theme';
import { Flag } from './Flag';

/** Two starting XIs side by side, each headed by the team flag + formation. */
export function Lineups({
  home,
  away,
  homeTeam,
  awayTeam,
}: {
  home: TeamLineup;
  away: TeamLineup;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
}) {
  const theme = useTheme();

  const column = (lineup: TeamLineup, team: TeamRef) => {
    const xi = lineup.players.filter((p) => p.starter);
    return (
      <View style={styles.col}>
        <View style={styles.head}>
          <Flag team={team} size={16} />
          <Text style={[styles.formation, { color: theme.colors.textSecondary, fontFamily: fonts.monoBold }]}>
            {lineup.formation || '—'}
          </Text>
        </View>
        {xi.map((p, i) => (
          <View key={`${p.name}-${i}`} style={styles.prow}>
            <Text style={[styles.num, tabularNums, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{p.jersey || '·'}</Text>
            <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text, fontFamily: fonts.bodyMedium }]}>
              {p.name}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      {column(home, homeTeam)}
      <View style={[styles.divider, { backgroundColor: theme.colors.hairline }]} />
      {column(away, awayTeam)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1, gap: 7 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  formation: { fontSize: 12, letterSpacing: 0.5 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 10 },
  prow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: { width: 18, fontSize: 12, textAlign: 'right' },
  name: { fontSize: 13, flexShrink: 1 },
});
