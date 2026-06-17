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
        const total = s.home + s.away || 1;
        const homePct = (s.home / total) * 100;
        const awayPct = 100 - homePct;
        const fmt = (v: number) => (s.percent ? `${Math.round(v)}%` : `${v}`);
        return (
          <View key={s.label} style={styles.statBlock}>
            <View style={styles.labels}>
              <Text style={[styles.value, tabularNums, { color: theme.colors.text }]}>{fmt(s.home)}</Text>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{s.label}</Text>
              <Text style={[styles.value, tabularNums, { color: theme.colors.text }]}>{fmt(s.away)}</Text>
            </View>
            <View style={styles.barRow}>
              <View style={styles.barSideLeft}>
                <View style={[styles.fill, styles.fillLeft, { width: `${homePct}%`, backgroundColor: theme.colors.accent }]} />
              </View>
              <View style={styles.barSideRight}>
                <View style={[styles.fill, styles.fillRight, { width: `${awayPct}%`, backgroundColor: theme.colors.textMuted }]} />
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
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '800', minWidth: 44 },
  barRow: { flexDirection: 'row', gap: 4, height: 6 },
  barSideLeft: { flex: 1, alignItems: 'flex-end' },
  barSideRight: { flex: 1, alignItems: 'flex-start' },
  fill: { height: 6 },
  fillLeft: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  fillRight: { borderTopRightRadius: 3, borderBottomRightRadius: 3 },
});
