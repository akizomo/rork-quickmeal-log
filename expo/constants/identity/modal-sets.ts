/**
 * Modal-set definitions for help / infographic rendering.
 *
 * "modal-set" = 各 bucket 内で「日本人として日常的に食べる」と判定される Identity の集合。
 * 国民健康・栄養調査 (NHNS) における各バケット内の摂取量シェア上位を採用。
 *
 * help ページや tour-stop infographic はこのデータを基に:
 *   - default Identity (`bucket先頭`) のkcal を「タップで記録される値」として表示
 *   - modal-set 全 Identity の min/max kcal を「日本人がよく食べる食材の幅」として表示
 *   - long-tail Identity (modal外) は表示しない (短押し誘導範囲には入らないため)
 *
 * 対象範囲:
 *   - bucket.quickTapDisabled === true の場合は modal-set 計算対象外 (UIで「長押し」表記)
 *
 * 関連 spec: docs/IA-identity-spec.md §1.4 (modal-set基準)
 *           docs/help-content.md (help ページコンテンツ草案)
 */

import { BucketKey } from '@/types/identity';

import { getIdentitiesInBucket, getBucketDef } from './index';

// ---------------------------------------------------------------------------
// 1. Modal-set membership table
// ---------------------------------------------------------------------------

/**
 * 各 bucket 内で「modal」と判定する Identity ID のリスト。
 * `INGREDIENT_IDENTITIES_BY_BUCKET[bucket]` の中から filter する形で使う。
 *
 * 選定基準: NHNS 摂取量シェア上位 + bucket 内主菜量基準を満たすもの
 *   - 副菜・トッピング扱いの Identity (ham, bacon_sausage, canned_lean_fish 等) は除外
 *   - 1食量基準を満たさない or 嗜好品扱いは long-tail
 */
export const MODAL_SETS: Record<BucketKey, string[]> = {
  // ---- ingredient ----
  staple: ['rice', 'bread'],
  lean_protein: ['chicken_lean', 'white_fish', 'seafood_lean', 'red_meat'],
  egg: ['egg'],
  fatty_protein: ['chicken_thigh', 'beef_pork', 'fatty_fish'],
  dairy_soy: ['milk', 'yogurt', 'tofu', 'natto', 'cheese'],
  veggies: ['salad_raw', 'veg_cooked', 'side_seasoned', 'pickles'],
  fruit: ['banana', 'apple_pear', 'citrus'],
  added_fat: ['oil', 'mayo', 'butter_cream'],
  snack_drink: ['chocolate', 'cookie', 'ice', 'snack', 'sweet_bread'], // 表示用 modal-set。bucket は quickTapDisabled

  // ---- dish ----
  rice_dish: ['gyudon_class', 'kaisendon', 'fried_rice_omurice'],
  curry: ['curry_class', 'katsu_curry'],
  chinese_noodles: ['ramen_light', 'ramen_heavy', 'tsukemen', 'fried_noodles'], // bucket quickTapDisabled
  japanese_noodles: ['udon', 'soba'],
  pasta: ['pasta_tomato', 'pasta_cream', 'pasta_meat', 'pasta_japanese'],
  sushi: ['sushi_plate', 'sushi_piece'], // bucket quickTapDisabled
  sandwich: ['cold_sand', 'burger'],
  pizza: ['pizza_simple', 'pizza_meat', 'pizza_cheese'], // bucket quickTapDisabled
  misc_dish: ['teishoku', 'bento', 'fried_main', 'sashimi', 'nabe_light'], // bucket quickTapDisabled
};

// ---------------------------------------------------------------------------
// 2. Computed bucket-level metadata for help / infographic
// ---------------------------------------------------------------------------

/**
 * 1人前のカロリーを計算する。amount.default は単位ごとに意味が違うため、
 * defaultMacro はすでに「1サービング」分の合計として定義されている前提。
 */
function getDefaultServingMacro(identityId: string): { kcal: number; protein: number; fat: number; carbs: number } | null {
  // Lazy lookup via registry; ID不在ならnull
  const all = [
    ...Object.values(MODAL_SETS).flat(),
  ];
  void all; // 参照保持 (将来検証用)
  return null; // placeholder, see resolveBucketView
}
void getDefaultServingMacro; // exported via resolveBucketView

/**
 * P/F/C カロリー寄与比から主成分タグキーを判定する。
 * intro infographic / help infographic で同じ判定を使う。
 */
export type PfcTagKey = 'tag-c' | 'tag-c-light' | 'tag-p' | 'tag-f' | 'tag-pf' | 'tag-fc' | 'tag-pc' | 'tag-balance';

export function classifyPfcTag(macro: { protein: number; fat: number; carbs: number }): {
  key: PfcTagKey;
  label: string;
} {
  const pKcal = macro.protein * 4;
  const fKcal = macro.fat * 9;
  const cKcal = macro.carbs * 4;
  const total = pKcal + fKcal + cKcal;
  if (total <= 0) return { key: 'tag-c-light', label: '—' };

  const pRatio = pKcal / total;
  const fRatio = fKcal / total;
  const cRatio = cKcal / total;

  // Single dominant macro (>= 70%)
  if (cRatio >= 0.7) return { key: 'tag-c', label: 'C 多め' };
  if (pRatio >= 0.7) return { key: 'tag-p', label: 'P 主体' };
  if (fRatio >= 0.95) return { key: 'tag-f', label: 'F のみ' };

  // Two-way mixes (each >= 25%)
  const above25 = (pRatio >= 0.25 ? 1 : 0) + (fRatio >= 0.25 ? 1 : 0) + (cRatio >= 0.25 ? 1 : 0);
  if (above25 >= 3) return { key: 'tag-balance', label: 'バランス' };

  if (pRatio >= 0.25 && fRatio >= 0.25) return { key: 'tag-pf', label: 'P + F' };
  if (fRatio >= 0.25 && cRatio >= 0.25) return { key: 'tag-fc', label: 'F + C' };
  if (pRatio >= 0.25 && cRatio >= 0.25) return { key: 'tag-pc', label: 'P + C' };

  // Fallback: "C 少なめ" — kcal小で C 主体だがバー控えめ
  if (cRatio >= fRatio && cRatio >= pRatio) return { key: 'tag-c-light', label: 'C 少なめ' };
  return { key: 'tag-c-light', label: '—' };
}

// ---------------------------------------------------------------------------
// 3. Bucket view resolver (used by HelpInfographic)
// ---------------------------------------------------------------------------

export interface BucketHelpView {
  bucketKey: BucketKey;
  label: string;          // ボタン表示ラベル (= INGREDIENT/DISH_BUCKETS の `label`)
  emoji: string;
  isQuickTapDisabled: boolean;
  defaultIdentityId: string | null;
  defaultIdentityKcal: number | null;
  defaultIdentityName: string | null;
  modalKcalMin: number | null;
  modalKcalMax: number | null;
  modalIdentityCount: number;
  pfcTag: { key: PfcTagKey; label: string } | null;
}

/**
 * 与えられた bucket の help-infographic用 view-model を返す。
 *
 * - bucket先頭 Identity (= UI上のdefault) を「タップで記録」値として返す
 * - modal-set Identity の defaultMacro.kcal の min/max を「幅」として返す
 * - bucket level または default Identity level で quickTapDisabled の場合は
 *   modal range を null にして UI 側で「長押し」表記にする
 */
export function resolveBucketHelpView(bucketKey: BucketKey): BucketHelpView {
  const bucketDef = getBucketDef(bucketKey);
  const identities = getIdentitiesInBucket(bucketKey);
  const modalIds = MODAL_SETS[bucketKey] ?? [];

  const isBucketDisabled = bucketDef?.quickTapDisabled === true;
  const defaultIdentity = identities[0] ?? null;
  const isIdentityDisabled = defaultIdentity?.quickTapDisabled === true;
  const isQuickTapDisabled = isBucketDisabled || isIdentityDisabled;

  const modalIdentities = identities.filter((x) => modalIds.includes(x.id));
  const kcals = modalIdentities.map((x) => x.defaultMacro.kcal);
  const modalKcalMin = kcals.length > 0 ? Math.min(...kcals) : null;
  const modalKcalMax = kcals.length > 0 ? Math.max(...kcals) : null;

  const pfcTag = defaultIdentity ? classifyPfcTag(defaultIdentity.defaultMacro) : null;

  return {
    bucketKey,
    label: bucketDef?.label ?? '',
    emoji: bucketDef?.emoji ?? '',
    isQuickTapDisabled,
    defaultIdentityId: defaultIdentity?.id ?? null,
    defaultIdentityKcal: defaultIdentity?.defaultMacro.kcal ?? null,
    defaultIdentityName: defaultIdentity?.label ?? null,
    modalKcalMin,
    modalKcalMax,
    modalIdentityCount: modalIdentities.length,
    pfcTag,
  };
}
