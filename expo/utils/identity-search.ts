/**
 * identity-search.ts — ファジー検索エンジン (SEARCH_SPEC v0.3 §F2)
 *
 * スコア:
 *   4 = 完全一致 (ラベル or searchTags)
 *   3 = 前方一致
 *   2 = 部分一致 (substring)
 *   1–2 = bigram類似度 ≥ 40%
 *
 * 正規化: カタカナ→ひらがな + 長音符(ー)削除 + 小文字化
 */

import { ALL_IDENTITIES, getBucketDef } from '@/constants/identity';
import type { BucketKey, Identity } from '@/types/identity';

export interface IdentitySearchResult {
  identity: Identity;
  score: number;
}

/** カタカナ→ひらがな・長音符除去・小文字化 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/ー/g, '');
}

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

function scoreAgainst(q: string, target: string): number {
  if (!target) return 0;
  if (target === q) return 4;
  if (target.startsWith(q)) return 3;
  if (target.includes(q)) return 2;
  const sim = bigramSimilarity(q, target);
  if (sim >= 0.4) return 1 + sim; // 1.0 ~ 2.0
  return 0;
}

/**
 * ファジー検索。score > 0 のもののみ返し、スコア降順・ラベル昇順でソート。
 * MAX_RESULTS の絞り込みは呼び出し側で行う。
 */
export function searchIdentitiesFuzzy(query: string): IdentitySearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: IdentitySearchResult[] = [];

  for (const identity of ALL_IDENTITIES) {
    const labelNorm = normalize(identity.label);
    const tagNorms = (identity.searchTags ?? []).map(normalize);
    const allTargets = [labelNorm, ...tagNorms];

    const best = Math.max(...allTargets.map((t) => scoreAgainst(q, t)));
    if (best > 0) {
      results.push({ identity, score: best });
    }
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.identity.label.localeCompare(b.identity.label, 'ja');
  });
}

// ---------------------------------------------------------------------------
// 0件フォールバック: カテゴリヒントチップ
// ---------------------------------------------------------------------------

/**
 * クエリに含まれるキーワードから「このカテゴリかも」バケット候補を最大4件返す。
 * 0件ヒット時のフォールバックとして検索シートに表示する。
 */
const CATEGORY_KEYWORD_MAP: Array<{ keywords: string[]; bucket: BucketKey }> = [
  { keywords: ['ごはん', 'ライス', 'パン', '麺', 'うどん', 'そば', 'パスタ', 'ラーメン', '丼', 'どんぶり', 'お米', '米', 'ご飯', 'シリアル', 'オートミール'], bucket: 'staple' },
  { keywords: ['鶏', '豚', '牛', '魚', 'ささみ', 'むね', 'もも', 'サーモン', 'マグロ', 'ツナ', 'えび', 'タコ', 'イカ', 'タラ'], bucket: 'lean_protein' },
  { keywords: ['卵', 'たまご', 'エッグ', 'オムレツ', '目玉焼き', '茹で卵'], bucket: 'egg' },
  { keywords: ['揚げ', 'から揚げ', '豚バラ', 'サーロイン', 'ベーコン', 'ソーセージ', 'サバ', 'サンマ', 'イワシ'], bucket: 'fatty_protein' },
  { keywords: ['牛乳', 'ミルク', 'ヨーグルト', 'チーズ', '豆腐', '豆乳', '納豆', '枝豆', 'プロテイン'], bucket: 'dairy_soy' },
  { keywords: ['野菜', 'サラダ', 'レタス', 'トマト', 'きゅうり', 'ほうれん草', 'ブロッコリー', '汁', '味噌汁', 'スープ', 'きのこ'], bucket: 'veggies' },
  { keywords: ['果物', 'フルーツ', 'りんご', 'バナナ', 'みかん', 'いちご', 'ぶどう', 'メロン'], bucket: 'fruit' },
  { keywords: ['油', 'バター', 'マヨネーズ', 'ドレッシング', 'オリーブ', '調味', '醤油', 'みりん'], bucket: 'added_fat' },
  { keywords: ['お菓子', 'スナック', 'チョコ', 'ケーキ', 'アイス', 'ジュース', 'コーラ', 'ビール', 'お酒', 'アルコール', 'コーヒー', '甘い'], bucket: 'snack_drink' },
  { keywords: ['どんぶり', '丼', '親子丼', '牛丼', 'カツ丼'], bucket: 'rice_dish' },
  { keywords: ['カレー'], bucket: 'curry' },
  { keywords: ['ラーメン', '中華', 'つけ麺', '担々麺', '餃子', '炒飯', 'チャーハン'], bucket: 'chinese_noodles' },
  { keywords: ['うどん', 'そば', 'そうめん', '蕎麦'], bucket: 'japanese_noodles' },
  { keywords: ['パスタ', 'スパゲティ', 'ペペロンチーノ', 'ボロネーゼ', 'カルボナーラ'], bucket: 'pasta' },
  { keywords: ['寿司', 'すし', '刺身', '海鮮'], bucket: 'sushi' },
  { keywords: ['サンド', 'バーガー', 'ハンバーガー', 'ホットドッグ', 'サブウェイ'], bucket: 'sandwich' },
  { keywords: ['ピザ', 'ピッツァ'], bucket: 'pizza' },
  { keywords: ['定食', '唐揚げ', '弁当', 'おかず', 'コンビニ', '焼き魚', '煮物'], bucket: 'misc_dish' },
];

export function getCategoryHints(query: string): BucketKey[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const seen = new Set<BucketKey>();
  const hits: BucketKey[] = [];

  for (const { keywords, bucket } of CATEGORY_KEYWORD_MAP) {
    if (seen.has(bucket)) continue;
    const match = keywords.some((kw) => {
      const kwNorm = normalize(kw);
      return q.includes(kwNorm) || kwNorm.includes(q) || bigramSimilarity(q, kwNorm) >= 0.4;
    });
    if (match) {
      seen.add(bucket);
      hits.push(bucket);
    }
    if (hits.length >= 4) break;
  }

  return hits;
}
