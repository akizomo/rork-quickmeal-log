/**
 * My食品の表示用の文字列 (名前の下の「200 kcal · 1本」など)。
 * 単位名があれば添え、無ければ「1回分」。tr は useT の翻訳関数。
 */
import type { MyFood } from '@/types/my-food';

type Tr = (key: string, params?: Record<string, string | number>) => string;

/** 「200 kcal · 1本」。単位名が無いときは「200 kcal · 1回分」。 */
export function formatMyFoodSummary(food: MyFood, tr: Tr): string {
  const unit = food.unitLabel ? `1${food.unitLabel}` : tr('myFoods.perServing');
  return `${Math.round(food.kcal)} kcal · ${unit}`;
}

/** 「P10 · F5 · C40」。未入力 (null) は「—」。 */
export function formatMyFoodPfc(food: MyFood): string {
  const v = (n: number | null) => (n == null ? '—' : String(Math.round(n * 10) / 10));
  return `P${v(food.protein)} · F${v(food.fat)} · C${v(food.carbs)}`;
}
