/**
 * US 版 検索品質ベンチマーク (日本語は search-benchmark.test.ts)。
 *
 * 測り方・判定・ラチェットの考え方は日本語版と同じ (冒頭コメント参照)。測定は search-benchmark.engine.ts を共有する。
 *
 * 日本語版との違い:
 *   - 語彙辞書 (getVocabularyMatches / getCategoryHints) が en-US では空なので、DB に無い食品 ('gap') は
 *     「同じバケットの Identity に上位3で着地」で誘導できたとみなす (engine の bucketLanding)。
 *   - 初回測定 (2026-11-07) は日本語版の水準に遠いので、失敗を凍結して**増やさない**ことから始める。
 *     目標は 1位正解 87% (日本語版の現在値)。改善するたびに凍結リストを縮める。
 *
 * リストの更新 (改善後):
 *   SEARCH_BENCH_US_SHRINK=1 bun run test -- search-benchmark.us    … 通った語だけを消す (増やさない)
 * 初期化 (語彙を大きく入れ替えたとき・人が内容を確認した上で):
 *   SEARCH_BENCH_US_WRITE_KNOWN=1 bun run test -- search-benchmark.us
 * レポート: SEARCH_EVAL_OUT=/path/report.md を付けると詳細を書き出す。
 * ホールドアウトの失敗詳細は SEARCH_EVAL_HOLDOUT_DETAIL=1 のときだけ出す (見て直すとチューニング用になるため)。
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildRegistry } from '@/constants/identity';
import type { Identity } from '@/types/identity';

import { searchEntriesFuzzy } from './identity-search';
import { createEngine, failing, failureDetails, summarize } from './search-benchmark.engine';
import { US_HOLDOUT_CORPUS } from './search-benchmark.us.holdout.test-data';
import { US_KNOWN_FAILURES } from './search-benchmark.us.known-failures.test-data';
import { US_PREFIX_TARGETS, US_TUNING_CORPUS } from './search-benchmark.us.corpus.test-data';

const registry = buildRegistry('en-US', 'en-US');
const US_IDENTITIES: Identity[] = [...new Map(Object.values(registry.byBucket).flat().map((i) => [i.id, i])).values()];
const { evaluate, prefixReach, identityById } = createEngine('en-US', US_IDENTITIES, { bucketLanding: true });

for (let i = 0; i < 20; i++) searchEntriesFuzzy('warmup', { locale: 'en-US' });
const tuning = US_TUNING_CORPUS.map(evaluate);
const holdout = US_HOLDOUT_CORPUS.map(evaluate);

describe('US 検索ベンチマーク — 語彙の健全性', () => {
  it('チューニング用とホールドアウト用で検索語が重複していない', () => {
    const all = [...US_TUNING_CORPUS, ...US_HOLDOUT_CORPUS].map((i) => i.q); // 大文字小文字・前後の空白だけ違う語は表記ゆれの測定として別の語に数える
    const dup = all.filter((q, i) => all.indexOf(q) !== i);
    expect([...new Set(dup)]).toEqual([]);
  });

  it('期待値が指す Identity / 種類 / スタイルが DB に実在する (ラベルの腐敗防止)', () => {
    const bad: string[] = [];
    for (const item of [...US_TUNING_CORPUS, ...US_HOLDOUT_CORPUS]) {
      for (const p of item.e) {
        if (p.startsWith('bucket:')) {
          const b = p.slice(7);
          if (!registry.buckets.some((x) => x.key === b)) bad.push(`${item.q}: バケット "${b}" が無い`);
          continue;
        }
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

describe('US 検索ベンチマーク — 正解の甘さ (近似で穴を隠していないか)', () => {
  // 期待値に「複数の別 Identity」を許す行が増えていない。日本語版と同じ考え方。
  const MAX_MULTI_IDENTITY_ROWS = 17; // 2026-11-07 時点の実数 (初版 14 + ホールドアウトから移した行 3)
  it('複数の別 Identity を正解にする行が増えていない', () => {
    const idOf = (p: string) => p.split(/[/[]/)[0];
    const multi = [...US_TUNING_CORPUS, ...US_HOLDOUT_CORPUS].filter(
      (i) => i.kind !== 'gap' && new Set(i.e.map(idOf)).size > 1,
    );
    expect(multi.length).toBeLessThanOrEqual(MAX_MULTI_IDENTITY_ROWS);
  });
});

describe('US 検索ベンチマーク — ラチェット (チューニング用語彙)', () => {
  const known = new Set(US_KNOWN_FAILURES);
  const scoredOrGap = tuning.filter((r) => r.item.kind !== 'chain');

  it('新しい失敗が増えていない (退行)', () => {
    const added = failing(scoredOrGap).filter((r) => !known.has(r.item.q));
    expect(added.map((r) => `${r.item.q}: ${r.status} L1=${r.top.join(',') || '∅'}`)).toEqual([]);
  });

  it('US_KNOWN_FAILURES に、もう通っている語が残っていない (改善の固定)', () => {
    const stillFailing = new Set(failing(scoredOrGap).map((r) => r.item.q));
    expect(US_KNOWN_FAILURES.filter((q) => !stillFailing.has(q))).toEqual([]);
  });

  it('US_KNOWN_FAILURES の語は全てチューニング用語彙に存在する', () => {
    const all = new Set(US_TUNING_CORPUS.map((i) => i.q));
    expect(US_KNOWN_FAILURES.filter((q) => !all.has(q))).toEqual([]);
  });
});

describe('US 検索ベンチマーク — 取り違え (0件より悪い失敗)', () => {
  // 取り違え = 層1に別物だけが出る。気づかず誤ったカロリーで記録される。ホールドアウトの数を別に持ち、増やさない。
  const wrongCount = (rs: ReturnType<typeof evaluate>[]) => rs.filter((r) => r.item.kind !== 'chain' && r.status === 'wrong').length;
  // 2026-11-09: 新しい語の束 (第1〜3束) を取り込んで 1 → 6。中身: 期待が種類 (turkey breast/deli) なのに食品全体に着地した語 /
  // 期待の付け方が曖昧な語 (chicken parmesan・shrimp scampi: パスタのどれか) / 味つきの食品 (white claw mango) /
  // peanut butter banana toast (フレンチトーストに取られる)。増やさない。
  const MAX_WRONG_TUNING = 6; // 初回測定は 8 (turkey meatballs が「ターキーサブ」に着地するのも含む)
  const MAX_WRONG_HOLDOUT = 2; // 同上 (初回測定は 1。補充した新しい語で 2 になった。増やさない)
  it('取り違えが増えていない (チューニング用)', () => { expect(wrongCount(tuning)).toBeLessThanOrEqual(MAX_WRONG_TUNING); });
  it('取り違えが増えていない (ホールドアウト)', () => { expect(wrongCount(holdout)).toBeLessThanOrEqual(MAX_WRONG_HOLDOUT); });
});

describe('US 検索ベンチマーク — 速度', () => {
  it('1回の検索の p95 が 25ms 未満 (Node)', () => {
    const times = [...tuning, ...holdout].map((r) => r.ms).sort((a, b) => a - b);
    expect(times[Math.floor(times.length * 0.95)]).toBeLessThan(25);
  });
});

describe('US 検索ベンチマーク — 集計とレポート', () => {
  it('集計を出力する (失敗させない)', () => {
    const lines: string[] = [`# US 検索品質レポート (${new Date().toISOString().slice(0, 10)})`, ''];
    lines.push(...summarize('チューニング用語彙', tuning), '');
    lines.push(...summarize('ホールドアウト語彙 (チューニングに使っていない)', holdout), '');
    const times = [...tuning, ...holdout].map((r) => r.ms).sort((a, b) => a - b);
    const q = (p: number) => times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(2);
    lines.push(`## 速度 (Node) p50 ${q(0.5)}ms / p95 ${q(0.95)}ms / max ${times[times.length - 1].toFixed(2)}ms`, '');
    const reach = US_PREFIX_TARGETS.map(([t, pats]) => ({ t, n: prefixReach(t, pats), len: [...t].length }));
    const reached = reach.filter((r) => r.n !== null);
    lines.push('## 打鍵途中: 正解が上位3に出る文字数');
    lines.push(`- 最後まで打っても出ない: ${reach.filter((r) => r.n === null).map((r) => r.t).join(' / ') || 'なし'}`);
    lines.push(`- 到達 ${reached.length}/${reach.length} 語の平均 ${(reached.reduce((s, r) => s + (r.n as number), 0) / Math.max(1, reached.length)).toFixed(2)}文字 / 語の平均長 ${(reached.reduce((s, r) => s + r.len, 0) / Math.max(1, reached.length)).toFixed(2)}文字`);
    lines.push('', '## 失敗一覧 (チューニング用語彙)', ...failureDetails(failing(tuning)));
    if (process.env.SEARCH_EVAL_HOLDOUT_DETAIL === '1') {
      lines.push('', '## 失敗一覧 (ホールドアウト — 見て直した語はチューニング用へ移すこと)', ...failureDetails(failing(holdout)));
    }
    const out = process.env.SEARCH_EVAL_OUT;
    if (out) fs.writeFileSync(out, lines.join('\n'));
    if (process.env.SEARCH_EVAL_PRINT === '1') console.log(lines.join('\n'));
    expect(tuning.length).toBeGreaterThan(0);
  });

  it('(更新用) US_KNOWN_FAILURES を書き換える', () => {
    const file = path.join(__dirname, 'search-benchmark.us.known-failures.test-data.ts');
    const write = (qs: string[], note: string) => {
      const byQ = new Map(tuning.map((r) => [r.item.q, r.status]));
      const body = qs.map((q) => `  ${JSON.stringify(q)}, // ${byQ.get(q)}`).join('\n');
      fs.writeFileSync(file, `/**\n * US 版 検索ベンチマークの失敗の凍結リスト (ラチェット)。${note}\n * 詳細は search-benchmark.us.test.ts の冒頭を参照。**手で足さない** — 足したくなったら退行している。\n */\nexport const US_KNOWN_FAILURES: string[] = [\n${body}\n];\n`);
    };
    const now = failing(tuning.filter((r) => r.item.kind !== 'chain')).map((r) => r.item.q);
    if (process.env.SEARCH_BENCH_US_WRITE_KNOWN === '1') write(now, '初期化: 現時点の失敗を全て凍結。');
    else if (process.env.SEARCH_BENCH_US_SHRINK === '1') write(US_KNOWN_FAILURES.filter((q) => now.includes(q)), '改善により縮小済み (増やしていない)。');
    expect(true).toBe(true);
  });
});
