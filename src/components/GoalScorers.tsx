import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GoalEvent } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';

/** Two columns of scorers mirroring home (left) / away (right). */
export function GoalScorers({ goals }: { goals: GoalEvent[] }) {
  const theme = useTheme();
  if (!goals.length) return null;

  const home = goals.filter((g) => g.team === 'home');
  const away = goals.filter((g) => g.team === 'away');

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.hairline }]}>
      <Ionicons name="football" size={15} color={theme.colors.textMuted} style={styles.ball} />
      <View style={styles.col}>
        {home.map((g, i) => (
          <ScorerLine key={`h${i}`} goal={g} align="left" />
        ))}
      </View>
      <View style={styles.col}>
        {away.map((g, i) => (
          <ScorerLine key={`a${i}`} goal={g} align="right" />
        ))}
      </View>
    </View>
  );
}

function ScorerLine({ goal, align }: { goal: GoalEvent; align: 'left' | 'right' }) {
  const theme = useTheme();
  const annotation = goal.ownGoal ? ' (OG)' : goal.penalty ? ' (pen)' : '';
  return (
    <Text
      numberOfLines={1}
      style={[styles.line, tabularNums, { color: theme.colors.textSecondary, textAlign: align }]}
    >
      {align === 'left' ? `${goal.name}${annotation} ${goal.minute}'` : `${goal.minute}' ${goal.name}${annotation}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingTop: 14, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  ball: { position: 'absolute', top: 14, alignSelf: 'center' },
  col: { flex: 1, gap: 5, paddingHorizontal: 14 },
  line: { fontSize: 13, fontWeight: '600' },
});
