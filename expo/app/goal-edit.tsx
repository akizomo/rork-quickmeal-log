import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deriveTargetCellFromDirection } from '@/constants/body-matrix';
import { PACE_OPTIONS } from '@/constants/onboarding';
import { Body, Button, Caption, Card, Heading, Icon, Label, MacroCard, Overline, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { useT } from '@/hooks/useT';
import { BodyType9, GoalDirection, PaceLevel } from '@/types/nutrition';
import {
  bmiFromWeight,
  classifyTargetBodyFat,
  classifyTargetWeight,
  deriveDirectionFromWeights,
  estimateMonthsToTarget,
  projectBodyFatAtWeight,
  recommendGoal,
} from '@/utils/goals';

export default function GoalEditRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { profile, updateProfileValues } = useAppState();

  const DIRECTION_OPTIONS: { key: GoalDirection; label: string }[] = [
    { key: 'lose', label: t('goalEdit.direction.lose') },
    { key: 'maintain', label: t('goalEdit.direction.maintain') },
    { key: 'recomp', label: t('goalEdit.direction.recomp') },
    { key: 'gain', label: t('goalEdit.direction.gain') },
  ];

  const [direction, setDirection] = useState<GoalDirection | null>(profile.goalDirection ?? null);
  const [paceLevel, setPaceLevel] = useState<PaceLevel | null>(profile.paceLevel ?? null);
  // v1.7 (PRD §6.4.4): 目標体重の手動指定 (null = おまかせ)。
  const [manualTargetKg, setManualTargetKg] = useState<number | null>(null);
  const [targetText, setTargetText] = useState('');
  // 目標体脂肪率の手動指定 (null = 目標体重から推定)。手動指定モード内でのみ編集できる。
  const [manualTargetBfPct, setManualTargetBfPct] = useState<number | null>(null);
  const [bfText, setBfText] = useState('');

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
    if (!isManual) return base;
    // 手動指定: 行き先(アンカー)だけ上書き。kcal/PFC は現在体重×ペースのまま (安全, PRD §6.4.4)。
    // 体脂肪率は「その目標体重に到達した時の推定値」に置き換える。base の BF% は
    // 3ヶ月予測の体重に対応する値なので、手動体重と組にすると矛盾するため
    // (手入力があればそれを最優先)。
    const projected = projectBodyFatAtWeight(
      profile.currentWeightKg,
      profile.currentBodyFatPct ?? null,
      manualTargetKg
    );
    return {
      ...base,
      targetWeightKg: manualTargetKg!,
      targetBodyFatPct: manualTargetBfPct ?? projected ?? base.targetBodyFatPct,
    };
  }, [effectiveDirection, paceLevel, derivedTarget, profile, isManual, manualTargetKg, manualTargetBfPct]);

  // 健康判定は「自分で決めた」時だけ行う。おまかせ (アプリ側の推奨値) に対して
  // BMI/BF% の是非を指摘するのは、ユーザーが選んでいない数値への評価になり
  // VOICE.md の「静か・非評価的」なトーンに反するため。
  const guardVerdict = isManual
    ? classifyTargetWeight(preview?.targetWeightKg ?? null, profile.heightCm, effectiveDirection)
    : 'ok';
  const bfVerdict = isManual
    ? classifyTargetBodyFat(preview?.targetBodyFatPct ?? null, profile.biologicalBasis ?? null, effectiveDirection)
    : 'ok';
  // v1.7 (PRD §6.4.4): 目的/ペース/手動目標が実際に変わった時だけ再コミット (ドリフト防止)。
  const hasChanges =
    (isManual && profile.targetWeightKg !== manualTargetKg) ||
    (isManual && preview != null && (profile.targetBodyFatPct ?? null) !== preview.targetBodyFatPct) ||
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

  const etaMonths =
    currentWeightKg != null && paceLevel && card?.targetWeightKg != null &&
    (effectiveDirection === 'lose' || effectiveDirection === 'gain')
      ? estimateMonthsToTarget(currentWeightKg, card.targetWeightKg, paceLevel, effectiveDirection)
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
    setManualTargetBfPct(null);
    setBfText('');
  }, []);

  const applyManualBf = useCallback((v: number) => {
    const clamped = Math.min(60, Math.max(1, Math.round(v)));
    setManualTargetBfPct(clamped);
    setBfText(String(clamped));
  }, []);

  const onChangeBfText = useCallback((t: string) => {
    setBfText(t);
    if (t.trim() === '') {
      // 空欄 = 目標体重からの推定に戻す。
      setManualTargetBfPct(null);
      return;
    }
    const n = parseFloat(t);
    if (Number.isFinite(n)) setManualTargetBfPct(Math.round(n));
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
    updateProfileValues({
      goalDirection: effectiveDirection,
      // 維持/リコンプでもペースは保持する。null 化すると減量へ戻した時に
      // 選び直しになるため (表示側は goalDirection を見て出し分けている)。
      paceLevel,
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
    if (guardVerdict === 'hard' || bfVerdict === 'hard') return;
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
  }, [effectiveDirection, direction, paceLevel, guardVerdict, bfVerdict, hasChanges, isManual, profile, commit, router]);

  const noNeedPace = effectiveDirection === 'maintain' || effectiveDirection === 'recomp';
  // hasChanges は含めない。変更が無い時も「保存」で閉じられるようにする
  // (含めると handleSave の !hasChanges 分岐が到達不能になり、ボタンが
  //  理由なく灰色に見える)。
  const canSave =
    effectiveDirection != null &&
    (noNeedPace || paceLevel != null) &&
    preview != null &&
    guardVerdict !== 'hard' &&
    bfVerdict !== 'hard';

  // 現在→目標の差分 (1行に集約)。おまかせ・自分で決める・変更前の3状態すべてで
  // 同じ情報を出す — 手動時だけ出す理由はなく非対称だったため揃えた。
  const formatDuration = useCallback((months: number): string => {
    if (months >= 12) return t('goalEdit.duration.overYear');
    if (months < 1) return t('goalEdit.duration.weeks', { n: Math.max(1, Math.round(months * 4.345)) });
    return t('goalEdit.duration.months', { n: Math.round(months * 2) / 2 });
  }, [t]);

  const deltaKg =
    currentWeightKg != null && card?.targetWeightKg != null ? card.targetWeightKg - currentWeightKg : null;
  const deltaLine =
    deltaKg == null
      ? null
      : Math.abs(deltaKg) < 0.05
        ? t('goalEdit.delta.maintain')
        : t('goalEdit.delta.change', { sign: deltaKg < 0 ? '−' : '＋', abs: Math.abs(deltaKg).toFixed(1) }) +
          (etaMonths != null ? t('goalEdit.delta.eta', { duration: formatDuration(etaMonths) }) : '');
  // 体重の警告 (自分で決めた時のみ; 方向依存で「行き過ぎ」側しか出ない)。
  const previewTargetKg = preview?.targetWeightKg ?? null;
  let warnText: string | null = null;
  let warnColor = theme.colors.status.warning.default;
  if (showPreview && previewTargetKg != null && profile.heightCm) {
    const bmi = Math.round(bmiFromWeight(previewTargetKg, profile.heightCm) * 10) / 10;
    if (guardVerdict === 'hard') {
      warnText = t('goalEdit.warn.weightHard');
      warnColor = theme.colors.status.danger.default;
    } else if (guardVerdict === 'soft') {
      warnText = t('goalEdit.warn.weightSoft', { bmi });
    }
  }

  // 体脂肪率の警告。
  let bfWarnText: string | null = null;
  let bfWarnColor = theme.colors.status.warning.default;
  if (showPreview) {
    if (bfVerdict === 'hard') {
      bfWarnText = t('goalEdit.warn.bfHard');
      bfWarnColor = theme.colors.status.danger.default;
    } else if (bfVerdict === 'soft-low') {
      bfWarnText = t('goalEdit.warn.bfSoftLow');
    } else if (bfVerdict === 'soft-high') {
      bfWarnText = t('goalEdit.warn.bfSoftHigh');
    }
  }

  // 体脂肪率の入力欄に出す既定値 (手入力が無いときの推定)。
  const projectedBfPct = isManual
    ? projectBodyFatAtWeight(currentWeightKg, profile.currentBodyFatPct ?? null, manualTargetKg)
    : null;

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
                    <Label size="sm" tone="secondary">目標</Label>
                    {isManual ? (
                      <Pressable onPress={exitManual} hitSlop={8} testID="goal-target-auto">
                        <Label size="sm" tone="link">おまかせに戻す</Label>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={enterManual}
                        hitSlop={8}
                        testID="goal-target-edit"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Label size="sm" tone="link">自分で決める</Label>
                        <Icon name="edit" size={13} color={theme.colors.content.secondary} />
                      </Pressable>
                    )}
                  </View>

                  {isManual ? (
                    <View style={{ gap: 4 }}>
                      <View style={styles.metricsRow}>
                        <EditableMetricBlock
                          label="体重"
                          value={targetText}
                          onChangeText={onChangeTargetText}
                          onBlur={() => applyManual(manualTargetKg ?? profile.currentWeightKg ?? 60)}
                          unit="kg"
                          testID="goal-target-input"
                          accessibilityLabel="目標体重"
                        />
                        <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
                        <EditableMetricBlock
                          label="体脂肪率"
                          // 未入力時は推定値をそのまま value として見せる (placeholder にしない)。
                          // 推定値は「これから決める空欄」ではなく「使ってよい妥当な値」なので、
                          // disabled に見える薄い placeholder 色にしたくない。
                          value={bfText !== '' ? bfText : projectedBfPct != null ? String(projectedBfPct) : ''}
                          onChangeText={onChangeBfText}
                          onBlur={() => {
                            if (manualTargetBfPct != null) applyManualBf(manualTargetBfPct);
                          }}
                          unit="%"
                          testID="goal-bf-input"
                          accessibilityLabel="目標体脂肪率"
                        />
                      </View>
                      {deltaLine ? <Body size="sm" tone="secondary">{deltaLine}</Body> : null}
                      {warnText ? (
                        <Body size="sm" tone="secondary" style={{ color: warnColor }}>
                          {warnText}
                        </Body>
                      ) : null}
                      {bfWarnText ? (
                        <Body size="sm" tone="secondary" style={{ color: bfWarnColor }}>
                          {bfWarnText}
                        </Body>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ gap: 4 }}>
                      <View style={styles.metricsRow}>
                        <MetricBlock label="体重" value={card.targetWeightKg.toFixed(1)} unit="kg" />
                        <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
                        <MetricBlock
                          label="体脂肪率"
                          value={card.targetBodyFatPct != null ? String(card.targetBodyFatPct) : '—'}
                          unit="%"
                        />
                      </View>
                      {deltaLine ? <Body size="sm" tone="secondary">{deltaLine}</Body> : null}
                      {warnText ? (
                        <Body size="sm" tone="secondary" style={{ color: warnColor }}>
                          {warnText}
                        </Body>
                      ) : null}
                      {bfWarnText ? (
                        <Body size="sm" tone="secondary" style={{ color: bfWarnColor }}>
                          {bfWarnText}
                        </Body>
                      ) : null}
                    </View>
                  )}

                  <View style={[styles.hr, { backgroundColor: theme.colors.border.subtle }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    <Heading size="3xl">{card.targetKcal}</Heading>
                    <Caption tone="secondary" style={{ marginBottom: 6 }}>kcal / 日</Caption>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MacroCard kind="protein" value={card.proteinG} />
                    <MacroCard kind="fat" value={card.fatG} />
                    <MacroCard kind="carbs" value={card.carbsG} />
                  </View>
                </>
              ) : (
                <Body tone="secondary">目的{direction == null ? '' : '・ペース'}を選ぶとここに表示されます</Body>
              )}
            </Card>

            {/* DIRECTION — segmented (手動指定中は非表示・目的は自動導出, PRD §6.4.4) */}
            {!isManual ? (
              <View style={{ gap: theme.spacing['2'] }}>
                <Overline>目的</Overline>
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
                <Overline>ペース</Overline>
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

function MetricBlock({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metricBlock}>
      <Label size="sm" tone="secondary">{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Heading size="2xl">{value}</Heading>
        <Caption tone="secondary" style={{ color: theme.colors.content.tertiary }}>
          {unit}
        </Caption>
      </View>
    </View>
  );
}

/**
 * 「おまかせ」時の MetricBlock と同じ見た目 (ラベル + 大きい数値 + 単位) を保ったまま、
 * 数値部分だけがそのまま TextInput になる編集可能版。stepper ボタンは持たない —
 * 数値をタップして直接書き換える形にすることで、おまかせ⇄自分で決めるの
 * 切り替えで画面のレイアウトが変わらないようにしている。
 */
function EditableMetricBlock({
  label,
  value,
  onChangeText,
  onBlur,
  unit,
  testID,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur: () => void;
  unit: string;
  testID: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.metricBlock}>
      <Label size="sm" tone="secondary">{label}</Label>
      {/* アプリ全体の入力欄と同じ sunken ピル (status.tsx の体重/体脂肪シートと同じ表現)。
          この画面だけ独自の下線スタイルにしない。 */}
      <View
        style={[
          styles.metricInputWrap,
          {
            backgroundColor: theme.colors.surface.sunken,
            borderRadius: theme.radius.sm,
            borderWidth: focused ? 1.5 : 0,
            borderColor: theme.colors.border.focus,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.metricInput, { color: theme.colors.content.primary }]}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
        />
        <Caption tone="secondary" style={{ marginBottom: 3, color: theme.colors.content.tertiary }}>
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
    <View style={[styles.segmented, { backgroundColor: theme.colors.surface.sunken }]}>
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
                fontSize: theme.typography.fontSize.md,
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
  container: { flex: 1, padding: 20, gap: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metricBlock: { flex: 1, gap: 2 },
  // RN-Web の TextInput は既定で親の幅いっぱいに伸びる。固定幅にしないと
  // 単位ラベルがブロック右端まで押し出される。
  metricInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricInput: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    padding: 0,
    width: 64,
  },
  divider: { width: StyleSheet.hairlineWidth, height: 40, marginHorizontal: 8 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
});
