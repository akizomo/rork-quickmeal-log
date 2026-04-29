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
} from '@/types/quick-log';

export const HISTORY_PER_CATEGORY_LIMIT = 50;

/**
 * Append a new selection to the history map. Most recent first; capped per category.
 */
export function recordSelection(
  history: QuickLogHistoryMap | undefined,
  sel: QuickLogSelection
): QuickLogHistoryMap {
  const next: QuickLogHistoryMap = { ...(history ?? {}) };
  const list = next[sel.categoryKey] ?? [];
  next[sel.categoryKey] = [sel, ...list].slice(0, HISTORY_PER_CATEGORY_LIMIT);
  return next;
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
        list.push(item as QuickLogSelection);
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
