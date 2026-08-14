import { useMemo } from 'react';
import { useLocale } from './useLocale';
import ja from '@/locales/ja.json';
import enUS from '@/locales/en-US.json';

const TRANSLATIONS: Record<string, Record<string, unknown>> = {
  ja: ja as unknown as Record<string, unknown>,
  'en-US': enUS as unknown as Record<string, unknown>,
};

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Lightweight translation hook — reads from locale JSON files via useLocale.
 * Returns a t() function that resolves dot-separated keys.
 * Supports {{variable}} interpolation and returnObjects for arrays.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useT(): (key: string, opts?: Record<string, unknown> & { returnObjects?: boolean }) => any {
  const { locale } = useLocale();
  return useMemo(() => {
    const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.ja;
    return (key: string, opts?: Record<string, unknown> & { returnObjects?: boolean }) => {
      const value = resolvePath(dict, key);
      if (opts?.returnObjects) return value;
      if (typeof value === 'string') {
        if (opts) {
          return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? `{{${k}}}`));
        }
        return value;
      }
      return key;
    };
  }, [locale]);
}
