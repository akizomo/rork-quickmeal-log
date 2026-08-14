import { useCallback } from 'react';
import { useAppState } from '@/providers/app-state-provider';
import type { AppLocale } from '@/types/locale';

export function useLocale() {
  const { settings, updateSettingsValues } = useAppState();
  const locale = (settings.locale ?? 'ja') as AppLocale;
  const setLocale = useCallback(
    (newLocale: AppLocale) => {
      updateSettingsValues({ locale: newLocale });
    },
    [updateSettingsValues],
  );
  return { locale, setLocale };
}
