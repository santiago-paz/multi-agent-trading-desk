import { useLocale } from '../../context';
import { autoTraderEs, type AutoTraderKey } from './es';
import { autoTraderEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<AutoTraderKey, string>> = {
  es: autoTraderEs,
  en: autoTraderEn,
};

export function useAutoTraderT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: AutoTraderKey, params?: Record<string, string | number>): string {
    let text: string = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return t;
}

export type { AutoTraderKey };
