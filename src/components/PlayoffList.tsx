import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { teamHref } from '../utils/nav';
import { BandKey, Clinch, PlayoffBand, PlayoffRow } from '../utils/playoffRanking';
import { Flag } from './Flag';

const THIRD_BLUE = '#3B82F6';

/** Single ranked playoff picture, split into position bands with cut lines. */
export function PlayoffList({ bands }: { bands: PlayoffBand[] }) {
  const theme = useTheme();
  const accentFor = (k: BandKey) =>
    k === 'winners' ? theme.colors.gold : k === 'runners' ? theme.colors.accent : k === 'thirds' ? THIRD_BLUE : theme.colors.loss;

  return (
    <View>
      {bands.map((band) => {
        const accent = accentFor(band.key);
        return (
          <View key={band.key} style={styles.band}>
            <View style={styles.bandHeader}>
              <View style={[styles.bandBar, { backgroundColor: accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bandLabel, { color: theme.colors.text }]}>{band.label}</Text>
                <Text style={[styles.bandSub, { color: theme.colors.textMuted }]}>{band.sublabel}</Text>
              </View>
              <Text style={[styles.bandCount, { color: theme.colors.textMuted }]}>{band.rows.length}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}>
              {band.rows.map((row, i) => (
                <Row key={row.team.code + row.team.name} row={row} accent={accent} last={i === band.rows.length - 1} />
              ))}
              {band.rows.length === 0 ? (
                <Text style={[styles.empty, { color: theme.colors.textMuted }]}>No teams yet</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Row({ row, accent, last }: { row: PlayoffRow; accent: string; last: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate(teamHref(row.team))}
      style={[
        styles.row,
        { borderBottomColor: theme.colors.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rankBar, { backgroundColor: accent }]} />
      <Text style={[styles.rank, tabularNums, { color: theme.colors.textSecondary }]}>{row.rank}</Text>
      <View style={[styles.grpChip, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
        <Text style={[styles.grpText, { color: theme.colors.textSecondary }]}>{row.group}</Text>
      </View>
      <Flag team={row.team} size={20} />
      <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text }]}>
        {row.team.name}
      </Text>
      <ClinchBadge clinch={row.clinch} />
      <Text style={[styles.pts, tabularNums, { color: theme.colors.text }]}>{row.pts}</Text>
    </Pressable>
  );
}

function ClinchBadge({ clinch }: { clinch: Clinch }) {
  const theme = useTheme();
  if (clinch === 'none') return null;
  const map = {
    'won-group': { label: '1st', bg: theme.colors.gold, fg: '#11151C', border: false },
    qualified: { label: 'QUAL', bg: theme.colors.accent, fg: theme.colors.onAccent, border: false },
    eliminated: { label: 'OUT', bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted, border: true },
  }[clinch];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: map.bg,
          borderColor: map.border ? theme.colors.border : 'transparent',
          borderWidth: map.border ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { marginBottom: 18 },
  bandHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8, marginLeft: 2 },
  bandBar: { width: 4, height: 26, borderRadius: 2 },
  bandLabel: { fontSize: 15, fontWeight: '800' },
  bandSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  bandCount: { fontSize: 13, fontWeight: '800', marginRight: 4 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', height: 46, paddingRight: 12, gap: 9 },
  rankBar: { width: 3, height: '62%', borderRadius: 2 },
  rank: { width: 20, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  grpChip: { width: 20, height: 20, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  grpText: { fontSize: 11, fontWeight: '800' },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  pts: { width: 24, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  empty: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 16 },
});
