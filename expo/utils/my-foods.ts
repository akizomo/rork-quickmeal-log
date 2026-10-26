/**
 * my-foods.ts — My食品 (PRD §6.5.4) の純ロジック。副作用なし。永続化は呼び出し側 (app-state-provider)。
 *
 * - 同名は1件にまとめる。同名の判定は NFKC + trim + 大文字小文字無視 (ひらがな / カタカナの違いは別名)
 * - 並びは「最近使った順」の固定 (並べ替えは持たない)
 * - 値は「1回分」あたり。量は「1回分 × 倍率」
 */

import type { MyFood, MyFoodInput, SearchRecent } from '@/types/my-food';
import type { Macro } from '@/types/nutrition';

/** ⭐️タブの下段に出す最近使った My食品の件数。 */
export const MY_FOOD_SHELF_LIMIT = 4;
/** 「最近」(検索経由) の保持件数。表示は先頭5件前後。 */
export const SEARCH_RECENT_LIMIT = 20;
export const SEARCH_RECENT_VISIBLE = 5;

/** 倍率の選択肢 (記録シートのチップ)。 */
export const MY_FOOD_MULTIPLIERS = [0.5, 1, 1.5, 2, 3] as const;

const MAX_NAME_LENGTH = 40;

/** 同名判定のためのキー: 前後の空白を除き、全角半角と大文字小文字をそろえる。 */
export function normalizeMyFoodName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase();
}

export function findMyFoodByName(foods: readonly MyFood[] | undefined, name: string): MyFood | undefined {
  const key = normalizeMyFoodName(name);
  if (key.length === 0) return undefined;
  return (foods ?? []).find((f) => normalizeMyFoodName(f.name) === key);
}

function cleanName(name: string): string {
  return name.normalize('NFKC').trim().slice(0, MAX_NAME_LENGTH);
}

function roundMacro(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 10) / 10;
}

/** 保存する値をそろえる (PFC の負値・非数は null、kcal は整数、名前は NFKC + trim)。 */
export function sanitizeMyFoodInput(input: MyFoodInput): MyFoodInput {
  const unit = input.unitLabel?.normalize('NFKC').trim();
  return {
    name: cleanName(input.name),
    kcal: Math.max(0, Math.round(Number.isFinite(input.kcal) ? input.kcal : 0)),
    protein: roundMacro(input.protein),
    fat: roundMacro(input.fat),
    carbs: roundMacro(input.carbs),
    unitLabel: unit ? unit.slice(0, 12) : undefined,
  };
}

/** 名前以外の値 (kcal・PFC・単位名) がすべて同じか。 */
export function hasSameValues(food: MyFood, input: MyFoodInput): boolean {
  const next = sanitizeMyFoodInput(input);
  return (
    food.kcal === next.kcal &&
    (food.protein ?? null) === next.protein &&
    (food.fat ?? null) === next.fat &&
    (food.carbs ?? null) === next.carbs &&
    (food.unitLabel ?? undefined) === next.unitLabel
  );
}

/** 最近使った順 (新しい順)。同時刻は元の並びを保つ。 */
export function sortMyFoodsByRecent(foods: readonly MyFood[] | undefined): MyFood[] {
  return [...(foods ?? [])].sort((a, b) => b.lastUsedAtISO.localeCompare(a.lastUsedAtISO));
}

export function recentMyFoods(foods: readonly MyFood[] | undefined, limit = MY_FOOD_SHELF_LIMIT): MyFood[] {
  return sortMyFoodsByRecent(foods).slice(0, limit);
}

export type SaveMyFoodResult =
  /** 新しく作った */
  | { kind: 'created'; foods: MyFood[]; food: MyFood }
  /** 同名で値も同じ。最近使った時刻だけ更新した (何も聞かない) */
  | { kind: 'touched'; foods: MyFood[]; food: MyFood }
  /** 同名で値が違う。上書き (overwriteMyFood) か別の名前かを選ばせる。foods は変えない */
  | { kind: 'conflict'; foods: MyFood[]; existing: MyFood }
  /** 名前が空など、保存の対象外 */
  | { kind: 'skipped'; foods: MyFood[] };

/**
 * 数値入力から My食品を保存する (PRD §6.5.4「保存の入口」)。
 * 名前が空 / kcal が 0 以下は保存しない。同名で値が違うときは変更せず conflict を返す。
 */
export function saveMyFood(
  foods: readonly MyFood[] | undefined,
  input: MyFoodInput,
  nowISO: string,
  newId: string,
): SaveMyFoodResult {
  const list = [...(foods ?? [])];
  const next = sanitizeMyFoodInput(input);
  if (next.name.length === 0 || next.kcal <= 0) return { kind: 'skipped', foods: list };

  const existing = findMyFoodByName(list, next.name);
  if (existing) {
    if (hasSameValues(existing, next)) {
      const food = { ...existing, lastUsedAtISO: nowISO };
      return { kind: 'touched', foods: list.map((f) => (f.id === existing.id ? food : f)), food };
    }
    return { kind: 'conflict', foods: list, existing };
  }

  const food: MyFood = { id: newId, ...next, createdAtISO: nowISO, lastUsedAtISO: nowISO };
  return { kind: 'created', foods: [food, ...list], food };
}

/** 同名で値が違うときの「上書き」: My食品の値を今回の値に更新する (名前は今回の表記に)。 */
export function overwriteMyFood(
  foods: readonly MyFood[] | undefined,
  id: string,
  input: MyFoodInput,
  nowISO: string,
): MyFood[] {
  const next = sanitizeMyFoodInput(input);
  return (foods ?? []).map((f) => (f.id === id ? { ...f, ...next, lastUsedAtISO: nowISO } : f));
}

export type UpdateMyFoodResult =
  | { ok: true; foods: MyFood[] }
  | { ok: false; reason: 'duplicate' | 'invalid' | 'notFound' };

/** 編集画面の保存。他の My食品と同じ名前には直せない。最近使った時刻は変えない (使ったわけではない)。 */
export function updateMyFood(
  foods: readonly MyFood[] | undefined,
  id: string,
  input: MyFoodInput,
): UpdateMyFoodResult {
  const list = foods ?? [];
  if (!list.some((f) => f.id === id)) return { ok: false, reason: 'notFound' };
  const next = sanitizeMyFoodInput(input);
  if (next.name.length === 0 || next.kcal <= 0) return { ok: false, reason: 'invalid' };
  const clash = findMyFoodByName(list, next.name);
  if (clash && clash.id !== id) return { ok: false, reason: 'duplicate' };
  return { ok: true, foods: list.map((f) => (f.id === id ? { ...f, ...next } : f)) };
}

export function deleteMyFood(foods: readonly MyFood[] | undefined, id: string): MyFood[] {
  return (foods ?? []).filter((f) => f.id !== id);
}

/** 記録・再利用のたびに「最近使った」を更新する。 */
export function touchMyFood(foods: readonly MyFood[] | undefined, id: string, nowISO: string): MyFood[] {
  return (foods ?? []).map((f) => (f.id === id ? { ...f, lastUsedAtISO: nowISO } : f));
}

/** 「1回分 × 倍率」の Macro。PFC が null のものは 0 として扱う (直接入力と同じ)。 */
export function myFoodMacro(food: MyFood, multiplier: number): Macro {
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    kcal: Math.round(food.kcal * m),
    protein: round((food.protein ?? 0) * m),
    fat: round((food.fat ?? 0) * m),
    carbs: round((food.carbs ?? 0) * m),
  };
}

/** 検索語で My食品を探す。名前の部分一致 (NFKC・大文字小文字無視。ひらがな/カタカナも同一視して探しやすくする)。 */
export function searchMyFoods(foods: readonly MyFood[] | undefined, query: string): MyFood[] {
  const q = foldKana(normalizeMyFoodName(query));
  if (q.length === 0) return [];
  return sortMyFoodsByRecent(foods).filter((f) => foldKana(normalizeMyFoodName(f.name)).includes(q));
}

/** カタカナをひらがなにそろえる (検索の一致判定専用。保存・同名判定には使わない)。 */
function foldKana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// ---------------------------------------------------------------------------
// 検索の「最近」(PRD §6.5.4)
// ---------------------------------------------------------------------------

/** 先頭に足し、同じものは1件にまとめ、上限で打ち切る。 */
export function pushSearchRecent(
  recents: readonly SearchRecent[] | undefined,
  entry: SearchRecent,
): SearchRecent[] {
  const rest = (recents ?? []).filter((r) => !(r.kind === entry.kind && r.id === entry.id));
  return [entry, ...rest].slice(0, SEARCH_RECENT_LIMIT);
}

/** 保存値の読み込み。不正な要素は捨てる。 */
export function castSearchRecents(input: unknown): SearchRecent[] {
  if (!Array.isArray(input)) return [];
  const out: SearchRecent[] = [];
  for (const v of input) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    if ((r.kind !== 'identity' && r.kind !== 'myFood') || typeof r.id !== 'string' || r.id.length === 0) continue;
    if (typeof r.atISO !== 'string') continue;
    out.push({ kind: r.kind, id: r.id, atISO: r.atISO });
  }
  return out.slice(0, SEARCH_RECENT_LIMIT);
}

/** 保存値の読み込み (My食品)。不正な要素は捨てる。 */
export function castMyFoods(input: unknown): MyFood[] {
  if (!Array.isArray(input)) return [];
  const out: MyFood[] = [];
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  for (const v of input) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const kcal = num(r.kcal);
    if (typeof r.id !== 'string' || typeof r.name !== 'string' || r.name.trim().length === 0 || kcal == null) continue;
    const created = typeof r.createdAtISO === 'string' ? r.createdAtISO : new Date(0).toISOString();
    out.push({
      id: r.id,
      name: r.name,
      kcal,
      protein: num(r.protein),
      fat: num(r.fat),
      carbs: num(r.carbs),
      unitLabel: typeof r.unitLabel === 'string' && r.unitLabel.length > 0 ? r.unitLabel : undefined,
      createdAtISO: created,
      lastUsedAtISO: typeof r.lastUsedAtISO === 'string' ? r.lastUsedAtISO : created,
    });
  }
  return out;
}

/** 記録の量欄に出す文字。単位名があれば「2本」、無ければ ×1 は空 (「1回分」は書かない)、それ以外は「× 2」。 */
export function myFoodAmountLabel(food: MyFood, multiplier: number): string | undefined {
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  if (food.unitLabel) return `${m}${food.unitLabel}`;
  return m === 1 ? undefined : `× ${m}`;
}
