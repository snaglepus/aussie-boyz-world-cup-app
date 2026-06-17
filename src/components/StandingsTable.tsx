import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GroupTable, Standing } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { Flag } from './Flag';
import { FormPills } from './FormPills';

const COL = { pos: 26, team: 150, stat: 30, pts: 38, gd: 36, form: 112 };

/** A single group's standings, mirroring the reference screenshot layout. */
export function StandingsTable({ table }: { table: GroupTable }) {
  const theme = useTheme();

  return (
    <View style={styles.block}>
      <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{table.group}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <Header />
            {table.rows.map((row, i) => (
              <Row key={row.team.code + row.team.name} row={row} position={i + 1} last={i === table.rows.length - 1} />
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
        { width, color: bold ? theme.colors.text : theme.colors.textMuted, fontWeight: bold ? '700' : '600' },
      ]}
    >
      {label}
    </Text>
  );
  return (
    <View style={[styles.row, styles.headerRow, { borderColor: theme.colors.hairline }]}>
      <Text style={[styles.head, { width: COL.pos }]} />
      <Text style={[styles.head, { width: COL.team, textAlign: 'left', color: theme.colors.textMuted }]}>Team</Text>
      {cell('MP', COL.stat)}
      {cell('W', COL.stat)}
      {cell('D', COL.stat)}
      {cell('L', COL.stat)}
      {cell('Pts', COL.pts, true)}
      {cell('GF', COL.stat)}
      {cell('GA', COL.stat)}
      {cell('GD', COL.gd)}
      <Text style={[styles.head, { width: COL.form, textAlign: 'center', color: theme.colors.textMuted }]}>Last 5</Text>
    </View>
  );
}

function Row({ row, position, last }: { row: Standing; position: number; last: boolean }) {
  const theme = useTheme();
  // Top 2 advance; 3rd may qualify as a best-third-placed team.
  const band =
    position <= 2 ? theme.colors.qualify : position === 3 ? theme.colors.playoff : 'transparent';
  const accent =
    position <= 2 ? theme.colors.accent : position === 3 ? theme.colors.gold : 'transparent';

  const stat = (value: number, width: number, bold = false, signed = false) => (
    <Text
      style={[
        styles.cell,
        tabularNums,
        { width, color: bold ? theme.colors.text : theme.colors.textSecondary, fontWeight: bold ? '800' : '600' },
      ]}
    >
      {signed && value > 0 ? `+${value}` : value}
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
        <Text style={[styles.pos, tabularNums, { color: theme.colors.textSecondary }]}>{position}</Text>
      </View>
      <View style={[styles.teamCell, { width: COL.team }]}>
        <Flag team={row.team} size={22} />
        <Text numberOfLines={1} style={[styles.teamName, { color: theme.colors.text }]}>
          {row.team.name}
        </Text>
      </View>
      {stat(row.mp, COL.stat)}
      {stat(row.w, COL.stat)}
      {stat(row.d, COL.stat)}
      {stat(row.l, COL.stat)}
      {stat(row.pts, COL.pts, true)}
      {stat(row.gf, COL.stat)}
      {stat(row.ga, COL.stat)}
      {stat(row.gd, COL.gd, false, true)}
      <View style={[styles.formCell, { width: COL.form }]}>
        <FormPills form={row.form} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 22 },
  groupTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, marginLeft: 2 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', height: 50, paddingRight: 12 },
  headerRow: { height: 38, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { fontSize: 12, textAlign: 'center' },
  cell: { fontSize: 14, textAlign: 'center' },
  posWrap: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  posBar: { width: 3, height: '64%', borderRadius: 2, marginRight: 6 },
  pos: { fontSize: 13, fontWeight: '700', width: 14 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  teamName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  formCell: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
});
