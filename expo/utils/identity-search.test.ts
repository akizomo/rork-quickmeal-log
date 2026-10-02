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
import { getVocabularyMatches, searchEntriesFuzzy } from './identity-search';

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
