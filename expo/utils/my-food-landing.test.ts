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
