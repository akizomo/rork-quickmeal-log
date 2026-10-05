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

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/design-system';
import { TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, BottomSheet, Caption, Card, Heading, Icon, Label, MacroCard, useTheme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useHealthSyncContext } from '@/providers/health-sync-provider';
import type { HealthSyncStatus } from '@/utils/health-sync';
import { useAppState } from '@/providers/app-state-provider';
import { getEffectiveSubscriptionStatus, trialDaysRemaining } from '@/utils/goals';
import { useT } from '@/hooks/useT';
import { useUnitSystem } from '@/hooks/useUnitSystem';
import { formatDisplayWeight, weightSuffix } from '@/utils/units';

export default function StatusRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { profile, settings, weights, addWeightEntry, addBodyFatEntry } = useAppState();
  const healthSync = useHealthSyncContext();
  const [weightSheetVisible, setWeightSheetVisible] = useState<boolean>(false);
  const [weightInput, setWeightInput] = useState<string>('');
  const [bfSheetVisible, setBfSheetVisible] = useState<boolean>(false);
  const [bfInput, setBfInput] = useState<string>('');

  const { unitSystem } = useUnitSystem();
  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
  const effectiveStatus = getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS);
  const subscriptionLabel =
    effectiveStatus === 'trialing'
      ? t('status.subscriptionSub.trialing', { days: trialDays })
      : effectiveStatus === 'active'
      ? t('status.subscriptionSub.active')
      : t('status.subscriptionSub.inactive');

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
    const key = profile.paceLevel === 'gentle' ? 'gentle' : profile.paceLevel === 'strong' ? 'strong' : 'standard';
    return t(`status.paceLevel.${key}`);
  }, [profile.goalDirection, profile.paceLevel, t]);

  const wUnit = weightSuffix(unitSystem);
  const weightDisplay = profile.currentWeightKg
    ? `${formatDisplayWeight(profile.currentWeightKg, unitSystem)} ${wUnit}`
    : t('common.notSet');
  const targetWeightDisplay = profile.targetWeightKg
    ? `${formatDisplayWeight(profile.targetWeightKg, unitSystem)} ${wUnit}`
    : t('common.notSet');
  const bfDisplay = profile.currentBodyFatPct != null ? `${profile.currentBodyFatPct}%` : t('common.notSet');
  const targetBfDisplay = profile.targetBodyFatPct != null ? `${profile.targetBodyFatPct}%` : t('common.notSet');

  return (
    <>
      <Stack.Screen
        options={{
          title: t('nav.status'),
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
                accessibilityLabel={t('status.a11y.trialCard')}
                accessibilityHint={t('status.a11y.trialHint')}
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
                      {trialDays > 0
                        ? t('status.trialCard.labelWithDays', { days: trialDays })
                        : t('status.trialCard.label')}
                    </Label>
                    <Icon name="chevronRight" size={14} color={theme.colors.content.tertiary} />
                  </View>
                  <Body size="sm" tone="secondary">
                    {trialDays <= 2
                      ? t('status.trialCard.ending', { days: trialDays })
                      : t('status.trialCard.ongoing')}
                  </Body>
                </Card>
              </Pressable>
            ) : null}

            {/* HERO */}
            <Card variant="raised" style={{ gap: theme.spacing['4'] }}>
              <View style={styles.heroMetricRow}>
                <HeroMetric label={t('status.weight')} value={weightDisplay} target={targetWeightDisplay} t={t} />
                <View style={[styles.heroDivider, { backgroundColor: theme.colors.border.subtle }]} />
                <HeroMetric label={t('status.bodyFat')} value={bfDisplay} target={targetBfDisplay} t={t} />
              </View>
              <View style={styles.recordButtonRow}>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setWeightSheetVisible(true)}
                  testID="status-update-weight"
                  accessibilityRole="button"
                  accessibilityLabel={t('status.recordWeight')}
                >
                  <Label size="sm" tone="link">{t('status.recordWeight')}</Label>
                </Pressable>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setBfSheetVisible(true)}
                  testID="status-update-bf"
                  accessibilityRole="button"
                  accessibilityLabel={t('status.recordBodyFat')}
                >
                  <Label size="sm" tone="link">{t('status.recordBodyFat')}</Label>
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
                      t('status.a11y.diagTitle'),
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
              accessibilityLabel={t('status.a11y.goalCard')}
              accessibilityHint={t('status.a11y.goalHint')}
            >
              <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
                <View style={styles.goalHeader}>
                  <Label>{t('status.goal')}</Label>
                  <View style={styles.changeRow}>
                    <Caption tone="secondary">{t('status.change')}</Caption>
                    <Icon name="chevronRight" size={14} color={theme.colors.content.tertiary} />
                  </View>
                </View>
                <View style={styles.kcalRow}>
                  <Heading size="3xl">{profile.targetCalories || '--'}</Heading>
                  <Caption tone="secondary" style={{ marginLeft: 4, marginBottom: 8 }}>{t('common.unit.kcalPerDay')}</Caption>
                </View>
                <View style={styles.pfcRow}>
                  <MacroCard kind="protein" value={profile.targetProtein} />
                  <MacroCard kind="fat" value={profile.targetFat} />
                  <MacroCard kind="carbs" value={profile.targetCarbs} />
                </View>
                {paceLabel ? (
                  <Caption tone="secondary">
                    {t('status.paceLabel', { label: paceLabel })}
                  </Caption>
                ) : null}
              </Card>
            </Pressable>

            {/* §あなた */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('status.sections.you')}</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label={t('nav.profile')}
                  onPress={() => router.push('/profile')}
                  testID="status-link-profile"
                />
              </SettingsListCard>
            </View>

            {/* §アプリ */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('status.sections.app')}</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label={t('nav.subscription')}
                  sub={subscriptionLabel}
                  onPress={() => router.push('/subscription')}
                  testID="status-link-subscription"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label={t('nav.settings')}
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
  const t = useT();
  const label = useMemo(() => {
    if (syncing) return t('status.health.syncing');
    if (status === 'provider_missing') return t('status.health.providerMissing');
    if (status === 'provider_update_required') return t('status.health.providerUpdate');
    if (lastError) return t('status.health.syncError');
    if (status === 'authorized' && lastSyncedAt) return t('status.health.syncedAt', { time: formatRelativeTime(lastSyncedAt, t) });
    return t('status.health.sync');
  }, [syncing, lastError, status, lastSyncedAt, t]);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRelativeTime(iso: string, t: (key: string, opts?: any) => any): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return t('status.timeAgo.justNow');
  if (diffSec < 3600) return t('status.timeAgo.minutes', { n: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return t('status.timeAgo.hours', { n: Math.floor(diffSec / 3600) });
  return t('status.timeAgo.days', { n: Math.floor(diffSec / 86400) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroMetric({ label, value, target, t }: { label: string; value: string; target: string; t: (key: string, opts?: any) => any }) {
  return (
    <View style={styles.heroMetric}>
      <Caption tone="secondary">{label}</Caption>
      <Heading size="2xl">{value}</Heading>
      <Caption tone="secondary">{t('status.targetLabel', { value: target })}</Caption>
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
  const t = useT();
  const diff =
    currentBfPct !== null && value !== '' ? Number((Number(value) - currentBfPct).toFixed(1)) : null;
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('status.bfSheet.title')}
      scrollable={false}
      primaryAction={{ label: t('common.save'), onPress: onSubmit }}
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
        <Text style={[styles.weightInputSuffix, { color: theme.colors.content.secondary }]}>%</Text>
      </View>
      {diff !== null && Number.isFinite(diff) ? (
        <Caption tone="secondary">
          {t('status.bfSheet.diff', { diff: `${diff > 0 ? '+' : ''}${diff}` })}
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
  const t = useT();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('status.weightSheet.title')}
      scrollable={false}
      primaryAction={{ label: t('common.save'), onPress: onSubmit }}
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
        <Text style={[styles.weightInputSuffix, { color: theme.colors.content.secondary }]}>kg</Text>
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
  section: { gap: 8 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 16 },
  weightInput: { flex: 1, fontSize: fs['3xl'], fontWeight: '700' },
  weightInputSuffix: { fontSize: fs.md, fontWeight: '700' },
});
