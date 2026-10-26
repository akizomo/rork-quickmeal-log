/**
 * frequent-pins.ts — ⭐️ タブの「ピン留め優先 + 自動で補充」の純ロジック (PRD §6.5.3)。
 *
 * 副作用なし。永続化は呼び出し側 (app-state-provider) が settings 経由で行う。
 *
 * - ピン留め (`settings.frequentPins`) は順序付き配列。ユーザーが決めた順で先頭に固定する。
 *   Identity は ID のまま、My食品は `myfood:<id>` (myFoodPinKey) で同じ配列に入れる (PRD v1.18。並べ替えを1本で扱うため)
 * - 「表示しない」(`settings.frequentHidden`) は自動分だけに付く。ピン留めしたものは「外す」
 * - 自動分は既存の `rankFrequentIdentities` が補充する。ピン留め済み・非表示のものは除く (同じものを二度出さない)
 * - 辞書から消えた Identity がピン留め・非表示に残っていても落とさず、**黙って除く** (配列自体は触らない。
 *   辞書に戻ったとき復活できるように)。削除した My食品は、削除と同じ保存で配列からも外す (pruneMyFoodPins)
 */

import { getIdentity } from '@/constants/identity';
import type { MyFood } from '@/types/my-food';
import type { QuickLogHistoryMap } from '@/types/quick-log';
import {
  FREQUENT_TAB_MIN_LOGS,
  rankFrequentIdentities,
  type RankedIdentity,
} from '@/utils/quick-log-history';

/** ⭐️ のピルがどこから来たか。タップの内訳計測 (frequent_tap_source) に使う。 */
export type FrequentSource = 'pinned' | 'auto';

/** ⭐️ のピル1つ (Identity)。key = ピン留めの配列に入る値 (Identity は ID そのもの) */
export interface FrequentIdentityItem extends RankedIdentity {
  kind: 'identity';
  key: string;
  source: FrequentSource;
}

/** ⭐️ のピル1つ (My食品)。My食品はお気に入りに入れたものだけが並ぶ (自動の補充には混ぜない) */
export interface FrequentMyFoodItem {
  kind: 'myFood';
  /** `myfood:<id>` */
  key: string;
  myFoodId: string;
  label: string;
  source: 'pinned';
}

export type FrequentItem = FrequentIdentityItem | FrequentMyFoodItem;

const MY_FOOD_PIN_PREFIX = 'myfood:';

/** My食品をピン留めの配列に入れるときの値。Identity の ID と混ざらないよう接頭辞を付ける */
export function myFoodPinKey(myFoodId: string): string {
  return `${MY_FOOD_PIN_PREFIX}${myFoodId}`;
}

/** ピン留めの値が My食品なら、その id を返す (Identity なら null) */
export function myFoodIdFromPinKey(key: string): string | null {
  return key.startsWith(MY_FOOD_PIN_PREFIX) ? key.slice(MY_FOOD_PIN_PREFIX.length) : null;
}

/** 編集シートに並べる自動分の上限。ホームの3行に収まる数 (実測で 9〜12 個前後) より少し多めに見せる。 */
export const FREQUENT_EDIT_AUTO_LIMIT = 12;

// ---------------------------------------------------------------------------
// 保存値の読み込み
// ---------------------------------------------------------------------------

/**
 * 保存値 (unknown) から ID 配列を取り出す。文字列以外・空文字は捨て、重複は先頭を残す。
 * 辞書に存在するかは見ない (ここでは落とさない)。
 */
export function castIdList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string' || v.length === 0 || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ピン留め・非表示の編集 (どれも新しい配列を返す)
// ---------------------------------------------------------------------------

/** 末尾に追加する。すでにあれば何もしない。 */
export function addPin(pins: readonly string[] | undefined, id: string): string[] {
  const base = castIdList(pins);
  return base.includes(id) ? base : [...base, id];
}

export function removePin(pins: readonly string[] | undefined, id: string): string[] {
  return castIdList(pins).filter((p) => p !== id);
}

/** 1つ上 / 下へ動かす。端や、ピン留めに無い ID は何もしない。 */
export function movePin(
  pins: readonly string[] | undefined,
  id: string,
  direction: 'up' | 'down',
): string[] {
  const base = castIdList(pins);
  const from = base.indexOf(id);
  if (from === -1) return base;
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= base.length) return base;
  const next = [...base];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** ドラッグの結果: 指定した位置 (0 始まり) へ動かす。範囲外は端に丸め、ピン留めに無い ID は何もしない。 */
export function movePinTo(pins: readonly string[] | undefined, id: string, toIndex: number): string[] {
  const base = castIdList(pins);
  const from = base.indexOf(id);
  if (from === -1) return base;
  const to = Math.max(0, Math.min(base.length - 1, toIndex));
  if (to === from) return base;
  const next = base.filter((p) => p !== id);
  next.splice(to, 0, id);
  return next;
}

export function addHidden(hidden: readonly string[] | undefined, id: string): string[] {
  const base = castIdList(hidden);
  return base.includes(id) ? base : [...base, id];
}

export function removeHidden(hidden: readonly string[] | undefined, id: string): string[] {
  return castIdList(hidden).filter((h) => h !== id);
}

/** 存在しない My食品のピン留めを外す (My食品を削除したときに、同じ保存で呼ぶ)。Identity のピン留めは触らない */
export function pruneMyFoodPins(pins: readonly string[] | undefined, foods: readonly MyFood[] | undefined): string[] {
  const ids = new Set((foods ?? []).map((f) => f.id));
  return castIdList(pins).filter((key) => {
    const id = myFoodIdFromPinKey(key);
    return id === null || ids.has(id);
  });
}

/**
 * ピン留めのON/OFFを、ピン留めと「表示しない」の両方に反映する。
 * ピン留めしたものが「表示しない」にも入っている状態を作らない (ピン留めを優先して非表示を解く)。
 */
export function setPinned(
  state: { pins?: readonly string[]; hidden?: readonly string[] },
  id: string,
  pinned: boolean,
): { pins: string[]; hidden: string[] } {
  if (pinned) {
    return { pins: addPin(state.pins, id), hidden: removeHidden(state.hidden, id) };
  }
  return { pins: removePin(state.pins, id), hidden: castIdList(state.hidden) };
}

// ---------------------------------------------------------------------------
// 並びの組み立て
// ---------------------------------------------------------------------------

function toRanked(identityId: string): RankedIdentity | null {
  if (myFoodIdFromPinKey(identityId) !== null) return null;
  const identity = getIdentity(identityId);
  if (!identity) return null;
  return {
    identityId: identity.id,
    bucketKey: identity.primaryHome.bucket,
    label: identity.label,
    score: 0,
  };
}

/**
 * 存在するピン留めだけを、保存された順で返す (辞書に無い Identity・削除した My食品は黙って除く)。
 * myFoods を渡さないと、My食品のピン留めはすべて除く。
 */
export function resolvePinnedItems(
  pins: readonly string[] | undefined,
  myFoods?: readonly MyFood[],
): FrequentItem[] {
  const out: FrequentItem[] = [];
  for (const key of castIdList(pins)) {
    const myFoodId = myFoodIdFromPinKey(key);
    if (myFoodId !== null) {
      const food = myFoods?.find((f) => f.id === myFoodId);
      if (food) out.push({ kind: 'myFood', key, myFoodId, label: food.name, source: 'pinned' });
      continue;
    }
    const ranked = toRanked(key);
    if (ranked) out.push({ ...ranked, kind: 'identity', key, source: 'pinned' });
  }
  return out;
}

/**
 * ⭐️ タブの並び: ピン留め (ユーザーの順) → 自動 (ランキング順、最大 autoLimit 件)。
 * 自動分からはピン留め済みと「表示しない」を除く。
 *
 * ピン留めは枠に関係なく全部返す。枠に収まる自動分の数は画面側が実測で決める
 * (ここでは候補を autoLimit まで返すだけ)。
 */
export function composeFrequentItems(
  history: QuickLogHistoryMap | undefined,
  opts: {
    pins?: readonly string[];
    hidden?: readonly string[];
    myFoods?: readonly MyFood[];
    nowISO: string;
    autoLimit: number;
  },
): { pinned: FrequentItem[]; auto: FrequentIdentityItem[] } {
  const pinned = resolvePinnedItems(opts.pins, opts.myFoods);
  const pinnedIds = new Set(castIdList(opts.pins));
  const hiddenIds = new Set(castIdList(opts.hidden));

  const auto = rankFrequentIdentities(history, { nowISO: opts.nowISO, limit: Infinity })
    .filter((r) => !pinnedIds.has(r.identityId) && !hiddenIds.has(r.identityId))
    .slice(0, opts.autoLimit)
    .map((r): FrequentIdentityItem => ({ ...r, kind: 'identity', key: r.identityId, source: 'auto' }));

  return { pinned, auto };
}

/** 編集シートが「表示しないもの」として並べる Identity (辞書に存在するものだけ、保存順)。 */
export function resolveHiddenItems(hidden: readonly string[] | undefined): RankedIdentity[] {
  const out: RankedIdentity[] = [];
  for (const id of castIdList(hidden)) {
    const ranked = toRanked(id);
    if (ranked) out.push(ranked);
  }
  return out;
}

/** 存在するピン留めの件数 (診断・出現条件で使う実効値)。 */
export function effectivePinCount(pins: readonly string[] | undefined, myFoods?: readonly MyFood[]): number {
  return resolvePinnedItems(pins, myFoods).length;
}

/** 辞書に存在する「表示しない」の件数 (診断用の実効値)。 */
export function effectiveHiddenCount(hidden: readonly string[] | undefined): number {
  return resolveHiddenItems(hidden).length;
}

// ---------------------------------------------------------------------------
// 出現条件
// ---------------------------------------------------------------------------

/**
 * ⭐️ タブを出すか。記録が FREQUENT_TAB_MIN_LOGS 件に達しているか、ピン留め (Identity・My食品) が
 * 1件でもあれば出す (PRD §6.5.3)。2026-10-26 (v1.18) に「My食品が1件でもあれば出す」をやめた
 * (⭐️に My食品のリストを出さなくなり、保存しただけでは⭐️の中身が無いため)。
 */
export function shouldShowFrequentTab(
  totalHistoryEntries: number,
  pins: readonly string[] | undefined,
  myFoods?: readonly MyFood[],
): boolean {
  return totalHistoryEntries >= FREQUENT_TAB_MIN_LOGS || effectivePinCount(pins, myFoods) > 0;
}
