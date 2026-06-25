import {
  Anybody_700Bold,
  Anybody_800ExtraBold,
  Anybody_900Black,
  Anybody_900Black_Italic,
} from '@expo-google-fonts/anybody';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { fonts, pitchTheme } from '../src/theme/theme';

// Default every Text to the body face; headings/numbers opt into Anybody/Mono.
const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = { fontFamily: fonts.body };

export default function RootLayout() {
  const theme = pitchTheme;
  useFonts({
    Anybody_700Bold,
    Anybody_800ExtraBold,
    Anybody_900Black,
    Anybody_900Black_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const client = useRef(
    new QueryClient({
      defaultOptions: { queries: { retry: 2, gcTime: 30 * 60_000 } },
    })
  ).current;

  return (
    <QueryClientProvider client={client}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.colors.bg },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontFamily: fonts.heading },
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
