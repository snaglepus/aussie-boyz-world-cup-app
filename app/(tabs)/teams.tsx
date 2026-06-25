import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Flag } from '../../src/components/Flag';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StandingsTable } from '../../src/components/StandingsTable';
import { toTeamRef } from '../../src/data/countries';
import { FIFA_POINTS, FIFA_RANK } from '../../src/data/fifaRankings';
import { groupPlayers, TeamInfo } from '../../src/data/teamInfo';
import { TitleOdd } from '../../src/data/odds';
import { GroupTable, Match, TeamRef } from '../../src/data/types';
import { resolveVenue } from '../../src/data/venues';
import { useTeamsData } from '../../src/hooks/useTeamsData';
import { useTitleOdds } from '../../src/hooks/useTitleOdds';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';
import { fonts, tabularNums, Theme } from '../../src/theme/theme';
import { buildPlayoffPicture } from '../../src/utils/playoffRanking';
import { assessThirdPlaced, teamKey } from '../../src/utils/standings';
import { formatMatchDay } from '../../src/utils/time';

const DEFAULT_TEAM = 'Australia';

const BAND_LABEL: Record<string, string> = {
  winners: 'Group winner',
  runners: 'Runner-up',
  thirds: 'Best third place',
  out: 'Elimination zone',
};
const BAND_COLOR = (k: string, t: Theme) =>
  k === 'winners' ? t.colors.gold : k === 'runners' ? t.colors.accent : k === 'thirds' ? '#3B82F6' : t.colors.loss;

export default function TeamsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isFetching, refetch } = useWorldCup();
  const { data: teamIndex } = useTeamsData();
  const { data: odds } = useTitleOdds();

  const groups: GroupTable[] = data?.groups ?? [];
  const [selected, setSelected] = useState(DEFAULT_TEAM);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Build the selectable team list (prefer the squad feed; fall back to standings).
  const teamNames = useMemo(() => {
    const list = teamIndex?.list;
    if (list && list.length) return list.map((t: TeamInfo) => t.name);
    const names = new Set<string>();
    groups.forEach((g) => g.rows.forEach((r) => names.add(r.team.name)));
    return [...names].sort();
  }, [teamIndex, groups]);

  // Deep link: other screens push /teams?team=<name>. Resolve the incoming name
  // (or alias) to the canonical squad name by code, then select it. Guarded so a
  // manual pick isn't clobbered when the squad list loads after navigation.
  const params = useLocalSearchParams<{ team?: string }>();
  const appliedTeam = useRef<string | null>(null);
  useEffect(() => {
    const raw = (Array.isArray(params.team) ? params.team[0] : params.team) ?? null;
    if (!raw || raw === appliedTeam.current) return;
    const code = toTeamRef(raw).code;
    const canonical = teamNames.find((n: string) => toTeamRef(n).code === code);
    if (canonical) {
      appliedTeam.current = raw;
      setSelected(canonical);
    } else {
      // Squad list not ready (or unknown team): show it now, resolve once loaded.
      setSelected(raw);
    }
  }, [params.team, teamNames]);

  const ref = useMemo(() => toTeamRef(selected), [selected]);
  const info = teamIndex?.byName.get(selected.toLowerCase()) ?? null;

  const group = useMemo(
    () => groups.find((g) => g.rows.some((r) => r.team.code === ref.code)),
    [groups, ref]
  );
  const thirds = useMemo(() => assessThirdPlaced(groups), [groups]);
  const placement = useMemo(() => {
    const bands = buildPlayoffPicture(groups);
    for (const b of bands) {
      const row = b.rows.find((r) => teamKey(r.team) === teamKey(ref));
      if (row) return { band: b.key, label: b.label, rank: row.rank, clinch: row.clinch };
    }
    return null;
  }, [groups, ref]);

  const odd = odds?.find((o: TitleOdd) => o.team.code === ref.code) ?? null;
  const matches = useMemo(() => {
    const all: Match[] = data?.matches ?? [];
    return all
      .filter((m) => m.home.code === ref.code || m.away.code === ref.code)
      .sort((a, b) => (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date));
  }, [data, ref]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Teams" subtitle="Team profiles · World Cup 2026" />

      <View style={styles.selectorWrap}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.selector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Flag team={ref} size={24} />
          <Text style={[styles.selectorText, { color: theme.colors.text }]} numberOfLines={1}>
            {selected}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.accent} />}
      >
        <HeaderCard ref_={ref} info={info} odd={odd} />
        {placement ? <PlacementCard placement={placement} /> : null}
        {group ? (
          <StandingsTable table={group} bestThirds={thirds.qualifiers} confidence={thirds.confidence} />
        ) : null}
        <MatchHistory matches={matches} ref_={ref} />
        <SquadCard info={info} loading={!teamIndex} />
      </ScrollView>

      <TeamPicker
        open={pickerOpen}
        teams={teamNames}
        selected={selected}
        onPick={(t) => {
          setSelected(t);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function HeaderCard({ ref_, info, odd }: { ref_: TeamRef; info: TeamInfo | null; odd: { decimal: number; impliedPct: number } | null }) {
  const theme = useTheme();
  const rank = FIFA_RANK[ref_.code];
  const points = FIFA_POINTS[ref_.code];
  return (
    <Card>
      <View style={styles.header}>
        <Flag team={ref_} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.teamName, { color: theme.colors.text }]} numberOfLines={1}>
            {ref_.name}
          </Text>
          <Text style={[styles.teamSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {[info?.confederation, info?.group ? `Group ${info.group}` : null].filter(Boolean).join(' · ') || 'World Cup 2026'}
          </Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <Stat label="FIFA rank" value={rank ? `#${rank}` : '—'} sub={points ? `${points} pts` : undefined} />
        <Stat
          label="Title odds"
          value={odd ? `$${odd.decimal.toFixed(2)}` : '—'}
          sub={odd ? `${odd.impliedPct.toFixed(1)}% chance` : 'n/a'}
        />
        <Stat label="Squad" value={info ? String(info.players.length) : '—'} sub="players" />
      </View>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, tabularNums, { color: theme.colors.text }]}>{value}</Text>
      {sub ? <Text style={[styles.statSub, { color: theme.colors.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

function PlacementCard({ placement }: { placement: { band: string; label: string; rank: number; clinch: string } }) {
  const theme = useTheme();
  const color = BAND_COLOR(placement.band, theme);
  const clinchText =
    placement.clinch === 'won-group'
      ? 'Group won'
      : placement.clinch === 'qualified'
        ? 'Qualified'
        : placement.clinch === 'eliminated'
          ? 'Eliminated'
          : 'In contention';
  return (
    <Card title="Playoff position">
      <View style={styles.placeRow}>
        <View style={[styles.placeBar, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.placeLabel, { color: theme.colors.text }]}>{BAND_LABEL[placement.band] ?? placement.label}</Text>
          <Text style={[styles.placeSub, { color: theme.colors.textSecondary }]}>
            #{placement.rank} overall · {clinchText}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function MatchHistory({ matches, ref_ }: { matches: Match[]; ref_: TeamRef }) {
  const theme = useTheme();
  const router = useRouter();
  if (matches.length === 0) return null;
  return (
    <Card title="Matches">
      {matches.map((m, i) => {
        const isHome = m.home.code === ref_.code;
        const opp = isHome ? m.away : m.home;
        const myScore = isHome ? m.homeScore : m.awayScore;
        const oppScore = isHome ? m.awayScore : m.homeScore;
        const finished = m.status === 'finished' && myScore != null && oppScore != null;
        const live = m.status === 'live';
        const res = finished ? (myScore! > oppScore! ? 'W' : myScore! < oppScore! ? 'L' : 'D') : null;
        const venue = resolveVenue(m.ground);
        const scorers = m.goals.filter((g) => (g.team === 'home') === isHome);
        return (
          <Pressable
            key={m.id}
            onPress={() => router.push(`/match/${encodeURIComponent(m.id)}`)}
            style={({ pressed }) => [
              styles.matchRow,
              { borderTopColor: theme.colors.hairline, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.matchTop}>
              <ResultPill res={res} live={live} />
              <Flag team={opp} size={18} />
              <Text style={[styles.oppName, { color: theme.colors.text }]} numberOfLines={1}>
                {opp.name}
              </Text>
              <Text style={[styles.matchScore, tabularNums, { color: theme.colors.text }]}>
                {finished || live ? `${myScore ?? 0}–${oppScore ?? 0}` : timeOf(m)}
              </Text>
            </View>
            <Text style={[styles.matchMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {formatMatchDay(m.kickoff ? new Date(m.kickoff) : null, m.date)}
              {venue ? ` · ${venue.city}` : m.ground ? ` · ${m.ground}` : ''}
            </Text>
            {scorers.length ? (
              <Text style={[styles.scorers, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                ⚽ {scorers.map((g) => `${g.name}${g.minute ? ` ${g.minute}'` : ''}${g.penalty ? ' (pen)' : g.ownGoal ? ' (OG)' : ''}`).join(', ')}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

function ResultPill({ res, live }: { res: 'W' | 'L' | 'D' | null; live: boolean }) {
  const theme = useTheme();
  if (live) return <Badge bg={theme.colors.live} fg="#fff" text="LIVE" />;
  if (!res) return <Badge bg={theme.colors.surfaceAlt} fg={theme.colors.textMuted} text="–" border />;
  const map = { W: theme.colors.win, D: theme.colors.draw, L: theme.colors.loss };
  return <Badge bg={map[res]} fg="#fff" text={res} />;
}

function Badge({ bg, fg, text, border }: { bg: string; fg: string; text: string; border?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border ? theme.colors.border : 'transparent', borderWidth: border ? StyleSheet.hairlineWidth : 0 },
      ]}
    >
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function SquadCard({ info, loading }: { info: TeamInfo | null; loading: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (loading) return <Card title="Squad"><Text style={[styles.muted, { color: theme.colors.textMuted }]}>Loading squad…</Text></Card>;
  if (!info || info.players.length === 0)
    return <Card title="Squad"><Text style={[styles.muted, { color: theme.colors.textMuted }]}>Squad not available.</Text></Card>;

  const byPos = groupPlayers(info.players);
  const counts = byPos.map((g) => `${g.players.length} ${g.key}`).join(' · ');

  return (
    <Card title="Squad">
      <Text style={[styles.squadCounts, { color: theme.colors.textSecondary }]}>
        {info.players.length} players · {counts}
      </Text>
      {open ? (
        <View style={{ marginTop: 6 }}>
          {byPos.map((g) => (
            <View key={g.key} style={{ marginTop: 10 }}>
              <Text style={[styles.posHeader, { color: theme.colors.textMuted }]}>{g.label}</Text>
              {g.players.map((p, i) => (
                <View key={p.name + i} style={styles.playerRow}>
                  <Text style={[styles.playerNum, tabularNums, { color: theme.colors.textMuted }]}>{p.number ?? '–'}</Text>
                  <Text style={[styles.playerName, { color: theme.colors.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.playerClub, { color: theme.colors.textMuted }]} numberOfLines={1}>{p.club}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.expandBtn}>
        <Text style={[styles.expandText, { color: theme.colors.accent }]}>{open ? 'Hide squad' : 'Show full squad'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={theme.colors.accent} />
      </Pressable>
    </Card>
  );
}

function TeamPicker({
  open,
  teams,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  teams: string[];
  selected: string;
  onPick: (t: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select a team</Text>
          <ScrollView style={{ maxHeight: 460 }}>
            {teams.map((t) => {
              const active = t === selected;
              return (
                <Pressable
                  key={t}
                  onPress={() => onPick(t)}
                  style={[styles.pickRow, active && { backgroundColor: theme.colors.accentSoft }]}
                >
                  <Flag team={toTeamRef(t)} size={20} />
                  <Text style={[styles.pickText, { color: theme.colors.text, fontWeight: active ? '800' : '600' }]}>{t}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.colors.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function timeOf(m: Match): string {
  if (!m.kickoff) return m.time || 'TBD';
  return new Date(m.kickoff).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  selectorWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  selectorText: { flex: 1, fontSize: 16, fontFamily: fonts.bodyBold },
  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 2, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  teamName: { fontSize: 24, fontFamily: fonts.display, letterSpacing: -0.4 },
  teamSub: { fontSize: 13, fontFamily: fonts.bodyMedium, marginTop: 2 },
  statRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontFamily: fonts.mono, letterSpacing: 0.4 },
  statValue: { fontSize: 19, fontFamily: fonts.monoBold, marginTop: 4 },
  statSub: { fontSize: 11, fontFamily: fonts.mono, marginTop: 2 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeBar: { width: 5, height: 38, borderRadius: 3 },
  placeLabel: { fontSize: 17, fontFamily: fonts.heading },
  placeSub: { fontSize: 12, fontFamily: fonts.mono, marginTop: 2 },
  matchRow: { paddingVertical: 11, gap: 4 },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  oppName: { flex: 1, fontSize: 14, fontFamily: fonts.bodyBold },
  matchScore: { fontSize: 15, fontFamily: fonts.monoBold },
  matchMeta: { fontSize: 11, fontFamily: fonts.mono },
  scorers: { fontSize: 12, fontFamily: fonts.body },
  badge: { minWidth: 26, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignItems: 'center' },
  badgeText: { fontSize: 11, fontFamily: fonts.monoBold },
  muted: { fontSize: 13, fontFamily: fonts.body },
  squadCounts: { fontSize: 13, fontFamily: fonts.mono },
  posHeader: { fontSize: 10, fontFamily: fonts.mono, letterSpacing: 0.6, marginBottom: 5 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  playerNum: { width: 22, fontSize: 13, fontFamily: fonts.monoBold, textAlign: 'center' },
  playerName: { flex: 1, fontSize: 14, fontFamily: fonts.bodyMedium },
  playerClub: { fontSize: 12, fontFamily: fonts.mono, maxWidth: 130, textAlign: 'right' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 12 },
  expandText: { fontSize: 14, fontFamily: fonts.bodyBold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28 },
  modalTitle: { fontSize: 17, fontFamily: fonts.heading, marginBottom: 10, marginLeft: 2 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 10 },
  pickText: { flex: 1, fontSize: 15, fontFamily: fonts.bodyMedium },
});
