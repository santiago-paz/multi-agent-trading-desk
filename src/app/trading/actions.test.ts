import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PortfolioResponse, EstadoCuenta, PanelResponse, DatosPerfil, Operation } from '@/lib/iol/types';
import type { HistoricalRow } from '@/lib/fmp/types';

// ─── Mock setup ─────────────────────────────────────────────────────────────
//
// We hoist a control object so individual tests can flip DEMO_MODE on/off
// without re-mocking the module.

const ctl = vi.hoisted(() => ({ DEMO_MODE: false }));

const iol = vi.hoisted(() => ({
  getPortfolio: vi.fn(),
  getEstadoCuenta: vi.fn(),
  getMEP: vi.fn(),
  getPanelQuotes: vi.fn(),
  getDatosPerfil: vi.fn(),
  getOperations: vi.fn(),
  placeOrder: vi.fn(),
}));

const fmp = vi.hoisted(() => ({
  getHistoricalData: vi.fn(),
  getAllNews: vi.fn(),
  getCompanyNames: vi.fn(),
  getCompanyProfile: vi.fn(),
  getIncomeStatements: vi.fn(),
  getKeyMetrics: vi.fn(),
  getCashFlowStatements: vi.fn(),
  getBalanceSheetStatements: vi.fn(),
  getFinancialScores: vi.fn(),
  getDCFValue: vi.fn(),
  getTickerNews: vi.fn(),
  searchSymbolHits: vi.fn(),
}));

vi.mock('@/lib/iol/client', () => ({ iolClient: iol }));
vi.mock('@/lib/fmp/market-data', () => fmp);
vi.mock('@/lib/demo/data', () => ({
  get DEMO_MODE() { return ctl.DEMO_MODE; },
  DEMO_MEP_RATE: 1347.5,
  DEMO_PERFIL: { perfil: 'demo' },
  DEMO_ESTADO_CUENTA: { cuentas: [] },
  DEMO_PORTFOLIO: { activos: [] },
  DEMO_USD_PRICES: { AAPL: { price: 200, pct: 1 } },
  DEMO_VALUE_USD: 5000,
  DEMO_OPERATIONS: [{ id: 'op1' }],
  DEMO_NEWS_GENERAL: [{ title: 'demo-general' }],
  DEMO_NEWS_SPECIFIC: { AAPL: [{ title: 'demo-specific' }] },
  getDemoMarketData: () => ({ marketData: [], ownedSymbols: [], companyNames: {} }),
  getDemoCedearsForTrading: () => ({ cedears: [], cash: 1000, comprometido: 0, effectiveCash: 985, commissionRate: 0.015 }),
  getDemoFullPortfolioContext: () => ({ success: true as const, demo: true }),
}));

// Silence the chatty logging from getFullPortfolioContext (and error logs from the
// negative-path tests we exercise on purpose). We don't want to assert on logs.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ctl.DEMO_MODE = false;
  for (const fn of Object.values(iol)) fn.mockReset();
  for (const fn of Object.values(fmp)) fn.mockReset();
});

// ─── Module under test (imported AFTER mocks are registered) ────────────────

const actions = await import('./actions');

// ─── Builders ───────────────────────────────────────────────────────────────

function panelTitulo(overrides: Record<string, unknown> = {}) {
  return {
    simbolo: 'AAPLC',
    ultimoPrecio: 100,
    variacionPorcentual: 1.5,
    apertura: 99,
    maximo: 101,
    minimo: 98,
    ultimoCierre: 99,
    volumen: 1000,
    cantidadOperaciones: 50,
    fecha: '2026-05-04',
    tipoOpcion: null,
    precioEjercicio: null,
    fechaVencimiento: null,
    mercado: 'bCBA',
    moneda: '1',
    descripcion: 'Apple',
    plazo: 't1',
    ...overrides,
  };
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    cantidad: 10,
    comprometido: 0,
    puntosVariacion: 0,
    variacionDiaria: 0,
    ultimoPrecio: 100,
    ppc: 95,
    gananciaPorcentaje: 5,
    gananciaDinero: 50,
    valorizado: 1000,
    parking: null,
    titulo: {
      simbolo: 'AAPLC',
      descripcion: 'Apple',
      pais: 'argentina',
      mercado: 'bCBA',
      tipo: 'CEDEARS',
      plazo: 't0',
      moneda: 'peso_Argentino',
    },
    ...overrides,
  };
}

function emptyPanel(): PanelResponse {
  return { titulos: [] } as unknown as PanelResponse;
}

function emptyPortfolio(): PortfolioResponse {
  return { pais: 'argentina', activos: [] };
}

function emptyEstado(): EstadoCuenta {
  return { cuentas: [], estadisticas: [], totalEnPesos: 0 };
}

// ════════════════════════════════════════════════════════════════════════════
// getMarketData
// ════════════════════════════════════════════════════════════════════════════

describe('getMarketData', () => {
  it('returns demo data when DEMO_MODE=true', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getMarketData();
    expect(r.success).toBe(true);
    expect(iol.getPortfolio).not.toHaveBeenCalled();
  });

  it('happy path: collapses C/D variants in panel and merges with portfolio holdings', async () => {
    // Portfolio holds KOC; panel has AAPL C/D variants (collapsed) plus TSLAC
    iol.getPortfolio.mockResolvedValueOnce({
      pais: 'argentina',
      activos: [asset({ titulo: { ...asset().titulo, simbolo: 'KOC', tipo: 'CEDEARS' } })],
    } as PortfolioResponse);
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [
        panelTitulo({ simbolo: 'AAPLC' }),
        panelTitulo({ simbolo: 'AAPLD' }), // dedup'd → same base AAPL
        panelTitulo({ simbolo: 'TSLAC', ultimoPrecio: 250 }),
      ],
    } as PanelResponse);
    fmp.getHistoricalData.mockResolvedValue([
      { date: new Date('2026-05-04'), open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ] as HistoricalRow[]);
    fmp.getCompanyNames.mockResolvedValueOnce({ AAPL: 'Apple Inc.', KO: 'Coca-Cola', TSLA: 'Tesla' });

    const r = await actions.getMarketData();
    if (!r.success) throw new Error('expected success');
    expect(r.data!.ownedSymbols).toEqual(['KOC']);
    // KOC (portfolio) + AAPL/TSLA (deduped panel bases). AAPLD collapsed into AAPL.
    expect(r.data!.marketData.map(m => m.symbol).sort()).toEqual(['AAPL', 'KOC', 'TSLA']);
    // Company names indexed by IOL symbol
    expect(r.data!.companyNames.KOC).toBe('Coca-Cola');
    expect(r.data!.companyNames.AAPL).toBe('Apple Inc.');
  });

  it('falls back to a 2-point IOL history when FMP returns nothing for a symbol', async () => {
    iol.getPortfolio.mockResolvedValueOnce(emptyPortfolio());
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [panelTitulo({ simbolo: 'AAPLC', ultimoPrecio: 110, variacionPorcentual: 10 })],
    } as PanelResponse);
    // FMP returns empty
    fmp.getHistoricalData.mockResolvedValueOnce([]);
    fmp.getCompanyNames.mockResolvedValueOnce({});

    const r = await actions.getMarketData();
    if (!r.success) throw new Error('expected success');
    expect(r.data!.marketData).toHaveLength(1);
    const points = r.data!.marketData[0].data;
    expect(points).toHaveLength(2);
    // pct = 10 → prevPrice = 110 / 1.10 = 100
    expect(points[0].close).toBeCloseTo(100, 6);
    expect(points[1].close).toBe(110);
  });

  it('falls back to IOL when FMP throws (rejected promise)', async () => {
    iol.getPortfolio.mockResolvedValueOnce(emptyPortfolio());
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [panelTitulo({ simbolo: 'KOC', ultimoPrecio: 50, variacionPorcentual: 0 })],
    } as PanelResponse);
    fmp.getHistoricalData.mockRejectedValueOnce(new Error('FMP 503'));
    fmp.getCompanyNames.mockResolvedValueOnce({});

    const r = await actions.getMarketData();
    if (!r.success) throw new Error('expected success');
    expect(r.data!.marketData).toHaveLength(1);
    // pct=0 → prev == current
    expect(r.data!.marketData[0].data[0].close).toBe(50);
  });

  it('returns failure when portfolio response has no activos field', async () => {
    iol.getPortfolio.mockResolvedValueOnce({ message: 'token expired' } as unknown as PortfolioResponse);
    const r = await actions.getMarketData();
    expect(r.success).toBe(false);
  });

  it('returns failure when iolClient.getPortfolio throws', async () => {
    iol.getPortfolio.mockRejectedValueOnce(new Error('network'));
    const r = await actions.getMarketData();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('Failed');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getMEPRate
// ════════════════════════════════════════════════════════════════════════════

describe('getMEPRate', () => {
  it('returns DEMO rate when DEMO_MODE=true', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getMEPRate();
    expect(r).toEqual({ success: true, data: 1347.5 });
    expect(iol.getMEP).not.toHaveBeenCalled();
  });

  it('returns the rate from iolClient.getMEP', async () => {
    iol.getMEP.mockResolvedValueOnce(1234);
    const r = await actions.getMEPRate();
    expect(r).toEqual({ success: true, data: 1234 });
  });

  it('returns failure when iolClient throws', async () => {
    iol.getMEP.mockRejectedValueOnce(new Error('boom'));
    const r = await actions.getMEPRate();
    expect(r.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getOperations
// ════════════════════════════════════════════════════════════════════════════

describe('getOperations', () => {
  it('returns demo operations in DEMO_MODE', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getOperations();
    expect(r.success).toBe(true);
    expect(iol.getOperations).not.toHaveBeenCalled();
  });

  it('forwards to iolClient.getOperations(30)', async () => {
    iol.getOperations.mockResolvedValueOnce([{ id: 1 }] as unknown as Operation[]);
    const r = await actions.getOperations();
    expect(iol.getOperations).toHaveBeenCalledWith(30);
    expect(r).toMatchObject({ success: true });
  });

  it('returns failure on error', async () => {
    iol.getOperations.mockRejectedValueOnce(new Error('x'));
    const r = await actions.getOperations();
    expect(r.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getNewsMetadata
// ════════════════════════════════════════════════════════════════════════════

describe('getNewsMetadata', () => {
  it('returns demo news in DEMO_MODE', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getNewsMetadata();
    expect(r).toMatchObject({ success: true });
    expect(fmp.getAllNews).not.toHaveBeenCalled();
  });

  it('returns general+specific news from FMP', async () => {
    fmp.getAllNews.mockResolvedValueOnce({ general: [{ title: 'g' }], specific: { AAPL: [{ title: 's' }] } });
    const r = await actions.getNewsMetadata();
    expect(r).toMatchObject({ success: true, data: { general: [{ title: 'g' }] } });
  });

  it('returns failure on FMP error', async () => {
    fmp.getAllNews.mockRejectedValueOnce(new Error('x'));
    const r = await actions.getNewsMetadata();
    expect(r.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getPortfolioSummary
// ════════════════════════════════════════════════════════════════════════════

describe('getPortfolioSummary', () => {
  it('returns demo data in DEMO_MODE', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getPortfolioSummary();
    expect(r.success).toBe(true);
    expect(iol.getPortfolio).not.toHaveBeenCalled();
  });

  it('builds USD price map from D-variants that also have a C-variant', async () => {
    iol.getPortfolio.mockResolvedValueOnce(emptyPortfolio());
    iol.getEstadoCuenta.mockResolvedValueOnce(emptyEstado());
    iol.getMEP.mockResolvedValueOnce(1200);
    iol.getDatosPerfil.mockResolvedValueOnce({} as DatosPerfil);
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [
        panelTitulo({ simbolo: 'AAPLC' }),
        panelTitulo({ simbolo: 'AAPLD', ultimoPrecio: 0.08, variacionPorcentual: 0.5 }),
        // D-variant with no C-variant should be skipped
        panelTitulo({ simbolo: 'XYZD', ultimoPrecio: 99 }),
      ],
    } as PanelResponse);

    const r = await actions.getPortfolioSummary();
    if (!r.success) throw new Error('expected success');
    expect(r.data!.usdPrices).toEqual({ AAPL: { price: 0.08, pct: 0.5 } });
    expect(r.data!.usdPrices.XYZ).toBeUndefined();
    expect(r.data!.mepRate).toBe(1200);
  });

  it('returns failure when any IOL call rejects', async () => {
    iol.getPortfolio.mockRejectedValueOnce(new Error('down'));
    iol.getEstadoCuenta.mockResolvedValueOnce(emptyEstado());
    iol.getMEP.mockResolvedValueOnce(1200);
    iol.getDatosPerfil.mockResolvedValueOnce({} as DatosPerfil);
    iol.getPanelQuotes.mockResolvedValueOnce(emptyPanel());

    const r = await actions.getPortfolioSummary();
    expect(r.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getCedearsForTrading
// ════════════════════════════════════════════════════════════════════════════

describe('getCedearsForTrading', () => {
  it('returns demo data in DEMO_MODE', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getCedearsForTrading();
    expect(r.success).toBe(true);
  });

  it('happy path: returns cash, comprometido, effectiveCash and filtered cedears', async () => {
    iol.getEstadoCuenta.mockResolvedValueOnce({
      cuentas: [{
        numero: '1', tipo: 'inversion', moneda: 'peso_Argentino',
        disponible: 100_000, comprometido: 5000,
        saldo: 100_000, titulosValorizados: 0, total: 100_000,
        margenDescubierto: 0, saldos: [], estado: 'operable',
      }],
      estadisticas: [], totalEnPesos: 100_000,
    } as EstadoCuenta);
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [panelTitulo({ simbolo: 'AAPLC', ultimoPrecio: 1000, volumen: 1000 })],
    } as PanelResponse);

    const r = await actions.getCedearsForTrading();
    if (!r.success) throw new Error('expected success');
    expect(r.data.cash).toBe(100_000);
    expect(r.data.comprometido).toBe(5000);
    expect(r.data.effectiveCash).toBeCloseTo(100_000 / 1.015, 0);
    expect(r.data.cedears.length).toBeGreaterThan(0);
  });

  it('returns failure when estadoCuenta has no cuentas', async () => {
    iol.getEstadoCuenta.mockResolvedValueOnce({ cuentas: null } as unknown as EstadoCuenta);
    iol.getPanelQuotes.mockResolvedValueOnce(emptyPanel());
    const r = await actions.getCedearsForTrading();
    expect(r.success).toBe(false);
  });

  it('returns failure on IOL error', async () => {
    iol.getEstadoCuenta.mockRejectedValueOnce(new Error('x'));
    iol.getPanelQuotes.mockResolvedValueOnce(emptyPanel());
    const r = await actions.getCedearsForTrading();
    expect(r.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// placeOrder / placeBuyOrder
// ════════════════════════════════════════════════════════════════════════════

describe('placeOrder', () => {
  const baseParams = {
    simbolo: 'AAPLC',
    cantidad: 5,
    precio: 100,
    plazo: 't1' as const,
    tipoOrden: 'precioLimite' as const,
    side: 'buy' as const,
  };

  it('returns demo result in DEMO_MODE without calling IOL', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.placeOrder(baseParams);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.ok).toBe(true);
    expect(iol.placeOrder).not.toHaveBeenCalled();
  });

  it('forwards a limit BUY with cantidad>0 unchanged', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 12345, messages: [] });
    const r = await actions.placeOrder(baseParams);
    expect(r.success).toBe(true);
    const sent = iol.placeOrder.mock.calls[0][0];
    expect(sent.cantidad).toBe(5);
    expect(sent.tipoOrden).toBe('precioLimite');
    expect(sent.simbolo).toBe('AAPLC');
    expect(sent.side).toBe('buy');
    expect(typeof sent.validez).toBe('string');
    if (r.success) expect(r.data.ok).toBe(true);
  });

  it('rewrites a market BUY: omits cantidad and sets monto = qty * precio when not provided', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 1 });
    await actions.placeOrder({ ...baseParams, tipoOrden: 'precioMercado', cantidad: 4, precio: 250 });
    const sent = iol.placeOrder.mock.calls[0][0];
    expect(sent.cantidad).toBeUndefined();
    expect(sent.monto).toBe(1000); // 4 * 250
  });

  it('preserves an explicit monto for a market BUY', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 1 });
    await actions.placeOrder({ ...baseParams, tipoOrden: 'precioMercado', cantidad: 4, monto: 999 });
    const sent = iol.placeOrder.mock.calls[0][0];
    expect(sent.cantidad).toBeUndefined();
    expect(sent.monto).toBe(999);
  });

  it('does NOT zero out cantidad for a market SELL', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 1 });
    await actions.placeOrder({ ...baseParams, side: 'sell', tipoOrden: 'precioMercado' });
    const sent = iol.placeOrder.mock.calls[0][0];
    expect(sent.cantidad).toBe(5);
    expect(sent.side).toBe('sell');
  });

  it('marks ok=false when IOL response has neither numeroOperacion nor ok=true', async () => {
    iol.placeOrder.mockResolvedValueOnce({ messages: [{ description: 'rejected' }] });
    const r = await actions.placeOrder(baseParams);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ok).toBe(false);
      expect(r.data.messages).toEqual([{ description: 'rejected' }]);
    }
  });

  it('coerces missing messages to []', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 7 });
    const r = await actions.placeOrder(baseParams);
    if (r.success) expect(r.data.messages).toEqual([]);
  });

  it('returns success=false with the thrown message on error', async () => {
    iol.placeOrder.mockRejectedValueOnce(new Error('IOL rejected'));
    const r = await actions.placeOrder(baseParams);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('IOL rejected');
  });

  it('returns generic message when error is not an Error instance', async () => {
    iol.placeOrder.mockRejectedValueOnce('string error');
    const r = await actions.placeOrder(baseParams);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('Error al enviar la orden');
  });
});

describe('placeBuyOrder', () => {
  it('delegates to placeOrder with side=buy', async () => {
    iol.placeOrder.mockResolvedValueOnce({ numeroOperacion: 1 });
    await actions.placeBuyOrder({
      simbolo: 'KOC',
      cantidad: 3,
      precio: 50,
      plazo: 't1',
      tipoOrden: 'precioLimite',
    });
    const sent = iol.placeOrder.mock.calls[0][0];
    expect(sent.side).toBe('buy');
    expect(sent.simbolo).toBe('KOC');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getFullPortfolioContext
// ════════════════════════════════════════════════════════════════════════════

describe('getFullPortfolioContext', () => {
  it('returns demo data in DEMO_MODE', async () => {
    ctl.DEMO_MODE = true;
    const r = await actions.getFullPortfolioContext();
    expect(r.success).toBe(true);
  });

  it('builds holdings, prices and FMP mappings from a non-empty portfolio', async () => {
    iol.getPortfolio.mockResolvedValueOnce({
      pais: 'argentina',
      activos: [
        asset({ titulo: { ...asset().titulo, simbolo: 'AAPLC', tipo: 'CEDEARS' }, cantidad: 10, ppc: 100 }),
        // duplicate (different suffix) → consolidates
        asset({ titulo: { ...asset().titulo, simbolo: 'AAPLD', tipo: 'cedears' }, cantidad: 5, ppc: 0, ultimoPrecio: 100 }),
        // non-CEDEAR → ignored
        asset({ titulo: { ...asset().titulo, simbolo: 'GD30', tipo: 'BONO' }, cantidad: 100 }),
      ],
    } as PortfolioResponse);
    iol.getEstadoCuenta.mockResolvedValueOnce({
      cuentas: [{
        numero: '1', tipo: 'inv', moneda: 'peso_Argentino',
        disponible: 200_000, comprometido: 0,
        saldo: 200_000, titulosValorizados: 0, total: 200_000,
        margenDescubierto: 0, saldos: [], estado: 'operable',
      }],
      estadisticas: [], totalEnPesos: 200_000,
    } as EstadoCuenta);
    iol.getMEP.mockResolvedValueOnce(1200);
    iol.getPanelQuotes.mockResolvedValueOnce({
      titulos: [
        panelTitulo({ simbolo: 'AAPLC', ultimoPrecio: 100, volumen: 5000 }),
        panelTitulo({ simbolo: 'KOC', ultimoPrecio: 50, volumen: 800 }),
        // dollar instrument → skipped
        panelTitulo({ simbolo: 'TSLAD', moneda: '2', ultimoPrecio: 200 }),
        // zero price → skipped
        panelTitulo({ simbolo: 'BAD', ultimoPrecio: 0 }),
      ],
    } as PanelResponse);
    fmp.getCompanyNames.mockResolvedValueOnce({ AAPL: 'Apple Inc.', KO: 'The Coca-Cola Company' });

    const r = await actions.getFullPortfolioContext();
    if (!r.success) throw new Error('expected success');
    expect(r.holdings).toEqual({ AAPL: 15 }); // 10 + 5
    expect(r.holdingTickers).toEqual(['AAPL']);
    expect(r.cashArs).toBe(200_000);
    expect(r.mepRate).toBe(1200);
    expect(r.arsPrices.AAPL).toBe(100);
    expect(r.arsPrices.KO).toBe(50);
    expect(r.arsPrices.TSLA).toBeUndefined();
    expect(r.panelSymbols).toEqual(['KO']); // AAPL excluded (in portfolio)
    expect(r.fmpToIol.AAPL).toBe('AAPL');
    expect(r.companyNames).toEqual({ AAPL: 'Apple Inc.', KO: 'The Coca-Cola Company' });
  });

  it('returns failure when getPortfolio throws', async () => {
    iol.getPortfolio.mockRejectedValueOnce(new Error('iol-down'));
    iol.getEstadoCuenta.mockResolvedValueOnce(emptyEstado());
    iol.getMEP.mockResolvedValueOnce(1200);
    iol.getPanelQuotes.mockResolvedValueOnce(emptyPanel());

    const r = await actions.getFullPortfolioContext();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('iol-down');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// searchTickerSymbols / getCompanyDetail / getCompanyAdvancedData / getCompanyNews
// ════════════════════════════════════════════════════════════════════════════

describe('searchTickerSymbols', () => {
  it('forwards query and limit to FMP', async () => {
    fmp.searchSymbolHits.mockResolvedValueOnce([{ symbol: 'AAPL' }]);
    const r = await actions.searchTickerSymbols('app');
    expect(fmp.searchSymbolHits).toHaveBeenCalledWith('app', 15);
    expect(r).toMatchObject({ success: true, data: [{ symbol: 'AAPL' }] });
  });

  it('returns failure on FMP error', async () => {
    fmp.searchSymbolHits.mockRejectedValueOnce(new Error('x'));
    const r = await actions.searchTickerSymbols('app');
    expect(r.success).toBe(false);
  });
});

describe('getCompanyDetail', () => {
  it('returns noUsEquivalent=true when symbol maps to null in cedear-map', async () => {
    // BPA11 is registered with `null` in IOL_TO_FMP (no US ADR)
    const r = await actions.getCompanyDetail('BPA11');
    if (!r.success) throw new Error('expected success');
    expect(r.data.fmpTicker).toBeNull();
    expect(r.data.noUsEquivalent).toBe(true);
    expect(fmp.getCompanyProfile).not.toHaveBeenCalled();
  });

  it('aggregates profile, history and income from FMP', async () => {
    fmp.getCompanyProfile.mockResolvedValueOnce({ companyName: 'Apple', isEtf: false });
    fmp.getHistoricalData.mockResolvedValueOnce([
      { date: new Date('2026-05-04'), open: 1, high: 1, low: 1, close: 200, volume: 1000 },
    ] as HistoricalRow[]);
    fmp.getIncomeStatements.mockResolvedValueOnce([{ revenue: 999 }]);

    const r = await actions.getCompanyDetail('AAPLC'); // AAPL is in cedear-map
    if (!r.success) throw new Error('expected success');
    expect(r.data.fmpTicker).toBe('AAPL');
    expect(r.data.profile?.companyName).toBe('Apple');
    expect(r.data.priceHistory).toHaveLength(1);
    expect(r.data.priceHistory[0]).toMatchObject({ close: 200, volume: 1000 });
    expect(r.data.priceHistory[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.data.incomeStatements).toEqual([{ revenue: 999 }]);
  });

  it('tolerates partial FMP failures via Promise.allSettled', async () => {
    fmp.getCompanyProfile.mockRejectedValueOnce(new Error('500'));
    fmp.getHistoricalData.mockResolvedValueOnce([] as HistoricalRow[]);
    fmp.getIncomeStatements.mockRejectedValueOnce(new Error('500'));

    const r = await actions.getCompanyDetail('AAPLC');
    if (!r.success) throw new Error('expected success');
    expect(r.data.profile).toBeNull();
    expect(r.data.priceHistory).toEqual([]);
    expect(r.data.incomeStatements).toEqual([]);
  });
});

describe('getCompanyAdvancedData', () => {
  it('aggregates 5 FMP endpoints in one call', async () => {
    fmp.getKeyMetrics.mockResolvedValueOnce([{ metric: 1 }]);
    fmp.getCashFlowStatements.mockResolvedValueOnce([{ cashflow: 1 }]);
    fmp.getBalanceSheetStatements.mockResolvedValueOnce([{ bs: 1 }]);
    fmp.getFinancialScores.mockResolvedValueOnce({ score: 9 });
    fmp.getDCFValue.mockResolvedValueOnce({ dcf: 100 });

    const r = await actions.getCompanyAdvancedData('AAPL');
    if (!r.success) throw new Error('expected success');
    expect(r.data.keyMetrics).toHaveLength(1);
    expect(r.data.scores).toEqual({ score: 9 });
    expect(r.data.dcf).toEqual({ dcf: 100 });
  });

  it('returns sane defaults when every endpoint fails', async () => {
    fmp.getKeyMetrics.mockRejectedValueOnce(new Error('x'));
    fmp.getCashFlowStatements.mockRejectedValueOnce(new Error('x'));
    fmp.getBalanceSheetStatements.mockRejectedValueOnce(new Error('x'));
    fmp.getFinancialScores.mockRejectedValueOnce(new Error('x'));
    fmp.getDCFValue.mockRejectedValueOnce(new Error('x'));

    const r = await actions.getCompanyAdvancedData('AAPL');
    if (!r.success) throw new Error('expected success');
    expect(r.data).toEqual({
      keyMetrics: [],
      cashFlow: [],
      balanceSheet: [],
      scores: null,
      dcf: null,
    });
  });
});

describe('getCompanyNews', () => {
  it('forwards ticker and limit=20', async () => {
    fmp.getTickerNews.mockResolvedValueOnce([{ title: 'n' }]);
    const r = await actions.getCompanyNews('AAPL');
    expect(fmp.getTickerNews).toHaveBeenCalledWith('AAPL', 20);
    expect(r).toMatchObject({ success: true });
  });

  it('returns failure on FMP error', async () => {
    fmp.getTickerNews.mockRejectedValueOnce(new Error('x'));
    const r = await actions.getCompanyNews('AAPL');
    expect(r.success).toBe(false);
  });
});
