import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { TRIAL_DAYS } from '@/constants/iap';
import { LEGAL_LINKS } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { Badge } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { fetchOffering, purchase } from '@/utils/iap';

const BENEFITS = [
  '食材・一皿料理の両方を最短で記録',
  'P/F/C と目標カロリーの日次フィードバック',
  '体重と体脂肪率の静かな変化を追う',
  'あなた向けに最適化されたQuick Log',
];

export default function PaywallRoute() {
  const router = useRouter();
  const { restorePurchase, markPaywallSeen, settings } = useAppState();

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
        if (info && info.entitlements.active['premium']) {
          // CustomerInfo listener in app-state-provider will sync subscriptionStatus
          markPaywallSeen();
          router.replace('/');
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        Alert.alert('購入に失敗しました', err.message ?? '時間をおいて再度お試しください。');
      } finally {
        setPurchasing(null);
      }
    },
    [purchasing, markPaywallSeen, router]
  );

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchase();
    if (restored) {
      markPaywallSeen();
      router.replace('/');
    } else {
      Alert.alert('復元できる購入が見つかりません', 'Apple IDかGoogleアカウントをご確認ください。');
    }
  }, [restorePurchase, markPaywallSeen, router]);

  const handleLater = useCallback(() => {
    markPaywallSeen();
    router.replace('/');
  }, [markPaywallSeen, router]);

  const openLegal = (url: string) => {
    Linking.openURL(url).catch((e) => console.warn('[paywall] failed to open legal URL', e));
  };

  const monthlyPkg = offering?.monthly ?? offering?.availablePackages.find((p) => p.packageType === 'MONTHLY');
  const annualPkg = offering?.annual ?? offering?.availablePackages.find((p) => p.packageType === 'ANNUAL');

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.page} testID="paywall-screen">
        <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <View style={styles.closeRow}>
            <Pressable
              onPress={handleLater}
              style={styles.closeButton}
              testID="paywall-close"
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <X size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Badge tone="accent" size="md">{TRIAL_DAYS}日間無料</Badge>
            <Text style={styles.title}>静かに続けられる{`\n`}食事記録を</Text>
            <Text style={styles.subtitle}>
              まずは{TRIAL_DAYS}日間無料で。その後は月額または年額プランで継続できます。
            </Text>

            <View style={styles.benefitsCard}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <View style={styles.checkDot}>
                    <Check size={14} color={palette.white} />
                  </View>
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            {/* PRICING */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={palette.sageDeep} />
                <Text style={styles.priceSub}>プランを読み込み中…</Text>
              </View>
            ) : !offering ? (
              <View style={styles.loadingBox}>
                <Text style={styles.priceSub}>プランを取得できませんでした</Text>
                <Text style={styles.priceHint}>App Store / Google Play で IAP プロダクトの設定を完了してください。</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {annualPkg ? (
                  <PlanCard
                    pkg={annualPkg}
                    label="年額プラン"
                    badgeLabel="お得"
                    isPurchasing={purchasing === annualPkg.identifier}
                    disabled={!!purchasing || isTrialOrActive}
                    onPress={() => handlePurchase(annualPkg)}
                  />
                ) : null}
                {monthlyPkg ? (
                  <PlanCard
                    pkg={monthlyPkg}
                    label="月額プラン"
                    isPurchasing={purchasing === monthlyPkg.identifier}
                    disabled={!!purchasing || isTrialOrActive}
                    onPress={() => handlePurchase(monthlyPkg)}
                  />
                ) : null}
              </View>
            )}

            <Text style={styles.priceHint}>
              {TRIAL_DAYS}日間の無料期間終了後に自動で課金が始まります。いつでも解約できます。
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={handleRestore}
                testID="paywall-restore"
                accessibilityRole="button"
                accessibilityLabel="購入を復元"
              >
                <Text style={styles.secondaryText}>購入を復元</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable
                onPress={handleLater}
                testID="paywall-later"
                accessibilityRole="button"
                accessibilityLabel="あとで"
                accessibilityHint="購読しないでホーム画面に戻ります"
              >
                <Text style={styles.secondaryText}>あとで</Text>
              </Pressable>
            </View>
            <View style={styles.legalRow}>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.terms)}>
                <Text style={styles.legalLink}>利用規約</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.privacy)}>
                <Text style={styles.legalLink}>プライバシーポリシー</Text>
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
      accessibilityHint="このプランで購入手続きを開始します"
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
        <ActivityIndicator color={palette.sageDeep} />
      ) : (
        <View style={styles.ctaPill}>
          <Text style={styles.ctaPillText}>選ぶ</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 20 },
  title: { fontSize: 28, fontWeight: '700', color: palette.text, lineHeight: 36 },
  subtitle: { fontSize: 14, lineHeight: 22, color: palette.textMuted },
  benefitsCard: { backgroundColor: palette.surface, borderRadius: 24, padding: 18, gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 14, color: palette.text, flex: 1 },
  loadingBox: { backgroundColor: palette.card, borderRadius: 24, padding: 18, alignItems: 'center', gap: 8 },
  priceCard: { backgroundColor: palette.card, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceValue: { fontSize: 16, fontWeight: '700', color: palette.text },
  priceSub: { fontSize: 14, color: palette.textMuted, marginTop: 2 },
  priceHint: { fontSize: 12, lineHeight: 18, color: palette.textMuted },
  ctaPill: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  ctaPillText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14, gap: 12 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  secondaryText: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 12, color: palette.textMuted, textDecorationLine: 'underline' },
  legalSep: { fontSize: 12, color: palette.textMuted },
});
