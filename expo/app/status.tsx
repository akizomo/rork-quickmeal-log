import { Stack, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, Caption, Card, Heading, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { trialDaysRemaining } from '@/utils/goals';

export default function StatusRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, settings, weights, addWeightEntry, addBodyFatEntry } = useAppState();
  const [weightSheetVisible, setWeightSheetVisible] = useState<boolean>(false);
  const [weightInput, setWeightInput] = useState<string>('');
  const [bfSheetVisible, setBfSheetVisible] = useState<boolean>(false);
  const [bfInput, setBfInput] = useState<string>('');

  const latestDelta = useMemo(() => {
    if (weights.length < 2) return null;
    return Number((weights[0].weightKg - weights[1].weightKg).toFixed(1));
  }, [weights]);

  const avg7 = useMemo(() => {
    if (weights.length === 0) return null;
    const recent = weights.slice(0, 7);
    const sum = recent.reduce((acc, w) => acc + w.weightKg, 0);
    return Math.round((sum / recent.length) * 10) / 10;
  }, [weights]);

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const subscriptionLabel =
    settings.subscriptionStatus === 'trialing'
      ? `無料トライアル中 (残り${trialDays}日)`
      : settings.subscriptionStatus === 'active'
      ? '有効'
      : '未加入';

  const submitWeight = () => {
    const v = Number(weightInput);
    if (!Number.isFinite(v) || v <= 0) return;
    addWeightEntry(v);
    setWeightInput('');
    setWeightSheetVisible(false);
  };

  const submitBodyFat = () => {
    const v = Number(bfInput);
    if (!Number.isFinite(v) || v <= 0 || v > 60) return;
    addBodyFatEntry(v);
    setBfInput('');
    setBfSheetVisible(false);
  };

  const paceLabel = useMemo(() => {
    if (!profile.goalDirection || profile.goalDirection === 'maintain') return null;
    return profile.paceLevel === 'gentle' ? 'ゆるやか' : profile.paceLevel === 'strong' ? 'しっかり' : '標準';
  }, [profile.goalDirection, profile.paceLevel]);

  const weightDisplay = profile.currentWeightKg ? `${profile.currentWeightKg} kg` : '未設定';
  const targetWeightDisplay = profile.targetWeightKg ? `${profile.targetWeightKg} kg` : '未設定';
  const bfDisplay = profile.currentBodyFatPct != null ? `${profile.currentBodyFatPct}%` : '未設定';
  const targetBfDisplay = profile.targetBodyFatPct != null ? `${profile.targetBodyFatPct}%` : '未設定';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'ステータス',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="status-screen">

            {/* TRIAL STATUS — トライアル中のみ表示 (PRD §6.1) */}
            {settings.subscriptionStatus === 'trialing' ? (
              <Pressable
                onPress={() => router.push('/subscription')}
                testID="status-trial-card"
                accessibilityRole="button"
                accessibilityLabel="トライアル詳細"
                accessibilityHint="サブスクリプション画面を開きます"
              >
                <Card
                  variant="raised"
                  style={{
                    gap: theme.spacing['1'],
                    borderLeftWidth: 3,
                    borderLeftColor: trialDays <= 2
                      ? theme.colors.status.warning
                      : theme.colors.action.primary.default,
                  }}
                >
                  <View style={styles.trialRow}>
                    <Body weight="bold">
                      無料トライアル中{trialDays > 0 ? ` · 残り${trialDays}日` : ''}
                    </Body>
                    <ChevronRight size={14} color={theme.colors.content.tertiary} />
                  </View>
                  <Caption tone="tertiary">
                    {trialDays <= 2
                      ? `あと${trialDays}日で本登録に切り替わります。継続される場合は何もしなくてOK。`
                      : 'いつでも解約できます。詳細はサブスクリプション画面から。'}
                  </Caption>
                </Card>
              </Pressable>
            ) : null}

            {/* HERO */}
            <Card variant="raised" style={{ gap: theme.spacing['4'] }}>
              <View style={styles.heroMetricRow}>
                <HeroMetric label="体重" value={weightDisplay} target={targetWeightDisplay} />
                <View style={[styles.heroDivider, { backgroundColor: theme.colors.border.subtle }]} />
                <HeroMetric label="体脂肪" value={bfDisplay} target={targetBfDisplay} />
              </View>
              {latestDelta !== null ? (
                <Caption tone="tertiary" style={{ textAlign: 'center' }}>
                  最近の変化 {latestDelta > 0 ? '+' : ''}{latestDelta} kg{avg7 ? ` · 7日平均 ${avg7} kg` : ''}
                </Caption>
              ) : null}
              <View style={styles.recordButtonRow}>
                <Pressable
                  style={[styles.recordButton, { backgroundColor: theme.colors.action.primary.default }]}
                  onPress={() => setWeightSheetVisible(true)}
                  testID="status-update-weight"
                  accessibilityRole="button"
                  accessibilityLabel="体重を記録"
                  accessibilityHint="今日の体重を入力するシートを開きます"
                >
                  <Text style={[styles.recordButtonText, { color: theme.colors.content.onAction }]}>体重を記録</Text>
                </Pressable>
                <Pressable
                  style={[styles.recordButton, { backgroundColor: theme.colors.action.primary.default }]}
                  onPress={() => setBfSheetVisible(true)}
                  testID="status-update-bf"
                  accessibilityRole="button"
                  accessibilityLabel="体脂肪率を記録"
                  accessibilityHint="今日の体脂肪率を入力するシートを開きます"
                >
                  <Text style={[styles.recordButtonText, { color: theme.colors.content.onAction }]}>体脂肪を記録</Text>
                </Pressable>
              </View>
            </Card>

            {/* GOAL CARD */}
            <Pressable
              onPress={() => router.push('/goal-edit')}
              testID="status-goal-card"
              accessibilityRole="button"
              accessibilityLabel="目標を変更"
              accessibilityHint="目的とプランの設定画面を開きます"
            >
              <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
                <View style={styles.goalHeader}>
                  <Body weight="bold">目標</Body>
                  <View style={styles.changeRow}>
                    <Caption tone="secondary">変更</Caption>
                    <ChevronRight size={14} color={theme.colors.content.tertiary} />
                  </View>
                </View>
                <View style={styles.kcalRow}>
                  <Heading size="3xl">{profile.targetCalories || '--'}</Heading>
                  <Caption tone="tertiary" style={{ marginLeft: 4, marginBottom: 6 }}>kcal / 日</Caption>
                </View>
                <View style={styles.pfcRow}>
                  <PfcCell label="P" value={profile.targetProtein} color={theme.colors.nutrition.protein.default} />
                  <PfcCell label="F" value={profile.targetFat} color={theme.colors.nutrition.fat.default} />
                  <PfcCell label="C" value={profile.targetCarbs} color={theme.colors.nutrition.carbs.default} />
                </View>
                {paceLabel ? (
                  <Caption tone="secondary">
                    ペース: {paceLabel}
                  </Caption>
                ) : null}
              </Card>
            </Pressable>

            {/* §あなた */}
            <View style={styles.section}>
              <SettingsSectionLabel>あなた</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="プロフィール"
                  onPress={() => router.push('/profile')}
                  testID="status-link-profile"
                />
              </SettingsListCard>
            </View>

            {/* §アプリ */}
            <View style={styles.section}>
              <SettingsSectionLabel>アプリ</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="サブスクリプション"
                  sub={subscriptionLabel}
                  onPress={() => router.push('/subscription')}
                  testID="status-link-subscription"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label="設定"
                  onPress={() => router.push('/settings')}
                  testID="status-link-settings"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label="アプリについて"
                  onPress={() => router.push('/about')}
                  testID="status-link-about"
                />
              </SettingsListCard>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      <WeightSheet
        visible={weightSheetVisible}
        onClose={() => setWeightSheetVisible(false)}
        value={weightInput}
        onChange={setWeightInput}
        onSubmit={submitWeight}
        avg7={avg7}
      />

      <BodyFatSheet
        visible={bfSheetVisible}
        onClose={() => setBfSheetVisible(false)}
        value={bfInput}
        onChange={setBfInput}
        onSubmit={submitBodyFat}
        currentBfPct={profile.currentBodyFatPct ?? null}
      />
    </>
  );
}

function HeroMetric({ label, value, target }: { label: string; value: string; target: string }) {
  return (
    <View style={styles.heroMetric}>
      <Caption tone="tertiary">{label}</Caption>
      <Heading size="2xl">{value}</Heading>
      <Caption tone="secondary">目標 {target}</Caption>
    </View>
  );
}

function PfcCell({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pfcCell, { backgroundColor: theme.colors.surface.sunken }]}>
      <Text style={[styles.pfcLabel, { color }]}>{label}</Text>
      <Text style={[styles.pfcValue, { color: theme.colors.content.primary }]}>{value}g</Text>
    </View>
  );
}

function BodyFatSheet({
  visible,
  onClose,
  value,
  onChange,
  onSubmit,
  currentBfPct,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  currentBfPct: number | null;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const diff =
    currentBfPct !== null && value !== '' ? Number((Number(value) - currentBfPct).toFixed(1)) : null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="シートを閉じる"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[
              styles.weightSheet,
              {
                backgroundColor: theme.colors.surface.raised,
                paddingBottom: 24 + insets.bottom,
              },
            ]}
            onPress={() => undefined}
          >
            <View style={[styles.sheetGrabber, { backgroundColor: theme.colors.border.default }]} />
            <Heading size="xl">体脂肪率を更新</Heading>
            <View style={[styles.weightInputWrap, { backgroundColor: theme.colors.surface.sunken }]}>
              <TextInput
                style={[styles.weightInput, { color: theme.colors.content.primary }]}
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="18.5"
                placeholderTextColor={theme.colors.content.tertiary}
                autoFocus
                testID="bf-input"
              />
              <Text style={[styles.weightInputSuffix, { color: theme.colors.content.tertiary }]}>%</Text>
            </View>
            {diff !== null && Number.isFinite(diff) ? (
              <Caption tone="secondary">
                前回との差 {diff > 0 ? '+' : ''}{diff} %
              </Caption>
            ) : null}
            <Pressable
              style={[styles.weightSubmit, { backgroundColor: theme.colors.action.primary.default }]}
              onPress={onSubmit}
              testID="bf-submit"
              accessibilityRole="button"
              accessibilityLabel="体脂肪率を保存"
            >
              <Text style={[styles.weightSubmitText, { color: theme.colors.content.onAction }]}>保存</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function WeightSheet({
  visible,
  onClose,
  value,
  onChange,
  onSubmit,
  avg7,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  avg7: number | null;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const diff = avg7 !== null && value !== '' ? Number((Number(value) - avg7).toFixed(1)) : null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="シートを閉じる"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[
              styles.weightSheet,
              {
                backgroundColor: theme.colors.surface.raised,
                paddingBottom: 24 + insets.bottom,
              },
            ]}
            onPress={() => undefined}
          >
            <View style={[styles.sheetGrabber, { backgroundColor: theme.colors.border.default }]} />
            <Heading size="xl">体重を更新</Heading>
            <View style={[styles.weightInputWrap, { backgroundColor: theme.colors.surface.sunken }]}>
              <TextInput
                style={[styles.weightInput, { color: theme.colors.content.primary }]}
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="56.4"
                placeholderTextColor={theme.colors.content.tertiary}
                autoFocus
                testID="weight-input"
              />
              <Text style={[styles.weightInputSuffix, { color: theme.colors.content.tertiary }]}>kg</Text>
            </View>
            {diff !== null && Number.isFinite(diff) ? (
              <Caption tone="secondary">
                7日平均との差 {diff > 0 ? '+' : ''}{diff} kg
              </Caption>
            ) : null}
            <Pressable
              style={[styles.weightSubmit, { backgroundColor: theme.colors.action.primary.default }]}
              onPress={onSubmit}
              testID="weight-submit"
              accessibilityRole="button"
              accessibilityLabel="体重を保存"
            >
              <Text style={[styles.weightSubmitText, { color: theme.colors.content.onAction }]}>保存</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, gap: 22, paddingBottom: 40 },
  heroMetricRow: { flexDirection: 'row', alignItems: 'center' },
  heroMetric: { flex: 1, alignItems: 'center', gap: 4 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 48, marginHorizontal: 8 },
  recordButtonRow: { flexDirection: 'row', gap: 10 },
  recordButton: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  recordButtonText: { fontSize: 14, fontWeight: '700' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  pfcRow: { flexDirection: 'row', gap: 8 },
  pfcCell: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  pfcLabel: { fontSize: 11, fontWeight: '700' },
  pfcValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  section: { gap: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 28, 24, 0.4)', justifyContent: 'flex-end' },
  weightSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 12, gap: 16 },
  sheetGrabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: 8 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  weightInput: { flex: 1, fontSize: 26, fontWeight: '700' },
  weightInputSuffix: { fontSize: 14, fontWeight: '700' },
  weightSubmit: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  weightSubmitText: { fontSize: 15, fontWeight: '700' },
});
