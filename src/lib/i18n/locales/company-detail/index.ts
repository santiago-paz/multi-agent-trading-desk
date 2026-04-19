import { useLocale } from '../../context';
import { companyDetailEs, type CompanyDetailKey } from './es';
import { companyDetailEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<CompanyDetailKey, string>> = {
  es: companyDetailEs,
  en: companyDetailEn,
};

export function useCompanyDetailT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: CompanyDetailKey, params?: Record<string, string | number>): string {
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

export type { CompanyDetailKey };
