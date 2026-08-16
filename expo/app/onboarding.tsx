import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
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
  Icon,
  IconButton,
  Label,
  MacroCard,
  NumberField,
  SelectCard,
  useTheme,
  type IconName,
  type Theme,
} from '@/design-system';
import { colors } from '@/design-system/tokens/primitives/colors';
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

// ペースの強さを段階的に示す signal-bar アイコン (1〜3本)。
const PACE_ICON: Record<PaceLevel, IconName> = {
  gentle: 'levelLow',
  standard: 'levelMid',
  strong: 'levelHigh',
};

type Step = number;

export default function OnboardingRoute() {
  const router = useRouter();
  const { profile, settings, updateProfileValues, setOnboardingStep, completeOnboarding } = useAppState();
  const t = useTheme();
  const tr = useT();

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
      case 7: return direction === 'maintain' || direction === 'recomp' || !!paceLevel;
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
  const skipPlanStep = direction === 'maintain' || direction === 'recomp';

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
          colors={[t.colors.surface.default, t.colors.surface.sunken]}
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
            <IconButton
              icon="chevronLeft"
              variant="ghost"
              onPress={goBack}
              accessibilityLabel={tr('onboarding.nav.back')}
              testID="onboarding-back"
            />
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
                  title={tr('onboarding.height.title')}
                  subtitle={tr('onboarding.height.subtitle')}
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
                  title={tr('onboarding.weight.title')}
                  subtitle={tr('onboarding.weight.subtitle')}
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
                  title={tr('onboarding.age.title')}
                  subtitle={tr('onboarding.age.subtitle')}
                  value={ageYears}
                  onChange={setAgeYears}
                  suffix={tr('onboarding.age.suffix')}
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
                label={step === TOTAL_STEPS - 1 ? tr('onboarding.nav.start') : tr('onboarding.nav.next')}
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

const stepWrap = { gap: 16, flex: 1 } as const;
const cardColBottom = { gap: 12, marginTop: 'auto' as const };

function StepBasis({ basis, onBasis }: { basis: BiologicalBasis | null; onBasis: (v: BiologicalBasis) => void }) {
  const t = useT();
  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.basis.title')}</Heading>
      <Body tone="secondary">{t('onboarding.basis.subtitle')}</Body>
      <View style={cardColBottom}>
        {BASIS_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.key}
            label={t(`onboarding.basis.${opt.key}.label`)}
            hint={t(`onboarding.basis.${opt.key}.hint`)}
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

const ACTIVITY_I18N_KEYS = ['Sedentary', 'LightlyActive', 'ModeratelyActive', 'VeryActive'] as const;

function StepActivity({
  activityLevel,
  onActivity,
}: {
  activityLevel: ActivityLevel | null;
  onActivity: (lv: ActivityLevel) => void;
}) {
  const t = useT();
  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.activity.title')}</Heading>
      <Body tone="secondary">{t('onboarding.activity.subtitle')}</Body>
      <Body size="sm" tone="secondary">{t('onboarding.activity.note')}</Body>
      <View style={cardColBottom}>
        {ACTIVITY_LEVEL_OPTIONS.map((opt, i) => (
          <SelectCard
            key={opt.level}
            label={t(`onboarding.activity.${ACTIVITY_I18N_KEYS[i]}.label`)}
            hint={t(`onboarding.activity.${ACTIVITY_I18N_KEYS[i]}.hint`)}
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
  const theme = useTheme();
  const t = useT();
  const [bfEditOpen, setBfEditOpen] = useState<boolean>(bodyFatEdited);
  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.currentBody.title')}</Heading>
      <Body tone="secondary">{t('onboarding.currentBody.subtitle')}</Body>
      <BodyTypeMatrix
        basis={basis}
        heightCm={heightCm}
        selected={selected}
        onSelect={onSelect}
        mode="current"
      />
      {selected ? (
        <View style={{ marginTop: theme.spacing['3'] }}>
          {bfEditOpen ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing['3'],
              }}
            >
              <Label>{t('onboarding.currentBody.bodyFatLabel')}</Label>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing['1'],
                  backgroundColor: theme.colors.surface.raised,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing['3'],
                  paddingVertical: theme.spacing['2'],
                  minWidth: 120,
                  borderWidth: 1,
                  borderColor: theme.colors.border.interactive,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: theme.typography.fontSize.lg,
                    color: theme.colors.content.primary,
                    fontWeight: theme.typography.fontWeight.semibold as TextStyle['fontWeight'],
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
                backgroundColor: pressed ? theme.colors.surface.sunken : theme.colors.surface.raised,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border.interactive,
                paddingVertical: theme.spacing['3'],
                paddingHorizontal: theme.spacing['3'],
              })}
            >
              <Text
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.content.primary,
                  fontWeight: theme.typography.fontWeight.semibold as TextStyle['fontWeight'],
                }}
              >
                {t('onboarding.currentBody.bodyFatLabel')}:{' '}
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold as TextStyle['fontWeight'],
                    color: theme.colors.action.primary.onContainer,
                  }}
                >
                  {bodyFatPct || '--'}%
                </Text>
                {bodyFatEdited ? null : (
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.content.tertiary,
                      fontWeight: theme.typography.fontWeight.medium as TextStyle['fontWeight'],
                    }}
                  >
                    {t('onboarding.currentBody.approxNote')}
                  </Text>
                )}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Label size="sm" tone="link">
                  {t('onboarding.currentBody.enterExact')}
                </Label>
                <Icon name="chevronRight" size={14} color={theme.colors.action.text.default} />
              </View>
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
  const t = useT();
  const DIRECTION_KEYS: GoalDirection[] = ['lose', 'maintain', 'recomp', 'gain'];
  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.direction.title')}</Heading>
      <Body tone="secondary">{t('onboarding.direction.subtitle')}</Body>
      <View style={cardColBottom}>
        {DIRECTION_KEYS.map((key) => (
          <SelectCard
            key={key}
            label={t(`onboarding.direction.${key}.label`)}
            hint={t(`onboarding.direction.${key}.hint`)}
            selected={direction === key}
            onPress={() => onDirection(key)}
            testID={`onboarding-direction-${key}`}
          />
        ))}
      </View>
    </View>
  );
}

function StepPlan({
  direction,
  currentBodyType9,
  currentWeightKg,
  currentBodyFatPct,
  paceLevel,
  onPace,
  recommendation,
}: {
  direction: GoalDirection | null;
  currentBodyType9: BodyType9 | null;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  paceLevel: PaceLevel | null;
  onPace: (p: PaceLevel) => void;
  recommendation: GoalRecommendation | null;
}) {
  const theme = useTheme();
  const t = useT();

  if (!direction) {
    return (
      <View style={stepWrap}>
        <Heading size="2xl">{t('onboarding.plan.maintainTitle')}</Heading>
        <Body tone="secondary">{t('common.needsInput')}</Body>
      </View>
    );
  }

  if (direction === 'maintain') {
    if (!recommendation) {
      return (
        <View style={stepWrap}>
          <Heading size="2xl">{t('onboarding.plan.maintainTitle')}</Heading>
          <Body tone="secondary">{t('onboarding.plan.noData')}</Body>
        </View>
      );
    }
    return (
      <View style={stepWrap}>
        <Heading size="2xl">{t('onboarding.plan.maintainTitle')}</Heading>
        <Body tone="secondary">{t('onboarding.plan.maintainNote')}</Body>
        <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
          <SummaryRow label={t('onboarding.plan.targetWeight')} value={`${recommendation.targetWeightKg.toFixed(1)} kg`} />
          <SummaryRow label={t('onboarding.plan.targetBodyFat')} value={`${recommendation.targetBodyFatPct} %`} />
          <View style={{ height: 1, backgroundColor: theme.colors.border.subtle }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label tone="secondary">{t('onboarding.plan.dailyGoal')}</Label>
            <Heading size="xl">{recommendation.targetKcal} kcal</Heading>
          </View>
          <PfcRow
            t={theme}
            protein={recommendation.proteinG}
            fat={recommendation.fatG}
            carbs={recommendation.carbsG}
          />
          {recommendation.note ? (
            <Body size="sm" weight="semibold" style={{ color: theme.colors.status.warning.default }}>
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
        <Heading size="2xl">{t('onboarding.plan.title')}</Heading>
        <Body tone="secondary">{t('onboarding.plan.noData')}</Body>
      </View>
    );
  }

  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.plan.title')}</Heading>
      <Body tone="secondary">{t('onboarding.plan.subtitle')}</Body>
      <View style={cardColBottom}>
        {PACE_OPTIONS.map((opt) => {
          const active = paceLevel === opt.key;
          const paceIcon = PACE_ICON[opt.key];
          const outcome = computePlanOutcome(currentWeightKg, currentBodyFatPct, opt.key, direction);
          const deltaSign = outcome.totalKgDelta >= 0 ? '+' : '-';
          const absDelta = Math.abs(outcome.totalKgDelta).toFixed(1);
          const monthlyAbs = Math.abs(outcome.monthlyKgDelta).toFixed(1);
          const bfDelta =
            currentBodyFatPct != null
              ? t('onboarding.plan.bfChange', { from: Math.round(currentBodyFatPct), to: outcome.finalBodyFatPct })
              : null;
          const reachHint = outcome.reachesTargetCell
            ? t('onboarding.plan.reachHint_yes')
            : t('onboarding.plan.reachHint_no');
          const recommended = opt.key === 'standard';

          return (
            <Pressable
              key={opt.key}
              onPress={() => onPace(opt.key)}
              testID={`onboarding-plan-${opt.key}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing['3'],
                paddingHorizontal: theme.spacing['4'],
                paddingVertical: theme.spacing['4'],
                borderRadius: theme.radius.lg,
                borderWidth: 2,
                borderColor: active ? theme.colors.border.selected : theme.colors.border.interactive,
                backgroundColor: active
                  ? theme.colors.action.primary.container
                  : pressed
                    ? theme.colors.surface.sunken
                    : theme.colors.surface.raised,
              })}
            >
              <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Icon
                  name={paceIcon}
                  size={28}
                  color={active ? theme.colors.action.primary.default : theme.colors.content.tertiary}
                />
              </View>
              <View style={{ flex: 1, gap: theme.spacing['0.5'] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing['2'] }}>
                  <Heading size="lg" tone={active ? 'link' : 'primary'}>
                    {t(`onboarding.plan.${opt.key}.label`)}
                  </Heading>
                  {recommended ? <Badge tone="accent">{t('common.recommended')}</Badge> : null}
                </View>
                <Body size="sm" weight="semibold">
                  {t('onboarding.plan.changeIn3mo', { sign: deltaSign, abs: absDelta })}
                  {t('onboarding.plan.monthlyRate', { sign: deltaSign, monthly: monthlyAbs })}
                </Body>
                {bfDelta ? (
                  <Caption tone="secondary" weight="semibold">
                    {bfDelta}
                  </Caption>
                ) : null}
                <Caption tone="secondary">{reachHint}</Caption>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


function StepPreview({
  recommendation,
  direction,
  paceLevel,
}: {
  recommendation: GoalRecommendation | null;
  direction: GoalDirection | null;
  paceLevel: PaceLevel | null;
}) {
  const theme = useTheme();
  const t = useT();
  const tipsByDir = t('onboarding.tips', { returnObjects: true }) as Record<GoalDirection, string[]>;
  if (!recommendation) {
    return (
      <View style={stepWrap}>
        <Heading size="2xl">{t('onboarding.preview.title')}</Heading>
        <Body tone="secondary">{t('common.needsInput')}</Body>
      </View>
    );
  }
  const tips = direction ? (tipsByDir[direction] ?? []) : [];
  const paceLabel = paceLevel ? t(`onboarding.plan.${paceLevel}.label`) : null;

  return (
    <View style={stepWrap}>
      <Heading size="2xl">{t('onboarding.preview.title')}</Heading>
      <Body tone="secondary">{t('onboarding.preview.subtitle')}</Body>

      <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
        <SummaryRow label={t('onboarding.preview.targetWeight')} value={`${recommendation.targetWeightKg.toFixed(1)} kg`} />
        <SummaryRow label={t('onboarding.preview.targetBodyFat')} value={`${recommendation.targetBodyFatPct} %`} />
        <View style={{ height: 1, backgroundColor: theme.colors.border.subtle }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Label tone="secondary">{t('onboarding.preview.dailyGoal')}</Label>
          <Heading size="xl">{recommendation.targetKcal} kcal</Heading>
        </View>
        <PfcRow
          t={theme}
          protein={recommendation.proteinG}
          fat={recommendation.fatG}
          carbs={recommendation.carbsG}
        />
        {paceLabel ? (
          <Body size="sm" tone="link" weight="semibold">
            {t('onboarding.preview.paceLabel', { pace: paceLabel })}
          </Body>
        ) : null}
        {recommendation.note ? (
          <Body size="sm" weight="semibold" style={{ color: theme.colors.status.warning.default }}>
            {recommendation.note}
          </Body>
        ) : null}
      </Card>

      {tips.length ? (
        <Card variant="raised" style={{ gap: theme.spacing['2'] }}>
          <Label>{t('onboarding.preview.tips')}</Label>
          {tips.map((tip, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', gap: theme.spacing['2'], alignItems: 'flex-start' }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  marginTop: 1,
                  // アクション色(action.primary)はインタラクティブ要素専用。
                  // このチェックマークは「達成/良い」を示す状態表示なので
                  // status.successを使う (2026-08-07指摘)。
                  backgroundColor: theme.colors.status.success.default,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* status.success.defaultはtheme間でmoss[400]/[500]と中間トーンで
                    固定的ではないため、content.onAction(action.primary専用に調整
                    済み)は流用しない。固定の濃色アイコンで両テーマとも十分な
                    コントラストを確保する。 */}
                <Icon name="check" size={12} color={colors.stone[900]} />
              </View>
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
      <Label tone="secondary">
        {label}
      </Label>
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
  return (
    <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
      <MacroCard kind="protein" value={protein} />
      <MacroCard kind="fat" value={fat} />
      <MacroCard kind="carbs" value={carbs} />
    </View>
  );
}
