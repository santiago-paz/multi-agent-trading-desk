/**
 * Integration tests against the real IOL API.
 *
 * These tests authenticate with real credentials and hit live endpoints.
 * Only read-only endpoints are tested — nothing mutates account state.
 *
 * Run manually:   IOL_INTEGRATION=1 npx vitest run src/lib/iol/client.integration.test.ts
 * Skip (default): npx vitest run  (skipped unless IOL_INTEGRATION is set)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { IOLClient } from './client';
import type {
  PortfolioResponse,
  CotizacionResponse,
  PanelResponse,
  Operation,
  OperationDetail,
  EstadoCuenta,
  DatosPerfil,
  Puntas,
} from './types';

const SKIP = !process.env.IOL_INTEGRATION;

describe.skipIf(SKIP)('IOL API integration', () => {
  let client: IOLClient;

  beforeAll(() => {
    client = new IOLClient();
  });

  // ── Authentication ─────────────────────────────────────────────────────

  it('authenticates successfully', async () => {
    // Any call implicitly authenticates; getPortfolio is the lightest
    const result = await client.getPortfolio();
    expect(result).toBeDefined();
  });

  // ── getPortfolio ───────────────────────────────────────────────────────

  describe('getPortfolio', () => {
    let portfolio: PortfolioResponse;

    beforeAll(async () => {
      portfolio = await client.getPortfolio();
    });

    it('returns pais = argentina', () => {
      expect(portfolio.pais).toBe('argentina');
    });

    it('returns activos array', () => {
      expect(Array.isArray(portfolio.activos)).toBe(true);
    });

    it('each asset has titulo with simbolo', () => {
      for (const asset of portfolio.activos) {
        expect(typeof asset.titulo.simbolo).toBe('string');
        expect(asset.titulo.simbolo.length).toBeGreaterThan(0);
        expect(typeof asset.titulo.descripcion).toBe('string');
        expect(typeof asset.titulo.mercado).toBe('string');
        expect(typeof asset.titulo.tipo).toBe('string');
        expect(typeof asset.titulo.plazo).toBe('string');
        expect(typeof asset.titulo.moneda).toBe('string');
      }
    });

    it('each asset has numeric valuation fields', () => {
      for (const asset of portfolio.activos) {
        expect(typeof asset.cantidad).toBe('number');
        expect(typeof asset.ultimoPrecio).toBe('number');
        expect(typeof asset.ppc).toBe('number');
        expect(typeof asset.gananciaPorcentaje).toBe('number');
        expect(typeof asset.gananciaDinero).toBe('number');
        expect(typeof asset.valorizado).toBe('number');
      }
    });

    it('parking is null or number', () => {
      for (const asset of portfolio.activos) {
        expect(asset.parking === null || typeof asset.parking === 'number').toBe(true);
      }
    });
  });

  // ── getQuote ───────────────────────────────────────────────────────────

  describe('getQuote', () => {
    let quote: CotizacionResponse;

    beforeAll(async () => {
      quote = await client.getQuote('AAPL');
    });

    it('returns numeric price fields', () => {
      expect(typeof quote.ultimoPrecio).toBe('number');
      expect(typeof quote.apertura).toBe('number');
      expect(typeof quote.maximo).toBe('number');
      expect(typeof quote.minimo).toBe('number');
      expect(typeof quote.cierreAnterior).toBe('number');
    });

    it('returns variacion (not variacionPorcentual)', () => {
      expect(typeof quote.variacion).toBe('number');
      expect((quote as unknown as Record<string, unknown>)['variacionPorcentual']).toBeUndefined();
    });

    it('returns tendencia string', () => {
      expect(['sube', 'baja', 'mantiene']).toContain(quote.tendencia);
    });

    it('returns fechaHora as parseable date', () => {
      expect(typeof quote.fechaHora).toBe('string');
      expect(new Date(quote.fechaHora).getTime()).not.toBeNaN();
    });

    it('returns descripcionTitulo and plazo', () => {
      expect(typeof quote.descripcionTitulo).toBe('string');
      expect(quote.descripcionTitulo.length).toBeGreaterThan(0);
      expect(typeof quote.plazo).toBe('string');
    });

    it('returns puntas as array', () => {
      expect(Array.isArray(quote.puntas)).toBe(true);
    });

    it('returns laminaMinima and lote', () => {
      expect(typeof quote.laminaMinima).toBe('number');
      expect(typeof quote.lote).toBe('number');
    });
  });

  // ── getPanelQuotes ─────────────────────────────────────────────────────

  describe('getPanelQuotes', () => {
    let panel: PanelResponse;

    beforeAll(async () => {
      panel = await client.getPanelQuotes('cedears');
    });

    it('returns titulos array with items', () => {
      expect(Array.isArray(panel.titulos)).toBe(true);
      expect(panel.titulos.length).toBeGreaterThan(0);
    });

    it('each titulo has simbolo and price fields', () => {
      for (const t of panel.titulos.slice(0, 5)) {
        expect(typeof t.simbolo).toBe('string');
        expect(typeof t.ultimoPrecio).toBe('number');
        expect(typeof t.variacionPorcentual).toBe('number');
        expect(typeof t.apertura).toBe('number');
        expect(typeof t.maximo).toBe('number');
        expect(typeof t.minimo).toBe('number');
      }
    });

    it('each titulo has ultimoCierre (not cierreAnterior)', () => {
      for (const t of panel.titulos.slice(0, 5)) {
        expect(typeof t.ultimoCierre).toBe('number');
      }
    });

    it('each titulo has puntas with bid/ask', () => {
      for (const t of panel.titulos.slice(0, 5)) {
        expect(t.puntas).toBeDefined();
        const p = t.puntas as Puntas;
        expect(typeof p.cantidadCompra).toBe('number');
        expect(typeof p.precioCompra).toBe('number');
        expect(typeof p.precioVenta).toBe('number');
        expect(typeof p.cantidadVenta).toBe('number');
      }
    });

    it('each titulo has descripcion, plazo, laminaMinima, lote', () => {
      for (const t of panel.titulos.slice(0, 5)) {
        expect(typeof t.descripcion).toBe('string');
        expect(typeof t.plazo).toBe('string');
        expect(typeof t.laminaMinima).toBe('number');
        expect(typeof t.lote).toBe('number');
      }
    });
  });

  // ── getOperations ──────────────────────────────────────────────────────

  describe('getOperations', () => {
    let operations: Operation[];

    beforeAll(async () => {
      operations = await client.getOperations(90);
    });

    it('returns an array', () => {
      expect(Array.isArray(operations)).toBe(true);
    });

    it('each operation has required fields', () => {
      for (const op of operations.slice(0, 5)) {
        expect(typeof op.numero).toBe('number');
        expect(typeof op.fechaOrden).toBe('string');
        expect(typeof op.tipo).toBe('string');
        expect(typeof op.estado).toBe('string');
        expect(typeof op.mercado).toBe('string');
        expect(typeof op.simbolo).toBe('string');
        expect(typeof op.cantidad).toBe('number');
        expect(typeof op.monto).toBe('number');
        expect(typeof op.precio).toBe('number');
        expect(typeof op.modalidad).toBe('string');
      }
    });

    it('nullable fields are null or correct type', () => {
      for (const op of operations.slice(0, 5)) {
        expect(op.fechaOperada === null || op.fechaOperada === undefined || typeof op.fechaOperada === 'string').toBe(true);
        expect(op.cantidadOperada === null || op.cantidadOperada === undefined || typeof op.cantidadOperada === 'number').toBe(true);
        expect(op.precioOperado === null || op.precioOperado === undefined || typeof op.precioOperado === 'number').toBe(true);
        expect(op.montoOperado === null || op.montoOperado === undefined || typeof op.montoOperado === 'number').toBe(true);
      }
    });
  });

  // ── getOperationDetail ──────────────────────────────────────────────────

  describe('getOperationDetail', () => {
    let operations: Operation[];
    let detail: OperationDetail;

    beforeAll(async () => {
      operations = await client.getOperations(90);
      if (operations.length === 0) return;
      detail = await client.getOperationDetail(operations[0].numero);
    });

    it('returns detail for a known operation number', () => {
      if (operations.length === 0) return; // nothing to test if no operations
      expect(detail).toBeDefined();
      expect(detail.numero).toBe(operations[0].numero);
    });

    it('has required scalar fields', () => {
      if (operations.length === 0) return;
      expect(typeof detail.mercado).toBe('string');
      expect(typeof detail.simbolo).toBe('string');
      expect(typeof detail.moneda).toBe('string');
      expect(typeof detail.tipo).toBe('string');
      expect(typeof detail.fechaAlta).toBe('string');
      expect(typeof detail.estadoActual).toBe('string');
      expect(typeof detail.precio).toBe('number');
      expect(typeof detail.cantidad).toBe('number');
      expect(typeof detail.monto).toBe('number');
      expect(typeof detail.modalidad).toBe('string');
      expect(typeof detail.plazo).toBe('string');
    });

    it('has estados array', () => {
      if (operations.length === 0) return;
      expect(Array.isArray(detail.estados)).toBe(true);
      for (const e of detail.estados) {
        expect(typeof e.detalle).toBe('string');
        expect(typeof e.fecha).toBe('string');
      }
    });

    it('has aranceles array', () => {
      if (operations.length === 0) return;
      expect(Array.isArray(detail.aranceles)).toBe(true);
    });

    it('has arancelesARS and arancelesUSD', () => {
      if (operations.length === 0) return;
      expect(typeof detail.arancelesARS).toBe('number');
      expect(typeof detail.arancelesUSD).toBe('number');
    });
  });

  // ── getEstadoCuenta ────────────────────────────────────────────────────

  describe('getEstadoCuenta', () => {
    let estado: EstadoCuenta;

    beforeAll(async () => {
      estado = await client.getEstadoCuenta();
    });

    it('has cuentas array', () => {
      expect(Array.isArray(estado.cuentas)).toBe(true);
      expect(estado.cuentas.length).toBeGreaterThan(0);
    });

    it('has totalEnPesos', () => {
      expect(typeof estado.totalEnPesos).toBe('number');
    });

    it('each cuenta has expected fields', () => {
      for (const c of estado.cuentas) {
        expect(typeof c.numero).toBe('string');
        expect(typeof c.tipo).toBe('string');
        expect(typeof c.moneda).toBe('string');
        expect(typeof c.disponible).toBe('number');
        expect(typeof c.saldo).toBe('number');
        expect(typeof c.total).toBe('number');
        expect(typeof c.estado).toBe('string');
      }
    });

    it('each cuenta has saldos with liquidacion types', () => {
      for (const c of estado.cuentas) {
        expect(Array.isArray(c.saldos)).toBe(true);
        for (const s of c.saldos) {
          expect(typeof s.liquidacion).toBe('string');
          expect(typeof s.saldo).toBe('number');
          expect(typeof s.disponible).toBe('number');
          expect(typeof s.disponibleOperar).toBe('number');
        }
      }
    });

    it('has estadisticas array', () => {
      expect(Array.isArray(estado.estadisticas)).toBe(true);
      for (const e of estado.estadisticas) {
        expect(typeof e.descripcion).toBe('string');
        expect(typeof e.cantidad).toBe('number');
        expect(typeof e.volumen).toBe('number');
      }
    });
  });

  // ── getDatosPerfil ─────────────────────────────────────────────────────

  describe('getDatosPerfil', () => {
    let perfil: DatosPerfil;

    beforeAll(async () => {
      perfil = await client.getDatosPerfil();
    });

    it('has core fields', () => {
      expect(typeof perfil.nombre).toBe('string');
      expect(typeof perfil.apellido).toBe('string');
      expect(typeof perfil.numeroCuenta).toBe('string');
      expect(typeof perfil.email).toBe('string');
      expect(typeof perfil.perfilInversor).toBe('string');
    });

    it('has extended fields from real API', () => {
      expect(typeof perfil.dni).toBe('string');
      expect(typeof perfil.cuitCuil).toBe('string');
      expect(typeof perfil.sexo).toBe('string');
      expect(typeof perfil.actualizarDDJJ).toBe('boolean');
      expect(typeof perfil.actualizarTestInversor).toBe('boolean');
      expect(typeof perfil.esBajaArrepentimiento).toBe('boolean');
      expect(typeof perfil.cuentaAbierta).toBe('boolean');
      expect(typeof perfil.actualizarTyC).toBe('boolean');
      expect(typeof perfil.actualizarTyCApp).toBe('boolean');
    });
  });

  // ── getMEP ─────────────────────────────────────────────────────────────

  describe('getMEP', () => {
    it('returns a positive number', async () => {
      const mep = await client.getMEP();
      expect(typeof mep).toBe('number');
      expect(mep).toBeGreaterThan(0);
    });
  });

  // ── placeOrder ─────────────────────────────────────────────────────────
  // Intentionally NOT tested here — it mutates account state (buy/sell).
  // Covered by unit tests in client.test.ts (URL routing, side stripping).
});
