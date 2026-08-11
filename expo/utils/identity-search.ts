/**
 * identity-search.ts — ファジー検索エンジン (SEARCH_SPEC v0.4 §F2-0 / §F5)
 *
 * 検索単位: Identity ではなく「記録可能な状態」= SearchEntry
 *   (Identity + 任意の Attribute + 任意の Style)。
 * ユーザーが探す名前 (例: ポテトサラダ) の多くは Attribute 層にあるため、
 * Identity ラベルだけを対象にすると大半が検索から見えなくなる (v0.3 までの盲点)。
 *
 * スコア/階層:
 *   confident (層1・無言で1位表示): 完全一致(4) / 前方一致(3) / 部分一致(2)
 *   maybe     (層2・「もしかして」に隔離): bigram類似度 ≥ 40% (1〜2)
 *
 * 正規化 (`utils/identity-normalize.ts`): NFKC + カタカナ→ひらがな + 長音符除去 +
 * 小文字化。クエリはさらにローマ字→ひらがな変換版 (`romajiVariant`) も候補に持ち、
 * 両方で target とスコアリングして良い方を採用する (target 側はローマ字変換しない —
 * 理由は identity-normalize.ts のコメント参照)。
 */

import { ALL_IDENTITIES, getBucketDef } from '@/constants/identity';
import { DISH_VOCABULARY } from '@/constants/identity/dish-vocabulary';
import { HEAD_NOUNS, type HeadNounTarget } from '@/constants/identity/head-nouns';
import { normalize, romajiVariant } from '@/utils/identity-normalize';
import type { AttributeOption, BucketKey, Identity, StyleOption } from '@/types/identity';
import type { QuickLogHistoryMap } from '@/types/quick-log';

export interface SearchEntry {
  identity: Identity;
  attribute?: AttributeOption;
  style?: StyleOption;
}

export interface SearchEntryResult {
  entry: SearchEntry;
  score: number;
  tier: 'confident' | 'maybe';
}

export interface SearchEntriesResult {
  confident: SearchEntryResult[];
  maybe: SearchEntryResult[];
}

const MAX_RESULTS = 8;
const MAX_MAYBE_RESULTS = 4;
/** 同一 Identity から検索結果に出す上限。唐揚げ系(最大8件)等の氾濫を防ぐ (SEARCH_SPEC §F2-0)。 */
const PER_IDENTITY_CAP = 4;

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/**
 * 非対称な類似度 (クエリ側の bigram 数でのみ割る)。短いクエリのスコアが
 * 不当に高くなる欠点があるが、層4 (このカテゴリかも、§F5a) は「何も出さない
 * よりは緩く出す」が設計意図の最終フォールバックなので、ここでは維持する。
 */
function bigramSimilarity(q: string, target: string): number {
  if (q.length < 2 || target.length < 2) return 0;
  const qSet = bigrams(q);
  const tSet = bigrams(target);
  let matches = 0;
  qSet.forEach((b) => { if (tSet.has(b)) matches++; });
  return matches / qSet.size;
}

/**
 * Dice係数 (対称)。SearchEntry の層2「もしかして」専用 (§5.2.1)。
 * 非対称版は短いクエリが長い無関係な語に埋没して部分一致してしまう
 * (フォー→クアトロ・フォルマッジ等、§1.4 原因③) ため、層2 は分母を
 * 両方の bigram 数の和にして緩和する。
 */
function diceSimilarity(q: string, target: string): number {
  if (q.length < 2 || target.length < 2) return 0;
  const qSet = bigrams(q);
  const tSet = bigrams(target);
  let matches = 0;
  qSet.forEach((b) => { if (tSet.has(b)) matches++; });
  return (2 * matches) / (qSet.size + tSet.size);
}

type MatchMethod = 'exact' | 'prefix' | 'substring' | 'bigram';

const METHOD_RANK: Record<MatchMethod, number> = {
  exact: 0,
  prefix: 1,
  substring: 2,
  bigram: 3,
};

function scoreAgainst(q: string, target: string): { score: number; method: MatchMethod } | null {
  if (!target) return null;
  if (target === q) return { score: 4, method: 'exact' };
  if (target.startsWith(q)) return { score: 3, method: 'prefix' };
  // 「途中一致」は q が短いと無関係語への誤爆が起きる (例: 「フォー」→「ふぉ」
  // (2文字) が「クアトロ・フォルマッジ」に部分一致してしまう)。3文字未満は
  // 部分一致の対象外とし、bigram (もしかして) 側に委ねる。
  if (q.length >= 3 && target.includes(q)) return { score: 2, method: 'substring' };
  // 対称な Dice係数を使う (§5.2.1)。非対称版は「スコーン→とうもろこし」のような
  // 無関係語が層2「もしかして」に紛れ込む主因だった。
  // target が短い (bigram が1個しかない) と、その1個が一致しただけで Dice が
  // 不当に高くなる (例: 「グラタン」→「タン」、「たい焼き」→「焼き」)。
  // target 側にも substring と同じ最小3文字を課して同種の誤爆を防ぐ。
  if (target.length >= 3) {
    const sim = diceSimilarity(q, target);
    if (sim >= 0.4) return { score: 1 + sim, method: 'bigram' }; // 1.0 ~ 2.0
  }
  return null;
}

// ---------------------------------------------------------------------------
// インデックス構築 (起動時1回)
// ---------------------------------------------------------------------------

/**
 * 文脈依存ラベル (SEARCH_SPEC §F2-0): 「普通」等、単独では意味をなさない
 * Attribute ラベル。3つ以上の Identity に同一ラベルで出現するものを修飾語と
 * みなし、単独では検索対象にしない (Identity名との複合形でのみ拾う)。
 */
const GENERIC_ATTRIBUTE_LABELS: Set<string> = (() => {
  const counts = new Map<string, number>();
  for (const identity of ALL_IDENTITIES) {
    for (const attr of identity.attributes ?? []) {
      counts.set(attr.label, (counts.get(attr.label) ?? 0) + 1);
    }
  }
  const generic = new Set<string>();
  counts.forEach((n, label) => {
    if (n >= 3) generic.add(label);
  });
  return generic;
})();

function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const identity of ALL_IDENTITIES) {
    entries.push({ identity });
    for (const attribute of identity.attributes ?? []) {
      entries.push({ identity, attribute });
    }
    for (const style of identity.styles ?? []) {
      entries.push({ identity, style });
    }
  }
  return entries;
}

const SEARCH_INDEX: SearchEntry[] = buildSearchIndex();

/** エントリごとの検索対象文字列 (正規化済み)。 */
function targetsFor(entry: SearchEntry): string[] {
  if (entry.attribute) {
    const tags = (entry.attribute.searchTags ?? []).map(normalize);
    if (GENERIC_ATTRIBUTE_LABELS.has(entry.attribute.label)) {
      return [normalize(`${entry.identity.label}${entry.attribute.label}`), ...tags];
    }
    return [normalize(entry.attribute.label), ...tags];
  }
  if (entry.style) {
    return [normalize(entry.style.label), ...(entry.style.searchTags ?? []).map(normalize)];
  }
  return [normalize(entry.identity.label), ...(entry.identity.searchTags ?? []).map(normalize)];
}

/** 同一 Identity からの件数を PER_IDENTITY_CAP で打ち切る (スコア順は維持)。 */
function capPerIdentity(results: SearchEntryResult[], cap: number): SearchEntryResult[] {
  const counts = new Map<string, number>();
  const out: SearchEntryResult[] = [];
  for (const r of results) {
    const id = r.entry.identity.id;
    const n = counts.get(id) ?? 0;
    if (n >= cap) continue;
    counts.set(id, n + 1);
    out.push(r);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ランキング: ユーザー選択頻度 (SEARCH_SPEC v0.4 §5.3, 検索の層内順位づけ)
// ---------------------------------------------------------------------------

/**
 * finalScore = matchScore × (1 + userFreqWeight × log(1 + userSelectCount))
 *
 * §5.3 の式のうち global 項は割愛している — この app はローカル専用でユーザー
 * 横断の集計 (Analytics バックエンド) を持たないため、globalSelectCount を
 * 埋めるデータ源が存在しない。捏造するより明示的に省略する方が誠実と判断した。
 *
 * 頻度はスコアの「並び順」にのみ影響させ、層 (confident/maybe) の判定には
 * 使わない — bigram一致 (層2) が選択頻度だけで層1相当に格上げされると、
 * 「確信度で分離する」という設計原則 (§F5) が崩れるため。
 */
const USER_FREQ_WEIGHT = 0.5;

function frequencyMultiplier(userSelectCount: number): number {
  return 1 + USER_FREQ_WEIGHT * Math.log(1 + userSelectCount);
}

/** SearchEntry を一意に識別するキー (Identity + Attribute + Style)。 */
function entryFrequencyKey(entry: SearchEntry): string {
  return `${entry.identity.id}|${entry.attribute?.key ?? ''}|${entry.style?.key ?? ''}`;
}

/**
 * quickLogHistory (⭐️タブ/自動学習と共有するユーザー選択履歴) から
 * (Identity, Attribute, Style) 単位の選択回数を集計する。
 * `QuickLogSelection.subcategoryKey` は Identity-first IA 由来のエントリでは
 * 常に record Identity の id と一致する (identity-log-bridge.ts の
 * `subTypeKey: recordIdentity.id` を参照)。
 */
function buildUserFrequencyMap(history: QuickLogHistoryMap | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!history) return map;
  for (const list of Object.values(history)) {
    for (const sel of list) {
      const key = `${sel.subcategoryKey}|${sel.attrKey ?? ''}|${sel.styleKey ?? ''}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

export interface SearchOptions {
  /**
   * ⭐️タブ/自動学習と共有するユーザー選択履歴 (settings.quickLogHistory)。
   * 渡すと同一マッチ層内でユーザーの選択頻度に応じて並び替える (§5.3 P4)。
   * 省略時はマッチスコアのみで並ぶ (頻度学習なし)。
   */
  history?: QuickLogHistoryMap;
}

/**
 * ファジー検索。confident (層1) / maybe (層2「もしかして」) に分けて返す。
 * それぞれ finalScore 降順・ラベル昇順、同一 Identity 上限 PER_IDENTITY_CAP 件で
 * 絞り込み済み。finalScore = matchScore × 頻度倍率 (§5.3) — 層の判定自体は
 * マッチスコアの時点で確定しており、頻度は同じ層の中の並び順にのみ影響する。
 */
export function searchEntriesFuzzy(query: string, opts?: SearchOptions): SearchEntriesResult {
  const qBase = normalize(query);
  if (!qBase) return { confident: [], maybe: [] };
  const qRomaji = romajiVariant(query);
  // ascii を含まないクエリでは qRomaji === qBase になるため、その場合は1候補に絞る
  // (二重採点で bigram スコアが不当に底上げされるのを防ぐ)。
  const queryVariants = qRomaji !== qBase ? [qBase, qRomaji] : [qBase];

  const results: SearchEntryResult[] = [];

  for (const entry of SEARCH_INDEX) {
    const targets = targetsFor(entry);
    let best: { score: number; method: MatchMethod } | null = null;
    for (const q of queryVariants) {
      for (const target of targets) {
        const m = scoreAgainst(q, target);
        if (!m) continue;
        if (
          !best ||
          m.score > best.score ||
          (m.score === best.score && METHOD_RANK[m.method] < METHOD_RANK[best.method])
        ) {
          best = m;
        }
      }
    }
    if (!best) continue;
    results.push({
      entry,
      score: best.score,
      tier: best.method === 'bigram' ? 'maybe' : 'confident',
    });
  }

  const freqMap = buildUserFrequencyMap(opts?.history);
  const finalScore = (r: SearchEntryResult) =>
    r.score * frequencyMultiplier(freqMap.get(entryFrequencyKey(r.entry)) ?? 0);
  const label = (r: SearchEntryResult) =>
    r.entry.attribute?.label ?? r.entry.style?.label ?? r.entry.identity.label;
  results.sort((a, b) => finalScore(b) - finalScore(a) || label(a).localeCompare(label(b), 'ja'));

  const confident = results.filter((r) => r.tier === 'confident');
  const maybe = results.filter((r) => r.tier === 'maybe');

  return {
    confident: capPerIdentity(confident, PER_IDENTITY_CAP).slice(0, MAX_RESULTS),
    maybe: capPerIdentity(maybe, PER_IDENTITY_CAP).slice(0, MAX_MAYBE_RESULTS),
  };
}

// ---------------------------------------------------------------------------
// 層2/3: 主辞辞書・料理名辞書 (SEARCH_SPEC v0.4 §5.4.5 / §5.4.6)
// ---------------------------------------------------------------------------

export interface VocabularyMatch {
  bucket: BucketKey;
  /** 特定 Identity まで絞れる場合のみ (主辞辞書の一部エントリ)。 */
  identity?: string;
  source: 'dish_vocabulary' | 'head_noun';
}

/** DISH_VOCABULARY のキーを正規化してインデックス化 (起動時1回)。 */
const DISH_VOCABULARY_INDEX: Array<{ key: string; bucket: BucketKey }> = Object.entries(
  DISH_VOCABULARY
).map(([key, bucket]) => ({ key: normalize(key), bucket }));

/**
 * 層3: 料理名辞書との照合。主辞を持たない単一語 (グラタン/ケバブ等) を拾う。
 * bigram は使わない — 層3は「知っている語」への確定的な着地であるべきで、
 * 層2 (bigramベースの「もしかして」) と役割が混ざらないようにする。
 */
function matchDishVocabulary(queryVariants: string[]): BucketKey | null {
  let best: { score: number; method: MatchMethod; bucket: BucketKey } | null = null;
  for (const { key, bucket } of DISH_VOCABULARY_INDEX) {
    for (const q of queryVariants) {
      const m = scoreAgainst(q, key);
      if (!m || m.method === 'bigram') continue;
      if (!best || m.score > best.score) {
        best = { ...m, bucket };
      }
    }
  }
  return best?.bucket ?? null;
}

/** HEAD_NOUNS の heads を正規化してインデックス化 (起動時1回)。手書きの表記ゆれ
 * (長音符の有無など) が normalize() の挙動と食い違うのを防ぐ。 */
const HEAD_NOUNS_INDEX: Array<{ head: string; targets: HeadNounTarget[] }> = HEAD_NOUNS.flatMap(
  (entry) => entry.heads.map((head) => ({ head: normalize(head), targets: entry.targets }))
);

/**
 * 層2: 主辞辞書との照合 (SEARCH_SPEC §5.2.2)。
 * クエリが登録済み主辞で終わり、かつ残りが1文字以上ある場合のみマッチとする —
 * 文字列の単純な末尾一致は形態素境界を越えた誤爆を招く (グラタン→牛タン等)。
 */
function matchHeadNouns(queryVariants: string[]): HeadNounTarget[] {
  const seen = new Set<string>();
  const out: HeadNounTarget[] = [];
  for (const { head, targets } of HEAD_NOUNS_INDEX) {
    const hit = queryVariants.some((q) => q.length > head.length && q.endsWith(head));
    if (!hit) continue;
    for (const target of targets) {
      const key = `${target.bucket}:${target.identity ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(target);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

/**
 * 層2/3 まとめて照合する。層3 (料理名辞書) を優先する — 「たい焼き」のように
 * 単一語として辞書に確定登録されている方が、末尾主辞 (「焼き」) だけから推測
 * するより具体的で信頼できるため。
 */
export function getVocabularyMatches(query: string): VocabularyMatch[] {
  const qBase = normalize(query);
  if (!qBase) return [];
  const qRomaji = romajiVariant(query);
  const queryVariants = qRomaji !== qBase ? [qBase, qRomaji] : [qBase];

  const dishHit = matchDishVocabulary(queryVariants);
  if (dishHit) return [{ bucket: dishHit, source: 'dish_vocabulary' }];

  return matchHeadNouns(queryVariants).map((t) => ({ ...t, source: 'head_noun' as const }));
}

// ---------------------------------------------------------------------------
// 層4フォールバック: カテゴリヒントチップ
// ---------------------------------------------------------------------------

/**
 * クエリに含まれるキーワードから「このカテゴリだと思われる」バケット候補を
 * 最大4件返す。層1〜3のヒット有無に関わらず常に計算し、検索シート側で常時
 * 表示する (SEARCH_SPEC v0.4 §F5: 誤ヒットがカテゴリへの逃げ道を塞ぐ構造の解消)。
 *
 * データソースは DISH_VOCABULARY (旧 CATEGORY_KEYWORD_MAP を統合・置換、§5.4.6)。
 */
export function getCategoryHints(query: string): BucketKey[] {
  const qBase = normalize(query);
  if (!qBase) return [];
  const qRomaji = romajiVariant(query);
  const queryVariants = qRomaji !== qBase ? [qBase, qRomaji] : [qBase];

  const seen = new Set<BucketKey>();
  const hits: BucketKey[] = [];

  for (const { key, bucket } of DISH_VOCABULARY_INDEX) {
    if (seen.has(bucket)) continue;
    const match = queryVariants.some(
      (q) => q.includes(key) || key.includes(q) || bigramSimilarity(q, key) >= 0.4
    );
    if (match) {
      seen.add(bucket);
      hits.push(bucket);
    }
    if (hits.length >= 4) break;
  }

  return hits;
}

/** 検索結果1件の表示用ラベルとサブラベル (Identity + バケット)。 */
export function describeSearchEntry(entry: SearchEntry): {
  label: string;
  identityLabel: string | null;
  bucketEmoji: string | null;
  bucketLabel: string | null;
} {
  const label = entry.attribute?.label ?? entry.style?.label ?? entry.identity.label;
  const isSubEntry = !!entry.attribute || !!entry.style;
  const bucket = getBucketDef(entry.identity.primaryHome.bucket);
  return {
    label,
    identityLabel: isSubEntry ? entry.identity.label : null,
    bucketEmoji: bucket?.emoji ?? null,
    bucketLabel: bucket?.label ?? null,
  };
}
