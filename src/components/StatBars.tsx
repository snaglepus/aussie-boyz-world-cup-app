import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchStats } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';

/** Paired horizontal bars (home left, away right) — only shown when stats exist. */
export function StatBars({ stats }: { stats: MatchStats[] }) {
  const theme = useTheme();
  if (!stats.length) return null;

  return (
    <View style={styles.wrap}>
      {stats.map((s) => {
        const total = s.home + s.away;
        // When neither side has any (e.g. 0 red cards), draw no bar at all.
        const homePct = total ? (s.home / total) * 100 : 0;
        const awayPct = total ? 100 - homePct : 0;
        const fmt = (v: number) => (s.percent ? `${Math.round(v)}%` : `${v}`);
        return (
          <View key={s.label} style={styles.statBlock}>
            <View style={styles.labels}>
              <Text style={[styles.value, tabularNums, { color: theme.colors.accent, fontFamily: theme.fonts.monoBold }]}>{fmt(s.home)}</Text>
              <Text style={[styles.label, { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }]}>{s.label}</Text>
              <Text style={[styles.value, styles.valueRight, tabularNums, { color: theme.colors.statPurple, fontFamily: theme.fonts.monoBold }]}>{fmt(s.away)}</Text>
            </View>
            <View style={styles.barRow}>
              <View style={styles.barSideLeft}>
                <View style={[styles.fill, styles.fillLeft, { width: `${homePct}%`, backgroundColor: theme.colors.accent }]} />
              </View>
              <View style={styles.barSideRight}>
                <View style={[styles.fill, styles.fillRight, { width: `${awayPct}%`, backgroundColor: theme.colors.statPurple }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 4 },
  statBlock: { gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, letterSpacing: 0.3 },
  value: { fontSize: 14, minWidth: 44 },
  valueRight: { textAlign: 'right' },
  barRow: { flexDirection: 'row', gap: 4, height: 6 },
  barSideLeft: { flex: 1, alignItems: 'flex-end' },
  barSideRight: { flex: 1, alignItems: 'flex-start' },
  fill: { height: 6 },
  fillLeft: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  fillRight: { borderTopRightRadius: 3, borderBottomRightRadius: 3 },
});
