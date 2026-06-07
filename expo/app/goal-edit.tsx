import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deriveTargetCellFromDirection } from '@/constants/body-matrix';
import { PACE_OPTIONS } from '@/constants/onboarding';
import { Body, Button, Caption, Card, Heading, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { BodyType9, GoalDirection, PaceLevel } from '@/types/nutrition';
import {
  BMI_UNDERWEIGHT,
  bmiFromWeight,
  classifyTargetWeight,
  deriveDirectionFromWeights,
  estimateMonthsToTarget,
  formatGoalDuration,
  recommendGoal,
} from '@/utils/goals';

// 警告色 (design-system に feedback トークンが無いためリテラル)。soft=amber700 / hard=red700。
const WARN_SOFT_COLOR = '#B45309';
const WARN_HARD_COLOR = '#B91C1C';

const DIRECTION_OPTIONS: { key: GoalDirection; label: string }[] = [
  { key: 'lose', label: '減らす' },
  { key: 'maintain', label: '維持' },
  { key: 'recomp', label: '引き締め' },
  { key: 'gain', label: '増やす' },
];

export default function GoalEditRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, updateProfileValues } = useAppState();

  const [direction, setDirection] = useState<GoalDirection | null>(profile.goalDirection ?? null);
  const [paceLevel, setPaceLevel] = useState<PaceLevel | null>(profile.paceLevel ?? null);
  // v1.7 (PRD §6.4.4): 目標体重の手動指定 (null = おまかせ)。
  const [manualTargetKg, setManualTargetKg] = useState<number | null>(null);
  const [targetText, setTargetText] = useState('');

  const currentBodyType9 = profile.currentBodyType9 ?? null;
  const currentWeightKg = profile.currentWeightKg;
  const isManual = manualTargetKg != null;

  // 手動指定時は入力体重から目的を自動導出する。
  const effectiveDirection: GoalDirection | null =
    isManual && currentWeightKg != null
      ? deriveDirectionFromWeights(currentWeightKg, manualTargetKg!)
      : direction;

  const derivedTarget: BodyType9 | null = useMemo(() => {
    if (!effectiveDirection || !currentBodyType9) return null;
    return deriveTargetCellFromDirection(currentBodyType9, effectiveDirection);
  }, [effectiveDirection, currentBodyType9]);

  const preview = useMemo(() => {
    if (!effectiveDirection) return null;
    const needsPace = effectiveDirection !== 'maintain' && effectiveDirection !== 'recomp';
    if (needsPace && !paceLevel) return null;
    const base = recommendGoal({
      heightCm: profile.heightCm,
      weightKg: profile.currentWeightKg,
      ageYears: profile.ageYears ?? null,
      basis: profile.biologicalBasis ?? null,
      direction: effectiveDirection,
      activityLevel: profile.activityLevel ?? null,
      paceLevel: needsPace ? paceLevel : null,
      targetBodyType9: derivedTarget,
      currentBodyFatPct: profile.currentBodyFatPct ?? null,
      currentStage: profile.currentBodyStage,
      targetStage: profile.targetBodyStage,
    });
    if (!base) return null;
    // 手動指定: 行き先(アンカー)だけ上書き。kcal/PFC は現在体重×ペースのまま (安全, PRD §6.4.4)。
    return isManual ? { ...base, targetWeightKg: manualTargetKg! } : base;
  }, [effectiveDirection, paceLevel, derivedTarget, profile, isManual, manualTargetKg]);

  // 手動指定の健康判定・ETA (PRD §6.4.4)。
  const guardVerdict = isManual ? classifyTargetWeight(manualTargetKg, profile.heightCm) : 'ok';
  const etaMonths =
    isManual && currentWeightKg != null && paceLevel &&
    (effectiveDirection === 'lose' || effectiveDirection === 'gain')
      ? estimateMonthsToTarget(currentWeightKg, manualTargetKg!, paceLevel, effectiveDirection)
      : null;

  // v1.7 (PRD §6.4.4): 目的/ペース/手動目標が実際に変わった時だけ再コミット (ドリフト防止)。
  const hasChanges =
    (isManual && profile.targetWeightKg !== manualTargetKg) ||
    effectiveDirection !== (profile.goalDirection ?? null) ||
    (paceLevel ?? null) !== (profile.paceLevel ?? null);

  // 既定(未変更)は固定アンカーを表示し、変更時のみプレビュー(=新しい提案)を表示する。
  const showPreview = (hasChanges || isManual) && preview != null;
  const card = showPreview
    ? {
        targetWeightKg: preview!.targetWeightKg,
        targetBodyFatPct: preview!.targetBodyFatPct as number | null,
        targetKcal: preview!.targetKcal,
        proteinG: preview!.proteinG,
        fatG: preview!.fatG,
        carbsG: preview!.carbsG,
      }
    : profile.targetWeightKg != null
      ? {
          targetWeightKg: profile.targetWeightKg,
          targetBodyFatPct: profile.targetBodyFatPct ?? null,
          targetKcal: profile.targetCalories,
          proteinG: profile.targetProtein,
          fatG: profile.targetFat,
          carbsG: profile.targetCarbs,
        }
      : null;

  const enterManual = useCallback(() => {
    const seed = profile.targetWeightKg ?? profile.currentWeightKg ?? 60;
    const v = Math.round(seed * 10) / 10;
    setManualTargetKg(v);
    setTargetText(v.toFixed(1));
  }, [profile.targetWeightKg, profile.currentWeightKg]);

  const exitManual = useCallback(() => {
    setManualTargetKg(null);
    setTargetText('');
  }, []);

  const applyManual = useCallback((v: number) => {
    const clamped = Math.min(200, Math.max(30, Math.round(v * 10) / 10));
    setManualTargetKg(clamped);
    setTargetText(clamped.toFixed(1));
  }, []);

  const onChangeTargetText = useCallback((t: string) => {
    setTargetText(t);
    const n = parseFloat(t);
    if (Number.isFinite(n)) setManualTargetKg(Math.round(n * 10) / 10);
  }, []);

  // 新しいアンカーを確定して保存。
  const commit = useCallback(() => {
    if (!preview || !effectiveDirection) return;
    const needsPace = effectiveDirection !== 'maintain' && effectiveDirection !== 'recomp';
    updateProfileValues({
      goalDirection: effectiveDirection,
      paceLevel: needsPace ? paceLevel : null,
      targetBodyType9: derivedTarget,
      targetCalories: preview.targetKcal,
      targetProtein: preview.proteinG,
      targetFat: preview.fatG,
      targetCarbs: preview.carbsG,
      targetWeightKg: preview.targetWeightKg,
      targetBodyFatPct: preview.targetBodyFatPct,
    });
    router.back();
  }, [effectiveDirection, paceLevel, derivedTarget, preview, updateProfileValues, router]);

  const handleSave = useCallback(() => {
    if (!effectiveDirection) return;
    const needsPace = effectiveDirection !== 'maintain' && effectiveDirection !== 'recomp';
    if (needsPace && !paceLevel) return;
    if (guardVerdict === 'hard') return;
    if (!hasChanges) {
      router.back();
      return;
    }

    // v1.7: 減量/増量ゴール未到達でセグメントから「維持」に切替える時のみ確認 (手動指定は数値が
    // 明示の意思表示なのでスキップ, PRD §6.4.4)。
    const priorDir = profile.goalDirection;
    const switchingToMaintain =
      !isManual && direction === 'maintain' && (priorDir === 'lose' || priorDir === 'gain');
    const priorTarget = profile.targetWeightKg;
    const current = profile.currentWeightKg;
    const notReached =
      priorTarget != null &&
      current != null &&
      (priorDir === 'lose' ? current > priorTarget + 0.05 : current < priorTarget - 0.05);

    if (switchingToMaintain && notReached) {
      const verb = priorDir === 'lose' ? '減量' : '増量';
      Alert.alert(
        `まだ目標体重（${priorTarget!.toFixed(1)}kg）に届いていません`,
        undefined,
        [
          {
            text: `${verb}を続ける`,
            style: 'cancel',
            onPress: () => setDirection(priorDir ?? null),
          },
          {
            text: `今の体重（${current!.toFixed(1)}kg）を維持`,
            onPress: commit,
          },
        ]
      );
      return;
    }
    commit();
  }, [effectiveDirection, direction, paceLevel, guardVerdict, hasChanges, isManual, profile, commit, router]);

  const noNeedPace = effectiveDirection === 'maintain' || effectiveDirection === 'recomp';
  const canSave =
    effectiveDirection != null &&
    (noNeedPace || paceLevel != null) &&
    preview != null &&
    hasChanges &&
    guardVerdict !== 'hard';

  // 手動指定カードの派生テキスト (PRD §6.4.4 文言表)。
  const deltaKg = isManual && currentWeightKg != null ? manualTargetKg! - currentWeightKg : null;
  const deltaLine =
    deltaKg == null
      ? null
      : Math.abs(deltaKg) < 0.05
        ? '現在の体重を維持します'
        : `現在 ${currentWeightKg!.toFixed(1)} → 目標 ${manualTargetKg!.toFixed(1)}（${
            deltaKg < 0 ? '−' : '＋'
          }${Math.abs(deltaKg).toFixed(1)} kg）`;
  const paceLabel = paceLevel ? PACE_OPTIONS.find((p) => p.key === paceLevel)?.label ?? null : null;
  const etaText =
    etaMonths != null && paceLabel ? `${paceLabel}ペースで${formatGoalDuration(etaMonths)}の見込み` : null;
  let warnText: string | null = null;
  let warnColor = WARN_SOFT_COLOR;
  if (isManual && manualTargetKg != null && profile.heightCm) {
    const bmi = Math.round(bmiFromWeight(manualTargetKg, profile.heightCm) * 10) / 10;
    if (guardVerdict === 'hard') {
      warnText = '健康的な目安を大きく下回るため、この値では設定できません';
      warnColor = WARN_HARD_COLOR;
    } else if (guardVerdict === 'soft') {
      warnText =
        bmi < BMI_UNDERWEIGHT
          ? `標準的な体重の目安より低めです（BMI ${bmi}）`
          : `標準的な体重の目安より高めです（BMI ${bmi}）`;
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '目標を変更',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <View style={styles.container} testID="goal-edit-screen">

            {/* PREVIEW — live update */}
            <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
              {card ? (
                <>
                  <View style={styles.cardHeaderRow}>
                    <Caption tone="secondary">
                      {isManual ? '自分で設定' : showPreview ? '変更後の目標（プレビュー）' : '現在の目標'}
                    </Caption>
                    {isManual ? (
                      <Pressable onPress={exitManual} hitSlop={8} testID="goal-target-auto">
                        <Caption tone="secondary">おまかせに戻す</Caption>
                      </Pressable>
                    ) : (
                      <Pressable onPress={enterManual} hitSlop={8} testID="goal-target-edit">
                        <Caption tone="secondary">数値で指定 ✎</Caption>
                      </Pressable>
                    )}
                  </View>

                  {isManual ? (
                    <View style={{ gap: 4 }}>
                      <View style={styles.stepperRow}>
                        <StepperButton
                          label="−"
                          accessibilityLabel="0.5kg 減らす"
                          onPress={() => applyManual((manualTargetKg ?? 0) - 0.5)}
                        />
                        <View style={styles.targetInputWrap}>
                          <TextInput
                            value={targetText}
                            onChangeText={onChangeTargetText}
                            onBlur={() => applyManual(manualTargetKg ?? profile.currentWeightKg ?? 60)}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            style={[styles.targetInput, { color: theme.colors.content.primary }]}
                            testID="goal-target-input"
                          />
                          <Caption tone="tertiary">kg</Caption>
                        </View>
                        <StepperButton
                          label="＋"
                          accessibilityLabel="0.5kg 増やす"
                          onPress={() => applyManual((manualTargetKg ?? 0) + 0.5)}
                        />
                      </View>
                      {deltaLine ? <Caption tone="secondary">{deltaLine}</Caption> : null}
                      {etaText ? <Caption tone="tertiary">{etaText}</Caption> : null}
                      {warnText ? (
                        <Caption tone="secondary" style={{ color: warnColor }}>
                          {warnText}
                        </Caption>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.metricsRow}>
                      <MetricBlock label="目標体重" value={card.targetWeightKg.toFixed(1)} unit="kg" />
                      <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
                      <MetricBlock
                        label="目標BF%"
                        value={card.targetBodyFatPct != null ? String(card.targetBodyFatPct) : '—'}
                        unit="%"
                      />
                    </View>
                  )}

                  <View style={[styles.hr, { backgroundColor: theme.colors.border.subtle }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                    <Heading size="2xl">{card.targetKcal}</Heading>
                    <Caption tone="tertiary" style={{ marginBottom: 4 }}>kcal / 日</Caption>
                  </View>
                  <Caption tone="secondary">
                    P {card.proteinG}g · F {card.fatG}g · C {card.carbsG}g
                  </Caption>
                </>
              ) : (
                <Body tone="tertiary">目的{direction == null ? '' : '・ペース'}を選ぶとここに表示されます</Body>
              )}
            </Card>

            {/* DIRECTION — segmented (手動指定中は非表示・目的は自動導出, PRD §6.4.4) */}
            {!isManual ? (
              <View style={{ gap: theme.spacing['2'] }}>
                <Caption tone="secondary">目的</Caption>
                <SegmentedRow
                  options={DIRECTION_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
                  value={direction}
                  onChange={(k) => setDirection(k as GoalDirection)}
                  testIDPrefix="goal-direction"
                />
              </View>
            ) : null}

            {/* PACE — segmented (maintain/recomp時は非表示) */}
            {effectiveDirection !== 'maintain' && effectiveDirection !== 'recomp' ? (
              <View style={{ gap: theme.spacing['2'] }}>
                <Caption tone="secondary">ペース</Caption>
                <SegmentedRow
                  options={PACE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
                  value={paceLevel}
                  onChange={(k) => setPaceLevel(k as PaceLevel)}
                  testIDPrefix="goal-pace"
                />
              </View>
            ) : null}

            <View style={{ flex: 1 }} />

            <Button label="保存" onPress={handleSave} disabled={!canSave} testID="goal-save" />
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

function StepperButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepperBtn,
        {
          backgroundColor: pressed ? theme.colors.surface.sunken : theme.colors.surface.raised,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text style={{ fontSize: 22, fontWeight: '600', color: theme.colors.content.primary }}>{label}</Text>
    </Pressable>
  );
}

function MetricBlock({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metricBlock}>
      <Caption tone="tertiary">{label}</Caption>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <Heading size="xl">{value}</Heading>
        <Caption tone="tertiary" style={{ marginBottom: 3, color: theme.colors.content.tertiary }}>
          {unit}
        </Caption>
      </View>
    </View>
  );
}

function SegmentedRow({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (k: string) => void;
  testIDPrefix: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: theme.colors.surface.sunken, borderColor: theme.colors.border.subtle },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              active
                ? {
                    backgroundColor: theme.colors.action.primary.default,
                  }
                : null,
            ]}
            testID={`${testIDPrefix}-${opt.key}`}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: active ? '700' : '600',
                color: active ? theme.colors.content.onAction : theme.colors.content.primary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  container: { flex: 1, padding: 18, gap: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metricBlock: { flex: 1, gap: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  targetInput: { fontSize: 30, fontWeight: '700', minWidth: 96, textAlign: 'center', padding: 0 },
  divider: { width: StyleSheet.hairlineWidth, height: 40, marginHorizontal: 8 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
});
