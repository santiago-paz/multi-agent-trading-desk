import { useLocale } from '../../context';
import { backtestingEs, type BacktestingKey } from './es';
import { backtestingEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<BacktestingKey, string>> = {
  es: backtestingEs,
  en: backtestingEn,
};

export function useBacktestingT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: BacktestingKey, params?: Record<string, string | number>): string {
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

export type { BacktestingKey };
