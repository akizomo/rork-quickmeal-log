import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { TRIAL_DAYS } from '@/constants/iap';
import { LEGAL_LINKS } from '@/constants/onboarding';
import { Badge, Body, Icon, Label, useTheme, type Theme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, lineHeight as lh } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { useT } from '@/hooks/useT';
import { useLocale } from '@/hooks/useLocale';
import { fetchOffering, purchase } from '@/utils/iap';
import {
  cancelTrialExpiryNotification,
  requestTrialNotificationPermission,
  scheduleTrialExpiryNotification,
} from '@/utils/trial-notifications';

export default function PaywallRoute() {
  const router = useRouter();
  const t = useTheme();
  const tr = useT();
  const { uiLanguage } = useLocale();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { restorePurchase, markPaywallSeen, completePurchase, settings, updateSettingsValues } = useAppState();
  const benefits: string[] = tr('paywall.benefits', { returnObjects: true }) ?? [];

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<string | null>(null); // identifier of purchasing pkg

  const isTrialOrActive = settings.subscriptionStatus === 'trialing' || settings.subscriptionStatus === 'active';

  useEffect(() => {
    let cancelled = false;
    fetchOffering()
      .then((res) => {
        if (cancelled) return;
        setOffering(res);
      })
      .catch((e) => console.log('[paywall] fetchOffering failed', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      if (purchasing) return;
      setPurchasing(pkg.identifier);
      try {
        const info = await purchase(pkg);
        if (info) {
          // subscriptionStatus を即座に更新してからナビゲート (タイミング問題を防ぐ)
          completePurchase(info);

          // トライアル開始 → 終了48h前のローカル通知をスケジュール
          // 通知許諾は購入完了直後に文脈一致でリクエスト (ユーザー保護のため)
          await requestTrialNotificationPermission();
          const trialStartedAtISO = new Date().toISOString();
          await scheduleTrialExpiryNotification(trialStartedAtISO, TRIAL_DAYS, uiLanguage);

          router.replace('/');
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        Alert.alert(tr('paywall.alerts.purchaseError'), err.message ?? tr('paywall.alerts.purchaseErrorRetry'));
      } finally {
        setPurchasing(null);
      }
    },
    [purchasing, completePurchase, router]
  );

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchase();
    if (restored) {
      markPaywallSeen();
      await cancelTrialExpiryNotification();
      router.replace('/');
    } else {
      Alert.alert(tr('paywall.alerts.restoreFail'), tr('paywall.alerts.restoreFailBody'));
    }
  }, [restorePurchase, markPaywallSeen, router]);

  // 強制課金型 (PRD §6.1): paywall は「あとで」スキップ不可。
  // ユーザーは「購読する」or「復元する」のいずれかでホームへ進む。

  const openLegal = (url: string) => {
    Linking.openURL(url).catch((e) => console.warn('[paywall] failed to open legal URL', e));
  };

  const monthlyPkg = offering?.monthly ?? offering?.availablePackages.find((p) => p.packageType === 'MONTHLY');
  const annualPkg = offering?.annual ?? offering?.availablePackages.find((p) => p.packageType === 'ANNUAL');

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.page} testID="paywall-screen">
        <LinearGradient colors={[t.colors.surface.default, t.colors.surface.raised]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          {/* 強制課金型なので閉じるボタンなし。ヘッダー余白だけ確保。 */}
          <View style={styles.closeRow} />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Badge tone="accent" size="md">{tr('paywall.badge', { days: TRIAL_DAYS })}</Badge>
            <Text style={styles.title}>{tr('paywall.title')}</Text>
            <Text style={styles.subtitle}>{tr('paywall.subtitle', { days: TRIAL_DAYS })}</Text>

            <View style={styles.benefitsCard}>
              {benefits.map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <Icon name="checkCircle" size={22} color={t.colors.status.success.default} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            {/* PRICING */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={t.colors.action.text.default} />
                <Text style={styles.priceSub}>{tr('paywall.loading')}</Text>
              </View>
            ) : !offering ? (
              <View style={styles.loadingBox}>
                <Text style={styles.priceSub}>{tr('paywall.loadError')}</Text>
                <Text style={styles.priceHint}>{tr('paywall.iapSetupHint')}</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {annualPkg ? (
                  <PlanCard
                    pkg={annualPkg}
                    label={tr('paywall.annual')}
                    badgeLabel={tr('paywall.discount')}
                    isPurchasing={purchasing === annualPkg.identifier}
                    disabled={!!purchasing || isTrialOrActive}
                    onPress={() => handlePurchase(annualPkg)}
                  />
                ) : null}
                {monthlyPkg ? (
                  <PlanCard
                    pkg={monthlyPkg}
                    label={tr('paywall.monthly')}
                    isPurchasing={purchasing === monthlyPkg.identifier}
                    disabled={!!purchasing || isTrialOrActive}
                    onPress={() => handlePurchase(monthlyPkg)}
                  />
                ) : null}
              </View>
            )}

            <Text style={styles.priceHint}>{tr('paywall.priceHint', { days: TRIAL_DAYS })}</Text>
          </ScrollView>

          <View style={styles.footer}>
            {__DEV__ ? (
              <Pressable
                onPress={() => {
                  updateSettingsValues({ subscriptionStatus: 'trialing' });
                  router.replace('/');
                }}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ fontSize: fs.xs, color: t.colors.status.danger.default, fontWeight: '700' }}>
                  [DEV] Paywall スキップ {/* i18n-ignore: dev-only label */}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={handleRestore}
                testID="paywall-restore"
                accessibilityRole="button"
                accessibilityLabel={tr('paywall.restore')}
              >
                <Label size="sm" tone="link">{tr('paywall.restore')}</Label>
              </Pressable>
            </View>
            <View style={styles.legalRow}>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.terms)}>
                <Body size="sm" tone="link" style={{ textDecorationLine: 'underline' }}>{tr('nav.terms')}</Body>
              </Pressable>
              <Body size="sm" tone="secondary">·</Body>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.privacy)}>
                <Body size="sm" tone="link" style={{ textDecorationLine: 'underline' }}>{tr('nav.privacy')}</Body>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

function PlanCard({
  pkg,
  label,
  badgeLabel,
  isPurchasing,
  disabled,
  onPress,
}: {
  pkg: PurchasesPackage;
  label: string;
  badgeLabel?: string;
  isPurchasing: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const product = pkg.product;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.priceCard,
        { opacity: disabled && !isPurchasing ? 0.5 : pressed ? 0.85 : 1 },
      ]}
      testID={`paywall-plan-${pkg.packageType}`}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${product.priceString}`}
      accessibilityHint={tr('paywall.a11y.purchaseHint')}
      accessibilityState={{ disabled, busy: isPurchasing }}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.priceValue}>{label}</Text>
          {badgeLabel ? (
            <Badge tone="accent" size="sm">{badgeLabel}</Badge>
          ) : null}
        </View>
        <Text style={styles.priceSub}>{product.priceString}</Text>
      </View>
      {isPurchasing ? (
        <ActivityIndicator color={t.colors.action.text.default} />
      ) : (
        <View style={styles.ctaPill}>
          <Text style={styles.ctaPillText}>{tr('paywall.select')}</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.surface.default },
  safe: { flex: 1 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: t.colors.surface.raised, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 20 },
  title: { fontSize: fs['3xl'], fontWeight: '700', color: t.colors.content.primary, lineHeight: 36 },
  subtitle: { fontSize: fs.md, lineHeight: 22, color: t.colors.content.secondary },
  benefitsCard: { backgroundColor: t.colors.surface.raised, borderRadius: 24, padding: 20, gap: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // アクション色は本来インタラクティブ要素専用。特典チェックは「含まれている」を
  // 示す状態表示なのでstatus.successを使う (2026-08-07指摘)。
  benefitText: { fontSize: fs.md, color: t.colors.content.primary, flex: 1 },
  loadingBox: { backgroundColor: t.colors.surface.raised, borderRadius: 24, padding: 20, alignItems: 'center', gap: 8 },
  priceCard: { backgroundColor: t.colors.surface.raised, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // プラン名 = Label md 相当 (15/semibold)。priceSub と同サイズだが weight と tone で階層を作る。
  priceValue: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  priceSub: { fontSize: fs.md, color: t.colors.content.secondary, marginTop: 2 },
  priceHint: { fontSize: fs.sm, lineHeight: lh.sm, color: t.colors.content.secondary },
  // 装飾的な選択インジケータ (外側のプラン行 Pressable が本体のonPressを持つため、
  // ここ自体は Button 化しない)。見た目だけ Button と揃えて radius.full を使う。
  ctaPill: { backgroundColor: t.colors.action.primary.default, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 16 },
  ctaPillText: { color: t.colors.content.onAction, fontSize: fs.sm, fontWeight: '700' },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 12 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  secondaryText: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '600' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: fs.sm, color: t.colors.content.secondary, textDecorationLine: 'underline' },
  legalSep: { fontSize: fs.sm, color: t.colors.content.secondary },
});
