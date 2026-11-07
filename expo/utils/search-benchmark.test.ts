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
import { searchEntriesFuzzy } from './identity-search';
import { PREFIX_TARGETS, TUNING_CORPUS, type Item } from './search-benchmark.corpus.test-data';
import { HOLDOUT_CORPUS } from './search-benchmark.holdout.test-data';
import { createEngine, failing, failureDetails, summarize } from './search-benchmark.engine';
import { KNOWN_FAILURES } from './search-benchmark.known-failures.test-data';

// ---------------------------------------------------------------------------
// 判定・集計 (search-benchmark.engine.ts と共有。US 版は search-benchmark.us.test.ts)
// ---------------------------------------------------------------------------

const { evaluate, prefixReach, identityById } = createEngine('ja', ALL_IDENTITIES);

// 評価はモジュール読み込み時に1回だけ。jest のテスト間で共有する。
for (let i = 0; i < 20; i++) searchEntriesFuzzy('ウォームアップ', { locale: 'ja' });
const tuning = TUNING_CORPUS.map(evaluate);
const holdout = HOLDOUT_CORPUS.map(evaluate);

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

describe('検索ベンチマーク — 正解の甘さ (近似で穴を隠していないか)', () => {
  // 期待値に「複数の別 Identity」を許す行は、本当に曖昧な語 (うどん=型 or 種類) だけでなく、
  // **近い別物で穴を隠している**ことがある (ナゲット→唐揚げでも合格、だった)。増やさない。
  // 本物の穴を作ったら、その行の期待値を新しい着地先 1つに絞って、この上限を下げること。
  const MAX_MULTI_IDENTITY_ROWS = 105; // 2026-10-22 時点の実数 (ファミチキを単一に絞って 106→105)
  it('複数の別 Identity を正解にする行が増えていない', () => {
    const idOf = (p: string) => p.split(/[/[]/)[0];
    const multi = [...TUNING_CORPUS, ...HOLDOUT_CORPUS].filter(
      (i) => i.kind !== 'gap' && new Set(i.e.map(idOf)).size > 1,
    );
    expect(multi.length).toBeLessThanOrEqual(MAX_MULTI_IDENTITY_ROWS);
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
