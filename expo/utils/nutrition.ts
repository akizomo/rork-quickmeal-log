import { additionPresets, dishCategories, dishSubtypes, ingredientCategories, ingredientSubtypeDefs, ingredientSubtypes, sizeFactorMap } from '@/constants/nutrition-data';
import { DISH_TOP_CATEGORIES, getDishTopCategory } from '@/constants/dish-master';
import { DishDraft, DishQuickEntryPayload, FoodLog, FoodLogTopping, IngredientDraft, IngredientSubtypeDef, LogMode, Macro, MealSlot, PortionDisplay, PortionStepKey, PortionValue, QuickCategory, SubTypePreset, ToppingPreset, UserProfile } from '@/types/nutrition';

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

export function createEmptyMacro(): Macro {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
}

export function addMacro(left: Macro, right: Macro): Macro {
  return {
    kcal: roundMacro(left.kcal + right.kcal),
    protein: roundMacro(left.protein + right.protein),
    fat: roundMacro(left.fat + right.fat),
    carbs: roundMacro(left.carbs + right.carbs),
  };
}

export function multiplyMacro(macro: Macro, factor: number): Macro {
  return {
    kcal: roundMacro(macro.kcal * factor),
    protein: roundMacro(macro.protein * factor),
    fat: roundMacro(macro.fat * factor),
    carbs: roundMacro(macro.carbs * factor),
  };
}

export function getDefaultModeByTime(): LogMode {
  const hour = new Date().getHours();
  if (hour < 11) return 'ingredient';
  if (hour < 17) return 'dish';
  return 'dish';
}

export function getMealSlot(date: Date): MealSlot {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function getQuickCategories(mode: LogMode): QuickCategory[] {
  return mode === 'ingredient' ? ingredientCategories : dishCategories;
}

export function getCategory(mode: LogMode, key: string): QuickCategory | undefined {
  return getQuickCategories(mode).find((item) => item.key === key);
}

export function getIngredientSubtypeDefs(categoryKey: string): IngredientSubtypeDef[] {
  return ingredientSubtypeDefs[categoryKey] ?? [];
}

export function getIngredientSubtypeDef(categoryKey: string, subTypeKey?: string): IngredientSubtypeDef | undefined {
  const list = getIngredientSubtypeDefs(categoryKey);
  if (list.length === 0) return undefined;
  if (!subTypeKey) return list[0];
  return list.find((item) => item.key === subTypeKey) ?? list[0];
}

export function getDefaultSubtypeKey(categoryKey: string): string {
  const list = getIngredientSubtypeDefs(categoryKey);
  return list[0]?.key ?? '';
}

export function getSubtypes(mode: LogMode, categoryKey: string): SubTypePreset[] {
  return mode === 'ingredient'
    ? ingredientSubtypes[categoryKey] ?? []
    : dishSubtypes[categoryKey] ?? [];
}

export function getSubType(mode: LogMode, categoryKey: string, subTypeKey?: string): SubTypePreset | undefined {
  if (!subTypeKey) return undefined;
  return getSubtypes(mode, categoryKey).find((item) => item.key === subTypeKey);
}

export function clampPortion(value: number): PortionValue {
  if (value <= 0.5) return 0.5;
  if (value < 1.25) return 1;
  if (value < 1.75) return 1.5;
  return 2;
}

const DEFAULT_PORTION_SECONDARY: Record<PortionStepKey, string> = {
  '0.5': '約半分量',
  '1': '約標準量',
  '1.5': '約1.5倍量',
  '2': '約2倍量',
};

export function getPortionDisplay(
  subtype: IngredientSubtypeDef | undefined,
  portion: PortionValue
): PortionDisplay {
  const key = String(portion) as PortionStepKey;
  const display = subtype?.portionDisplays?.[key];
  if (display) return display;
  const legacy = subtype?.portionLabels?.[key];
  return {
    primaryLabel: legacy ?? `${portion}x`,
    secondaryLabel: DEFAULT_PORTION_SECONDARY[key],
  };
}

export function getPortionLabel(subtype: IngredientSubtypeDef | undefined, portion: PortionValue): string {
  return getPortionDisplay(subtype, portion).primaryLabel;
}

export function getBaselineLabel(subtype: IngredientSubtypeDef | undefined): string {
  return subtype?.baselineLabel ?? '標準量';
}

export function getToppingsForSubtype(subtype: IngredientSubtypeDef | undefined): ToppingPreset[] {
  return subtype?.toppings ?? [];
}

export interface IngredientComputation {
  baseMacro: Macro;
  toppingMacroDelta: Macro;
  total: Macro;
  toppings: FoodLogTopping[];
  subtype?: IngredientSubtypeDef;
  portionLabel: string;
  portionDisplay: PortionDisplay;
}

export function computeIngredient(draft: IngredientDraft): IngredientComputation {
  const subtype = getIngredientSubtypeDef(draft.categoryKey, draft.subTypeKey);
  const portion = draft.portionValue;
  const baseMacro = subtype ? multiplyMacro(subtype.baseMacro, portion) : createEmptyMacro();

  const toppingsList = getToppingsForSubtype(subtype);
  const selectedToppings: FoodLogTopping[] = draft.toppingKeys
    .map((key) => toppingsList.find((t) => t.key === key))
    .filter((t): t is ToppingPreset => Boolean(t))
    .map((t) => ({ id: t.key, label: t.label, macroDelta: t.macroDelta }));

  const toppingMacroDelta = selectedToppings.reduce(
    (acc, item) => addMacro(acc, item.macroDelta),
    createEmptyMacro()
  );
  const total = addMacro(baseMacro, toppingMacroDelta);

  const display = getPortionDisplay(subtype, portion);
  return {
    baseMacro,
    toppingMacroDelta,
    total,
    toppings: selectedToppings,
    subtype,
    portionLabel: display.primaryLabel,
    portionDisplay: display,
  };
}

export function buildIngredientMacro(draft: IngredientDraft): Macro {
  return computeIngredient(draft).total;
}

export function buildDishMacro(draft: DishDraft): Macro {
  const category = getCategory('dish', draft.categoryKey);
  if (!category) {
    console.log('[nutrition] Missing dish category', draft.categoryKey);
    return createEmptyMacro();
  }

  const subtypeDelta = getSubType('dish', draft.categoryKey, draft.subTypeKey)?.macroDelta ?? createEmptyMacro();
  const additionsMacro = draft.additions
    .map((key) => additionPresets.find((item) => item.key === key)?.macro ?? createEmptyMacro())
    .reduce((acc, item) => addMacro(acc, item), createEmptyMacro());

  const base = addMacro(addMacro(category.baseMacro, subtypeDelta), additionsMacro);
  const factor = sizeFactorMap[draft.size] ?? 1;
  return multiplyMacro(base, factor);
}

export function createFoodLogFromIngredient(categoryKey: string): FoodLog | null {
  const category = getCategory('ingredient', categoryKey);
  if (!category) return null;
  const defaultSubKey = getDefaultSubtypeKey(categoryKey);
  const draft: IngredientDraft = {
    categoryKey,
    subTypeKey: defaultSubKey,
    portionValue: 1,
    toppingKeys: [],
  };
  const computation = computeIngredient(draft);
  const now = new Date();
  return {
    id: generateId('log'),
    date: formatDateKey(now),
    timestamp: now.toISOString(),
    mealSlot: getMealSlot(now),
    mode: 'ingredient',
    categoryKey,
    categoryLabel: category.label,
    subTypeKey: defaultSubKey || undefined,
    subTypeLabel: computation.subtype?.label,
    portionValue: 1,
    portionLabel: computation.portionLabel,
    amountMultiplier: 1,
    baseMacro: computation.baseMacro,
    toppings: [],
    toppingMacroDelta: computation.toppingMacroDelta,
    macro: computation.total,
  };
}

export function createFoodLogFromDish(categoryKey: string): FoodLog | null {
  const topCat = getDishTopCategory(categoryKey);
  if (topCat && topCat.quickEntry.kind === 'instant_save') {
    const defaultSubKey = topCat.quickEntry.defaultSubcategoryKey;
    const sub = topCat.subcategories.find((s) => s.key === defaultSubKey)
      ?? topCat.subcategories[0];
    if (sub) {
      const now = new Date();
      return {
        id: generateId('log'),
        date: formatDateKey(now),
        timestamp: now.toISOString(),
        mealSlot: getMealSlot(now),
        mode: 'dish',
        categoryKey: topCat.key,
        categoryLabel: topCat.label,
        subTypeKey: sub.key,
        subTypeLabel: sub.label,
        size: 'regular',
        additions: [],
        portionValue: 1,
        portionLabel: '1人前',
        amountMultiplier: 1,
        baseMacro: sub.baseMacroAt1x,
        macro: sub.baseMacroAt1x,
      };
    }
  }

  const category = getCategory('dish', categoryKey);
  if (!category) return null;
  const now = new Date();
  return {
    id: generateId('log'),
    date: formatDateKey(now),
    timestamp: now.toISOString(),
    mealSlot: getMealSlot(now),
    mode: 'dish',
    categoryKey,
    categoryLabel: category.label,
    size: 'regular',
    additions: [],
    macro: buildDishMacro({ categoryKey, size: 'regular', additions: [] }),
  };
}

export function createFoodLogFromDishQuickEntry(payload: DishQuickEntryPayload): FoodLog | null {
  const topCat = getDishTopCategory(payload.topCategoryKey);
  if (!topCat) return null;
  const now = new Date();
  return {
    id: generateId('log'),
    date: formatDateKey(now),
    timestamp: now.toISOString(),
    mealSlot: getMealSlot(now),
    mode: 'dish',
    categoryKey: topCat.key,
    categoryLabel: topCat.label,
    subTypeKey: payload.subcategoryKey,
    subTypeLabel: payload.subcategoryLabel,
    portionValue: payload.portionFactor as PortionValue | undefined,
    portionLabel: payload.portionPrimaryLabel,
    amountMultiplier: payload.portionFactor,
    size: 'regular',
    additions: [],
    baseMacro: payload.macro,
    macro: payload.macro,
  };
}

export function draftFromLog(log: FoodLog): IngredientDraft {
  const subKey = log.subTypeKey && getIngredientSubtypeDef(log.categoryKey, log.subTypeKey)
    ? log.subTypeKey
    : getDefaultSubtypeKey(log.categoryKey);
  const portion: PortionValue = clampPortion(log.portionValue ?? log.amountMultiplier ?? 1);
  const subtype = getIngredientSubtypeDef(log.categoryKey, subKey);
  const availableToppings = getToppingsForSubtype(subtype);
  const toppingKeys = (log.toppings ?? [])
    .map((t) => t.id)
    .filter((id) => availableToppings.some((t) => t.key === id));
  return { categoryKey: log.categoryKey, subTypeKey: subKey, portionValue: portion, toppingKeys };
}

export function sumToday(logs: FoodLog[], dateKey: string): Macro {
  return logs
    .filter((log) => log.date === dateKey)
    .reduce((acc, item) => addMacro(acc, item.macro), createEmptyMacro());
}

export function getGoalMessage(total: Macro, profile: UserProfile): string {
  const ratio = profile.targetCalories > 0 ? total.kcal / profile.targetCalories : 0;
  if (ratio < 0.3) return '静かに積み上げる日。まずは一皿から。';
  if (ratio < 0.7) return 'いい流れです。無理なく整っています。';
  if (ratio < 1) return '今日はかなり安定。あと少しで目標です。';
  return '目標達成。あとは気持ちよく整えるだけ。';
}

export type DailyTimeSlot = 'morning' | 'midday' | 'evening' | 'late' | 'overnight';
export type DailyPaceState = 'behind' | 'on_track' | 'ahead';
export type DailyPfcState = 'balanced' | 'protein_low' | 'fat_high' | 'carb_high' | 'mixed_skew';

export interface DailyFeedback {
  subheader: string;
  body: string;
  hasLogs: boolean;
  targetConfigured: boolean;
  paceState: DailyPaceState | null;
  pfcState: DailyPfcState | null;
  timeSlot: DailyTimeSlot;
}

export function getDailyTimeSlot(hour: number): DailyTimeSlot {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 25) return 'late';
  return 'overnight';
}

export function getDailyPaceState(progressRatio: number, slot: DailyTimeSlot): DailyPaceState {
  const pct = progressRatio * 100;
  if (slot === 'morning') {
    if (pct < 10) return 'behind';
    if (pct <= 30) return 'on_track';
    return 'ahead';
  }
  if (slot === 'midday') {
    if (pct < 35) return 'behind';
    if (pct <= 60) return 'on_track';
    return 'ahead';
  }
  if (slot === 'evening') {
    if (pct < 65) return 'behind';
    if (pct <= 90) return 'on_track';
    return 'ahead';
  }
  if (pct < 85) return 'behind';
  if (pct <= 105) return 'on_track';
  return 'ahead';
}

function buildSubheader(slot: DailyTimeSlot, pace: DailyPaceState): string {
  if (slot === 'morning') {
    if (pace === 'behind') return 'まだ静かな朝。これから整えやすい時間です。';
    if (pace === 'on_track') return '朝のペースは自然な流れです。';
    return '朝から少し早めのペースです。';
  }
  if (slot === 'midday') {
    if (pace === 'behind') return 'お昼までは少し軽めの入り方です。';
    if (pace === 'on_track') return 'お昼までちょうどいいペースです。';
    return 'お昼までにやや早めのペースです。';
  }
  if (slot === 'evening') {
    if (pace === 'behind') return '夕方時点では今日は軽めの進み方です。';
    if (pace === 'on_track') return '夕方にかけて落ち着いたペースです。';
    return '夕方までにしっかりめのペースです。';
  }
  if (pace === 'behind') return '今日は全体として軽めの一日です。';
  if (pace === 'on_track') return '一日を通して安定したペースです。';
  return '今日はしっかりめの一日でした。';
}

export function getDailyPfcState(macro: Macro): DailyPfcState {
  const proteinKcal = Math.max(macro.protein, 0) * 4;
  const fatKcal = Math.max(macro.fat, 0) * 9;
  const carbKcal = Math.max(macro.carbs, 0) * 4;
  const total = proteinKcal + fatKcal + carbKcal;
  if (total <= 0) return 'balanced';
  const p = proteinKcal / total;
  const f = fatKcal / total;
  const c = carbKcal / total;
  const pLow = p < 0.15;
  const fHigh = f > 0.3;
  const cHigh = c > 0.6;
  const skewCount = [pLow, fHigh, cHigh].filter(Boolean).length;
  if (skewCount >= 2) return 'mixed_skew';
  if (pLow) return 'protein_low';
  if (fHigh) return 'fat_high';
  if (cHigh) return 'carb_high';
  const balanced =
    p >= 0.15 && p <= 0.25 &&
    f >= 0.2 && f <= 0.3 &&
    c >= 0.45 && c <= 0.6;
  if (balanced) return 'balanced';
  return 'mixed_skew';
}

function buildBody(pfc: DailyPfcState, slot: DailyTimeSlot): string {
  const suggestByTime = {
    morning: {
      protein_low: '昼はたんぱく質を一品足すと整いやすそうです。',
      fat_high: '昼は軽めの組み合わせでもよさそうです。',
      carb_high: '昼はおかず寄りにすると整いやすそうです。',
      mixed_skew: '昼で少し整えるとバランスが戻りやすそうです。',
    },
    midday: {
      protein_low: '夕食でたんぱく質を足すと整いやすそうです。',
      fat_high: '夕食は軽めの組み合わせでもよさそうです。',
      carb_high: '夕食はおかず中心にすると整いやすそうです。',
      mixed_skew: '夕食で少し整えるとバランスが戻りやすそうです。',
    },
    evening: {
      protein_low: '残りはたんぱく質中心だと整いやすそうです。',
      fat_high: '残りは軽めに整えるとよさそうです。',
      carb_high: '残りはおかず寄りにすると整いやすそうです。',
      mixed_skew: '残りで少し整えるとバランスが戻りやすそうです。',
    },
    late: {
      protein_low: '明日の最初の食事で整えやすそうです。',
      fat_high: '明日は軽めの朝から始めるとよさそうです。',
      carb_high: '明日はおかず多めの一日にすると整いやすそうです。',
      mixed_skew: '明日の最初の食事で整えやすそうです。',
    },
    overnight: {
      protein_low: '明日の朝から整えていけます。',
      fat_high: '明日は軽めの朝から始めるとよさそうです。',
      carb_high: '明日はおかず多めの一日にすると整いやすそうです。',
      mixed_skew: '明日の朝から整えていけます。',
    },
  } as const;

  if (pfc === 'balanced') {
    return '今日は比較的バランスよく取れています。';
  }
  const observe =
    pfc === 'protein_low' ? '今日はたんぱく質が少し少なめです。' :
    pfc === 'fat_high' ? '今日は脂質がやや高めです。' :
    pfc === 'carb_high' ? '今日は炭水化物寄りです。' :
    '今日は少し偏りが出ています。';
  const suggest = suggestByTime[slot][pfc];
  return `${observe}${suggest}`;
}

export function getDailyFeedback(
  total: Macro,
  profile: UserProfile,
  now: Date = new Date(),
  logCount: number = 0
): DailyFeedback {
  const hour = now.getHours();
  const timeSlot = getDailyTimeSlot(hour);
  const hasLogs = logCount > 0 || total.kcal > 0;
  const targetConfigured = profile.targetCalories > 0;

  if (!hasLogs) {
    return {
      subheader: '今日はまだ記録がありません。',
      body: '下のボタンから最初の一皿を記録できます。',
      hasLogs: false,
      targetConfigured,
      paceState: null,
      pfcState: null,
      timeSlot,
    };
  }

  if (!targetConfigured) {
    return {
      subheader: `今日の累計 ${Math.round(total.kcal)} kcal`,
      body: 'My Status から目標カロリーを設定できます。',
      hasLogs: true,
      targetConfigured: false,
      paceState: null,
      pfcState: getDailyPfcState(total),
      timeSlot,
    };
  }

  const progressRatio = total.kcal / profile.targetCalories;
  const paceState = getDailyPaceState(progressRatio, timeSlot);
  const pfcState = getDailyPfcState(total);
  return {
    subheader: buildSubheader(timeSlot, paceState),
    body: buildBody(pfcState, timeSlot),
    hasLogs: true,
    targetConfigured: true,
    paceState,
    pfcState,
    timeSlot,
  };
}

export function formatMacroText(macro: Macro): string {
  return `P${macro.protein} F${macro.fat} C${macro.carbs}`;
}

export function clampAmount(amount: number): number {
  return clampPortion(amount);
}

export function summarizeToppings(toppings: FoodLogTopping[] | undefined): string | null {
  if (!toppings || toppings.length === 0) return null;
  if (toppings.length === 1) return toppings[0].label;
  if (toppings.length === 2) return `${toppings[0].label}、${toppings[1].label}`;
  return `${toppings[0].label}ほか${toppings.length - 1}件`;
}
