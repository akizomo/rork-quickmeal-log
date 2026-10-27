/**
 * DEV 専用 — ストア用スクリーンショットの撮影データ。
 *
 * 「4週間ほど続けている人」の状態を丸ごと作る。食事ログ・体重・体脂肪率・運動・
 * ⭐️タブの履歴まで埋め、ホーム / 実績グラフ / 週次リキャップが中身のある見た目になる。
 * 乱数は固定シードなので、何度入れても同じ見た目で撮り直せる (日付だけは今日基準)。
 *
 * 書き込みは `/dev` の「ストア撮影用データを入れる」から。既存の記録はすべて置き換わる。
 */

import { INTRO_VERSION } from '@/constants/onboarding';
import { bodyType9ToStage } from '@/constants/body-matrix';
import { getIdentity } from '@/constants/identity';
import { defaultSettings } from '@/constants/nutrition-data';
import type { QuickLogHistoryMap, QuickLogSelection } from '@/types/quick-log';
import type {
  AppSettings,
  BodyFatEntry,
  BodyType9,
  ExerciseLog,
  FoodLog,
  MealSlot,
  UserProfile,
  WeightEntry,
} from '@/types/nutrition';
import { calcExerciseGrossKcal, calcExerciseNetKcal, EXERCISE_TYPES, recommendGoal } from '@/utils/goals';
import { logDraftToFoodLog } from '@/utils/identity-log-bridge';
import { resolveLog } from '@/utils/identity-resolver';
import { MIGRATIONS } from '@/utils/log-migrations';
import { formatDateKey } from '@/utils/nutrition';
import { deriveDefaultTab, recordSelection } from '@/utils/quick-log-history';

const DAYS = 28;

/** 線形合同法。Math.random と違い毎回同じ列を返す。 */
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

type Meal = string[];

// 実在の Identity ID だけで組む。存在しない ID は下で黙って飛ばす。
const BREAKFASTS: Meal[] = [
  ['bread', 'egg', 'yogurt'],
  ['onigiri', 'egg', 'veggie_soup'],
  ['oatmeal', 'yogurt', 'berry', 'egg'],
  ['rice', 'natto', 'egg', 'veggie_soup'],
  ['bread', 'egg', 'banana'],
  ['protein_drink', 'banana', 'yogurt'],
];

const LUNCHES: Meal[] = [
  ['teishoku'],
  ['soba', 'salad_chicken'],
  ['chirashi'],
  ['ramen_light'],
  ['udon', 'salad_chicken'],
  ['onigiri', 'onigiri', 'salad_chicken', 'veggie_soup'],
  ['pasta_tomato', 'salad_raw'],
  ['teishoku'],
];

const DINNERS: Meal[] = [
  ['rice', 'white_fish', 'veg_cooked', 'tofu', 'veggie_soup'],
  ['rice', 'chicken_lean', 'salad_raw', 'side_seasoned', 'veggie_soup'],
  ['rice', 'sashimi', 'edamame_soy', 'veggie_soup'],
  ['rice', 'fatty_fish', 'side_seasoned', 'veggie_soup'],
  ['rice', 'red_meat', 'veg_cooked', 'side_seasoned', 'veggie_soup'],
  ['yakitori', 'rice', 'salad_raw'],
  ['rice', 'seafood_lean', 'veg_cooked', 'tofu', 'veggie_soup'],
  ['curry_class', 'salad_raw'],
];

const SNACKS: Meal[] = [['chocolate'], ['cookie'], ['apple_pear'], ['citrus'], ['protein_drink'], ['alcohol'], ['cake'], ['banana']];

const SLOT_HOURS: Record<MealSlot, [number, number]> = {
  breakfast: [7, 30],
  lunch: [12, 15],
  dinner: [19, 0],
  snack: [15, 30],
};

export interface StoreDemoState {
  profile: UserProfile;
  logs: FoodLog[];
  settings: AppSettings;
  weights: WeightEntry[];
  bodyFatEntries: BodyFatEntry[];
  exerciseLogs: ExerciseLog[];
  dailyActivities: [];
}

export function buildStoreDemoState(now: Date = new Date()): StoreDemoState {
  const rand = createRng(20261025);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayAt = (daysAgo: number, slot: MealSlot, jitterMin = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const [h, m] = SLOT_HOURS[slot];
    d.setHours(h, m + jitterMin, 0, 0);
    return d;
  };

  // ── 人物: 30代・女性基準・ゆるく減量中 ─────────────────────────
  const heightCm = 160;
  const startWeightKg = 60.4;
  const currentWeightKg = 58.6;
  const currentBodyType9: BodyType9 = { fat: 1, muscle: 1 };
  const targetBodyType9: BodyType9 = { fat: 0, muscle: 1 };
  const recommendation = recommendGoal({
    heightCm,
    weightKg: currentWeightKg,
    ageYears: 34,
    basis: 'female_basis',
    direction: 'lose',
    activityLevel: 2,
    paceLevel: 'gentle',
    targetBodyType9,
    currentBodyFatPct: 27,
    locale: 'ja',
  });

  const createdAt = new Date(today);
  createdAt.setDate(createdAt.getDate() - DAYS);
  const createdAtISO = createdAt.toISOString();

  const profile: UserProfile = {
    id: 'user-store-demo',
    name: 'You',
    heightCm,
    currentWeightKg,
    targetWeightKg: recommendation?.targetWeightKg ?? 55,
    goalType: 'weight_loss',
    targetCalories: recommendation?.targetKcal ?? 1700,
    targetProtein: recommendation?.proteinG ?? 95,
    targetFat: recommendation?.fatG ?? 45,
    targetCarbs: recommendation?.carbsG ?? 220,
    ageYears: 34,
    biologicalBasis: 'female_basis',
    currentBodyFatPct: 27,
    targetBodyFatPct: recommendation?.targetBodyFatPct ?? 24,
    goalDirection: 'lose',
    currentBodyStage: bodyType9ToStage(currentBodyType9),
    targetBodyStage: bodyType9ToStage(targetBodyType9),
    currentBodyType9,
    targetBodyType9,
    activityLevel: 2,
    paceLevel: 'gentle',
    createdAt: createdAtISO,
    updatedAt: now.toISOString(),
  };

  // ── 食事ログ ─────────────────────────────────────────────
  const logs: FoodLog[] = [];
  let history: QuickLogHistoryMap = {};
  const tabUsageCounts = { ingredient: 0, dish: 0, frequent: 0 };
  let seq = 0;

  const addMeal = (meal: Meal, when: Date, slot: MealSlot) => {
    meal.forEach((identityId, i) => {
      if (!getIdentity(identityId)) return;
      const resolved = resolveLog({ originIdentityId: identityId });
      const ts = new Date(when.getTime() + i * 60_000);
      const log = logDraftToFoodLog(
        resolved,
        {
          id: `log-demo-${seq++}`,
          date: formatDateKey(ts),
          timestamp: ts.toISOString(),
          mealSlot: slot,
          wasShortTap: true,
        },
        'ja',
      );
      logs.push(log);

      const sel: QuickLogSelection = {
        categoryKey: log.categoryKey,
        subcategoryKey: log.subTypeKey ?? log.categoryKey,
        attrKey: log.attrKey as QuickLogSelection['attrKey'],
        styleKey: log.styleKey,
        amountValue: log.amountValue ?? 1,
        amountUnit: log.amountUnit ?? 'piece',
        amountLabel: log.amountLabel,
        loggedAtISO: log.timestamp,
        mode: log.mode,
      };
      history = recordSelection(history, sel, log.mode === 'dish' ? `dish:${log.categoryKey}` : log.categoryKey);
      tabUsageCounts[log.mode] += 1;
    });
  };

  // 古い日 → 新しい日の順で積む (履歴は「新しいものが先頭」になる)
  for (let daysAgo = DAYS; daysAgo >= 1; daysAgo--) {
    // たまに朝を抜く日・記録しない日がある方が実際の使われ方に近い。
    // ただしホームの週リングに空きが出ないよう、記録しない日は先週より前だけにする
    const skipDay = rand() < 0.06;
    if (skipDay && daysAgo > 7) continue;
    if (rand() > 0.12) addMeal(pick(BREAKFASTS), dayAt(daysAgo, 'breakfast', Math.floor(rand() * 30)), 'breakfast');
    addMeal(pick(LUNCHES), dayAt(daysAgo, 'lunch', Math.floor(rand() * 40)), 'lunch');
    if (rand() < 0.8) addMeal(pick(SNACKS), dayAt(daysAgo, 'snack', Math.floor(rand() * 60)), 'snack');
    addMeal(pick(DINNERS), dayAt(daysAgo, 'dinner', Math.floor(rand() * 60)), 'dinner');
  }
  // 今日は朝と昼まで (ホームのリングが途中の状態になる)
  addMeal(['bread', 'egg', 'yogurt'], dayAt(0, 'breakfast', 5), 'breakfast');
  addMeal(['soba', 'salad_chicken'], dayAt(0, 'lunch', 10), 'lunch');

  logs.reverse();

  // ── 体重・体脂肪率: 週4〜5回の計測で、ゆるやかに下がる ───────────────
  const weights: WeightEntry[] = [];
  const bodyFatEntries: BodyFatEntry[] = [];
  const WEIGHT_DAYS = 70;
  for (let daysAgo = WEIGHT_DAYS; daysAgo >= 0; daysAgo--) {
    if (daysAgo !== 0 && rand() < 0.35) continue;
    const progress = 1 - daysAgo / WEIGHT_DAYS;
    const noise = (rand() - 0.5) * 0.6;
    const weightKg = Math.round((startWeightKg - (startWeightKg - currentWeightKg) * progress + noise) * 10) / 10;
    const at = dayAt(daysAgo, 'breakfast', -30);
    const dateKey = formatDateKey(at);
    weights.push({ id: `w-demo-${daysAgo}`, date: dateKey, weightKg: daysAgo === 0 ? currentWeightKg : weightKg, createdAt: at.toISOString(), source: 'manual' });
    const bf = Math.round((28.4 - 1.4 * progress + (rand() - 0.5) * 0.5) * 10) / 10;
    bodyFatEntries.push({ id: `bf-demo-${daysAgo}`, date: dateKey, bodyFatPct: daysAgo === 0 ? 27 : bf, createdAt: at.toISOString(), source: 'manual' });
  }
  weights.reverse();
  bodyFatEntries.reverse();

  // ── 運動: 週2〜3回 ─────────────────────────────────────
  const exerciseLogs: ExerciseLog[] = [];
  for (let daysAgo = DAYS; daysAgo >= 0; daysAgo--) {
    if (daysAgo !== 0 && rand() > 0.38) continue;
    const typeKey = daysAgo === 0 ? 'walking' : pick(['walking', 'walking', 'yoga', 'strength', 'cycling']);
    const type = EXERCISE_TYPES.find((x) => x.key === typeKey)!;
    const minutes = daysAgo === 0 ? 30 : pick([20, 30, 30, 40, 45]);
    const grossKcal = calcExerciseGrossKcal(type.met, currentWeightKg, minutes);
    const at = dayAt(daysAgo, 'dinner', -90);
    exerciseLogs.push({
      id: `ex-demo-${daysAgo}`,
      date: formatDateKey(at),
      timestamp: at.toISOString(),
      exerciseType: type.key,
      exerciseLabel: type.label,
      minutes,
      grossKcal,
      netKcal: calcExerciseNetKcal(grossKcal),
      source: 'manual',
    });
  }
  exerciseLogs.reverse();

  const nowISO = now.toISOString();
  // 先週の振り返りバナーは見た扱いにして、ホームに出さない (weekKey = 先週の月曜)
  const lastWeekMonday = new Date(today);
  lastWeekMonday.setDate(lastWeekMonday.getDate() - ((today.getDay() + 6) % 7) - 7);
  const settings: AppSettings = {
    ...defaultSettings,
    introSeenVersion: INTRO_VERSION,
    onboardingCompleted: true,
    onboardingStep: 0,
    onboardingCompletedAtISO: createdAtISO,
    paywallSeenAtISO: createdAtISO,
    healthConnectSeenAtISO: createdAtISO,
    roughHintSeenAtISO: createdAtISO,
    widgetNudgeDismissedAtISO: createdAtISO,
    widgetIntroSeenAtISO: createdAtISO,
    subscriptionStatus: 'active',
    trialStartedAtISO: createdAtISO,
    quickLogHistory: history,
    tabUsageCounts,
    currentDefaultTab: deriveDefaultTab(history, tabUsageCounts, undefined),
    appliedMigrations: MIGRATIONS.map((m) => m.id),
    iaSchemaVersion: 2,
    uiLanguage: 'ja',
    foodRegion: 'ja',
    unitSystem: 'metric',
    lastHealthSyncAtISO: nowISO,
    weeklyRecapDismissedWeekKey: formatDateKey(lastWeekMonday),
  };

  return { profile, logs, settings, weights, bodyFatEntries, exerciseLogs, dailyActivities: [] };
}
