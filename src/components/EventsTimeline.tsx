import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SubEvent } from '../data/espnStats';
import { GoalEvent, Match } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, tabularNums } from '../theme/theme';

type TimelineItem = {
  minute: string;
  minuteValue: number;
  team: 'home' | 'away';
  kind: 'goal' | 'yellow' | 'red' | 'sub';
  text: string;
  subOff?: string; // player replaced (for kind 'sub')
};

/** Chronological match events (goals + cards, plus subs when provided), home left / away right. */
export function EventsTimeline({ match, subs }: { match: Match; subs?: SubEvent[] }) {
  const theme = useTheme();

  // Shootout kicks come through as penalty "goals" at 120'; they belong to the
  // dedicated Penalty shootout card, so keep them out of the chronological timeline.
  const inOpenPlay = (g: GoalEvent) =>
    !(match.penalties && g.penalty && minuteValue(g.minute) >= 120);

  const items: TimelineItem[] = [
    ...match.goals.filter(inOpenPlay).map<TimelineItem>((g) => ({
      minute: g.minute,
      minuteValue: minuteValue(g.minute),
      team: g.team,
      kind: 'goal',
      text: `${g.name}${g.ownGoal ? ' (OG)' : g.penalty ? ' (pen)' : ''}`,
    })),
    ...match.cards.map<TimelineItem>((c) => ({
      minute: c.minute,
      minuteValue: minuteValue(c.minute),
      team: c.team,
      kind: c.color,
      text: c.name,
    })),
    ...(subs ?? []).map<TimelineItem>((s) => ({
      minute: s.minute,
      minuteValue: minuteValue(s.minute),
      team: s.team,
      kind: 'sub',
      text: s.on,
      subOff: s.off,
    })),
  ].sort((a, b) => a.minuteValue - b.minuteValue);

  if (!items.length) {
    return <Text style={[styles.none, { color: theme.colors.textMuted }]}>No events recorded yet.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.sideLeft}>
            {it.team === 'home' ? <Event item={it} align="right" /> : null}
          </View>
          <View style={[styles.minuteWrap, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Text style={[styles.minute, tabularNums, { color: theme.colors.textSecondary }]}>{it.minute}'</Text>
          </View>
          <View style={styles.sideRight}>
            {it.team === 'away' ? <Event item={it} align="left" /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Event({ item, align }: { item: TimelineItem; align: 'left' | 'right' }) {
  const theme = useTheme();
  const icon =
    item.kind === 'goal' ? (
      <Ionicons name="football" size={15} color={theme.colors.text} />
    ) : item.kind === 'sub' ? (
      <Ionicons name="swap-horizontal" size={15} color={theme.colors.win} />
    ) : (
      <View
        style={[
          styles.card,
          { backgroundColor: item.kind === 'red' ? theme.colors.live : theme.colors.gold },
        ]}
      />
    );
  return (
    <View style={[styles.event, align === 'right' && styles.eventRight]}>
      {align === 'left' ? icon : null}
      <View style={align === 'right' ? styles.subTextRight : undefined}>
        <Text numberOfLines={1} style={[styles.eventText, { color: theme.colors.text, textAlign: align }]}>
          {item.text}
        </Text>
        {item.kind === 'sub' && item.subOff ? (
          <Text numberOfLines={1} style={[styles.subOff, { color: theme.colors.textMuted, textAlign: align }]}>
            ↓ {item.subOff}
          </Text>
        ) : null}
      </View>
      {align === 'right' ? icon : null}
    </View>
  );
}

function minuteValue(minute: string): number {
  const m = minute.match(/(\d+)(?:\+(\d+))?/);
  if (!m) return 999;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 100 : 0);
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  none: { fontSize: 14, fontFamily: fonts.body, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  sideLeft: { flex: 1, alignItems: 'flex-end' },
  sideRight: { flex: 1, alignItems: 'flex-start' },
  minuteWrap: {
    minWidth: 36,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  minute: { fontSize: 11, fontFamily: fonts.monoBold },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  eventRight: { justifyContent: 'flex-end' },
  eventText: { fontSize: 14, fontFamily: fonts.bodyMedium, flexShrink: 1 },
  subTextRight: { alignItems: 'flex-start' },
  subOff: { fontSize: 11, fontFamily: fonts.mono, marginTop: 1 },
  card: { width: 11, height: 15, borderRadius: 2 },
});
