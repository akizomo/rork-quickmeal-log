/**
 * Tests for my-foods.ts — My食品 (PRD §6.5.4) の純ロジック。
 */
import type { MyFood } from '@/types/my-food';
import {
  castMyFoods,
  castSearchRecents,
  deleteMyFood,
  findMyFoodByName,
  hasSameValues,
  myFoodAmountLabel,
  myFoodMacro,
  normalizeMyFoodName,
  overwriteMyFood,
  pushSearchRecent,
  recentMyFoods,
  saveMyFood,
  SEARCH_RECENT_LIMIT,
  searchMyFoods,
  sortMyFoodsByRecent,
  touchMyFood,
  updateMyFood,
} from './my-foods';

const T0 = '2026-10-25T00:00:00.000Z';
const T1 = '2026-10-26T00:00:00.000Z';
const T2 = '2026-10-27T00:00:00.000Z';

function food(id: string, name: string, lastUsedAtISO = T0, over: Partial<MyFood> = {}): MyFood {
  return { id, name, kcal: 300, protein: 10, fat: 5, carbs: 40, createdAtISO: T0, lastUsedAtISO, ...over };
}

const input = (name: string, kcal = 300, over: Record<string, unknown> = {}) => ({
  name,
  kcal,
  protein: 10 as number | null,
  fat: 5 as number | null,
  carbs: 40 as number | null,
  ...over,
});

describe('normalizeMyFoodName / findMyFoodByName', () => {
  it('前後の空白・全角半角・大文字小文字をそろえて比べる', () => {
    expect(normalizeMyFoodName('  ＡＢＣ  ')).toBe('abc');
    const foods = [food('a', 'Protein Bar')];
    expect(findMyFoodByName(foods, 'protein bar')?.id).toBe('a');
    expect(findMyFoodByName(foods, ' ＰＲＯＴＥＩＮ　ＢＡＲ ')?.id).toBe('a');
  });

  it('ひらがな / カタカナの違いは別名として扱う', () => {
    const foods = [food('a', 'ぷろていん')];
    expect(findMyFoodByName(foods, 'プロテイン')).toBeUndefined();
  });

  it('空の名前は見つけない', () => {
    expect(findMyFoodByName([food('a', 'x')], '   ')).toBeUndefined();
    expect(findMyFoodByName(undefined, 'x')).toBeUndefined();
  });
});

describe('saveMyFood', () => {
  it('新しい名前は作る (先頭に入る)', () => {
    const r = saveMyFood([food('a', '既存')], input('朝のスムージー', 250), T1, 'new1');
    expect(r.kind).toBe('created');
    if (r.kind !== 'created') return;
    expect(r.foods.map((f) => f.id)).toEqual(['new1', 'a']);
    expect(r.food).toMatchObject({ name: '朝のスムージー', kcal: 250, lastUsedAtISO: T1, createdAtISO: T1 });
  });

  it('名前が空・kcal が 0 以下は保存しない', () => {
    expect(saveMyFood([], input('  '), T1, 'n').kind).toBe('skipped');
    expect(saveMyFood([], input('x', 0), T1, 'n').kind).toBe('skipped');
  });

  it('同名で値も同じなら何も聞かず、最近使った時刻だけ更新する', () => {
    const r = saveMyFood([food('a', 'バー')], input(' バー '), T2, 'new');
    expect(r.kind).toBe('touched');
    if (r.kind !== 'touched') return;
    expect(r.foods).toHaveLength(1);
    expect(r.food.lastUsedAtISO).toBe(T2);
    expect(r.foods[0].createdAtISO).toBe(T0);
  });

  it('同名で値が違うときは conflict を返し、リストは変えない', () => {
    const base = [food('a', 'バー')];
    const r = saveMyFood(base, input('バー', 999), T2, 'new');
    expect(r.kind).toBe('conflict');
    if (r.kind !== 'conflict') return;
    expect(r.existing.id).toBe('a');
    expect(r.foods).toEqual(base);
  });

  it('PFC 未入力 (null) と 0 は区別する', () => {
    const base = [food('a', 'バー', T0, { protein: null, fat: null, carbs: null })];
    expect(saveMyFood(base, input('バー', 300, { protein: null, fat: null, carbs: null }), T1, 'n').kind).toBe('touched');
    expect(saveMyFood(base, input('バー', 300, { protein: 0, fat: 0, carbs: 0 }), T1, 'n').kind).toBe('conflict');
  });

  it('値は丸める (kcal は整数、PFC は小数1桁)', () => {
    const r = saveMyFood([], input('x', 250.6, { protein: 10.26 }), T1, 'n');
    if (r.kind !== 'created') throw new Error('created expected');
    expect(r.food.kcal).toBe(251);
    expect(r.food.protein).toBe(10.3);
  });
});

describe('overwriteMyFood / hasSameValues', () => {
  it('上書きは値を今回のものに更新し、最近使った時刻も更新する', () => {
    const next = overwriteMyFood([food('a', 'バー')], 'a', input('バー', 999), T2);
    expect(next[0]).toMatchObject({ kcal: 999, lastUsedAtISO: T2 });
  });

  it('単位名も値の一部として比べる', () => {
    expect(hasSameValues(food('a', 'x', T0, { unitLabel: '本' }), input('x', 300, { unitLabel: '本' }))).toBe(true);
    expect(hasSameValues(food('a', 'x'), input('x', 300, { unitLabel: '本' }))).toBe(false);
  });
});

describe('updateMyFood (編集画面)', () => {
  const foods = [food('a', 'バー'), food('b', 'スムージー')];

  it('名前・値を直せる。最近使った時刻は変えない', () => {
    const r = updateMyFood(foods, 'a', input('プロテインバー', 200));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.foods[0]).toMatchObject({ name: 'プロテインバー', kcal: 200, lastUsedAtISO: T0 });
  });

  it('ほかの My食品と同じ名前には直せない', () => {
    const r = updateMyFood(foods, 'a', input(' スムージー '));
    expect(r).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('自分自身と同じ名前 (大文字小文字だけ変える等) は直せる', () => {
    expect(updateMyFood([food('a', 'Bar')], 'a', input('bar')).ok).toBe(true);
  });

  it('存在しない id・不正な値は失敗する', () => {
    expect(updateMyFood(foods, 'zzz', input('x'))).toEqual({ ok: false, reason: 'notFound' });
    expect(updateMyFood(foods, 'a', input('', 100))).toEqual({ ok: false, reason: 'invalid' });
    expect(updateMyFood(foods, 'a', input('x', 0))).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('deleteMyFood / touchMyFood / 並び', () => {
  it('削除する', () => {
    expect(deleteMyFood([food('a', 'x'), food('b', 'y')], 'a').map((f) => f.id)).toEqual(['b']);
  });

  it('最近使った順 (新しい順) に並べ、棚には上位だけ出す', () => {
    const foods = [food('a', 'a', T0), food('b', 'b', T2), food('c', 'c', T1)];
    expect(sortMyFoodsByRecent(foods).map((f) => f.id)).toEqual(['b', 'c', 'a']);
    expect(recentMyFoods(foods, 2).map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('使うと先頭に上がる', () => {
    const foods = touchMyFood([food('a', 'a', T0), food('b', 'b', T1)], 'a', T2);
    expect(sortMyFoodsByRecent(foods)[0].id).toBe('a');
  });

  it('元の配列を書き換えない', () => {
    const foods = [food('a', 'a', T0), food('b', 'b', T1)];
    sortMyFoodsByRecent(foods);
    expect(foods.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

describe('myFoodMacro / myFoodAmountLabel', () => {
  const f = food('a', 'バー', T0, { kcal: 200, protein: 10, fat: null, carbs: 25 });

  it('1回分 × 倍率。PFC が null は 0', () => {
    expect(myFoodMacro(f, 1)).toEqual({ kcal: 200, protein: 10, fat: 0, carbs: 25 });
    expect(myFoodMacro(f, 1.5)).toEqual({ kcal: 300, protein: 15, fat: 0, carbs: 37.5 });
  });

  it('不正な倍率は ×1 として扱う', () => {
    expect(myFoodMacro(f, 0).kcal).toBe(200);
    expect(myFoodMacro(f, NaN).kcal).toBe(200);
  });

  it('量の表示: 単位名があれば「2本」、無ければ ×1 は空・それ以外は「× 2」', () => {
    expect(myFoodAmountLabel(f, 1)).toBeUndefined();
    expect(myFoodAmountLabel(f, 2)).toBe('× 2');
    expect(myFoodAmountLabel({ ...f, unitLabel: '本' }, 2)).toBe('2本');
  });
});

describe('searchMyFoods', () => {
  const foods = [food('a', 'プロテインバー', T0), food('b', '朝のスムージー', T2), food('c', 'PROTEIN shake', T1)];

  it('部分一致で、最近使った順に返す。カナ違い・大文字小文字は同一視して探す', () => {
    expect(searchMyFoods(foods, 'ぷろてい').map((f) => f.id)).toEqual(['a']);
    expect(searchMyFoods(foods, 'protein').map((f) => f.id)).toEqual(['c']);
    expect(searchMyFoods(foods, 'ばー').map((f) => f.id)).toEqual(['a']);
    expect(searchMyFoods(foods, 'スムージー').map((f) => f.id)).toEqual(['b']);
  });

  it('空の検索語は何も返さない', () => {
    expect(searchMyFoods(foods, '  ')).toEqual([]);
  });
});

describe('検索の「最近」', () => {
  it('先頭に足し、同じものは1件にまとめる', () => {
    const a = pushSearchRecent([], { kind: 'identity', id: 'rice', atISO: T0 });
    const b = pushSearchRecent(a, { kind: 'myFood', id: 'x', atISO: T1 });
    const c = pushSearchRecent(b, { kind: 'identity', id: 'rice', atISO: T2 });
    expect(c.map((r) => `${r.kind}:${r.id}`)).toEqual(['identity:rice', 'myFood:x']);
    expect(c[0].atISO).toBe(T2);
  });

  it('Identity と My食品は同じ id でも別物', () => {
    const r = pushSearchRecent([{ kind: 'identity', id: 'x', atISO: T0 }], { kind: 'myFood', id: 'x', atISO: T1 });
    expect(r).toHaveLength(2);
  });

  it('上限で打ち切る', () => {
    let list: ReturnType<typeof pushSearchRecent> = [];
    for (let i = 0; i < SEARCH_RECENT_LIMIT + 5; i++) list = pushSearchRecent(list, { kind: 'identity', id: `i${i}`, atISO: T0 });
    expect(list).toHaveLength(SEARCH_RECENT_LIMIT);
    expect(list[0].id).toBe(`i${SEARCH_RECENT_LIMIT + 4}`);
  });
});

describe('保存値の読み込み', () => {
  it('castMyFoods: 不正な要素を捨て、PFC の不正値は null にする', () => {
    const r = castMyFoods([
      { id: 'a', name: 'ok', kcal: 100, protein: 'x', fat: -1, carbs: 3, createdAtISO: T0, lastUsedAtISO: T1 },
      { id: 'b', name: '', kcal: 100 },
      { id: 'c', name: 'nokcal' },
      null,
      'str',
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'a', protein: null, fat: null, carbs: 3, lastUsedAtISO: T1 });
    expect(castMyFoods(undefined)).toEqual([]);
  });

  it('castSearchRecents: 不正な要素を捨てる', () => {
    expect(
      castSearchRecents([
        { kind: 'identity', id: 'rice', atISO: T0 },
        { kind: 'other', id: 'x', atISO: T0 },
        { kind: 'myFood', id: '', atISO: T0 },
        { kind: 'myFood', id: 'y' },
      ]),
    ).toEqual([{ kind: 'identity', id: 'rice', atISO: T0 }]);
  });
});
