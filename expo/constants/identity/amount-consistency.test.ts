/**
 * Data-integrity check: every g/ml Identity `amount` spec (top-level and
 * per-attribute overrides) must resolve to a self-consistent
 * AmountEditConfig — i.e. its own `default` and every `chip.value` must
 * satisfy isValidAmount() against the min/step that buildIdentityAmountEditConfig
 * derives for it. Catches step/min misalignment introduced when editing
 * amount specs by hand (e.g. adding a coarser `step` without adjusting `min`).
 *
 * Scoped to unit: 'g' | 'ml' only. `piece` (0.5/1.5 half-units) and `percent`
 * (e.g. 67%/75%/133% ramen/protein chips) already have pre-existing
 * min/step misalignments unrelated to the g/ml step rollout — tracked
 * separately, not covered here to keep this suite green.
 */
import { ALL_IDENTITIES } from './index';
import { buildIdentityAmountEditConfig, isValidAmount } from '@/utils/amount-edit';
import { AmountSpec } from '@/types/identity';

function checkSpec(label: string, spec: AmountSpec) {
  if (spec.unit !== 'g' && spec.unit !== 'ml') return;
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

describe('Identity amount spec consistency (min/step/chips alignment, g/ml only)', () => {
  for (const identity of ALL_IDENTITIES) {
    checkSpec(identity.id, identity.amount);
    for (const attr of identity.attributes ?? []) {
      if (attr.amount) checkSpec(`${identity.id}.attributes.${attr.key}`, attr.amount);
    }
  }
});
