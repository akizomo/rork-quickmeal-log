/* sanity check (v1.2) */
import { INGREDIENT_BUCKETS, DISH_BUCKETS, IDENTITY_REGISTRY, INGREDIENT_IDENTITIES_BY_BUCKET, DISH_IDENTITIES_BY_BUCKET, getBucketDef, getIdentitiesInBucket } from './index';

describe('v1.2 IA changes sanity', () => {
  it('soup Identities are in misc_dish, not veggies', () => {
    expect(IDENTITY_REGISTRY.byId['miso_soup']?.primaryHome.bucket).toBe('misc_dish');
    expect(IDENTITY_REGISTRY.byId['tonjiru']?.primaryHome.bucket).toBe('misc_dish');
    expect(IDENTITY_REGISTRY.byId['soup_western']?.primaryHome.bucket).toBe('misc_dish');
    expect(IDENTITY_REGISTRY.byId['soup_creamy']?.primaryHome.bucket).toBe('misc_dish');
    const veggieIds = INGREDIENT_IDENTITIES_BY_BUCKET.veggies.map(x => x.id);
    expect(veggieIds).not.toContain('miso_soup');
    expect(veggieIds).not.toContain('tonjiru');
    const miscIds = DISH_IDENTITIES_BY_BUCKET.misc_dish.map(x => x.id);
    expect(miscIds).toContain('miso_soup');
    expect(miscIds).toContain('tonjiru');
    expect(miscIds).toContain('soup_western');
    expect(miscIds).toContain('soup_creamy');
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
