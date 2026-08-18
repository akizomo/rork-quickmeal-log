/**
 * Identity registry — central lookup for the new Identity-first IA.
 *
 * Spec: docs/IA-identity-spec.md
 *
 * Phase 2: JP + US data merged. Global lookups (GLOBAL_BY_ID, resolveAddonRef)
 * cover all locales for past-log resolution; buildRegistry(locale) returns
 * locale-filtered buckets/byBucket for input UI.
 */

import {
  Addon,
  BucketDef,
  BucketKey,
  DishBucketKey,
  Identity,
  IdentityRegistry,
  IngredientBucketKey,
} from '@/types/identity';
import type { AppLocale } from '@/types/locale';

import { DISH_IDENTITIES, DISH_IDENTITIES_BY_BUCKET } from './dishes';
import { INGREDIENT_IDENTITIES, INGREDIENT_IDENTITIES_BY_BUCKET } from './ingredients';
import { PURE_ADDONS, PURE_ADDONS_BY_ID, IDENTITY_ADDON_REFS } from './addons';
import { ALL_MIGRATION_RULES, findMigration, STYLE_MIGRATIONS, ATTRIBUTE_MIGRATIONS } from './migration-rules';
import { US_INGREDIENT_IDENTITIES, US_INGREDIENT_IDENTITIES_BY_BUCKET } from './us/ingredients';
import { US_DISH_IDENTITIES, US_DISH_IDENTITIES_BY_BUCKET } from './us/dishes';
import { US_PURE_ADDONS_BY_ID, US_IDENTITY_ADDON_REFS } from './us/addons';

// ---------------------------------------------------------------------------
// Bucket definitions (UI labels & emoji)
// ---------------------------------------------------------------------------

export const INGREDIENT_BUCKETS: BucketDef[] = [
  { key: 'staple',        tab: 'ingredient', label: 'ごはんパン麺', shortLabel: '主食',   emoji: '🍚', labelEn: 'Grains & Carbs',    shortLabelEn: 'Grains' },
  { key: 'lean_protein',  tab: 'ingredient', label: '肉魚(低脂肪)', shortLabel: '低脂P',  emoji: '🐓', labelEn: 'Lean Protein',      shortLabelEn: 'LeanP'  },
  { key: 'egg',           tab: 'ingredient', label: '卵',           shortLabel: '卵',     emoji: '🥚', labelEn: 'Eggs',              shortLabelEn: 'Eggs'   },
  { key: 'fatty_protein', tab: 'ingredient', label: '脂あり肉魚',   shortLabel: '脂P',    emoji: '🥩', labelEn: 'Fatty Protein',     shortLabelEn: 'FattyP' },
  { key: 'dairy_soy',     tab: 'ingredient', label: '乳・大豆',     shortLabel: '乳大豆', emoji: '🥛', labelEn: 'Dairy & Soy',       shortLabelEn: 'Dairy'  },
  { key: 'veggies',       tab: 'ingredient', label: '野菜',         shortLabel: '野菜',   emoji: '🥦', labelEn: 'Vegetables',        shortLabelEn: 'Veggies'},
  { key: 'fruit',         tab: 'ingredient', label: '果物',         shortLabel: '果物',   emoji: '🍎', labelEn: 'Fruit',             shortLabelEn: 'Fruit'  },
  { key: 'added_fat',     tab: 'ingredient', label: '油・調味',     shortLabel: '油調味', emoji: '🧈', labelEn: 'Fats & Sauces',     shortLabelEn: 'Fats'   },
  { key: 'snack_drink',   tab: 'ingredient', label: 'おやつ甘飲',   shortLabel: 'おやつ', emoji: '🍩', labelEn: 'Snacks & Drinks',   shortLabelEn: 'Snacks', quickTapDisabled: true },
];

export const DISH_BUCKETS: BucketDef[] = [
  { key: 'rice_dish',        tab: 'dish', label: 'どんぶり',       shortLabel: '丼',     emoji: '🥣', locale: 'ja', labelEn: 'Rice Bowls',      shortLabelEn: 'Donburi' },
  { key: 'curry',            tab: 'dish', label: 'カレー',         shortLabel: 'カレー', emoji: '🍛', locale: 'ja', labelEn: 'Curry',            shortLabelEn: 'Curry'   },
  { key: 'chinese_noodles',  tab: 'dish', label: 'ラーメン中華麺', shortLabel: '中華麺', emoji: '🍜', locale: 'ja', labelEn: 'Ramen & Noodles', shortLabelEn: 'Ramen',   quickTapDisabled: true },
  { key: 'japanese_noodles', tab: 'dish', label: 'うどん蕎麦',     shortLabel: '和麺',   emoji: '🍲', locale: 'ja', labelEn: 'Udon & Soba',     shortLabelEn: 'Udon'    },
  { key: 'pasta',            tab: 'dish', label: 'パスタ',         shortLabel: 'パスタ', emoji: '🍝', locale: 'ja', labelEn: 'Pasta',            shortLabelEn: 'Pasta'   },
  { key: 'sushi',            tab: 'dish', label: '寿司',           shortLabel: '寿司',   emoji: '🍣', locale: 'ja', labelEn: 'Sushi',            shortLabelEn: 'Sushi',   quickTapDisabled: true },
  { key: 'sandwich',         tab: 'dish', label: 'サンドバーガー', shortLabel: 'サンド', emoji: '🥪', locale: 'ja', labelEn: 'Sandwiches',       shortLabelEn: 'Sand.'   },
  { key: 'pizza',            tab: 'dish', label: 'ピザ',           shortLabel: 'ピザ',   emoji: '🍕', locale: 'ja', labelEn: 'Pizza',            shortLabelEn: 'Pizza',   quickTapDisabled: true },
  { key: 'misc_dish',        tab: 'dish', label: '定食・単品・汁', shortLabel: '定食汁', emoji: '🍱', locale: 'ja', labelEn: 'Set Meals',        shortLabelEn: 'Set',     quickTapDisabled: true },
];

export const US_DISH_BUCKETS: BucketDef[] = [
  { key: 'burger_sandwich', tab: 'dish', label: 'Burgers & Sandwiches', shortLabel: 'Burger', emoji: '🍔', locale: 'en-US' },
  { key: 'pizza_pasta',     tab: 'dish', label: 'Pizza & Pasta',        shortLabel: 'Pizza',  emoji: '🍕', locale: 'en-US', quickTapDisabled: true },
  { key: 'chicken',         tab: 'dish', label: 'Chicken',              shortLabel: 'Chicken',emoji: '🍗', locale: 'en-US' },
  { key: 'mexican',         tab: 'dish', label: 'Mexican & Tex-Mex',    shortLabel: 'Mexican',emoji: '🌮', locale: 'en-US' },
  { key: 'american_plate',  tab: 'dish', label: 'American Plates',      shortLabel: 'Plates', emoji: '🥩', locale: 'en-US', quickTapDisabled: true },
  { key: 'soup_stew',       tab: 'dish', label: 'Soups & Stews',        shortLabel: 'Soups',  emoji: '🍲', locale: 'en-US' },
  { key: 'bowl_salad',      tab: 'dish', label: 'Bowls & Salads',       shortLabel: 'Bowls',  emoji: '🥗', locale: 'en-US' },
  { key: 'asian_takeout',   tab: 'dish', label: 'Asian Takeout',        shortLabel: 'Asian',  emoji: '🥡', locale: 'en-US', quickTapDisabled: true },
  { key: 'breakfast',       tab: 'dish', label: 'Breakfast',            shortLabel: 'Bkfast', emoji: '🍳', locale: 'en-US' },
];

export const ALL_BUCKETS: BucketDef[] = [...INGREDIENT_BUCKETS, ...DISH_BUCKETS, ...US_DISH_BUCKETS];

// ---------------------------------------------------------------------------
// Aggregated identity list
// ---------------------------------------------------------------------------

/** JP identities only — for JP locale search index. */
export const ALL_IDENTITIES: Identity[] = [...INGREDIENT_IDENTITIES, ...DISH_IDENTITIES];
/** US identities only — for en-US locale search index. */
export const ALL_US_IDENTITIES: Identity[] = [...US_INGREDIENT_IDENTITIES, ...US_DISH_IDENTITIES];

const BY_ID: Record<string, Identity> = ALL_IDENTITIES.reduce(
  (acc, id) => {
    acc[id.id] = id;
    return acc;
  },
  {} as Record<string, Identity>
);

const BY_BUCKET: Record<BucketKey, Identity[]> = {
  ...INGREDIENT_IDENTITIES_BY_BUCKET,
  ...DISH_IDENTITIES_BY_BUCKET,
} as Record<BucketKey, Identity[]>;

// ---------------------------------------------------------------------------
// Global lookups — span all locales for past-log resolution
// ---------------------------------------------------------------------------

const US_BY_ID: Record<string, Identity> = [...US_INGREDIENT_IDENTITIES, ...US_DISH_IDENTITIES].reduce(
  (acc, id) => { acc[id.id] = id; return acc; },
  {} as Record<string, Identity>
);

/** Resolves any Identity ID regardless of locale — use for log history lookups. */
const GLOBAL_BY_ID: Record<string, Identity> = { ...BY_ID, ...US_BY_ID };

const GLOBAL_PURE_ADDONS_BY_ID: Record<string, Addon> = { ...PURE_ADDONS_BY_ID, ...US_PURE_ADDONS_BY_ID };
const GLOBAL_IDENTITY_ADDON_REFS: string[] = [...IDENTITY_ADDON_REFS, ...US_IDENTITY_ADDON_REFS];

// ---------------------------------------------------------------------------
// Public registry
// ---------------------------------------------------------------------------

export const IDENTITY_REGISTRY: IdentityRegistry = {
  byId: GLOBAL_BY_ID,
  byBucket: BY_BUCKET,
  buckets: ALL_BUCKETS,
  addons: GLOBAL_PURE_ADDONS_BY_ID,
};

// ---------------------------------------------------------------------------
// Locale-aware registry builder
// ---------------------------------------------------------------------------

/**
 * Returns a locale-filtered registry.
 *
 * @param foodRegion - Which region's food data to use ('ja' = JP dishes, 'en-US' = US dishes).
 * @param uiLanguage - Which language to use for bucket labels. Defaults to foodRegion.
 *
 * `byId` always spans all locales so past log entries resolve regardless of current locale.
 */
export function buildRegistry(foodRegion: AppLocale = 'ja', uiLanguage?: AppLocale): IdentityRegistry {
  const lang = uiLanguage ?? foodRegion;
  const applyEnLabels = <T extends BucketDef>(buckets: T[]): T[] =>
    lang === 'en-US'
      ? buckets.map((b) => b.labelEn ? { ...b, label: b.labelEn, shortLabel: b.shortLabelEn ?? b.shortLabel } : b)
      : buckets;

  if (foodRegion === 'en-US') {
    const byBucket = {
      ...US_INGREDIENT_IDENTITIES_BY_BUCKET,
      ...US_DISH_IDENTITIES_BY_BUCKET,
    } as Record<BucketKey, Identity[]>;
    return {
      byId: GLOBAL_BY_ID,
      byBucket,
      buckets: [...applyEnLabels(INGREDIENT_BUCKETS), ...US_DISH_BUCKETS],
      addons: GLOBAL_PURE_ADDONS_BY_ID,
    };
  }

  // 'ja': JP ingredient + JP dish buckets. Apply English labels when uiLanguage='en-US'.
  return {
    ...IDENTITY_REGISTRY,
    buckets: [...applyEnLabels(INGREDIENT_BUCKETS), ...applyEnLabels(DISH_BUCKETS)],
  };
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Resolves any Identity ID across all locales (JP + US). */
export function getIdentity(id: string): Identity | undefined {
  return GLOBAL_BY_ID[id];
}

export function getIdentitiesInBucket(bucket: BucketKey): Identity[] {
  return BY_BUCKET[bucket] ?? [];
}

export function getBucketDef(bucket: BucketKey): BucketDef | undefined {
  return ALL_BUCKETS.find((b) => b.key === bucket);
}

export function isIngredientBucket(bucket: BucketKey): bucket is IngredientBucketKey {
  return INGREDIENT_BUCKETS.some((b) => b.key === bucket);
}

export function isDishBucket(bucket: BucketKey): bucket is DishBucketKey {
  return DISH_BUCKETS.some((b) => b.key === bucket);
}

// `searchIdentities()` は 2026-08-03 に削除。唯一の利用元だった IdentitySearchBar が
// SearchSheet に置換されたため。検索は `utils/identity-search.ts` の
// `searchIdentitiesFuzzy()` (正規化 + bigram類似度) を使うこと。

// ---------------------------------------------------------------------------
// Addon resolver — locale-agnostic, covers JP + US
// ---------------------------------------------------------------------------

/**
 * Resolves an addon reference ID to its addon data or identity ref.
 * Covers both JP and US addon pools — use this instead of the JP-only
 * resolveAddonRef from addons.ts.
 */
export function resolveAddonRef(
  id: string,
): { type: 'addon'; data: Addon } | { type: 'identity'; identityId: string } | undefined {
  if (GLOBAL_PURE_ADDONS_BY_ID[id]) return { type: 'addon', data: GLOBAL_PURE_ADDONS_BY_ID[id] };
  if (GLOBAL_IDENTITY_ADDON_REFS.includes(id)) return { type: 'identity', identityId: id };
  return undefined;
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  INGREDIENT_IDENTITIES,
  INGREDIENT_IDENTITIES_BY_BUCKET,
  DISH_IDENTITIES,
  DISH_IDENTITIES_BY_BUCKET,
  PURE_ADDONS,
  PURE_ADDONS_BY_ID,
  IDENTITY_ADDON_REFS,
  // resolveAddonRef: defined above as global (JP + US)
  ALL_MIGRATION_RULES,
  STYLE_MIGRATIONS,
  ATTRIBUTE_MIGRATIONS,
  findMigration,
};
