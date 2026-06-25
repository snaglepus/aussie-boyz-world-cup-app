import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { Flag } from './Flag';

/** Flag + country name — the standard way teams appear everywhere in the app. */
export function TeamLabel({
  team,
  align = 'left',
  bold = false,
  flagSize = 26,
  muted = false,
}: {
  team: TeamRef;
  align?: 'left' | 'right';
  bold?: boolean;
  flagSize?: number;
  muted?: boolean;
}) {
  const theme = useTheme();
  const color = muted || team.isPlaceholder ? theme.colors.textMuted : theme.colors.text;
  const name = (
    <Text
      numberOfLines={1}
      style={[
        styles.name,
        { color, fontFamily: bold ? theme.fonts.bodyBold : theme.fonts.bodyMedium, textAlign: align },
      ]}
    >
      {team.name}
    </Text>
  );
  return (
    <View style={[styles.row, align === 'right' && styles.rowReverse]}>
      <Flag team={team} size={flagSize} />
      <View style={styles.nameWrap}>{name}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowReverse: { flexDirection: 'row-reverse' },
  nameWrap: { flex: 1 },
  name: { fontSize: 15 },
});
