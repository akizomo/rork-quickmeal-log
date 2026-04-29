import { getQuickLogSubcategory } from '@/constants/quick-log-master';
import { Macro } from '@/types/nutrition';
import { IngredientQuickDraft, QuickLogSubcategory } from '@/types/quick-log';
import { roundMacro } from '@/utils/nutrition';

function applyFactor(
  macro: Macro,
  factor: Partial<Record<keyof Macro, number>> | undefined
): Macro {
  if (!factor) return macro;
  return {
    kcal: macro.kcal * (factor.kcal ?? 1),
    protein: macro.protein * (factor.protein ?? 1),
    fat: macro.fat * (factor.fat ?? 1),
    carbs: macro.carbs * (factor.carbs ?? 1),
  };
}

function multiplyByAmount(macro: Macro, amount: number, unit: string): Macro {
  // baseMacroPer100 stores macros per 100g/ml for 'g'/'ml', or per 1 piece for 'piece'.
  const factor = unit === 'piece' ? amount : amount / 100;
  return {
    kcal: macro.kcal * factor,
    protein: macro.protein * factor,
    fat: macro.fat * factor,
    carbs: macro.carbs * factor,
  };
}

function roundAll(macro: Macro): Macro {
  return {
    kcal: roundMacro(macro.kcal),
    protein: roundMacro(macro.protein),
    fat: roundMacro(macro.fat),
    carbs: roundMacro(macro.carbs),
  };
}

export interface QuickLogComputation {
  baseMacro: Macro;
  total: Macro;
  subcategory: QuickLogSubcategory;
}

/**
 * Compute total macros for a quick-log draft.
 *
 * Pipeline:
 *   1. start from `subcategory.baseMacroPer100`
 *   2. apply attribute / part / method factors (only the ones the subcategory uses)
 *   3. multiply by amount (g/ml → /100, piece → ×N)
 *   4. round to one decimal place
 */
export function computeQuickLogMacro(draft: IngredientQuickDraft): QuickLogComputation | null {
  const sub = getQuickLogSubcategory(draft.categoryKey, draft.subcategoryKey);
  if (!sub) return null;

  let macro: Macro = { ...sub.baseMacroPer100 };

  if ((sub.detailUi === 'attribute') && draft.attrKey) {
    const opt = sub.attributes?.find((o) => o.key === draft.attrKey);
    macro = applyFactor(macro, opt?.factor);
  }
  if ((sub.detailUi === 'part' || sub.detailUi === 'part_method') && draft.partKey) {
    const opt = sub.parts?.find((o) => o.key === draft.partKey);
    macro = applyFactor(macro, opt?.factor);
  }
  if ((sub.detailUi === 'method' || sub.detailUi === 'part_method') && draft.methodKey) {
    const opt = sub.methods?.find((o) => o.key === draft.methodKey);
    macro = applyFactor(macro, opt?.factor);
  }

  const baseMacro = roundAll(macro);
  const total = roundAll(multiplyByAmount(macro, draft.amountValue, draft.amountUnit));
  return { baseMacro, total, subcategory: sub };
}

/**
 * Build a portion description label like "1パック" or "150g" for display.
 */
export function buildAmountLabel(draft: IngredientQuickDraft): string {
  if (draft.amountLabel && draft.amountLabel.length > 0) return draft.amountLabel;
  const unit = draft.amountUnit === 'piece' ? '個' : draft.amountUnit;
  return `${draft.amountValue}${unit}`;
}
