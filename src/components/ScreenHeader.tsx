import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Large iOS-style title with an optional subtitle and trailing slot. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});
