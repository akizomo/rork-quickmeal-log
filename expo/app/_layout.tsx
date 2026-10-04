import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Lato_300Light } from '@expo-google-fonts/lato';
import * as ExpoInAppUpdates from 'expo-in-app-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DishQuickEntrySheet } from '@/components/DishQuickEntrySheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IdentityLogSheet } from '@/components/IdentityLogSheet';
import { ThemeProvider, darkTheme, lightTheme, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { AppStateProvider, useAppState } from '@/providers/app-state-provider';
import { HealthSyncProvider } from '@/providers/health-sync-provider';
import { initIap } from '@/utils/iap';
import { initSentry } from '@/utils/sentry';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * settings.themePreference ('system'/'light'/'dark') を design-system の
 * ThemeProvider に橋渡しする。'system' (未設定含む) は theme prop を渡さず
 * ThemeProvider 自身の useColorScheme 検知に任せる。
 */
function ThemedApp({ children }: { children: React.ReactNode }) {
  const { settings } = useAppState();
  const pref = settings.themePreference ?? 'system';
  const forcedTheme = pref === 'light' ? lightTheme : pref === 'dark' ? darkTheme : undefined;
  return <ThemeProvider theme={forcedTheme}>{children}</ThemeProvider>;
}

function RootLayoutNav() {
  const t = useTheme();
  const tr = useT();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: tr('nav.back'),
        headerStyle: { backgroundColor: t.colors.surface.default },
        headerTintColor: t.colors.content.primary,
        contentStyle: { backgroundColor: t.colors.surface.default },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="weekly-recap" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="status" options={{ title: tr('nav.status') }} />
      <Stack.Screen name="stats" options={{ title: tr('nav.stats') }} />
      <Stack.Screen name="profile" options={{ title: tr('nav.profile') }} />
      <Stack.Screen name="goal-edit" options={{ title: tr('nav.goalEdit') }} />
      <Stack.Screen name="subscription" options={{ title: tr('nav.subscription') }} />
      <Stack.Screen name="about" options={{ title: tr('nav.about') }} />
      <Stack.Screen name="help" options={{ title: tr('nav.help') }} />
      <Stack.Screen name="legal/privacy" options={{ title: tr('nav.privacy') }} />
      <Stack.Screen name="legal/terms" options={{ title: tr('nav.terms') }} />
      <Stack.Screen name="settings" options={{ title: tr('nav.settings') }} />
      <Stack.Screen name="search-misses" options={{ title: tr('nav.searchMisses') }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: tr('nav.modal') }} />
      {__DEV__ ? <Stack.Screen name="dev" options={{ headerShown: false }} /> : null}
    </Stack>
  );
}

export default function RootLayout() {
  // ロゴタイプ「Hachibu」専用 (app/intro.tsx の brandText)。アプリ全体のUIフォントは
  // 引き続きシステムフォント任せ (design-system の fontFamily トークンは未バンドル)。
  const [fontsLoaded, fontError] = useFonts({ Lato_300Light });

  useEffect(() => {
    initSentry(); // Crash reporting (no-op if DSN not configured)
    initIap().catch((error) => {
      console.log('[root-layout] Failed to init IAP', error);
    });
    if (!__DEV__ && Platform.OS === 'android') {
      ExpoInAppUpdates.checkForUpdate()
        .then(({ updateAvailable, flexibleAllowed }) => {
          if (updateAvailable && flexibleAllowed) {
            return ExpoInAppUpdates.startUpdate();
          }
        })
        .catch((error) => {
          console.log('[root-layout] In-app update check failed', error);
        });
    }
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync().catch((error) => {
      console.log('[root-layout] Failed to hide splash screen', error);
    });
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <AppStateProvider>
            <ThemedApp>
              <StatusBar style="auto" />
              <HealthSyncProvider>
                <RootLayoutNav />
                <DishQuickEntrySheet />
                <IdentityLogSheet />
              </HealthSyncProvider>
            </ThemedApp>
          </AppStateProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
