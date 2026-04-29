import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HomeScreen } from '@/components/nutrition-ui';
import { INTRO_VERSION } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';

export default function HomeRoute() {
  const router = useRouter();
  const { settings, isHydrating } = useAppState();
  const redirectedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isHydrating) return;
    if (redirectedRef.current) return;

    const introSeen = (settings.introSeenVersion ?? 0) >= INTRO_VERSION;
    const trialOrSubscribed =
      settings.subscriptionStatus === 'trialing' || settings.subscriptionStatus === 'active';
    const onboardingDone = settings.onboardingCompleted === true;
    const paywallSeen = settings.paywallSeenAtISO != null;

    console.log('[index] state', { introSeen, onboardingDone, trialOrSubscribed, paywallSeen, status: settings.subscriptionStatus });

    // Flow: intro → onboarding → paywall → home (value-first)
    if (!introSeen) {
      redirectedRef.current = true;
      console.log('[index] redirect -> /intro');
      router.replace('/intro');
      return;
    }
    if (!onboardingDone) {
      redirectedRef.current = true;
      console.log('[index] redirect -> /onboarding');
      router.replace('/onboarding');
      return;
    }
    if (!trialOrSubscribed && !paywallSeen) {
      redirectedRef.current = true;
      console.log('[index] redirect -> /paywall (post-onboarding)');
      router.replace('/paywall');
    }
  }, [
    isHydrating,
    router,
    settings.introSeenVersion,
    settings.onboardingCompleted,
    settings.subscriptionStatus,
    settings.paywallSeenAtISO,
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
