import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, BottomSheet, Caption, Card, Heading, Icon, Label, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useHealthSyncContext } from '@/providers/health-sync-provider';
import type { HealthSyncStatus } from '@/utils/health-sync';
import { useAppState } from '@/providers/app-state-provider';
import { getEffectiveSubscriptionStatus, trialDaysRemaining } from '@/utils/goals';

export default function StatusRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, settings, weights, addWeightEntry, addBodyFatEntry } = useAppState();
  const healthSync = useHealthSyncContext();
  const [weightSheetVisible, setWeightSheetVisible] = useState<boolean>(false);
  const [weightInput, setWeightInput] = useState<string>('');
  const [bfSheetVisible, setBfSheetVisible] = useState<boolean>(false);
  const [bfInput, setBfInput] = useState<string>('');

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const effectiveStatus = getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS);
  const subscriptionLabel =
    effectiveStatus === 'trialing'
      ? `無料トライアル中 (残り${trialDays}日)`
      : effectiveStatus === 'active'
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
    if (!profile.goalDirection || profile.goalDirection === 'maintain' || profile.goalDirection === 'recomp') return null;
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
            {effectiveStatus === 'trialing' && trialDays > 0 ? (
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
                      ? theme.colors.status.warning.default
                      : theme.colors.action.primary.default,
                  }}
                >
                  <View style={styles.trialRow}>
                    <Label>
                      無料トライアル中{trialDays > 0 ? ` · 残り${trialDays}日` : ''}
                    </Label>
                    <Icon name="chevronRight" size={14} color={theme.colors.content.tertiary} />
                  </View>
                  <Body size="sm" tone="secondary">
                    {trialDays <= 2
                      ? `あと${trialDays}日で本登録に切り替わります。継続される場合は何もしなくてOK。`
                      : 'いつでも解約できます。詳細はサブスクリプション画面から。'}
                  </Body>
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
              <View style={styles.recordButtonRow}>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setWeightSheetVisible(true)}
                  testID="status-update-weight"
                  accessibilityRole="button"
                  accessibilityLabel="体重を記録"
                  accessibilityHint="今日の体重を入力するシートを開きます"
                >
                  <Label size="sm" tone="link">体重を記録</Label>
                </Pressable>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setBfSheetVisible(true)}
                  testID="status-update-bf"
                  accessibilityRole="button"
                  accessibilityLabel="体脂肪率を記録"
                  accessibilityHint="今日の体脂肪率を入力するシートを開きます"
                >
                  <Label size="sm" tone="link">体脂肪を記録</Label>
                </Pressable>
              </View>
              {healthSync.supported ? (
                <HealthSyncRow
                  status={healthSync.status}
                  syncing={healthSync.syncing}
                  lastSyncedAt={healthSync.lastSyncedAt}
                  lastError={healthSync.lastError}
                  onPress={async () => {
                    // プロバイダ未インストール / 要更新は Play Store へ明示遷移
                    if (
                      healthSync.status === 'provider_missing' ||
                      healthSync.status === 'provider_update_required'
                    ) {
                      await healthSync.openInstallPage();
                      return;
                    }
                    if (healthSync.status !== 'authorized') {
                      const granted = await healthSync.requestPermissions();
                      if (!granted) return;
                    }
                    await healthSync.syncNow();
                  }}
                  onLongPress={async () => {
                    // 実機トラブルシュート: getSdkStatus() の生の値などを表示
                    const d = await healthSync.fetchDiagnostics();
                    Alert.alert(
                      'ヘルス連携 診断情報',
                      [
                        `platform: ${d.platform}`,
                        `getSdkStatus: ${d.sdkStatusLabel} (raw=${d.rawSdkStatus})`,
                        `initialized: ${d.initialized}`,
                        `status: ${d.status}`,
                        `granted: ${d.grantedPermissions.length ? d.grantedPermissions.join(', ') : '(none)'}`,
                        `lastRequest: ${d.lastRequestSummary ?? 'n/a'}`,
                      ].join('\n')
                    );
                  }}
                />
              ) : null}
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
                  <Label>目標</Label>
                  <View style={styles.changeRow}>
                    <Caption tone="secondary">変更</Caption>
                    <Icon name="chevronRight" size={14} color={theme.colors.content.tertiary} />
                  </View>
                </View>
                <View style={styles.kcalRow}>
                  <Heading size="3xl">{profile.targetCalories || '--'}</Heading>
                  <Caption tone="secondary" style={{ marginLeft: 4, marginBottom: 8 }}>kcal / 日</Caption>
                </View>
                <View style={styles.pfcRow}>
                  <PfcCell label="P" value={profile.targetProtein} color={theme.colors.nutrition.protein.text} background={theme.colors.nutrition.protein.background} />
                  <PfcCell label="F" value={profile.targetFat} color={theme.colors.nutrition.fat.text} background={theme.colors.nutrition.fat.background} />
                  <PfcCell label="C" value={profile.targetCarbs} color={theme.colors.nutrition.carbs.text} background={theme.colors.nutrition.carbs.background} />
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

function HealthSyncRow({
  status,
  syncing,
  lastSyncedAt,
  lastError,
  onPress,
  onLongPress,
}: {
  status: HealthSyncStatus;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const label = useMemo(() => {
    if (syncing) return '同期中…';
    if (status === 'provider_missing') return 'Health Connect を入手';
    if (status === 'provider_update_required') return 'Health Connect を更新';
    if (lastError) return '同期エラー · 権限を確認';
    if (status === 'authorized' && lastSyncedAt) return `ヘルス同期 · ${formatRelativeTime(lastSyncedAt)}`;
    return 'ヘルス同期';
  }, [syncing, lastError, status, lastSyncedAt]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={600}
      disabled={syncing}
      testID="status-health-sync"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: syncing, busy: syncing }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border.default,
        opacity: pressed && !syncing ? 0.7 : 1,
      })}
    >
      <Body size="sm" tone="secondary">{label}</Body>
      {syncing ? <ActivityIndicator size="small" color={theme.colors.content.tertiary} /> : null}
    </Pressable>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'たった今';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
  return `${Math.floor(diffSec / 86400)}日前`;
}

function HeroMetric({ label, value, target }: { label: string; value: string; target: string }) {
  return (
    <View style={styles.heroMetric}>
      <Caption tone="secondary">{label}</Caption>
      <Heading size="2xl">{value}</Heading>
      <Caption tone="secondary">目標 {target}</Caption>
    </View>
  );
}

function PfcCell({ label, value, color, background }: { label: string; value: number; color: string; background: string }) {
  return (
    <View style={[styles.pfcCell, { backgroundColor: background }]}>
      <Text style={[styles.pfcLabel, { color }]}>{label}</Text>
      <Text style={[styles.pfcValue, { color }]}>{value}g</Text>
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
  const theme = useTheme();
  const diff =
    currentBfPct !== null && value !== '' ? Number((Number(value) - currentBfPct).toFixed(1)) : null;
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="体脂肪率を更新"
      scrollable={false}
      primaryAction={{ label: '保存', onPress: onSubmit }}
      testID="bf-sheet"
    >
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
    </BottomSheet>
  );
}

function WeightSheet({
  visible,
  onClose,
  value,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="体重を更新"
      scrollable={false}
      primaryAction={{ label: '保存', onPress: onSubmit }}
      testID="weight-sheet"
    >
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  heroMetricRow: { flexDirection: 'row', alignItems: 'center' },
  heroMetric: { flex: 1, alignItems: 'center', gap: 4 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 48, marginHorizontal: 8 },
  recordButtonRow: { flexDirection: 'row' },
  textButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  textButtonLabel: { fontSize: fs.sm, fontWeight: '500' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  pfcRow: { flexDirection: 'row', gap: 8 },
  pfcCell: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  pfcLabel: { fontSize: fs.xs, fontWeight: '700' },
  pfcValue: { fontSize: fs.md, fontWeight: '700', marginTop: 2 },
  section: { gap: 8 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16 },
  weightInput: { flex: 1, fontSize: fs['3xl'], fontWeight: '700' },
  weightInputSuffix: { fontSize: fs.md, fontWeight: '700' },
});
