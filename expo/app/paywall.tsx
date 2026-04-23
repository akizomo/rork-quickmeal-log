import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEGAL_LINKS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';

const BENEFITS = [
  '食材・一皿料理の両方を最短で記録',
  'P/F/C と目標カロリーの日次フィードバック',
  '体重と体脂肪率の静かな変化を追う',
  'あなた向けに最適化されたQuick Log',
];

export default function PaywallRoute() {
  const router = useRouter();
  const { startTrial, restorePurchase, settings } = useAppState();

  const isTrialOrActive = settings.subscriptionStatus === 'trialing' || settings.subscriptionStatus === 'active';

  const handleStart = useCallback(() => {
    if (!isTrialOrActive) {
      startTrial();
    }
    router.replace('/onboarding');
  }, [isTrialOrActive, router, startTrial]);

  const handleRestore = useCallback(() => {
    restorePurchase();
    router.replace('/onboarding');
  }, [restorePurchase, router]);

  const handleLater = useCallback(() => {
    router.replace('/onboarding');
  }, [router]);

  const openLegal = (url: string) => {
    Linking.openURL(url).catch((e) => console.log('[paywall] openURL', e));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.page} testID="paywall-screen">
        <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <View style={styles.closeRow}>
            <Pressable onPress={handleLater} style={styles.closeButton} testID="paywall-close">
              <X size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TRIAL_DURATION_DAYS}日間無料</Text>
            </View>
            <Text style={styles.title}>静かに続けられる{`\n`}食事記録を</Text>
            <Text style={styles.subtitle}>
              まずは{TRIAL_DURATION_DAYS}日間無料で。その後は月額プランで継続できます。
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

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>プラン</Text>
              <Text style={styles.priceValue}>月額プラン</Text>
              <Text style={styles.priceSub}>価格はストアで読み込み中…</Text>
              <Text style={styles.priceHint}>
                {TRIAL_DURATION_DAYS}日間の無料期間終了後に自動で課金が始まります。いつでも解約できます。
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cta} onPress={handleStart} testID="paywall-cta">
              <Text style={styles.ctaText}>{TRIAL_DURATION_DAYS}日間無料で始める</Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable onPress={handleRestore} testID="paywall-restore">
                <Text style={styles.secondaryText}>購入を復元</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable onPress={handleLater} testID="paywall-later">
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 20 },
  badge: { alignSelf: 'flex-start', backgroundColor: palette.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: palette.sageDeep, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: palette.text, lineHeight: 36 },
  subtitle: { fontSize: 14, lineHeight: 22, color: palette.textMuted },
  benefitsCard: { backgroundColor: palette.surface, borderRadius: 24, padding: 18, gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 14, color: palette.text, flex: 1 },
  priceCard: { backgroundColor: palette.card, borderRadius: 24, padding: 18, gap: 6 },
  priceLabel: { fontSize: 12, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  priceValue: { fontSize: 20, fontWeight: '700', color: palette.text },
  priceSub: { fontSize: 13, color: palette.textMuted },
  priceHint: { fontSize: 12, lineHeight: 18, color: palette.textMuted, marginTop: 6 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14, gap: 12 },
  cta: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  secondaryText: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 12, color: palette.textMuted, textDecorationLine: 'underline' },
  legalSep: { fontSize: 12, color: palette.textMuted },
});
