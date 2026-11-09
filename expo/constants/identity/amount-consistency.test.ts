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
import { ALL_IDENTITIES, ALL_US_IDENTITIES } from './index';
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
  // US 版も対象 (以前は日本版だけで、oz チップ 85g/113g が 25g 刻みの格子外だった27件を見逃した)。
  for (const identity of [...ALL_IDENTITIES, ...ALL_US_IDENTITIES]) {
    checkSpec(identity.id, identity.amount);
    for (const attr of identity.attributes ?? []) {
      if (attr.amount) checkSpec(`${identity.id}.attributes.${attr.key}`, attr.amount);
    }
  }
});

/**
 * チップが1つだけで、その値がデフォルトと同じなら、押しても何も変わらない (選択肢になっていない)。
 * 日本版は「並/大盛」のように必ず上下の選択肢を持つ。US 版の一皿料理が `1 plate` だけだった型の再発防止。
 * チップなし (0個) は有効: 数え物は +/- が主で、日本版にも多数ある。
 */
describe('Identity amount chips are real choices', () => {
  for (const identity of [...ALL_IDENTITIES, ...ALL_US_IDENTITIES]) {
    const specs: [string, AmountSpec][] = [[identity.id, identity.amount]];
    for (const attr of identity.attributes ?? []) if (attr.amount) specs.push([`${identity.id}.${attr.key}`, attr.amount]);
    for (const [label, spec] of specs) {
      const chips = spec.chips ?? [];
      if (chips.length === 1) {
        it(`${label}: sole chip must differ from default`, () => {
          expect(chips[0].value).not.toBe(spec.default);
        });
      }
    }
  }
});
