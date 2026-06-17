import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { flagUrl } from '../data/countries';
import { TeamRef } from '../data/types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Crisp rectangular flag with a hairline ring (so light flags don't vanish on
 * light backgrounds). Falls back to a neutral code chip for placeholder slots
 * or if the image fails to load — flags are cosmetic and must never break a row.
 */
export function Flag({ team, size = 26 }: { team: TeamRef; size?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const url = flagUrl(team, size <= 28 ? 40 : 80);
  const height = Math.round(size * 0.72);

  if (!url || failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height,
            borderRadius: 4,
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {team.isPlaceholder ? '?' : team.code.slice(0, 3)}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height,
        borderRadius: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
      }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallbackText: { fontSize: 9, fontWeight: '700' },
});
