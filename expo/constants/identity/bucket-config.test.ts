/* sanity check (v1.2) */
import { INGREDIENT_BUCKETS, DISH_BUCKETS, IDENTITY_REGISTRY, INGREDIENT_IDENTITIES_BY_BUCKET, DISH_IDENTITIES_BY_BUCKET, buildRegistry, getBucketDef, getIdentitiesInBucket, resolveAddonRef } from './index';
import { IDENTITY_ADDON_REFS } from './addons';
import type { AppLocale } from '@/types/locale';

describe('v1.2 IA changes sanity', () => {
  it('soup Identity is in misc_dish, not veggies', () => {
    // v1.9: 味噌汁/豚汁/洋風/クリームの4 Identity → 1 (soup) に統合。
    expect(IDENTITY_REGISTRY.byId['soup']?.primaryHome.bucket).toBe('misc_dish');
    const veggieIds = INGREDIENT_IDENTITIES_BY_BUCKET.veggies.map(x => x.id);
    expect(veggieIds).not.toContain('soup');
    const miscIds = DISH_IDENTITIES_BY_BUCKET.misc_dish.map(x => x.id);
    expect(miscIds).toContain('soup');
  });
  it('veggies bucket label is 野菜', () => {
    const def = getBucketDef('veggies');
    expect(def?.label).toBe('野菜');
    expect(def?.shortLabel).toBe('野菜');
  });
  it('misc_dish bucket label is 定食・単品・汁', () => {
    const def = getBucketDef('misc_dish');
    expect(def?.label).toBe('定食・単品・汁');
    expect(def?.shortLabel).toBe('定食汁');
  });
  it('fatty_protein default = chicken_thigh', () => {
    expect(INGREDIENT_IDENTITIES_BY_BUCKET.fatty_protein[0]?.id).toBe('chicken_thigh');
  });
  it('fruit default = banana', () => {
    expect(INGREDIENT_IDENTITIES_BY_BUCKET.fruit[0]?.id).toBe('banana');
  });
  it('snack_drink bucket has quickTapDisabled', () => {
    const def = getBucketDef('snack_drink');
    expect(def?.quickTapDisabled).toBe(true);
  });
  it('chicken_thigh has no quickTapDisabled (now bucket default for fatty_protein short-tap)', () => {
    const x = IDENTITY_REGISTRY.byId['chicken_thigh'];
    expect(x?.quickTapDisabled).toBeFalsy();
  });
});

/**
 * 9ボタングリッド不変条件 (PRD §6.5.0 / QUICK_LOG_DESIGN.md ① / IA spec §1.5)
 *
 * 「9ボタン × 2タブ」は**認知負荷の物理上限**として固定された PRD レベルの契約で、
 * バケットを1つ足すだけでコア導線 (短押し=即記録) の前提が崩れる。にもかかわらず
 * v1.3 まで**件数を検証するテストが存在せず、人間の記憶だけが制約を守っていた**。
 *
 * 新しい料理ジャンルを足したくなったら、バケットではなく **Identity / Attribute の
 * 層**に足すこと。アルコールを新バケットではなく `snack_drink` 内クラスタで解決した
 * US-food-db-design.md §4.1 が先行事例。
 *
 * このテストが落ちたら「テストを直す」のではなく、**まず設計を疑う**。
 */
describe('9-button grid invariant (PRD-level contract)', () => {
  const LOCALES: AppLocale[] = ['ja', 'en-US'];

  it.each(LOCALES)('%s: ingredient tab has exactly 9 buckets', (locale) => {
    const buckets = buildRegistry(locale).buckets.filter((b) => b.tab === 'ingredient');
    expect(buckets).toHaveLength(9);
  });

  it.each(LOCALES)('%s: dish tab has exactly 9 buckets', (locale) => {
    const buckets = buildRegistry(locale).buckets.filter((b) => b.tab === 'dish');
    expect(buckets).toHaveLength(9);
  });

  it.each(LOCALES)('%s: no duplicate bucket keys across tabs', (locale) => {
    const keys = buildRegistry(locale).buckets.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Add-on 参照の健全性 (IA spec §5.2 / §5.4)
 *
 * `resolveAddonRef` は `IDENTITY_ADDON_REFS` に **ID が載っているかどうか**しか見ない。
 * そのため `asAddon` を持たない Identity を登録しても `{ type: 'identity' }` が返って
 * **成功したように見えるのに、マクロが一切乗らない**。§4.1 の「書いたのに死んでいる
 * searchTag」と同種の無言の失敗であり、テストが無ければ気づけない。
 *
 * v1.4 の `cheese_low_fat` / `edamame_soy` はこの逆 (Identity はあるが `asAddon` が
 * 無いため Add-on にできなかった) で、両者に `asAddon` を付与して解消した。
 */
describe('Add-on 参照の健全性', () => {
  it('IDENTITY_ADDON_REFS の全 ID が実在し、asAddon を持つ', () => {
    const broken = IDENTITY_ADDON_REFS.filter((id) => !IDENTITY_REGISTRY.byId[id]?.asAddon);
    expect(broken).toEqual([]);
  });

  it('salad_raw の default / allowed Add-on がすべて解決できる', () => {
    const salad = IDENTITY_REGISTRY.byId['salad_raw'];
    const ids = [...(salad?.defaultAddonIds ?? []), ...(salad?.allowedAddonIds ?? [])];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !resolveAddonRef(id))).toEqual([]);
  });

  // §5.4: default は 4–6 枠。追加は入れ替えであって、枠の拡張ではない。
  it('salad_raw の default Add-on は 6 枠以内', () => {
    expect(IDENTITY_REGISTRY.byId['salad_raw']?.defaultAddonIds?.length).toBeLessThanOrEqual(6);
  });

  it('salad_raw に低脂チーズと豆が Add-on として乗る (v1.4)', () => {
    const allowed = IDENTITY_REGISTRY.byId['salad_raw']?.allowedAddonIds ?? [];
    expect(allowed).toEqual(expect.arrayContaining(['cheese_low_fat', 'edamame_soy']));
  });
});
