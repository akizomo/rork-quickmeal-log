import { useCallback } from 'react';
import { useAppState } from '@/providers/app-state-provider';
import type { UnitSystem } from '@/utils/units';

export function useUnitSystem() {
  const { settings, updateSettingsValues } = useAppState();
  const unitSystem: UnitSystem = settings.unitSystem ?? 'metric';
  const setUnitSystem = useCallback(
    (u: UnitSystem) => updateSettingsValues({ unitSystem: u }),
    [updateSettingsValues],
  );
  return { unitSystem, setUnitSystem };
}
