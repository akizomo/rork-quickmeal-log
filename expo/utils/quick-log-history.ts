import {
  getDefaultAmountCandidate,
  getQuickLogCategory,
  getQuickLogSubcategory,
} from '@/constants/quick-log-master';
import {
  IngredientQuickDraft,
  QuickLogCategoryDef,
  QuickLogHistoryMap,
  QuickLogSelection,
  QuickLogSubcategory,
  QuickLogTabKey,
  RankedLogItem,
} from '@/types/quick-log';

export const HISTORY_PER_CATEGORY_LIMIT = 50;

/**
 * Append a new selection to the history map. Most recent first; capped per category.
 * @param key 明示的なマップキー。省略時は sel.categoryKey を使用。
 *            dish は `dish:${categoryKey}` 形式で呼び出す。
 */
export function recordSelection(
  history: QuickLogHistoryMap | undefined,
  sel: QuickLogSelection,
  key?: string,
): QuickLogHistoryMap {
  const mapKey = key ?? sel.categoryKey;
  const next: QuickLogHistoryMap = { ...(history ?? {}) };
  const list = next[mapKey] ?? [];
  next[mapKey] = [sel, ...list].slice(0, HISTORY_PER_CATEGORY_LIMIT);
  return next;
}

/**
 * dish タブの短押し/長押し確定時に履歴へ記録する。
 * ingredient の recordSelection と対になる dish 専用ヘルパー。
 */
export function recordDishSelection(
  history: QuickLogHistoryMap | undefined,
  categoryKey: string,
  subcategoryKey: string,
  amountLabel: string,
): QuickLogHistoryMap {
  const sel: QuickLogSelection = {
    mode: 'dish',
    categoryKey,
    subcategoryKey,
    amountValue: 1,
    amountUnit: 'piece',
    amountLabel,
    loggedAtISO: new Date().toISOString(),
  };
  return recordSelection(history, sel, `dish:${categoryKey}`);
}

/**
 * Cast loosely-typed persisted history (stored as `Record<string, unknown[]>` in
 * AppSettings) into the typed `QuickLogHistoryMap` shape. Filters out malformed
 * entries defensively.
 */
export function castHistoryMap(input: unknown): QuickLogHistoryMap {
  if (!input || typeof input !== 'object') return {};
  const out: QuickLogHistoryMap = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const list: QuickLogSelection[] = [];
    for (const item of v) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as QuickLogSelection).categoryKey === 'string' &&
        typeof (item as QuickLogSelection).subcategoryKey === 'string' &&
        typeof (item as QuickLogSelection).amountValue === 'number' &&
        typeof (item as QuickLogSelection).amountUnit === 'string'
      ) {
        const raw = item as Record<string, unknown>;
        // v1.8+: mode フィールドを保持（不正値は除去・未設定の旧エントリは undefined のまま）
        const rawMode = raw.mode;
        const validMode: 'ingredient' | 'dish' | undefined =
          rawMode === 'dish' ? 'dish' : rawMode === 'ingredient' ? 'ingredient' : undefined;
        // rawMode が不正値でも spread で混入しないよう mode を明示的に上書きする
        const { mode: _discard, ...rest } = raw as unknown as QuickLogSelection;
        const entry: QuickLogSelection = validMode !== undefined
          ? { ...rest, mode: validMode }
          : { ...rest };
        list.push(entry);
      }
    }
    if (list.length > 0) out[k] = list;
  }
  return out;
}

interface FrequencyEntry {
  selection: QuickLogSelection;
  count: number;
}

function selectionSignature(sel: QuickLogSelection): string {
  return [
    sel.subcategoryKey,
    sel.attrKey ?? '',
    sel.partKey ?? '',
    sel.methodKey ?? '',
    sel.amountCandidateKey ?? '',
  ].join('|');
}

function findMostFrequent(list: QuickLogSelection[]): QuickLogSelection | undefined {
  if (list.length === 0) return undefined;
  const map = new Map<string, FrequencyEntry>();
  for (const sel of list) {
    const sig = selectionSignature(sel);
    const entry = map.get(sig);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(sig, { selection: sel, count: 1 });
    }
  }
  let best: FrequencyEntry | undefined;
  for (const entry of map.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.selection;
}

/**
 * Build the system-default draft for a category (no history available).
 * Picks the first subcategory and its default amount, applying the
 * subcategory's default detail keys (or first option as fallback).
 */
export function buildSystemDefaultDraft(
  category: QuickLogCategoryDef
): IngredientQuickDraft {
  const sub = category.subcategories[0];
  return draftForSubcategory(category.key, sub);
}

export function draftForSubcategory(
  categoryKey: string,
  sub: QuickLogSubcategory
): IngredientQuickDraft {
  const amount = getDefaultAmountCandidate(sub);
  const draft: IngredientQuickDraft = {
    categoryKey,
    subcategoryKey: sub.key,
    amountValue: amount.amount,
    amountUnit: amount.unit,
    amountLabel: amount.label,
    amountCandidateKey: amount.key,
  };
  if (sub.detailUi === 'attribute') {
    draft.attrKey = sub.defaultAttributeKey ?? sub.attributes?.[0]?.key;
  } else if (sub.detailUi === 'part') {
    draft.partKey = sub.defaultPartKey ?? sub.parts?.[0]?.key;
  } else if (sub.detailUi === 'method') {
    draft.methodKey = sub.defaultMethodKey ?? sub.methods?.[0]?.key;
  } else if (sub.detailUi === 'part_method') {
    draft.partKey = sub.defaultPartKey ?? sub.parts?.[0]?.key;
    draft.methodKey = sub.defaultMethodKey ?? sub.methods?.[0]?.key;
  }
  return draft;
}

function draftFromSelection(
  category: QuickLogCategoryDef,
  sel: QuickLogSelection
): IngredientQuickDraft | null {
  const sub = category.subcategories.find((s) => s.key === sel.subcategoryKey);
  if (!sub) return null;
  // Start from a fresh subcategory default, then overlay the historic selection.
  const base = draftForSubcategory(category.key, sub);
  const draft: IngredientQuickDraft = { ...base };
  if (sub.detailUi === 'attribute' && sel.attrKey && sub.attributes?.some((a) => a.key === sel.attrKey)) {
    draft.attrKey = sel.attrKey;
  }
  if (
    (sub.detailUi === 'part' || sub.detailUi === 'part_method') &&
    sel.partKey &&
    sub.parts?.some((p) => p.key === sel.partKey)
  ) {
    draft.partKey = sel.partKey;
  }
  if (
    (sub.detailUi === 'method' || sub.detailUi === 'part_method') &&
    sel.methodKey &&
    sub.methods?.some((m) => m.key === sel.methodKey)
  ) {
    draft.methodKey = sel.methodKey;
  }
  draft.amountValue = sel.amountValue;
  draft.amountUnit = sel.amountUnit;
  draft.amountLabel = sel.amountLabel;
  draft.amountCandidateKey = sel.amountCandidateKey;
  return draft;
}

/**
 * Pick the initial draft for opening the long-press sheet.
 * Priority: most recent → most frequent → system default.
 */
export function pickInitialDraft(
  history: QuickLogHistoryMap | undefined,
  categoryKey: string
): IngredientQuickDraft | null {
  const category = getQuickLogCategory(categoryKey);
  if (!category) return null;
  const list = history?.[categoryKey] ?? [];

  // 1. Most recent
  for (const sel of list) {
    const draft = draftFromSelection(category, sel);
    if (draft) return draft;
  }
  // 2. Most frequent (skipped if list is empty — buildSystemDefault below)
  const top = findMostFrequent(list);
  if (top) {
    const draft = draftFromSelection(category, top);
    if (draft) return draft;
  }
  // 3. System default
  return buildSystemDefaultDraft(category);
}

// ---------------------------------------------------------------------------
// ①-a ランキングエンジン
// ---------------------------------------------------------------------------

/**
 * 頻度 × recency 減衰スコア。
 * 半減期 7 日: λ = ln(2) / 7
 * score = Σ exp(-λ × daysAgo) for each occurrence
 */
const DECAY_LAMBDA = Math.LN2 / 7;

function decayScore(loggedAtISO: string, nowMs: number): number {
  const daysAgo = (nowMs - new Date(loggedAtISO).getTime()) / 86_400_000;
  return Math.exp(-DECAY_LAMBDA * Math.max(0, daysAgo));
}

/**
 * ⭐️ タブ用。history 全体 (ingredient + dish) を横断して
 * 頻度 × recency 減衰スコアで上位 limit 件を返す。
 *
 * @param nowISO  現在時刻 ISO 文字列。Date.now() の代わりに引数で受け取る (テスト容易性)。
 */
export function rankFrequentSelections(
  history: QuickLogHistoryMap | undefined,
  opts: { nowISO: string; limit: number },
): RankedLogItem[] {
  if (!history) return [];

  const nowMs = new Date(opts.nowISO).getTime();
  // key = `${mapKey}::${signature}` → スコア集計
  const scoreMap = new Map<string, { item: Omit<RankedLogItem, 'score'>; score: number }>();

  for (const [mapKey, selections] of Object.entries(history)) {
    const isDish = mapKey.startsWith('dish:');
    const mode = isDish ? 'dish' : 'ingredient' as const;
    const categoryKey = isDish ? mapKey.slice(5) : mapKey;

    for (const sel of selections) {
      const sig = selectionSignature(sel);
      const key = `${mapKey}::${sig}`;
      const score = decayScore(sel.loggedAtISO, nowMs);

      const existing = scoreMap.get(key);
      if (existing) {
        existing.score += score;
        continue;
      }

      const item = buildRankedItem(mode, categoryKey, sel);
      scoreMap.set(key, { item, score });
    }
  }

  return [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit)
    .map(({ item, score }) => ({ ...item, score }));
}

/**
 * RankedLogItem を QuickLogSelection + mode + categoryKey から構築する。
 * カテゴリ/サブカテゴリが master に存在しない場合 (stale データ) も
 * null を返さず、フォールバックラベルで最低限のアイテムを返す。
 * draft が null のアイテムは ⭐️ からタップしたとき quickLog(categoryKey) の
 * 通常パスにフォールバックする。
 */
function buildRankedItem(
  mode: 'ingredient' | 'dish',
  categoryKey: string,
  sel: QuickLogSelection,
): Omit<RankedLogItem, 'score'> {
  const amountLabel = sel.amountLabel ?? `${sel.amountValue}${sel.amountUnit}`;

  if (mode === 'dish') {
    return {
      mode,
      categoryKey,
      label: sel.subcategoryKey,  // 呼び出し側で Identity label に解決
      amountLabel,
      draft: null,
    };
  }

  // ingredient: master が見つかれば draft を構築、なければフォールバック
  const category = getQuickLogCategory(categoryKey);
  if (!category) {
    return { mode, categoryKey, label: categoryKey, amountLabel, draft: null };
  }
  const draft = draftFromSelection(category, sel);
  const sub = category.subcategories.find(s => s.key === sel.subcategoryKey);
  return {
    mode,
    categoryKey,
    label: sub?.label ?? category.label,
    amountLabel,
    draft,  // subcategory 不明なら null (draftFromSelection が null を返す)
  };
}

// ---------------------------------------------------------------------------
// デフォルトタブ導出
// ---------------------------------------------------------------------------

/** ⭐️ タブが出現するのに必要なログ数 */
export const FREQUENT_TAB_MIN_LOGS = 5;

/**
 * 直近の history エントリ数からデフォルトタブを導出する。
 *
 * - ログ < FREQUENT_TAB_MIN_LOGS: ingredient/dish の多い方
 * - ログ >= FREQUENT_TAB_MIN_LOGS: ⭐️ タブを優先 (最も使われるパスが最速)
 *   ただし直近 30 件で dish 記録が ingredient の 2 倍以上なら dish を返す
 *   (⭐️ に慣れていないうちは dish ユーザーが使いやすい方を出す)
 */
export function deriveDefaultTab(
  history: QuickLogHistoryMap | undefined,
): QuickLogTabKey {
  if (!history) return 'ingredient';

  let ingredientCount = 0;
  let dishCount = 0;
  let total = 0;

  for (const [mapKey, selections] of Object.entries(history)) {
    const isDish = mapKey.startsWith('dish:');
    const count = Math.min(selections.length, 30); // 直近 30 件で判断
    total += count;
    if (isDish) dishCount += count;
    else ingredientCount += count;
  }

  if (total < FREQUENT_TAB_MIN_LOGS) {
    return dishCount > ingredientCount ? 'dish' : 'ingredient';
  }

  // ⭐️ 出現後: dish が圧倒的多数でなければ ⭐️ を優先
  if (dishCount > ingredientCount * 2) return 'dish';
  return 'frequent';
}

// ---------------------------------------------------------------------------
// (既存) selectionFromDraft
// ---------------------------------------------------------------------------

/**
 * Convert a saved draft into a recordable selection. Returns null if the draft
 * references an unknown subcategory (defensive).
 */
export function selectionFromDraft(draft: IngredientQuickDraft): QuickLogSelection | null {
  const sub = getQuickLogSubcategory(draft.categoryKey, draft.subcategoryKey);
  if (!sub) return null;
  return {
    categoryKey: draft.categoryKey,
    subcategoryKey: draft.subcategoryKey,
    attrKey: draft.attrKey,
    partKey: draft.partKey,
    methodKey: draft.methodKey,
    amountValue: draft.amountValue,
    amountUnit: draft.amountUnit,
    amountCandidateKey: draft.amountCandidateKey,
    amountLabel: draft.amountLabel,
    loggedAtISO: new Date().toISOString(),
  };
}
