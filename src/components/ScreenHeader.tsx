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
        <Text style={[styles.brand, { color: theme.colors.accentDim, fontFamily: theme.fonts.mono }]}>
          AUSSIE BOYZ 2026
        </Text>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.bodyMedium }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  brand: { fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 32, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 3 },
});
