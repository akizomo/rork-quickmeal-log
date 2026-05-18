import { ActivityLevel, AppSettings, BiologicalBasis, BodyStage, BodyType9, GoalDirection, Macro, PaceLevel, SubscriptionStatus } from '@/types/nutrition';
import {
  getCellBodyFatTypical,
  getCellRef,
} from '@/constants/body-matrix';
import {
  ACTIVITY_LEVEL_OPTIONS,
  BODY_STAGE_INFO,
  PACE_OPTIONS,
} from '@/constants/onboarding';

/**
 * Auto-derive the goal direction from current/target 9-matrix body types.
 * Edge case (fat↑ muscle↓) is flagged as 'warning' by deriveTransitionWarning.
 */
export function deriveDirection(current: BodyType9, target: BodyType9): GoalDirection {
  const fatDelta = target.fat - current.fat;
  const muscleDelta = target.muscle - current.muscle;
  if (fatDelta === 0 && muscleDelta === 0) return 'maintain';
  if (fatDelta < 0) return 'lose';
  if (fatDelta > 0) return 'gain';
  // fatDelta === 0
  if (muscleDelta > 0) return 'gain';
  if (muscleDelta < 0) return 'lose';
  return 'maintain';
}

/** Returns a warning string if the transition is considered non-recommended. */
export function deriveTransitionWarning(
  current: BodyType9,
  target: BodyType9
): string | null {
  const fatDelta = target.fat - current.fat;
  const muscleDelta = target.muscle - current.muscle;
  if (fatDelta > 0 && muscleDelta < 0) {
    return '脂肪を増やしつつ筋量を減らす方向は非推奨です。別の目標を検討してください。';
  }
  return null;
}

export interface PlanOutcome {
  /** negative for lose, positive for gain, 0 for maintain */
  totalKgDelta: number;
  /** per-month delta (averaged) */
  monthlyKgDelta: number;
  finalWeightKg: number;
  /** rough estimated final body fat percentage */
  finalBodyFatPct: number;
  /** true when delta exceeds ~4% of current weight (≒ body type level change) */
  reachesTargetCell: boolean;
}

/**
 * Compute outcome of a given pace + direction over a fixed duration.
 *
 * Rate base (ACSM / ISSN):
 *   - lose standard: 0.5%/week
 *   - gain standard: 0.25%/week
 *   pace multiplier (0.5/1.0/1.5) modulates these base rates.
 */
export function computePlanOutcome(
  currentWeightKg: number,
  currentBodyFatPct: number | null,
  pace: PaceLevel,
  direction: GoalDirection,
  durationMonths = 3
): PlanOutcome {
  const baseWeekly = direction === 'lose' ? 0.005 : direction === 'gain' ? 0.0025 : 0;
  const multi = PACE_OPTIONS.find((p) => p.key === pace)?.multiplier ?? 1;
  const weeklyRate = baseWeekly * multi;
  const weeks = durationMonths * 4.345;
  const totalPct = weeklyRate * weeks * (direction === 'lose' ? -1 : direction === 'gain' ? 1 : 0);
  const totalKgDelta = currentWeightKg * totalPct;
  const finalWeight = currentWeightKg + totalKgDelta;
  const bf0 = currentBodyFatPct ?? 0;

  // Rough BF% projection:
  // lose — assume 75% of weight loss is fat mass (rest is lean)
  // gain — if fat-direction bulk, assume 50% of gain is fat; muscle-direction, 20%
  let finalBF = bf0;
  if (direction === 'lose' && bf0 > 0 && finalWeight > 0) {
    const fatMassCurrent = currentWeightKg * (bf0 / 100);
    const fatMassAfter = Math.max(0, fatMassCurrent + totalKgDelta * 0.75);
    finalBF = (fatMassAfter / finalWeight) * 100;
  } else if (direction === 'gain' && bf0 > 0 && finalWeight > 0) {
    const fatMassCurrent = currentWeightKg * (bf0 / 100);
    // Assume muscle-led gain: 30% of gain is fat
    const fatMassAfter = fatMassCurrent + totalKgDelta * 0.3;
    finalBF = (fatMassAfter / finalWeight) * 100;
  }

  return {
    totalKgDelta: Math.round(totalKgDelta * 10) / 10,
    monthlyKgDelta: Math.round((totalKgDelta / durationMonths) * 10) / 10,
    finalWeightKg: Math.round(finalWeight * 10) / 10,
    finalBodyFatPct: Math.round(finalBF),
    reachesTargetCell: Math.abs(totalKgDelta) >= currentWeightKg * 0.04,
  };
}

const ACTIVITY_FACTOR: Record<BiologicalBasis, number> = {
  male_basis: 1.11,
  female_basis: 1.12,
};

const KCAL_ADJUST_BY_DIRECTION: Record<GoalDirection, number> = {
  lose: -400,
  maintain: 0,
  gain: 250,
};

export interface GoalInputs {
  heightCm: number | null;
  weightKg: number | null;
  ageYears: number | null;
  basis: BiologicalBasis | null;
  direction: GoalDirection | null;
  activityLevel: ActivityLevel | null;
  paceLevel: PaceLevel | null; // null allowed when direction === 'maintain'
  targetBodyType9: BodyType9 | null;
  currentBodyFatPct?: number | null;
  /** Legacy 5-stage body stages (not used in new logic, kept for back-compat). */
  currentStage?: BodyStage | null;
  targetStage?: BodyStage | null;
}

export interface GoalRecommendation {
  rmr: number;
  tdee: number;
  targetKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  targetWeightKg: number;
  targetBodyFatPct: number;
  note?: string;
}

export function calcRMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  basis: BiologicalBasis
): number {
  const base = 9.99 * weightKg + 6.25 * heightCm - 4.92 * ageYears;
  return Math.max(800, Math.round(basis === 'male_basis' ? base + 5 : base - 161));
}

export function calcTDEE(rmr: number, basis: BiologicalBasis): number {
  return Math.round(rmr * ACTIVITY_FACTOR[basis]);
}

export function estimateTargetWeight(
  currentWeightKg: number,
  heightCm: number,
  currentStage: BodyStage | null | undefined,
  targetStage: BodyStage | null | undefined,
  basis: BiologicalBasis,
  direction: GoalDirection
): { targetWeightKg: number; targetBodyFatPct: number } {
  const cur = currentStage ?? 3;
  const tgt = targetStage ?? (direction === 'lose' ? 2 : direction === 'gain' ? 4 : cur);
  const stageDelta = tgt - cur;
  const perStageKg = Math.max(2.5, currentWeightKg * 0.04);
  const rawTarget = currentWeightKg + stageDelta * perStageKg;
  const minWeight = Math.round((heightCm / 100) ** 2 * 18.5 * 10) / 10;
  const maxWeight = Math.round((heightCm / 100) ** 2 * 27 * 10) / 10;
  const clamped = Math.max(minWeight, Math.min(maxWeight, rawTarget));
  const bfInfo = BODY_STAGE_INFO[tgt];
  const bf = basis === 'male_basis' ? bfInfo.maleBodyFatPct : bfInfo.femaleBodyFatPct;
  return {
    targetWeightKg: Math.round(clamped * 10) / 10,
    targetBodyFatPct: bf,
  };
}

/**
 * Calculates the daily kcal adjustment based on direction + pace.
 * Uses the 7700 kcal/kg body-weight thermodynamic conversion.
 *   - 1% body weight/week ≒ 1100 kcal/day (in grams) ≒ 1 kg/week
 *   - standard lose  = 0.5%/week, standard gain = 0.25%/week
 *   - pace multiplier (0.5/1.0/1.5) scales the base rate
 */
function computeKcalDelta(
  weightKg: number,
  direction: GoalDirection,
  paceLevel: PaceLevel | null
): number {
  if (direction === 'maintain') return 0;
  if (!paceLevel) return 0;
  const multi = PACE_OPTIONS.find((p) => p.key === paceLevel)?.multiplier ?? 1;
  const baseWeekly = direction === 'lose' ? 0.005 : 0.0025;
  const sign = direction === 'lose' ? -1 : 1;
  const weeklyPct = baseWeekly * multi;
  const weeklyKcal = weightKg * weeklyPct * 7700;
  return Math.round((sign * weeklyKcal) / 7);
}

/**
 * PFC macro calculator: weight-based protein, fat-floor enforcement,
 * remainder to carbs. Used by both `recommendGoal` and on-the-fly
 * kcal adjustments in the preview.
 *
 * Protein: activityLevel.proteinPerKg + direction bonus (+0.3 lose, +0.2 gain)
 * Fat:     max(0.6 g/kg, 20% of kcal / 9) — ISSN / ACSM
 * Carbs:   remaining kcal
 */
export function computePfc(
  kcal: number,
  weightKg: number,
  activityLevel: ActivityLevel,
  direction: GoalDirection
): { proteinG: number; fatG: number; carbsG: number } {
  const activityInfo = ACTIVITY_LEVEL_OPTIONS.find((a) => a.level === activityLevel);
  const proteinBase = activityInfo?.proteinPerKg ?? 1.4;
  const proteinBonus = direction === 'lose' ? 0.3 : direction === 'gain' ? 0.2 : 0;
  const proteinG = Math.round((proteinBase + proteinBonus) * weightKg);

  const fatMinByWeight = 0.6 * weightKg;
  const fatMinByKcal = (kcal * 0.2) / 9;
  const fatG = Math.round(Math.max(fatMinByWeight, fatMinByKcal));

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbKcal = Math.max(0, kcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbKcal / 4);

  return { proteinG, fatG, carbsG };
}

export function recommendGoal(input: GoalInputs): GoalRecommendation | null {
  const {
    heightCm,
    weightKg,
    ageYears,
    basis,
    direction,
    activityLevel,
    paceLevel,
    targetBodyType9,
    currentBodyFatPct,
  } = input;
  if (!heightCm || !weightKg || !ageYears || !basis || !direction || !activityLevel || !targetBodyType9) {
    return null;
  }
  if (direction !== 'maintain' && !paceLevel) return null;

  // 1. RMR: Katch-McArdle when BF% known, Mifflin-St Jeor otherwise
  let rmr: number;
  if (currentBodyFatPct != null && currentBodyFatPct > 0) {
    const lbm = weightKg * (1 - currentBodyFatPct / 100);
    rmr = Math.max(800, Math.round(370 + 21.6 * lbm));
  } else {
    rmr = calcRMR(weightKg, heightCm, ageYears, basis);
  }

  // 2. TDEE with activity factor
  const activityInfo = ACTIVITY_LEVEL_OPTIONS.find((a) => a.level === activityLevel);
  const factor = activityInfo?.factor ?? 1.375;
  const tdee = Math.round(rmr * factor);

  // 3. kcal with pace adjustment, floor
  const kcalDelta = computeKcalDelta(weightKg, direction, paceLevel);
  const minKcal = basis === 'male_basis' ? 1500 : 1200;
  const rawKcal = tdee + kcalDelta;
  const targetKcal = Math.max(minKcal, Math.round(rawKcal / 10) * 10);

  // 4. PFC
  const { proteinG, fatG, carbsG } = computePfc(targetKcal, weightKg, activityLevel, direction);

  // 5. Target weight / BF%:
  //    Priority 1 — plan outcome: derived from *current* weight/BF% via pace-driven
  //    3-month projection. This is what actually matches the user's real state.
  //    Priority 2 — 9-matrix cell (fallback when pace is not selected yet).
  //    For maintain: target = current (no change over the window).
  let targetWeightKg: number;
  let targetBodyFatPct: number;
  if (direction === 'maintain') {
    targetWeightKg = Math.round(weightKg * 10) / 10;
    targetBodyFatPct =
      currentBodyFatPct != null
        ? Math.round(currentBodyFatPct)
        : getCellBodyFatTypical(getCellRef(basis, targetBodyType9));
  } else if (paceLevel) {
    const outcome = computePlanOutcome(weightKg, currentBodyFatPct ?? null, paceLevel, direction);
    targetWeightKg = outcome.finalWeightKg;
    targetBodyFatPct =
      currentBodyFatPct != null
        ? outcome.finalBodyFatPct
        : getCellBodyFatTypical(getCellRef(basis, targetBodyType9));
  } else {
    const ref = getCellRef(basis, targetBodyType9);
    const h = heightCm / 100;
    const targetBmi = (ref.bmiMin + ref.bmiMax) / 2;
    targetWeightKg = Math.round(targetBmi * h * h * 10) / 10;
    targetBodyFatPct = getCellBodyFatTypical(ref);
  }

  // 6. Note
  let note: string | undefined;
  if (rawKcal < minKcal) {
    note = `下限 ${minKcal}kcal を適用しました。`;
  }

  return {
    rmr,
    tdee,
    targetKcal,
    proteinG,
    fatG,
    carbsG,
    targetWeightKg,
    targetBodyFatPct,
    note,
  };
}

/**
 * Legacy helper kept for back-compat. Prefer `computePfc` which uses
 * weight + activity level for evidence-based macro calculation.
 */
export function recomputePfcFromKcal(
  kcal: number,
  direction: GoalDirection | null | undefined,
  weightKg?: number | null,
  activityLevel?: ActivityLevel | null
): { proteinG: number; fatG: number; carbsG: number } {
  if (weightKg && activityLevel) {
    return computePfc(kcal, weightKg, activityLevel, direction ?? 'maintain');
  }
  // Fallback: old ratio-based calc (for when weight/activity are not available)
  const d = direction ?? 'maintain';
  const proteinKcalRatio = d === 'lose' ? 0.22 : d === 'gain' ? 0.2 : 0.18;
  const fatKcalRatio = d === 'lose' ? 0.25 : 0.28;
  const carbKcalRatio = 1 - proteinKcalRatio - fatKcalRatio;
  return {
    proteinG: Math.round((kcal * proteinKcalRatio) / 4),
    fatG: Math.round((kcal * fatKcalRatio) / 9),
    carbsG: Math.round((kcal * carbKcalRatio) / 4),
  };
}

export function macroFromGrams(kcal: number, proteinG: number, fatG: number, carbsG: number): Macro {
  return { kcal, protein: proteinG, fat: fatG, carbs: carbsG };
}

// ---------------------------------------------------------------------------
// Exercise calorie calculation (Issue #3 — リアルタイム目標連動)
// ---------------------------------------------------------------------------

/**
 * Baseline calories per exercise session that are already accounted for
 * in the user's TDEE via their activity level factor. We subtract this
 * before adding exercise calories to the daily target to avoid double-counting.
 *
 * Values are rough per-session estimates (not per-day):
 *   Lv1 sedentary  → no exercise built in → 0 kcal baseline
 *   Lv2 light      → light strolls already in TDEE → ~50 kcal baseline
 *   Lv3 moderate   → regular workouts already in TDEE → ~150 kcal baseline
 *   Lv4 active     → heavy training already in TDEE → ~300 kcal baseline
 */
/**
 * @deprecated v1.7+ で使用停止。業界標準 (YAZIO/MFP/あすけん) に合わせて
 * 運動 gross を全額加算する方式に変更したため、per-session baseline は不要。
 * 後方互換のため定数定義は残すが、`calcExerciseNetKcal` 内では参照しない。
 */
export const EXERCISE_BASELINE_KCAL: Record<ActivityLevel, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

export const EXERCISE_TYPES = [
  { key: 'walking', label: 'ウォーキング', emoji: '🚶', met: 3.5 },
  { key: 'running', label: 'ランニング', emoji: '🏃', met: 7.0 },
  { key: 'cycling', label: 'サイクリング', emoji: '🚴', met: 4.0 },
  { key: 'strength', label: '筋トレ', emoji: '🏋', met: 3.5 },
  { key: 'yoga', label: 'ヨガ', emoji: '🧘', met: 2.5 },
  { key: 'swimming', label: '水泳', emoji: '🏊', met: 6.0 },
  { key: 'hiit', label: 'HIIT', emoji: '💪', met: 8.0 },
  { key: 'other', label: 'スポーツ', emoji: '🏅', met: 5.0 },
] as const;

export type ExerciseTypeKey = (typeof EXERCISE_TYPES)[number]['key'];

/** MET-based gross calorie burn: kcal = MET × weight(kg) × (minutes / 60) */
export function calcExerciseGrossKcal(met: number, weightKg: number, minutes: number): number {
  return Math.max(0, Math.round(met * weightKg * (minutes / 60)));
}

/**
 * 運動が今日の目標に加算される kcal。
 *
 * v1.7+ で **per-session baseline 差引を廃止** し、業界標準 (YAZIO / MyFitnessPal /
 * あすけん) に合わせて gross 全額加算とする:
 *   - 活動係数 (RMR×factor) はあくまで "日常生活" の代謝想定
 *   - 意図的に記録された運動はそのまま目標に加算
 *   - 二重計上の責任は活動係数の選択に委ねる (オンボでヒント表示)
 *
 * 第2引数 `activityLevel` は後方互換のため残してあるが、使用していない。
 */
export function calcExerciseNetKcal(grossKcal: number, _activityLevel?: ActivityLevel): number {
  return Math.max(0, Math.round(grossKcal));
}

/**
 * Adjusted daily kcal target = base target + sum of net exercise kcal for the given date.
 */
export function adjustedTargetKcal(
  baseTargetKcal: number,
  exerciseLogs: { date: string; netKcal: number }[],
  dateKey: string
): number {
  const dayNet = exerciseLogs
    .filter((e) => e.date === dateKey)
    .reduce((sum, e) => sum + e.netKcal, 0);
  return baseTargetKcal + dayNet;
}

export function trialDaysRemaining(startedAtISO: string | null | undefined, trialDays: number): number {
  if (!startedAtISO) return 0;
  const started = new Date(startedAtISO).getTime();
  if (!Number.isFinite(started)) return 0;
  const endMs = started + trialDays * 24 * 60 * 60 * 1000;
  const remainingMs = endMs - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * トライアル表記をローカル時刻でオーバーライドする派生値。
 * 「無料トライアル中」表示の見た目バグを直すための UI 専用ヘルパー。
 *
 * 重要: RC が 'trialing'/'active' を返す = サブスク登録が存在する限り、
 * 'expired'/'none' に降格しない (ペイウォールへ蹴り出さない)。
 * トライアルが経過済みなら 'active' (本登録扱い) として返す。
 * RC が明示的に 'expired' を返すまではアクセスを維持する。
 *
 * - `subscriptionStatus !== 'trialing'` → そのまま返す
 * - `trialing` & `trialStartedAtISO` 未記録 → そのまま `trialing`
 * - `trialing` & 残日数 > 0 → `trialing`
 * - `trialing` & 残日数 <= 0 → `active` (登録は残しつつ表記だけ切替)
 */
export function getEffectiveSubscriptionStatus(
  settings: Pick<AppSettings, 'subscriptionStatus' | 'trialStartedAtISO'>,
  trialDays: number
): SubscriptionStatus {
  const current = settings.subscriptionStatus ?? 'none';
  if (current !== 'trialing') return current;
  if (!settings.trialStartedAtISO) return current;
  const remaining = trialDaysRemaining(settings.trialStartedAtISO, trialDays);
  return remaining <= 0 ? 'active' : 'trialing';
}
