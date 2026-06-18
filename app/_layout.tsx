import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { darkTheme, lightTheme } from '../src/theme/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const client = useRef(
    new QueryClient({
      defaultOptions: { queries: { retry: 2, gcTime: 30 * 60_000 } },
    })
  ).current;

  return (
    <QueryClientProvider client={client}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.colors.bg },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontWeight: '800' },
              contentStyle: { backgroundColor: theme.colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="match/[id]"
              options={{ title: 'Match', presentation: 'card', headerBackTitle: 'Back' }}
            />
            <Stack.Screen name="map" options={{ headerShown: false, presentation: 'card' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
