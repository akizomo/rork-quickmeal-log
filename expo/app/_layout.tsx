import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DishQuickEntrySheet } from '@/components/DishQuickEntrySheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/design-system';
import { AppStateProvider } from '@/providers/app-state-provider';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="status" options={{ title: 'My Status' }} />
      <Stack.Screen name="stats" options={{ title: '実績' }} />
      <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
      <Stack.Screen name="goal-edit" options={{ title: '目標を変更' }} />
      <Stack.Screen name="about" options={{ title: 'アプリについて' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'About' }} />
      {__DEV__ ? <Stack.Screen name="dev" options={{ headerShown: false }} /> : null}
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch((error) => {
      console.log('[root-layout] Failed to hide splash screen', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ThemeProvider>
            <AppStateProvider>
              <RootLayoutNav />
              <DishQuickEntrySheet />
            </AppStateProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
