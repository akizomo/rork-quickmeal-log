export type GoalType = 'balanced' | 'weight_loss' | 'protein_focus';
export type LogMode = 'ingredient' | 'dish';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DishSize = 'small' | 'regular' | 'large' | 'extra';
export type PortionValue = 0.5 | 1 | 1.5 | 2;

export interface Macro {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export type BiologicalBasis = 'male_basis' | 'female_basis';
export type GoalDirection = 'lose' | 'maintain' | 'gain' | 'recomp';
export type BodyStage = 1 | 2 | 3 | 4 | 5;
export type ActivityLevel = 1 | 2 | 3 | 4;
export type PaceLevel = 'gentle' | 'standard' | 'strong';

// 9-cell body type matrix: fat axis × muscle axis.
// 0 = 少なめ / 1 = ふつう / 2 = 多め
export type BodyAxisLevel = 0 | 1 | 2;
export interface BodyType9 {
  fat: BodyAxisLevel;
  muscle: BodyAxisLevel;
}
export type MealStyle = 'home_cooked' | 'eating_out' | 'convenience' | 'mixed' | 'unset';
export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PortionTendency = 'light' | 'normal' | 'heavy';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'expired';

export interface UserProfile {
  id: string;
  name?: string;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  goalType: GoalType;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  ageYears?: number | null;
  biologicalBasis?: BiologicalBasis | null;
  currentBodyFatPct?: number | null;
  targetBodyFatPct?: number | null;
  goalDirection?: GoalDirection | null;
  currentBodyStage?: BodyStage | null;
  targetBodyStage?: BodyStage | null;
  currentBodyType9?: BodyType9 | null;
  targetBodyType9?: BodyType9 | null;
  activityLevel?: ActivityLevel | null;
  paceLevel?: PaceLevel | null;
  createdAt: string;
  updatedAt: string;
}

/** 体重・体脂肪・運動ログのデータ取得元。UI 表示には使わない (デバッグ・重複排除用) */
export type EntrySource = 'manual' | 'health';

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
  /** v1.7+: 取得元。未指定は 'manual' とみなす */
  source?: EntrySource;
  /** v1.7+: Health SDK 由来エントリの安定 ID。重複排除に使用 */
  healthSyncId?: string;
}

export interface BodyFatEntry {
  id: string;
  date: string;
  bodyFatPct: number;
  createdAt: string;
  source?: EntrySource;
  healthSyncId?: string;
}

export interface FoodLogTopping {
  id: string;
  label: string;
  macroDelta: Macro;
}

export interface FoodLog {
  id: string;
  date: string;
  timestamp: string;
  mealSlot?: MealSlot;
  mode: LogMode;
  categoryKey: string;
  categoryLabel: string;
  subTypeKey?: string;
  subTypeLabel?: string;
  portionValue?: PortionValue;
  portionLabel?: string;
  baseMacro?: Macro;
  toppings?: FoodLogTopping[];
  toppingMacroDelta?: Macro;
  additions?: string[];
  size?: DishSize;
  amountMultiplier?: number;
  macro: Macro;
  // QuickIngredient sheet (long-press) detail fields. All optional — older logs
  // remain valid without these set.
  attrKey?: string;
  partKey?: string;
  methodKey?: string;
  amountValue?: number;
  amountUnit?: 'g' | 'ml' | 'piece';
  amountLabel?: string;
  // Identity-first IA fields (Phase 2+). Optional for backward compatibility:
  // older logs use categoryKey/subTypeKey only and have no identityId.
  identityId?: string;        // recordIdentity (after migration)
  originIdentityId?: string;  // entry-point Identity the user picked
  styleKey?: string;
  /** Resolved add-ons applied to this log (Identity流用 or pure Addon ID). */
  appliedAddons?: FoodLogAddon[];
  /**
   * True when this log was created via a single tap on a bucket button (no
   * detail editing). Used by the log list display to show the bucket label
   * instead of the specific Identity name (matches user expectation that
   * "I tapped 肉魚(低脂)" shows as "肉魚(低脂)" not "鶏むね・ささみ").
   */
  wasShortTap?: boolean;
}

/**
 * Add-on entry persisted on FoodLog. Mirrors `AppliedAddon` from
 * `@/types/identity` but kept in nutrition.ts to avoid circular imports.
 */
export interface FoodLogAddon {
  refId: string;                    // 'egg' | 'mentaiko' | ...
  refType: 'identity' | 'addon';
  units: number;
  addedMacro: Macro;
}

export interface ExerciseLog {
  id: string;
  date: string;
  timestamp: string;
  exerciseType: string;
  exerciseLabel: string;
  minutes: number;
  grossKcal: number;
  netKcal: number;
  /** v1.7+: 取得元。未指定は 'manual' とみなす */
  source?: EntrySource;
  /** v1.7+: Health SDK 由来エントリの安定 ID。重複排除に使用 */
  healthSyncId?: string;
}

/**
 * v1.7+: 1日合計の活動データ (歩数 + アクティブエネルギー)。
 * 個別 ExerciseLog (ワークアウト) と別軸でストック。日次・上書き保存。
 * UI 上は ExerciseSheet 上部の「今日の活動」サマリで使用する (履歴一覧には出さない)。
 */
export interface DailyActivitySummary {
  /** YYYY-MM-DD */
  date: string;
  steps: number;
  /** アクティブエネルギー (kcal, 1日合計) */
  activeKcal: number;
  source: 'health';
  /** 最終同期 ISO */
  syncedAt: string;
}

export interface AppSettings {
  defaultTabByTime: {
    morning: LogMode;
    noon: LogMode;
    evening: LogMode;
  };
  hapticsEnabled: boolean;
  introSeenVersion?: number;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  mealStyleBySlot?: Record<MealSlotKey, MealStyle>;
  favoriteItemIds?: string[];
  portionTendency?: PortionTendency;
  trialStartedAtISO?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  onboardingCompletedAtISO?: string | null;
  paywallSeenAtISO?: string | null;
  /**
   * v1.7+: ペイウォール突破後に表示するヘルス連携ステップを既に出したかどうか。
   * `null` のとき次回ホーム遷移前に `/health-connect` を表示する。
   * 連携・スキップどちらでも ISO 時刻が入る (二度と表示しない)。
   */
  healthConnectSeenAtISO?: string | null;
  /**
   * v1.7+: 最後に Health 同期が成功した時刻 (ISO)。
   * foreground 復帰時の自動再同期スロットル (5分) 判定に使う。
   * アンマウントで消えないよう、フック state ではなくここに永続化する。
   */
  lastHealthSyncAtISO?: string | null;
  /**
   * Per-category history of long-press quick-log selections (most recent first,
   * capped per category). Used to seed default values on the next sheet open
   * via "recent → most-frequent → system default" priority.
   * The value type is intentionally typed loosely here to avoid a circular
   * dependency with `quick-log.ts`. The persisted shape matches
   * `QuickLogHistoryMap` from `@/types/quick-log`.
   */
  quickLogHistory?: Record<string, unknown[]>;
  /**
   * Identity-first IA schema version applied to the persisted FoodLog list.
   * Bumped when a one-shot backfill of `identityId` runs at boot.
   *   undefined / 0 — never migrated yet
   *   1 — LEGACY_TO_IDENTITY_MAP has been applied (Phase 5)
   */
  iaSchemaVersion?: number;
  /**
   * 帳尻調整バナーを dismiss した日付 (dateKey "YYYY-MM-DD")。
   * 当日に一致するとき、その日のバナーを表示しない。
   */
  kcalCarryoverDismissedDate?: string;
  /**
   * 帳尻調整（前日オーバー分の差し引き）を適用中の日付 (dateKey)。
   * 当日に一致するとき、今日の目標を前日オーバー分だけ減算する。
   */
  kcalCarryoverAppliedDate?: string;
}

export interface QuickCategory {
  key: string;
  label: string;
  emoji: string;
  baseMacro: Macro;
}

export interface AdditionPreset {
  key: string;
  label: string;
  macro: Macro;
}

export interface ToppingPreset {
  key: string;
  label: string;
  macroDelta: Macro;
}

export type PortionStepKey = '0.5' | '1' | '1.5' | '2';

export interface PortionDisplay {
  primaryLabel: string;
  secondaryLabel: string;
  helperLabel?: string;
}

export interface IngredientSubtypeDef {
  key: string;
  label: string;
  baselineLabel: string;
  baseMacro: Macro;
  toppings?: ToppingPreset[];
  portionLabels?: Partial<Record<PortionStepKey, string>>;
  portionDisplays?: Partial<Record<PortionStepKey, PortionDisplay>>;
}

export interface SubTypePreset {
  key: string;
  label: string;
  macroDelta?: Macro;
}

export interface IngredientDraft {
  categoryKey: string;
  subTypeKey: string;
  portionValue: PortionValue;
  toppingKeys: string[];
}

export interface DishDraft {
  categoryKey: string;
  subTypeKey?: string;
  additions: string[];
  size: DishSize;
}

export type DishTopCategoryKey =
  | 'rice_dish'
  | 'curry'
  | 'chinese_noodles'
  | 'japanese_noodles'
  | 'pasta'
  | 'sushi'
  | 'sandwich'
  | 'pizza'
  | 'set_meal';

export type StandardPortionFactor = 0.5 | 0.75 | 1 | 1.5 | 2;

export type ChineseNoodlesPrimaryType =
  | 'ramen'
  | 'tsukemen'
  | 'soupless'
  | 'fried_noodles'
  | 'hiyashi_chuka';

export type RamenStyle =
  | 'ramen_light'
  | 'ramen_iekei'
  | 'ramen_miso'
  | 'ramen_jiro';

export type SushiCountMode = 'plate' | 'piece';
export type PizzaType = 'light' | 'regular' | 'heavy';
export type SetMealType = 'teishoku' | 'bento' | 'convenience_bento';

export interface DishPortionOption {
  factor: StandardPortionFactor;
  primaryLabel: string;
  secondaryLabel?: string;
}

export interface DishQuickEntryPayload {
  topCategoryKey: DishTopCategoryKey;
  subcategoryKey?: string;
  subcategoryLabel?: string;
  portionFactor?: StandardPortionFactor;
  portionPrimaryLabel?: string;
  chinesePrimaryType?: ChineseNoodlesPrimaryType;
  ramenStyle?: RamenStyle;
  sushiMode?: SushiCountMode;
  sushiCount?: number;
  pizzaType?: PizzaType;
  pizzaSliceCount?: number;
  setMealType?: SetMealType;
  macro: Macro;
}
