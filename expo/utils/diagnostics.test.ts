/**
 * Tests for diagnostics.ts — KPI計装 Layer 1 の純ロジック。
 *
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test diagnostics
 */

import {
  bumpDiagnosticCounter,
  castDiagnostics,
  emptyDiagnostics,
  MAX_SEARCH_MISSES,
  MIN_MISS_QUERY_LENGTH,
  recordSearchMiss,
  sortedSearchMisses,
} from './diagnostics';

const NOW = '2026-08-03T12:00:00.000Z';

function isoDaysAgo(n: number): string {
  return new Date(Date.parse(NOW) - n * 86_400_000).toISOString();
}

// ---------------------------------------------------------------------------
// recordSearchMiss
// ---------------------------------------------------------------------------

describe('recordSearchMiss — 基本', () => {
  it('undefined から1件記録できる', () => {
    const d = recordSearchMiss(undefined, 'アボカド', false, NOW);
    expect(d.searchMisses).toHaveLength(1);
    expect(d.searchMisses[0]).toEqual({
      q: 'アボカド',
      count: 1,
      lastAtISO: NOW,
      hadHints: false,
    });
  });

  it('前後の空白を trim して記録する', () => {
    const d = recordSearchMiss(undefined, '  アボカド  ', false, NOW);
    expect(d.searchMisses[0].q).toBe('アボカド');
  });

  it('カウンタ系フィールドは変化しない', () => {
    const base = bumpDiagnosticCounter(undefined, 'searchOpenCount', 3);
    const d = recordSearchMiss(base, 'アボカド', false, NOW);
    expect(d.searchOpenCount).toBe(3);
  });
});

describe('recordSearchMiss — 短すぎるクエリの除外', () => {
  it(`${MIN_MISS_QUERY_LENGTH}文字未満は記録しない`, () => {
    const d = recordSearchMiss(undefined, 'あ', false, NOW);
    expect(d.searchMisses).toHaveLength(0);
  });

  it('空文字・空白のみは記録しない', () => {
    expect(recordSearchMiss(undefined, '', false, NOW).searchMisses).toHaveLength(0);
    expect(recordSearchMiss(undefined, '   ', false, NOW).searchMisses).toHaveLength(0);
  });

  it('除外時は入力データをそのまま返す (カウンタを壊さない)', () => {
    const base = bumpDiagnosticCounter(undefined, 'widgetLogCount', 5);
    const d = recordSearchMiss(base, 'あ', false, NOW);
    expect(d.widgetLogCount).toBe(5);
    expect(d.searchMisses).toHaveLength(0);
  });
});

describe('recordSearchMiss — 同一クエリの集約', () => {
  it('同じクエリは count を加算し、エントリは増えない', () => {
    let d = recordSearchMiss(undefined, 'アボカド', false, isoDaysAgo(2));
    d = recordSearchMiss(d, 'アボカド', false, isoDaysAgo(1));
    d = recordSearchMiss(d, 'アボカド', false, NOW);
    expect(d.searchMisses).toHaveLength(1);
    expect(d.searchMisses[0].count).toBe(3);
  });

  it('集約時に lastAtISO を最新へ更新する', () => {
    let d = recordSearchMiss(undefined, 'アボカド', false, isoDaysAgo(5));
    d = recordSearchMiss(d, 'アボカド', false, NOW);
    expect(d.searchMisses[0].lastAtISO).toBe(NOW);
  });

  it('hadHints は後勝ちで上書きされる', () => {
    let d = recordSearchMiss(undefined, 'アボカド', false, isoDaysAgo(1));
    expect(d.searchMisses[0].hadHints).toBe(false);
    d = recordSearchMiss(d, 'アボカド', true, NOW);
    expect(d.searchMisses[0].hadHints).toBe(true);
  });

  it('異なるクエリは別エントリになる', () => {
    let d = recordSearchMiss(undefined, 'アボカド', false, NOW);
    d = recordSearchMiss(d, 'ドラゴンフルーツ', false, NOW);
    expect(d.searchMisses).toHaveLength(2);
  });
});

describe('recordSearchMiss — 上限', () => {
  it(`${MAX_SEARCH_MISSES}件を超えない`, () => {
    let d = emptyDiagnostics();
    for (let i = 0; i < MAX_SEARCH_MISSES + 20; i++) {
      d = recordSearchMiss(d, `query_${i}`, false, isoDaysAgo(MAX_SEARCH_MISSES + 20 - i));
    }
    expect(d.searchMisses).toHaveLength(MAX_SEARCH_MISSES);
  });

  it('上限超過時は最終発生が最も古いものを捨てる', () => {
    let d = emptyDiagnostics();
    // 最も古い = oldest_one (100日前)
    d = recordSearchMiss(d, 'oldest_one', false, isoDaysAgo(100));
    for (let i = 0; i < MAX_SEARCH_MISSES - 1; i++) {
      d = recordSearchMiss(d, `q_${i}`, false, isoDaysAgo(10));
    }
    expect(d.searchMisses).toHaveLength(MAX_SEARCH_MISSES);
    expect(d.searchMisses.some((m) => m.q === 'oldest_one')).toBe(true);

    // ここで1件追加 → oldest_one が押し出される
    d = recordSearchMiss(d, 'brand_new', false, NOW);
    expect(d.searchMisses).toHaveLength(MAX_SEARCH_MISSES);
    expect(d.searchMisses.some((m) => m.q === 'oldest_one')).toBe(false);
    expect(d.searchMisses.some((m) => m.q === 'brand_new')).toBe(true);
  });

  it('既存クエリの再記録では上限判定が走らない (件数不変)', () => {
    let d = emptyDiagnostics();
    for (let i = 0; i < MAX_SEARCH_MISSES; i++) {
      d = recordSearchMiss(d, `q_${i}`, false, isoDaysAgo(1));
    }
    d = recordSearchMiss(d, 'q_0', false, NOW);
    expect(d.searchMisses).toHaveLength(MAX_SEARCH_MISSES);
    expect(d.searchMisses.find((m) => m.q === 'q_0')!.count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// bumpDiagnosticCounter
// ---------------------------------------------------------------------------

describe('bumpDiagnosticCounter', () => {
  it('undefined から 0 起点で +1 する', () => {
    expect(bumpDiagnosticCounter(undefined, 'searchOpenCount').searchOpenCount).toBe(1);
  });

  it('対象キーだけを増やす (他は不変)', () => {
    let d = bumpDiagnosticCounter(undefined, 'searchOpenCount', 3);
    d = bumpDiagnosticCounter(d, 'widgetLogCount', 2);
    expect(d.searchOpenCount).toBe(3);
    expect(d.widgetLogCount).toBe(2);
    expect(d.directInputOpenCount).toBe(0);
  });

  it('by で任意の増分を指定できる', () => {
    expect(bumpDiagnosticCounter(undefined, 'widgetLogCount', 5).widgetLogCount).toBe(5);
  });

  it('searchMisses を壊さない', () => {
    const base = recordSearchMiss(undefined, 'アボカド', false, NOW);
    const d = bumpDiagnosticCounter(base, 'searchOpenCount');
    expect(d.searchMisses).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// castDiagnostics
// ---------------------------------------------------------------------------

describe('castDiagnostics', () => {
  it('undefined / null / 非オブジェクトは空データを返す', () => {
    expect(castDiagnostics(undefined)).toEqual(emptyDiagnostics());
    expect(castDiagnostics(null)).toEqual(emptyDiagnostics());
    expect(castDiagnostics('nope')).toEqual(emptyDiagnostics());
    expect(castDiagnostics(42)).toEqual(emptyDiagnostics());
  });

  it('正常な永続データを復元する', () => {
    const raw = {
      searchMisses: [{ q: 'アボカド', count: 3, lastAtISO: NOW, hadHints: true }],
      searchOpenCount: 10,
      directInputOpenCount: 2,
      widgetLogCount: 7,
    };
    expect(castDiagnostics(raw)).toEqual(raw);
  });

  it('不正な miss エントリを捨てる', () => {
    const raw = {
      searchMisses: [
        { q: 'ok', count: 1, lastAtISO: NOW, hadHints: false },
        { q: '', count: 1, lastAtISO: NOW },              // 空クエリ
        { q: 'no_count', lastAtISO: NOW },                 // count 欠損
        { q: 'bad_count', count: NaN, lastAtISO: NOW },    // NaN
        { q: 'no_iso', count: 1 },                         // lastAtISO 欠損
        null,
        'string',
      ],
    };
    const d = castDiagnostics(raw);
    expect(d.searchMisses).toHaveLength(1);
    expect(d.searchMisses[0].q).toBe('ok');
  });

  it('hadHints 未設定は false に落とす', () => {
    const d = castDiagnostics({
      searchMisses: [{ q: 'x', count: 1, lastAtISO: NOW }],
    });
    expect(d.searchMisses[0].hadHints).toBe(false);
  });

  it('負値・NaN・非数のカウンタは 0 に落とす', () => {
    const d = castDiagnostics({
      searchOpenCount: -5,
      directInputOpenCount: NaN,
      widgetLogCount: 'many',
    });
    expect(d.searchOpenCount).toBe(0);
    expect(d.directInputOpenCount).toBe(0);
    expect(d.widgetLogCount).toBe(0);
  });

  it('searchMisses が配列でないとき空配列にする', () => {
    expect(castDiagnostics({ searchMisses: 'nope' }).searchMisses).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sortedSearchMisses
// ---------------------------------------------------------------------------

describe('sortedSearchMisses', () => {
  it('undefined のとき空配列', () => {
    expect(sortedSearchMisses(undefined)).toEqual([]);
  });

  it('回数降順で並ぶ', () => {
    let d = emptyDiagnostics();
    d = recordSearchMiss(d, 'once', false, NOW);
    d = recordSearchMiss(d, 'thrice', false, NOW);
    d = recordSearchMiss(d, 'thrice', false, NOW);
    d = recordSearchMiss(d, 'thrice', false, NOW);
    const sorted = sortedSearchMisses(d);
    expect(sorted[0].q).toBe('thrice');
    expect(sorted[1].q).toBe('once');
  });

  it('同数なら最終発生が新しい順', () => {
    let d = emptyDiagnostics();
    d = recordSearchMiss(d, 'older', false, isoDaysAgo(3));
    d = recordSearchMiss(d, 'newer', false, NOW);
    const sorted = sortedSearchMisses(d);
    expect(sorted[0].q).toBe('newer');
  });

  it('元データを破壊しない', () => {
    let d = emptyDiagnostics();
    d = recordSearchMiss(d, 'a', false, isoDaysAgo(1));
    d = recordSearchMiss(d, 'b', false, NOW);
    d = recordSearchMiss(d, 'b', false, NOW);
    const before = [...d.searchMisses].map((m) => m.q);
    sortedSearchMisses(d);
    expect(d.searchMisses.map((m) => m.q)).toEqual(before);
  });
});
