import { describe, it, expect } from 'vitest';
import { extractCashArs, effectiveCashAfterCommission, filterAffordableCedears, COMMISSION_RATE } from './quick-trade';
import { PanelQuote, EstadoCuenta } from '@/lib/iol/types';

// ── Helper: minimal PanelQuote factory ─────────────────────────────────────

function makeQuote(overrides: Partial<PanelQuote> & { simbolo: string }): PanelQuote {
  return {
    ultimoPrecio: 100,
    variacionPorcentual: 1.5,
    apertura: 99,
    maximo: 101,
    minimo: 98,
    cierreAnterior: 99,
    volumen: 5000,
    cantidadOperaciones: 200,
    fecha: '2026-03-24T00:00:00',
    tipoOpcion: null,
    precioEjercicio: null,
    fechaVencimiento: null,
    mercado: 'bCBA',
    moneda: 'peso_Argentino',
    descripcion: 'Cedear Test',
    plazo: 't1',
    ...overrides,
  };
}

function makeEstadoCuenta(disponible: number, disponibleOperar24hs?: number): EstadoCuenta {
  return {
    cuentas: [{
      numero: '1',
      tipo: 'inversion_Argentina_Pesos',
      moneda: 'peso_Argentino',
      disponible,
      comprometido: 0,
      saldo: disponible,
      titulosValorizados: 0,
      total: disponible,
      margenDescubierto: 0,
      saldos: disponibleOperar24hs !== undefined
        ? [{ liquidacion: 'hrs24', saldo: disponible, comprometido: 0, disponible, disponibleOperar: disponibleOperar24hs }]
        : [],
      estado: 'operable',
    }],
    estadisticas: [],
    totalEnPesos: disponible,
  };
}

// ── extractCashArs ─────────────────────────────────────────────────────────

describe('extractCashArs', () => {
  it('returns disponible when no hrs24 saldo exists', () => {
    const cuenta = makeEstadoCuenta(50000);
    expect(extractCashArs(cuenta)).toBe(50000);
  });

  it('prefers disponibleOperar from hrs24 settlement tier', () => {
    const cuenta = makeEstadoCuenta(50000, 80000);
    expect(extractCashArs(cuenta)).toBe(80000);
  });

  it('returns 0 when no ARS account exists', () => {
    const cuenta: EstadoCuenta = {
      cuentas: [{
        numero: '1',
        tipo: 'inversion',
        moneda: 'dolar_Estadounidense',
        disponible: 1000,
        comprometido: 0,
        saldo: 1000,
        titulosValorizados: 0,
        total: 1000,
        margenDescubierto: 0,
        saldos: [],
        estado: 'operable',
      }],
      estadisticas: [],
      totalEnPesos: 0,
    };
    expect(extractCashArs(cuenta)).toBe(0);
  });

  it('returns 0 when cuentas is empty', () => {
    const cuenta: EstadoCuenta = { cuentas: [], estadisticas: [], totalEnPesos: 0 };
    expect(extractCashArs(cuenta)).toBe(0);
  });
});

// ── effectiveCashAfterCommission ───────────────────────────────────────────

describe('effectiveCashAfterCommission', () => {
  it('reduces cash by commission rate', () => {
    // 10000 / 1.015 ≈ 9852.22
    const result = effectiveCashAfterCommission(10000);
    expect(result).toBeCloseTo(10000 / 1.015, 2);
  });

  it('uses default COMMISSION_RATE (1.5%)', () => {
    const result = effectiveCashAfterCommission(10000);
    expect(result).toBeCloseTo(10000 / (1 + COMMISSION_RATE), 2);
  });

  it('accepts custom commission rate', () => {
    const result = effectiveCashAfterCommission(10000, 0.02);
    expect(result).toBeCloseTo(10000 / 1.02, 2);
  });

  it('returns 0 for 0 cash', () => {
    expect(effectiveCashAfterCommission(0)).toBe(0);
  });
});

// ── filterAffordableCedears ────────────────────────────────────────────────

describe('filterAffordableCedears', () => {
  it('returns only CEDEARs the user can afford (at least 1 unit)', () => {
    const titulos = [
      makeQuote({ simbolo: 'AAPLC', ultimoPrecio: 500, volumen: 1000 }),
      makeQuote({ simbolo: 'TSLAC', ultimoPrecio: 2000, volumen: 800 }),
    ];
    // effectiveCash = 1000 → can afford AAPL (500 each, max 2) but not TSLA (2000)
    const result = filterAffordableCedears(titulos, 1000);
    expect(result).toHaveLength(1);
    expect(result[0].base).toBe('AAPL');
    expect(result[0].maxCantidad).toBe(2);
  });

  it('calculates maxCantidad as floor(effectiveCash / price)', () => {
    const titulos = [
      makeQuote({ simbolo: 'GOGL', ultimoPrecio: 300, volumen: 100 }),
    ];
    // 1000 / 300 = 3.33 → floor = 3
    const result = filterAffordableCedears(titulos, 1000);
    expect(result[0].maxCantidad).toBe(3);
  });

  it('skips D-suffix variants when C-variant exists', () => {
    const titulos = [
      makeQuote({ simbolo: 'AAPLC', ultimoPrecio: 500, volumen: 1000 }),
      makeQuote({ simbolo: 'AAPLD', ultimoPrecio: 0.5, volumen: 500 }),
    ];
    const result = filterAffordableCedears(titulos, 10000);
    expect(result).toHaveLength(1);
    expect(result[0].simbolo).toBe('AAPLC');
  });

  it('keeps D-suffix variant when no C-variant exists', () => {
    const titulos = [
      makeQuote({ simbolo: 'AAPLD', ultimoPrecio: 0.5, volumen: 500 }),
    ];
    const result = filterAffordableCedears(titulos, 10000);
    expect(result).toHaveLength(1);
    expect(result[0].simbolo).toBe('AAPLD');
    expect(result[0].base).toBe('AAPL');
  });

  it('deduplicates by base symbol (first occurrence wins)', () => {
    const titulos = [
      makeQuote({ simbolo: 'KOC', ultimoPrecio: 100, volumen: 2000, descripcion: 'Coca-Cola peso' }),
      makeQuote({ simbolo: 'KO', ultimoPrecio: 100, volumen: 1000, descripcion: 'Coca-Cola bare' }),
    ];
    const result = filterAffordableCedears(titulos, 10000);
    expect(result).toHaveLength(1);
    expect(result[0].simbolo).toBe('KOC');
    expect(result[0].descripcion).toBe('Coca-Cola peso');
  });

  it('skips quotes with price <= 0', () => {
    const titulos = [
      makeQuote({ simbolo: 'ZEROC', ultimoPrecio: 0, volumen: 999 }),
      makeQuote({ simbolo: 'NEGC', ultimoPrecio: -5, volumen: 999 }),
      makeQuote({ simbolo: 'GOGL', ultimoPrecio: 10, volumen: 100 }),
    ];
    const result = filterAffordableCedears(titulos, 10000);
    expect(result).toHaveLength(1);
    expect(result[0].base).toBe('GOGL');
  });

  it('sorts by volume descending', () => {
    const titulos = [
      makeQuote({ simbolo: 'LOWVOL', ultimoPrecio: 10, volumen: 100 }),
      makeQuote({ simbolo: 'HIVOL', ultimoPrecio: 10, volumen: 9000 }),
      makeQuote({ simbolo: 'MIDVOL', ultimoPrecio: 10, volumen: 500 }),
    ];
    const result = filterAffordableCedears(titulos, 10000);
    expect(result.map(c => c.base)).toEqual(['HIVOL', 'MIDVOL', 'LOWVOL']);
  });

  it('returns empty array when nothing is affordable', () => {
    const titulos = [
      makeQuote({ simbolo: 'EXPC', ultimoPrecio: 50000 }),
    ];
    const result = filterAffordableCedears(titulos, 100);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty titulos', () => {
    expect(filterAffordableCedears([], 10000)).toEqual([]);
  });

  it('preserves variacionPorcentual and volumen in output', () => {
    const titulos = [
      makeQuote({ simbolo: 'HDC', ultimoPrecio: 50, variacionPorcentual: -2.5, volumen: 3000 }),
    ];
    const result = filterAffordableCedears(titulos, 1000);
    expect(result[0].variacionPorcentual).toBe(-2.5);
    expect(result[0].volumen).toBe(3000);
  });
});
