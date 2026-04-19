import { useLocale } from '../../context';
import { windowsEs, type WindowsKey } from './es';
import { windowsEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<WindowsKey, string>> = {
  es: windowsEs,
  en: windowsEn,
};

export function useWindowsT() {
  const { locale } = useLocale();
  const dict = translations[locale];

  function t(key: WindowsKey, params?: Record<string, string | number>): string {
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

export type { WindowsKey };
