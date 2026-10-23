/**
 * マクロ値を一次出典 (日本食品標準成分表(八訂)増補2023年) と機械で突き合わせる。
 *
 * これまでの不変条件 (db-invariants) は「自分のDB」や「記憶ベースの目安」と比べていた。ここでは
 * **公的な一次データ**と直接比べる。対応表は seibun-links.ts、同梱の抜粋は
 * constants/reference/seibun-2023.json (scripts/seibun-sync.ts で再生成)。手順は docs/MACRO_SOURCES.md。
 *
 * 照合の限界: 成分表は100gあたりしか持たない。個数基準 (1個・1枚・1本) の食品は重さが別に要り、
 * その重さは一次出典が無い目安なので、組成 (P/F/C のエネルギー比) だけを検査している。
 */
import { SEIBUN_LINKS } from './seibun-links';
import { ALL_IDENTITIES, ALL_US_IDENTITIES } from './index';
import { DISH_REFERENCES, DISH_REFERENCE_RETRIEVED_AT } from './dish-references';
import { EXTERNAL_CHECKS } from './external-checks';
import { compareDish, compareExternal, compareLink, SEIBUN_FOODS, SEIBUN_META } from '@/utils/seibun-compare';

/** 照合して範囲外だったが、理由があって直していない項目 (現在は空)。直したら外す。 */
const KNOWN_SEIBUN_DEVIATIONS: Record<string, string> = {};

describe('成分表との照合 (日本食品標準成分表 八訂 増補2023年)', () => {
  const results = SEIBUN_LINKS.map(compareLink);

  it('同梱の抜粋に出典・版・取得元ファイルの記録がある', () => {
    expect(SEIBUN_META.source).toContain('日本食品標準成分表（八訂）増補2023年');
    expect(SEIBUN_META.url).toMatch(/^https:\/\/www\.mext\.go\.jp\//);
    expect(SEIBUN_META.fileSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('対応表の食品名が、成分表の食品番号が指す実際の食品名と一致する (番号の取り違え防止)', () => {
    const bad = SEIBUN_LINKS.filter((l) => !SEIBUN_FOODS[l.foodNo]?.name.includes(l.food)).map(
      (l) => `${l.key}: ${l.foodNo} は「${SEIBUN_FOODS[l.foodNo]?.name}」で「${l.food}」を含まない`,
    );
    expect(bad).toEqual([]);
  });

  it('対応表のキーが DB に実在し、重複していない', () => {
    const all = new Map([...ALL_IDENTITIES, ...ALL_US_IDENTITIES].map((i) => [i.id, i]));
    const bad = SEIBUN_LINKS.filter((l) => {
      const [id, attr] = l.key.split('/');
      const identity = all.get(id);
      return !identity || (attr && !identity.attributes?.some((a) => a.key === attr));
    }).map((l) => l.key);
    expect(bad).toEqual([]);
    const keys = SEIBUN_LINKS.map((l) => l.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it('個数基準 (assumed) の食品に、重さの仮定が書かれている', () => {
    expect(SEIBUN_LINKS.filter((l) => l.weight === 'assumed' && !l.gramsPerUnit).map((l) => l.key)).toEqual([]);
  });

  it('DB の値が成分表の範囲内 (理由つきの凍結リストを除く)', () => {
    const out = results
      .filter((r) => r.problems.length > 0 && !(r.link.key in KNOWN_SEIBUN_DEVIATIONS))
      .map((r) => `${r.link.key} ← ${SEIBUN_FOODS[r.link.foodNo].name}: ${r.problems.join(' / ')}`);
    expect(out).toEqual([]);
  });

  it('凍結リストに、もう範囲内になった項目が残っていない (改善の固定)', () => {
    const outside = new Set(results.filter((r) => r.problems.length > 0).map((r) => r.link.key));
    expect(Object.keys(KNOWN_SEIBUN_DEVIATIONS).filter((k) => !outside.has(k))).toEqual([]);
  });

  it('照合済みの件数が減っていない (対応表を黙って縮めない)', () => {
    expect(SEIBUN_LINKS.length).toBeGreaterThanOrEqual(74);
  });
});

describe('成分表以外の出典との照合 (チェーンの公式値・USDA)', () => {
  it.each(EXTERNAL_CHECKS.map((c) => [c.link.key, c] as const))('%s が出典の値の範囲内', (_key, c) => {
    const r = compareExternal(c.link, c.ref);
    expect(r.problems).toEqual([]);
  });

  it('出典・URL・取得日が記録されている', () => {
    const bad = EXTERNAL_CHECKS.filter((c) => !/^https:\/\//.test(c.url) || !/^\d{4}-\d{2}-\d{2}$/.test(c.retrievedAt));
    expect(bad.map((c) => c.link.key)).toEqual([]);
  });
});

describe('料理 (%基準) とチェーン公式の栄養成分との照合', () => {
  // 範囲外だが理由があって直していない項目 (現在は空)
  const KNOWN_DISH_DEVIATIONS: Record<string, string> = {
    'katsudon_tendon/katsudon': 'なか卯1社のみ (995kcal/F39.7)。DB 850/F29 は kcal は範囲内だが脂質が約27%低い。かつや・松屋の公式を取れたら再判断',
    'udon/kitsune': 'なか卯 並 505/P23.5/F17.8 は揚げ玉・具が多く、成分表の積み上げ (395/P13/F8.5) と合わない。P23.5g は油揚げだけでは説明できず、公式の内訳が無いので比べきれない (他社の公式を取れたら再判断)',
    'udon/tsukimi': 'なか卯 並 413/F11.4 は具・揚げ玉を含み、成分表の積み上げ (375/F6.5) より大きい (同上)',
    'hot_dog_pita/hot_dog': 'モス1社・1品のみ。DB はバインミー・ピタ・アメリカンドッグも含む型で、ホットドッグ単体の脂質が高い (F23 vs 15)。他社の値が取れたら再判断',
  };
  const results = DISH_REFERENCES.map(compareDish);

  it('DB の1食の値が、複数チェーンの公式値の範囲の近くにある', () => {
    const out = results
      .filter((r) => r.problems.length > 0 && !(r.ref.key in KNOWN_DISH_DEVIATIONS))
      .map((r) => `${r.ref.key}: ${r.problems.join(' / ')}`);
    expect(out).toEqual([]);
  });

  it('凍結リストに、もう範囲内になった項目が残っていない (改善の固定)', () => {
    const outside = new Set(results.filter((r) => r.problems.length > 0).map((r) => r.ref.key));
    expect(Object.keys(KNOWN_DISH_DEVIATIONS).filter((k) => !outside.has(k))).toEqual([]);
  });

  it('各点に公式の出典URL・読み取り方法があり、取得日が記録されている', () => {
    expect(DISH_REFERENCE_RETRIEVED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const bad = DISH_REFERENCES.flatMap((r) => r.points.filter((p) => !/^https:\/\//.test(p.url) || !['table', 'page'].includes(p.readFrom)).map((p) => `${r.key}: ${p.item}`));
    expect(bad).toEqual([]);
  });

  it('対応表のキーが DB に実在する', () => {
    const all = new Map([...ALL_IDENTITIES, ...ALL_US_IDENTITIES].map((i) => [i.id, i]));
    const bad = DISH_REFERENCES.filter((r) => {
      const [id, attr] = r.key.split('/');
      const identity = all.get(id);
      return !identity || (attr && !identity.attributes?.some((a) => a.key === attr));
    }).map((r) => r.key);
    expect(bad).toEqual([]);
  });

  it('照合済みの料理が減っていない', () => {
    expect(DISH_REFERENCES.length).toBeGreaterThanOrEqual(27);
  });
});
