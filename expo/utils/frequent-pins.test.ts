/**
 * Tests for frequent-pins.ts — ⭐️ タブの「ピン留め優先 + 自動で補充」(PRD §6.5.3)。
 *
 * 並び・重複除去・「表示しない」・存在しない ID のガード・出現条件・編集操作を確認する。
 * Pure-logic layer, Node environment (no React Native APIs).
 */

import {
  addHidden,
  addPin,
  castIdList,
  composeFrequentItems,
  effectiveHiddenCount,
  effectivePinCount,
  movePin,
  movePinTo,
  myFoodIdFromPinKey,
  myFoodPinKey,
  pruneMyFoodPins,
  removeHidden,
  removePin,
  resolveHiddenItems,
  resolvePinnedItems,
  setPinned,
  shouldShowFrequentTab,
} from './frequent-pins';
import { FREQUENT_TAB_MIN_LOGS } from './quick-log-history';
import type { MyFood } from '@/types/my-food';
import type { QuickLogHistoryMap, QuickLogSelection } from '@/types/quick-log';

const NOW = new Date().toISOString();

function makeSel(categoryKey: string, subcategoryKey: string, daysAgo = 0): QuickLogSelection {
  return {
    categoryKey,
    subcategoryKey,
    amountValue: 100,
    amountUnit: 'g',
    amountLabel: '100g',
    amountCandidateKey: 'default',
    loggedAtISO: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  };
}

/** 頻度の高い順に udon (3回) > rice (2回) > natto (1回) > chicken_lean (1回・古い) */
const HISTORY: QuickLogHistoryMap = {
  japanese_noodles: [makeSel('japanese_noodles', 'udon', 0), makeSel('japanese_noodles', 'udon', 1), makeSel('japanese_noodles', 'udon', 2)],
  staple: [makeSel('staple', 'rice', 0), makeSel('staple', 'rice', 1)],
  dairy_soy: [makeSel('dairy_soy', 'natto', 0)],
  lean_protein: [makeSel('lean_protein', 'chicken_lean', 10)],
};

/** ピン留めの値 (Identity は ID そのもの、My食品は `myfood:<id>`) */
const ids = (items: { key: string }[]) => items.map((i) => i.key);

function makeFood(id: string, name: string): MyFood {
  return { id, name, kcal: 120, protein: null, fat: null, carbs: null, createdAtISO: NOW, lastUsedAtISO: NOW };
}

// ---------------------------------------------------------------------------
// composeFrequentItems — 並び
// ---------------------------------------------------------------------------

describe('composeFrequentItems — 並び', () => {
  it('ピン留めなし・非表示なしなら、従来どおり自動ランキングだけが並ぶ', () => {
    const { pinned, auto } = composeFrequentItems(HISTORY, { nowISO: NOW, autoLimit: 20 });
    expect(pinned).toEqual([]);
    expect(ids(auto)).toEqual(['udon', 'rice', 'natto', 'chicken_lean']);
    expect(auto.every((i) => i.source === 'auto')).toBe(true);
  });

  it('ピン留めはユーザーが決めた順で先頭に固定され、ランキングの順位は無関係', () => {
    const { pinned } = composeFrequentItems(HISTORY, {
      pins: ['chicken_lean', 'rice'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['chicken_lean', 'rice']);
    expect(pinned.every((i) => i.source === 'pinned')).toBe(true);
  });

  it('自動分からピン留め済みのものを除く (同じ Identity を二度出さない)', () => {
    const { pinned, auto } = composeFrequentItems(HISTORY, {
      pins: ['rice'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['rice']);
    expect(ids(auto)).toEqual(['udon', 'natto', 'chicken_lean']);
    const all = [...ids(pinned), ...ids(auto)];
    expect(new Set(all).size).toBe(all.length);
  });

  it('自動分から「表示しない」を除き、そのぶん下の候補が繰り上がる', () => {
    const { auto } = composeFrequentItems(HISTORY, {
      hidden: ['udon'],
      nowISO: NOW,
      autoLimit: 2,
    });
    expect(ids(auto)).toEqual(['rice', 'natto']);
  });

  it('履歴にまだ無い Identity もピン留めできる (回数の少ない新習慣を置ける)', () => {
    const { pinned, auto } = composeFrequentItems(HISTORY, {
      pins: ['tofu'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['tofu']);
    expect(ids(auto)).not.toContain('tofu');
    expect(pinned[0].kind === 'identity' && pinned[0].bucketKey).toBeTruthy();
    expect(pinned[0].label).toBeTruthy();
  });

  it('履歴が空でもピン留めだけは出る', () => {
    const { pinned, auto } = composeFrequentItems(undefined, {
      pins: ['rice', 'natto'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['rice', 'natto']);
    expect(auto).toEqual([]);
  });

  it('ピン留めは autoLimit に関係なく全部出す (枠を超えても隠さない)', () => {
    const { pinned, auto } = composeFrequentItems(HISTORY, {
      pins: ['rice', 'natto', 'udon', 'chicken_lean'],
      nowISO: NOW,
      autoLimit: 2,
    });
    expect(pinned).toHaveLength(4);
    expect(auto).toEqual([]);
  });

  it('autoLimit で自動分の候補数を打ち切る', () => {
    const { auto } = composeFrequentItems(HISTORY, { nowISO: NOW, autoLimit: 2 });
    expect(ids(auto)).toEqual(['udon', 'rice']);
  });

  it('ピン留めが「表示しない」にも入っていたら、ピン留めを優先して出す', () => {
    const { pinned, auto } = composeFrequentItems(HISTORY, {
      pins: ['rice'],
      hidden: ['rice'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['rice']);
    expect(ids(auto)).not.toContain('rice');
  });
});

// ---------------------------------------------------------------------------
// 存在しない Identity のガード
// ---------------------------------------------------------------------------

describe('存在しない Identity ID のガード', () => {
  it('辞書に無いピン留めは黙って除き、落ちない', () => {
    const { pinned } = composeFrequentItems(HISTORY, {
      pins: ['no_such_identity', 'rice', 'also_missing'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['rice']);
  });

  it('辞書に無い ID だけでも空になるだけ', () => {
    expect(resolvePinnedItems(['ghost'])).toEqual([]);
    expect(resolveHiddenItems(['ghost'])).toEqual([]);
    expect(effectivePinCount(['ghost'])).toBe(0);
    expect(effectiveHiddenCount(['ghost'])).toBe(0);
  });

  it('辞書に無い ID を「表示しない」に持っていても自動分は崩れない', () => {
    const { auto } = composeFrequentItems(HISTORY, {
      hidden: ['ghost'],
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(auto)).toEqual(['udon', 'rice', 'natto', 'chicken_lean']);
  });

  it('実効件数は辞書にあるものだけを数える', () => {
    expect(effectivePinCount(['rice', 'ghost', 'natto'])).toBe(2);
    expect(effectiveHiddenCount(['udon', 'ghost'])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// castIdList (保存値の読み込み)
// ---------------------------------------------------------------------------

describe('castIdList', () => {
  it('配列以外は空配列', () => {
    expect(castIdList(undefined)).toEqual([]);
    expect(castIdList(null)).toEqual([]);
    expect(castIdList('rice')).toEqual([]);
    expect(castIdList({ 0: 'rice' })).toEqual([]);
  });

  it('文字列以外・空文字を捨て、重複は先頭を残す', () => {
    expect(castIdList(['rice', 3, '', null, 'natto', 'rice'])).toEqual(['rice', 'natto']);
  });
});

// ---------------------------------------------------------------------------
// 編集操作
// ---------------------------------------------------------------------------

describe('addPin / removePin', () => {
  it('追加は末尾。すでにあれば何もしない', () => {
    expect(addPin(['rice'], 'natto')).toEqual(['rice', 'natto']);
    expect(addPin(['rice', 'natto'], 'rice')).toEqual(['rice', 'natto']);
    expect(addPin(undefined, 'rice')).toEqual(['rice']);
  });

  it('外す。無いものを外しても何も起きない', () => {
    expect(removePin(['rice', 'natto'], 'rice')).toEqual(['natto']);
    expect(removePin(['rice'], 'udon')).toEqual(['rice']);
    expect(removePin(undefined, 'udon')).toEqual([]);
  });
});

describe('movePin', () => {
  const base = ['rice', 'natto', 'udon'];

  it('1つ上 / 下へ動かす', () => {
    expect(movePin(base, 'natto', 'up')).toEqual(['natto', 'rice', 'udon']);
    expect(movePin(base, 'natto', 'down')).toEqual(['rice', 'udon', 'natto']);
  });

  it('先頭を上へ・末尾を下へは動かない', () => {
    expect(movePin(base, 'rice', 'up')).toEqual(base);
    expect(movePin(base, 'udon', 'down')).toEqual(base);
  });

  it('ピン留めに無い ID は動かない', () => {
    expect(movePin(base, 'ghost', 'up')).toEqual(base);
  });

  it('元の配列を書き換えない', () => {
    const copy = [...base];
    movePin(copy, 'natto', 'up');
    expect(copy).toEqual(base);
  });
});

describe('movePinTo', () => {
  const base = ['rice', 'natto', 'udon', 'tofu'];

  it('指定位置へ動かし、間の要素は1つずつずれる', () => {
    expect(movePinTo(base, 'rice', 2)).toEqual(['natto', 'udon', 'rice', 'tofu']);
    expect(movePinTo(base, 'tofu', 0)).toEqual(['tofu', 'rice', 'natto', 'udon']);
  });

  it('範囲外の位置は端に丸める', () => {
    expect(movePinTo(base, 'natto', 99)).toEqual(['rice', 'udon', 'tofu', 'natto']);
    expect(movePinTo(base, 'natto', -5)).toEqual(['natto', 'rice', 'udon', 'tofu']);
  });

  it('同じ位置・ピン留めに無い ID は何もしない', () => {
    expect(movePinTo(base, 'udon', 2)).toEqual(base);
    expect(movePinTo(base, 'ghost', 0)).toEqual(base);
  });

  it('元の配列を書き換えない', () => {
    const copy = [...base];
    movePinTo(copy, 'rice', 3);
    expect(copy).toEqual(base);
  });
});

describe('addHidden / removeHidden', () => {
  it('「表示しない」に追加 / 戻す', () => {
    expect(addHidden(['udon'], 'rice')).toEqual(['udon', 'rice']);
    expect(addHidden(['udon'], 'udon')).toEqual(['udon']);
    expect(removeHidden(['udon', 'rice'], 'udon')).toEqual(['rice']);
  });
});

describe('setPinned', () => {
  it('ピン留めすると末尾に付き、「表示しない」に入っていれば解く', () => {
    const next = setPinned({ pins: ['rice'], hidden: ['udon', 'natto'] }, 'udon', true);
    expect(next.pins).toEqual(['rice', 'udon']);
    expect(next.hidden).toEqual(['natto']);
  });

  it('外しても「表示しない」にはならない (自動分に戻るだけ)', () => {
    const next = setPinned({ pins: ['rice', 'udon'], hidden: [] }, 'rice', false);
    expect(next.pins).toEqual(['udon']);
    expect(next.hidden).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 出現条件
// ---------------------------------------------------------------------------

describe('shouldShowFrequentTab', () => {
  it('記録が閾値未満でピン留めなしなら出さない', () => {
    expect(shouldShowFrequentTab(FREQUENT_TAB_MIN_LOGS - 1, [])).toBe(false);
    expect(shouldShowFrequentTab(0, undefined)).toBe(false);
  });

  it('記録が閾値に達していれば、ピン留めなしでも出す (従来どおり)', () => {
    expect(shouldShowFrequentTab(FREQUENT_TAB_MIN_LOGS, [])).toBe(true);
  });

  it('記録が5件未満でも、ピン留めが1件あれば出す', () => {
    expect(shouldShowFrequentTab(0, ['rice'])).toBe(true);
    expect(shouldShowFrequentTab(FREQUENT_TAB_MIN_LOGS - 1, ['rice'])).toBe(true);
  });

  it('辞書に無い ID だけのピン留めでは出さない', () => {
    expect(shouldShowFrequentTab(0, ['ghost'])).toBe(false);
  });

  it('My食品を保存しただけでは出さない (v1.18。お気に入りに入れたら出す)', () => {
    const foods = [makeFood('a', 'いつものプロテイン')];
    expect(shouldShowFrequentTab(0, [], foods)).toBe(false);
    expect(shouldShowFrequentTab(0, [myFoodPinKey('a')], foods)).toBe(true);
  });

  it('削除した My食品だけのピン留めでは出さない', () => {
    expect(shouldShowFrequentTab(0, [myFoodPinKey('gone')], [makeFood('a', 'x')])).toBe(false);
    expect(shouldShowFrequentTab(0, [myFoodPinKey('a')], undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// My食品のピン留め (PRD v1.18)
// ---------------------------------------------------------------------------

describe('My食品のピン留め', () => {
  const foods = [makeFood('a', 'いつものプロテイン'), makeFood('b', '社食の日替わり')];

  it('ピン留めの値と My食品の id を行き来できる。Identity の ID は My食品と見なさない', () => {
    expect(myFoodIdFromPinKey(myFoodPinKey('a'))).toBe('a');
    expect(myFoodIdFromPinKey('rice')).toBeNull();
  });

  it('Identity と My食品を、保存された順のまま1本に並べる', () => {
    const { pinned } = composeFrequentItems(HISTORY, {
      pins: ['natto', myFoodPinKey('b'), 'rice', myFoodPinKey('a')],
      myFoods: foods,
      nowISO: NOW,
      autoLimit: 20,
    });
    expect(ids(pinned)).toEqual(['natto', myFoodPinKey('b'), 'rice', myFoodPinKey('a')]);
    const b = pinned[1];
    expect(b.kind).toBe('myFood');
    expect(b.kind === 'myFood' && b.myFoodId).toBe('b');
    expect(b.label).toBe('社食の日替わり');
    expect(pinned.every((i) => i.source === 'pinned')).toBe(true);
  });

  it('自動の補充には My食品を混ぜない', () => {
    const { auto } = composeFrequentItems(HISTORY, { pins: [myFoodPinKey('a')], myFoods: foods, nowISO: NOW, autoLimit: 20 });
    expect(auto.every((i) => i.kind === 'identity')).toBe(true);
    expect(ids(auto)).toEqual(['udon', 'rice', 'natto', 'chicken_lean']);
  });

  it('削除した My食品のピン留めは黙って除く (myFoods を渡さなければ My食品はすべて除く)', () => {
    expect(ids(resolvePinnedItems([myFoodPinKey('gone'), 'rice', myFoodPinKey('a')], foods))).toEqual(['rice', myFoodPinKey('a')]);
    expect(ids(resolvePinnedItems([myFoodPinKey('a'), 'rice']))).toEqual(['rice']);
    expect(effectivePinCount([myFoodPinKey('a'), 'rice'], foods)).toBe(2);
  });

  it('My食品を削除したら、その My食品のピン留めだけ外す (Identity は辞書に無くても残す)', () => {
    const pins = ['rice', myFoodPinKey('a'), 'ghost', myFoodPinKey('b')];
    expect(pruneMyFoodPins(pins, [foods[1]])).toEqual(['rice', 'ghost', myFoodPinKey('b')]);
    expect(pruneMyFoodPins(pins, [])).toEqual(['rice', 'ghost']);
  });

  it('並べ替え・外す・追加は、Identity と同じ操作で効く', () => {
    const pins = ['rice', myFoodPinKey('a')];
    expect(movePin(pins, myFoodPinKey('a'), 'up')).toEqual([myFoodPinKey('a'), 'rice']);
    expect(removePin(pins, myFoodPinKey('a'))).toEqual(['rice']);
    expect(setPinned({ pins: ['rice'] }, myFoodPinKey('b'), true).pins).toEqual(['rice', myFoodPinKey('b')]);
  });
});
