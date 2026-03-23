import { describe, it, expect } from 'vitest';
import { TradingEngine } from './engine';
import { PortfolioResponse, EstadoCuenta } from '../iol/types';

// Dummy client — calculatePortfolioValueFromData is pure, so we never call the client
const dummyClient = {
  getPortfolio: async () => ({} as PortfolioResponse),
  getEstadoCuenta: async () => ({} as EstadoCuenta),
  getMEP: async () => 0,
};

const engine = new TradingEngine(dummyClient);

// ── calculatePortfolioValueFromData ─────────────────────────────────────────

describe('calculatePortfolioValueFromData', () => {
  const MEP = 1200; // ARS per USD

  it('calculates total value with assets and ARS cash', () => {
    const portfolio: PortfolioResponse = {
      pais: 'argentina',
      activos: [
        { valorizado: 120000, cantidad: 10, comprometido: 0, puntosVariacion: 0, variacionDiaria: 0, ultimoPrecio: 12000, ppc: 11000, gananciaPorcentaje: 9, gananciaDinero: 10000, titulo: { simbolo: 'AAPLC', descripcion: 'Apple', pais: 'argentina', mercado: 'bCBA', tipo: 'CEDEARS', plazo: 't0', moneda: 'peso_Argentino' }, parking: null },
        { valorizado: 240000, cantidad: 5, comprometido: 0, puntosVariacion: 0, variacionDiaria: 0, ultimoPrecio: 48000, ppc: 45000, gananciaPorcentaje: 6.67, gananciaDinero: 15000, titulo: { simbolo: 'KOC', descripcion: 'Coca Cola', pais: 'argentina', mercado: 'bCBA', tipo: 'CEDEARS', plazo: 't0', moneda: 'peso_Argentino' }, parking: null },
      ],
    };

    const estadoCuenta: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 60000, comprometido: 0, saldo: 60000, titulosValorizados: 0, total: 60000, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };

    const result = engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP);

    // Assets: (120000 + 240000) / 1200 = 300
    // ARS cash: 60000 / 1200 = 50
    // Total: 350
    expect(result).toBe(350);
  });

  it('handles USD cash correctly', () => {
    const portfolio: PortfolioResponse = {
      pais: 'argentina',
      activos: [],
    };

    const estadoCuenta: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'dolar_Estadounidense', disponible: 500, comprometido: 0, saldo: 500, titulosValorizados: 0, total: 500, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };

    const result = engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP);

    // No assets, just 500 USD cash
    expect(result).toBe(500);
  });

  it('combines ARS and USD cash', () => {
    const portfolio: PortfolioResponse = {
      pais: 'argentina',
      activos: [],
    };

    const estadoCuenta: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 12000, comprometido: 0, saldo: 12000, titulosValorizados: 0, total: 12000, margenDescubierto: 0, saldos: [], estado: 'activa' },
        { numero: '2', tipo: 'inversion', moneda: 'dolar_Estadounidense', disponible: 200, comprometido: 0, saldo: 200, titulosValorizados: 0, total: 200, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };

    const result = engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP);

    // ARS: 12000 / 1200 = 10, USD: 200 → total = 210
    expect(result).toBe(210);
  });

  it('returns 0 when portfolio.activos is null/undefined', () => {
    const portfolio = { pais: 'argentina' } as PortfolioResponse;
    const estadoCuenta: EstadoCuenta = { cuentas: [], estadisticas: [], totalEnPesos: 0 };

    expect(engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP)).toBe(0);
  });

  it('returns 0 when portfolio is empty object', () => {
    const portfolio = {} as PortfolioResponse;
    const estadoCuenta: EstadoCuenta = { cuentas: [], estadisticas: [], totalEnPesos: 0 };

    expect(engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP)).toBe(0);
  });

  it('handles empty activos and empty cuentas', () => {
    const portfolio: PortfolioResponse = { pais: 'argentina', activos: [] };
    const estadoCuenta: EstadoCuenta = { cuentas: [], estadisticas: [], totalEnPesos: 0 };

    expect(engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP)).toBe(0);
  });

  it('ignores unknown currency types in cuentas', () => {
    const portfolio: PortfolioResponse = { pais: 'argentina', activos: [] };
    const estadoCuenta: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'euro', disponible: 1000, comprometido: 0, saldo: 1000, titulosValorizados: 0, total: 1000, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };

    // Euro account should be ignored (not ARS, not USD)
    expect(engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP)).toBe(0);
  });

  it('handles null estadoCuenta.cuentas gracefully', () => {
    const portfolio: PortfolioResponse = {
      pais: 'argentina',
      activos: [
        { valorizado: 60000, cantidad: 5, comprometido: 0, puntosVariacion: 0, variacionDiaria: 0, ultimoPrecio: 12000, ppc: 11000, gananciaPorcentaje: 9, gananciaDinero: 5000, titulo: { simbolo: 'AAPLC', descripcion: 'Apple', pais: 'argentina', mercado: 'bCBA', tipo: 'CEDEARS', plazo: 't0', moneda: 'peso_Argentino' }, parking: null },
      ],
    };

    const estadoCuenta = { cuentas: null, estadisticas: [], totalEnPesos: 0 } as unknown as EstadoCuenta;

    // Assets only: 60000 / 1200 = 50, no cash (cuentas is null → ?? [] kicks in)
    expect(engine.calculatePortfolioValueFromData(portfolio, estadoCuenta, MEP)).toBe(50);
  });
});
