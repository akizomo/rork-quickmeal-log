/**
 * search-benchmark.engine.ts — 検索品質ベンチマークの測定エンジン (日本語 / US 共通)。
 *
 * search-benchmark.test.ts (ja) と search-benchmark.us.test.ts (en-US) が共有する。
 * 判定の定義と書式は search-benchmark.test.ts の冒頭を参照 (top1 / top3 / wrong / zero ...)。
 * ロケールごとに変わるのは「検索の索引」と「期待値が指す Identity の集合」だけ。
 */
import type { Identity } from '@/types/identity';
import type { AppLocale } from '@/types/locale';

import { getCategoryHints, getVocabularyMatches, searchEntriesFuzzy, type SearchEntryResult } from './identity-search';
import type { Item } from './search-benchmark.corpus.test-data';

export type Status =
  | 'top1' | 'top3' | 'l1-low' | 'l2-only' | 'vocab-only' | 'wrong' | 'zero'
  | 'gap-guided' | 'gap-misleading' | 'gap-silent' | 'noise-ok' | 'noise-bad';

export const PASSING: Status[] = ['top1', 'gap-guided', 'noise-ok'];

export interface Result {
  item: Item; status: Status; ms: number;
  top: string[]; maybe: string[]; vocab: string[]; hints: string[];
}

export const fmt = (r: SearchEntryResult) =>
  r.entry.preset
    ? `★${r.entry.preset.label}`
    : `${r.entry.identity.id}${r.entry.attribute ? '/' + r.entry.attribute.key : ''}${r.entry.style ? '[' + r.entry.style.key + ']' : ''}`;

export interface EngineOptions {
  /**
   * 'gap' (DB に無い料理) の誘導を「正しいバケットの Identity に層1/層2の上位3で着地」でも認める。
   * 日本語は語彙辞書・カテゴリヒント (identity-search の vocab / hints) で誘導するが、US 版には
   * まだ語彙辞書が無い (getVocabularyMatches / getCategoryHints は en-US で空) ため、US だけ有効にする。
   */
  bucketLanding?: boolean;
}

export function createEngine(locale: AppLocale, identities: Identity[], options: EngineOptions = {}) {
  const bucketOf = new Map(identities.map((i) => [i.id, i.primaryHome.bucket as string]));
  const identityById = new Map(identities.map((i) => [i.id, i]));

  const defaultAttrKey = (id: string): string | undefined => {
    const attrs = identityById.get(id)?.attributes;
    return attrs?.find((a) => a.isDefault)?.key ?? attrs?.[0]?.key;
  };

  function matches(r: SearchEntryResult, pat: string): boolean {
    const e = r.entry;
    if (pat.startsWith('preset:')) return e.preset?.id === pat.slice(7);
    if (pat.startsWith('bucket:')) return false;
    if (e.preset) return false;
    const m = pat.match(/^([^/[]+)(?:\/([^[]+))?(?:\[(.+)\])?$/);
    if (!m) return false;
    const [, id, attr, style] = m;
    const idOk = id.endsWith('*') ? e.identity.id.startsWith(id.slice(0, -1)) : e.identity.id === id;
    if (!idOk) return false;
    if (attr && !style) {
      // Identity 自体は「既定の種類」で開くので、期待が既定の種類なら Identity 着地も正解
      if (e.attribute) return e.attribute.key === attr && !e.style;
      if (e.style) return false;
      return defaultAttrKey(e.identity.id) === attr;
    }
    if (attr && e.attribute?.key !== attr) return false;
    if (style && e.style?.key !== style) return false;
    return true;
  }
  const hit = (r: SearchEntryResult, pats: string[]) => pats.some((p) => matches(r, p));

  function expectedBuckets(pats: string[]): Set<string> {
    const out = new Set<string>();
    for (const p of pats) {
      if (p.startsWith('bucket:')) { out.add(p.slice(7)); continue; }
      if (p.startsWith('preset:')) continue;
      const id = p.split(/[/[]/)[0];
      if (id.endsWith('*')) { for (const [k, b] of bucketOf) if (k.startsWith(id.slice(0, -1))) out.add(b); }
      else if (bucketOf.has(id)) out.add(bucketOf.get(id)!);
    }
    return out;
  }

  function evaluate(item: Item): Result {
    const t0 = performance.now();
    const { confident, maybe } = searchEntriesFuzzy(item.q, { locale });
    const vocab = getVocabularyMatches(item.q, locale);
    const hints = getCategoryHints(item.q, locale);
    const ms = performance.now() - t0;

    const idx = confident.findIndex((r) => hit(r, item.e));
    const inMaybe = maybe.some((r) => hit(r, item.e));
    const buckets = expectedBuckets(item.e);
    const idPats = item.e.filter((p) => !p.startsWith('bucket:') && !p.startsWith('preset:')).map((p) => p.split(/[/[]/)[0]);
    const vocabHit = vocab.some((v) => (v.identity && idPats.includes(v.identity)) || buckets.has(v.bucket));
    const hintHit = hints.some((b) => buckets.has(b));
    const landedInBucket =
      !!options.bucketLanding &&
      [...confident.slice(0, 3), ...maybe.slice(0, 3)].some(
        (r) => !r.entry.preset && buckets.has(bucketOf.get(r.entry.identity.id) ?? ''),
      );

    let status: Status;
    if (item.e.length === 0) status = confident.length === 0 ? 'noise-ok' : 'noise-bad';
    else if (item.kind === 'gap') {
      if (idx >= 0 || inMaybe || vocabHit || hintHit || landedInBucket) status = 'gap-guided';
      else if (confident.length > 0) status = 'gap-misleading';
      else status = 'gap-silent';
    } else if (idx === 0) status = 'top1';
    else if (idx > 0 && idx < 3) status = 'top3';
    else if (idx >= 3) status = 'l1-low';
    else if (inMaybe) status = 'l2-only';
    else if (vocabHit) status = 'vocab-only';
    else if (confident.length > 0) status = 'wrong';
    else status = 'zero';

    return {
      item, status, ms,
      top: confident.slice(0, 4).map(fmt),
      maybe: maybe.slice(0, 3).map(fmt),
      vocab: vocab.map((v) => v.identity ?? `b:${v.bucket}`),
      hints,
    };
  }

  /** 打鍵途中: 先頭から n 文字入力したとき、正解が層1の上位3に初めて出る n。 */
  function prefixReach(target: string, pats: string[]): number | null {
    const chars = [...target];
    for (let n = 1; n <= chars.length; n++) {
      const { confident } = searchEntriesFuzzy(chars.slice(0, n).join(''), { locale });
      if (confident.slice(0, 3).some((r) => hit(r, pats))) return n;
    }
    return null;
  }

  return { evaluate, prefixReach, identityById, bucketOf };
}

// i18n-ignore-start: 開発者向けの測定レポート (UI には出さない)
/** チェーン・ブランド名は別機能 (チェーンDB/プリセット) の範囲。全体の数字から分けて測る。 */
export const isScored = (r: Result) => r.item.kind !== 'gap' && r.item.kind !== 'chain' && r.item.e.length > 0;
export const pct = (n: number, d: number) => (d === 0 ? '-' : `${((n / d) * 100).toFixed(1)}%`);
export const countOf = (rs: Result[], s: Status) => rs.filter((r) => r.status === s).length;
export const failing = (rs: Result[]) => rs.filter((r) => !PASSING.includes(r.status));

export function summarize(label: string, all: Result[]): string[] {
  const scored = all.filter(isScored);
  const top1 = countOf(scored, 'top1');
  const lines = [`## ${label}  (n=${all.length}、うち採点対象 ${scored.length})`];
  lines.push(`- **1位正解 ${pct(top1, scored.length)}** (${top1}/${scored.length}) / 上位3以内 ${pct(top1 + countOf(scored, 'top3'), scored.length)}`);
  lines.push(
    '- 内訳: ' + (['top3', 'l1-low', 'l2-only', 'vocab-only', 'wrong', 'zero'] as Status[])
      .map((s) => `${s} ${countOf(scored, s)}`).join(' / '),
  );
  const cats = [...new Set(scored.map((r) => r.item.cat))];
  for (const c of cats) {
    const set = scored.filter((r) => r.item.cat === c);
    lines.push(`  - ${c.padEnd(12)} n=${String(set.length).padStart(3)} 1位 ${pct(countOf(set, 'top1'), set.length).padStart(6)} wrong ${countOf(set, 'wrong')} zero ${countOf(set, 'zero')}`);
  }
  const gaps = all.filter((r) => r.item.kind === 'gap');
  if (gaps.length) {
    lines.push(`- DBに無い料理 ${gaps.length}語: 誘導できた ${countOf(gaps, 'gap-guided')} / 誤誘導 ${countOf(gaps, 'gap-misleading')} / 手がかり無し ${countOf(gaps, 'gap-silent')}`);
  }
  const chain = all.filter((r) => r.item.kind === 'chain');
  if (chain.length) lines.push(`- チェーン名 ${chain.length}語(範囲外・参考): 1位正解 ${pct(countOf(chain, 'top1'), chain.length)}`);
  return lines;
}

export function failureDetails(rs: Result[]): string[] {
  const out: string[] = [];
  const order: Status[] = ['wrong', 'zero', 'vocab-only', 'l2-only', 'l1-low', 'top3', 'gap-misleading', 'gap-silent', 'noise-bad'];
  for (const s of order) {
    const set = rs.filter((r) => r.status === s);
    if (!set.length) continue;
    out.push(`\n### ${s} (${set.length})`);
    for (const r of set) {
      out.push(`- [${r.item.cat}] ${r.item.q}${r.item.note ? `(${r.item.note})` : ''} 期待=${r.item.e.join('|')}  L1=${r.top.join(', ') || '∅'}  L2=${r.maybe.join(', ') || '∅'}  語彙=${r.vocab.join(',') || '∅'}  ヒント=${r.hints.join(',') || '∅'}`);
    }
  }
  return out;
}
// i18n-ignore-end
