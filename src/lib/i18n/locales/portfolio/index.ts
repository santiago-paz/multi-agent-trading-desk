import { useLocale } from '../../context';
import { portfolioEs, type PortfolioKey } from './es';
import { portfolioEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<PortfolioKey, string>> = {
  es: portfolioEs,
  en: portfolioEn,
};

export function usePortfolioT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: PortfolioKey, params?: Record<string, string | number>): string {
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

export type { PortfolioKey };
