import { describe, it, expect } from 'vitest';
import {
  getDemoCompanyDetail, getDemoCompanyAdvancedData, getDemoCompanyNews, getDemoSymbolSearch,
} from './company-detail';

describe('demo company detail', () => {
  it('returns a profile + price history + income statements for a known symbol', () => {
    const d = getDemoCompanyDetail('AAPL');
    expect(d.fmpTicker).toBe('AAPL');
    expect(d.profile?.companyName).toBeTruthy();
    expect(d.priceHistory.length).toBeGreaterThan(0);
    expect(d.incomeStatements.length).toBeGreaterThan(0);
    expect(d.noUsEquivalent).toBe(false);
  });

  it('returns advanced data blocks', () => {
    const a = getDemoCompanyAdvancedData('AAPL');
    expect(a.keyMetrics.length).toBeGreaterThan(0);
    expect(a.cashFlow.length).toBeGreaterThan(0);
    expect(a.balanceSheet.length).toBeGreaterThan(0);
    expect(a.dcf?.dcf).toBeGreaterThan(0);
  });

  it('news + search are non-empty and well-shaped', () => {
    expect(getDemoCompanyNews('AAPL')[0].title).toBeTruthy();
    const hits = getDemoSymbolSearch('app');
    expect(hits.every(h => h.symbol && h.name)).toBe(true);
  });

  it('returns fmpTicker: null and empty data for a symbol with no US equivalent', () => {
    // BPA11 (Banco BTG Pactual) is registered with `null` in cedear-map's IOL_TO_FMP —
    // no US ADR exists, so the demo path must mirror the production no-equivalent branch.
    const d = getDemoCompanyDetail('BPA11');
    expect(d.fmpTicker).toBeNull();
    expect(d.noUsEquivalent).toBe(true);
    expect(d.profile).toBeNull();
    expect(d.priceHistory).toEqual([]);
    expect(d.incomeStatements).toEqual([]);
  });

  it('gives distinct, plausible sector/industry per company (not a hardcoded Technology default)', () => {
    // Previously every symbol got 'Technology'/'Consumer Electronics' regardless of company.
    const ko = getDemoCompanyDetail('KO').profile!;
    const jpm = getDemoCompanyDetail('JPM').profile!;
    const aapl = getDemoCompanyDetail('AAPL').profile!;
    expect(ko.sector).toBe('Consumer Defensive');
    expect(ko.industry).toBe('Beverages');
    expect(jpm.sector).toBe('Financial Services');
    expect(jpm.industry).toBe('Banks');
    expect(aapl.sector).toBe('Technology');
    // Not every company should share the same sector.
    expect(new Set([ko.sector, jpm.sector, aapl.sector]).size).toBeGreaterThan(1);
  });

  it('never leaks internal demo-mode wording into the company description', () => {
    const profiles = ['AAPL', 'KO', 'JPM', 'VALE', 'BA'].map(s => getDemoCompanyDetail(s).profile!);
    for (const p of profiles) {
      expect(p.description.toLowerCase()).not.toMatch(/demo|demostraci[oó]n|dashboard/);
      expect(p.description).toContain(p.companyName);
    }
  });

  it('trends EPS across income statement years instead of repeating one flat value', () => {
    const eps = getDemoCompanyDetail('AAPL').incomeStatements.map(r => r.eps);
    expect(new Set(eps).size).toBeGreaterThan(1);
  });

  it('seeds financial scores per symbol instead of a single flat literal', () => {
    const a = getDemoCompanyAdvancedData('AAPL').scores!;
    const m = getDemoCompanyAdvancedData('MSFT').scores!;
    expect(a.altmanZScore).not.toBe(m.altmanZScore);
    expect(a.piotroskiScore).toBeGreaterThanOrEqual(3);
    expect(a.piotroskiScore).toBeLessThanOrEqual(9);
  });
});
