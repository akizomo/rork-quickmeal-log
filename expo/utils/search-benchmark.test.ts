/**
 * 検索品質ベンチマーク (IA spec / SEARCH_SPEC §7)
 *
 * 個別の語を「通す」テストではなく、**語彙全体の着地を測り、退行を防ぐ**テスト。
 * 検索語を足すたび・検索ロジックを触るたびに、全語彙の正答が動かないことを保証する。
 *
 * 判定 (各語):
 *   top1        … 層1 の1位が正解
 *   top3        … 層1 の2〜3位が正解 (= 1位は別物。取り違えの危険)
 *   l1-low      … 層1 の4位以下
 *   l2-only     … 「もしかして」止まり
 *   vocab-only  … 語彙チップ/カテゴリへの誘導のみ (Identity には着地しない)
 *   wrong       … 層1に別物だけが出る (自信ありげな取り違え。0件より悪い)
 *   zero        … 何も出ない
 *   gap-*       … DB に無い料理。誘導できたか (guided) / 誤誘導 (misleading) / 手がかり無し (silent)
 *
 * ラチェット: `search-benchmark.known-failures.test-data.ts` は現時点の失敗の凍結リスト。
 *   - リストに無い語が失敗したら落ちる (退行)
 *   - リストにある語が通ったら落ちる (改善の固定 — リストから消す)
 *
 * リストの更新 (改善後):
 *   SEARCH_BENCH_SHRINK=1 bun run test -- search-benchmark   … 通った語だけを消す (増やさない)
 * 初期化 (語彙を大きく入れ替えたとき・人が内容を確認した上で):
 *   SEARCH_BENCH_WRITE_KNOWN=1 bun run test -- search-benchmark
 *
 * レポート: SEARCH_EVAL_OUT=/path/report.md を付けると詳細を書き出す。
 * ホールドアウト語彙の失敗詳細は SEARCH_EVAL_HOLDOUT_DETAIL=1 のときだけ出す (見て直すとチューニング用になるため)。
 */
import * as fs from 'fs';
import * as path from 'path';

import { ALL_IDENTITIES } from '@/constants/identity';
import { getCategoryHints, getVocabularyMatches, searchEntriesFuzzy, type SearchEntryResult } from './identity-search';
import { PREFIX_TARGETS, TUNING_CORPUS, type Item } from './search-benchmark.corpus.test-data';
import { HOLDOUT_CORPUS } from './search-benchmark.holdout.test-data';
import { KNOWN_FAILURES } from './search-benchmark.known-failures.test-data';

// ---------------------------------------------------------------------------
// 判定
// ---------------------------------------------------------------------------

type Status =
  | 'top1' | 'top3' | 'l1-low' | 'l2-only' | 'vocab-only' | 'wrong' | 'zero'
  | 'gap-guided' | 'gap-misleading' | 'gap-silent' | 'noise-ok' | 'noise-bad';

const PASSING: Status[] = ['top1', 'gap-guided', 'noise-ok'];

const bucketOf = new Map(ALL_IDENTITIES.map((i) => [i.id, i.primaryHome.bucket as string]));
const identityById = new Map(ALL_IDENTITIES.map((i) => [i.id, i]));

function defaultAttrKey(id: string): string | undefined {
  const attrs = identityById.get(id)?.attributes;
  return attrs?.find((a) => a.isDefault)?.key ?? attrs?.[0]?.key;
}

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
    // (例: 'rice/white' に対し 'rice')。種類を持たない Identity エントリのみ。
    if (e.attribute) return e.attribute.key === attr && !e.style;
    if (e.style) return false;
    return defaultAttrKey(e.identity.id) === attr;
  }
  if (attr && e.attribute?.key !== attr) return false;
  if (style && e.style?.key !== style) return false;
  return true;
}
const hit = (r: SearchEntryResult, pats: string[]) => pats.some((p) => matches(r, p));
const fmt = (r: SearchEntryResult) =>
  r.entry.preset
    ? `★${r.entry.preset.label}`
    : `${r.entry.identity.id}${r.entry.attribute ? '/' + r.entry.attribute.key : ''}${r.entry.style ? '[' + r.entry.style.key + ']' : ''}`;

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

interface Result {
  item: Item; status: Status; ms: number;
  top: string[]; maybe: string[]; vocab: string[]; hints: string[];
}

function evaluate(item: Item): Result {
  const t0 = performance.now();
  const { confident, maybe } = searchEntriesFuzzy(item.q, { locale: 'ja' });
  const vocab = getVocabularyMatches(item.q, 'ja');
  const hints = getCategoryHints(item.q, 'ja');
  const ms = performance.now() - t0;

  const idx = confident.findIndex((r) => hit(r, item.e));
  const inMaybe = maybe.some((r) => hit(r, item.e));
  const buckets = expectedBuckets(item.e);
  const idPats = item.e.filter((p) => !p.startsWith('bucket:') && !p.startsWith('preset:')).map((p) => p.split(/[/[]/)[0]);
  const vocabHit = vocab.some((v) => (v.identity && idPats.includes(v.identity)) || buckets.has(v.bucket));
  const hintHit = hints.some((b) => buckets.has(b));

  let status: Status;
  if (item.e.length === 0) status = confident.length === 0 ? 'noise-ok' : 'noise-bad';
  else if (item.kind === 'gap') {
    if (idx >= 0 || inMaybe || vocabHit || hintHit) status = 'gap-guided';
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
    const { confident } = searchEntriesFuzzy(chars.slice(0, n).join(''), { locale: 'ja' });
    if (confident.slice(0, 3).some((r) => hit(r, pats))) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

// 評価はモジュール読み込み時に1回だけ。jest のテスト間で共有する。
for (let i = 0; i < 20; i++) searchEntriesFuzzy('ウォームアップ', { locale: 'ja' });
const tuning = TUNING_CORPUS.map(evaluate);
const holdout = HOLDOUT_CORPUS.map(evaluate);

/** チェーン・ブランド名は別機能 (チェーンDB/プリセット) の範囲。全体の数字から分けて測る。 */
const isScored = (r: Result) => r.item.kind !== 'gap' && r.item.kind !== 'chain' && r.item.e.length > 0;
const pct = (n: number, d: number) => (d === 0 ? '-' : `${((n / d) * 100).toFixed(1)}%`);
const countOf = (rs: Result[], s: Status) => rs.filter((r) => r.status === s).length;

function summarize(label: string, all: Result[]): string[] {
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

function failureDetails(rs: Result[]): string[] {
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

const failing = (rs: Result[]) => rs.filter((r) => !PASSING.includes(r.status));

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('検索ベンチマーク — 語彙の健全性', () => {
  it('チューニング用とホールドアウト用で検索語が重複していない', () => {
    const all = [...TUNING_CORPUS, ...HOLDOUT_CORPUS].map((i) => i.q);
    const dup = all.filter((q, i) => all.indexOf(q) !== i);
    expect([...new Set(dup)]).toEqual([]);
  });

  it('期待値が指す Identity / 種類 / スタイル / Preset が DB に実在する (ラベルの腐敗防止)', () => {
    const bad: string[] = [];
    for (const item of [...TUNING_CORPUS, ...HOLDOUT_CORPUS]) {
      for (const p of item.e) {
        if (p.startsWith('bucket:')) continue;
        if (p.startsWith('preset:')) continue; // Preset は presets.test.ts が検証
        const m = p.match(/^([^/[]+)(?:\/([^[]+))?(?:\[(.+)\])?$/);
        if (!m) { bad.push(`${item.q}: 書式不正 "${p}"`); continue; }
        const [, id, attr, style] = m;
        if (id.endsWith('*')) {
          if (![...identityById.keys()].some((k) => k.startsWith(id.slice(0, -1)))) bad.push(`${item.q}: "${p}" に一致する Identity が無い`);
          continue;
        }
        const identity = identityById.get(id);
        if (!identity) { bad.push(`${item.q}: Identity "${id}" が無い`); continue; }
        if (attr && !identity.attributes?.some((a) => a.key === attr)) bad.push(`${item.q}: ${id} に種類 "${attr}" が無い`);
        if (style && !identity.styles?.some((s) => s.key === style)) bad.push(`${item.q}: ${id} にスタイル "${style}" が無い`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('検索ベンチマーク — ラチェット (チューニング用語彙)', () => {
  const known = new Set(KNOWN_FAILURES);
  const scoredOrGap = tuning.filter((r) => r.item.kind !== 'chain');

  it('新しい失敗が増えていない (退行)', () => {
    const added = failing(scoredOrGap).filter((r) => !known.has(r.item.q));
    expect(added.map((r) => `${r.item.q}: ${r.status} L1=${r.top.join(',') || '∅'}`)).toEqual([]);
  });

  it('KNOWN_FAILURES に、もう通っている語が残っていない (改善の固定)', () => {
    const stillFailing = new Set(failing(scoredOrGap).map((r) => r.item.q));
    const stale = KNOWN_FAILURES.filter((q) => !stillFailing.has(q));
    expect(stale).toEqual([]);
  });

  it('KNOWN_FAILURES の語は全てチューニング用語彙に存在する', () => {
    const all = new Set(TUNING_CORPUS.map((i) => i.q));
    expect(KNOWN_FAILURES.filter((q) => !all.has(q))).toEqual([]);
  });
});

describe('検索ベンチマーク — 速度', () => {
  it('1回の検索 (層1+層2+語彙+ヒント) の p95 が 25ms 未満 (Node, 実測は約1.7ms)', () => {
    const times = [...tuning, ...holdout].map((r) => r.ms).sort((a, b) => a - b);
    expect(times[Math.floor(times.length * 0.95)]).toBeLessThan(25);
  });
});

describe('検索ベンチマーク — 集計とレポート', () => {
  it('集計を出力する (失敗させない)', () => {
    const lines: string[] = [`# 検索品質レポート (${new Date().toISOString().slice(0, 10)})`, ''];
    lines.push(...summarize('チューニング用語彙', tuning), '');
    lines.push(...summarize('ホールドアウト語彙 (チューニングに使っていない)', holdout), '');

    const times = [...tuning, ...holdout].map((r) => r.ms).sort((a, b) => a - b);
    const q = (p: number) => times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(2);
    lines.push(`## 速度 (Node) p50 ${q(0.5)}ms / p95 ${q(0.95)}ms / max ${times[times.length - 1].toFixed(2)}ms`, '');

    const reach = PREFIX_TARGETS.map(([t, pats]) => ({ t, n: prefixReach(t, pats), len: [...t].length }));
    const reached = reach.filter((r) => r.n !== null);
    lines.push('## 打鍵途中: 正解が上位3に出る文字数');
    lines.push(`- 最後まで打っても出ない: ${reach.filter((r) => r.n === null).map((r) => r.t).join(' ') || 'なし'}`);
    lines.push(`- 到達 ${reached.length}/${reach.length} 語の平均 ${(reached.reduce((s, r) => s + (r.n as number), 0) / Math.max(1, reached.length)).toFixed(2)}文字 / 語の平均長 ${(reached.reduce((s, r) => s + r.len, 0) / Math.max(1, reached.length)).toFixed(2)}文字`);

    lines.push('', '## 失敗一覧 (チューニング用語彙)', ...failureDetails(failing(tuning)));
    if (process.env.SEARCH_EVAL_HOLDOUT_DETAIL === '1') {
      lines.push('', '## 失敗一覧 (ホールドアウト — 見て直した語はチューニング用へ移すこと)', ...failureDetails(failing(holdout)));
    }

    const out = process.env.SEARCH_EVAL_OUT;
    if (out) {
      fs.writeFileSync(out, lines.join('\n'));
      fs.writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify(
        [...tuning.map((r) => ({ set: 'tuning', ...r })), ...holdout.map((r) => ({ set: 'holdout', ...r }))]
          .map((r) => ({ set: r.set, q: r.item.q, cat: r.item.cat, kind: r.item.kind, status: r.status, top: r.top, maybe: r.maybe })),
        null, 1,
      ));
    }
    expect(tuning.length).toBeGreaterThan(0);
  });

  it('(更新用) KNOWN_FAILURES を書き換える', () => {
    const file = path.join(__dirname, 'search-benchmark.known-failures.test-data.ts');
    const write = (qs: string[], note: string) => {
      const byQ = new Map(tuning.map((r) => [r.item.q, r.status]));
      const body = qs.map((q) => `  ${JSON.stringify(q)}, // ${byQ.get(q)}`).join('\n');
      fs.writeFileSync(file, `/**\n * 検索ベンチマークの失敗の凍結リスト (ラチェット)。${note}\n * 詳細は search-benchmark.test.ts の冒頭を参照。**手で足さない** — 足したくなったら退行している。\n */\nexport const KNOWN_FAILURES: string[] = [\n${body}\n];\n`);
    };
    const now = failing(tuning.filter((r) => r.item.kind !== 'chain')).map((r) => r.item.q);
    if (process.env.SEARCH_BENCH_WRITE_KNOWN === '1') write(now, '初期化: 現時点の失敗を全て凍結。');
    else if (process.env.SEARCH_BENCH_SHRINK === '1') write(KNOWN_FAILURES.filter((q) => now.includes(q)), '改善により縮小済み (増やしていない)。');
    expect(true).toBe(true);
  });
});
