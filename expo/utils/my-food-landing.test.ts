/**
 * Tests for my-food-landing.ts — 名前が検索の確実な一致 (層1) に着地するか (PRD §6.5.4)。
 */
import { findLayer1Landing } from './my-food-landing';

describe('findLayer1Landing', () => {
  it('辞書にある名前は層1に着地する', () => {
    const r = findLayer1Landing('納豆', 'ja');
    expect(r).not.toBeNull();
    expect(r?.entry.identity.id).toBe('natto');
  });

  it('辞書にない名前は着地しない', () => {
    expect(findLayer1Landing('ぐるぐるぴょん特製', 'ja')).toBeNull();
  });

  it('1文字・空は誤検知を避けて着地させない', () => {
    expect(findLayer1Landing('あ', 'ja')).toBeNull();
    expect(findLayer1Landing('   ', 'ja')).toBeNull();
  });
});

import { buildMyFoodShareText, classifyMyFoodNames } from './my-food-landing';

describe('classifyMyFoodNames / buildMyFoodShareText', () => {
  const foods = [{ name: '納豆' }, { name: 'ぐるぐるぴょん特製' }, { name: '社食のカレー' }];

  it('DB に着地するかで2つに分ける', () => {
    const { landed, notLanded } = classifyMyFoodNames(foods, 'ja');
    expect(landed.map((f) => f.name)).toContain('納豆');
    expect(notLanded.map((f) => f.name)).toContain('ぐるぐるぴょん特製');
  });

  it('共有本文は名前と着地の別だけで、数値は含まない。着地なしを先に並べる', () => {
    const text = buildMyFoodShareText(
      [
        { name: '納豆', kcal: 100 },
        { name: 'ぐるぐるぴょん特製', kcal: 999 },
      ],
      '2026-10-26T00:00:00.000Z',
      'ja',
    );
    const lines = text.split('\n');
    expect(lines[0]).toBe('Hachibu my-foods 2026-10-26');
    expect(lines[2]).toBe('no-match\tぐるぐるぴょん特製');
    expect(lines).toContain('matches-db\t納豆');
    expect(text).not.toMatch(/999|100/);
  });

  it('0件でもヘッダーだけの本文になる', () => {
    expect(buildMyFoodShareText([], '2026-10-26T00:00:00.000Z', 'ja').split('\n')).toHaveLength(2);
  });
});
