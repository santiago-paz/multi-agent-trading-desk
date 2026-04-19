import { describe, it, expect } from 'vitest';

import { autoTraderEs } from './locales/auto-trader/es';
import { autoTraderEn } from './locales/auto-trader/en';
import { portfolioEs } from './locales/portfolio/es';
import { portfolioEn } from './locales/portfolio/en';
import { windowsEs } from './locales/windows/es';
import { windowsEn } from './locales/windows/en';
import { marketDataEs } from './locales/market-data/es';
import { marketDataEn } from './locales/market-data/en';
import { companyDetailEs } from './locales/company-detail/es';
import { companyDetailEn } from './locales/company-detail/en';

// ── Helper ──────────────────────────────────────────────────────────────────

/** Extract {param} placeholders from a translation string, ignoring plural suffixes like {s}, {s2} */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)]
    .map(m => m[1])
    .filter(p => !/^s\d*$/.test(p))
    .sort();
}

function testDomain(name: string, es: Record<string, string>, en: Record<string, string>) {
  describe(name, () => {
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();

    it('ES and EN have the same keys', () => {
      expect(enKeys).toEqual(esKeys);
    });

    it('no empty values in ES', () => {
      for (const [key, val] of Object.entries(es)) {
        expect(val, `ES key "${key}" is empty`).not.toBe('');
      }
    });

    it('no empty values in EN', () => {
      for (const [key, val] of Object.entries(en)) {
        expect(val, `EN key "${key}" is empty`).not.toBe('');
      }
    });

    it('placeholders match between ES and EN', () => {
      for (const key of esKeys) {
        const esPlaceholders = placeholders(es[key]);
        const enPlaceholders = placeholders(en[key]);
        expect(enPlaceholders, `Key "${key}" has mismatched placeholders`).toEqual(esPlaceholders);
      }
    });
  });
}

// ── Test every i18n domain ──────────────────────────────────────────────────

describe('i18n locale completeness', () => {
  testDomain('auto-trader', autoTraderEs, autoTraderEn);
  testDomain('portfolio', portfolioEs, portfolioEn);
  testDomain('windows', windowsEs, windowsEn);
  testDomain('market-data', marketDataEs, marketDataEn);
  testDomain('company-detail', companyDetailEs, companyDetailEn);
});
