/**
 * PFC崩壊遮断ルール (PFC Migration Rules)
 *
 * Spec: docs/IA-identity-spec.md §3
 *
 * When the user picks an Identity then a specific Style or Attribute that
 * radically changes the PFC profile (e.g. potato + 揚げ → fried potato),
 * the log is internally re-routed to the matching destination Identity in
 * a different bucket so the source bucket's representative-value accuracy
 * is preserved.
 *
 * UI presents only a brief confirmation ("フライドポテトとして記録します").
 *
 * Note: These rules are also embedded inline on each Style/Attribute option
 * in the Identity definitions. This file is the canonical reference table
 * used for auditing and for resolver utilities.
 */

import { MigrationTarget } from '@/types/identity';

export interface MigrationRule {
  /** Source Identity ID. */
  fromIdentityId: string;
  /** Trigger type. */
  trigger: 'style' | 'attribute';
  /** Trigger key on the Identity (e.g. 'fried' for Style=揚げ). */
  triggerKey: string;
  /** Where the log gets re-routed. */
  to: MigrationTarget;
  /** Human-readable description for logging/auditing. */
  description: string;
}

// ---------------------------------------------------------------------------
// Style-driven migrations
// ---------------------------------------------------------------------------

export const STYLE_MIGRATIONS: MigrationRule[] = [
  // Rice — 丼化 / カレーかけ / 鍋焼き化
  {
    fromIdentityId: 'rice',
    trigger: 'style',
    triggerKey: 'donburi',
    to: { bucketKey: 'rice_dish', identityKey: 'gyudon_class', confirmMessage: '丼として記録します' },
    description: 'ご飯 + 丼化 → どんぶり/牛丼系',
  },
  {
    fromIdentityId: 'rice',
    trigger: 'style',
    triggerKey: 'curry_pour',
    to: { bucketKey: 'curry', identityKey: 'curry_class', confirmMessage: 'カレーライスとして記録します' },
    description: 'ご飯 + カレーかけ → カレー/カレーライス',
  },
  {
    fromIdentityId: 'rice',
    trigger: 'style',
    triggerKey: 'nabe_yaki',
    to: { bucketKey: 'misc_dish', identityKey: 'nabe_light', confirmMessage: '雑炊・鍋焼きとして記録します' },
    description: 'ご飯 + 雑炊化 → おかず・単品/鍋(あっさり)',
  },

  // Bread — サンド化
  {
    fromIdentityId: 'bread',
    trigger: 'style',
    triggerKey: 'sandwich',
    to: { bucketKey: 'sandwich', identityKey: 'cold_sand', confirmMessage: 'サンドとして記録します' },
    description: 'パン + サンド化 → サンドバーガー/冷サンド',
  },

  // Potato family — 揚げ → フライドポテト, サラダ化 → ポテトサラダ
  {
    fromIdentityId: 'potato',
    trigger: 'style',
    triggerKey: 'fried',
    to: { bucketKey: 'misc_dish', identityKey: 'fried_main', attributeKey: 'fries', confirmMessage: 'フライドポテトとして記録します' },
    description: 'じゃがいも + 揚げ → おかず・単品/フライドポテト',
  },
  {
    fromIdentityId: 'potato',
    trigger: 'style',
    triggerKey: 'salad_mayo',
    to: { bucketKey: 'veggies', identityKey: 'side_creamy', confirmMessage: 'ポテトサラダとして記録します' },
    description: 'じゃがいも + サラダ化(マヨ) → 野菜・汁物/副菜(クリーミー)',
  },

  // Sweet potato — 焼き蜜 / 揚げ蜜 → 和菓子
  {
    fromIdentityId: 'sweet_potato',
    trigger: 'style',
    triggerKey: 'syrup_baked',
    to: { bucketKey: 'snack_drink', identityKey: 'wagashi', confirmMessage: '焼き芋・大学いもとして記録します' },
    description: 'さつまいも + 焼き蜜・揚げ蜜 → おやつ甘飲/和菓子',
  },

  // Chicken (lean) — 揚げ → 唐揚げ
  {
    fromIdentityId: 'chicken_lean',
    trigger: 'style',
    triggerKey: 'fried',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'karaage',
      confirmMessage: '唐揚げとして記録します',
    },
    description: '鶏むね・ささみ + 揚げ → おかず・単品/揚げもの単品(唐揚げ)',
  },

  // Chicken (thigh) — 揚げ → 唐揚げ
  {
    fromIdentityId: 'chicken_thigh',
    trigger: 'style',
    triggerKey: 'fried',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'karaage',
      confirmMessage: '唐揚げとして記録します',
    },
    description: '鶏もも + 揚げ → おかず・単品/揚げもの単品(唐揚げ)',
  },

  // Pork — 衣付揚げ → とんかつ
  {
    fromIdentityId: 'beef_pork',
    trigger: 'style',
    triggerKey: 'breaded_fried_pork',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'tonkatsu',
      confirmMessage: 'とんかつとして記録します',
    },
    description: '豚 + 衣付揚げ → おかず・単品/揚げもの単品(とんかつ)',
  },

  // Beef — 衣付揚げ → メンチカツ
  {
    fromIdentityId: 'beef_pork',
    trigger: 'style',
    triggerKey: 'breaded_fried_beef',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'menchi',
      confirmMessage: 'メンチカツとして記録します',
    },
    description: '牛 + 衣付揚げ → おかず・単品/揚げもの単品(メンチカツ)',
  },

  // White fish — 衣付揚げ → 魚介揚げ
  {
    fromIdentityId: 'white_fish',
    trigger: 'style',
    triggerKey: 'breaded_fried',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'fish_fry',
      confirmMessage: 'アジフライ等として記録します',
    },
    description: '白身魚 + 衣付揚げ → おかず・単品/揚げもの単品(魚介揚げ)',
  },

  // Seafood lean — 衣付揚げ → エビフライ
  {
    fromIdentityId: 'seafood_lean',
    trigger: 'style',
    triggerKey: 'breaded_fried',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'ebi_fry',
      confirmMessage: 'エビフライとして記録します',
    },
    description: 'エビ・イカ・タコ + 衣付揚げ → おかず・単品/揚げもの単品(エビフライ)',
  },

  // Cooked vegetables — 衣付揚げ → 天ぷら
  {
    fromIdentityId: 'veg_cooked',
    trigger: 'style',
    triggerKey: 'breaded_fried',
    to: {
      bucketKey: 'misc_dish',
      identityKey: 'fried_main',
      attributeKey: 'tempura',
      confirmMessage: '天ぷらとして記録します',
    },
    description: '温野菜 + 衣付揚げ → おかず・単品/揚げもの単品(天ぷら)',
  },
];

// ---------------------------------------------------------------------------
// Attribute-driven migrations
// ---------------------------------------------------------------------------

export const ATTRIBUTE_MIGRATIONS: MigrationRule[] = [
  // Chicken thigh — 皮なし → lean_protein 側
  {
    fromIdentityId: 'chicken_thigh',
    trigger: 'attribute',
    triggerKey: 'no_skin',
    to: {
      bucketKey: 'lean_protein',
      identityKey: 'chicken_lean',
      // No confirm message — silent migration; UI stays in fatty bucket but data records to lean.
    },
    description: '鶏もも(皮なし) → 食材/肉魚(低脂肪) 側で記録 (UIは脂P維持)',
  },

  // Canned lean fish (tuna) — 油漬 → fatty side
  {
    fromIdentityId: 'canned_lean_fish',
    trigger: 'attribute',
    triggerKey: 'oil_soaked',
    to: {
      bucketKey: 'fatty_protein',
      identityKey: 'canned_fatty_fish',
    },
    description: 'ツナ缶(油漬) → 食材/脂あり肉魚 側で記録',
  },
];

// ---------------------------------------------------------------------------
// Combined export for resolver convenience
// ---------------------------------------------------------------------------

export const ALL_MIGRATION_RULES: MigrationRule[] = [...STYLE_MIGRATIONS, ...ATTRIBUTE_MIGRATIONS];

/**
 * Find migration target for a given Identity + trigger.
 * Returns undefined when no migration applies (= stay in primary home).
 */
export function findMigration(
  identityId: string,
  trigger: 'style' | 'attribute',
  triggerKey: string
): MigrationTarget | undefined {
  const rule = ALL_MIGRATION_RULES.find(
    (r) =>
      r.fromIdentityId === identityId &&
      r.trigger === trigger &&
      r.triggerKey === triggerKey
  );
  return rule?.to;
}
