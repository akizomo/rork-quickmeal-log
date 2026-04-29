import { Macro } from '@/types/nutrition';

// ---------------------------------------------------------------------------
// Detail UI dimension
// ---------------------------------------------------------------------------

export type DetailUiType = 'none' | 'attribute' | 'part' | 'method' | 'part_method';

export type NormalizedUnit = 'g' | 'ml' | 'piece';

export type CookingMethodKey = 'raw' | 'light' | 'oil' | 'fried';

export type AttributeKey =
  | 'water'
  | 'oil'
  | 'unsweetened'
  | 'sweetened'
  | 'plain'
  | 'adjusted'
  | 'unknown';

export type PartKey = 'lean' | 'loin' | 'fatty' | 'unknown';

// ---------------------------------------------------------------------------
// Master types
// ---------------------------------------------------------------------------

export interface AmountCandidate {
  key: string;
  label: string;
  amount: number;
  unit: NormalizedUnit;
  isDefault?: boolean;
}

export interface AttributeOption {
  key: AttributeKey;
  label: string;
  /**
   * Multiplicative deltas (factor) per macro relative to baseMacroPer100.
   * Use 1 for "no change". Defaults to 1 across all macros when undefined.
   */
  factor?: Partial<Record<keyof Macro, number>>;
}

export interface PartOption {
  key: PartKey;
  label: string;
  factor?: Partial<Record<keyof Macro, number>>;
}

export interface MethodOption {
  key: CookingMethodKey;
  label: string;
  factor?: Partial<Record<keyof Macro, number>>;
}

export interface QuickLogSubcategory {
  key: string;
  label: string;
  detailUi: DetailUiType;
  /** Macro per 100 of normalized unit (g/ml). For "piece" unit, this is per piece. */
  baseMacroPer100: Macro;
  amountCandidates: AmountCandidate[];
  attributes?: AttributeOption[];
  parts?: PartOption[];
  methods?: MethodOption[];
  /** Default key for each detail dimension. Falls back to first option if omitted. */
  defaultAttributeKey?: AttributeKey;
  defaultPartKey?: PartKey;
  defaultMethodKey?: CookingMethodKey;
}

export interface QuickLogCategoryDef {
  key: string;
  label: string;
  emoji: string;
  subcategories: QuickLogSubcategory[];
}

// ---------------------------------------------------------------------------
// Draft used by the long-press detail sheet
// ---------------------------------------------------------------------------

export interface IngredientQuickDraft {
  categoryKey: string;
  subcategoryKey: string;
  attrKey?: AttributeKey;
  partKey?: PartKey;
  methodKey?: CookingMethodKey;
  amountValue: number;
  amountUnit: NormalizedUnit;
  /** Currently selected candidate label (e.g. "1パック"). Empty when manually edited. */
  amountLabel?: string;
  /** Currently selected candidate key, undefined when amount was edited directly. */
  amountCandidateKey?: string;
}

// ---------------------------------------------------------------------------
// History (recent + frequency learning)
// ---------------------------------------------------------------------------

export interface QuickLogSelection {
  categoryKey: string;
  subcategoryKey: string;
  attrKey?: AttributeKey;
  partKey?: PartKey;
  methodKey?: CookingMethodKey;
  amountValue: number;
  amountUnit: NormalizedUnit;
  amountCandidateKey?: string;
  amountLabel?: string;
  loggedAtISO: string;
}

export type QuickLogHistoryMap = Record<string, QuickLogSelection[]>;
