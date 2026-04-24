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
export type GoalDirection = 'lose' | 'maintain' | 'gain';
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

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

export interface BodyFatEntry {
  id: string;
  date: string;
  bodyFatPct: number;
  createdAt: string;
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
}

export interface AppSettings {
  defaultTabByTime: {
    morning: LogMode;
    noon: LogMode;
    evening: LogMode;
  };
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  introSeenVersion?: number;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  mealStyleBySlot?: Record<MealSlotKey, MealStyle>;
  favoriteItemIds?: string[];
  portionTendency?: PortionTendency;
  trialStartedAtISO?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  onboardingCompletedAtISO?: string | null;
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
