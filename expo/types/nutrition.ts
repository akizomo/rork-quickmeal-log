import type { DiagnosticsData } from '@/types/diagnostics';

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
  /**
   * True when the user fixed this log's kcal/PFC by hand (数値で編集).
   * Such a log must never be re-derived from an Identity (IdentityLogSheet would
   * rebuild the numbers from default amounts) — see utils/log-edit-route.ts.
   */
  macroManual?: boolean;
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

/** ユーザーが削除したヘルス由来ワークアウトの印。ID が同期ごとに揺れても照合できるよう種別と時刻も持つ */
export interface DeletedHealthWorkout {
  healthSyncId: string;
  /** YYYY-MM-DD */
  date: string;
  exerciseType: string;
  /** ワークアウト開始時刻 (ISO) */
  timestamp: string;
  /** 長さ (分)。ID が変わった同じワークアウトを、時間を直されたものと区別するのに使う */
  minutes: number;
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
  /** 'system'(既定) はOSのカラースキームに追従。未設定時も'system'として扱う。 */
  themePreference?: 'system' | 'light' | 'dark';
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
   * PRD §6.5.2: 詳細シートの「記録時の安心ヒント」(20〜30kcalの差は気にしなくていい) を
   * 表示した時刻。`null` の間は次に詳細シートを開いたときに一度だけ出す。
   */
  roughHintSeenAtISO?: string | null;
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
   * 適用済みのデータ移行ID (utils/log-migrations.ts)。保存済みの記録・履歴の「量」の解釈を
   * 変える DB 修正を、1回だけ・冪等に適用するための印。未設定 = 1つも適用していない。
   */
  appliedMigrations?: string[];
  /**
   * 食材/一皿料理/⭐️ の各タブで実際に記録した回数の累計 (減らない・全期間)。
   * デフォルトタブ判定 (最も使われているタブを優先) に使う。
   * 型はここでは緩く持ち、実ロジックは `quick-log-history.ts` 側で扱う
   * (quickLogHistory と同じく quick-log.ts との循環依存を避けるため)。
   */
  tabUsageCounts?: { ingredient: number; dish: number; frequent: number };
  /**
   * 現在採用中のデフォルトタブ。次回判定時のヒステリシス基準にする
   * (僅差では切り替えず、明確にリードした時だけ更新する)。
   */
  currentDefaultTab?: 'ingredient' | 'dish' | 'frequent';
  /**
   * ⭐️ タブのピン留め (PRD §6.5.3)。Identity ID の順序付き配列で、ユーザーが決めた順で先頭に固定する。
   * 末尾に追加される。辞書に無い ID は表示時に黙って除く (配列自体は触らない)。
   */
  frequentPins?: string[];
  /**
   * ⭐️ タブで「表示しない」にした自動分の Identity ID。ピン留めしたものは入れない (ピン留めは「外す」)。
   */
  frequentHidden?: string[];
  /**
   * ⭐️ をシートで初めて押したとき、結果を伝える吹き出しを出した時刻。`null` の間は最初の1回だけ出す。
   * 押すたびに出るとうるさいので、生涯1回 (roughHintSeenAtISO と同じ扱い)。
   */
  pinNoticeSeenAtISO?: string | null;
  /** My食品 (PRD §6.5.4)。数値入力した名前つきの食品。Identity 辞書の外に置く。並びは lastUsedAtISO (最近使った順)。 */
  myFoods?: import('./my-food').MyFood[];
  /** 検索から選んで記録した Identity / My食品 (新しい順、上限20)。検索ページの「最近」に出す。9ボタン・⭐️経由は入れない。 */
  searchRecents?: import('./my-food').SearchRecent[];
  /**
   * Identity-first IA schema version applied to the persisted FoodLog list.
   * Bumped when a one-shot backfill of `identityId` runs at boot.
   *   undefined / 0 — never migrated yet
   *   1 — LEGACY_TO_IDENTITY_MAP has been applied (Phase 5)
   */
  iaSchemaVersion?: number;
  /**
   * 「今週の収支を合わせる」バナーを閉じた日付 (dateKey "YYYY-MM-DD")。
   * 当日に一致するとき、その日のバナーを表示しない。
   * (旧「帳尻調整」から名前を引き継いでいる。永続データの互換のため改名しない)
   */
  kcalCarryoverDismissedDate?: string;
  /**
   * 「今週の収支を合わせる」(PRD §6.4.5) を有効にした週の月曜の dateKey。
   * 今週の月曜と一致するときだけ有効。週が変わると自動で切れる。
   */
  kcalWeeklyBalanceWeekKey?: string;
  /**
   * @deprecated 旧「帳尻調整」プラン (前日のオーバー分を N 日に割って差し引く)。
   * v1.13 で今週の収支方式に置き換え。開始週の間だけ今週の調整として引き継ぎ、
   * やめる操作で消す。新規に書き込まない。
   */
  kcalCarryoverStartDate?: string;
  /** @deprecated 旧帳尻調整プランの 1日あたりの差し引き額。読まない。 */
  kcalCarryoverDailyAmount?: number;
  /** @deprecated 旧帳尻調整プランの総日数。引き継ぎ判定にのみ使う。 */
  kcalCarryoverDaysTotal?: number;
  /**
   * Android ホーム画面ウィジェット追加を促すバナーを dismiss した時刻 (ISO)。
   * undefined / null = 未 dismiss。一度 dismiss したら二度と表示しない。
   */
  widgetNudgeDismissedAtISO?: string | null;
  /**
   * ユーザーが削除したヘルス由来の運動ログ。次の同期で同じワークアウトを取り込み直さないための印
   * (消したのに起動し直すと復活する、を防ぐ)。保持期間は utils/health-sync/deleted-workouts.ts。
   */
  deletedHealthWorkouts?: DeletedHealthWorkout[];

  /**
   * ウィジェット導入プロトタイプ画面 (widget-intro.tsx) を見た時刻 (ISO)。
   * まだ initial-route には未接続の試作段階のフラグ。
   */
  widgetIntroSeenAtISO?: string | null;

  /**
   * KPI計装 Layer 1: 端末内に貯める診断データ。
   * 製品Analytics が未導入のため、`/dev/diagnostics` からエクスポートして
   * クローズドテストの回答を得る。詳細は docs/ROADMAP.md §3.0。
   * 読み書きは `utils/diagnostics.ts` の純関数を通す。
   */
  diagnostics?: DiagnosticsData;

  /**
   * 週次振り返りバナーを dismiss (または閲覧) 済みの対象週キー (月曜 dateKey)。
   * その週の recap は二度と表示しない。週が変わると自然に再度表示対象になる
   * (widgetNudgeDismissedAtISO と異なり永続的な非表示ではない)。
   */
  weeklyRecapDismissedWeekKey?: string;

  /**
   * UI 表示言語。デバイスの languageCode から初期値を設定。未設定時は 'ja'。
   * @deprecated 旧 `locale` フィールドは uiLanguage + foodRegion に分割済み。
   * migrateSettings でのみ参照。
   */
  locale?: 'ja' | 'en-US';

  /** UI 表示言語。デバイスの languageCode から初期値を設定。未設定時は 'ja'。 */
  uiLanguage?: 'ja' | 'en-US';

  /** 食事DBのリージョン。デバイスの regionCode から初期値を設定。未設定時は 'ja'。 */
  foodRegion?: 'ja' | 'en-US';

  /** 体重・身長の表示単位系。デバイスの measurementSystem から初期値を設定。未設定時は 'metric'。 */
  unitSystem?: 'metric' | 'imperial';
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
