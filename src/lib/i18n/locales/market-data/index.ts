import { useLocale } from '../../context';
import { marketDataEs, type MarketDataKey } from './es';
import { marketDataEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<MarketDataKey, string>> = {
  es: marketDataEs,
  en: marketDataEn,
};

export function useMarketDataT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: MarketDataKey, params?: Record<string, string | number>): string {
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

export type { MarketDataKey };
