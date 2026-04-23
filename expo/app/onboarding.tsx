import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyTypeSilhouette } from '@/components/BodyTypeSilhouette';
import {
  ALL_FAVORITE_ITEMS,
  BASIS_OPTIONS,
  BODY_STAGES,
  BODY_STAGE_INFO,
  FAVORITE_DISH_ITEMS,
  FAVORITE_FOOD_ITEMS,
  MAX_FAVORITES,
  MEAL_SLOT_LABELS,
  MEAL_STYLE_OPTIONS,
} from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import {
  BiologicalBasis,
  BodyStage,
  GoalDirection,
  MealSlotKey,
  MealStyle,
  PortionTendency,
} from '@/types/nutrition';
import { recommendGoal, recomputePfcFromKcal } from '@/utils/goals';

const TOTAL_STEPS = 9;

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export default function OnboardingRoute() {
  const router = useRouter();
  const { profile, settings, updateProfileValues, updateSettingsValues, setOnboardingStep, completeOnboarding } = useAppState();

  const [step, setStep] = useState<Step>(() => Math.min((settings.onboardingStep ?? 0) as Step, TOTAL_STEPS - 1) as Step);

  const [heightCm, setHeightCm] = useState<string>(profile.heightCm ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState<string>(profile.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [ageYears, setAgeYears] = useState<string>(profile.ageYears ? String(profile.ageYears) : '');
  const [basis, setBasis] = useState<BiologicalBasis | null>(profile.biologicalBasis ?? null);
  const [bodyFatPct, setBodyFatPct] = useState<string>(profile.currentBodyFatPct ? String(profile.currentBodyFatPct) : '');
  const [currentStage, setCurrentStage] = useState<BodyStage | null>(profile.currentBodyStage ?? null);

  const [direction, setDirection] = useState<GoalDirection | null>(profile.goalDirection ?? null);
  const [targetStage, setTargetStage] = useState<BodyStage | null>(profile.targetBodyStage ?? null);

  const [targetKcal, setTargetKcal] = useState<number | null>(profile.targetCalories > 0 ? profile.targetCalories : null);
  const [targetWeight, setTargetWeight] = useState<number | null>(profile.targetWeightKg ?? null);
  const [targetBf, setTargetBf] = useState<number | null>(profile.targetBodyFatPct ?? null);

  const [mealStyleBySlot, setMealStyleBySlot] = useState<Record<MealSlotKey, MealStyle>>(
    settings.mealStyleBySlot ?? { breakfast: 'unset', lunch: 'unset', dinner: 'unset', snack: 'unset' }
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(settings.favoriteItemIds ?? []);
  const [portionTendency, setPortionTendency] = useState<PortionTendency>(settings.portionTendency ?? 'normal');

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
      currentStage,
      targetStage,
    });
  }, [ageYears, basis, currentStage, direction, heightCm, targetStage, weightKg]);

  useEffect(() => {
    if (step === 4 && recommendation && targetKcal === null) {
      setTargetKcal(recommendation.targetKcal);
      setTargetWeight(recommendation.targetWeightKg);
      setTargetBf(recommendation.targetBodyFatPct);
    }
  }, [recommendation, step, targetKcal]);

  const currentPfc = useMemo(() => {
    if (!targetKcal) return { proteinG: 0, fatG: 0, carbsG: 0 };
    return recomputePfcFromKcal(targetKcal, direction);
  }, [direction, targetKcal]);

  const phase1Ready = Number(heightCm) >= 120 && Number(weightKg) >= 30 && Number(ageYears) >= 13 && !!basis;
  const phase1BReady = phase1Ready && currentStage !== null;

  const canNext = useMemo(() => {
    if (step === 0) return phase1Ready;
    if (step === 1) return phase1BReady;
    if (step === 2) return !!direction;
    if (step === 3) return targetStage !== null;
    if (step === 4) return !!targetKcal;
    if (step === 5) return true;
    if (step === 6) return true;
    if (step === 7) return true;
    return true;
  }, [direction, phase1BReady, phase1Ready, step, targetKcal, targetStage]);

  const disabledHint = useMemo(() => {
    if (step === 0) {
      const missing: string[] = [];
      if (!(Number(heightCm) >= 120)) missing.push('身長');
      if (!(Number(weightKg) >= 30)) missing.push('体重');
      if (!(Number(ageYears) >= 13)) missing.push('年齢');
      if (!basis) missing.push('身体基準');
      return missing.length ? `${missing.join(' / ')}を入力してください` : null;
    }
    if (step === 1) return currentStage === null ? '今の体格を選んでください' : null;
    if (step === 2) return !direction ? '方向を選んでください' : null;
    if (step === 3) return targetStage === null ? '目標の体格を選んでください' : null;
    return null;
  }, [ageYears, basis, currentStage, direction, heightCm, step, targetStage, weightKg]);

  const saveAllCurrent = useCallback(() => {
    updateProfileValues({
      heightCm: Number(heightCm) || null,
      currentWeightKg: Number(weightKg) || null,
      ageYears: Number(ageYears) || null,
      biologicalBasis: basis,
      currentBodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
      currentBodyStage: currentStage,
      goalDirection: direction,
      targetBodyStage: targetStage,
      targetWeightKg: targetWeight,
      targetBodyFatPct: targetBf,
      targetCalories: targetKcal ?? 0,
      targetProtein: currentPfc.proteinG,
      targetFat: currentPfc.fatG,
      targetCarbs: currentPfc.carbsG,
    });
    updateSettingsValues({
      mealStyleBySlot,
      favoriteItemIds: favoriteIds,
      portionTendency,
    });
  }, [ageYears, basis, bodyFatPct, currentPfc.carbsG, currentPfc.fatG, currentPfc.proteinG, currentStage, direction, favoriteIds, heightCm, mealStyleBySlot, portionTendency, targetBf, targetKcal, targetStage, targetWeight, updateProfileValues, updateSettingsValues, weightKg]);

  const goNext = useCallback(() => {
    saveAllCurrent();
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => (s + 1) as Step);
    } else {
      completeOnboarding();
      router.replace('/');
    }
  }, [completeOnboarding, router, saveAllCurrent, step]);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => (s - 1) as Step);
  }, [router, step]);

  const adjustKcal = (delta: number) => {
    setTargetKcal((v) => Math.max(1200, Math.min(4000, (v ?? 0) + delta)));
  };

  const adjustWeight = (delta: number) => {
    setTargetWeight((v) => {
      const next = Math.max(35, Math.min(150, Number(((v ?? 0) + delta).toFixed(1))));
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_FAVORITES) return prev;
      return [...prev, id];
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page} testID="onboarding-screen">
        <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <View style={styles.headerRow}>
            <Pressable onPress={goBack} style={styles.backButton} testID="onboarding-back">
              <ChevronLeft size={20} color={palette.text} />
            </Pressable>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
            </View>
            <Text style={styles.stepCount}>{step + 1}/{TOTAL_STEPS}</Text>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {step === 0 ? (
                <Step1A
                  heightCm={heightCm}
                  weightKg={weightKg}
                  ageYears={ageYears}
                  basis={basis}
                  onHeight={setHeightCm}
                  onWeight={setWeightKg}
                  onAge={setAgeYears}
                  onBasis={setBasis}
                />
              ) : null}

              {step === 1 ? (
                <Step1B
                  basis={basis}
                  bodyFatPct={bodyFatPct}
                  currentStage={currentStage}
                  onBodyFat={setBodyFatPct}
                  onStage={setCurrentStage}
                />
              ) : null}

              {step === 2 ? (
                <Step2C direction={direction} onDirection={setDirection} />
              ) : null}

              {step === 3 ? (
                <Step2D
                  basis={basis}
                  currentStage={currentStage}
                  targetStage={targetStage}
                  onTarget={setTargetStage}
                />
              ) : null}

              {step === 4 ? (
                <Step2E
                  targetKcal={targetKcal}
                  targetWeight={targetWeight}
                  targetBf={targetBf}
                  pfc={currentPfc}
                  note={recommendation?.note}
                  onAdjustKcal={adjustKcal}
                  onAdjustWeight={adjustWeight}
                />
              ) : null}

              {step === 5 ? (
                <Step3F mealStyleBySlot={mealStyleBySlot} onChange={setMealStyleBySlot} />
              ) : null}

              {step === 6 ? (
                <Step3G favoriteIds={favoriteIds} onToggle={toggleFavorite} />
              ) : null}

              {step === 7 ? (
                <Step3H portionTendency={portionTendency} onChange={setPortionTendency} />
              ) : null}

              {step === 8 ? (
                <StepSummary
                  heightCm={Number(heightCm)}
                  weightKg={Number(weightKg)}
                  targetKcal={targetKcal}
                  mealCount={Object.values(mealStyleBySlot).filter((s) => s !== 'unset').length}
                  favoriteCount={favoriteIds.length}
                  portionTendency={portionTendency}
                />
              ) : null}
            </ScrollView>
            <View style={styles.footer}>
              {!canNext && disabledHint ? (
                <Text style={styles.disabledHint} testID="onboarding-hint">{disabledHint}</Text>
              ) : null}
              <Pressable
                style={[styles.cta, !canNext ? styles.ctaDisabled : null]}
                onPress={goNext}
                disabled={!canNext}
                testID="onboarding-next"
              >
                <Text style={styles.ctaText}>{step === TOTAL_STEPS - 1 ? 'はじめる' : '次へ'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
}

function LabeledInput({ label, value, onChangeText, suffix, placeholder, testID }: { label: string; value: string; onChangeText: (v: string) => void; suffix?: string; placeholder?: string; testID?: string }) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputCell}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          testID={testID}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function Step1A({ heightCm, weightKg, ageYears, basis, onHeight, onWeight, onAge, onBasis }: { heightCm: string; weightKg: string; ageYears: string; basis: BiologicalBasis | null; onHeight: (v: string) => void; onWeight: (v: string) => void; onAge: (v: string) => void; onBasis: (v: BiologicalBasis) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>まず、基本情報を</Text>
      <Text style={styles.stepSubtitle}>目安づくりに使います。後から変更できます。</Text>
      <View style={styles.card}>
        <LabeledInput label="身長" value={heightCm} onChangeText={onHeight} suffix="cm" placeholder="165" testID="onboarding-height" />
        <LabeledInput label="現在体重" value={weightKg} onChangeText={onWeight} suffix="kg" placeholder="56.4" testID="onboarding-weight" />
        <LabeledInput label="年齢" value={ageYears} onChangeText={onAge} suffix="歳" placeholder="28" testID="onboarding-age" />
      </View>
      <Text style={styles.sectionTitle}>身体基準</Text>
      <Text style={styles.stepSubtitle}>目標体脂肪率やおすすめの目安に使います。</Text>
      <View style={styles.card}>
        {BASIS_OPTIONS.map((opt) => {
          const active = basis === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onBasis(opt.key)}
              style={[styles.optionRow, active ? styles.optionRowActive : null]}
              testID={`onboarding-basis-${opt.key}`}
            >
              <View>
                <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{opt.label}</Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              <View style={[styles.radio, active ? styles.radioActive : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Step1B({ basis, bodyFatPct, currentStage, onBodyFat, onStage }: { basis: BiologicalBasis | null; bodyFatPct: string; currentStage: BodyStage | null; onBodyFat: (v: string) => void; onStage: (s: BodyStage) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>今の自分に近いのは？</Text>
      <Text style={styles.stepSubtitle}>いちばん近い体格を選んでください。</Text>
      <View style={styles.silhouetteRow}>
        {BODY_STAGES.map((s) => (
          <Pressable
            key={s}
            onPress={() => onStage(s)}
            style={[styles.silhouetteCell, currentStage === s ? styles.silhouetteCellActive : null]}
            testID={`onboarding-current-stage-${s}`}
          >
            <BodyTypeSilhouette basis={basis ?? 'male_basis'} stage={s} active={currentStage === s} size={52} />
            <Text style={[styles.silhouetteLabel, currentStage === s ? styles.silhouetteLabelActive : null]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>
      {currentStage ? (
        <Text style={styles.stageHint}>{BODY_STAGE_INFO[currentStage].label}</Text>
      ) : null}
      <Text style={styles.sectionTitle}>体脂肪率（任意）</Text>
      <View style={styles.card}>
        <LabeledInput label="体脂肪率" value={bodyFatPct} onChangeText={onBodyFat} suffix="%" placeholder="22" testID="onboarding-bodyfat" />
      </View>
    </View>
  );
}

function Step2C({ direction, onDirection }: { direction: GoalDirection | null; onDirection: (d: GoalDirection) => void }) {
  const opts: { key: GoalDirection; label: string; hint: string }[] = [
    { key: 'lose', label: '減らしたい', hint: '体重・体脂肪率を落とす方向' },
    { key: 'maintain', label: '維持したい', hint: '今の体格をキープする方向' },
    { key: 'gain', label: '増やしたい', hint: '体重・筋量を増やす方向' },
  ];
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>どう変わりたいですか？</Text>
      <Text style={styles.stepSubtitle}>後から変更できます。</Text>
      <View style={styles.card}>
        {opts.map((opt) => {
          const active = direction === opt.key;
          return (
            <Pressable key={opt.key} style={[styles.optionRow, active ? styles.optionRowActive : null]} onPress={() => onDirection(opt.key)} testID={`onboarding-direction-${opt.key}`}>
              <View>
                <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{opt.label}</Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              <View style={[styles.radio, active ? styles.radioActive : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Step2D({ basis, currentStage, targetStage, onTarget }: { basis: BiologicalBasis | null; currentStage: BodyStage | null; targetStage: BodyStage | null; onTarget: (s: BodyStage) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>目指したい体格は？</Text>
      <Text style={styles.stepSubtitle}>現在位置（●）と目標位置を同じスケールで確認できます。</Text>
      <View style={styles.silhouetteRow}>
        {BODY_STAGES.map((s) => (
          <Pressable
            key={s}
            onPress={() => onTarget(s)}
            style={[styles.silhouetteCell, targetStage === s ? styles.silhouetteCellActive : null]}
            testID={`onboarding-target-stage-${s}`}
          >
            <BodyTypeSilhouette basis={basis ?? 'male_basis'} stage={s} active={targetStage === s} size={52} />
            <Text style={[styles.silhouetteLabel, targetStage === s ? styles.silhouetteLabelActive : null]}>
              {s}
            </Text>
            {currentStage === s ? <Text style={styles.currentMark}>●今</Text> : null}
          </Pressable>
        ))}
      </View>
      {targetStage ? (
        <Text style={styles.stageHint}>目標: {BODY_STAGE_INFO[targetStage].label}</Text>
      ) : null}
    </View>
  );
}

function Step2E({ targetKcal, targetWeight, targetBf, pfc, note, onAdjustKcal, onAdjustWeight }: { targetKcal: number | null; targetWeight: number | null; targetBf: number | null; pfc: { proteinG: number; fatG: number; carbsG: number }; note?: string; onAdjustKcal: (d: number) => void; onAdjustWeight: (d: number) => void }) {
  if (!targetKcal) {
    return (
      <View style={styles.stepWrap}>
        <Text style={styles.stepTitle}>おすすめの目標</Text>
        <Text style={styles.stepSubtitle}>前のステップの入力が必要です。</Text>
      </View>
    );
  }
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>おすすめの目標</Text>
      <Text style={styles.stepSubtitle}>± で微調整できます。PFC は自動で再計算されます。</Text>

      <View style={styles.goalCard}>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>目標体重</Text>
          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustButton} onPress={() => onAdjustWeight(-0.5)} testID="goal-weight-down">
              <Text style={styles.adjustButtonText}>−</Text>
            </Pressable>
            <Text style={styles.goalValue}>{targetWeight?.toFixed(1) ?? '--'} kg</Text>
            <Pressable style={styles.adjustButton} onPress={() => onAdjustWeight(0.5)} testID="goal-weight-up">
              <Text style={styles.adjustButtonText}>＋</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>目標体脂肪率</Text>
          <Text style={styles.goalValue}>{targetBf ?? '--'} %</Text>
        </View>
        <View style={styles.goalDivider} />
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>1日の目標</Text>
          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustButton} onPress={() => onAdjustKcal(-50)} testID="goal-kcal-down">
              <Text style={styles.adjustButtonText}>−</Text>
            </Pressable>
            <Text style={styles.goalValueLarge}>{targetKcal} kcal</Text>
            <Pressable style={styles.adjustButton} onPress={() => onAdjustKcal(50)} testID="goal-kcal-up">
              <Text style={styles.adjustButtonText}>＋</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.pfcRow}>
          <View style={styles.pfcCell}>
            <Text style={styles.pfcLabel}>P</Text>
            <Text style={styles.pfcValue}>{pfc.proteinG}g</Text>
          </View>
          <View style={styles.pfcCell}>
            <Text style={styles.pfcLabel}>F</Text>
            <Text style={styles.pfcValue}>{pfc.fatG}g</Text>
          </View>
          <View style={styles.pfcCell}>
            <Text style={styles.pfcLabel}>C</Text>
            <Text style={styles.pfcValue}>{pfc.carbsG}g</Text>
          </View>
        </View>
        {note ? <Text style={styles.goalNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function Step3F({ mealStyleBySlot, onChange }: { mealStyleBySlot: Record<MealSlotKey, MealStyle>; onChange: (v: Record<MealSlotKey, MealStyle>) => void }) {
  const slots: MealSlotKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>食事スタイル</Text>
      <Text style={styles.stepSubtitle}>時間帯ごとの傾向を教えてください。未設定でも大丈夫です。</Text>
      {slots.map((slot) => (
        <View key={slot} style={styles.card}>
          <Text style={styles.slotLabel}>{MEAL_SLOT_LABELS[slot]}</Text>
          <View style={styles.chipsWrap}>
            {MEAL_STYLE_OPTIONS.map((opt) => {
              const active = mealStyleBySlot[slot] === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => onChange({ ...mealStyleBySlot, [slot]: opt.key })}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  testID={`meal-style-${slot}-${opt.key}`}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function Step3G({ favoriteIds, onToggle }: { favoriteIds: string[]; onToggle: (id: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>よく食べるもの</Text>
      <Text style={styles.stepSubtitle}>最大{MAX_FAVORITES}個まで。Quick Logの候補に反映されます。</Text>
      <Text style={styles.sectionTitle}>一皿料理</Text>
      <View style={styles.chipsWrap}>
        {FAVORITE_DISH_ITEMS.map((item) => {
          const active = favoriteIds.includes(item.id);
          return (
            <Pressable key={item.id} onPress={() => onToggle(item.id)} style={[styles.chip, active ? styles.chipActive : null]} testID={`fav-${item.id}`}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.sectionTitle}>食材・単品</Text>
      <View style={styles.chipsWrap}>
        {FAVORITE_FOOD_ITEMS.map((item) => {
          const active = favoriteIds.includes(item.id);
          return (
            <Pressable key={item.id} onPress={() => onToggle(item.id)} style={[styles.chip, active ? styles.chipActive : null]} testID={`fav-${item.id}`}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.countHint}>{favoriteIds.length} / {MAX_FAVORITES} 選択中</Text>
    </View>
  );
}

function Step3H({ portionTendency, onChange }: { portionTendency: PortionTendency; onChange: (p: PortionTendency) => void }) {
  const opts: { key: PortionTendency; label: string; hint: string }[] = [
    { key: 'light', label: '少なめ', hint: '基準より軽めに入力される' },
    { key: 'normal', label: 'ふつう', hint: '標準量で入力される' },
    { key: 'heavy', label: '多め', hint: '基準より多めに入力される' },
  ];
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>普段の量は？</Text>
      <Text style={styles.stepSubtitle}>Quick Logの初期量に反映されます。</Text>
      <View style={styles.card}>
        {opts.map((opt) => {
          const active = portionTendency === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.optionRow, active ? styles.optionRowActive : null]} testID={`portion-tendency-${opt.key}`}>
              <View>
                <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{opt.label}</Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              <View style={[styles.radio, active ? styles.radioActive : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepSummary({ heightCm, weightKg, targetKcal, mealCount, favoriteCount, portionTendency }: { heightCm: number; weightKg: number; targetKcal: number | null; mealCount: number; favoriteCount: number; portionTendency: PortionTendency }) {
  const tendencyLabel = portionTendency === 'light' ? '少なめ' : portionTendency === 'heavy' ? '多め' : 'ふつう';
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>設定が完了しました</Text>
      <Text style={styles.stepSubtitle}>あとで My Status からいつでも変更できます。</Text>
      <View style={styles.card}>
        <SummaryRow label="身長 / 体重" value={`${heightCm || '--'} cm / ${weightKg || '--'} kg`} />
        <SummaryRow label="1日の目標" value={targetKcal ? `${targetKcal} kcal` : '未設定'} />
        <SummaryRow label="食事スタイル" value={`${mealCount} / 4 時間帯`} />
        <SummaryRow label="よく食べるもの" value={`${favoriteCount} 個`} />
        <SummaryRow label="普段の量" value={tendencyLabel} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

void ALL_FAVORITE_ITEMS;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 12 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.card },
  progressBar: { flex: 1, height: 4, backgroundColor: palette.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.sageDeep, borderRadius: 2 },
  stepCount: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  stepWrap: { gap: 14 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: palette.text },
  stepSubtitle: { fontSize: 14, lineHeight: 21, color: palette.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginTop: 10 },
  card: { backgroundColor: palette.surface, borderRadius: 20, padding: 16, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inputLabel: { fontSize: 14, color: palette.text, fontWeight: '600' },
  inputCell: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 120 },
  input: { flex: 1, fontSize: 16, color: palette.text, fontWeight: '600', textAlign: 'right' },
  inputSuffix: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: palette.card },
  optionRowActive: { backgroundColor: palette.accentSoft },
  optionLabel: { fontSize: 15, fontWeight: '700', color: palette.text },
  optionLabelActive: { color: palette.sageDeep },
  optionHint: { fontSize: 12, color: palette.textMuted, marginTop: 3 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  radioActive: { borderColor: palette.sageDeep, backgroundColor: palette.sageDeep },
  silhouetteRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.surface, padding: 12, borderRadius: 20 },
  silhouetteCell: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 14, flex: 1 },
  silhouetteCellActive: { backgroundColor: palette.accentSoft },
  silhouetteLabel: { fontSize: 12, color: palette.textMuted, fontWeight: '600', marginTop: 2 },
  silhouetteLabelActive: { color: palette.sageDeep },
  currentMark: { fontSize: 10, color: palette.sageStrong, fontWeight: '700', marginTop: 2 },
  stageHint: { fontSize: 13, color: palette.textMuted, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 },
  disabledHint: { fontSize: 12, color: palette.textMuted, textAlign: 'center' },
  cta: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  goalCard: { backgroundColor: palette.surface, borderRadius: 22, padding: 18, gap: 14 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalLabel: { fontSize: 14, color: palette.textMuted, fontWeight: '600' },
  goalValue: { fontSize: 16, fontWeight: '700', color: palette.text },
  goalValueLarge: { fontSize: 20, fontWeight: '700', color: palette.sageDeep, minWidth: 90, textAlign: 'center' },
  goalDivider: { height: 1, backgroundColor: palette.border },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adjustButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  adjustButtonText: { fontSize: 16, color: palette.text, fontWeight: '700' },
  pfcRow: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  pfcCell: { flex: 1, backgroundColor: palette.card, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  pfcLabel: { fontSize: 11, color: palette.textMuted, fontWeight: '700' },
  pfcValue: { fontSize: 15, color: palette.text, fontWeight: '700', marginTop: 3 },
  goalNote: { fontSize: 12, color: palette.accent, fontWeight: '600' },
  slotLabel: { fontSize: 14, fontWeight: '700', color: palette.text },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.card },
  chipActive: { backgroundColor: palette.sageDeep },
  chipText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  chipTextActive: { color: palette.white },
  countHint: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: palette.textMuted },
  summaryValue: { fontSize: 14, color: palette.text, fontWeight: '700' },
});
