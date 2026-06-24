import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { liveMatches } from '../../src/data/service';
import { useWorldCup } from '../../src/hooks/useWorldCup';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useWorldCup();
  const liveCount = data ? liveMatches(data).length : 0;

  // Lift the labels off the bottom edge so they aren't clipped. On native we add
  // the home-indicator inset; on web the browser owns that area, so keep it small.
  const bottomPad = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 10);

  return (
    <Tabs
      initialRouteName="matches"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-outline" size={size} color={color} />,
          tabBarBadge: liveCount > 0 ? liveCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.live, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="knockout"
        options={{
          title: 'Knockout',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-network-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="table"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
