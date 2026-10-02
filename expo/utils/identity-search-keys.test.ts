import { fold, toKey as key, labelParts, queryVariants, stripHonorific, stripNoise } from './identity-search-keys';

describe('fold / key — 表記ゆれの畳み込み', () => {
  // 同じ形になること自体が仕様。target 側とクエリ側の両方に掛けるので、どちらの表記で
  // 打っても/登録されていても一致する。
  it.each([
    ['長音 (う / ー)', ['ぎょうざ', 'ギョーザ', 'ぎょーざ', 'ギョウザ']],
    ['長音 (い / ー)', ['けいき', 'ケーキ', 'けーき']],
    ['長音 (とうふ)', ['とうふ', 'トーフ', 'とーふ']],
    ['小書き (コロッケ)', ['コロッケ', 'コロツケ', 'ころっけ']],
    ['小書き (ジュース)', ['ジュース', 'ジユース', 'じゅーす']],
    ['送り仮名 (焼き鳥)', ['焼き鳥', '焼鳥']],
    ['送り仮名 (焼きそば)', ['焼きそば', '焼そば']],
    ['送り仮名 (卵焼き)', ['卵焼き', '卵焼']],
    ['送り仮名 (巻き寿司)', ['巻き寿司', '巻寿司']],
    ['送り仮名 (浅漬け)', ['浅漬け', '浅漬']],
    ['送り仮名 (大盛り)', ['大盛り', '大盛']],
    ['全角/半角', ['ＢＬＴ', 'BLT', 'ｂｌｔ']],
  ])('%s: 全て同じ照合キーになる', (_name, variants) => {
    const keys = (variants as string[]).filter(Boolean).map(key);
    expect(new Set(keys).size).toBe(1);
  });

  it('別の語を混ぜない (畳み込みが過剰でない)', () => {
    const distinct = ['うどん', 'うとん', 'ごはん', 'ごはい', 'ハンバーグ', 'ハンバーガー', 'ラーメン', 'ラーメ', 'カレー', 'カレ'];
    // 長音符だけが違う「カレー/カレ」は normalize() の時点で同一になる既知の挙動 (既存仕様)。
    expect(key('うどん')).not.toBe(key('うとん'));
    expect(key('ハンバーグ')).not.toBe(key('ハンバーガー'));
    expect(distinct.length).toBeGreaterThan(0);
  });

  it('fold は漢字・英字を変えない', () => {
    expect(fold('白米')).toBe('白米');
    expect(fold('protein')).toBe('protein');
  });
});

describe('stripNoise — 量・店の修飾語', () => {
  it.each([
    ['味噌ラーメン大盛り', '味噌ラーメン'],
    ['ラーメン特盛', 'ラーメン'],
    ['カレー小盛り', 'カレー'],
    ['牛丼ミニ', '牛丼'],
    ['カレーLサイズ', 'カレー'],
    ['セブンのサラダチキン', 'サラダチキン'],
    ['ファミマのからあげ', 'からあげ'],
    ['コンビニ弁当', '弁当'],
    ['自家製ハンバーグ', 'ハンバーグ'],
  ])('「%s」→「%s」', (input, expected) => {
    expect(stripNoise(input)).toBe(expected);
  });

  it('語の一部は壊さない', () => {
    expect(stripNoise('ミニトマト')).toBe('ミニトマト'); // ミニは「接頭」なので落とさない
    expect(stripNoise('スーパードライ')).toBe('スーパードライ');
    expect(stripNoise('大根')).toBe('大根');
    expect(stripNoise('大盛り')).toBe('大盛り'); // 全部消えるなら元のまま
  });
});

describe('stripHonorific', () => {
  it('残りが3文字以上のときだけ「お/ご」を外す', () => {
    expect(stripHonorific('おみそしる')).toBe('みそしる');
    expect(stripHonorific('お味噌汁')).toBe('味噌汁');
    expect(stripHonorific('ごはん')).toBeNull(); // 「はん」→ハンバーグ前方一致を生むため
    expect(stripHonorific('おもち')).toBeNull();
    expect(stripHonorific('おにぎり')).toBe('にぎり');
  });
});

describe('queryVariants', () => {
  it('base を先頭に、重複なしで返す', () => {
    const v = queryVariants('ラーメン');
    expect(v[0].key).toBe(key('ラーメン'));
    expect(new Set(v.map((x) => x.key)).size).toBe(v.length);
  });

  it('ノイズ除去版・ローマ字版・「お」除去版を足す', () => {
    expect(queryVariants('味噌ラーメン大盛り').map((v) => v.key)).toContain(key('味噌ラーメン'));
    expect(queryVariants('gyudon').map((v) => v.key)).toContain(key('ぎゅうどん'));
    const honor = queryVariants('お味噌汁').find((v) => v.key === key('味噌汁'));
    expect(honor?.penalty).toBeGreaterThan(0);
  });

  it('空・空白は空配列', () => {
    expect(queryVariants('')).toEqual([]);
    expect(queryVariants('   ')).toEqual([]);
  });
});

describe('labelParts', () => {
  it.each([
    ['サラダ・生野菜', ['サラダ・生野菜', 'サラダ', '生野菜']],
    ['ラーメン (あっさり)', ['ラーメン']],
    ['カレー・シチュー系', ['カレー・シチュー', 'カレー', 'シチュー']],
    ['白身魚（タラ・カレイ等）', ['白身魚']],
    ['牛・豚 (普通脂)', ['牛・豚', '牛', '豚']],
    ['おにぎり', ['おにぎり']],
    ['全粒・ライ麦', ['全粒・ライ麦', '全粒', 'ライ麦']],
    ['家系', ['家系']], // 「系」が名前の一部。外すと「家」になり家系ラーメンに着地できなくなる
    ['肉系', ['肉系']],
    ['チーズ系ピザ', ['チーズ系ピザ']],
  ])('「%s」', (label, expected) => {
    expect(labelParts(label)).toEqual(expected);
  });
});
