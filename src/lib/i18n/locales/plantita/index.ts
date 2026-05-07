import { useLocale, type Locale } from '../../context';
import { plantitaEs, type PlantitaKey } from './es';
import { plantitaEn } from './en';

const translations: Record<Locale, Record<PlantitaKey, string>> = {
  es: plantitaEs,
  en: plantitaEn,
};

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export function getPlantitaText(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = translations[locale];
  const raw = (dict as Record<string, string>)[key];
  if (raw === undefined) return key;
  return interpolate(raw, params);
}

export function usePlantitaT() {
  const { locale } = useLocale();
  return (key: PlantitaKey, params?: Record<string, string | number>): string =>
    getPlantitaText(locale, key, params);
}

export type { PlantitaKey };
