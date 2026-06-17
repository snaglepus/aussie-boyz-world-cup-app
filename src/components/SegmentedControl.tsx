import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** iOS-style segmented control for switching Upcoming / Played etc. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && { backgroundColor: theme.colors.surface, shadowOpacity: theme.dark ? 0 : 0.08 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '700' : '600' },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  label: { fontSize: 14 },
});
