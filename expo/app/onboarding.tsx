import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InputAccessoryView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyTypeMatrix } from '@/components/BodyTypeMatrix';
import { BodyTypeSilhouette } from '@/components/BodyTypeSilhouette';
import {
  bodyType9ToStage,
  deriveTargetCellFromDirection,
  getCellBodyFatTypical,
  getCellRef,
} from '@/constants/body-matrix';
import {
  ACTIVITY_LEVEL_OPTIONS,
  BASIS_OPTIONS,
  PACE_OPTIONS,
} from '@/constants/onboarding';
import {
  Badge,
  Body,
  Button,
  Card,
  Caption,
  Heading,
  NumberField,
  SelectCard,
  useTheme,
  type Theme,
} from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import {
  ActivityLevel,
  BiologicalBasis,
  BodyStage,
  BodyType9,
  GoalDirection,
  PaceLevel,
} from '@/types/nutrition';
import { computePlanOutcome, recommendGoal, type GoalRecommendation } from '@/utils/goals';

// Step layout:
// 0=basis, 1=height, 2=weight, 3=age, 4=activity,
// 5=current-body, 6=direction, 7=plan, 8=preview
const TOTAL_STEPS = 9;
const ACCESSORY_ID = 'onboarding-next';

type Step = number;

export default function OnboardingRoute() {
  const router = useRouter();
  const { profile, settings, updateProfileValues, setOnboardingStep, completeOnboarding } = useAppState();
  const t = useTheme();

  const [step, setStep] = useState<Step>(() => Math.min(settings.onboardingStep ?? 0, TOTAL_STEPS - 1));

  // Phase 1 inputs
  const [basis, setBasis] = useState<BiologicalBasis | null>(profile.biologicalBasis ?? null);
  const [heightCm, setHeightCm] = useState<string>(profile.heightCm ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState<string>(profile.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [ageYears, setAgeYears] = useState<string>(profile.ageYears ? String(profile.ageYears) : '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activityLevel ?? null);

  // Body & goal
  const [bodyFatPct, setBodyFatPct] = useState<string>(profile.currentBodyFatPct ? String(profile.currentBodyFatPct) : '');
  const [bodyFatEdited, setBodyFatEdited] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<BodyStage | null>(profile.currentBodyStage ?? null);
  const [currentBodyType9, setCurrentBodyType9] = useState<BodyType9 | null>(profile.currentBodyType9 ?? null);
  const [direction, setDirection] = useState<GoalDirection | null>(profile.goalDirection ?? null);
  const [paceLevel, setPaceLevel] = useState<PaceLevel | null>(profile.paceLevel ?? null);

  const targetBodyType9 = useMemo<BodyType9 | null>(() => {
    if (!currentBodyType9 || !direction) return null;
    return deriveTargetCellFromDirection(currentBodyType9, direction);
  }, [currentBodyType9, direction]);

  const targetStage = useMemo<BodyStage | null>(() => {
    return targetBodyType9 ? bodyType9ToStage(targetBodyType9) : null;
  }, [targetBodyType9]);

  const setOnboardingStepRef = useRef(setOnboardingStep);
  useEffect(() => {
    setOnboardingStepRef.current = setOnboardingStep;
  }, [setOnboardingStep]);
  useEffect(() => {
    setOnboardingStepRef.current(step);
  }, [step]);

  const recommendation = useMemo(() => {
    return recommendGoal({
      heightCm: Number(heightCm) || null,
      weightKg: Number(weightKg) || null,
      ageYears: Number(ageYears) || null,
      basis,
      direction,
      activityLevel,
      paceLevel,
      targetBodyType9,
      currentBodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
      currentStage,
      targetStage,
    });
  }, [activityLevel, ageYears, basis, bodyFatPct, currentStage, direction, heightCm, paceLevel, targetBodyType9, targetStage, weightKg]);

  const currentPfc = useMemo(() => {
    if (!recommendation) return { proteinG: 0, fatG: 0, carbsG: 0 };
    return {
      proteinG: recommendation.proteinG,
      fatG: recommendation.fatG,
      carbsG: recommendation.carbsG,
    };
  }, [recommendation]);

  const heightOk = Number(heightCm) >= 120 && Number(heightCm) <= 220;
  const weightOk = Number(weightKg) >= 30 && Number(weightKg) <= 200;
  const ageOk = Number(ageYears) >= 13 && Number(ageYears) <= 100;

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!basis;
      case 1: return heightOk;
      case 2: return weightOk;
      case 3: return ageOk;
      case 4: return !!activityLevel;
      case 5: return currentBodyType9 !== null;
      case 6: return !!direction;
      case 7: return direction === 'maintain' || !!paceLevel;
      case 8: return recommendation !== null;
      default: return true;
    }
  }, [activityLevel, ageOk, basis, currentBodyType9, direction, heightOk, paceLevel, recommendation, step, weightOk]);

  const saveAllCurrent = useCallback(() => {
    updateProfileValues({
      heightCm: Number(heightCm) || null,
      currentWeightKg: Number(weightKg) || null,
      ageYears: Number(ageYears) || null,
      biologicalBasis: basis,
      activityLevel,
      paceLevel,
      currentBodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
      currentBodyStage: currentStage,
      currentBodyType9,
      goalDirection: direction,
      targetBodyStage: targetStage,
      targetBodyType9,
      targetWeightKg: recommendation?.targetWeightKg ?? null,
      targetBodyFatPct: recommendation?.targetBodyFatPct ?? null,
      targetCalories: recommendation?.targetKcal ?? 0,
      targetProtein: currentPfc.proteinG,
      targetFat: currentPfc.fatG,
      targetCarbs: currentPfc.carbsG,
    });
  }, [activityLevel, ageYears, basis, bodyFatPct, currentBodyType9, currentPfc.carbsG, currentPfc.fatG, currentPfc.proteinG, currentStage, direction, heightCm, paceLevel, recommendation, targetBodyType9, targetStage, updateProfileValues, weightKg]);

  // 維持目標はペース選択が不要なため、step 7 (StepPlan) を飛ばす。
  const skipPlanStep = direction === 'maintain';

  const goNext = useCallback(() => {
    saveAllCurrent();
    if (step < TOTAL_STEPS - 1) {
      const nextStep = step === 6 && skipPlanStep ? 8 : step + 1;
      setStep(nextStep);
    } else {
      completeOnboarding();
      router.replace('/');
    }
  }, [completeOnboarding, router, saveAllCurrent, skipPlanStep, step]);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.back();
      return;
    }
    const prevStep = step === 8 && skipPlanStep ? 6 : step - 1;
    setStep(prevStep);
  }, [router, skipPlanStep, step]);

  // 進捗表示も維持時は 8 ステップ扱いにする (step 7 をスキップした分を縮める)。
  const totalDisplaySteps = skipPlanStep ? TOTAL_STEPS - 1 : TOTAL_STEPS;
  const displayStep = skipPlanStep && step > 7 ? step : step + 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: t.colors.surface.default }} testID="onboarding-screen">
        <LinearGradient
          colors={[t.colors.surface.default, t.colors.surface.overlay]}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* Header: back / progress / step count */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing['4'],
              paddingTop: t.spacing['1'],
              paddingBottom: t.spacing['2'],
              gap: t.spacing['3'],
            }}
          >
            <Pressable
              onPress={goBack}
              testID="onboarding-back"
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? t.colors.surface.sunken : t.colors.surface.raised,
              })}
            >
              <ChevronLeft size={20} color={t.colors.content.primary} />
            </Pressable>
            <View
              style={{
                flex: 1,
                height: 4,
                backgroundColor: t.colors.border.subtle,
                borderRadius: t.radius.xs,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${(displayStep / totalDisplaySteps) * 100}%`,
                  backgroundColor: t.colors.action.primary.default,
                  borderRadius: t.radius.xs,
                }}
              />
            </View>
            <Caption weight="semibold">
              {displayStep}/{totalDisplaySteps}
            </Caption>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: t.spacing['5'],
                paddingTop: t.spacing['3'],
                paddingBottom: t.spacing['5'],
                flexGrow: 1,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {step === 0 ? <StepBasis basis={basis} onBasis={setBasis} /> : null}

              {step === 1 ? (
                <StepNumber
                  title="身長を教えてください"
                  subtitle="→ 必要カロリー計算に使います"
                  value={heightCm}
                  onChange={setHeightCm}
                  suffix="cm"
                  keyboardType="decimal-pad"
                  testID="onboarding-height"
                  inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                  onSubmitEditing={() => { if (canNext) goNext(); }}
                />
              ) : null}

              {step === 2 ? (
                <StepNumber
                  title="現在の体重は？"
                  subtitle="→ 必要カロリー・タンパク質量の基準になります"
                  value={weightKg}
                  onChange={setWeightKg}
                  suffix="kg"
                  keyboardType="decimal-pad"
                  testID="onboarding-weight"
                  inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                  onSubmitEditing={() => { if (canNext) goNext(); }}
                />
              ) : null}

              {step === 3 ? (
                <StepNumber
                  title="年齢を教えてください"
                  subtitle="→ 基礎代謝の計算に使います"
                  value={ageYears}
                  onChange={setAgeYears}
                  suffix="歳"
                  keyboardType="number-pad"
                  testID="onboarding-age"
                  inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                  onSubmitEditing={() => { if (canNext) goNext(); }}
                />
              ) : null}

              {step === 4 ? (
                <StepActivity activityLevel={activityLevel} onActivity={setActivityLevel} />
              ) : null}

              {step === 5 ? (
                <StepCurrentBody
                  basis={basis ?? 'male_basis'}
                  heightCm={Number(heightCm) || null}
                  bodyFatPct={bodyFatPct}
                  bodyFatEdited={bodyFatEdited}
                  selected={currentBodyType9}
                  onSelect={(cell) => {
                    setCurrentBodyType9(cell);
                    setCurrentStage(bodyType9ToStage(cell));
                    if (basis) {
                      const ref = getCellRef(basis, cell);
                      setBodyFatPct(String(getCellBodyFatTypical(ref)));
                    }
                    setBodyFatEdited(false);
                  }}
                  onBodyFatChange={(v) => {
                    setBodyFatPct(v);
                    setBodyFatEdited(v.length > 0);
                  }}
                />
              ) : null}

              {step === 6 ? <StepDirection direction={direction} onDirection={setDirection} /> : null}

              {step === 7 ? (
                <StepPlan
                  basis={basis ?? 'male_basis'}
                  direction={direction}
                  currentBodyType9={currentBodyType9}
                  currentWeightKg={Number(weightKg) || null}
                  currentBodyFatPct={bodyFatPct ? Number(bodyFatPct) : null}
                  paceLevel={paceLevel}
                  onPace={setPaceLevel}
                  recommendation={recommendation}
                />
              ) : null}

              {step === 8 ? (
                <StepPreview recommendation={recommendation} direction={direction} paceLevel={paceLevel} />
              ) : null}
            </ScrollView>

            {/* Footer: CTA */}
            <View
              style={{
                paddingHorizontal: t.spacing['5'],
                paddingTop: t.spacing['2'],
                paddingBottom: t.spacing['2'],
                gap: t.spacing['2'],
              }}
            >
              <Button
                label={step === TOTAL_STEPS - 1 ? 'はじめる' : '次へ'}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canNext}
                onPress={goNext}
                testID="onboarding-next"
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View
            style={{
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['2'],
              paddingBottom: t.spacing['2'],
              gap: t.spacing['2'],
              backgroundColor: t.colors.surface.default,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: t.colors.border.default,
            }}
          >
            <Button
              label={step === TOTAL_STEPS - 1 ? 'はじめる' : '次へ'}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canNext}
              onPress={goNext}
              testID="onboarding-next-accessory"
            />
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

/* -------- Step components -------- */

const stepWrap = { gap: 14, flex: 1 } as const;
const cardColBottom = { gap: 10, marginTop: 'auto' as const };

function StepBasis({ basis, onBasis }: { basis: BiologicalBasis | null; onBasis: (v: BiologicalBasis) => void }) {
  return (
    <View style={stepWrap}>
      <Heading size="2xl">身体の基準を教えてください</Heading>
      <Body tone="secondary">→ 体脂肪率やカロリー目安の計算に使います</Body>
      <View style={cardColBottom}>
        {BASIS_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.key}
            label={opt.label}
            selected={basis === opt.key}
            onPress={() => onBasis(opt.key)}
            testID={`onboarding-basis-${opt.key}`}
          />
        ))}
      </View>
    </View>
  );
}

function StepNumber({
  title,
  subtitle,
  value,
  onChange,
  suffix,
  placeholder,
  keyboardType,
  testID,
  inputAccessoryViewID,
  onSubmitEditing,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
  testID?: string;
  inputAccessoryViewID?: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={stepWrap}>
      <Heading size="2xl">{title}</Heading>
      <Body tone="secondary">{subtitle}</Body>
      <View style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <NumberField
          value={value}
          onChangeText={onChange}
          suffix={suffix}
          decimal={keyboardType === 'decimal-pad'}
          size="display"
          align="center"
          placeholder={placeholder}
          autoFocus
          testID={testID}
          inputAccessoryViewID={inputAccessoryViewID}
          returnKeyType="next"
          onSubmitEditing={onSubmitEditing}
        />
      </View>
    </View>
  );
}

function StepActivity({
  activityLevel,
  onActivity,
}: {
  activityLevel: ActivityLevel | null;
  onActivity: (lv: ActivityLevel) => void;
}) {
  return (
    <View style={stepWrap}>
      <Heading size="2xl">普段の生活はどんな感じ？</Heading>
      <Body tone="secondary">→ 仕事や日常の動きから 1日の代謝を見積もります</Body>
      <Caption tone="tertiary">
        運動は別途記録すれば自動で目標に加算されます。ここでは普段の生活パターンだけ選んでください。
      </Caption>
      <View style={cardColBottom}>
        {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.level}
            label={opt.label}
            hint={opt.hint}
            selected={activityLevel === opt.level}
            onPress={() => onActivity(opt.level)}
            testID={`onboarding-activity-${opt.level}`}
          />
        ))}
      </View>
    </View>
  );
}

function StepCurrentBody({
  basis,
  heightCm,
  bodyFatPct,
  bodyFatEdited,
  selected,
  onSelect,
  onBodyFatChange,
}: {
  basis: BiologicalBasis;
  heightCm: number | null;
  bodyFatPct: string;
  bodyFatEdited: boolean;
  selected: BodyType9 | null;
  onSelect: (cell: BodyType9) => void;
  onBodyFatChange: (v: string) => void;
}) {
  const t = useTheme();
  const [bfEditOpen, setBfEditOpen] = useState<boolean>(bodyFatEdited);
  return (
    <View style={stepWrap}>
      <Heading size="2xl">今の自分に近いのは？</Heading>
      <Body tone="secondary">
        → 脂肪と筋量の2軸で、いちばん近い体格を選んでください。選ぶと体脂肪率の目安が自動で入ります。
      </Body>
      <BodyTypeMatrix
        basis={basis}
        heightCm={heightCm}
        selected={selected}
        onSelect={onSelect}
        mode="current"
      />
      {selected ? (
        <View style={{ marginTop: t.spacing['3'] }}>
          {bfEditOpen ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: t.spacing['3'],
              }}
            >
              <Body weight="semibold">体脂肪率</Body>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing['1'],
                  backgroundColor: t.colors.surface.raised,
                  borderRadius: t.radius.md,
                  paddingHorizontal: t.spacing['3'],
                  paddingVertical: t.spacing['2'],
                  minWidth: 120,
                  borderWidth: 1,
                  borderColor: t.colors.border.subtle,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: t.typography.fontSize.lg,
                    color: t.colors.content.primary,
                    fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
                    textAlign: 'right',
                  }}
                  value={bodyFatPct}
                  onChangeText={onBodyFatChange}
                  keyboardType="decimal-pad"
                  testID="onboarding-bodyfat"
                  inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                />
                <Caption tone="secondary" weight="semibold">
                  %
                </Caption>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setBfEditOpen(true)}
              testID="onboarding-bodyfat-edit"
              style={({ pressed }) => ({
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: pressed ? t.colors.surface.sunken : t.colors.surface.raised,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.border.subtle,
                paddingVertical: t.spacing['3'],
                paddingHorizontal: t.spacing['3'],
              })}
            >
              <Text
                style={{
                  fontSize: t.typography.fontSize.sm,
                  color: t.colors.content.primary,
                  fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
                }}
              >
                体脂肪率:{' '}
                <Text
                  style={{
                    fontSize: t.typography.fontSize.lg,
                    fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
                    color: t.colors.action.primary.onContainer,
                  }}
                >
                  {bodyFatPct || '--'}%
                </Text>
                {bodyFatEdited ? null : (
                  <Text
                    style={{
                      fontSize: t.typography.fontSize.xs,
                      color: t.colors.content.tertiary,
                      fontWeight: t.typography.fontWeight.medium as TextStyle['fontWeight'],
                    }}
                  >
                    （目安）
                  </Text>
                )}
              </Text>
              <Body size="sm" tone="link" weight="semibold">
                正確な値を入力 ▸
              </Body>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function StepDirection({
  direction,
  onDirection,
}: {
  direction: GoalDirection | null;
  onDirection: (d: GoalDirection) => void;
}) {
  const opts: { key: GoalDirection; label: string; hint: string }[] = [
    { key: 'lose', label: '減らしたい', hint: '体重・体脂肪率を落とす' },
    { key: 'maintain', label: '維持したい', hint: '今の体格をキープ' },
    { key: 'gain', label: '増やしたい', hint: '体重・筋量を増やす' },
  ];
  return (
    <View style={stepWrap}>
      <Heading size="2xl">どう変わりたいですか？</Heading>
      <Body tone="secondary">→ プランの提案に使います。あとから変更できます。</Body>
      <View style={cardColBottom}>
        {opts.map((opt) => (
          <SelectCard
            key={opt.key}
            label={opt.label}
            hint={opt.hint}
            selected={direction === opt.key}
            onPress={() => onDirection(opt.key)}
            testID={`onboarding-direction-${opt.key}`}
          />
        ))}
      </View>
    </View>
  );
}

function StepPlan({
  basis,
  direction,
  currentBodyType9,
  currentWeightKg,
  currentBodyFatPct,
  paceLevel,
  onPace,
  recommendation,
}: {
  basis: BiologicalBasis;
  direction: GoalDirection | null;
  currentBodyType9: BodyType9 | null;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  paceLevel: PaceLevel | null;
  onPace: (p: PaceLevel) => void;
  recommendation: GoalRecommendation | null;
}) {
  const t = useTheme();

  if (!direction) {
    return (
      <View style={stepWrap}>
        <Heading size="2xl">プラン</Heading>
        <Body tone="secondary">前のステップで目的を選んでください。</Body>
      </View>
    );
  }

  if (direction === 'maintain') {
    if (!recommendation) {
      return (
        <View style={stepWrap}>
          <Heading size="2xl">今の体格をキープするプラン</Heading>
          <Body tone="secondary">前のステップの入力が必要です。</Body>
        </View>
      );
    }
    return (
      <View style={stepWrap}>
        <Heading size="2xl">今の体格をキープするプラン</Heading>
        <Body tone="secondary">
          → ペース指定は不要です。現在の体格を維持する目安はこちらです。
        </Body>
        <Card variant="raised" style={{ gap: t.spacing['3'] }}>
          <SummaryRow label="目標体重" value={`${recommendation.targetWeightKg.toFixed(1)} kg`} />
          <SummaryRow label="目標体脂肪率" value={`${recommendation.targetBodyFatPct} %`} />
          <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Body tone="secondary" weight="semibold">
              1日の目標
            </Body>
            <Heading size="xl" tone="link">
              {recommendation.targetKcal} kcal
            </Heading>
          </View>
          <PfcRow
            t={t}
            protein={recommendation.proteinG}
            fat={recommendation.fatG}
            carbs={recommendation.carbsG}
          />
          {recommendation.note ? (
            <Body size="sm" weight="semibold" style={{ color: t.colors.status.warning }}>
              {recommendation.note}
            </Body>
          ) : null}
        </Card>
      </View>
    );
  }

  if (!currentBodyType9 || !currentWeightKg) {
    return (
      <View style={stepWrap}>
        <Heading size="2xl">プラン</Heading>
        <Body tone="secondary">前のステップの入力が必要です。</Body>
      </View>
    );
  }

  const targetCell = deriveTargetCellFromDirection(currentBodyType9, direction);
  const targetStageForSilhouette = bodyType9ToStage(targetCell);

  return (
    <View style={stepWrap}>
      <Heading size="2xl">3ヶ月後、どう変わりたい？</Heading>
      <Body tone="secondary">→ 選んだプランで kcal・PFC が決まります。</Body>
      <View style={cardColBottom}>
        {PACE_OPTIONS.map((opt) => {
          const active = paceLevel === opt.key;
          const outcome = computePlanOutcome(currentWeightKg, currentBodyFatPct, opt.key, direction);
          const deltaSign = outcome.totalKgDelta >= 0 ? '+' : '-';
          const absDelta = Math.abs(outcome.totalKgDelta).toFixed(1);
          const monthlyAbs = Math.abs(outcome.monthlyKgDelta).toFixed(1);
          const bfDelta =
            currentBodyFatPct != null ? `BF ${Math.round(currentBodyFatPct)}→${outcome.finalBodyFatPct}%` : null;
          const reachHint = outcome.reachesTargetCell ? '体型が変わるペース' : '変化は小さめ';
          const recommended = opt.key === 'standard';

          return (
            <Pressable
              key={opt.key}
              onPress={() => onPace(opt.key)}
              testID={`onboarding-plan-${opt.key}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing['3'],
                paddingHorizontal: t.spacing['4'],
                paddingVertical: t.spacing['4'],
                borderRadius: t.radius.lg,
                borderWidth: 2,
                borderColor: active ? t.colors.border.focus : t.colors.border.subtle,
                backgroundColor: active
                  ? t.colors.action.primary.container
                  : pressed
                    ? t.colors.surface.sunken
                    : t.colors.surface.raised,
              })}
            >
              <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
                <BodyTypeSilhouette basis={basis} stage={targetStageForSilhouette} active={active} size={44} />
              </View>
              <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['2'] }}>
                  <Body size="lg" weight="semibold" tone={active ? 'link' : 'primary'}>
                    {opt.label}
                  </Body>
                  {recommended ? <Badge tone="accent">おすすめ</Badge> : null}
                </View>
                <Body size="sm" weight="semibold">
                  3ヶ月で {deltaSign}
                  {absDelta}kg（月{deltaSign}
                  {monthlyAbs}kg目安）
                </Body>
                {bfDelta ? (
                  <Caption tone="secondary" weight="semibold">
                    {bfDelta}
                  </Caption>
                ) : null}
                <Caption tone="tertiary">{reachHint}</Caption>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const MEAL_TIPS_BY_DIRECTION: Record<GoalDirection, string[]> = {
  lose: [
    'タンパク質を多めに — 筋量を守るため',
    '野菜・食物繊維で満腹感を保つ',
    '炭水化物はコントロールする目安で',
  ],
  maintain: [
    'バランスよく、偏らないように',
    'タンパク質は毎食コンスタントに',
    '食べすぎ・食べなさすぎどちらも避ける',
  ],
  gain: [
    'カロリー不足に注意、しっかり食べる',
    'タンパク質も炭水化物もしっかり',
    '食事回数を増やすのも有効',
  ],
};

function StepPreview({
  recommendation,
  direction,
  paceLevel,
}: {
  recommendation: GoalRecommendation | null;
  direction: GoalDirection | null;
  paceLevel: PaceLevel | null;
}) {
  const t = useTheme();
  if (!recommendation) {
    return (
      <View style={stepWrap}>
        <Heading size="2xl">おすすめの目標</Heading>
        <Body tone="secondary">前のステップの入力が必要です。</Body>
      </View>
    );
  }
  const tips = direction ? MEAL_TIPS_BY_DIRECTION[direction] : [];
  const paceLabel = paceLevel ? PACE_OPTIONS.find((p) => p.key === paceLevel)?.label ?? null : null;

  return (
    <View style={stepWrap}>
      <Heading size="2xl">この目標で進めます</Heading>
      <Body tone="secondary">→ あとで My Status からいつでも変更できます。</Body>

      <Card variant="raised" style={{ gap: t.spacing['3'] }}>
        <SummaryRow label="目標体重" value={`${recommendation.targetWeightKg.toFixed(1)} kg`} />
        <SummaryRow label="目標体脂肪率" value={`${recommendation.targetBodyFatPct} %`} />
        <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Body tone="secondary" weight="semibold">
            1日の目標
          </Body>
          <Heading size="xl" tone="link">
            {recommendation.targetKcal} kcal
          </Heading>
        </View>
        <PfcRow
          t={t}
          protein={recommendation.proteinG}
          fat={recommendation.fatG}
          carbs={recommendation.carbsG}
        />
        {paceLabel ? (
          <Body size="sm" tone="link" weight="semibold">
            ペース: {paceLabel}
          </Body>
        ) : null}
        {recommendation.note ? (
          <Body size="sm" weight="semibold" style={{ color: t.colors.status.warning }}>
            {recommendation.note}
          </Body>
        ) : null}
      </Card>

      {tips.length ? (
        <Card variant="flat" style={{ gap: t.spacing['1.5'] }}>
          <Body weight="semibold">食事のコツ</Body>
          {tips.map((tip, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', gap: t.spacing['2'], alignItems: 'flex-start' }}
            >
              <Body size="sm" tone="link" weight="bold">
                •
              </Body>
              <Body size="sm" style={{ flex: 1 }}>
                {tip}
              </Body>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Body tone="secondary" weight="semibold">
        {label}
      </Body>
      <Body weight="semibold">{value}</Body>
    </View>
  );
}

function PfcRow({
  t,
  protein,
  fat,
  carbs,
}: {
  t: Theme;
  protein: number;
  fat: number;
  carbs: number;
}) {
  // 静的に目標値を見せるだけなので背景はニュートラル (surface.sunken)。
  // macro の識別は P/F/C ラベルの色だけで担う。
  const cells: { label: 'P' | 'F' | 'C'; value: number; labelColor: string }[] = [
    { label: 'P', value: protein, labelColor: t.colors.nutrition.protein.default },
    { label: 'F', value: fat,     labelColor: t.colors.nutrition.fat.default },
    { label: 'C', value: carbs,   labelColor: t.colors.nutrition.carbs.default },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
      {cells.map((c) => (
        <View
          key={c.label}
          style={{
            flex: 1,
            backgroundColor: t.colors.surface.sunken,
            borderRadius: t.radius.md,
            paddingVertical: t.spacing['2'],
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: t.typography.fontSize.xs,
              fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
              color: c.labelColor,
            }}
          >
            {c.label}
          </Text>
          <Body weight="semibold">{c.value}g</Body>
        </View>
      ))}
    </View>
  );
}
