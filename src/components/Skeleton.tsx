import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Shimmering placeholder block — perceived-performance win over spinners. */
export function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return <Animated.View style={[{ backgroundColor: theme.colors.skeleton, opacity: shimmer, borderRadius: 8 }, style]} />;
}

/** A skeleton shaped like a fixture row, for the loading state of lists. */
export function MatchRowSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}>
      <View style={{ flex: 1, gap: 10 }}>
        <SkeletonBlock style={{ width: '60%', height: 14 }} />
        <SkeletonBlock style={{ width: '45%', height: 14 }} />
      </View>
      <SkeletonBlock style={{ width: 28, height: 28, borderRadius: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
});
