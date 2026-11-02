/**
 * 記録 (FoodLog) をタップしたときの「編集の入口」を決める。
 *
 * 不変条件: どの FoodLog も、開く先が必ず 1 つに決まり、保存済みの数値を壊さない。
 *   - identity: IdentityLogSheet (編集モード)。Identity + 種類 + 量から再計算する。
 *   - numeric : DirectInputSheet (編集モード)。保存済みの kcal / PFC をそのまま読み書きする。
 *   - myFood  : My食品の記録シート (編集モード)。記録した時点の「保存した値 = 100%」に対する%で量を直す。
 *               My食品から記録した記録 (`log.myFood`) だけ。
 *
 * identity で開けるのは「IdentityLogSheet が自分で保存した記録」だけ。シートは
 * 保存された attrKey / styleKey / amountValue / appliedAddons から選択状態を復元し、
 * 保存時に Identity から再計算する。選択状態が復元できない記録 (直接入力・旧形式・
 * 数値を手で確定した記録) をここへ通すと、既定の量で再計算されて入力値が壊れる。
 * 迷ったら numeric に倒す (数値は必ず残る)。
 *
 * 旧形式ログを Identity に移行しない理由: 起動時の backfill (migration-map) で
 * identityId は付くが、旧マスタの macro と Identity の macro は別物で、量も復元できない。
 * 移行すると保存値が変わるため、表示・集計には identityId を使い、編集は数値で行う。
 */

import { getIdentity } from '@/constants/identity';
import type { BucketKey } from '@/types/identity';
import type { FoodLog } from '@/types/nutrition';

/** DirectInputSheet が記録する FoodLog の categoryKey。 */
export const DIRECT_INPUT_CATEGORY_KEY = 'direct_input';

export type LogEditRoute =
  | { kind: 'identity'; bucket: BucketKey; identityId: string }
  | { kind: 'myFood' }
  | { kind: 'numeric' };

/**
 * 旧 (Identity 導入前) の記録経路だけが書くフィールド。IdentityLogSheet の保存
 * (identity-log-bridge) はこれらを書かない。1 つでもあれば旧形式ログとみなす。
 */
const LEGACY_ONLY_FIELDS = [
  'portionValue',
  'portionLabel',
  'amountMultiplier',
  'toppings',
  'toppingMacroDelta',
  'additions',
  'size',
  'partKey',
  'methodKey',
] as const satisfies readonly (keyof FoodLog)[];

export function isLegacyFormatLog(log: FoodLog): boolean {
  return LEGACY_ONLY_FIELDS.some((key) => log[key] !== undefined);
}

export function resolveLogEditRoute(log: FoodLog): LogEditRoute {
  // My食品の記録は直接入力と同じ形 (categoryKey) だが、基準の値を持つので%で直せる。判定は先に行う
  if (log.myFood) return { kind: 'myFood' };
  if (log.categoryKey === DIRECT_INPUT_CATEGORY_KEY) return { kind: 'numeric' };
  if (log.macroManual) return { kind: 'numeric' };
  if (isLegacyFormatLog(log)) return { kind: 'numeric' };
  if (!log.identityId) return { kind: 'numeric' };

  const record = getIdentity(log.identityId);
  if (!record) return { kind: 'numeric' };
  // IdentityLogSheet は origin Identity を開く。辞書から消えていたら復元できない。
  const originId = log.originIdentityId ?? log.identityId;
  if (!getIdentity(originId)) return { kind: 'numeric' };

  return { kind: 'identity', bucket: record.primaryHome.bucket, identityId: originId };
}

/**
 * 数値で編集した結果の FoodLog。入力した macro をそのまま書き込み、以後 Identity から
 * 再計算されないよう macroManual を立てる (= resolveLogEditRoute が numeric に固定される)。
 * `label` を渡したときだけ名前 (categoryLabel) を変える。それ以外のフィールドは触らない。
 */
export function applyNumericEdit(log: FoodLog, edit: { macro: FoodLog['macro']; label?: string }): FoodLog {
  return {
    ...log,
    ...(edit.label !== undefined ? { categoryLabel: edit.label } : null),
    macro: edit.macro,
    macroManual: true,
  };
}
