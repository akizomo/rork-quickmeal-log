import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { LEGAL_LINKS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, Caption, Card, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { getEffectiveSubscriptionStatus, trialDaysRemaining } from '@/utils/goals';

export default function SubscriptionRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, restorePurchase } = useAppState();

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const status = getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS);

  const statusLabel =
    status === 'trialing'
      ? '無料トライアル中'
      : status === 'active'
      ? '有効'
      : '未加入';

  const statusSub =
    status === 'trialing'
      ? `残り ${trialDays} 日 · 終了2日前にお知らせします`
      : status === 'active'
      ? '自動更新が有効です'
      : 'プランを購入してフル機能を解放できます';

  // トライアル終了日 (表示用)
  const trialEndDate =
    status === 'trialing' && settings.trialStartedAtISO
      ? new Date(
          new Date(settings.trialStartedAtISO).getTime() +
            TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        )
      : null;
  const trialEndLabel = trialEndDate
    ? `${trialEndDate.getMonth() + 1}月${trialEndDate.getDate()}日 (${trialDays}日後)`
    : null;

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
              <Card
                variant="raised"
                style={{
                  gap: theme.spacing['1'],
                  borderLeftWidth: status === 'trialing' && trialDays > 0 && trialDays <= 2 ? 3 : 0,
                  borderLeftColor:
                    status === 'trialing' && trialDays > 0 && trialDays <= 2
                      ? theme.colors.status.warning
                      : 'transparent',
                }}
              >
                <Body weight="bold">{statusLabel}</Body>
                <Caption tone="secondary">{statusSub}</Caption>
                {trialEndLabel ? (
                  <Caption tone="tertiary" style={{ marginTop: 4 }}>
                    本登録切替日: {trialEndLabel}
                  </Caption>
                ) : null}
                {status === 'trialing' && trialDays > 0 ? (
                  <Caption tone="tertiary" style={{ marginTop: 4 }}>
                    本登録後は月額¥480 または 年額¥4,800 で自動更新されます。
                    解約は Google Play のサブスクリプション設定からいつでも可能です。
                  </Caption>
                ) : null}
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
