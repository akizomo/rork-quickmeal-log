/**
 * diagnostics.ts — KPI計装 Layer 1 の純ロジック。
 *
 * 端末内に貯める診断データの読み書きを担う。副作用なし・テスト容易。
 * 永続化は呼び出し側 (app-state-provider) が settings 経由で行う。
 *
 * 詳細は docs/ROADMAP.md §3.0「次の一手: KPI計装」。
 */

import type { DiagnosticsData, SearchMissEntry } from '@/types/diagnostics';

/** 保持する未ヒットクエリの上限。超えたら最終発生が最も古いものから捨てる。 */
export const MAX_SEARCH_MISSES = 100;

/**
 * 記録対象とする最小クエリ長。
 * 1文字は打鍵途中のノイズが大半なので捨てる。
 */
export const MIN_MISS_QUERY_LENGTH = 2;

export function emptyDiagnostics(): DiagnosticsData {
  return {
    searchMisses: [],
    searchOpenCount: 0,
    directInputOpenCount: 0,
    widgetLogCount: 0,
  };
}

/**
 * 未ヒットクエリを1件記録する。同一クエリ (trim 後の完全一致) は集約して
 * count を加算し、lastAtISO を更新する。
 *
 * `hadHints` は後勝ちで上書きする (直近の状態を正とする)。
 *
 * @returns 新しい DiagnosticsData。記録対象外なら入力をそのまま返す。
 */
export function recordSearchMiss(
  data: DiagnosticsData | undefined,
  rawQuery: string,
  hadHints: boolean,
  nowISO: string,
): DiagnosticsData {
  const base = data ?? emptyDiagnostics();
  const q = rawQuery.trim();
  if (q.length < MIN_MISS_QUERY_LENGTH) return base;

  const existing = base.searchMisses.find((m) => m.q === q);
  let next: SearchMissEntry[];

  if (existing) {
    next = base.searchMisses.map((m) =>
      m.q === q ? { ...m, count: m.count + 1, lastAtISO: nowISO, hadHints } : m,
    );
  } else {
    next = [...base.searchMisses, { q, count: 1, lastAtISO: nowISO, hadHints }];
    if (next.length > MAX_SEARCH_MISSES) {
      // 最終発生が最も古いものを1件落とす
      let oldestIdx = 0;
      for (let i = 1; i < next.length; i++) {
        if (next[i].lastAtISO < next[oldestIdx].lastAtISO) oldestIdx = i;
      }
      next = next.filter((_, i) => i !== oldestIdx);
    }
  }

  return { ...base, searchMisses: next };
}

/** カウンタ系フィールドを +1 する。 */
export function bumpDiagnosticCounter(
  data: DiagnosticsData | undefined,
  key: 'searchOpenCount' | 'directInputOpenCount' | 'widgetLogCount',
  by = 1,
): DiagnosticsData {
  const base = data ?? emptyDiagnostics();
  return { ...base, [key]: base[key] + by };
}

/**
 * 永続化された緩い型の値を DiagnosticsData に整える。
 * 不正なエントリは黙って捨てる (旧バージョン・手書き JSON への耐性)。
 */
export function castDiagnostics(input: unknown): DiagnosticsData {
  const base = emptyDiagnostics();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Record<string, unknown>;

  const misses: SearchMissEntry[] = [];
  if (Array.isArray(raw.searchMisses)) {
    for (const item of raw.searchMisses) {
      if (!item || typeof item !== 'object') continue;
      const m = item as Record<string, unknown>;
      if (typeof m.q !== 'string' || m.q.length === 0) continue;
      if (typeof m.count !== 'number' || !Number.isFinite(m.count)) continue;
      if (typeof m.lastAtISO !== 'string') continue;
      misses.push({
        q: m.q,
        count: m.count,
        lastAtISO: m.lastAtISO,
        hadHints: m.hadHints === true,
      });
    }
  }

  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;

  return {
    searchMisses: misses.slice(0, MAX_SEARCH_MISSES),
    searchOpenCount: num(raw.searchOpenCount),
    directInputOpenCount: num(raw.directInputOpenCount),
    widgetLogCount: num(raw.widgetLogCount),
  };
}

/**
 * 未ヒットクエリを「回数降順 → 最終発生の新しい順」で並べ替えて返す。
 * 診断画面の表示と DB拡張の優先度検討に使う。
 */
export function sortedSearchMisses(data: DiagnosticsData | undefined): SearchMissEntry[] {
  if (!data) return [];
  return [...data.searchMisses].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastAtISO.localeCompare(a.lastAtISO);
  });
}

/**
 * 共有用の本文を作る (ユーザーが「共有する」を押したときだけ使う)。
 *
 * **含めるのは、検索で見つからなかった言葉と回数だけ。** 食事の記録・体重・設定など、個人を特定しうる
 * ものは一切含めない。ユーザーが実際に打った文字列なので、画面にも同じ内容を見せてから共有させる。
 */
export function buildSearchMissShareText(data: DiagnosticsData | undefined, dateISO: string): string {
  const misses = sortedSearchMisses(data);
  const lines = misses.map((m) => `${m.count}\t${m.q}`);
  return [`Hachibu search-misses ${dateISO.slice(0, 10)}`, 'count\tword', ...lines].join('\n');
}
