/**
 * Tests for identity-attribute.ts
 *
 * 「種類 (Attribute)」依存のトッピング・量解決を実データ (mochi / udon / soba /
 * fried_main) で検証する。Node 環境で動作 (RN API 非依存)。
 */

import { getIdentity } from '@/constants/identity';
import {
  getEffectiveAmountSpec,
  getEffectiveDefaultAddonIds,
  getHiddenAddonIds,
} from './identity-attribute';

describe('getEffectiveDefaultAddonIds', () => {
  it('種類に上書きが無ければ Identity の defaultAddonIds を返す (餅)', () => {
    const mochi = getIdentity('mochi')!;
    expect(getEffectiveDefaultAddonIds(mochi, 'mochi')).toEqual([
      'kinako',
      'honey',
      'nori_furikake',
    ]);
  });

  it('団子はみたらし/あんこへ差し替わる (報告バグの修正)', () => {
    const mochi = getIdentity('mochi')!;
    const dango = getEffectiveDefaultAddonIds(mochi, 'dango');
    expect(dango).toEqual(['mitarashi_tare', 'anko', 'kinako']);
    // 餅の海苔・はちみつは団子の既定には出ない
    expect(dango).not.toContain('nori_furikake');
    expect(dango).not.toContain('honey');
  });

  it('揚げもの: 唐揚げ=レモン/マヨ, とんかつ=ソース と出し分かれる', () => {
    const fried = getIdentity('fried_main')!;
    expect(getEffectiveDefaultAddonIds(fried, 'karaage')).toEqual(['lemon_squeeze', 'mayo']);
    expect(getEffectiveDefaultAddonIds(fried, 'tonkatsu')).toEqual(['sauce', 'mayo']);
    expect(getEffectiveDefaultAddonIds(fried, 'ebi_fry')).toEqual(['tartar', 'lemon_squeeze']);
  });

  it('hiddenAddonIds の Add-on は既定リストから除外される (月見うどんの卵)', () => {
    const udon = getIdentity('udon')!;
    // egg は Identity 既定に含まれるが、月見では factor 織り込み済みのため隠す
    expect(getEffectiveDefaultAddonIds(udon, 'kake')).toContain('egg');
    expect(getEffectiveDefaultAddonIds(udon, 'tsukimi')).not.toContain('egg');
  });

  it('属性キー未指定なら Identity 既定を返す', () => {
    const udon = getIdentity('udon')!;
    expect(getEffectiveDefaultAddonIds(udon, undefined)).toEqual(udon.defaultAddonIds);
  });
});

describe('getHiddenAddonIds', () => {
  it('該当属性の hiddenAddonIds を Set で返す (山かけそばのとろろ)', () => {
    const soba = getIdentity('soba')!;
    expect(getHiddenAddonIds(soba, 'yamakake').has('tororo')).toBe(true);
    expect(getHiddenAddonIds(soba, 'kake').size).toBe(0);
  });
});

describe('getEffectiveAmountSpec', () => {
  it('種類に量上書きが無ければ Identity.amount を返す', () => {
    const mochi = getIdentity('mochi')!;
    expect(getEffectiveAmountSpec(mochi, 'dango')).toBe(mochi.amount);
  });

  it('ベーグルは piece 単位・1個 に切り替わる', () => {
    const bread = getIdentity('bread')!;
    const spec = getEffectiveAmountSpec(bread, 'bagel');
    expect(spec.unit).toBe('piece');
    expect(spec.default).toBe(1);
    expect(spec.unitLabel).toBe('個');
  });

  it('ナンも piece 単位・1枚 に切り替わる', () => {
    const bread = getIdentity('bread')!;
    const spec = getEffectiveAmountSpec(bread, 'naan');
    expect(spec.unit).toBe('piece');
    expect(spec.default).toBe(1);
    expect(spec.unitLabel).toBe('枚');
  });

  it('食パン/全粒は Identity の g ベースのまま', () => {
    const bread = getIdentity('bread')!;
    expect(getEffectiveAmountSpec(bread, 'plain')).toBe(bread.amount);
    expect(getEffectiveAmountSpec(bread, 'whole')).toBe(bread.amount);
  });

  it('太巻きは 切 unitLabel に切り替わる', () => {
    const maki = getIdentity('maki')!;
    const spec = getEffectiveAmountSpec(maki, 'maki_thick');
    expect(spec.unitLabel).toBe('切');
    expect(spec.default).toBe(1);
  });

  it('いなりは 個 unitLabel、手巻きも 個', () => {
    const maki = getIdentity('maki')!;
    expect(getEffectiveAmountSpec(maki, 'inari').unitLabel).toBe('個');
    expect(getEffectiveAmountSpec(maki, 'temaki').unitLabel).toBe('個');
  });

  it('細巻きは Identity のまま (本)', () => {
    const maki = getIdentity('maki')!;
    expect(getEffectiveAmountSpec(maki, 'maki_thin')).toBe(maki.amount);
  });

  it('春巻は 2本 デフォルト', () => {
    const tenshin = getIdentity('tenshin')!;
    const spec = getEffectiveAmountSpec(tenshin, 'harumaki');
    expect(spec.default).toBe(2);
    expect(spec.unitLabel).toBe('本');
  });
});

describe('getEffectiveDefaultAddonIds — 今回追加分', () => {
  it('ramen_heavy: 味噌は Identity 既定(背脂なし default)', () => {
    const ramen = getIdentity('ramen_heavy')!;
    expect(getEffectiveDefaultAddonIds(ramen, 'miso')).not.toContain('seabura');
  });

  it('ramen_heavy: とんこつ/家系は背脂(seabura)が default に入る', () => {
    const ramen = getIdentity('ramen_heavy')!;
    expect(getEffectiveDefaultAddonIds(ramen, 'tonkotsu')).toContain('seabura');
    expect(getEffectiveDefaultAddonIds(ramen, 'iekei')).toContain('seabura');
  });

  it('gyudon_class: 親子丼は egg が hidden (卵が主菜)', () => {
    const gyudon = getIdentity('gyudon_class')!;
    expect(getHiddenAddonIds(gyudon, 'oyakodon').has('egg')).toBe(true);
    expect(getEffectiveDefaultAddonIds(gyudon, 'oyakodon')).not.toContain('egg');
  });

  it('gyudon_class: 牛丼は egg が default に含まれる', () => {
    const gyudon = getIdentity('gyudon_class')!;
    expect(getEffectiveDefaultAddonIds(gyudon, 'gyudon')).toContain('egg');
  });

  it('gyudon_class: ねぎとろ丼は default addon が空', () => {
    const gyudon = getIdentity('gyudon_class')!;
    expect(getEffectiveDefaultAddonIds(gyudon, 'negitoro')).toHaveLength(0);
  });

  it('okonomi: たこ焼きは sauce のみ default', () => {
    const okonomi = getIdentity('okonomi')!;
    expect(getEffectiveDefaultAddonIds(okonomi, 'takoyaki')).toEqual(['sauce']);
    expect(getEffectiveDefaultAddonIds(okonomi, 'takoyaki')).not.toContain('egg');
    expect(getEffectiveDefaultAddonIds(okonomi, 'takoyaki')).not.toContain('cheese');
  });

  it('okonomi: お好み焼きは sauce/mayo/削り節/卵の Identity 既定', () => {
    const okonomi = getIdentity('okonomi')!;
    const def = getEffectiveDefaultAddonIds(okonomi, 'okonomiyaki');
    expect(def).toContain('sauce');
    expect(def).toContain('mayo');
    expect(def).toContain('katsuobushi');
    expect(def).toContain('egg');
  });
});
