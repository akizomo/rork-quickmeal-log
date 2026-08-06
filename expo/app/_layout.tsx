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
import { ThemeProvider, useTheme } from '@/design-system';
import { AppStateProvider } from '@/providers/app-state-provider';
import { HealthSyncProvider } from '@/providers/health-sync-provider';
import { initIap } from '@/utils/iap';
import { initSentry } from '@/utils/sentry';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: '戻る',
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
      <Stack.Screen name="status" options={{ title: 'ステータス' }} />
      <Stack.Screen name="stats" options={{ title: '実績' }} />
      <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
      <Stack.Screen name="goal-edit" options={{ title: '目標を変更' }} />
      <Stack.Screen name="subscription" options={{ title: 'サブスクリプション' }} />
      <Stack.Screen name="about" options={{ title: 'アプリについて' }} />
      <Stack.Screen name="help" options={{ title: 'Hachibu の使い方' }} />
      <Stack.Screen name="legal/privacy" options={{ title: 'プライバシーポリシー' }} />
      <Stack.Screen name="legal/terms" options={{ title: '利用規約' }} />
      <Stack.Screen name="settings" options={{ title: '設定' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'アプリについて' }} />
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
          <ThemeProvider>
            <StatusBar style="auto" />
            <AppStateProvider>
              <HealthSyncProvider>
                <RootLayoutNav />
                <DishQuickEntrySheet />
                <IdentityLogSheet />
              </HealthSyncProvider>
            </AppStateProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
