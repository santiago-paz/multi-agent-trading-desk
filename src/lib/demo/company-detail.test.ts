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
});
