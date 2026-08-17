import { useCallback } from 'react';
import { useAppState } from '@/providers/app-state-provider';
import type { AppLocale } from '@/types/locale';

export function useLocale() {
  const { settings, updateSettingsValues } = useAppState();
  const uiLanguage = (settings.uiLanguage ?? 'ja') as AppLocale;
  const foodRegion = (settings.foodRegion ?? 'ja') as AppLocale;

  const setUiLanguage = useCallback(
    (lang: AppLocale) => updateSettingsValues({ uiLanguage: lang }),
    [updateSettingsValues],
  );
  const setFoodRegion = useCallback(
    (region: AppLocale) => updateSettingsValues({ foodRegion: region }),
    [updateSettingsValues],
  );

  return { uiLanguage, foodRegion, setUiLanguage, setFoodRegion };
}
