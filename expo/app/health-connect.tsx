import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, Caption, Heading, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { useHealthSyncContext } from '@/providers/health-sync-provider';

/**
 * ペイウォール突破後に表示するヘルス連携誘導画面。
 *
 * `decideInitialRoute()` が `healthConnectSeenAtISO` を見て遷移する。
 * 連携 / スキップどちらでも `markHealthConnectSeen()` を呼び、`/` へ戻す。
 *
 * v1.7+: Android の Health Connect プロバイダ未インストール / 要更新時は、
 * 自動 Play Store 遷移を回避してユーザーに明示的に伝える。「インストールへ」
 * ボタンで Play Store を能動的に開き、戻ってきたタイミングで再度連携できる。
 */
export default function HealthConnectRoute() {
  const router = useRouter();
  const t = useTheme();
  const { markHealthConnectSeen } = useAppState();
  const healthSync = useHealthSyncContext();
  const [busy, setBusy] = useState<boolean>(false);

  const goHome = useCallback(() => {
    markHealthConnectSeen();
    router.replace('/');
  }, [markHealthConnectSeen, router]);

  const handleConnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (healthSync.supported) {
        await healthSync.requestPermissions();
      }
    } finally {
      setBusy(false);
      goHome();
    }
  }, [busy, goHome, healthSync]);

  const handleInstallProvider = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await healthSync.openInstallPage();
    } finally {
      setBusy(false);
    }
  }, [busy, healthSync]);

  const providerMissing =
    healthSync.status === 'provider_missing' ||
    healthSync.status === 'provider_update_required';
  const needsInstall = providerMissing && healthSync.supported;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: t.colors.surface.default }} testID="health-connect-screen">
        <LinearGradient
          colors={[t.colors.surface.default, t.colors.surface.overlay]}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['6'],
              paddingBottom: t.spacing['5'],
              flexGrow: 1,
              gap: t.spacing['4'],
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Heading size="2xl">ヘルスデータと連携しますか？</Heading>
            <Body tone="secondary">
              歩数・運動・体重を自動で取り込んで、毎日の入力をすこし軽くします。あとからでも変更できます。
            </Body>
            <View style={{ gap: t.spacing['2'], marginTop: 'auto' }}>
              <Card variant="raised" style={{ gap: t.spacing['2'] }}>
                <Body weight="semibold">取り込むデータ</Body>
                <Caption tone="secondary">・体重 / 体脂肪率</Caption>
                <Caption tone="secondary">・歩数 / 消費カロリー (今後)</Caption>
                <Caption tone="secondary">・運動セッション (今後)</Caption>
              </Card>
              {needsInstall ? (
                <Card variant="raised" style={{ gap: t.spacing['1'] }}>
                  <Body weight="semibold">Health Connect が必要です</Body>
                  <Caption tone="secondary">
                    {healthSync.status === 'provider_update_required'
                      ? 'インストール済みの Health Connect アプリのアップデートが必要です。Play Store で更新してから戻ってきてください。'
                      : 'Android では Google の Health Connect アプリ経由でデータを取り込みます。Play Store からインストールして戻ってきてください。'}
                  </Caption>
                </Card>
              ) : null}
              {!healthSync.supported ? (
                <Caption tone="tertiary" align="center" testID="health-connect-unsupported">
                  このプラットフォームではヘルスデータ連携は利用できません。
                </Caption>
              ) : null}
              {__DEV__ ? (
                <Caption tone="tertiary" align="center">
                  [DEV] status: {healthSync.status} | supported: {String(healthSync.supported)}
                </Caption>
              ) : null}
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['2'],
              paddingBottom: t.spacing['3'],
              gap: t.spacing['2'],
            }}
          >
            {healthSync.supported ? (
              <Pressable
                onPress={goHome}
                testID="health-connect-skip"
                hitSlop={10}
                disabled={busy}
                style={{ alignSelf: 'center', paddingVertical: t.spacing['1'] }}
              >
                <Caption tone="link">あとで</Caption>
              </Pressable>
            ) : null}
            {needsInstall ? (
              <Button
                label={healthSync.status === 'provider_update_required' ? 'Play Store で更新' : 'Health Connect を入手'}
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleInstallProvider}
                disabled={busy}
                testID="health-connect-install-cta"
              />
            ) : (
              <Button
                label={healthSync.supported ? '連携する' : 'はじめる'}
                variant="primary"
                size="lg"
                fullWidth
                onPress={healthSync.supported ? handleConnect : goHome}
                disabled={busy}
                testID="health-connect-cta"
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}
