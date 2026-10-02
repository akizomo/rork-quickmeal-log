/**
 * 検索着地のリグレッションテスト (IA spec §4.1 / §1.5)
 *
 * searchTag は**書いても死んでいることがある** — v1.3 で判明した「ひらがなのみの
 * タグは漢字クエリに一切マッチしない」(§4.1) がその実例で、`side_seasoned` の
 * 「ちくぜんに」は書かれていたのに「筑前煮」では 0 件だった。
 * タグは「書いたこと」ではなく「**着地すること**」で検証する。
 *
 * サラダの「派生」は Identity を増やさず **base(`salad_raw`) + Add-on** で表現する
 * ため、派生名がどの層であれ `salad_raw` に着地することが組み立ての前提になる。
 * 着地は2つの独立した経路で担保されており、**両方**を守る:
 *   - 層1 (confident): `searchTags` による直接ヒット。頻出の派生名を昇格させる
 *   - 層2 (もしかして): `head-nouns.ts` の主辞「サラダ」による一般形の受け皿
 */
import { IDENTITY_REGISTRY } from '@/constants/identity';
import { describeSearchEntry, getVocabularyMatches, searchEntriesFuzzy } from './identity-search';

const search = (q: string) => searchEntriesFuzzy(q, { locale: 'ja' });

describe('サラダ派生の着地 — 層1 (searchTags)', () => {
  // 頻出の派生名は「もしかして」チップではなく**結果行**として直接出したい。
  it.each([
    'ギリシャ風サラダ',
    'ギリシャサラダ',
    'コブサラダ',
    'シーザーサラダ',
    'グリーンサラダ',
  ])('「%s」は層1で salad_raw に着地する', (query) => {
    const ids = search(query).confident.map((r) => r.entry.identity.id);
    expect(ids).toContain('salad_raw');
  });
});

describe('サラダ派生の着地 — 層2 (主辞辞書の一般形フォールバック)', () => {
  // ここが本体。**タグに無い派生名でも**主辞「サラダ」で salad_raw に着地する。
  // この経路が壊れると、派生名を1つずつ whitelist する羽目になる。
  it.each(['ニース風サラダ', 'チョップドサラダ', 'ビーンズサラダ'])(
    '「%s」は tag 未登録でも主辞経由で salad_raw に届く',
    (query) => {
      const viaVocabulary = getVocabularyMatches(query, 'ja');
      expect(viaVocabulary).toContainEqual(
        expect.objectContaining({ identity: 'salad_raw', source: 'head_noun' })
      );
    }
  );
});

describe('低脂チーズの着地', () => {
  it('「カッテージチーズ」は cheese_low_fat に着地する', () => {
    const ids = search('カッテージチーズ').confident.map((r) => r.entry.identity.id);
    expect(ids).toContain('cheese_low_fat');
  });

  // §4.1: ひらがなのみのタグは漢字クエリに一切マッチしない。
  it('「低脂質チーズ」(漢字) も cheese_low_fat に着地する', () => {
    const ids = search('低脂質チーズ').confident.map((r) => r.entry.identity.id);
    expect(ids).toContain('cheese_low_fat');
  });
});

describe('パン系の着地 (ガーリックトースト)', () => {
  // `bread` は searchTags が1つも無く、「トースト」「ガーリック〜」が全層で 0 件だった。
  // ガーリックトーストは 食パン + バター (butter_cream は bread の default Add-on 先頭) で
  // 表現できるため Identity は足さず、語彙だけで層1に着地させる (IA spec §1.5 判定1)。
  it.each(['ガーリックトースト', 'ガーリックブレッド', 'ガーリックパン', 'トースト'])(
    '「%s」は層1で bread に着地する',
    (query) => {
      const ids = search(query).confident.map((r) => r.entry.identity.id);
      expect(ids).toContain('bread');
    }
  );

  it.each(['バゲット', 'ガーリックバゲット'])('「%s」は bread のバゲット属性に着地する', (query) => {
    const hit = search(query).confident.find(
      (r) => r.entry.identity.id === 'bread' && r.entry.attribute?.key === 'baguette'
    );
    expect(hit).toBeDefined();
  });

  it('bread の default Add-on の先頭が butter_cream (ガーリックトーストの「バター」を1タップで足せる)', () => {
    // 並びを変えるとこの動線が崩れる。ガーリックトーストの脂質はほぼバター由来。
    expect(IDENTITY_REGISTRY.byId['bread']?.defaultAddonIds?.[0]).toBe('butter_cream');
  });
});

describe('Preset (ベース + Add-on の組み合わせ) の検索 — IA spec §1.5 判定3', () => {
  const firstOf = (q: string) => search(q).confident[0];

  // 組み合わせ名を打ったら、その Preset が先頭に出る。
  it.each([
    ['ガーリックトースト', 'garlic_toast'],
    ['卵かけご飯', 'tkg'],
    ['たまごかけごはん', 'tkg'],
    ['TKG', 'tkg'],
    ['納豆ご飯', 'natto_gohan'],
    ['ギリシャ風サラダ', 'greek_salad'],
    ['コブサラダ', 'cobb_salad'],
    ['味玉ラーメン', 'ajitama_ramen'],
    ['チャーシューメン', 'chashu_men'],
  ])('「%s」は Preset %s が先頭に出る', (query, presetId) => {
    expect(firstOf(query)?.entry.preset?.id).toBe(presetId);
  });

  // 総称を打ったときにタグへ途中一致した Preset が本体を押しのけない。
  // (Preset の途中一致を 0.1 割り引いている理由 — identity-search.ts)
  it.each(['ごはん', 'パン', 'トースト', 'ヨーグルト', 'ラーメン'])(
    '総称「%s」では Identity 本体が Preset より先に出る',
    (query) => {
      const first = firstOf(query);
      expect(first).toBeDefined();
      expect(first.entry.preset).toBeUndefined();
    }
  );

  it('Preset のベースは Preset が指す Identity / 種類 (ガーリックトースト = パン + フランスパン)', () => {
    const e = firstOf('ガーリックトースト').entry;
    expect(e.identity.id).toBe('bread');
    expect(e.attribute?.key).toBe('baguette');
  });

  it('Preset は同じ Identity の上限(4件)を食い合わない (「トースト」で複数の Preset が並ぶ)', () => {
    const presets = search('トースト').confident.filter((r) => r.entry.preset);
    expect(presets.length).toBeGreaterThan(4);
  });

  it('表示ラベルは「ベース + Add-on」の中身を出す', () => {
    const d = describeSearchEntry(firstOf('ガーリックトースト').entry);
    expect(d.label).toBe('ガーリックトースト');
    expect(d.identityLabel).toBe('フランスパン + バター');
  });

  it('表示ラベルは長い組み合わせを3要素に丸める (コブサラダ)', () => {
    const d = describeSearchEntry(firstOf('コブサラダ').entry);
    expect(d.identityLabel?.endsWith('…')).toBe(true);
    expect(d.identityLabel?.split(' + ')).toHaveLength(3);
  });

  it('Preset は US ロケールの検索には出ない (現状 JP のみ)', () => {
    const hits = searchEntriesFuzzy('toast', { locale: 'en-US' });
    expect([...hits.confident, ...hits.maybe].some((r) => r.entry.preset)).toBe(false);
  });
});

describe('天ぷらそば (語彙の穴 — Preset ではなく属性タグで解く)', () => {
  // `tempura_noodle` に「天そば」「天ぷらうどん」が既にあるため Preset にすると二重になる。
  // 属性名が「天そば」だけで「天ぷらそば」と打つと層1に着地しなかった。
  it.each(['天ぷらそば', 'てんぷらそば', '天ぷら蕎麦'])('「%s」は tempura_noodle の天そばに着地する', (query) => {
    const hit = search(query).confident.find(
      (r) => r.entry.identity.id === 'tempura_noodle' && r.entry.attribute?.key === 'tempura_soba'
    );
    expect(hit).toBeDefined();
  });
});
