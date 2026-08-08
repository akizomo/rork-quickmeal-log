/**
 * Data-integrity check: every Identity `amount` spec (top-level and
 * per-attribute overrides) must resolve to a self-consistent
 * AmountEditConfig — i.e. its own `default` and every `chip.value` must
 * satisfy isValidAmount() against the min/step that buildIdentityAmountEditConfig
 * derives for it. Catches step/min misalignment introduced when editing
 * amount specs by hand (e.g. adding a coarser `step` without adjusting `min`).
 *
 * 無効な値は「シートでチップを選べるのにダイアログを開くと別の値に化ける」
 * という形で表面化する (snapToStep + clampToRange が黙って丸めるため)。
 *
 * かつて piece/percent は「既知の未整合」として除外していたが、入力グリッドを
 * ステッパー刻みから分離した (数え物 0.25 / % 1) ことで全単位が整合したため
 * 除外を解除した。
 */
import { ALL_IDENTITIES } from './index';
import { buildIdentityAmountEditConfig, isValidAmount } from '@/utils/amount-edit';
import { AmountSpec } from '@/types/identity';

function checkSpec(label: string, spec: AmountSpec) {
  const config = buildIdentityAmountEditConfig(spec);
  it(`${label}: default (${spec.default}${spec.unit}) is valid`, () => {
    expect(isValidAmount(spec.default, config)).toBe(true);
  });
  (spec.chips ?? []).forEach((chip) => {
    it(`${label}: chip "${chip.label}" (${chip.value}${spec.unit}) is valid`, () => {
      expect(isValidAmount(chip.value, config)).toBe(true);
    });
  });
}

describe('Identity amount spec consistency (min/step/chips alignment)', () => {
  for (const identity of ALL_IDENTITIES) {
    checkSpec(identity.id, identity.amount);
    for (const attr of identity.attributes ?? []) {
      if (attr.amount) checkSpec(`${identity.id}.attributes.${attr.key}`, attr.amount);
    }
  }
});
