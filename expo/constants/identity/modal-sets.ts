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
import type { AppLocale } from '@/types/locale';

import { buildRegistry, getBucketDef } from './index';

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
  staple: ['rice', 'bread', 'noodle_udon', 'noodle_pasta', 'noodle_ramen'],
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
  misc_dish: ['teishoku', 'bento', 'fried_main', 'sashimi', 'nabe'], // bucket quickTapDisabled

  // ---- US dish: MODAL_SETS_US を参照 (ここは JP 用) ----
  burger_sandwich: [],
  pizza_pasta:     [],
  chicken:         [],
  mexican:         [],
  american_plate:  [],
  soup_stew:       [],
  bowl_salad:      [],
  asian_takeout:   [],
  breakfast:       [],
};

/**
 * US 食事データ (foodRegion='en-US') 用の modal-set。
 *
 * 食材タブのバケットキーは JP と共有だが中身の Identity が違うので、別の表として持つ。
 * 選び方は JP と同じ規則 (docs/IA-identity-spec.md §1.4) に揃えた:
 *   - そのボタンで日常的に食べる主力 (docs/US-food-db-design.md §2-4 の接地データ) を入れる
 *   - 添え物・トッピング扱い (bacon / sausage / canned tuna) は除外 (JP の ham / bacon_sausage /
 *     canned_lean_fish と同じ扱い)
 *   - PFC が他と大きく違うもの (beans: C+P で 225kcal、peanut butter / nuts: 1食量が別物) は除外
 * NHANES の摂取シェアで1件ずつ順位付けしたものではなく、設計書の Identity 選定を踏まえた暫定の選定。
 * 2026-11-07 追加 (ヘルプの表が US 選択時も日本の食事のままだった問題の対応)。
 */
export const MODAL_SETS_US: Partial<Record<BucketKey, string[]>> = {
  // ---- ingredient ----
  staple: ['us_bread', 'us_rice_cup', 'us_pasta_plain', 'us_potato', 'us_tortilla'],
  lean_protein: ['us_chicken_breast', 'us_turkey_breast', 'us_white_fish', 'us_shrimp'],
  egg: ['us_egg'],
  fatty_protein: ['us_ground_beef', 'us_steak', 'us_pork_chop', 'us_salmon'],
  dairy_soy: ['us_milk', 'us_cheese_slice', 'us_greek_yogurt', 'us_tofu_us'],
  veggies: ['us_salad_greens', 'us_broccoli', 'us_mixed_veg', 'us_corn'],
  fruit: ['us_banana', 'us_apple', 'us_berries', 'us_orange'],
  added_fat: ['us_butter', 'us_olive_oil', 'us_mayo_tbsp', 'us_ranch_tbsp'],
  snack_drink: ['us_chips', 'us_cookies', 'us_ice_cream', 'us_soda', 'us_coffee_drink'], // 表示用。bucket は quickTapDisabled

  // ---- dish ----
  burger_sandwich: ['us_cheeseburger', 'us_hamburger', 'us_chicken_sandwich', 'us_deli_sub'],
  pizza_pasta: ['us_pizza_pepperoni', 'us_pizza_cheese', 'us_pasta_tomato', 'us_pasta_meat', 'us_mac_cheese'], // bucket quickTapDisabled
  chicken: ['us_fried_chicken', 'us_tenders_nuggets', 'us_wings', 'us_rotisserie_grilled'],
  mexican: ['us_burrito', 'us_tacos', 'us_quesadilla', 'us_burrito_bowl'],
  american_plate: ['us_steak_potato', 'us_meatloaf_mash', 'us_bbq_plate', 'us_roast_plate'], // bucket quickTapDisabled
  soup_stew: ['us_chili', 'us_soup_light', 'us_soup_creamy'],
  bowl_salad: ['us_entree_salad', 'us_grain_bowl', 'us_protein_salad'],
  asian_takeout: ['us_chinese_combo', 'us_lo_mein_fried_rice', 'us_teriyaki_bowl', 'us_sushi_roll', 'us_ramen_pho'], // bucket quickTapDisabled
  breakfast: ['us_eggs_bacon', 'us_pancakes_waffles', 'us_breakfast_sandwich', 'us_breakfast_burrito'],
};

export function getModalSet(bucketKey: BucketKey, foodRegion: AppLocale = 'ja'): string[] {
  return (foodRegion === 'en-US' ? MODAL_SETS_US[bucketKey] : MODAL_SETS[bucketKey]) ?? [];
}

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
export type PfcTagKey = 'tag-c' | 'tag-c-light' | 'tag-p' | 'tag-f' | 'tag-pf' | 'tag-fc' | 'tag-pc' | 'tag-balance' | 'tag-none';

const PFC_TAG_LABELS: Record<AppLocale, Record<PfcTagKey, string>> = {
  ja: {
    'tag-c': 'C 多め',
    'tag-p': 'P 主体',
    'tag-f': 'F のみ',
    'tag-balance': 'バランス',
    'tag-pf': 'P + F',
    'tag-fc': 'F + C',
    'tag-pc': 'P + C',
    'tag-c-light': 'C 少なめ',
    'tag-none': '—',
  },
  'en-US': {
    'tag-c': 'Carb-heavy',
    'tag-p': 'Protein-focused',
    'tag-f': 'Fat only',
    'tag-balance': 'Balanced',
    'tag-pf': 'P + F',
    'tag-fc': 'F + C',
    'tag-pc': 'P + C',
    'tag-c-light': 'Light carb',
    'tag-none': '—',
  },
};

export function pfcTagLabel(key: PfcTagKey, lang: AppLocale): string {
  return PFC_TAG_LABELS[lang]?.[key] ?? PFC_TAG_LABELS.ja[key];
}

export function classifyPfcTag(macro: { protein: number; fat: number; carbs: number }): {
  key: PfcTagKey;
} {
  const pKcal = macro.protein * 4;
  const fKcal = macro.fat * 9;
  const cKcal = macro.carbs * 4;
  const total = pKcal + fKcal + cKcal;
  if (total <= 0) return { key: 'tag-none' };

  const pRatio = pKcal / total;
  const fRatio = fKcal / total;
  const cRatio = cKcal / total;

  // Single dominant macro (>= 70%)
  if (cRatio >= 0.7) return { key: 'tag-c' };
  if (pRatio >= 0.7) return { key: 'tag-p' };
  if (fRatio >= 0.95) return { key: 'tag-f' };

  // Two-way mixes (each >= 25%)
  const above25 = (pRatio >= 0.25 ? 1 : 0) + (fRatio >= 0.25 ? 1 : 0) + (cRatio >= 0.25 ? 1 : 0);
  if (above25 >= 3) return { key: 'tag-balance' };

  if (pRatio >= 0.25 && fRatio >= 0.25) return { key: 'tag-pf' };
  if (fRatio >= 0.25 && cRatio >= 0.25) return { key: 'tag-fc' };
  if (pRatio >= 0.25 && cRatio >= 0.25) return { key: 'tag-pc' };

  // Fallback: "C 少なめ" — kcal小で C 主体だがバー控えめ
  if (cRatio >= fRatio && cRatio >= pRatio) return { key: 'tag-c-light' };
  return { key: 'tag-none' };
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
export function resolveBucketHelpView(
  bucketKey: BucketKey,
  uiLanguage: AppLocale = 'ja',
  foodRegion: AppLocale = 'ja',
): BucketHelpView {
  // 表はユーザーが選んでいる食事データ (foodRegion) のボタン・中身で出す。
  // JP 固定の getIdentitiesInBucket を使うと US 選択時も日本の食事が出てしまう。
  const registry = buildRegistry(foodRegion, uiLanguage);
  const localizedDef = registry.buckets.find((b) => b.key === bucketKey);
  const bucketDef = localizedDef ?? getBucketDef(bucketKey);
  const localizedLabel = localizedDef?.label ?? bucketDef?.label ?? '';
  const identities = registry.byBucket[bucketKey] ?? [];
  const modalIds = getModalSet(bucketKey, foodRegion);

  const isBucketDisabled = bucketDef?.quickTapDisabled === true;
  const defaultIdentity = identities[0] ?? null;
  const isIdentityDisabled = defaultIdentity?.quickTapDisabled === true;
  const isQuickTapDisabled = isBucketDisabled || isIdentityDisabled;

  const modalIdentities = identities.filter((x) => modalIds.includes(x.id));
  const kcals = modalIdentities.map((x) => x.defaultMacro.kcal);
  const modalKcalMin = kcals.length > 0 ? Math.min(...kcals) : null;
  const modalKcalMax = kcals.length > 0 ? Math.max(...kcals) : null;

  const pfcTagKey = defaultIdentity ? classifyPfcTag(defaultIdentity.defaultMacro).key : null;
  const pfcTag = pfcTagKey ? { key: pfcTagKey, label: pfcTagLabel(pfcTagKey, uiLanguage) } : null;

  return {
    bucketKey,
    label: localizedLabel,
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
