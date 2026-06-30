import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { Flag } from '../../src/components/Flag';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { useTitleOdds } from '../../src/hooks/useTitleOdds';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts } from '../../src/theme/theme';
import { BracketColumn, BracketMatch, Side, buildBracket } from '../../src/utils/bracket';

const CARD_W = 158;
const CARD_H = 86;
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
  const bodyHeight = tallest * PITCH + 8; // scrollable card area height
  const totalWidth = rounds.length * COL_W;
  const [areaH, setAreaH] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Knockout" subtitle="World Cup 2026" />

      {bracket && bracket.estimated ? (
        <View style={[styles.banner, { backgroundColor: theme.colors.playoff }]}>
          <Ionicons name="information-circle-outline" size={15} color={theme.colors.text} style={{ marginTop: 1 }} />
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerText, { color: theme.colors.text }]}>
              Match-ups are estimated from current form, betting odds &amp; FIFA ranking until games are played.
            </Text>
            <View style={styles.legendRow}>
              <Ionicons name="checkmark-circle" size={13} color={theme.colors.accent} />
              <Text style={[styles.legendText, { color: theme.colors.text }]}>Confirmed</Text>
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>· others are projected</Text>
            </View>
          </View>
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
        <View style={{ flex: 1 }} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
          {
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: totalWidth, height: areaH || 600, paddingLeft: 16 }}>
                {/* Sticky round labels: scroll horizontally with the columns but
                    stay fixed vertically (they sit above the vertical scroller). */}
                <View style={[styles.labelRow, { backgroundColor: theme.colors.bg }]}>
                  {rounds.map((col) => (
                    <Text
                      key={col.round}
                      numberOfLines={1}
                      style={[styles.roundLabel, { width: COL_W, color: theme.colors.textSecondary }]}
                    >
                      {SHORT[col.round] ?? col.round}
                    </Text>
                  ))}
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  <View style={{ width: totalWidth, height: bodyHeight }}>
                    {/* Connector elbows sit behind the cards. */}
                    <Connectors rounds={rounds} color={theme.colors.accent} />
                    {rounds.map((col, ci) =>
                      col.matches.map((m) => (
                        <View key={m.id} style={[styles.cardWrap, { left: ci * COL_W, top: m.row * PITCH }]}>
                          <MatchCard match={m} />
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          }
        </View>
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

/**
 * Bracket connector lines: for every match, an elbow links each of its two
 * feeder matches' right edge to this match's left edge, meeting at a vertical
 * spine halfway between the columns — the classic tournament-bracket look.
 */
function Connectors({ rounds, color }: { rounds: BracketColumn[]; color: string }) {
  const pos = new Map<string, { ci: number; row: number }>();
  rounds.forEach((col, ci) => col.matches.forEach((m) => pos.set(m.id, { ci, row: m.row })));

  const seg = (key: string, left: number, top: number, width: number, height: number) => (
    <View key={key} style={{ position: 'absolute', left, top, width, height, backgroundColor: color, borderRadius: 1, opacity: 0.85 }} />
  );

  const lines: React.ReactNode[] = [];
  const STUB = (COL_W - CARD_W) / 2; // gap between a card's edge and the spine
  rounds.forEach((col, ci) => {
    if (ci === 0) return;
    col.matches.forEach((m) => {
      const parentCY = m.row * PITCH + CARD_H / 2;
      const parentLeftX = ci * COL_W;
      const midX = (ci - 1) * COL_W + CARD_W + STUB;
      lines.push(seg(`${m.id}-p`, midX, parentCY - 1, parentLeftX - midX, 2));
      m.feeders.forEach((fid, k) => {
        const fp = pos.get(fid);
        if (!fp) return;
        const childCY = fp.row * PITCH + CARD_H / 2;
        const childRightX = (ci - 1) * COL_W + CARD_W;
        lines.push(seg(`${m.id}-h${k}`, childRightX, childCY - 1, midX - childRightX, 2));
        const y0 = Math.min(childCY, parentCY);
        const h = Math.abs(parentCY - childCY);
        if (h > 0) lines.push(seg(`${m.id}-v${k}`, midX - 1, y0, 2, h));
      });
    });
  });
  return <>{lines}</>;
}

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
      <SideRow side={match.home} score={finished ? match.homeScore : null} pen={match.penalties?.home ?? null} penWin={!!match.penalties && match.penalties.home > match.penalties.away} />
      <SideRow side={match.away} score={finished ? match.awayScore : null} pen={match.penalties?.away ?? null} penWin={!!match.penalties && match.penalties.away > match.penalties.home} />
    </Pressable>
  );
}

function SideRow({ side, score, pen, penWin }: { side: Side; score: number | null; pen?: number | null; penWin?: boolean }) {
  const theme = useTheme();
  const known = !!side.team;
  const confirmed = known && side.confirmed;
  // Confirmed teams render strong; projected (estimated) ones are muted; TBD is faint.
  const color = confirmed ? theme.colors.text : known ? theme.colors.textSecondary : theme.colors.textMuted;

  return (
    <View style={styles.side}>
      {known ? (
        <Flag team={side.team!} size={18} />
      ) : (
        <View style={[styles.tbdDot, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]} />
      )}
      <Text numberOfLines={1} style={[styles.sideName, { color, fontFamily: confirmed ? fonts.bodyBold : fonts.bodyMedium }]}>
        {side.label}
      </Text>
      {confirmed ? (
        <Ionicons name="checkmark-circle" size={13} color={theme.colors.accent} style={styles.tick} />
      ) : null}
      {score != null ? (
        <Text style={[styles.score, { color: theme.colors.text }]}>
          {score}
          {pen != null ? <Text style={[styles.penScore, { color: penWin ? theme.colors.accent : theme.colors.textMuted }]}> ({pen})</Text> : null}
        </Text>
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
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10 },
  bannerBody: { flex: 1, gap: 5 },
  bannerText: { fontSize: 12, fontFamily: fonts.bodyMedium },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, fontFamily: fonts.mono },
  loading: { padding: 16 },
  labelRow: { flexDirection: 'row', height: LABEL_H, paddingTop: 4 },
  roundLabel: { fontSize: 11, fontFamily: fonts.heading, letterSpacing: 0.2 },
  cardWrap: { position: 'absolute', width: CARD_W, height: CARD_H },
  card: { height: CARD_H, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center', gap: 5 },
  meta: { fontSize: 10, lineHeight: 13, fontFamily: fonts.mono, marginBottom: 2 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tbdDot: { width: 18, height: 13, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
  sideName: { fontSize: 12.5, lineHeight: 16, flex: 1 },
  tick: { marginLeft: -2 },
  score: { fontSize: 13, fontFamily: fonts.monoBold, minWidth: 12, textAlign: 'right' },
  penScore: { fontSize: 11, fontFamily: fonts.monoBold },
});
