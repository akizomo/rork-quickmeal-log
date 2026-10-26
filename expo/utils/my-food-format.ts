/**
 * My食品の表示用の文字列 (名前の下の「200 kcal · 1本」など)。
 * 単位名があれば添え、無ければ kcal だけ (「1回分」とは書かない。何の1回分か伝わらなかった)。
 */
import type { MyFood } from '@/types/my-food';

/** 「200 kcal · 1本」。単位名が無いときは「200 kcal」。 */
export function formatMyFoodSummary(food: MyFood): string {
  const kcal = `${Math.round(food.kcal)} kcal`;
  return food.unitLabel ? `${kcal} · 1${food.unitLabel}` : kcal;
}

/** 「P10 · F5 · C40」。未入力 (null) は「—」。 */
export function formatMyFoodPfc(food: MyFood): string {
  const v = (n: number | null) => (n == null ? '—' : String(Math.round(n * 10) / 10));
  return `P${v(food.protein)} · F${v(food.fat)} · C${v(food.carbs)}`;
}
