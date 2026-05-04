import { describe, it, expect } from 'vitest';
import { getSortValue, getCashUSD, getCashARS, getComprometidoUSD, getComprometidoARS } from './usePortfolioSort';
import { PortfolioAsset, EstadoCuenta } from '@/lib/iol/types';

// ── Helper: minimal Cuenta factory ──────────────────────────────────────────

type CuentaInput = {
  moneda: string;
  disponible: number;
  comprometido?: number;
};

function makeEstado(cuentas: CuentaInput[]): EstadoCuenta {
  return {
    cuentas: cuentas.map((c, i) => ({
      numero: String(i + 1),
      tipo: 'inversion',
      moneda: c.moneda,
      disponible: c.disponible,
      comprometido: c.comprometido ?? 0,
      saldo: c.disponible,
      titulosValorizados: 0,
      total: c.disponible,
      margenDescubierto: 0,
      saldos: [],
      estado: 'activa',
    })),
    estadisticas: [],
    totalEnPesos: 0,
  };
}

// ── Helper: minimal PortfolioAsset factory ──────────────────────────────────

function makeAsset(overrides: Partial<PortfolioAsset> & { simbolo?: string; descripcion?: string } = {}): PortfolioAsset {
  const { simbolo, descripcion, ...rest } = overrides;
  return {
    cantidad: 10,
    comprometido: 0,
    puntosVariacion: 0,
    variacionDiaria: 1.5,
    ultimoPrecio: 15000,
    ppc: 14000,
    gananciaPorcentaje: 7.14,
    gananciaDinero: 10000,
    valorizado: 150000,
    parking: null,
    titulo: {
      simbolo: simbolo ?? 'AAPL',
      descripcion: descripcion ?? 'Apple Inc.',
      pais: 'argentina',
      mercado: 'bCBA',
      tipo: 'CEDEARS',
      plazo: 't0',
      moneda: 'peso_Argentino',
    },
    ...rest,
  };
}

// ── getSortValue ────────────────────────────────────────────────────────────

describe('getSortValue', () => {
  const asset = makeAsset({
    simbolo: 'KO',
    descripcion: 'Coca-Cola Co.',
    cantidad: 5,
    ultimoPrecio: 12000,
    valorizado: 60000,
    variacionDiaria: -0.5,
    gananciaDinero: 2500,
  });

  it('returns simbolo for sort key "simbolo"', () => {
    expect(getSortValue(asset, 'simbolo')).toBe('KO');
  });

  it('returns descripcion for sort key "descripcion"', () => {
    expect(getSortValue(asset, 'descripcion')).toBe('Coca-Cola Co.');
  });

  it('returns cantidad for sort key "cantidad"', () => {
    expect(getSortValue(asset, 'cantidad')).toBe(5);
  });

  it('returns ultimoPrecio for sort key "ultimoPrecio"', () => {
    expect(getSortValue(asset, 'ultimoPrecio')).toBe(12000);
  });

  it('returns valorizado for sort key "valorizado"', () => {
    expect(getSortValue(asset, 'valorizado')).toBe(60000);
  });

  it('returns variacionDiaria for sort key "variacionDiaria"', () => {
    expect(getSortValue(asset, 'variacionDiaria')).toBe(-0.5);
  });

  it('returns gananciaDinero for sort key "gananciaDinero"', () => {
    expect(getSortValue(asset, 'gananciaDinero')).toBe(2500);
  });

  it('returns gananciaPorcentaje for sort key "gananciaPorcentaje"', () => {
    const a = makeAsset({ gananciaPorcentaje: 12.5 });
    expect(getSortValue(a, 'gananciaPorcentaje')).toBe(12.5);
  });
});

// ── getCashUSD ──────────────────────────────────────────────────────────────

describe('getCashUSD', () => {
  const MEP = 1200;

  it('converts ARS cash to USD via MEP rate', () => {
    const estado: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 60000, comprometido: 0, saldo: 60000, titulosValorizados: 0, total: 60000, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };
    // 60000 / 1200 = 50
    expect(getCashUSD(estado, MEP)).toBe(50);
  });

  it('returns USD cash as-is', () => {
    const estado: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'dolar_Estadounidense', disponible: 300, comprometido: 0, saldo: 300, titulosValorizados: 0, total: 300, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };
    expect(getCashUSD(estado, MEP)).toBe(300);
  });

  it('combines ARS and USD accounts', () => {
    const estado: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 12000, comprometido: 0, saldo: 12000, titulosValorizados: 0, total: 12000, margenDescubierto: 0, saldos: [], estado: 'activa' },
        { numero: '2', tipo: 'inversion', moneda: 'dolar_Estadounidense', disponible: 200, comprometido: 0, saldo: 200, titulosValorizados: 0, total: 200, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };
    // ARS: 12000/1200 = 10, USD: 200 → 210
    expect(getCashUSD(estado, MEP)).toBe(210);
  });

  it('returns 0 for null estadoCuenta', () => {
    expect(getCashUSD(null, MEP)).toBe(0);
  });

  it('returns 0 when cuentas is null/undefined', () => {
    const estado = { cuentas: null, estadisticas: [], totalEnPesos: 0 } as unknown as EstadoCuenta;
    expect(getCashUSD(estado, MEP)).toBe(0);
  });

  it('returns 0 for empty cuentas', () => {
    const estado: EstadoCuenta = { cuentas: [], estadisticas: [], totalEnPesos: 0 };
    expect(getCashUSD(estado, MEP)).toBe(0);
  });

  it('ignores unknown currency types', () => {
    const estado: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'euro', disponible: 1000, comprometido: 0, saldo: 1000, titulosValorizados: 0, total: 1000, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };
    expect(getCashUSD(estado, MEP)).toBe(0);
  });

  it('handles multiple ARS accounts', () => {
    const estado: EstadoCuenta = {
      cuentas: [
        { numero: '1', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 6000, comprometido: 0, saldo: 6000, titulosValorizados: 0, total: 6000, margenDescubierto: 0, saldos: [], estado: 'activa' },
        { numero: '2', tipo: 'inversion', moneda: 'peso_Argentino', disponible: 6000, comprometido: 0, saldo: 6000, titulosValorizados: 0, total: 6000, margenDescubierto: 0, saldos: [], estado: 'activa' },
      ],
      estadisticas: [],
      totalEnPesos: 0,
    };
    // (6000 + 6000) / 1200 = 10
    expect(getCashUSD(estado, MEP)).toBe(10);
  });
});

// ── getCashARS ──────────────────────────────────────────────────────────────

describe('getCashARS', () => {
  const MEP = 1200;

  it('returns ARS cash as-is', () => {
    const e = makeEstado([{ moneda: 'peso_Argentino', disponible: 50000 }]);
    expect(getCashARS(e, MEP)).toBe(50000);
  });

  it('converts USD cash to ARS via MEP rate', () => {
    const e = makeEstado([{ moneda: 'dolar_Estadounidense', disponible: 100 }]);
    // 100 * 1200 = 120000
    expect(getCashARS(e, MEP)).toBe(120000);
  });

  it('combines ARS and USD accounts', () => {
    const e = makeEstado([
      { moneda: 'peso_Argentino', disponible: 50000 },
      { moneda: 'dolar_Estadounidense', disponible: 50 },
    ]);
    // 50000 + 50 * 1200 = 110000
    expect(getCashARS(e, MEP)).toBe(110000);
  });

  it('returns 0 for null estadoCuenta', () => {
    expect(getCashARS(null, MEP)).toBe(0);
  });

  it('returns 0 when cuentas is null', () => {
    const e = { cuentas: null, estadisticas: [], totalEnPesos: 0 } as unknown as EstadoCuenta;
    expect(getCashARS(e, MEP)).toBe(0);
  });

  it('ignores unknown currencies', () => {
    const e = makeEstado([{ moneda: 'euro', disponible: 1000 }]);
    expect(getCashARS(e, MEP)).toBe(0);
  });
});

// ── getComprometidoUSD ──────────────────────────────────────────────────────

describe('getComprometidoUSD', () => {
  const MEP = 1200;

  it('converts ARS comprometido to USD via MEP rate', () => {
    const e = makeEstado([{ moneda: 'peso_Argentino', disponible: 0, comprometido: 60000 }]);
    expect(getComprometidoUSD(e, MEP)).toBe(50);
  });

  it('returns USD comprometido as-is', () => {
    const e = makeEstado([{ moneda: 'dolar_Estadounidense', disponible: 0, comprometido: 25 }]);
    expect(getComprometidoUSD(e, MEP)).toBe(25);
  });

  it('combines ARS and USD comprometido', () => {
    const e = makeEstado([
      { moneda: 'peso_Argentino', disponible: 0, comprometido: 12000 },
      { moneda: 'dolar_Estadounidense', disponible: 0, comprometido: 30 },
    ]);
    // 12000/1200 + 30 = 40
    expect(getComprometidoUSD(e, MEP)).toBe(40);
  });

  it('treats missing comprometido (falsy) as 0', () => {
    const e = makeEstado([{ moneda: 'peso_Argentino', disponible: 1000, comprometido: 0 }]);
    expect(getComprometidoUSD(e, MEP)).toBe(0);
  });

  it('returns 0 for null estadoCuenta', () => {
    expect(getComprometidoUSD(null, MEP)).toBe(0);
  });

  it('ignores unknown currencies', () => {
    const e = makeEstado([{ moneda: 'euro', disponible: 0, comprometido: 5000 }]);
    expect(getComprometidoUSD(e, MEP)).toBe(0);
  });
});

// ── getComprometidoARS ──────────────────────────────────────────────────────

describe('getComprometidoARS', () => {
  const MEP = 1200;

  it('returns ARS comprometido as-is', () => {
    const e = makeEstado([{ moneda: 'peso_Argentino', disponible: 0, comprometido: 75000 }]);
    expect(getComprometidoARS(e, MEP)).toBe(75000);
  });

  it('converts USD comprometido to ARS via MEP', () => {
    const e = makeEstado([{ moneda: 'dolar_Estadounidense', disponible: 0, comprometido: 25 }]);
    // 25 * 1200 = 30000
    expect(getComprometidoARS(e, MEP)).toBe(30000);
  });

  it('combines ARS and USD comprometido', () => {
    const e = makeEstado([
      { moneda: 'peso_Argentino', disponible: 0, comprometido: 12000 },
      { moneda: 'dolar_Estadounidense', disponible: 0, comprometido: 10 },
    ]);
    // 12000 + 10 * 1200 = 24000
    expect(getComprometidoARS(e, MEP)).toBe(24000);
  });

  it('returns 0 for null estadoCuenta', () => {
    expect(getComprometidoARS(null, MEP)).toBe(0);
  });

  it('ignores unknown currencies', () => {
    const e = makeEstado([{ moneda: 'euro', disponible: 0, comprometido: 1000 }]);
    expect(getComprometidoARS(e, MEP)).toBe(0);
  });
});
