import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Shared frame for the match map: the close button, title, and the back/forward
 * date navigator. The platform-specific map (Leaflet on web, react-native-maps
 * on native) is rendered as `children` in the area below.
 */
export function MatchMapChrome({
  dayLabel,
  daySub,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  children,
}: {
  dayLabel: string;
  daySub: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close map"
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.colors.text }]}>Match Map</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.dateBar}>
        <NavButton dir="back" disabled={!hasPrev} onPress={onPrev} />
        <View style={styles.dateCenter}>
          <Text style={[styles.dateLabel, { color: theme.colors.text }]} numberOfLines={1}>
            {dayLabel}
          </Text>
          <Text style={[styles.dateSub, { color: theme.colors.textSecondary }]}>{daySub}</Text>
        </View>
        <NavButton dir="forward" disabled={!hasNext} onPress={onNext} />
      </View>

      <View style={styles.mapWrap}>{children}</View>
    </View>
  );
}

function NavButton({ dir, disabled, onPress }: { dir: 'back' | 'forward'; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Previous day' : 'Next day'}
      style={({ pressed }) => [
        styles.navBtn,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={dir === 'back' ? 'chevron-back' : 'chevron-forward'} size={22} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  navBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  dateSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  mapWrap: { flex: 1, overflow: 'hidden' },
});
