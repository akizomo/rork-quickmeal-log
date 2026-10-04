import type { AmountSpec } from '@/types/identity';
import type { FoodLog } from '@/types/nutrition';
import { deriveUsualAmount, UsualAmountQuery } from './usual-amount';

const G_SPEC: AmountSpec = {
  unit: 'g',
  default: 200,
  step: 10,
  chips: [{ label: '1玉', value: 200 }, { label: '大盛', value: 280 }],
};

let seq = 0;
function log(amountValue: number, overrides: Partial<FoodLog> = {}): FoodLog {
  seq += 1;
  const day = String(seq).padStart(2, '0');
  return {
    id: `log-${seq}`,
    date: `2026-09-${day}`,
    timestamp: `2026-09-${day}T12:00:00.000Z`,
    mode: 'ingredient',
    categoryKey: 'staple',
    categoryLabel: '主食',
    macro: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    identityId: 'noodle_udon',
    attrKey: 'udon',
    amountValue,
    amountUnit: 'g',
    ...overrides,
  };
}

const QUERY: UsualAmountQuery = {
  identityId: 'noodle_udon',
  attributeKey: 'udon',
  defaultAttributeKey: 'udon',
  spec: G_SPEC,
};

describe('deriveUsualAmount', () => {
  it('3件未満では学習しない', () => {
    expect(deriveUsualAmount([log(320), log(320)], QUERY)).toBeUndefined();
  });

  it('打ち込みのゆれ (300/320/330) を中央値にまとめる', () => {
    expect(deriveUsualAmount([log(300), log(320), log(330)], QUERY)).toBe(320);
  });

  it('1回の外れ値では既定値が動かない / 合意が無ければ学習しない', () => {
    expect(deriveUsualAmount([log(200), log(400), log(320), log(250)], QUERY)).toBeUndefined();
  });

  it('外れ値が混じっても3件合意すれば採用', () => {
    expect(deriveUsualAmount([log(320), log(320), log(600), log(330), log(200)], QUERY)).toBe(320);
  });

  it('直近5件だけを見る (食べ方が変われば追従する)', () => {
    const old = [log(200), log(200), log(200), log(200), log(200)];
    const recent = [log(320), log(320), log(320), log(330), log(310)];
    expect(deriveUsualAmount([...old, ...recent], QUERY)).toBe(320);
  });

  it('既定値と同じなら undefined (何も変えない)', () => {
    expect(deriveUsualAmount([log(200), log(200), log(200)], QUERY)).toBeUndefined();
  });

  it('既存チップと同じ値でも返す (チップ側で選択済みにする)', () => {
    expect(deriveUsualAmount([log(280), log(280), log(280)], QUERY)).toBe(280);
  });

  it('種類が違うログは使わない', () => {
    const soba = [log(320, { attrKey: 'soba' }), log(320, { attrKey: 'soba' }), log(320, { attrKey: 'soba' })];
    expect(deriveUsualAmount(soba, QUERY)).toBeUndefined();
    expect(deriveUsualAmount(soba, { ...QUERY, attributeKey: 'soba' })).toBe(320);
  });

  it('attrKey 未保存のログは既定の種類として扱う', () => {
    const logs = [log(320, { attrKey: undefined }), log(320, { attrKey: undefined }), log(320)];
    expect(deriveUsualAmount(logs, QUERY)).toBe(320);
  });

  it('別 Identity・単位違い・編集中のログは除外する', () => {
    const logs = [
      log(320),
      log(320),
      log(320, { identityId: 'noodle_pasta' }),
      log(320, { amountUnit: 'piece' }),
      log(320, { id: 'editing' }),
    ];
    expect(deriveUsualAmount(logs, { ...QUERY, excludeLogId: 'editing' })).toBeUndefined();
  });

  it('% 単位: 旧 serving 値 (1.5) を 150 に換算して数える', () => {
    const spec: AmountSpec = { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] };
    const logs = [
      log(1.5, { identityId: 'udon', attrKey: undefined, amountUnit: 'piece' }),
      log(150, { identityId: 'udon', attrKey: undefined, amountUnit: 'piece' }),
      log(150, { identityId: 'udon', attrKey: undefined, amountUnit: 'piece' }),
    ];
    expect(deriveUsualAmount(logs, { identityId: 'udon', attributeKey: 'kake', defaultAttributeKey: 'kake', spec })).toBe(150);
  });

  it('個数: いつも2個なら2', () => {
    const spec: AmountSpec = { unit: 'piece', default: 1 };
    const logs = [2, 2, 3, 2].map((v) => log(v, { identityId: 'onigiri', attrKey: undefined, amountUnit: 'piece' }));
    expect(deriveUsualAmount(logs, { identityId: 'onigiri', attributeKey: undefined, defaultAttributeKey: undefined, spec })).toBe(2);
  });
});
