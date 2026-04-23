import { BiologicalBasis, BodyStage, GoalDirection, Macro } from '@/types/nutrition';
import { BODY_STAGE_INFO } from '@/constants/onboarding';

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

export function recommendGoal(input: GoalInputs): GoalRecommendation | null {
  const { heightCm, weightKg, ageYears, basis, direction } = input;
  if (!heightCm || !weightKg || !ageYears || !basis || !direction) return null;

  const rmr = calcRMR(weightKg, heightCm, ageYears, basis);
  const tdee = calcTDEE(rmr, basis);
  const rawKcal = tdee + KCAL_ADJUST_BY_DIRECTION[direction];
  const targetKcal = Math.max(1200, Math.round(rawKcal / 10) * 10);

  const proteinKcalRatio = direction === 'lose' ? 0.22 : direction === 'gain' ? 0.2 : 0.18;
  const fatKcalRatio = direction === 'lose' ? 0.25 : 0.28;
  const carbKcalRatio = 1 - proteinKcalRatio - fatKcalRatio;

  const proteinG = Math.round((targetKcal * proteinKcalRatio) / 4);
  const fatG = Math.round((targetKcal * fatKcalRatio) / 9);
  const carbsG = Math.round((targetKcal * carbKcalRatio) / 4);

  const { targetWeightKg, targetBodyFatPct } = estimateTargetWeight(
    weightKg,
    heightCm,
    input.currentStage,
    input.targetStage,
    basis,
    direction
  );

  const stageDelta = Math.abs((input.targetStage ?? 3) - (input.currentStage ?? 3));
  let note: string | undefined;
  if (stageDelta >= 3) note = '少し強度の高い目標です。無理のない範囲で進めましょう。';

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

export function recomputePfcFromKcal(
  kcal: number,
  direction: GoalDirection | null | undefined
): { proteinG: number; fatG: number; carbsG: number } {
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

export function trialDaysRemaining(startedAtISO: string | null | undefined, trialDays: number): number {
  if (!startedAtISO) return 0;
  const started = new Date(startedAtISO).getTime();
  if (!Number.isFinite(started)) return 0;
  const endMs = started + trialDays * 24 * 60 * 60 * 1000;
  const remainingMs = endMs - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}
