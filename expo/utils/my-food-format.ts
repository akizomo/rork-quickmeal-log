/**
 * My食品の表示用の文字列 (名前の下の「200 kcal」など)。単位名は持たない (PRD v1.19)。
 */
import type { MyFood } from '@/types/my-food';

/** 「200 kcal」。 */
export function formatMyFoodSummary(food: MyFood): string {
  return `${Math.round(food.kcal)} kcal`;
}

/** 「P10 · F5 · C40」。未入力 (null) は「—」。 */
export function formatMyFoodPfc(food: MyFood): string {
  const v = (n: number | null) => (n == null ? '—' : String(Math.round(n * 10) / 10));
  return `P${v(food.protein)} · F${v(food.fat)} · C${v(food.carbs)}`;
}
