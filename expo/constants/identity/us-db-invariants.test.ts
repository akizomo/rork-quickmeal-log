/**
 * US 食事データの不変条件 (日本語版は db-invariants.test.ts)。
 * 初回測定 (2026-11-07) で見つかった食い違いは、凍結して増やさないことから始める。
 */
import { buildRegistry } from './index';

const registry = buildRegistry('en-US', 'en-US');
const all = Object.entries(registry.byBucket).flatMap(([bucket, ids]) => ids.map((i) => ({ bucket, i })));

/**
 * 同じ ID の Identity が 2 つの入口 (食材タブと料理タブ) にある。
 * 保存済みのログは ID で引くため、どちらの定義 (1食 150kcal の食材 / 300kcal の料理) で表示されるかが
 * 登録順で決まってしまう (GLOBAL_BY_ID は後勝ち)。直すときは保存済みログの移行 (utils/log-migrations.ts) とセット。
 */
const KNOWN_DUPLICATE_IDS: string[] = ['us_oatmeal'];

describe('US 食事データ — Identity の不変条件', () => {
  it('ID が全バケットで一意 (既知の重複を除く。増やさない・解消したら外す)', () => {
    const seen = new Map<string, string[]>();
    for (const { bucket, i } of all) seen.set(i.id, [...(seen.get(i.id) ?? []), bucket]);
    const dup = [...seen.entries()].filter(([, b]) => b.length > 1).map(([id]) => id).sort();
    expect(dup).toEqual([...KNOWN_DUPLICATE_IDS].sort());
  });

  it('Identity の ID が us_ で始まる (日本語版の ID と衝突しない)', () => {
    expect(all.filter(({ i }) => !i.id.startsWith('us_')).map(({ i }) => i.id)).toEqual([]);
  });

  it('種類 (attributes) のキーが Identity 内で一意', () => {
    const bad = all.filter(({ i }) => {
      const keys = (i.attributes ?? []).map((a) => a.key);
      return new Set(keys).size !== keys.length;
    });
    expect(bad.map(({ i }) => i.id)).toEqual([]);
  });

  it('既定の種類 (isDefault) が 2 つ以上ある Identity が無い', () => {
    const bad = all.filter(({ i }) => (i.attributes ?? []).filter((a) => a.isDefault).length > 1);
    expect(bad.map(({ i }) => i.id)).toEqual([]);
  });

  it('既定のマクロが妥当 (kcal > 0 または 0kcal 飲料、P/F/C が負でない)', () => {
    const bad = all.filter(({ i }) => {
      const m = i.defaultMacro;
      return !(m.kcal >= 0 && m.protein >= 0 && m.fat >= 0 && m.carbs >= 0);
    });
    expect(bad.map(({ i }) => i.id)).toEqual([]);
  });
});
