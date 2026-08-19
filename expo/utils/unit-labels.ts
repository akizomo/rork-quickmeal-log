/**
 * Single source of truth for AmountUnit display labels by locale.
 *
 * Previously duplicated in: log-display.ts, amount-edit.ts, IdentityLogSheet.tsx
 * Any new locale or unit must be added here only.
 */

import type { AppLocale } from '@/types/locale';
import type { AmountUnit } from '@/types/identity';

export const UNIT_LABELS: Record<AppLocale, Record<AmountUnit, string>> = {
  ja: {
    g: 'g',
    ml: 'ml',
    piece: '個',
    serving: '人前',
    percent: '%',
    plate: '皿',
    slice: '切',
    cut: '切れ',
  },
  'en-US': {
    g: 'g',
    ml: 'ml',
    piece: 'pcs',
    serving: 'servings',
    percent: '%',
    plate: 'plates',
    slice: 'slices',
    cut: 'pieces',
  },
};

export function getUnitLabel(unit: AmountUnit, locale: AppLocale): string {
  return UNIT_LABELS[locale][unit] ?? unit;
}
