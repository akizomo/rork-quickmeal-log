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
import { normalize, romajiVariant } from '@/utils/identity-normalize';
import type { AttributeOption, BucketKey, Identity, StyleOption } from '@/types/identity';

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

function bigramSimilarity(q: string, target: string): number {
  if (q.length < 2 || target.length < 2) return 0;
  const qSet = bigrams(q);
  const tSet = bigrams(target);
  let matches = 0;
  qSet.forEach((b) => { if (tSet.has(b)) matches++; });
  return matches / qSet.size;
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
  if (target.includes(q)) return { score: 2, method: 'substring' };
  const sim = bigramSimilarity(q, target);
  if (sim >= 0.4) return { score: 1 + sim, method: 'bigram' }; // 1.0 ~ 2.0
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

/**
 * ファジー検索。confident (層1) / maybe (層2「もしかして」) に分けて返す。
 * それぞれスコア降順・ラベル昇順、同一 Identity 上限 PER_IDENTITY_CAP 件で絞り込み済み。
 */
export function searchEntriesFuzzy(query: string): SearchEntriesResult {
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

  const label = (r: SearchEntryResult) =>
    r.entry.attribute?.label ?? r.entry.style?.label ?? r.entry.identity.label;
  results.sort((a, b) => b.score - a.score || label(a).localeCompare(label(b), 'ja'));

  const confident = results.filter((r) => r.tier === 'confident');
  const maybe = results.filter((r) => r.tier === 'maybe');

  return {
    confident: capPerIdentity(confident, PER_IDENTITY_CAP).slice(0, MAX_RESULTS),
    maybe: capPerIdentity(maybe, PER_IDENTITY_CAP).slice(0, MAX_MAYBE_RESULTS),
  };
}

// ---------------------------------------------------------------------------
// 層4フォールバック: カテゴリヒントチップ
// ---------------------------------------------------------------------------

/**
 * クエリに含まれるキーワードから「このカテゴリだと思われる」バケット候補を
 * 最大4件返す。層1〜3のヒット有無に関わらず常に計算し、検索シート側で常時
 * 表示する (SEARCH_SPEC v0.4 §F5: 誤ヒットがカテゴリへの逃げ道を塞ぐ構造の解消)。
 */
const CATEGORY_KEYWORD_MAP: Array<{ keywords: string[]; bucket: BucketKey }> = [
  { keywords: ['ごはん', 'ライス', 'パン', '麺', 'うどん', 'そば', 'パスタ', 'ラーメン', '丼', 'どんぶり', 'お米', '米', 'ご飯', 'シリアル', 'オートミール'], bucket: 'staple' },
  { keywords: ['鶏', '豚', '牛', '魚', 'ささみ', 'むね', 'もも', 'サーモン', 'マグロ', 'ツナ', 'えび', 'タコ', 'イカ', 'タラ'], bucket: 'lean_protein' },
  { keywords: ['卵', 'たまご', 'エッグ', 'オムレツ', '目玉焼き', '茹で卵'], bucket: 'egg' },
  { keywords: ['揚げ', 'から揚げ', '豚バラ', 'サーロイン', 'ベーコン', 'ソーセージ', 'サバ', 'サンマ', 'イワシ'], bucket: 'fatty_protein' },
  { keywords: ['牛乳', 'ミルク', 'ヨーグルト', 'チーズ', '豆腐', '豆乳', '納豆', '枝豆', 'プロテイン'], bucket: 'dairy_soy' },
  { keywords: ['野菜', 'サラダ', 'レタス', 'トマト', 'きゅうり', 'ほうれん草', 'ブロッコリー', '汁', '味噌汁', 'スープ', 'きのこ', '煮'], bucket: 'veggies' },
  { keywords: ['果物', 'フルーツ', 'りんご', 'バナナ', 'みかん', 'いちご', 'ぶどう', 'メロン'], bucket: 'fruit' },
  { keywords: ['油', 'バター', 'マヨネーズ', 'ドレッシング', 'オリーブ', '調味', '醤油', 'みりん'], bucket: 'added_fat' },
  { keywords: ['お菓子', 'スナック', 'チョコ', 'ケーキ', 'アイス', 'ジュース', 'コーラ', 'ビール', 'お酒', 'アルコール', 'コーヒー', '甘い'], bucket: 'snack_drink' },
  { keywords: ['どんぶり', '丼', '親子丼', '牛丼', 'カツ丼'], bucket: 'rice_dish' },
  { keywords: ['カレー'], bucket: 'curry' },
  { keywords: ['ラーメン', '中華', 'つけ麺', '担々麺', '餃子', '炒飯', 'チャーハン'], bucket: 'chinese_noodles' },
  { keywords: ['うどん', 'そば', 'そうめん', '蕎麦'], bucket: 'japanese_noodles' },
  { keywords: ['パスタ', 'スパゲティ', 'ペペロンチーノ', 'ボロネーゼ'], bucket: 'pasta' },
  { keywords: ['寿司', 'すし', '刺身', '海鮮'], bucket: 'sushi' },
  { keywords: ['サンド', 'バーガー', 'ハンバーガー', 'ホットドッグ', 'サブウェイ'], bucket: 'sandwich' },
  { keywords: ['ピザ', 'ピッツァ'], bucket: 'pizza' },
  { keywords: ['定食', '唐揚げ', '弁当', 'おかず', 'コンビニ', '焼き魚', '揚げ物', 'カツ'], bucket: 'misc_dish' },
];

export function getCategoryHints(query: string): BucketKey[] {
  const qBase = normalize(query);
  if (!qBase) return [];
  const qRomaji = romajiVariant(query);
  const queryVariants = qRomaji !== qBase ? [qBase, qRomaji] : [qBase];

  const seen = new Set<BucketKey>();
  const hits: BucketKey[] = [];

  for (const { keywords, bucket } of CATEGORY_KEYWORD_MAP) {
    if (seen.has(bucket)) continue;
    const match = keywords.some((kw) => {
      const kwNorm = normalize(kw);
      return queryVariants.some(
        (q) => q.includes(kwNorm) || kwNorm.includes(q) || bigramSimilarity(q, kwNorm) >= 0.4
      );
    });
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
