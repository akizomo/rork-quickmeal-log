import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Body, Button, Card, Caption, Heading, Icon, type IconName, Label, useTheme, type Theme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { useHealthSyncContext } from '@/providers/health-sync-provider';

// ハート + パルスラインの簡易イラスト。react-native-svg + テーマトークンのみで構成し、
// components/onboarding-illustrations.tsx と同じ「トークンベースの自作イラスト」方針に揃える。
function HealthSyncIllustration({ t }: { t: Theme }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing['4'] }}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        <Circle cx={70} cy={70} r={70} fill={t.colors.action.primary.container} />
        <Path
          d="M70 112
             C 40 92, 22 74, 22 54
             C 22 38, 34 28, 48 28
             C 58 28, 66 34, 70 43
             C 74 34, 82 28, 92 28
             C 106 28, 118 38, 118 54
             C 118 74, 100 92, 70 112 Z"
          fill={t.colors.action.primary.default}
        />
        <Polyline
          points="30,70 50,70 58,54 66,82 74,62 82,70 110,70"
          fill="none"
          stroke={t.colors.content.onAction}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const DATA_ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'balance', label: '体重 / 体脂肪率' },
  { icon: 'steps', label: '歩数 / 消費カロリー' },
  { icon: 'exercise', label: '運動セッション' },
];

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

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <HealthSyncIllustration t={t} />
            </View>

            <View style={{ gap: t.spacing['2'] }}>
              <Card variant="raised" style={{ gap: t.spacing['3'] }}>
                <Label>取り込むデータ</Label>
                {DATA_ITEMS.map((item) => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['2'] }}>
                    <Icon name={item.icon} size={18} color={t.colors.content.secondary} />
                    <Body size="sm" tone="secondary">{item.label}</Body>
                  </View>
                ))}
              </Card>
              {needsInstall ? (
                <Card variant="raised" style={{ gap: t.spacing['1'] }}>
                  <Label>Health Connect が必要です</Label>
                  <Body size="sm" tone="secondary">
                    {healthSync.status === 'provider_update_required'
                      ? 'インストール済みの Health Connect アプリのアップデートが必要です。Play Store で更新してから戻ってきてください。'
                      : 'Android では Google の Health Connect アプリ経由でデータを取り込みます。Play Store からインストールして戻ってきてください。'}
                  </Body>
                </Card>
              ) : null}
              {!healthSync.supported ? (
                <Body size="sm" tone="secondary" align="center" testID="health-connect-unsupported">
                  このプラットフォームではヘルスデータ連携は利用できません。
                </Body>
              ) : null}
              {__DEV__ ? (
                <Caption tone="secondary" align="center">
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
