import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GroupTable, Standing } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { teamHref } from '../utils/nav';
import { teamKey } from '../utils/standings';
import { Flag } from './Flag';
import { FormPills } from './FormPills';

const COL = { pos: 26, team: 174, stat: 30, pts: 38, gd: 36, form: 112 };

/** A single group's standings, mirroring the reference screenshot layout. */
export function StandingsTable({
  table,
  bestThirds,
  confidence,
}: {
  table: GroupTable;
  bestThirds: Set<string>;
  confidence: Map<string, number>;
}) {
  const theme = useTheme();

  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <View style={[styles.titleBar, { backgroundColor: theme.colors.accent }]} />
        <Text style={[styles.groupTitle, { color: theme.colors.text, fontFamily: theme.fonts.heading }]}>
          {table.group}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <Header />
            {table.rows.map((row, i) => (
              <Row
                key={teamKey(row.team)}
                row={row}
                position={i + 1}
                last={i === table.rows.length - 1}
                isBestThird={bestThirds.has(teamKey(row.team))}
                confidence={confidence.get(teamKey(row.team))}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Header() {
  const theme = useTheme();
  const cell = (label: string, width: number, bold = false) => (
    <Text
      key={label}
      style={[
        styles.head,
        tabularNums,
        { width, color: bold ? theme.colors.textSecondary : theme.colors.textMuted, fontFamily: theme.fonts.mono },
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
  return (
    <View style={[styles.row, styles.headerRow, { borderColor: theme.colors.hairline }]}>
      <Text style={[styles.head, { width: COL.pos }]} />
      <Text style={[styles.head, { width: COL.team, textAlign: 'left', color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>TEAM</Text>
      {cell('MP', COL.stat)}
      {cell('W', COL.stat)}
      {cell('D', COL.stat)}
      {cell('L', COL.stat)}
      {cell('Pts', COL.pts, true)}
      {cell('GF', COL.stat)}
      {cell('GA', COL.stat)}
      {cell('GD', COL.gd)}
      <Text style={[styles.head, { width: COL.form, textAlign: 'center', color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>LAST 5</Text>
    </View>
  );
}

function Row({
  row,
  position,
  last,
  isBestThird,
  confidence,
}: {
  row: Standing;
  position: number;
  last: boolean;
  isBestThird: boolean;
  confidence?: number;
}) {
  const theme = useTheme();
  const router = useRouter();
  // Top 2 advance; only a 3rd that ranks among the best 8 takes a wildcard spot.
  const bestThird = position === 3 && isBestThird;
  const band =
    position <= 2 ? theme.colors.qualify : bestThird ? theme.colors.playoff : 'transparent';
  const accent =
    position <= 2 ? theme.colors.accent : bestThird ? theme.colors.gold : 'transparent';

  const ptsColor = position <= 2 ? theme.colors.accent : bestThird ? theme.colors.gold : theme.colors.text;
  const gdColor = (v: number) =>
    v > 0 ? theme.colors.accentDim : v < 0 ? theme.colors.loss : theme.colors.textMuted;

  const stat = (value: number, width: number, opts?: { color?: string; strong?: boolean; signed?: boolean }) => (
    <Text
      style={[
        styles.cell,
        tabularNums,
        {
          width,
          color: opts?.color ?? theme.colors.textSecondary,
          fontFamily: opts?.strong ? theme.fonts.monoBold : theme.fonts.mono,
        },
      ]}
    >
      {opts?.signed && value > 0 ? `+${value}` : value}
    </Text>
  );

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: band, borderColor: theme.colors.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.posWrap, { width: COL.pos }]}>
        <View style={[styles.posBar, { backgroundColor: accent }]} />
        <Text style={[styles.pos, tabularNums, { color: position <= 2 ? theme.colors.accent : bestThird ? theme.colors.gold : theme.colors.textMuted, fontFamily: theme.fonts.monoBold }]}>
          {position}
        </Text>
      </View>
      <Pressable
        style={[styles.teamCell, { width: COL.team }]}
        onPress={() => router.navigate(teamHref(row.team))}
        hitSlop={4}
      >
        <Flag team={row.team} size={24} />
        <Text numberOfLines={1} style={[styles.teamName, { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }]}>
          {row.team.name}
        </Text>
        {confidence != null ? (
          <View
            style={[
              styles.confPill,
              { backgroundColor: bestThird ? theme.colors.gold : theme.colors.surfaceAlt },
            ]}
          >
            <Text style={[styles.confText, { color: bestThird ? '#11151C' : theme.colors.textMuted, fontFamily: theme.fonts.monoBold }]}>
              {confidence}%
            </Text>
          </View>
        ) : null}
      </Pressable>
      {stat(row.mp, COL.stat)}
      {stat(row.w, COL.stat)}
      {stat(row.d, COL.stat)}
      {stat(row.l, COL.stat)}
      {stat(row.pts, COL.pts, { color: ptsColor, strong: true })}
      {stat(row.gf, COL.stat)}
      {stat(row.ga, COL.stat)}
      {stat(row.gd, COL.gd, { color: gdColor(row.gd), signed: true })}
      <View style={[styles.formCell, { width: COL.form }]}>
        <FormPills form={row.form} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10, marginLeft: 2 },
  titleBar: { width: 5, height: 22, borderRadius: 3 },
  groupTitle: { fontSize: 20, letterSpacing: -0.3 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', height: 50, paddingRight: 12 },
  headerRow: { height: 36, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { fontSize: 10, textAlign: 'center', letterSpacing: 0.6 },
  cell: { fontSize: 13, textAlign: 'center' },
  posWrap: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  posBar: { width: 3, height: '64%', borderRadius: 2, marginRight: 6 },
  pos: { fontSize: 13, width: 14 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  teamName: { fontSize: 14, flexShrink: 1 },
  confPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  confText: { fontSize: 10, letterSpacing: 0.2 },
  formCell: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
});
