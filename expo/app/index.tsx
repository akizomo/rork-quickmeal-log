import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HomeScreen } from '@/components/nutrition-ui';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import { decideInitialRoute } from '@/utils/initial-route';

export default function HomeRoute() {
  const router = useRouter();
  const { settings, isHydrating } = useAppState();
  const redirectedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isHydrating || redirectedRef.current) return;
    const route = decideInitialRoute(settings);
    console.log('[index] decideInitialRoute →', route);
    if (route === 'home') return;
    redirectedRef.current = true;
    router.replace(`/${route}`);
  }, [
    isHydrating,
    router,
    settings,
  ]);

  if (isHydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.sageDeep} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeScreen />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
});
