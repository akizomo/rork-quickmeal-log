/**
 * Identity registry — central lookup for the new Identity-first IA.
 *
 * Spec: docs/IA-identity-spec.md
 *
 * Phase 1 (this file): pure data + lookup helpers.
 * Phase 2 will plug these into resolvers, components, and migration logic.
 */

import {
  BucketDef,
  BucketKey,
  DishBucketKey,
  Identity,
  IdentityRegistry,
  IngredientBucketKey,
} from '@/types/identity';

import { DISH_IDENTITIES, DISH_IDENTITIES_BY_BUCKET } from './dishes';
import { INGREDIENT_IDENTITIES, INGREDIENT_IDENTITIES_BY_BUCKET } from './ingredients';
import { PURE_ADDONS, PURE_ADDONS_BY_ID, resolveAddonRef, IDENTITY_ADDON_REFS } from './addons';
import { ALL_MIGRATION_RULES, findMigration, STYLE_MIGRATIONS, ATTRIBUTE_MIGRATIONS } from './migration-rules';

// ---------------------------------------------------------------------------
// Bucket definitions (UI labels & emoji)
// ---------------------------------------------------------------------------

export const INGREDIENT_BUCKETS: BucketDef[] = [
  { key: 'staple',         tab: 'ingredient', label: 'ごはんパン麺', shortLabel: '主食',     emoji: '🍚' },
  { key: 'lean_protein',   tab: 'ingredient', label: '肉魚(低脂肪)', shortLabel: '低脂P',   emoji: '🐓' },
  { key: 'egg',            tab: 'ingredient', label: '卵',           shortLabel: '卵',       emoji: '🥚' },
  { key: 'fatty_protein',  tab: 'ingredient', label: '脂あり肉魚',   shortLabel: '脂P',     emoji: '🥩' },
  { key: 'dairy_soy',      tab: 'ingredient', label: '乳・大豆',     shortLabel: '乳大豆',   emoji: '🥛' },
  // v1.2: 「野菜・汁物」→「野菜」 (汁物4 Identityをmisc_dishへ移送)
  { key: 'veggies',        tab: 'ingredient', label: '野菜',         shortLabel: '野菜',     emoji: '🥦' },
  { key: 'fruit',          tab: 'ingredient', label: '果物',         shortLabel: '果物',     emoji: '🍎' },
  { key: 'added_fat',      tab: 'ingredient', label: '油・調味',     shortLabel: '油調味',   emoji: '🧈' },
  // v1.2: snack_drink に quickTapDisabled 追加 (modal-set内 F幅12.5g、kcal±49% で modal特定不能)
  { key: 'snack_drink',    tab: 'ingredient', label: 'おやつ甘飲',   shortLabel: 'おやつ',   emoji: '🍩', quickTapDisabled: true },
];

export const DISH_BUCKETS: BucketDef[] = [
  { key: 'rice_dish',         tab: 'dish', label: 'どんぶり',         shortLabel: '丼',        emoji: '🥣' },
  { key: 'curry',             tab: 'dish', label: 'カレー',           shortLabel: 'カレー',    emoji: '🍛' },
  { key: 'chinese_noodles',   tab: 'dish', label: 'ラーメン中華麺',   shortLabel: '中華麺',    emoji: '🍜', quickTapDisabled: true },
  { key: 'japanese_noodles',  tab: 'dish', label: 'うどん蕎麦',       shortLabel: '和麺',      emoji: '🍲' },
  { key: 'pasta',             tab: 'dish', label: 'パスタ',           shortLabel: 'パスタ',    emoji: '🍝' },
  { key: 'sushi',             tab: 'dish', label: '寿司',             shortLabel: '寿司',      emoji: '🍣', quickTapDisabled: true },
  { key: 'sandwich',          tab: 'dish', label: 'サンドバーガー',   shortLabel: 'サンド',    emoji: '🥪' },
  { key: 'pizza',             tab: 'dish', label: 'ピザ',             shortLabel: 'ピザ',      emoji: '🍕', quickTapDisabled: true },
  // v1.2: 「定食・単品」→「定食・単品・汁」 (汁物4 Identityを veggies から移送)
  { key: 'misc_dish',         tab: 'dish', label: '定食・単品・汁',   shortLabel: '定食汁',    emoji: '🍱', quickTapDisabled: true },
];

export const ALL_BUCKETS: BucketDef[] = [...INGREDIENT_BUCKETS, ...DISH_BUCKETS];

// ---------------------------------------------------------------------------
// Aggregated identity list
// ---------------------------------------------------------------------------

export const ALL_IDENTITIES: Identity[] = [...INGREDIENT_IDENTITIES, ...DISH_IDENTITIES];

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
// Public registry
// ---------------------------------------------------------------------------

export const IDENTITY_REGISTRY: IdentityRegistry = {
  byId: BY_ID,
  byBucket: BY_BUCKET,
  buckets: ALL_BUCKETS,
  addons: PURE_ADDONS_BY_ID,
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getIdentity(id: string): Identity | undefined {
  return BY_ID[id];
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

/**
 * Multi-entrance search: find Identities that match `query` either by label
 * or by their `searchTags` (and that opt-in to surfacing in `bucket` if given).
 */
export function searchIdentities(query: string, restrictToBucket?: BucketKey): Identity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_IDENTITIES.filter((id) => {
    if (restrictToBucket && id.primaryHome.bucket !== restrictToBucket) {
      const surfaceable = id.searchableFrom?.includes(restrictToBucket);
      if (!surfaceable) return false;
    }
    if (id.label.toLowerCase().includes(q)) return true;
    if (id.searchTags?.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
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
  resolveAddonRef,
  ALL_MIGRATION_RULES,
  STYLE_MIGRATIONS,
  ATTRIBUTE_MIGRATIONS,
  findMigration,
};
