import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** "Last 5" form indicators, oldest → newest (newest on the right). */
export function FormPills({ form, max = 5 }: { form: ('W' | 'D' | 'L')[]; max?: number }) {
  const theme = useTheme();
  const colorFor = (r: 'W' | 'D' | 'L') =>
    r === 'W' ? theme.colors.win : r === 'L' ? theme.colors.loss : theme.colors.draw;

  const items = form.slice(-max);
  const placeholders = Math.max(0, max - items.length);

  return (
    <View style={styles.row}>
      {Array.from({ length: placeholders }).map((_, i) => (
        <View
          key={`p${i}`}
          style={[styles.pill, styles.empty, { borderColor: theme.colors.border }]}
        />
      ))}
      {items.map((r, i) => (
        <View key={i} style={[styles.pill, { backgroundColor: colorFor(r) }]}>
          <Text style={styles.text}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  pill: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
  text: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
