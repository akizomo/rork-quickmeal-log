/**
 * Identity-first information architecture types.
 *
 * Spec: docs/IA-identity-spec.md (v1.1)
 *
 * Hierarchy:
 *   Tab → Bucket → Identity → Attribute → Style → Add-on
 *
 * Design principles (PRD-aligned):
 *   ① 9-button × 2-tab structure (tap = default-record, long-press = detail)
 *   ② PFC convergence axis (food tab) — same bucket = similar PFC cluster
 *   ③ Genre × style axis (dish tab) — pre-clustered for 1-tap accuracy
 *   ④ Skip zero-calorie items (water, tea, soy sauce, etc.)
 *   ⑤ Plain-language labels
 */

import { Macro } from '@/types/nutrition';

// ---------------------------------------------------------------------------
// Tab / Bucket
// ---------------------------------------------------------------------------

export type IdentityTab = 'ingredient' | 'dish';

export type IngredientBucketKey =
  | 'staple'        // ごはんパン麺
  | 'lean_protein'  // 肉魚(低脂肪)
  | 'egg'           // 卵
  | 'fatty_protein' // 脂あり肉魚
  | 'dairy_soy'     // 乳・大豆
  | 'veggies'       // 野菜・汁物
  | 'fruit'         // 果物
  | 'added_fat'     // 油・調味
  | 'snack_drink';  // おやつ甘飲

export type DishBucketKey =
  | 'rice_dish'         // どんぶり
  | 'curry'             // カレー
  | 'chinese_noodles'   // ラーメン中華麺
  | 'japanese_noodles'  // うどん蕎麦
  | 'pasta'             // パスタ
  | 'sushi'             // 寿司
  | 'sandwich'          // サンドバーガー
  | 'pizza'             // ピザ
  | 'misc_dish';        // おかず・単品

export type BucketKey = IngredientBucketKey | DishBucketKey;

export interface BucketDef {
  key: BucketKey;
  tab: IdentityTab;
  label: string;       // UI display name (≤6 chars)
  shortLabel: string;  // Compact short label for buttons (≤4 chars)
  emoji: string;
  /**
   * If true, tapping the bucket button does NOT instant-record. Instead, the
   * detail sheet opens so the user picks an Identity first.
   * Used for buckets whose Identity diversity is too wide for any single
   * default to be representative (e.g., 寿司: plate vs piece vs ちらし vs 巻).
   */
  quickTapDisabled?: boolean;
}

// ---------------------------------------------------------------------------
// Migration target (PFC崩壊遮断)
// ---------------------------------------------------------------------------

export interface MigrationTarget {
  /** Destination bucket. */
  bucketKey: BucketKey;
  /** Destination Identity ID inside the bucket. */
  identityKey: string;
  /** Optionally pre-set an Attribute on the destination Identity. */
  attributeKey?: string;
  /** Optional confirmation message shown to the user (e.g., "フライドポテトとして記録します"). */
  confirmMessage?: string;
}

// ---------------------------------------------------------------------------
// Attribute / Style options
// ---------------------------------------------------------------------------

/**
 * Multiplicative factor applied to base macro per axis.
 * Missing keys default to 1 (no change).
 */
export type MacroFactor = Partial<Record<keyof Macro, number>>;

export interface AttributeOption {
  key: string;
  label: string;
  isDefault?: boolean;
  factor?: MacroFactor;
  /**
   * If selected, force the entire log to be recorded under another bucket/Identity
   * (PFC崩壊遮断). Example: chicken_thigh + 皮なし → lean_protein/chicken_lean.
   */
  migration?: MigrationTarget;

  // ----- Per-attribute Add-on / Amount overrides -----
  // 「種類」によってトッピング・量チップを可変にするためのオプション群。
  // いずれも未指定なら Identity 直下の値にフォールバックする。

  /**
   * この種類を選んだときに「トッピング」欄へ既定表示する Add-on。
   * 例: 餅・団子 → 団子は みたらし/あんこ、餅は きなこ。
   * 省略時は Identity.defaultAddonIds を使う。
   */
  defaultAddonIds?: string[];
  /**
   * この種類で選択可能な Add-on のホワイトリスト上書き。
   * 省略時は Identity.allowedAddonIds を使う。
   */
  allowedAddonIds?: string[];
  /**
   * この種類の factor に既に織り込まれており、二重計上を避けるため非表示にする
   * Add-on。例: うどん「月見」は factor に卵が含まれるので egg を隠す。
   */
  hiddenAddonIds?: string[];
  /**
   * この種類だけ量の単位・既定値・チップが異なる場合の上書き。
   * 省略時は Identity.amount を使う。
   */
  amount?: AmountSpec;
}

export interface StyleOption {
  key: string;
  label: string;
  isDefault?: boolean;
  factor?: MacroFactor;
  /**
   * Style-driven migration. Example: potato + 揚げ → misc_dish/fries.
   */
  migration?: MigrationTarget;
}

// ---------------------------------------------------------------------------
// AmountSpec
// ---------------------------------------------------------------------------

export type AmountUnit =
  | 'g'
  | 'ml'
  | 'piece'   // 個 / 本 / パック / 枚 etc.
  | 'serving' // legacy: factor (1.0 = standard portion). Kept for backward-compat with old FoodLog entries; new content should use 'percent'.
  | 'percent' // 1人前 / 1食 = 100. Integer step (10% recommended) for foods whose physical amount varies per product.
  | 'plate'   // 皿 (sushi)
  | 'slice'   // 切 (pizza, fish)
  | 'cut';    // 切れ

export interface AmountChip {
  /** Display label, e.g. "小 100g", "並", "8皿". */
  label: string;
  /** Numeric value to set in the amount field when tapped. */
  value: number;
}

export interface BrandChip {
  /** "並盛 (吉野家)" etc. */
  label: string;
  /** Brand-specific kcal that overrides factor calculation. */
  brandKcal: number;
  /** Source of the data. */
  source: string;
}

export interface AmountSpec {
  unit: AmountUnit;
  /** Default amount used when the user taps without adjusting. */
  default: number;
  /**
   * Optional override for the unit suffix shown in UI. E.g. yakitori has
   * `unit: 'piece'` but should display "本" (skewers), maki "本" (rolls),
   * sashimi "切" (slices). When undefined, fall back to default suffix mapping.
   */
  unitLabel?: string;
  /**
   * Optional shortcut chips. Pattern A (count-only) leaves this undefined.
   * Pattern B (g/ml/serving/half-units) defines 2–5 chips as shortcuts.
   */
  chips?: AmountChip[];
  /** Lower bound for direct edit. Falls back to 1 when omitted. */
  min?: number;
  /** Upper bound for direct edit. Derived from last chip × 4 when omitted. */
  max?: number;
  /** Step granularity for stepper / TextInput. Falls back to 1 when omitted (= integers). */
  step?: number;
  /** P2 future: brand/chain-store presets. */
  brandChips?: BrandChip[];
}

// ---------------------------------------------------------------------------
// Add-on cross-bucket capability
// ---------------------------------------------------------------------------

/**
 * Some Identities (egg, cheese, avocado, natto, ...) can also be used as Add-ons
 * on other Identities. This block describes the per-add-on-unit macro contribution.
 */
export interface AsAddon {
  unit: AmountUnit;
  /** Numeric amount for the single add-on unit (e.g. 1 個, 12 g, 200 ml). */
  unitAmount: number;
  /** Macro added when one unit of this add-on is layered on a base food. */
  addedMacro: Macro;
  /** UI label, e.g. "卵を追加". */
  defaultLabel: string;
}

// ---------------------------------------------------------------------------
// Identity (the core type)
// ---------------------------------------------------------------------------

export interface Identity {
  id: string;
  label: string;

  primaryHome: {
    tab: IdentityTab;
    bucket: BucketKey;
  };

  /**
   * Macro for one default amount (= AmountSpec.default × unit).
   * For Pattern B (chips), this matches the "default chip" / "普通".
   */
  defaultMacro: Macro;
  amount: AmountSpec;

  attributes?: AttributeOption[];
  styles?: StyleOption[];

  // ----- Cross-bucket Add-on capability -----
  asAddon?: AsAddon;

  // ----- Allowed Add-ons when this Identity is the BASE -----
  /** Default add-ons rendered first (4–6 typical). */
  defaultAddonIds?: string[];
  /** Full whitelist of add-ons selectable for this Identity. */
  allowedAddonIds?: string[];

  // ----- Multi-entrance search -----
  /** Buckets that can also surface this Identity via search. */
  searchableFrom?: BucketKey[];
  /** Search keywords (Japanese tags). */
  searchTags?: string[];

  /**
   * If true, this Identity should not be instant-recorded via bucket tap when
   * it is the bucket's default. Tap should open the detail sheet so the user
   * picks an Attribute first.
   * Mark for Identities whose Attribute span is too wide for the default
   * Attribute to represent the typical case (e.g., teishoku 焼魚 vs トンカツ).
   */
  quickTapDisabled?: boolean;

  /**
   * Human-readable hint shown near the amount input describing what the
   * default amount represents (e.g., "1人前 ≒ 麺250g + トマトソース").
   * Helps users understand what a "1人前" / "1切" / "5本" etc. assumes.
   */
  referenceDescription?: string;
}

// ---------------------------------------------------------------------------
// Add-on (Identity化しない補強・調味系)
// ---------------------------------------------------------------------------

export interface Addon {
  id: string;
  label: string;
  unit: AmountUnit;
  unitAmount: number;
  /** UI shorthand, e.g. "大さじ1", "5g". */
  unitLabel: string;
  addedMacro: Macro;
  /** Whitelist of Identity IDs that allow this Addon. */
  allowedIdentityIds: string[];
}

// ---------------------------------------------------------------------------
// Logging draft (replaces FoodLog inputs in Phase 2)
// ---------------------------------------------------------------------------

export interface IdentityLogDraft {
  /** The original (entry-point) Identity the user picked. */
  originIdentityId: string;
  /** The Identity actually used for storage (after Style/Attribute migration). */
  recordIdentityId: string;
  /** Selected Attribute key, if applicable. */
  attributeKey?: string;
  /** Selected Style key, if applicable. */
  styleKey?: string;
  /** Numeric amount value, in the Identity's unit. */
  amountValue: number;
  /** Computed macro for the base portion (excluding add-ons). */
  baseMacro: Macro;
  /** Selected add-on entries (each is an Identity-flavored Addon ref or pure Addon). */
  addons?: AppliedAddon[];
  /** Total macro = baseMacro + sum(addons.addedMacro). */
  totalMacro: Macro;
}

export interface AppliedAddon {
  /** Either an Identity ID (if Identity流用) or an Addon ID. */
  refId: string;
  refType: 'identity' | 'addon';
  /** Number of units (default 1). */
  units: number;
  /** Macro contribution of (units × addedMacro). */
  addedMacro: Macro;
}

// ---------------------------------------------------------------------------
// Lookup helpers (return types only — implementation in constants/identity/index.ts)
// ---------------------------------------------------------------------------

export interface IdentityRegistry {
  byId: Record<string, Identity>;
  byBucket: Record<BucketKey, Identity[]>;
  buckets: BucketDef[];
  addons: Record<string, Addon>;
}
