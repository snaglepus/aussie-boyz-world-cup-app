import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { Flag } from '../../src/components/Flag';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { useTitleOdds } from '../../src/hooks/useTitleOdds';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { BracketMatch, Side, buildBracket } from '../../src/utils/bracket';

const CARD_W = 158;
const CARD_H = 74;
const GAP = 18;
const PITCH = CARD_H + GAP; // vertical pitch of the first (Round of 32) column
const LABEL_H = 34; // space at the top of each column for the round label
const COL_W = CARD_W + 26;

export default function KnockoutScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useWorldCup();
  const { data: odds } = useTitleOdds();

  const bracket = useMemo(() => (data ? buildBracket(data, odds) : null), [data, odds]);
  const rounds = bracket?.columns.filter((c) => c.matches.length > 0) ?? [];
  const tallest = rounds.length ? rounds[0].matches.length : 0;
  const columnHeight = LABEL_H + tallest * PITCH;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Knockout" subtitle="World Cup 2026" />

      {bracket && bracket.estimated ? (
        <View style={[styles.banner, { backgroundColor: theme.colors.playoff }]}>
          <Ionicons name="information-circle-outline" size={15} color={theme.colors.text} />
          <Text style={[styles.bannerText, { color: theme.colors.text }]}>
            Estimate only — match-ups are a guess from current form, betting odds &amp; FIFA ranking until games are played.
          </Text>
        </View>
      ) : null}

      {isLoading && !data ? (
        <View style={styles.loading}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} style={{ height: CARD_H, borderRadius: 12, marginBottom: GAP }} />
          ))}
        </View>
      ) : rounds.length === 0 ? (
        <EmptyState icon="git-network-outline" title="Bracket not available" message="The knockout bracket will appear here." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {rounds.map((col) => (
              <View key={col.round} style={{ width: COL_W, height: columnHeight }}>
                <Text style={[styles.roundLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {SHORT[col.round] ?? col.round}
                </Text>
                {col.matches.map((m) => (
                  <View key={m.id} style={[styles.cardWrap, { top: LABEL_H + m.row * PITCH }]}>
                    <MatchCard match={m} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const SHORT: Record<string, string> = {
  'Round of 32': 'Round of 32',
  'Round of 16': 'Round of 16',
  'Quarter-final': 'Quarter-finals',
  'Semi-final': 'Semi-finals',
  Final: 'Final',
};

function MatchCard({ match }: { match: BracketMatch }) {
  const theme = useTheme();
  const router = useRouter();
  const finished = match.status === 'finished';

  return (
    <Pressable
      onPress={() => router.push(`/match/${encodeURIComponent(match.id)}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.hairline,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {shortDate(match.kickoff, match.date)}
        {match.ground ? ` · ${city(match.ground)}` : ''}
      </Text>
      <SideRow side={match.home} score={finished ? match.homeScore : null} />
      <SideRow side={match.away} score={finished ? match.awayScore : null} />
    </Pressable>
  );
}

function SideRow({ side, score }: { side: Side; score: number | null }) {
  const theme = useTheme();
  const known = !!side.team;
  return (
    <View style={styles.side}>
      {known ? (
        <Flag team={side.team!} size={18} />
      ) : (
        <View style={[styles.tbdDot, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]} />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.sideName,
          { color: known ? theme.colors.text : theme.colors.textMuted, fontWeight: known ? '700' : '600' },
        ]}
      >
        {side.label}
      </Text>
      {score != null ? (
        <Text style={[styles.score, { color: theme.colors.text }]}>{score}</Text>
      ) : null}
    </View>
  );
}

function shortDate(kickoff: string | null, fallback: string): string {
  const d = kickoff ? new Date(kickoff) : new Date(`${fallback}T00:00:00`);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "Los Angeles (Inglewood)" → "Los Angeles". */
function city(ground: string): string {
  return ground.split('(')[0].trim();
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10 },
  bannerText: { fontSize: 12, fontWeight: '700', flex: 1 },
  loading: { padding: 16 },
  row: { paddingHorizontal: 16, paddingTop: 4 },
  roundLabel: { position: 'absolute', top: 0, left: 0, width: CARD_W, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  cardWrap: { position: 'absolute', left: 0, width: CARD_W, height: CARD_H },
  card: { height: CARD_H, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center', gap: 5 },
  meta: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tbdDot: { width: 18, height: 13, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
  sideName: { fontSize: 12.5, flex: 1 },
  score: { fontSize: 13, fontWeight: '800', minWidth: 12, textAlign: 'right' },
});
