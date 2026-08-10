import { normalize, romajiVariant } from '@/utils/identity-normalize';

describe('normalize', () => {
  // SEARCH_SPEC v0.4 §5.1.3 T1〜T10 のうち、アルゴリズムのみで解決するもの
  test('T2: 長音ありのカタカナはひらがな化 + 長音除去される', () => {
    expect(normalize('ぶろっこりー')).toBe('ぶろっこり');
  });

  test('T3: 半角カナはNFKCで全角化されひらがな化される', () => {
    expect(normalize('ﾌﾞﾛｯｺﾘｰ')).toBe('ぶろっこり');
  });

  test('T10: 長音省略表記も長音除去後の形と一致する', () => {
    expect(normalize('ブロッコリ')).toBe('ぶろっこり');
  });

  test('全角英数はNFKCで半角化され小文字化される', () => {
    expect(normalize('Ｂｒｏｃｃｏｌｉ')).toBe('broccoli');
  });

  test('英語はそのまま保持する (ローマ字変換されない)', () => {
    expect(normalize('chicken')).toBe('chicken');
  });

  test('空文字・空白のみは空文字を返す', () => {
    expect(normalize('  ')).toBe('');
  });

  test('冪等性: 正規化済み文字列に再適用しても結果が変わらない', () => {
    const once = normalize('ブロッコリー');
    expect(normalize(once)).toBe(once);
  });
});

describe('romajiVariant', () => {
  // T4: ローマ字入力 (ヘボン式)
  test('T4: burokkori はブロッコリーの正規化形と一致する', () => {
    expect(romajiVariant('burokkori')).toBe(normalize('ブロッコリー'));
  });

  test('清音・拗音・促音・撥音を変換する', () => {
    expect(romajiVariant('karaage')).toBe('からあげ');
    expect(romajiVariant('nattou')).toBe('なっとう');
    expect(romajiVariant('tamagoyaki')).toBe('たまごやき');
    expect(romajiVariant('kyabetsu')).toBe('きゃべつ');
  });

  test('訓令式 (si/ti/tu/hu) もヘボン式と同じ読みになる', () => {
    expect(romajiVariant('sasimi')).toBe(romajiVariant('sashimi'));
    expect(romajiVariant('tya')).toBe(romajiVariant('cha'));
  });

  test('未対応文字はそのまま残る (例外を投げない)', () => {
    expect(() => romajiVariant('xyz123!?')).not.toThrow();
  });

  test('asciiを含まないクエリはnormalizeと同じ結果になる', () => {
    expect(romajiVariant('ぶろっこりー')).toBe(normalize('ぶろっこりー'));
  });

  test('英語searchTagsとのマッチングを壊さない: chick は chicken の正規化形の接頭辞のまま', () => {
    // ローマ字変換を挟まない base 側 (normalize) で前方一致が保たれることを保証する。
    expect(normalize('chicken').startsWith(normalize('chick'))).toBe(true);
  });
});
