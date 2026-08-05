/**
 * weekly-recap.ts — 週次振り返り (C レーン) の純ロジック。
 *
 * 直近の「完了した週」(月〜日) を対象に、記録日数と平均摂取/目標カロリーを
 * 事実ベースで返す。中立トーン (PRD §9.1) を守るため:
 *   - 達成率・達成/未達成の評価語は一切持たない (数値の並記のみ)
 *   - 記録が1日も無い週は null (「0日記録」は評価的に響くため出さない)
 *   - 進行中の今週は対象外 (完了週のみ)
 *
 * 詳細は docs/ROADMAP.md §3.0「次の一手」実行順3 (週次振り返りの報酬化)。
 */

import type { DailyActivitySummary, ExerciseLog, FoodLog, UserProfile } from '@/types/nutrition';
import { addDays, formatWeekRangeLabel, getDailyMacros, getWeekRange, startOfDay } from '@/utils/history';
import { formatDateKey } from '@/utils/nutrition';
import { adjustedTargetKcal } from '@/utils/goals';
import { ALL_IDENTITIES, getIdentity } from '@/constants/identity';

const WEEKDAY_JP_MON_FIRST = ['月', '火', '水', '木', '金', '土', '日'];

/** PFC 傾向を「特筆すべき」と判定する最小乖離率。これ未満は insight を出さない。 */
const INSIGHT_THRESHOLD_RATIO = 0.15;

/** 軸ごとの kcal/g 換算係数。「高◯◯食材」の密度判定に使う。 */
const AXIS_KCAL_PER_GRAM: Record<MacroAxis, number> = { protein: 4, fat: 9, carbs: 4 };

/**
 * 軸ごとの「高◯◯食材」判定閾値 (defaultMacro のうちその軸が占めるkcal比率)。
 * 例: protein 0.25 = カロリーの25%以上がたんぱく質由来なら高たんぱく食材とみなす。
 */
const AXIS_DENSITY_THRESHOLD: Record<MacroAxis, number> = { protein: 0.25, fat: 0.35, carbs: 0.45 };

/** macroBoost で提示する候補の最大数。 */
const MAX_BOOST_CANDIDATES = 3;

export type MacroAxis = 'protein' | 'fat' | 'carbs';

export interface WeeklyFoodFact {
  identityId: string;
  identityLabel: string;
  /** Identity.nutritionNote の文言。組成的な役割の記述までで、効能・機序は断定しない (§10.7-3)。 */
  note: string;
}

export interface WeeklyMacroBoostCandidate {
  identityId: string;
  label: string;
  /** 記録履歴にあるか (自分のレパートリーか、未経験の選択肢か)。UIの見せ方を変える余地のため公開する。 */
  fromHistory: boolean;
}

export interface WeeklyMacroBoost {
  axis: MacroAxis;
  /**
   * その軸の密度が高い Identity を最大 MAX_BOOST_CANDIDATES 件。
   * 記録履歴にあるもの (頻度順) を優先し、足りない分は未経験でも全カタログから補う。
   * 履歴限定にすると「最も必要な人ほど候補が出ない」逆説が生じるため、意図的に両方使う。
   */
  candidates: WeeklyMacroBoostCandidate[];
  /**
   * 候補のうち最初に組成事実 (nutritionNote) を持つものを添える。豆知識は単独スライドにせず、
   * 「なぜこの食材が候補なのか」を支える形でアドバイスに従属させる (無ければ null)。
   */
  note: WeeklyFoodFact | null;
}

export interface WeeklyMacroInsight {
  axis: MacroAxis;
  /** 「多め/少なめ」の2値のみ。良し悪しの評価語は持たない。 */
  direction: 'more' | 'less';
  avgActual: number;
  avgTarget: number;
}

export interface WeeklyRecapDay {
  dateKey: string;
  /** 月曜始まりの曜日ラベル。 */
  weekdayLabel: string;
  /** その日の記録があれば true。false の日は kcal/targetKcal を「未記録」として扱う (0 ではなく欠測)。 */
  logged: boolean;
  kcal: number;
  targetKcal: number;
}

export interface WeeklyRecap {
  /** 対象週の月曜日 (dateKey)。dismiss 済み判定のキーにも使う。 */
  weekKey: string;
  /** 表示用の日付範囲ラベル (例: "7/27 – 8/2")。 */
  weekRangeLabel: string;
  /** 記録がある日数 (0 は呼び出し前に弾かれるので 1〜7)。 */
  daysLogged: number;
  /** 記録日の摂取カロリー合計。ストーリー冒頭のヒーロー数字に使う。 */
  totalKcal: number;
  /** 記録日の平均摂取カロリー。 */
  avgKcal: number;
  /** 記録日の平均目標カロリー (運動による当日拡大を反映)。プロフィール未設定なら 0。 */
  avgTargetKcal: number;
  /** 月〜日の7日分。ストーリー画面のバーチャートに使う。 */
  days: WeeklyRecapDay[];
  /**
   * PFC のうち最も乖離が大きかった1軸のみ (乖離率 15%未満なら null)。
   * 3軸まとめて出すと成績表のように見えるため、あえて1つに絞る。
   * プロフィール未設定 (targetCalories <= 0) なら常に null。
   */
  macroInsight: WeeklyMacroInsight | null;
  /**
   * 観点C (目標接続型・less方向のみ) + 観点A (組成事実、observation.note に従属)。
   * macroInsight.direction が 'less' のときだけ、全履歴からその軸の密度が高い
   * Identity を提示する。'more' のときは何も言わない
   * (「減らすには」は制限フレーミングになるため意図的に非対称)。
   * 豆知識 (note) は単独スライドにせず、必ずこのアドバイスに従属して現れる —
   * 「なぜこの食材が候補か」の文脈を提供するため (唐突な組成事実を避ける)。
   */
  macroBoost: WeeklyMacroBoost | null;
}

/**
 * `now` から見て直近の完了週 (今週の1つ前、月〜日) の recap を計算する。
 * 記録日が1日も無ければ null。
 */
export function computeWeeklyRecap(
  logs: FoodLog[],
  profile: UserProfile,
  exerciseLogs: ExerciseLog[],
  dailyActivities: DailyActivitySummary[] | undefined,
  now: Date,
): WeeklyRecap | null {
  const today = startOfDay(now);
  const lastWeekAnchor = addDays(today, -7);
  const range = getWeekRange(lastWeekAnchor);
  const weekKey = formatDateKey(range.start);

  const dailyMap = getDailyMacros(logs, range);
  const entries = [...dailyMap.entries()]; // getWeekRange は月曜始まりなので既に月〜日の順
  const loggedDays = entries.filter(([, m]) => m.kcal > 0);
  if (loggedDays.length === 0) return null;

  const totalKcal = Math.round(loggedDays.reduce((sum, [, m]) => sum + m.kcal, 0));
  const avgKcal = Math.round(totalKcal / loggedDays.length);

  const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
  const targetForKey = (key: string): number => {
    if (base <= 0) return 0;
    const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
    return adjustedTargetKcal(base, exerciseLogs, key, { rawActiveKcal });
  };

  const avgTargetKcal = base > 0
    ? Math.round(
        loggedDays.reduce((sum, [key]) => sum + targetForKey(key), 0) / loggedDays.length,
      )
    : 0;

  const days: WeeklyRecapDay[] = entries.map(([key, m], i) => ({
    dateKey: key,
    weekdayLabel: WEEKDAY_JP_MON_FIRST[i] ?? '',
    logged: m.kcal > 0,
    kcal: Math.round(m.kcal),
    targetKcal: Math.round(targetForKey(key)),
  }));

  const macroInsight = base > 0
    ? computeMacroInsight(loggedDays, profile, targetForKey, base)
    : null;

  const macroBoost = computeMacroBoost(logs, macroInsight);

  return {
    weekKey,
    weekRangeLabel: formatWeekRangeLabel(range),
    daysLogged: loggedDays.length,
    totalKcal,
    avgKcal,
    avgTargetKcal,
    days,
    macroInsight,
    macroBoost,
  };
}

function densityFor(axis: MacroAxis, macro: { kcal: number; protein: number; fat: number; carbs: number }): number {
  if (macro.kcal <= 0) return 0;
  return (macro[axis] * AXIS_KCAL_PER_GRAM[axis]) / macro.kcal;
}

/**
 * 観点C: macroInsight が direction='less' のときだけ、その軸の密度が高い Identity を提示する。
 * 記録履歴にあるもの (頻度順、自分のレパートリー＝すぐ実行できる) を優先し、
 * 足りない分は未経験でも全カタログから補う (密度降順)。
 * 履歴限定だと「その軸が最も足りていない人ほど、履歴にも無く候補が出ない」逆説が生じるため、
 * 両方を組み合わせるのが意図的な設計 (2026-08-03)。
 * 最有力候補に nutritionNote があれば、観点A (組成事実) を「なぜこの候補か」の
 * 裏付けとして note に添える (単独スライドにはしない)。
 */
function computeMacroBoost(
  allLogs: FoodLog[],
  insight: WeeklyMacroInsight | null,
): WeeklyMacroBoost | null {
  if (!insight || insight.direction !== 'less') return null;
  const axis = insight.axis;

  const freq = new Map<string, number>();
  for (const log of allLogs) {
    if (!log.identityId) continue;
    freq.set(log.identityId, (freq.get(log.identityId) ?? 0) + 1);
  }

  const fromHistory: WeeklyMacroBoostCandidate[] = [...freq.entries()]
    .map(([identityId, count]): { identityId: string; label: string; count: number } | null => {
      const identity = getIdentity(identityId);
      if (!identity || densityFor(axis, identity.defaultMacro) < AXIS_DENSITY_THRESHOLD[axis]) return null;
      return { identityId, label: identity.label, count };
    })
    .filter((c): c is { identityId: string; label: string; count: number } => c !== null)
    .sort((a, b) => b.count - a.count)
    .map(({ identityId, label }) => ({ identityId, label, fromHistory: true }));

  let candidates = fromHistory.slice(0, MAX_BOOST_CANDIDATES);

  if (candidates.length < MAX_BOOST_CANDIDATES) {
    const seenIds = new Set(candidates.map((c) => c.identityId));
    const fallback = ALL_IDENTITIES
      .filter((identity) => !seenIds.has(identity.id) && densityFor(axis, identity.defaultMacro) >= AXIS_DENSITY_THRESHOLD[axis])
      .sort((a, b) => densityFor(axis, b.defaultMacro) - densityFor(axis, a.defaultMacro))
      .slice(0, MAX_BOOST_CANDIDATES - candidates.length)
      .map((identity): WeeklyMacroBoostCandidate => ({ identityId: identity.id, label: identity.label, fromHistory: false }));
    candidates = [...candidates, ...fallback];
  }

  if (candidates.length === 0) return null;

  // candidates は履歴優先の並び。この中の誰かに nutritionNote があれば添える
  // (nutritionNote は現状ホワイトリストが少ないため、1位限定だと機能しにくい)。
  let note: WeeklyFoodFact | null = null;
  for (const c of candidates) {
    const identity = getIdentity(c.identityId);
    if (identity?.nutritionNote) {
      note = { identityId: identity.id, identityLabel: identity.label, note: identity.nutritionNote };
      break;
    }
  }

  return { axis, candidates, note };
}

/**
 * 記録日の実測 P/F/C 平均と、各日の目標kcal比率でスケールした目標 P/F/C 平均を比較し、
 * 最も乖離が大きい1軸だけを返す (nutrition-ui の todayAdjustedPfc と同じスケール方式)。
 */
function computeMacroInsight(
  loggedDays: [string, { protein: number; fat: number; carbs: number }][],
  profile: UserProfile,
  targetForKey: (key: string) => number,
  base: number,
): WeeklyMacroInsight | null {
  const axes: MacroAxis[] = ['protein', 'fat', 'carbs'];
  const targetBase: Record<MacroAxis, number> = {
    protein: profile.targetProtein,
    fat: profile.targetFat,
    carbs: profile.targetCarbs,
  };

  let best: WeeklyMacroInsight | null = null;
  let bestAbsDiff = 0;

  for (const axis of axes) {
    const avgActual = loggedDays.reduce((sum, [, m]) => sum + m[axis], 0) / loggedDays.length;
    const avgTarget = loggedDays.reduce((sum, [key]) => {
      const ratio = targetForKey(key) / base;
      return sum + targetBase[axis] * ratio;
    }, 0) / loggedDays.length;

    if (avgTarget <= 0) continue;
    const diffRatio = (avgActual - avgTarget) / avgTarget;
    const absDiff = Math.abs(diffRatio);
    if (absDiff > bestAbsDiff) {
      bestAbsDiff = absDiff;
      best = {
        axis,
        direction: diffRatio > 0 ? 'more' : 'less',
        avgActual: Math.round(avgActual),
        avgTarget: Math.round(avgTarget),
      };
    }
  }

  return bestAbsDiff >= INSIGHT_THRESHOLD_RATIO ? best : null;
}
