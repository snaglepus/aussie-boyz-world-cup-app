import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../src/components/EmptyState';
import { MatchRow } from '../src/components/MatchRow';
import { Match } from '../src/data/types';
import { resolveVenue, VenueLocation, VENUES } from '../src/data/venues';
import { useWorldCup } from '../src/hooks/useWorldCup';
import { useTheme } from '../src/theme/ThemeProvider';
import { fonts } from '../src/theme/theme';

type StadiumEntry = { venue: VenueLocation; matches: Match[] };

const byTime = (a: Match, b: Match) => (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date);

export default function StadiumScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useWorldCup();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState('');

  // Every host stadium that has at least one fixture in the data, by city.
  const stadiums = useMemo<StadiumEntry[]>(() => {
    const map = new Map<string, StadiumEntry>();
    for (const m of data?.matches ?? []) {
      const v = resolveVenue(m.ground);
      if (!v) continue;
      if (!map.has(v.stadium)) map.set(v.stadium, { venue: v, matches: [] });
      map.get(v.stadium)!.matches.push(m);
    }
    return [...map.values()].sort((a, b) => a.venue.city.localeCompare(b.venue.city));
  }, [data]);

  // Default to the stadium hosting the soonest still-to-play match.
  const defaultStadium = useMemo(() => {
    const upcoming = (data?.matches ?? []).filter((m: Match) => m.status !== 'finished').sort(byTime);
    for (const m of upcoming) {
      const v = resolveVenue(m.ground);
      if (v) return v.stadium;
    }
    return stadiums[0]?.venue.stadium ?? '';
  }, [data, stadiums]);

  const current = selected || defaultStadium;
  const entry = stadiums.find((s) => s.venue.stadium === current) ?? null;

  const sections = useMemo(() => {
    const ms = entry?.matches ?? [];
    const played = ms.filter((m) => m.status === 'finished').sort(byTime);
    const upcoming = ms.filter((m) => m.status !== 'finished').sort(byTime);
    const out: { title: string; sub: string; data: Match[] }[] = [];
    // Chronological top-to-bottom: what's already happened, then what's to come.
    if (played.length) out.push({ title: 'Played', sub: `${played.length} result${played.length > 1 ? 's' : ''}`, data: played });
    if (upcoming.length) out.push({ title: 'Upcoming', sub: `${upcoming.length} to play`, data: upcoming });
    return out;
  }, [entry]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.colors.text, fontFamily: fonts.heading }]}>Stadiums</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.selectorWrap}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          disabled={stadiums.length === 0}
          style={[styles.selector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons name="location" size={18} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectorName, { color: theme.colors.text, fontFamily: fonts.bodyBold }]} numberOfLines={1}>
              {entry ? entry.venue.stadium : 'Select a stadium'}
            </Text>
            {entry ? (
              <Text style={[styles.selectorCity, { color: theme.colors.textSecondary, fontFamily: fonts.mono }]} numberOfLines={1}>
                {entry.venue.city}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {isLoading && !data ? (
        <View style={styles.center}>
          <EmptyState icon="business-outline" title="Loading venues…" />
        </View>
      ) : stadiums.length === 0 ? (
        <EmptyState icon="business-outline" title="No venues to show" message="Stadium fixtures will appear here once the schedule loads." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.body}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.bg }]}>
              <View style={[styles.sectionBar, { backgroundColor: section.title === 'Played' ? theme.colors.textMuted : theme.colors.accent }]} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: fonts.heading }]}>{section.title}</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{section.sub}</Text>
            </View>
          )}
          renderItem={({ item }) => <MatchRow match={item} showDate />}
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title="No matches at this stadium" message="Pick another venue from the dropdown." />
          }
        />
      )}

      <StadiumPicker
        open={pickerOpen}
        stadiums={stadiums}
        selected={current}
        onPick={(s) => {
          setSelected(s);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function StadiumPicker({
  open,
  stadiums,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  stadiums: StadiumEntry[];
  selected: string;
  onPick: (s: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: theme.colors.text, fontFamily: fonts.heading }]}>Select a stadium</Text>
          <ScrollView style={{ maxHeight: 460 }}>
            {stadiums.map((s) => {
              const active = s.venue.stadium === selected;
              return (
                <Pressable
                  key={s.venue.stadium}
                  onPress={() => onPick(s.venue.stadium)}
                  style={[styles.pickRow, active && { backgroundColor: theme.colors.accentSoft }]}
                >
                  <Ionicons name="location" size={16} color={active ? theme.colors.accent : theme.colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickName, { color: theme.colors.text, fontFamily: active ? fonts.bodyBold : fonts.bodyMedium }]} numberOfLines={1}>
                      {s.venue.stadium}
                    </Text>
                    <Text style={[styles.pickCity, { color: theme.colors.textSecondary, fontFamily: fonts.mono }]} numberOfLines={1}>
                      {s.venue.city} · {s.matches.length} match{s.matches.length > 1 ? 'es' : ''}
                    </Text>
                  </View>
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

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 18 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  selectorWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  selectorName: { fontSize: 16 },
  selectorCity: { fontSize: 11, marginTop: 2 },
  body: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 14, paddingBottom: 8 },
  sectionBar: { width: 5, height: 20, borderRadius: 3 },
  sectionTitle: { fontSize: 18, flex: 1 },
  sectionSub: { fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28 },
  modalTitle: { fontSize: 17, marginBottom: 10, marginLeft: 2 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 10 },
  pickName: { fontSize: 15 },
  pickCity: { fontSize: 11, marginTop: 1 },
});
