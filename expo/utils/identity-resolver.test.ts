/**
 * Tests for identity-resolver.ts
 *
 * Specs covered:
 *   - Pattern A (count) and Pattern B (g) amount factor
 *   - Style migration (Style > Attribute priority)
 *   - Attribute migration
 *   - Add-on (pure Addon and Identity-flavored asAddon)
 *   - confirmMessage propagation
 */

import { resolveLog } from './identity-resolver';
import { getIdentity, ALL_IDENTITIES, ALL_US_IDENTITIES } from '@/constants/identity';
import type { AttributeOption, Identity, StyleOption } from '@/types/identity';

describe('Identity registry sanity', () => {
  it('has the Identities required by these tests', () => {
    expect(getIdentity('egg')).toBeDefined();
    expect(getIdentity('rice')).toBeDefined();
    expect(getIdentity('chicken_thigh')).toBeDefined();
    expect(getIdentity('chicken_lean')).toBeDefined();
    expect(getIdentity('potato')).toBeDefined();
    // 'fries' は独立 Identity ではなく fried_main の attribute (種類) として実装されている。
    expect(getIdentity('canned_lean_fish')).toBeDefined();
    expect(getIdentity('canned_fatty_fish')).toBeDefined();
    expect(getIdentity('fried_main')).toBeDefined();
    expect(getIdentity('natto')).toBeDefined();
  });
});

describe('resolveLog — Pattern A (no amount chips)', () => {
  it('returns defaultMacro for egg with no attribute/style chosen', () => {
    const result = resolveLog({ originIdentityId: 'egg' });

    expect(result.recordIdentityId).toBe('egg');
    expect(result.originIdentityId).toBe('egg');
    expect(result.amountValue).toBe(1);
    expect(result.baseMacro).toEqual({ kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 });
    expect(result.totalMacro).toEqual({ kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 });
    expect(result.confirmMessage).toBeUndefined();
  });
});

describe('resolveLog — Pattern B (g amount with chips)', () => {
  it('scales rice by amount factor (200g of 150g default)', () => {
    const result = resolveLog({ originIdentityId: 'rice', amountValue: 200 });

    expect(result.recordIdentityId).toBe('rice');
    expect(result.amountValue).toBe(200);
    // 234 * 200/150 = 312
    expect(result.baseMacro.kcal).toBeCloseTo(312, 1);
    expect(result.baseMacro.protein).toBeCloseTo(5.1, 1);
    expect(result.baseMacro.fat).toBeCloseTo(0.7, 1);
    expect(result.baseMacro.carbs).toBeCloseTo(74.7, 1);
  });
});

describe('resolveLog — macroDelta (加算デルタ, IA spec v1.3 §3.4)', () => {
  it('adds carbs to a zero-carb base (factor だけでは不可能なケース)', () => {
    // 生魚は carbs: 0。乗算 factor では煮汁の糖質を足せないため macroDelta を使う。
    const raw = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'saba', styleKey: 'raw' });
    expect(raw.baseMacro.carbs).toBe(0);

    const simmered = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'saba', styleKey: 'nizuke' });
    expect(simmered.baseMacro.carbs).toBeCloseTo(8.5, 1);
    expect(simmered.baseMacro.kcal).toBeCloseTo(raw.baseMacro.kcal + 45, 1);
  });

  it('scales the delta with amount (2切なら煮汁も2倍)', () => {
    const one = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'saba', styleKey: 'nizuke', amountValue: 80 });
    const two = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'saba', styleKey: 'nizuke', amountValue: 160 });

    expect(two.baseMacro.kcal).toBeCloseTo(one.baseMacro.kcal * 2, 1);
    expect(two.baseMacro.carbs).toBeCloseTo(one.baseMacro.carbs * 2, 1);
  });

  it('regression: うなぎ蒲焼 の炭水化物が欠落しない', () => {
    // 旧実装は factor: { carbs: 999 } で「別処理する」とされていたが実処理が無く、
    // 0 × 999 = 0 で C が丸ごと落ちていた。
    const unagi = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'unagi' });
    expect(unagi.baseMacro.carbs).toBeGreaterThan(0);
  });

  it('leaves options without macroDelta unchanged (既存データの計算結果は不変)', () => {
    const salmon = resolveLog({ originIdentityId: 'fatty_fish', attributeKey: 'salmon', styleKey: 'raw' });
    expect(salmon.baseMacro).toEqual({ kcal: 200, protein: 20, fat: 12, carbs: 0 });
  });
});

describe('resolveLog — Attribute migration', () => {
  it('migrates chicken_thigh + Attribute=no_skin to chicken_lean', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      attributeKey: 'no_skin',
    });

    expect(result.originIdentityId).toBe('chicken_thigh');
    expect(result.recordIdentityId).toBe('chicken_lean');
    // After migration we use chicken_lean's defaultMacro (100g)
    expect(result.baseMacro).toEqual({ kcal: 105, protein: 23, fat: 1.5, carbs: 0 });
    // Silent migration — no confirmMessage
    expect(result.confirmMessage).toBeUndefined();
  });

  it('migrates canned_lean_fish + oil_soaked to canned_fatty_fish', () => {
    const result = resolveLog({
      originIdentityId: 'canned_lean_fish',
      attributeKey: 'oil_soaked',
    });

    expect(result.recordIdentityId).toBe('canned_fatty_fish');
    expect(result.baseMacro.kcal).toBeCloseTo(280, 1);
    expect(result.baseMacro.protein).toBeCloseTo(28, 1);
  });
});

describe('resolveLog — Style migration', () => {
  it('migrates potato + Style=fried to fried_main (attribute=fries) with confirmMessage', () => {
    const result = resolveLog({
      originIdentityId: 'potato',
      styleKey: 'fried',
    });

    // 'fries' は独立 Identity ではなく fried_main の attribute。
    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.attributeKey).toBe('fries');
    // fried_main defaultMacro(350kcal/F20) × fries factor(0.96/F0.81) = 336kcal/F16.2
    expect(result.baseMacro.kcal).toBeCloseTo(336, 1);
    expect(result.baseMacro.fat).toBeCloseTo(16.2, 1);
    expect(result.confirmMessage).toBe('フライドポテトとして記録します');
    // Style key is dropped after migration
    expect(result.styleKey).toBeUndefined();
  });

  it('honors amountValue across a migration when units match (chicken_thigh 100g + fried → karaage_momo 100g)', () => {
    // resolveLog is a pure function that trusts the caller's amountValue as-is;
    // it does NOT know whether the unit is meaningful for the recordIdentity.
    // That responsibility lives in IdentityLogSheet's resolveAmountBasis(),
    // which only carries the numeric value across a migration when the origin
    // and recordIdentity share the same amount unit (both 'g' here, since
    // karaage_momo/karaage_mune were given g-based amount overrides precisely
    // so a raw-chicken gram value keeps meaning after the 唐揚げ振替).
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      styleKey: 'fried',
      amountValue: 100,
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.attributeKey).toBe('karaage_momo');
    expect(result.amountValue).toBe(100);
    // fried_main default 350 × karaage_momo factor 0.857 (≒300kcal/100g) at amountFactor=1
    expect(result.baseMacro.kcal).toBeCloseTo(300, 0);
  });

  it('scales amountValue proportionally past a migration (chicken_thigh 200g + fried)', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      styleKey: 'fried',
      amountValue: 200,
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.amountValue).toBe(200);
    // 300kcal/100g baseline × 2 = ~600kcal
    expect(result.baseMacro.kcal).toBeCloseTo(600, 0);
  });

  it('Style migration takes priority over Attribute migration (chicken_thigh + no_skin + fried → fried_main(karaage_momo))', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      attributeKey: 'no_skin',
      styleKey: 'fried',
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.attributeKey).toBe('karaage_momo');
    expect(result.confirmMessage).toBe('唐揚げ(もも)として記録します');
    // fried_main default 350 × karaage_momo factor 0.857 = ~300kcal (at default 100g)
    expect(result.baseMacro.kcal).toBeCloseTo(300, 0);
  });

  it('migrates chicken_lean + fried to karaage_mune (distinct, lower-fat macro from karaage_momo)', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_lean',
      styleKey: 'fried',
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.attributeKey).toBe('karaage_mune');
    expect(result.confirmMessage).toBe('唐揚げ(むね)として記録します');
    // fried_main default 350 × karaage_mune factor 0.629 = ~220kcal (at default 100g)
    expect(result.baseMacro.kcal).toBeCloseTo(220, 0);
    expect(result.baseMacro.fat).toBeLessThan(10);
  });
});

describe('resolveLog — Pattern A (piece-unit identities with default > 1)', () => {
  // Regression: defaultMacro must be the macro AT amount.default (not per-1-unit).
  // Bug history: yakitori/sashimi/pizza_* were authored as per-unit values, so
  // selecting the default amount yielded 1/N of the correct kcal.

  it('yakitori default (5本) returns 350 kcal', () => {
    const result = resolveLog({ originIdentityId: 'yakitori' });
    expect(result.amountValue).toBe(5);
    expect(result.baseMacro.kcal).toBeCloseTo(350, 1);
    expect(result.baseMacro.protein).toBeCloseTo(32, 1);
    expect(result.baseMacro.fat).toBeCloseTo(16, 1);
    expect(result.baseMacro.carbs).toBeCloseTo(8, 1);
  });

  it('yakitori 1本 scales to 70 kcal (1/5)', () => {
    const result = resolveLog({ originIdentityId: 'yakitori', amountValue: 1 });
    expect(result.baseMacro.kcal).toBeCloseTo(70, 1);
  });

  it('yakitori 10本 scales to 700 kcal (×2)', () => {
    const result = resolveLog({ originIdentityId: 'yakitori', amountValue: 10 });
    expect(result.baseMacro.kcal).toBeCloseTo(700, 1);
  });

  it('sashimi default (5切) returns 250 kcal', () => {
    const result = resolveLog({ originIdentityId: 'sashimi' });
    expect(result.amountValue).toBe(5);
    expect(result.baseMacro.kcal).toBeCloseTo(250, 1);
  });

  it('pizza_simple default (2切) returns 210 kcal', () => {
    const result = resolveLog({ originIdentityId: 'pizza_simple' });
    expect(result.amountValue).toBe(2);
    expect(result.baseMacro.kcal).toBeCloseTo(210, 1);
  });

  it('pizza_meat default (2切) returns 350 kcal', () => {
    const result = resolveLog({ originIdentityId: 'pizza_meat' });
    expect(result.baseMacro.kcal).toBeCloseTo(350, 1);
  });

  it('pizza_cheese default (2切) returns 440 kcal', () => {
    const result = resolveLog({ originIdentityId: 'pizza_cheese' });
    expect(result.baseMacro.kcal).toBeCloseTo(440, 1);
  });

  it('pizza_seafood default (2切) returns 300 kcal', () => {
    const result = resolveLog({ originIdentityId: 'pizza_seafood' });
    expect(result.baseMacro.kcal).toBeCloseTo(300, 1);
  });
});

describe('resolveLog — Add-ons', () => {
  it('adds Identity-flavored add-ons (egg + natto) to a rice base', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      amountValue: 200,
      addons: [
        { refId: 'egg', refType: 'identity', units: 1 },
        { refId: 'natto', refType: 'identity', units: 1 },
      ],
    });

    expect(result.addons).toHaveLength(2);
    // base (rice 200g) ≈ 312 kcal; +egg 75 +natto 80 = 467
    expect(result.totalMacro.kcal).toBeCloseTo(467, 0);
    // protein: 5.1 + 6.2 + 6.6 = 17.9
    expect(result.totalMacro.protein).toBeCloseTo(17.9, 1);
    // fat: 0.7 + 5.2 + 4 = 9.9
    expect(result.totalMacro.fat).toBeCloseTo(9.9, 1);
  });

  it('multiplies addon units (egg ×2)', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      addons: [{ refId: 'egg', refType: 'identity', units: 2 }],
    });

    // rice default 150g = 234 kcal; +egg×2 (75×2=150) = 384
    expect(result.totalMacro.kcal).toBeCloseTo(384, 0);
    expect(result.addons?.[0]?.addedMacro.kcal).toBeCloseTo(150, 0);
  });

  it('handles a pure-Addon reference (mentaiko on rice)', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      addons: [{ refId: 'mentaiko', refType: 'addon', units: 1 }],
    });

    // 234 + 25 = 259
    expect(result.totalMacro.kcal).toBeCloseTo(259, 0);
  });
});

describe('resolveLog — percent unit (Identity migrated from serving)', () => {
  it('udon at 100% (= default) → full macro', () => {
    // After migration, udon is unit:'percent', default:100
    const result = resolveLog({ originIdentityId: 'udon', amountValue: 100 });
    expect(result.amountValue).toBe(100);
    // udon defaultMacro is unchanged; factor = 100/100 = 1
    expect(result.baseMacro).toEqual(getIdentity('udon')!.defaultMacro);
  });

  it('udon at 50% → half macro', () => {
    const result = resolveLog({ originIdentityId: 'udon', amountValue: 50 });
    expect(result.amountValue).toBe(50);
    const def = getIdentity('udon')!.defaultMacro;
    expect(result.baseMacro.kcal).toBeCloseTo(def.kcal * 0.5, 1);
    expect(result.baseMacro.protein).toBeCloseTo(def.protein * 0.5, 1);
  });

  it('udon at 150% (大盛) → 1.5× macro', () => {
    const result = resolveLog({ originIdentityId: 'udon', amountValue: 150 });
    const def = getIdentity('udon')!.defaultMacro;
    expect(result.baseMacro.kcal).toBeCloseTo(def.kcal * 1.5, 1);
  });

  it('udon without amountValue → defaults to 100%', () => {
    const result = resolveLog({ originIdentityId: 'udon' });
    expect(result.amountValue).toBe(100);
  });

  it('protein_drink at 30% (= ~30g protein for a 1食=100g shake)', () => {
    // protein_drink is now percent-based: 1食 = 100%
    const result = resolveLog({ originIdentityId: 'protein_drink', amountValue: 30 });
    expect(result.amountValue).toBe(30);
    const def = getIdentity('protein_drink')!.defaultMacro;
    expect(result.baseMacro.kcal).toBeCloseTo(def.kcal * 0.3, 1);
    expect(result.baseMacro.protein).toBeCloseTo(def.protein * 0.3, 1);
  });
});

describe('Identity master integrity — マクロ定義のバグクラス検出 (IA spec §3.4)', () => {
  // 検査対象は **JP・US の両ロケール × 食材・一皿料理の両タブ**。
  // 2026-09-23 の初版は JP 食材タブしか見ておらず、US の衣の糖質欠落 (2件) と
  // 一皿料理タブの乖離 (6件) を素通りさせていた。
  const ALL_LOCALES: [string, Identity[]][] = [
    ['JP', ALL_IDENTITIES],
    ['US', ALL_US_IDENTITIES],
  ];

  const keyOf = (id: Identity, a?: AttributeOption, s?: StyleOption) =>
    `${id.id}${a ? '/' + a.key : ''}${s ? '[' + s.key + ']' : ''}`;

  // factor は乗算なので、defaultMacro が 0 の軸に factor を書いても 0 のまま何も
  // 起きない。過去に うなぎ蒲焼・厚揚げ・US の Breaded & Fried 2件がこれを踏み、
  // **炭水化物が欠落したまま記録されていた**。加算したいときは macroDelta を使う。
  it('ゼロのベース値に対して factor を掛けている箇所が無い', () => {
    const keys = ['kcal', 'protein', 'fat', 'carbs'] as const;
    const dead: string[] = [];

    for (const [loc, set] of ALL_LOCALES) {
      for (const id of set) {
        const scan = (kind: string, opts: (AttributeOption | StyleOption)[] | undefined) => {
          for (const o of opts ?? []) {
            for (const k of keys) {
              const f = o.factor?.[k];
              // factor: 0 はゼロベースでも結果が 0 で正しい (例: ダイエットソーダ)。
              // 「足したかったのに掛けてしまった」のは 0 でも 1 でもない係数。
              if (f !== undefined && f !== 1 && f !== 0 && id.defaultMacro[k] === 0) {
                dead.push(`[${loc}] ${id.id}.${kind}=${o.key} の ${k}: base=0 × factor=${f} (macroDelta を使うこと)`);
              }
            }
          }
        };
        scan('attr', id.attributes);
        scan('style', id.styles);
      }
    }

    expect(dead).toEqual([]);
  });

  // 「加算されるもの (油・皮・牛乳・たれ・衣) を乗算で書く」と、片方の軸だけが
  // 増えて kcal と PFC が食い違う。2026-09-23 の監査で JP 食材タブ7件を是正した。
  describe('記録される kcal と PFC からの逆算が乖離していない', () => {
    // アルコールの熱量はエタノール (7kcal/g) 由来で PFC から逆算できない。
    // kcal を独立アンカーとするのは**仕様**であり、例外ではない
    // (IA spec v1.5 / US-food-db-design.md §4.1)。
    const KCAL_NOT_FROM_PFC = ['alcohol', 'us_beer', 'us_wine', 'us_cocktail', 'us_hard_seltzer'];

    // 監査時点で既に乖離していた箇所。**是正ではなく凍結**しているだけで、
    // 一皿料理の代表値には意図的な丸めが混ざっている可能性があり1件ずつ判断が要る。
    // 新しい乖離が増えたらこのテストが落ちる (ラチェット)。
    // 追跡: 「PFC↔kcal 乖離の残り18件を精査」タスク
    const KNOWN_DEVIATIONS = new Set([
      // JP 一皿料理タブ
      'ramen_light/shio[no_soup]', 'udon/kitsune', 'maki/maki_thick',
      'fried_main/tonkatsu_hire', 'sashimi/mixed', 'sashimi/maguro_lean',
      // US 食材タブ
      'us_potato/mashed', 'us_potato/fries', 'us_cereal/granola', 'us_shrimp/fried',
      'us_canned_tuna/in_oil', 'us_ground_beef/extra_lean', 'us_bacon_strip/turkey_bacon',
      'us_salmon/smoked', 'us_corn/cooked', 'us_nuts_mixed/cashews',
      'us_cookies/oreo', 'us_smoothie/green',
    ]);

    /** 乖離している (identity, attribute, style) の key を全て返す。 */
    function collectDeviations(): Set<string> {
      const found = new Set<string>();
      for (const [, set] of ALL_LOCALES) {
        for (const id of set) {
          if (KCAL_NOT_FROM_PFC.includes(id.id)) continue;
          const attrs: (AttributeOption | undefined)[] = id.attributes?.length ? id.attributes : [undefined];
          const styles: (StyleOption | undefined)[] = id.styles?.length ? id.styles : [undefined];

          for (const a of attrs) {
            for (const s of styles) {
              // migration 付きは別 Identity へ飛ぶので、そちら側で検査される
              if (a?.migration || s?.migration) continue;
              const m = resolveLog({ originIdentityId: id.id, attributeKey: a?.key, styleKey: s?.key }).baseMacro;
              if (m.kcal < 30) continue; // 極小項目は絶対差が出ないので対象外

              const calc = m.protein * 4 + m.fat * 9 + m.carbs * 4;
              const dev = (m.kcal - calc) / m.kcal;
              if (Math.abs(dev) >= 0.15 && Math.abs(m.kcal - calc) >= 20) found.add(keyOf(id, a, s));
            }
          }
        }
      }
      return found;
    }

    it('新しい乖離が増えていない', () => {
      const added = [...collectDeviations()].filter((k) => !KNOWN_DEVIATIONS.has(k));
      expect(added).toEqual([]);
    });

    it('KNOWN_DEVIATIONS に、もう乖離していない項目が残っていない (リストの腐敗防止)', () => {
      const current = collectDeviations();
      const stale = [...KNOWN_DEVIATIONS].filter((k) => !current.has(k));
      expect(stale).toEqual([]);
    });
  });
});

describe('Identity master integrity (FB1 & FB2 scope)', () => {
  it('udon has tororo in allowed and default add-ons (FB1)', () => {
    const udon = getIdentity('udon')!;
    expect(udon.defaultAddonIds).toContain('tororo');
    expect(udon.allowedAddonIds).toContain('tororo');
  });

  it('udon is on unit:percent with default 100; step defaults to 10 via builder', () => {
    const udon = getIdentity('udon')!;
    expect(udon.amount.unit).toBe('percent');
    expect(udon.amount.default).toBe(100);
    // step is derived by buildIdentityAmountEditConfig (10 for percent unit)
    // — kept off the master data to avoid repeating it on all 32 Identities.
  });

  it('protein_drink is unit:percent', () => {
    const drink = getIdentity('protein_drink')!;
    expect(drink.amount.unit).toBe('percent');
    expect(drink.amount.default).toBe(100);
  });

  it('okonomi is unit:piece (not percent)', () => {
    const okonomi = getIdentity('okonomi')!;
    expect(okonomi.amount.unit).toBe('piece');
  });
});
