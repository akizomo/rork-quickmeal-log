import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { LEGAL_LINKS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, Caption, Card, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { trialDaysRemaining } from '@/utils/goals';

export default function SubscriptionRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, restorePurchase } = useAppState();

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const status = settings.subscriptionStatus;

  const statusLabel =
    status === 'trialing'
      ? '無料トライアル中'
      : status === 'active'
      ? '有効'
      : '未加入';

  const statusSub =
    status === 'trialing'
      ? `残り ${trialDays} 日`
      : status === 'active'
      ? '自動更新が有効です'
      : 'プランを購入してフル機能を解放できます';

  const handleRestore = async () => {
    const restored = await restorePurchase();
    if (restored) {
      Alert.alert('購入を復元しました', 'プレミアム機能をご利用いただけます。');
    } else {
      Alert.alert('復元できる購入が見つかりません', 'Apple ID か Google アカウントをご確認ください。');
    }
  };

  const openManage = () => {
    Linking.openURL(LEGAL_LINKS.manageSubscription).catch((e) =>
      console.log('[subscription] manage', e)
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'サブスクリプション',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="subscription-screen">

            {/* §現在のステータス */}
            <View style={styles.section}>
              <SettingsSectionLabel>現在のステータス</SettingsSectionLabel>
              <Card variant="raised" style={{ gap: theme.spacing['1'] }}>
                <Body weight="bold">{statusLabel}</Body>
                <Caption tone="secondary">{statusSub}</Caption>
              </Card>
            </View>

            {/* §プラン操作 */}
            <View style={styles.section}>
              <SettingsSectionLabel>プラン</SettingsSectionLabel>
              <SettingsListCard>
                {status !== 'active' ? (
                  <>
                    <SettingsLinkRow
                      label={status === 'trialing' ? 'プランを選択する' : '購入してプレミアムを開始'}
                      onPress={() => router.push('/paywall')}
                      testID="subscription-link-paywall"
                    />
                    <SettingsDivider />
                  </>
                ) : null}
                <SettingsLinkRow
                  label="購入を復元"
                  onPress={handleRestore}
                  testID="subscription-link-restore"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label="サブスクリプションを管理"
                  sub="App Store のサブスクリプション設定を開きます"
                  onPress={openManage}
                  testID="subscription-link-manage"
                />
              </SettingsListCard>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, gap: 22, paddingBottom: 40 },
  section: { gap: 6 },
});
