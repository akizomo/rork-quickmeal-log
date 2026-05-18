import { ActivityLevel, BiologicalBasis, BodyStage, MealSlotKey, MealStyle, PaceLevel } from '@/types/nutrition';

// INTRO_VERSION を bump すると、onboarding 未完了の新規ユーザーにのみ
// 新しい intro が再表示される。onboarding 完了済みの既存ユーザーは
// 影響を受けない (decideInitialRoute / utils/initial-route.ts 参照)。
export const INTRO_VERSION = 2;

export const BODY_STAGES: BodyStage[] = [1, 2, 3, 4, 5];

export interface BodyStageInfo {
  stage: BodyStage;
  label: string;
  maleBodyFatPct: number;
  femaleBodyFatPct: number;
}

export const BODY_STAGE_INFO: Record<BodyStage, BodyStageInfo> = {
  1: { stage: 1, label: '引き締まった印象', maleBodyFatPct: 10, femaleBodyFatPct: 18 },
  2: { stage: 2, label: 'すっきりした体格', maleBodyFatPct: 15, femaleBodyFatPct: 23 },
  3: { stage: 3, label: '標準的な体格', maleBodyFatPct: 20, femaleBodyFatPct: 28 },
  4: { stage: 4, label: 'やわらかい体格', maleBodyFatPct: 25, femaleBodyFatPct: 33 },
  5: { stage: 5, label: 'ふっくらした体格', maleBodyFatPct: 30, femaleBodyFatPct: 38 },
};

export const BASIS_OPTIONS: { key: BiologicalBasis; label: string; hint: string }[] = [
  { key: 'male_basis', label: '男性基準', hint: '体脂肪率の目安 10〜19%' },
  { key: 'female_basis', label: '女性基準', hint: '体脂肪率の目安 20〜29%' },
];

// Activity levels for TDEE & protein calculation.
// Based on ACSM activity factors and ISSN protein guidelines (2017).
export interface ActivityLevelInfo {
  level: ActivityLevel;
  label: string;
  hint: string;
  factor: number; // activity multiplier on RMR
  proteinPerKg: number; // g/kg body weight (maintenance baseline)
}

/**
 * 普段の生活活動量。
 * v1.7+: モデルを「運動は別途記録、gross 全額加算」(YAZIO / MFP / あすけん 方式) に
 * 変更したため、ここでは **運動を除いた日常生活の動き** だけを聞く。
 *
 * 倍率 (factor) は標準的な PAL 係数を維持。
 */
export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelInfo[] = [
  {
    level: 1,
    label: 'デスクワーク中心',
    hint: '1日の大半が座り (在宅勤務・PC作業)',
    factor: 1.2,
    proteinPerKg: 1.2,
  },
  {
    level: 2,
    label: '立ち仕事・歩きがある',
    hint: '接客・教員・通勤で歩くなど',
    factor: 1.375,
    proteinPerKg: 1.4,
  },
  {
    level: 3,
    label: '動き回る仕事',
    hint: '看護・営業・配達など歩き回る',
    factor: 1.55,
    proteinPerKg: 1.6,
  },
  {
    level: 4,
    label: '体力仕事',
    hint: '建築・農業・運送など重労働',
    factor: 1.725,
    proteinPerKg: 1.8,
  },
];

// Pace options for how aggressively to pursue the goal.
// multiplier is applied to the base weekly body weight change rate.
// ACSM / ISSN reference: safe weight-loss range is 0.5-1.0 %/week;
// standard gain is 0.25-0.5 %/week.
export interface PaceOption {
  key: PaceLevel;
  label: string;
  hint: string;
  multiplier: number;
}

export const PACE_OPTIONS: PaceOption[] = [
  {
    key: 'gentle',
    label: 'ゆるやか',
    hint: '無理なく続けたい人に',
    multiplier: 0.5,
  },
  {
    key: 'standard',
    label: '標準',
    hint: 'バランスよく結果を出したい',
    multiplier: 1.0,
  },
  {
    key: 'strong',
    label: 'しっかり',
    hint: '短期集中で変えたい',
    multiplier: 1.5,
  },
];

export const MEAL_SLOT_LABELS: Record<MealSlotKey, string> = {
  breakfast: '朝',
  lunch: '昼',
  dinner: '晩',
  snack: '間食',
};

export const MEAL_STYLE_OPTIONS: { key: MealStyle; label: string }[] = [
  { key: 'home_cooked', label: '自炊' },
  { key: 'eating_out', label: '外食' },
  { key: 'convenience', label: 'コンビニ・中食' },
  { key: 'mixed', label: 'まちまち' },
  { key: 'unset', label: '未設定' },
];

export interface FavoriteItem {
  id: string;
  label: string;
  section: 'dish' | 'food';
}

export const FAVORITE_DISH_ITEMS: FavoriteItem[] = [
  { id: 'fav_rice_dish', label: 'ごはんもの', section: 'dish' },
  { id: 'fav_curry', label: 'カレー', section: 'dish' },
  { id: 'fav_chinese_noodles', label: '中華麺', section: 'dish' },
  { id: 'fav_japanese_noodles', label: '和麺', section: 'dish' },
  { id: 'fav_pasta', label: 'パスタ', section: 'dish' },
  { id: 'fav_sushi', label: '寿司', section: 'dish' },
  { id: 'fav_sandwich', label: 'サンド', section: 'dish' },
  { id: 'fav_pizza', label: 'ピザ', section: 'dish' },
  { id: 'fav_set_meal', label: '定食・弁当', section: 'dish' },
];

export const FAVORITE_FOOD_ITEMS: FavoriteItem[] = [
  { id: 'fav_rice', label: 'ご飯', section: 'food' },
  { id: 'fav_meat_fish', label: '肉・魚', section: 'food' },
  { id: 'fav_egg_soy', label: '卵・大豆', section: 'food' },
  { id: 'fav_veg_salad', label: '野菜・サラダ', section: 'food' },
  { id: 'fav_dairy', label: '乳製品', section: 'food' },
  { id: 'fav_fruit', label: '果物', section: 'food' },
  { id: 'fav_protein_drink', label: 'プロテイン・飲料', section: 'food' },
  { id: 'fav_soup', label: 'スープ', section: 'food' },
];

export const ALL_FAVORITE_ITEMS: FavoriteItem[] = [
  ...FAVORITE_DISH_ITEMS,
  ...FAVORITE_FOOD_ITEMS,
];

export const MAX_FAVORITES = 5;

export const DEFAULT_MEAL_STYLE_BY_SLOT: Record<MealSlotKey, MealStyle> = {
  breakfast: 'unset',
  lunch: 'unset',
  dinner: 'unset',
  snack: 'unset',
};

export const TRIAL_DURATION_DAYS = 7;

/**
 * 法的情報へのアクセス URL。すべて外部リンク (Linking.openURL で開く)。
 * - terms / privacy: Vercel ホスティング (https://hachibu.vercel.app)
 * - manageSubscription: Apple のサブスク管理画面
 *
 * App Store Connect / Play Console のメタデータにも同 URL を登録すること。
 */
export const LEGAL_LINKS = {
  terms: 'https://hachibu.vercel.app/terms',
  privacy: 'https://hachibu.vercel.app/privacy',
  manageSubscription: 'https://apps.apple.com/account/subscriptions',
} as const;
