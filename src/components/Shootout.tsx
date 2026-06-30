import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Shootout as ShootoutData } from '../data/shootouts';
import { TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/theme';
import { Flag } from './Flag';

/**
 * Penalty shootout, taker by taker — mirrors the familiar two-column layout:
 * the home side's kicks down the left with a scored/missed tick, the away side's
 * down the right. Kicks are paired by round; sudden-death rounds just add a row.
 */
export function Shootout({ shootout, home, away }: { shootout: ShootoutData; home: TeamRef; away: TeamRef }) {
  const theme = useTheme();
  const rounds = Math.max(shootout.home.length, shootout.away.length);
  if (rounds === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={[styles.headSide, styles.headHome]}>
          <Flag team={home} size={18} />
          <Text numberOfLines={1} style={[styles.headName, { color: theme.colors.text, fontFamily: fonts.bodyBold }]}>{home.name}</Text>
        </View>
        <View style={[styles.headSide, styles.headAway]}>
          <Text numberOfLines={1} style={[styles.headName, styles.headNameAway, { color: theme.colors.text, fontFamily: fonts.bodyBold }]}>{away.name}</Text>
          <Flag team={away} size={18} />
        </View>
      </View>

      {Array.from({ length: rounds }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Kick kick={shootout.home[i]} side="home" />
          <Text style={[styles.idx, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{i + 1}</Text>
          <Kick kick={shootout.away[i]} side="away" />
        </View>
      ))}
    </View>
  );
}

function Kick({ kick, side }: { kick: { player: string; scored: boolean } | undefined; side: 'home' | 'away' }) {
  const theme = useTheme();
  const home = side === 'home';
  if (!kick) return <View style={styles.cell} />;
  const color = kick.scored ? theme.colors.win : theme.colors.loss;
  const icon = (
    <Ionicons name={kick.scored ? 'checkmark-circle' : 'close-circle'} size={16} color={color} />
  );
  const name = (
    <Text numberOfLines={1} style={[styles.player, { color: theme.colors.text, fontFamily: fonts.bodyMedium }, home ? styles.playerHome : styles.playerAway]}>
      {kick.player}
    </Text>
  );
  return <View style={[styles.cell, home ? styles.cellHome : styles.cellAway]}>{home ? <>{name}{icon}</> : <>{icon}{name}</>}</View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  headHome: { justifyContent: 'flex-start' },
  headAway: { justifyContent: 'flex-end' },
  headName: { fontSize: 13, flexShrink: 1 },
  headNameAway: { textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  idx: { width: 22, textAlign: 'center', fontSize: 11 },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cellHome: { justifyContent: 'flex-end' },
  cellAway: { justifyContent: 'flex-start' },
  player: { fontSize: 14, flexShrink: 1 },
  playerHome: { textAlign: 'right' },
  playerAway: { textAlign: 'left' },
});
