import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchOdds, TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, tabularNums } from '../theme/theme';
import { Flag } from './Flag';
import { LiveBadge } from './LiveBadge';

/**
 * Three-way match odds as a stacked win-chance bar: home / draw / away. When the
 * odds are in-play a LIVE badge shows and the split moves with the market price.
 */
export function OddsBar({ odds, home, away }: { odds: MatchOdds; home: TeamRef; away: TeamRef }) {
  const theme = useTheme();
  const pct = (v: number) => Math.round(v * 100);
  const segs = [
    { flex: Math.max(odds.home, 0.001), color: theme.colors.accent },
    { flex: Math.max(odds.draw, 0.001), color: theme.colors.draw },
    { flex: Math.max(odds.away, 0.001), color: theme.colors.statPurple },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <View style={styles.side}>
          <Flag team={home} size={16} />
          <Text style={[styles.name, { color: theme.colors.text, fontFamily: fonts.bodyBold }]} numberOfLines={1}>{home.code}</Text>
          <Text style={[styles.pct, tabularNums, { color: theme.colors.accent, fontFamily: fonts.monoBold }]}>{pct(odds.home)}%</Text>
        </View>
        <View style={styles.mid}>
          <Text style={[styles.drawLabel, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>DRAW</Text>
          <Text style={[styles.pct, tabularNums, { color: theme.colors.textSecondary, fontFamily: fonts.monoBold }]}>{pct(odds.draw)}%</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          <Text style={[styles.pct, tabularNums, { color: theme.colors.statPurple, fontFamily: fonts.monoBold }]}>{pct(odds.away)}%</Text>
          <Text style={[styles.name, { color: theme.colors.text, fontFamily: fonts.bodyBold }]} numberOfLines={1}>{away.code}</Text>
          <Flag team={away} size={16} />
        </View>
      </View>

      <View style={styles.bar}>
        {segs.map((s, i) => (
          <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />
        ))}
      </View>

      <View style={styles.footer}>
        {odds.live ? <LiveBadge label="LIVE" /> : null}
        <Text style={[styles.caption, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>
          {odds.live ? 'In-play odds · implied win chance' : 'Pre-match odds · implied win chance'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labels: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideRight: { justifyContent: 'flex-end' },
  mid: { alignItems: 'center', paddingHorizontal: 6 },
  name: { fontSize: 13 },
  pct: { fontSize: 13 },
  drawLabel: { fontSize: 9, letterSpacing: 0.5 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caption: { fontSize: 11 },
});
