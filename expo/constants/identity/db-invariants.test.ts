/**
 * Identity DB の全件不変条件 (IA spec §3.4 / docs の「DB全体監査」)。
 *
 * 個別の報告を直すのではなく、**同じ型の穴を機械で見つける**ためのテスト群。
 * 2026-10-22 の5件の報告 (ソーセージが2枚 / 直接入力の調整シート / 唐揚げが「150個」…) は、
 * 全件を並べると同型が他にも数件あった。ここに型ごとの検査を置く:
 *
 *   A. 外部アンカー (unit-anchors.ts) … 1個/100g/1食あたり kcal と、数える単位のラベル。
 *      内部整合だけでは見えない「基準量の取り違え」(卵2個=72kcal) を捕まえる。
 *   B. Add-on との内部整合 … 同じ食材の「単品の1単位あたり」と asAddon の「1単位あたり」が
 *      大きく食い違わない。外部データ無しで効く。
 *   C. 量の読み取りの一本化 … 種類 (Attribute) が量の単位を上書きするので、Identity の
 *      amount を直接読むと種類別の単位が黙って無視される (記録カードが「150個」)。
 *
 * ラチェット: KNOWN_* は**監査時点で既に外れていた項目の凍結**。直したら外す (外さないと落ちる)。
 * 新しい外れが増えたら落ちる。是正ではなく凍結なので、各項目に理由を書く。
 */
import * as fs from 'fs';
import * as path from 'path';

import { ALL_IDENTITIES, ALL_US_IDENTITIES } from './index';
import { JP_ANCHORS, US_ANCHORS, type UnitAnchor } from './unit-anchors';
import type { Identity } from '@/types/identity';
import { getEffectiveAmountSpec } from '@/utils/identity-attribute';
import { resolveLog } from '@/utils/identity-resolver';
import { UNIT_LABELS } from '@/utils/unit-labels';

const SETS: { name: string; identities: Identity[]; anchors: UnitAnchor[]; lang: 'ja' | 'en-US' }[] = [
  { name: 'JP', identities: ALL_IDENTITIES, anchors: JP_ANCHORS, lang: 'ja' },
  { name: 'US', identities: ALL_US_IDENTITIES, anchors: US_ANCHORS, lang: 'en-US' },
];

const COUNT_UNITS = ['piece', 'plate', 'slice', 'cut'];

/** アンカーが比べる値: g/ml は100あたり、数え物は1単位あたり、percent/serving は既定量そのもの。 */
function anchorValue(identity: Identity, attrKey: string | undefined): { value: number; label: string; basis: string } {
  const spec = getEffectiveAmountSpec(identity, attrKey);
  const kcal = resolveLog({ originIdentityId: identity.id, attributeKey: attrKey }).baseMacro.kcal;
  const label = spec.unitLabel ?? UNIT_LABELS.ja[spec.unit];
  if (spec.unit === 'g' || spec.unit === 'ml') return { value: (kcal / spec.default) * 100, label, basis: `100${spec.unit}あたり` };
  if (COUNT_UNITS.includes(spec.unit)) return { value: kcal / spec.default, label, basis: '1単位あたり' };
  return { value: kcal, label, basis: '既定量(1食)' };
}

function findTarget(identities: Identity[], key: string): { identity?: Identity; attr?: string; error?: string } {
  const [id, attr] = key.split('/');
  const identity = identities.find((i) => i.id === id);
  if (!identity) return { error: `Identity "${id}" が無い` };
  if (attr && !identity.attributes?.some((a) => a.key === attr)) return { error: `${id} に種類 "${attr}" が無い` };
  return { identity, attr };
}

// ---------------------------------------------------------------------------
// A. 外部アンカー
// ---------------------------------------------------------------------------

/**
 * 外れていて、意図的に直していないアンカーの凍結リスト (現在は空)。
 * 数える単位の意味が変わる修正 (既定量の入れ替え) は、保存済みログの amountValue の解釈を
 * 変えてしまう (3個→1枚 にすると、既存の「3」が3枚=1503kcalに化ける)。utils/log-migrations.ts の
 * 移行とセットで直すこと。2026-10-22 にロースかつ/ヒレかつ/メンチ/コロッケ/たこ焼きを移行つきで解消した。
 */
const KNOWN_ANCHOR_VIOLATIONS = new Set<string>([]);

describe('A. 外部アンカー (1単位/100g/1食あたり kcal と数える単位)', () => {
  for (const set of SETS) {
    it(`[${set.name}] アンカーが指す Identity / 種類が DB に実在する (アンカーの腐敗防止)`, () => {
      const bad = set.anchors.map((a) => findTarget(set.identities, a.key).error && `${a.key}: ${findTarget(set.identities, a.key).error}`).filter(Boolean);
      expect(bad).toEqual([]);
    });

    it(`[${set.name}] アンカーのキーが重複していない`, () => {
      const keys = set.anchors.map((a) => a.key);
      expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    });

    const violations = (): string[] => {
      const out: string[] = [];
      for (const a of set.anchors) {
        const t = findTarget(set.identities, a.key);
        if (!t.identity) continue;
        const { value, label, basis } = anchorValue(t.identity, t.attr);
        const problems: string[] = [];
        if (value < a.kcal[0] || value > a.kcal[1]) problems.push(`${basis} ${Math.round(value)}kcal (期待 ${a.kcal[0]}–${a.kcal[1]})`);
        if (a.unitLabel && label !== a.unitLabel) problems.push(`単位「${label}」(期待「${a.unitLabel}」)`);
        if (problems.length) out.push(`${a.key}: ${problems.join(' / ')}`);
      }
      return out;
    };
    const keyOf = (v: string) => v.split(':')[0];

    it(`[${set.name}] 全アンカーが範囲内 (凍結リストを除く)`, () => {
      const added = violations().filter((v) => !KNOWN_ANCHOR_VIOLATIONS.has(keyOf(v)));
      expect(added).toEqual([]);
    });
  }

  it('凍結リストに、もう外れていない項目が残っていない (改善の固定)', () => {
    const current = new Set(SETS.flatMap((s) => {
      const out: string[] = [];
      for (const a of s.anchors) {
        const t = findTarget(s.identities, a.key);
        if (!t.identity) continue;
        const { value, label } = anchorValue(t.identity, t.attr);
        if (value < a.kcal[0] || value > a.kcal[1] || (a.unitLabel && label !== a.unitLabel)) out.push(a.key);
      }
      return out;
    }));
    expect([...KNOWN_ANCHOR_VIOLATIONS].filter((k) => !current.has(k))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// B. Add-on との内部整合
// ---------------------------------------------------------------------------

describe('B. 単品の1単位あたり kcal と asAddon の1単位あたり kcal が食い違わない', () => {
  // 同じ食材を「単品」で記録するのと「トッピング」で足すのとで、1個あたりが2倍以上ちがうのは
  // どちらかの基準量が間違っている。卵 (単品 36kcal/個 vs トッピング 90) と US ベーコン
  // (単品 74 vs 45) はこれで見つかった。調理油や衣を含む場合があるので許容は 0.5〜2倍。
  const KNOWN: Set<string> = new Set([]);
  const found = (): string[] => {
    const out: string[] = [];
    for (const set of SETS) {
      for (const id of set.identities) {
        if (!id.asAddon) continue;
        const spec = getEffectiveAmountSpec(id, undefined);
        if (spec.unit !== id.asAddon.unit) continue; // 単位が違うものは比べない
        const attrKey = id.attributes?.find((a) => a.isDefault)?.key ?? id.attributes?.[0]?.key;
        const base = resolveLog({ originIdentityId: id.id, attributeKey: attrKey }).baseMacro.kcal / spec.default;
        const addon = id.asAddon.addedMacro.kcal / id.asAddon.unitAmount;
        if (base < 10 || addon < 10) continue; // 極小は比にならない
        const ratio = base / addon;
        if (ratio < 0.5 || ratio > 2) out.push(`[${set.name}] ${id.id}: 単品 ${Math.round(base)}kcal/単位 vs トッピング ${Math.round(addon)}kcal/単位 (比 ${ratio.toFixed(2)})`);
      }
    }
    return out;
  };

  it('食い違いが増えていない', () => {
    const added = found().filter((v) => !KNOWN.has(v.split(':')[0].replace(/^\[\w+\] /, '')));
    expect(added).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// C. 量の読み取りの一本化
// ---------------------------------------------------------------------------

describe('C. 量 (amount) は getEffectiveAmountSpec 経由でだけ読む', () => {
  // 種類 (Attribute) が amount を上書きできる (ソーセージ=本、唐揚げ=g)。Identity の amount を
  // 直接読むと、その上書きが黙って無視される。Identity 基準そのものが欲しいときだけ、
  // 同じ行か直前の行に `amount-spec: identity-level` と理由を書く (意図的な例外の明示)。
  const ROOT = path.join(__dirname, '..', '..');
  const DIRS = ['utils', 'components', 'app', 'providers', 'hooks'];
  const SKIP_FILES = new Set(['utils/identity-attribute.ts']); // 実効値の解決そのもの
  const DIRECT = /\b(identity|origin|recordIdentity|amountRefIdentity|bucketIdentity|target)\.amount\b/;

  function walk(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dev' ? [] : walk(p);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
    });
  }

  it('Identity.amount の直接参照が無い (例外は amount-spec: identity-level で明示)', () => {
    const hits: string[] = [];
    for (const dir of DIRS) {
      for (const file of walk(path.join(ROOT, dir))) {
        const rel = path.relative(ROOT, file);
        if (SKIP_FILES.has(rel)) continue;
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
          if (!DIRECT.test(code)) return;
          if (/^\s*\*/.test(line)) return; // JSDoc 内
          const marked = [line, lines[i - 1] ?? '', lines[i - 2] ?? ''].some((l) => l.includes('amount-spec: identity-level'));
          if (!marked) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(hits).toEqual([]);
  });
});
