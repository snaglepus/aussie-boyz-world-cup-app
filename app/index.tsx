import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { liveMatches } from '../src/data/service';
import { useWorldCup } from '../src/hooks/useWorldCup';
import { useTheme } from '../src/theme/ThemeProvider';

/**
 * Entry gate: picks the default landing screen per the brief — the Live screen
 * when a match is in progress, otherwise the Matches screen.
 */
export default function Index() {
  const theme = useTheme();
  const { data, isLoading, isError } = useWorldCup();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.brand, { color: theme.colors.accent }]}>Aussie Boyz</Text>
        <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>World Cup 2026</Text>
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 18 }} />
      </View>
    );
  }

  const hasLive = !!data && liveMatches(data).length > 0;
  if (hasLive) return <Redirect href="/live" />;
  // On error we still route to Matches, which shows the bundled fallback data.
  return <Redirect href="/matches" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  sub: { fontSize: 15, fontWeight: '600', marginTop: 2 },
});
