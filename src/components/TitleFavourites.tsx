import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TitleOdd } from '../data/odds';
import { useTitleOdds } from '../hooks/useTitleOdds';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';
import { Flag } from './Flag';
import { SkeletonBlock } from './Skeleton';

/**
 * Horizontal strip of the tournament favourites by bookmaker-implied win chance.
 * Hidden entirely when no odds API key is configured.
 */
export function TitleFavourites() {
  const theme = useTheme();
  const { data, isLoading } = useTitleOdds();

  if (!isLoading && (!data || data.length === 0)) return null;

  const top: TitleOdd[] = (data ?? []).slice(0, 10);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Title favourites</Text>

      {isLoading && !data ? (
        <View style={styles.loadingRow}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} style={{ width: 92, height: 96, borderRadius: 14 }} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {top.map((o, i) => (
            <View
              key={o.team.code + o.team.name}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}
            >
              <Text style={[styles.rank, { color: theme.colors.textMuted }]}>#{i + 1}</Text>
              <Flag team={o.team} size={30} />
              <Text numberOfLines={1} style={[styles.team, { color: theme.colors.text }]}>
                {o.team.name}
              </Text>
              <Text style={[styles.odds, tabularNums, { color: theme.colors.accent }]}>
                ${o.decimal.toFixed(2)}
              </Text>
              <Text style={[styles.pct, tabularNums, { color: theme.colors.textSecondary }]}>
                {o.impliedPct.toFixed(1)}%
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.caption, { color: theme.colors.textMuted }]}>
        Decimal odds · win chance · via The Odds API
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 10, marginLeft: 2 },
  row: { gap: 10, paddingRight: 16, paddingLeft: 2 },
  loadingRow: { flexDirection: 'row', gap: 10, marginLeft: 2 },
  card: {
    width: 92,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
  },
  rank: { fontSize: 11, fontWeight: '700' },
  team: { fontSize: 12, fontWeight: '700', textAlign: 'center', alignSelf: 'stretch' },
  odds: { fontSize: 16, fontWeight: '900' },
  pct: { fontSize: 11, fontWeight: '700' },
  caption: { fontSize: 11, fontWeight: '600', marginTop: 10, marginLeft: 2 },
});
