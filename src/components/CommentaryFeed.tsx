import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CommentaryItem } from '../data/espnStats';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/theme';

/** Running commentary, newest first, capped to `limit` lines. */
export function CommentaryFeed({ items, limit = 8 }: { items: CommentaryItem[]; limit?: number }) {
  const theme = useTheme();
  const latest = items.slice(-limit).reverse();
  if (!latest.length) return null;

  return (
    <View>
      {latest.map((c, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.min, { color: theme.colors.accent, fontFamily: fonts.monoBold }]}>
            {c.minute ? `${c.minute}'` : '·'}
          </Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary, fontFamily: fonts.body }]}>{c.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  min: { fontSize: 11, minWidth: 30, textAlign: 'right' },
  text: { fontSize: 12, flex: 1, lineHeight: 17 },
});
