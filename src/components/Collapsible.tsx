import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/theme';

/**
 * A titled section that expands/collapses on tap. The header stops event
 * propagation so it works even inside a tappable card (e.g. the Live match card,
 * whose surface navigates to the detail screen).
 */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View>
      <Pressable
        hitSlop={6}
        onPress={(e) => {
          (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
          setOpen((o) => !o);
        }}
        style={styles.head}
      >
        <Text style={[styles.title, { color: theme.colors.textMuted, fontFamily: fonts.mono }]}>{title.toUpperCase()}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={theme.colors.textMuted} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 11, letterSpacing: 1 },
  body: { marginTop: 12 },
});
