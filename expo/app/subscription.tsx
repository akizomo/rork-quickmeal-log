import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/design-system';
import { LEGAL_LINKS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, Caption, Card, Label, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { getEffectiveSubscriptionStatus, trialDaysRemaining } from '@/utils/goals';
import { useT } from '@/hooks/useT';

export default function SubscriptionRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { settings, restorePurchase } = useAppState();

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const status = getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS);

  const statusLabel =
    status === 'trialing'
      ? t('subscription.statusLabel.trialing')
      : status === 'active'
      ? t('subscription.statusLabel.active')
      : t('subscription.statusLabel.inactive');

  const statusSub =
    status === 'trialing'
      ? t('subscription.statusSub.trialing', { days: trialDays })
      : status === 'active'
      ? t('subscription.statusSub.active')
      : t('subscription.statusSub.inactive');

  // トライアル終了日 (表示用)
  const trialEndDate =
    status === 'trialing' && settings.trialStartedAtISO
      ? new Date(
          new Date(settings.trialStartedAtISO).getTime() +
            TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
        )
      : null;
  const trialEndLabel = trialEndDate
    ? t('subscription.trialEndDate', {
        date: `${trialEndDate.getMonth() + 1}/${trialEndDate.getDate()} (${trialDays}d)`,
      })
    : null;

  const handleRestore = async () => {
    const restored = await restorePurchase();
    if (restored) {
      Alert.alert(t('subscription.alerts.restoreSuccess'), t('subscription.alerts.restoreSuccessBody'));
    } else {
      Alert.alert(t('subscription.alerts.restoreFail'), t('subscription.alerts.restoreFailBody'));
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
          title: t('nav.subscription'),
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
              <SettingsSectionLabel>{t('subscription.sections.status')}</SettingsSectionLabel>
              <Card
                variant="raised"
                style={{
                  gap: theme.spacing['1'],
                  borderLeftWidth: status === 'trialing' && trialDays > 0 && trialDays <= 2 ? 3 : 0,
                  borderLeftColor:
                    status === 'trialing' && trialDays > 0 && trialDays <= 2
                      ? theme.colors.status.warning.default
                      : 'transparent',
                }}
              >
                <Label>{statusLabel}</Label>
                <Caption tone="secondary">{statusSub}</Caption>
                {trialEndLabel ? (
                  <Caption tone="secondary" style={{ marginTop: 4 }}>
                    {t('subscription.trialEndDate', { date: trialEndLabel })}
                  </Caption>
                ) : null}
                {status === 'trialing' && trialDays > 0 ? (
                  <Body size="sm" tone="secondary" style={{ marginTop: 4 }}>
                    {t('subscription.trialBody')}
                  </Body>
                ) : null}
              </Card>
            </View>

            {/* §プラン操作 */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('subscription.sections.plan')}</SettingsSectionLabel>
              <SettingsListCard>
                {status !== 'active' ? (
                  <>
                    <SettingsLinkRow
                      label={status === 'trialing'
                        ? t('subscription.planActions.selectTrialing')
                        : t('subscription.planActions.buyInactive')}
                      onPress={() => router.push('/paywall')}
                      testID="subscription-link-paywall"
                    />
                    <SettingsDivider />
                  </>
                ) : null}
                <SettingsLinkRow
                  label={t('subscription.planActions.restore')}
                  onPress={handleRestore}
                  testID="subscription-link-restore"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label={t('subscription.planActions.manage')}
                  sub={t('subscription.planActions.manageSub')}
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
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  section: { gap: 8 },
});
