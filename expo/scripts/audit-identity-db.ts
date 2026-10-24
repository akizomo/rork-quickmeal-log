/**
 * audit-identity-db.ts — Identity DB の全件監査表を出す (JP / US)。
 *
 * 目的: 「触ったところだけ確認する」から「全件を一度に見る」へ。ソーセージが「枚」だった
 * ような単位の食い違い、既定量での kcal の外れ値、量チップの欠落などを一覧で目視できる。
 * 機械的に判定できる不変条件は constants/identity/db-invariants.test.ts に置く。
 *
 * 使い方:  bun scripts/audit-identity-db.ts [--locale ja|en] [--csv] > audit.md
 *
 * 1行 = 1 (Identity, 種類) の組。種類を持たない Identity は1行。
 * 数値は resolveLog の baseMacro (既定のスタイル・既定量・Add-on なし)。
 */
import { ALL_IDENTITIES, ALL_US_IDENTITIES } from '@/constants/identity';
import type { AmountSpec, Identity } from '@/types/identity';
import { getEffectiveAmountSpec } from '@/utils/identity-attribute';
import { resolveLog } from '@/utils/identity-resolver';
import { UNIT_LABELS } from '@/utils/unit-labels';

const args = process.argv.slice(2);
const locale = args.includes('--locale') ? args[args.indexOf('--locale') + 1] : 'ja';
const csv = args.includes('--csv');
const set: Identity[] = locale === 'en' ? ALL_US_IDENTITIES : ALL_IDENTITIES;
const uiLang = locale === 'en' ? 'en-US' : 'ja';

function unitText(spec: AmountSpec): string {
  const label = spec.unitLabel ?? (UNIT_LABELS as any)[uiLang]?.[spec.unit] ?? spec.unit;
  return `${spec.default}${label}`;
}

type Row = Record<string, string | number>;
const rows: Row[] = [];

for (const id of set) {
  const attrs = id.attributes?.length ? id.attributes : [undefined];
  for (const a of attrs) {
    if (a?.migration) {
      rows.push({ id: id.id, attr: a.key, label: a.label, unit: '→移行', kcal: '', P: '', F: '', C: '', perUnit: '', flags: `migration→${a.migration.identityKey}` });
      continue;
    }
    const spec = getEffectiveAmountSpec(id, a?.key);
    const m = resolveLog({ originIdentityId: id.id, attributeKey: a?.key }).baseMacro;
    const flags: string[] = [];

    // 単位の食い違い: 種類ごとに数える単位が違いそうなのに上書きが無い
    //   (Identity 共通の unitLabel が 枚/本/個 のとき、同じ Identity 内で他の種類が別単位を持つ)
    if (a && !a.amount && id.attributes?.some((o) => o.amount && o.amount.unit !== id.amount.unit)) {
      flags.push('単位: 他の種類は上書き済み、これは Identity 共通');
    }
    const perUnit = spec.unit === 'piece' || spec.unit === 'plate' || spec.unit === 'slice' || spec.unit === 'cut'
      ? m.kcal / spec.default
      : spec.unit === 'g' || spec.unit === 'ml' ? (m.kcal / spec.default) * 100 : NaN;
    if (spec.unit === 'g' && perUnit > 900) flags.push('kcal/100g が 900 超 (純脂肪超え)');
    if (spec.unit === 'piece' && perUnit > 500) flags.push('1個 500kcal 超');
    if (spec.unit === 'piece' && perUnit < 5) flags.push('1個 5kcal 未満');
    if (m.kcal > 1200) flags.push('既定量 1200kcal 超');
    if (m.kcal < 5 && !['sugar_free'].includes(id.id)) flags.push('既定量 5kcal 未満');
    if (spec.chips && !spec.chips.some((c) => c.value === spec.default)) flags.push('既定量に対応するチップ無し');
    if (!id.searchTags?.length && !a?.searchTags?.length && /[一-鿿]/.test(a?.label ?? id.label)) flags.push('漢字ラベルで読み(ひらがな)タグ無し');

    rows.push({
      id: id.id, attr: a?.key ?? '', label: a?.label ?? id.label, unit: unitText(spec),
      kcal: Math.round(m.kcal), P: +m.protein.toFixed(1), F: +m.fat.toFixed(1), C: +m.carbs.toFixed(1),
      perUnit: Number.isNaN(perUnit) ? '' : Math.round(perUnit), flags: flags.join(' / '),
    });
  }
}

const cols = ['id', 'attr', 'label', 'unit', 'kcal', 'P', 'F', 'C', 'perUnit', 'flags'];
if (csv) {
  console.log(cols.join(','));
  for (const r of rows) console.log(cols.map((c) => JSON.stringify(r[c] ?? '')).join(','));
} else {
  console.log(`# Identity DB 監査表 (${locale}) — ${set.length} Identity / ${rows.length} 行\n`);
  console.log(`| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|`);
  for (const r of rows) console.log(`| ${cols.map((c) => String(r[c] ?? '')).join(' | ')} |`);
  const flagged = rows.filter((r) => r.flags);
  console.log(`\n## 要確認 (${flagged.length}行)\n`);
  for (const r of flagged) console.log(`- ${r.id}${r.attr ? '/' + r.attr : ''} ${r.label}: ${r.flags}`);
}
