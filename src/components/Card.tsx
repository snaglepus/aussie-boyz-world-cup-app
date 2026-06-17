import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Standard rounded surface used to group content into clean modules. */
export function Card({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }, style]}>
      {title ? <Text style={[styles.title, { color: theme.colors.textSecondary }]}>{title.toUpperCase()}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 14 },
  title: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
});
