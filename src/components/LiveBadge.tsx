import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tabularNums } from '../theme/theme';

/** Pulsing dot + minute/status — the universal "this is live" signal. */
export function LiveBadge({ label }: { label: string }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.dark ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.10)' }]}>
      <Animated.View style={[styles.dot, { backgroundColor: theme.colors.live, opacity: pulse }]} />
      <Text style={[styles.text, tabularNums, { color: theme.colors.live }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});
