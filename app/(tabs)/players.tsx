import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../src/components/EmptyState';
import { Flag } from '../../src/components/Flag';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { usePlayerStats } from '../../src/hooks/usePlayerStats';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts, tabularNums } from '../../src/theme/theme';
import { buildGoldenBoot, ScorerRow } from '../../src/utils/scorers';

const LEFT_W = 176; // pinned identity column (rank + flag + name + goals)
const CELL_W = 46; // each scrollable stat column
const CHEV_W = 24;

type StatKey = 'assists' | 'shots' | 'sot' | 'yellow' | 'red';
const STAT_COLS: { key: StatKey; label: string }[] = [
  { key: 'assists', label: 'AST' },
  { key: 'shots', label: 'ATT' },
  { key: 'sot', label: 'SOT' },
  { key: 'yellow', label: 'YEL' },
  { key: 'red', label: 'RED' },
];

/** Keeps every row's horizontal stat scroller (and the header) aligned to one offset. */
function useSyncedScroll() {
  const x = useRef(0);
  const scrollers = useRef(new Map<string, ScrollView>());
  const register = useCallback((id: string, ref: ScrollView | null) => {
    if (ref) {
      scrollers.current.set(id, ref);
      if (x.current) ref.scrollTo({ x: x.current, animated: false });
    } else {
      scrollers.current.delete(id);
    }
  }, []);
  const onScroll = useCallback((id: string, nextX: number) => {
    if (Math.abs(nextX - x.current) < 0.5) return;
    x.current = nextX;
    scrollers.current.forEach((ref, key) => {
      if (key !== id) ref.scrollTo({ x: nextX, animated: false });
    });
  }, []);
  return { register, onScroll };
}

export default function PlayersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch } = useWorldCup();
  const { data: stats } = usePlayerStats();
  const sync = useSyncedScroll();

  const rows = useMemo(() => buildGoldenBoot(data?.matches ?? [], stats), [data, stats]);
  const showTable = rows.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Golden Boot" subtitle="Top scorers · World Cup 2026" />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />}
      >
        <Text style={[styles.note, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>
          The tournament&apos;s top scorer. Own goals don&apos;t count; penalties do. Ranked by goals, then assists, then
          fewest minutes. Scroll the stats right for more — AST assists · ATT attempts · SOT on target · YEL/RED cards.
          Tap a player for each goal (game &amp; minute, P = penalty).
        </Text>

        {showTable ? (
          <View style={styles.headerRow}>
            <View style={styles.headLeft}>
              <Text style={[styles.headLabel, { color: theme.colors.textMuted }]}>GLS</Text>
            </View>
            <ScrollView
              ref={(r) => sync.register('header', r)}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => sync.onScroll('header', e.nativeEvent.contentOffset.x)}
              contentContainerStyle={styles.strip}
            >
              {STAT_COLS.map((c) => (
                <Text key={c.key} style={[styles.statCell, styles.headLabel, { color: theme.colors.textMuted }]}>
                  {c.label}
                </Text>
              ))}
            </ScrollView>
            <View style={{ width: CHEV_W }} />
          </View>
        ) : null}

        {isLoading && !data ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} style={{ height: 56, borderRadius: 14, marginBottom: 8 }} />
          ))
        ) : !showTable ? (
          <EmptyState icon="football-outline" title="No goals yet" message="The scorers table fills in as goals go in." />
        ) : (
          rows.map((r, i) => <ScorerCard key={`${r.player}-${r.team.code}`} row={r} prev={rows[i - 1]} sync={sync} />)
        )}
      </ScrollView>
    </View>
  );
}

function ScorerCard({
  row,
  prev,
  sync,
}: {
  row: ScorerRow;
  prev?: ScorerRow;
  sync: ReturnType<typeof useSyncedScroll>;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const leader = row.rank === 1;
  const id = `${row.player}-${row.team.code}`;
  // Only print the rank on the first row of a joint group (cleaner shared ranks).
  const showRank = !prev || prev.rank !== row.rank;
  const rankColor = leader ? theme.colors.gold : row.rank <= 3 ? theme.colors.accent : theme.colors.textMuted;
  const toggle = () => setOpen((o) => !o);

  const colorFor = (key: StatKey) =>
    key === 'yellow' ? theme.colors.gold : key === 'red' ? theme.colors.live : theme.colors.text;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: leader ? theme.colors.gold : theme.colors.hairline,
          borderWidth: leader ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.mainRow}>
        <Pressable onPress={toggle} style={({ pressed }) => [styles.left, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.rank, tabularNums, { color: rankColor, fontFamily: fonts.monoBold }]}>
            {showRank ? row.rank : ''}
          </Text>
          <Flag team={row.team} size={28} />
          <View style={styles.who}>
            <Text numberOfLines={1} style={[styles.player, { color: theme.colors.text, fontFamily: fonts.bodyBold }]}>
              {row.player}
            </Text>
            <Text numberOfLines={1} style={[styles.team, { color: theme.colors.textSecondary, fontFamily: fonts.mono }]}>
              {row.team.name}
              {row.penalties > 0 ? ` · ${row.penalties}p` : ''}
            </Text>
          </View>
          {leader ? <MaterialCommunityIcons name="shoe-cleat" size={15} color={theme.colors.gold} style={styles.boot} /> : null}
          <Text style={[styles.goals, tabularNums, { color: leader ? theme.colors.gold : theme.colors.text, fontFamily: fonts.display }]}>
            {row.goals}
          </Text>
        </Pressable>

        <ScrollView
          ref={(r) => sync.register(id, r)}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => sync.onScroll(id, e.nativeEvent.contentOffset.x)}
          contentContainerStyle={styles.strip}
          style={styles.stripScroll}
        >
          {STAT_COLS.map((c) => (
            <StatCell key={c.key} value={row.hasStats ? row[c.key] : null} color={colorFor(c.key)} />
          ))}
        </ScrollView>

        <Pressable onPress={toggle} hitSlop={6} style={({ pressed }) => [styles.chev, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {open ? (
        <View style={[styles.goalList, { borderTopColor: theme.colors.hairline }]}>
          <View style={styles.bio}>
            <Text numberOfLines={2} style={[styles.bioName, { color: theme.colors.text, fontFamily: fonts.bodyBold }]}>
              {row.player}
            </Text>
            <Text numberOfLines={1} style={[styles.bioMeta, { color: theme.colors.textSecondary, fontFamily: fonts.mono }]}>
              {row.jersey != null ? `#${row.jersey} · ` : ''}
              {row.team.name}
            </Text>
          </View>
          {row.events.map((e, i) => (
            <Pressable
              key={`${e.matchId}-${i}`}
              onPress={() => router.push(`/match/${encodeURIComponent(e.matchId)}`)}
              style={({ pressed }) => [styles.goalRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.goalIdx, tabularNums, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{i + 1}</Text>
              <Flag team={e.opponent} size={16} />
              <Text numberOfLines={1} style={[styles.goalOpp, { color: theme.colors.text, fontFamily: fonts.bodyMedium }]}>
                v {e.opponent.name}
              </Text>
              <Text style={[styles.goalDate, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{shortDate(e.kickoff, e.date)}</Text>
              <Text style={[styles.goalMin, tabularNums, { color: theme.colors.accent, fontFamily: fonts.monoBold }]}>
                {e.minute}&apos;{e.penalty ? ' P' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatCell({ value, color }: { value: number | null; color: string }) {
  const theme = useTheme();
  const shown = value == null ? theme.colors.textMuted : value === 0 ? theme.colors.textMuted : color;
  return (
    <Text style={[styles.statCell, tabularNums, { color: shown, fontFamily: fonts.monoBold }]}>
      {value == null ? '–' : value}
    </Text>
  );
}

function shortDate(kickoff: string | null, date: string): string {
  const d = kickoff ? new Date(kickoff) : new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 2 },
  note: { fontSize: 11, lineHeight: 16, marginBottom: 14, marginHorizontal: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 6 },
  headLeft: { width: LEFT_W, alignItems: 'flex-end', paddingRight: 2 },
  headLabel: { fontSize: 9, fontFamily: fonts.mono, letterSpacing: 0.6 },
  card: { borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  mainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 14, paddingRight: 8 },
  left: { width: LEFT_W, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 20, fontSize: 15, textAlign: 'center' },
  who: { flex: 1 },
  player: { fontSize: 14 },
  team: { fontSize: 10, marginTop: 2 },
  boot: { marginRight: -2 },
  goals: { fontSize: 22, minWidth: 22, textAlign: 'right' },
  stripScroll: { flex: 1 },
  strip: { alignItems: 'center' },
  statCell: { width: CELL_W, fontSize: 14, textAlign: 'center' },
  chev: { width: CHEV_W, alignItems: 'center', justifyContent: 'center' },
  goalList: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 4 },
  bio: { paddingTop: 10, paddingBottom: 6 },
  bioName: { fontSize: 15 },
  bioMeta: { fontSize: 11, marginTop: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  goalIdx: { width: 14, fontSize: 11, textAlign: 'center' },
  goalOpp: { flex: 1, fontSize: 13 },
  goalDate: { fontSize: 11 },
  goalMin: { fontSize: 13, minWidth: 34, textAlign: 'right' },
});
