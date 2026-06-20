/**
 * Tests for quick-log-history.ts — ①-a ランキングエンジン (rankFrequentSelections)
 * および周辺ロジック (recordSelection / recordDishSelection / deriveDefaultTab)
 *
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test quick-log-history
 */

import {
  castHistoryMap,
  deriveDefaultTab,
  FREQUENT_TAB_MIN_LOGS,
  rankFrequentSelections,
  recordDishSelection,
  recordSelection,
} from './quick-log-history';
import type { QuickLogHistoryMap, QuickLogSelection } from '@/types/quick-log';

// ---------------------------------------------------------------------------
// テスト用ファクトリ
// ---------------------------------------------------------------------------

function makeISO(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function makeSel(
  categoryKey: string,
  subcategoryKey: string,
  daysAgo = 0,
  overrides: Partial<QuickLogSelection> = {},
): QuickLogSelection {
  return {
    categoryKey,
    subcategoryKey,
    amountValue: 100,
    amountUnit: 'g',
    amountLabel: '100g',
    amountCandidateKey: 'default',
    loggedAtISO: makeISO(daysAgo),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// rankFrequentSelections
// ---------------------------------------------------------------------------

describe('rankFrequentSelections — 基本', () => {
  const NOW = new Date().toISOString();

  it('history が undefined/空のとき空配列を返す', () => {
    expect(rankFrequentSelections(undefined, { nowISO: NOW, limit: 9 })).toEqual([]);
    expect(rankFrequentSelections({}, { nowISO: NOW, limit: 9 })).toEqual([]);
  });

  it('1件だけあるとき1件返す', () => {
    const history: QuickLogHistoryMap = {
      lean_protein: [makeSel('lean_protein', 'chicken_breast', 0)],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result).toHaveLength(1);
    expect(result[0].categoryKey).toBe('lean_protein');
    expect(result[0].mode).toBe('ingredient');
  });

  it('limit を超えないよう上位 N 件に切り詰める', () => {
    const history: QuickLogHistoryMap = {};
    for (let i = 0; i < 12; i++) {
      history[`cat_${i}`] = [makeSel(`cat_${i}`, `sub_${i}`, i)];
    }
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 5 });
    expect(result).toHaveLength(5);
  });

  it('スコア降順で並ぶ', () => {
    // cat_a は 3 回、cat_b は 1 回 → cat_a が先頭
    const history: QuickLogHistoryMap = {
      cat_a: [
        makeSel('cat_a', 'sub_a', 0),
        makeSel('cat_a', 'sub_a', 1),
        makeSel('cat_a', 'sub_a', 2),
      ],
      cat_b: [makeSel('cat_b', 'sub_b', 0)],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result[0].categoryKey).toBe('cat_a');
    expect(result[1].categoryKey).toBe('cat_b');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});

describe('rankFrequentSelections — recency 減衰', () => {
  it('同じ頻度なら新しいほうがスコアが高い', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      recent: [makeSel('recent', 'sub', 1)],   // 1日前
      old: [makeSel('old', 'sub', 30)],        // 30日前
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    const recentItem = result.find(r => r.categoryKey === 'recent')!;
    const oldItem = result.find(r => r.categoryKey === 'old')!;
    expect(recentItem.score).toBeGreaterThan(oldItem.score);
  });

  it('半減期 7 日: 7日前のスコアは当日の約 0.5 倍', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      today: [makeSel('today', 'sub', 0)],
      week_ago: [makeSel('week_ago', 'sub', 7)],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    const todayScore = result.find(r => r.categoryKey === 'today')!.score;
    const weekScore = result.find(r => r.categoryKey === 'week_ago')!.score;
    // exp(-ln2/7 * 7) = exp(-ln2) = 0.5
    expect(weekScore / todayScore).toBeCloseTo(0.5, 1);
  });

  it('頻度が多ければ古くても上位に来る（頻度 × 減衰の総和）', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      // heavy: 10回ログ (0〜9日前)
      heavy: Array.from({ length: 10 }, (_, i) => makeSel('heavy', 'sub', i)),
      // fresh: 1回ログ (今日)
      fresh: [makeSel('fresh', 'sub', 0)],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result[0].categoryKey).toBe('heavy');
  });
});

describe('rankFrequentSelections — シグネチャ集計（同一アイテムの重複カウント）', () => {
  it('同じ subcategoryKey の複数エントリはスコアが加算される', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      lean_protein: [
        makeSel('lean_protein', 'chicken_breast', 0),
        makeSel('lean_protein', 'chicken_breast', 1),
        makeSel('lean_protein', 'chicken_breast', 2),
      ],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    // 同じ subcategory なので 1 アイテムにまとめられる
    expect(result).toHaveLength(1);
    // スコアは 3 回分の減衰和 (> 1)
    expect(result[0].score).toBeGreaterThan(1);
  });

  it('異なる subcategoryKey は別アイテムとして扱われる', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      lean_protein: [
        makeSel('lean_protein', 'chicken_breast', 0),
        makeSel('lean_protein', 'white_fish', 0),
      ],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result).toHaveLength(2);
  });

  it('attrKey が異なれば別アイテムとして扱われる', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      meat: [
        makeSel('meat', 'pork', 0, { attrKey: 'plain' }),
        makeSel('meat', 'pork', 0, { attrKey: 'oil' }),
      ],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result).toHaveLength(2);
  });
});

describe('rankFrequentSelections — dish cross-category', () => {
  it('dish キー (dish:xxx) を ingredient と区別してランキングに含める', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      lean_protein: [makeSel('lean_protein', 'chicken_breast', 0)],
      'dish:ramen': [
        {
          ...makeSel('ramen', 'ramen_light', 0),
          mode: 'dish' as const,
        },
      ],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    expect(result).toHaveLength(2);

    const dishItem = result.find(r => r.mode === 'dish');
    const ingredientItem = result.find(r => r.mode === 'ingredient');
    expect(dishItem).toBeDefined();
    expect(ingredientItem).toBeDefined();
    expect(dishItem!.categoryKey).toBe('ramen');
    expect(dishItem!.draft).toBeNull(); // dish は draft を持たない
  });

  it('dish と ingredient が混在してもスコア順で正しく並ぶ', () => {
    const NOW = new Date().toISOString();
    const history: QuickLogHistoryMap = {
      lean_protein: [
        makeSel('lean_protein', 'chicken_breast', 0),
        makeSel('lean_protein', 'chicken_breast', 1),
      ],
      'dish:curry': [
        { ...makeSel('curry', 'curry_class', 0), mode: 'dish' as const },
      ],
    };
    const result = rankFrequentSelections(history, { nowISO: NOW, limit: 9 });
    // lean_protein は 2 回ログ → curry より上
    expect(result[0].categoryKey).toBe('lean_protein');
    expect(result[0].mode).toBe('ingredient');
  });
});

// ---------------------------------------------------------------------------
// recordDishSelection
// ---------------------------------------------------------------------------

describe('recordDishSelection', () => {
  it('dish: プレフィックスのキーで history に追記する', () => {
    const result = recordDishSelection(undefined, 'curry', 'curry_class', '普通');
    expect(result['dish:curry']).toHaveLength(1);
    expect(result['dish:curry'][0].mode).toBe('dish');
    expect(result['dish:curry'][0].subcategoryKey).toBe('curry_class');
    expect(result['dish:curry'][0].amountLabel).toBe('普通');
  });

  it('既存 history に追記する（最新が先頭）', () => {
    const existing = recordDishSelection(undefined, 'curry', 'curry_class', '普通');
    const next = recordDishSelection(existing, 'curry', 'katsu_curry', '大盛');
    expect(next['dish:curry']).toHaveLength(2);
    expect(next['dish:curry'][0].subcategoryKey).toBe('katsu_curry'); // 最新が先頭
  });

  it('ingredient キーには影響しない', () => {
    const withIngredient: QuickLogHistoryMap = {
      lean_protein: [makeSel('lean_protein', 'chicken_breast', 0)],
    };
    const result = recordDishSelection(withIngredient, 'ramen', 'ramen_light', '普通');
    expect(result['lean_protein']).toHaveLength(1); // 既存は変わらない
    expect(result['dish:ramen']).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// recordSelection — key 引数
// ---------------------------------------------------------------------------

describe('recordSelection — key 引数', () => {
  it('key 省略時は sel.categoryKey をマップキーに使う', () => {
    const sel = makeSel('lean_protein', 'chicken_breast', 0);
    const result = recordSelection(undefined, sel);
    expect(result['lean_protein']).toHaveLength(1);
  });

  it('key 指定時はそちらをマップキーに使う', () => {
    const sel = makeSel('ramen', 'ramen_light', 0);
    const result = recordSelection(undefined, sel, 'dish:ramen');
    expect(result['dish:ramen']).toHaveLength(1);
    expect(result['ramen']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// castHistoryMap — mode フィールドの保持
// ---------------------------------------------------------------------------

describe('castHistoryMap — mode フィールド', () => {
  it('mode が未設定の旧エントリを弾かずに読み込む', () => {
    const raw = {
      lean_protein: [
        {
          categoryKey: 'lean_protein',
          subcategoryKey: 'chicken_breast',
          amountValue: 100,
          amountUnit: 'g',
          loggedAtISO: makeISO(0),
        },
      ],
    };
    const result = castHistoryMap(raw);
    expect(result['lean_protein']).toHaveLength(1);
    expect(result['lean_protein'][0].mode).toBeUndefined();
  });

  it('mode: dish のエントリを保持する', () => {
    const raw = {
      'dish:curry': [
        {
          categoryKey: 'curry',
          subcategoryKey: 'curry_class',
          amountValue: 1,
          amountUnit: 'piece',
          loggedAtISO: makeISO(0),
          mode: 'dish',
        },
      ],
    };
    const result = castHistoryMap(raw);
    expect(result['dish:curry'][0].mode).toBe('dish');
  });

  it('不正な mode 値は undefined に落とす', () => {
    const raw = {
      lean_protein: [
        {
          categoryKey: 'lean_protein',
          subcategoryKey: 'chicken_breast',
          amountValue: 100,
          amountUnit: 'g',
          loggedAtISO: makeISO(0),
          mode: 'invalid_mode', // 不正値
        },
      ],
    };
    const result = castHistoryMap(raw);
    expect(result['lean_protein'][0].mode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deriveDefaultTab
// ---------------------------------------------------------------------------

describe('deriveDefaultTab', () => {
  it('history が undefined/空のとき ingredient を返す', () => {
    expect(deriveDefaultTab(undefined)).toBe('ingredient');
    expect(deriveDefaultTab({})).toBe('ingredient');
  });

  it(`ログ数が ${FREQUENT_TAB_MIN_LOGS} 未満のとき ingredient を返す`, () => {
    const history: QuickLogHistoryMap = {
      lean_protein: Array.from({ length: FREQUENT_TAB_MIN_LOGS - 1 }, (_, i) =>
        makeSel('lean_protein', 'chicken_breast', i),
      ),
    };
    expect(deriveDefaultTab(history)).toBe('ingredient');
  });

  it(`ログ数が ${FREQUENT_TAB_MIN_LOGS} 以上のとき frequent を返す（dish が圧倒的多数でなければ）`, () => {
    const history: QuickLogHistoryMap = {
      lean_protein: Array.from({ length: FREQUENT_TAB_MIN_LOGS }, (_, i) =>
        makeSel('lean_protein', 'chicken_breast', i),
      ),
    };
    expect(deriveDefaultTab(history)).toBe('frequent');
  });

  it('dish ログが ingredient の 2 倍超のとき dish を返す', () => {
    const history: QuickLogHistoryMap = {
      lean_protein: Array.from({ length: 3 }, (_, i) =>
        makeSel('lean_protein', 'chicken_breast', i),
      ),
      'dish:ramen': Array.from({ length: 9 }, (_, i) => ({
        ...makeSel('ramen', 'ramen_light', i),
        mode: 'dish' as const,
      })),
    };
    // dish(9) > ingredient(3) * 2 → dish
    expect(deriveDefaultTab(history)).toBe('dish');
  });

  it('dish がちょうど ingredient の 2 倍以下なら frequent を返す', () => {
    const history: QuickLogHistoryMap = {
      lean_protein: Array.from({ length: 5 }, (_, i) =>
        makeSel('lean_protein', 'chicken_breast', i),
      ),
      'dish:ramen': Array.from({ length: 8 }, (_, i) => ({
        ...makeSel('ramen', 'ramen_light', i),
        mode: 'dish' as const,
      })),
    };
    // dish(8) <= ingredient(5) * 2(=10) → frequent
    expect(deriveDefaultTab(history)).toBe('frequent');
  });
});
