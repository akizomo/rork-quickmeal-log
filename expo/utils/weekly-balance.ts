import type { BiologicalBasis } from '@/types/nutrition';
import { CARRYOVER_HARD_FLOOR_KCAL, classifyCarryoverDeduction, type CarryoverVerdict } from '@/utils/goals';

// ---------------------------------------------------------------------------
// 今週の収支を合わせる (PRD §6.4.5)
// ---------------------------------------------------------------------------
// 月曜始まりの固定週で、ここまでの「食べた量 − 目標」の差を
// 今日から日曜までの残り日数に均等に割り、今日の目標に加減する。
// オプション機能: 呼び出し側がユーザーの有効化を確認してから使う。

/** 提案バナーを出す閾値。|週の差| がベース目標のこの割合を超えたら提案する。 */
export const WEEKLY_BALANCE_PROPOSE_RATIO = 0.15;

/**
 * ゆとり側 (少なめの週) の 1日あたり上限 = ベース目標の割合。
 * 記録しきれていない日 (軽食のつけ忘れ等) は実際以上に「少なめ」に見えるため、
 * 上方向は控えめ側 (絶対床のみ) より強く抑える。
 */
export const WEEKLY_BALANCE_MAX_CREDIT_RATIO = 0.15;

export interface WeeklyBalanceDay {
  dateKey: string;
  consumedKcal: number;
  /** その日の目標 (ベース + 活動・運動の加算, §6.4.3)。調整分は含めない */
  targetKcal: number;
}

export interface WeeklyBalance {
  /** 週の差の合計。+ = 多め、− = 少なめ。記録のある過去日だけ */
  balanceKcal: number;
  /** 差の計算に入った日数 (記録のある過去日) */
  countedDays: number;
  /** 今日から日曜まで (今日を含む) */
  remainingDays: number;
  /** ガード適用後の今日への加減。+ = ゆとり、− = 控えめ */
  todayAdjustmentKcal: number;
  /** どのガードで止めたか */
  limitedBy: 'none' | 'floor' | 'creditCap';
  /** 調整後の今日の目標が注意の閾値を下回るか (§6.4.5 控えめ側) */
  verdict: CarryoverVerdict;
}

/**
 * @param pastDays 今週の月曜〜昨日。記録のない日 (consumedKcal <= 0) は差から外す
 * @param remainingDays 今日から日曜まで (今日を含む, 1〜7)
 * @param todayTargetKcal 今日の目標 (ベース + 活動加算)。絶対床の判定に使う
 * @param baseTargetKcal ベース目標 (profile.targetCalories)。ゆとり上限の基準
 */
export function computeWeeklyBalance(
  pastDays: WeeklyBalanceDay[],
  remainingDays: number,
  todayTargetKcal: number,
  baseTargetKcal: number,
  basis: BiologicalBasis | null | undefined,
): WeeklyBalance {
  const counted = pastDays.filter((d) => d.consumedKcal > 0);
  const balanceKcal = Math.round(counted.reduce((s, d) => s + (d.consumedKcal - d.targetKcal), 0));
  const days = Math.max(1, remainingDays);
  // `|| 0` で -0 を 0 に揃える (balance 0 のとき)
  const raw = Math.round(-balanceKcal / days) || 0;

  let adjustment = raw;
  let limitedBy: WeeklyBalance['limitedBy'] = 'none';
  if (baseTargetKcal <= 0 || todayTargetKcal <= 0) {
    adjustment = 0; // 目標未設定時は調整しない
  } else if (raw < 0) {
    const maxDeduction = Math.max(0, todayTargetKcal - CARRYOVER_HARD_FLOOR_KCAL);
    if (-raw > maxDeduction) {
      adjustment = -maxDeduction;
      limitedBy = 'floor';
    }
  } else if (raw > 0) {
    const cap = Math.round(baseTargetKcal * WEEKLY_BALANCE_MAX_CREDIT_RATIO);
    if (raw > cap) {
      adjustment = cap;
      limitedBy = 'creditCap';
    }
  }

  return {
    balanceKcal,
    countedDays: counted.length,
    remainingDays: days,
    todayAdjustmentKcal: adjustment,
    limitedBy,
    verdict: adjustment < 0 ? classifyCarryoverDeduction(todayTargetKcal, -adjustment, basis) : 'ok',
  };
}

/** 提案バナーを出すほど差が開いているか。 */
export function isWeeklyBalanceWorthProposing(balanceKcal: number, baseTargetKcal: number): boolean {
  if (baseTargetKcal <= 0) return false;
  return Math.abs(balanceKcal) > Math.round(baseTargetKcal * WEEKLY_BALANCE_PROPOSE_RATIO);
}
