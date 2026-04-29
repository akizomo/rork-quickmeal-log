/**
 * Tests for legacy → Identity migration map.
 *
 * Validates that every mapped target ID exists in the new Identity registry,
 * preventing silent dead links when masters change.
 */

import { LEGACY_TO_IDENTITY_MAP, lookupLegacyIdentity } from './migration-map';
import { getIdentity } from './index';

describe('Legacy → Identity map', () => {
  it('maps every entry to a known Identity', () => {
    const broken: string[] = [];
    for (const [legacy, identityId] of Object.entries(LEGACY_TO_IDENTITY_MAP)) {
      if (!getIdentity(identityId)) {
        broken.push(`${legacy} → ${identityId} (target missing)`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('lookupLegacyIdentity returns the correct Identity for known keys', () => {
    expect(lookupLegacyIdentity('staple', 'rice')).toBe('rice');
    expect(lookupLegacyIdentity('lean_protein', 'chicken_breast')).toBe('chicken_lean');
    expect(lookupLegacyIdentity('fatty_protein', 'chicken_thigh')).toBe('chicken_thigh');
    expect(lookupLegacyIdentity('rice_dish', 'gyudon')).toBe('gyudon_class');
    expect(lookupLegacyIdentity('set_meal', 'teishoku')).toBe('teishoku');
    expect(lookupLegacyIdentity('set_meal', 'convenience_bento')).toBe('bento');
  });

  it('returns undefined for unknown / missing inputs', () => {
    expect(lookupLegacyIdentity('staple', 'unknown_thing')).toBeUndefined();
    expect(lookupLegacyIdentity(undefined, 'rice')).toBeUndefined();
    expect(lookupLegacyIdentity('staple', undefined)).toBeUndefined();
  });
});
