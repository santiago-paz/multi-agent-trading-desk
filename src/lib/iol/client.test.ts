import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  PortfolioResponse,
  PortfolioAsset,
  CotizacionResponse,
  PanelResponse,
  PanelQuote,
  Operation,
  EstadoCuenta,
  DatosPerfil,
  Puntas,
} from './types';

import portfolioFixture from './__fixtures__/portfolio.json';
import estadoCuentaFixture from './__fixtures__/estado-cuenta.json';
import datosPerfilFixture from './__fixtures__/datos-perfil.json';
import quoteFixture from './__fixtures__/quote-aapl.json';
import panelFixture from './__fixtures__/panel-cedears.json';
import operationsFixture from './__fixtures__/operations.json';
import tokenFixture from './__fixtures__/token.json';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSequence(responses: Array<{ status: number; body: unknown; ok?: boolean }>) {
  const impl = vi.fn();
  for (const r of responses) {
    impl.mockResolvedValueOnce({
      ok: r.ok ?? (r.status >= 200 && r.status < 300),
      status: r.status,
      statusText: r.status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(r.body),
      text: () => Promise.resolve(typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
    });
  }
  return impl;
}

function tokenResponse() {
  return {
    status: 200,
    body: {
      ...tokenFixture,
      '.issued': new Date().toUTCString(),
      '.expires': new Date(Date.now() + 1200_000).toUTCString(),
      '.refreshexpires': new Date(Date.now() + 1500_000).toUTCString(),
    },
  };
}

async function createClientWithMockedFs(cachedToken: unknown = null) {
  vi.doMock('fs', () => ({
    readFileSync: cachedToken
      ? () => JSON.stringify(cachedToken)
      : () => { throw new Error('ENOENT'); },
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  }));

  const mod = await import('./client');
  return { IOLClient: mod.IOLClient };
}

// ── Shape validation ─────────────────────────────────────────────────────────

describe('fixture shape validation', () => {
  describe('portfolio', () => {
    const data = portfolioFixture as unknown as PortfolioResponse;

    it('has pais and activos array', () => {
      expect(data.pais).toBe('argentina');
      expect(Array.isArray(data.activos)).toBe(true);
      expect(data.activos.length).toBeGreaterThan(0);
    });

    it('each asset has required numeric fields and titulo', () => {
      for (const asset of data.activos) {
        const a = asset as PortfolioAsset;
        expect(typeof a.cantidad).toBe('number');
        expect(typeof a.comprometido).toBe('number');
        expect(typeof a.ultimoPrecio).toBe('number');
        expect(typeof a.ppc).toBe('number');
        expect(typeof a.gananciaPorcentaje).toBe('number');
        expect(typeof a.gananciaDinero).toBe('number');
        expect(typeof a.valorizado).toBe('number');
        expect(a.titulo).toBeDefined();
        expect(typeof a.titulo.simbolo).toBe('string');
        expect(typeof a.titulo.descripcion).toBe('string');
        expect(typeof a.titulo.mercado).toBe('string');
        expect(typeof a.titulo.tipo).toBe('string');
        expect(a.parking === null || typeof a.parking === 'number').toBe(true);
      }
    });
  });

  describe('cotizacion (single quote)', () => {
    const data = quoteFixture as unknown as CotizacionResponse;

    it('has all CotizacionResponse fields', () => {
      expect(typeof data.ultimoPrecio).toBe('number');
      expect(typeof data.variacion).toBe('number');
      expect(typeof data.apertura).toBe('number');
      expect(typeof data.maximo).toBe('number');
      expect(typeof data.minimo).toBe('number');
      expect(typeof data.fechaHora).toBe('string');
      expect(typeof data.tendencia).toBe('string');
      expect(typeof data.cierreAnterior).toBe('number');
      expect(typeof data.montoOperado).toBe('number');
      expect(typeof data.moneda).toBe('string');
      expect(Array.isArray(data.puntas)).toBe(true);
      expect(typeof data.cantidadOperaciones).toBe('number');
      expect(typeof data.descripcionTitulo).toBe('string');
      expect(typeof data.plazo).toBe('string');
      expect(typeof data.laminaMinima).toBe('number');
      expect(typeof data.lote).toBe('number');
    });
  });

  describe('panel quotes', () => {
    const data = panelFixture as unknown as PanelResponse;

    it('has titulos array', () => {
      expect(Array.isArray(data.titulos)).toBe(true);
      expect(data.titulos.length).toBeGreaterThan(0);
    });

    it('each titulo has required panel fields', () => {
      for (const t of data.titulos) {
        const q = t as PanelQuote;
        expect(typeof q.simbolo).toBe('string');
        expect(typeof q.ultimoPrecio).toBe('number');
        expect(typeof q.variacionPorcentual).toBe('number');
        expect(typeof q.ultimoCierre).toBe('number');
        expect(typeof q.descripcion).toBe('string');
        expect(typeof q.plazo).toBe('string');
        expect(q.tipoOpcion === null || typeof q.tipoOpcion === 'string').toBe(true);
      }
    });

    it('each titulo has puntas with bid/ask', () => {
      for (const t of data.titulos) {
        expect(t.puntas).toBeDefined();
        const p = t.puntas as Puntas;
        expect(typeof p.cantidadCompra).toBe('number');
        expect(typeof p.precioCompra).toBe('number');
        expect(typeof p.precioVenta).toBe('number');
        expect(typeof p.cantidadVenta).toBe('number');
      }
    });
  });

  describe('operations', () => {
    const data = operationsFixture as unknown as Operation[];

    it('is an array of operations', () => {
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('each operation has required fields', () => {
      for (const op of data) {
        expect(typeof op.numero).toBe('number');
        expect(typeof op.fechaOrden).toBe('string');
        expect(typeof op.tipo).toBe('string');
        expect(typeof op.estado).toBe('string');
        expect(typeof op.mercado).toBe('string');
        expect(typeof op.simbolo).toBe('string');
        expect(typeof op.cantidad).toBe('number');
        expect(typeof op.monto).toBe('number');
        expect(typeof op.precio).toBe('number');
      }
    });

    it('nullable fields are null or correct type', () => {
      for (const op of data) {
        expect(op.fechaOperada === null || typeof op.fechaOperada === 'string').toBe(true);
        expect(op.cantidadOperada === null || typeof op.cantidadOperada === 'number').toBe(true);
        expect(op.precioOperado === null || typeof op.precioOperado === 'number').toBe(true);
        expect(op.montoOperado === null || typeof op.montoOperado === 'number').toBe(true);
      }
    });

    it('contains operations in different states', () => {
      const states = new Set(data.map(op => op.estado));
      expect(states.has('iniciada')).toBe(true);
      expect(states.has('terminada')).toBe(true);
      expect(states.has('cancelada')).toBe(true);
    });
  });

  describe('estado cuenta', () => {
    const data = estadoCuentaFixture as unknown as EstadoCuenta;

    it('has cuentas, estadisticas, and totalEnPesos', () => {
      expect(Array.isArray(data.cuentas)).toBe(true);
      expect(data.cuentas.length).toBeGreaterThan(0);
      expect(Array.isArray(data.estadisticas)).toBe(true);
      expect(typeof data.totalEnPesos).toBe('number');
    });

    it('each cuenta has saldos array', () => {
      for (const c of data.cuentas) {
        expect(typeof c.numero).toBe('string');
        expect(typeof c.tipo).toBe('string');
        expect(typeof c.moneda).toBe('string');
        expect(typeof c.disponible).toBe('number');
        expect(typeof c.total).toBe('number');
        expect(typeof c.estado).toBe('string');
        expect(Array.isArray(c.saldos)).toBe(true);
        for (const s of c.saldos) {
          expect(typeof s.liquidacion).toBe('string');
          expect(typeof s.saldo).toBe('number');
          expect(typeof s.disponibleOperar).toBe('number');
        }
      }
    });
  });

  describe('datos perfil', () => {
    const data = datosPerfilFixture as unknown as DatosPerfil;

    it('has core profile fields', () => {
      expect(typeof data.nombre).toBe('string');
      expect(typeof data.apellido).toBe('string');
      expect(typeof data.numeroCuenta).toBe('string');
      expect(typeof data.email).toBe('string');
      expect(typeof data.perfilInversor).toBe('string');
    });

    it('has extended profile fields from real API', () => {
      expect(typeof data.dni).toBe('string');
      expect(typeof data.cuitCuil).toBe('string');
      expect(typeof data.sexo).toBe('string');
      expect(typeof data.actualizarDDJJ).toBe('boolean');
      expect(typeof data.cuentaAbierta).toBe('boolean');
    });
  });

  describe('token', () => {
    it('has access and refresh tokens', () => {
      expect(typeof tokenFixture.access_token).toBe('string');
      expect(typeof tokenFixture.refresh_token).toBe('string');
      expect(typeof tokenFixture.expires_in).toBe('number');
      expect(typeof tokenFixture.token_type).toBe('string');
    });

    it('has dot-prefixed date fields', () => {
      expect(typeof tokenFixture['.issued']).toBe('string');
      expect(typeof tokenFixture['.expires']).toBe('string');
      expect(typeof tokenFixture['.refreshexpires']).toBe('string');
    });

    it('.expires parses to a valid date', () => {
      const d = new Date(tokenFixture['.expires']);
      expect(d.getTime()).not.toBeNaN();
    });
  });

  describe('MEP', () => {
    it('is a raw number', () => {
      const mep = 1429.73;
      expect(typeof mep).toBe('number');
      expect(mep).toBeGreaterThan(0);
    });
  });
});

// ── Client unit tests ────────────────────────────────────────────────────────

describe('IOLClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('IOL_USERNAME', 'test@example.com');
    vi.stubEnv('IOL_PASSWORD', 'testpass123');
    vi.stubEnv('IOL_REFRESH_TOKEN', '');
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── Auth flow ────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('authenticates with username/password on first call', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();

      const tokenCall = fetchSpy.mock.calls[0];
      expect(tokenCall[0]).toBe('https://api.invertironline.com/token');
      const body = tokenCall[1].body as URLSearchParams;
      expect(body.get('grant_type')).toBe('password');
      expect(body.get('username')).toBe('test@example.com');
      expect(body.get('password')).toBe('testpass123');
    });

    it('authenticates with refresh token when available', async () => {
      vi.stubEnv('IOL_REFRESH_TOKEN', 'my-refresh-token');
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();

      const tokenCall = fetchSpy.mock.calls[0];
      const body = tokenCall[1].body as URLSearchParams;
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('my-refresh-token');
    });

    it('falls back to password when refresh token fails', async () => {
      vi.stubEnv('IOL_REFRESH_TOKEN', 'expired-refresh');
      fetchSpy = mockFetchSequence([
        { status: 400, body: 'invalid_grant', ok: false },
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();

      const secondTokenCall = fetchSpy.mock.calls[1];
      const body = secondTokenCall[1].body as URLSearchParams;
      expect(body.get('grant_type')).toBe('password');
    });

    it('throws when no credentials available', async () => {
      vi.stubEnv('IOL_USERNAME', '');
      vi.stubEnv('IOL_PASSWORD', '');
      vi.stubEnv('IOL_REFRESH_TOKEN', '');

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await expect(client.getPortfolio()).rejects.toThrow('No refresh token or credentials available');
    });

    it('skips auth when token is still valid', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: portfolioFixture },
        { status: 200, body: estadoCuentaFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();
      await client.getEstadoCuenta();

      // Only 1 token call + 2 API calls = 3 total
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('parses .expires from token response for expiry', async () => {
      const futureExpiry = new Date(Date.now() + 600_000).toUTCString();
      const tokenWithExpires = {
        ...tokenFixture,
        '.expires': futureExpiry,
      };
      fetchSpy = mockFetchSequence([
        { status: 200, body: tokenWithExpires },
        { status: 200, body: portfolioFixture },
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();
      await client.getPortfolio();

      // Token should still be valid — only 1 auth call
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.mock.calls[0][0]).toContain('/token');
      expect(fetchSpy.mock.calls[1][0]).toContain('/Portafolio');
      expect(fetchSpy.mock.calls[2][0]).toContain('/Portafolio');
    });

    it('loads cached token from disk on construction', async () => {
      const cachedToken = {
        ...tokenFixture,
        cached_at: new Date().toISOString(),
        computed_expiry: new Date(Date.now() + 600_000).toISOString(),
      };
      fetchSpy = mockFetchSequence([
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs(cachedToken);
      const client = new IOLClient();
      await client.getPortfolio();

      // No token call — used cached token
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toContain('/Portafolio');
    });
  });

  // ── 401 retry ────────────────────────────────────────────────────────────

  describe('401 retry', () => {
    it('retries once on 401 with fresh token', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 401, body: 'Unauthorized', ok: false },
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const result = await client.getPortfolio();

      expect(result.pais).toBe('argentina');
      // auth -> 401 -> re-auth -> success = 4 calls
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('throws on second 401 (no infinite retry)', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 401, body: 'Unauthorized', ok: false },
        tokenResponse(),
        { status: 401, body: 'Unauthorized', ok: false },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await expect(client.getPortfolio()).rejects.toThrow('API request failed');
    });
  });

  // ── Service message detection ────────────────────────────────────────────

  describe('service message detection', () => {
    it('throws on IOL maintenance message body', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { message: 'El servicio no está disponible en este momento' } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await expect(client.getPortfolio()).rejects.toThrow('El servicio no está disponible en este momento');
    });

    it('does not throw on normal responses that happen to have a message field', async () => {
      const normalData = { ...portfolioFixture, message: 'extra', otherField: true };
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: normalData },
      ]);
      vi.stubGlobal('fetch', fetchSpy);

      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const result = await client.getPortfolio();
      expect(result.pais).toBe('argentina');
    });
  });

  // ── Method URL construction ──────────────────────────────────────────────

  describe('method URL construction', () => {
    async function setupClient() {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: {} },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      return new IOLClient();
    }

    function apiCallUrl(): string {
      return fetchSpy.mock.calls[1][0] as string;
    }

    it('getPortfolio → /api/v2/Portafolio/Argentina', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPortfolio();
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/Portafolio/Argentina');
    });

    it('getQuote → /api/v2/{market}/Titulos/{symbol}/Cotizacion', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: quoteFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getQuote('AAPL');
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/bcba/Titulos/AAPL/Cotizacion');
    });

    it('getQuote with custom market', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: quoteFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getQuote('AAPL', 'nYSE');
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/nYSE/Titulos/AAPL/Cotizacion');
    });

    it('getPanelQuotes → /api/v2/Cotizaciones/{instrumento}/{pais}/Todos', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: panelFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPanelQuotes('cedears');
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/Cotizaciones/cedears/argentina/Todos');
    });

    it('getPanelQuotes with custom pais', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: panelFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getPanelQuotes('acciones', 'estados_Unidos');
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/Cotizaciones/acciones/estados_Unidos/Todos');
    });

    it('getOperations → /api/v2/operaciones with date filters', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: operationsFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getOperations(30);
      const url = apiCallUrl();
      expect(url).toContain('/api/v2/operaciones?');
      expect(url).toContain('filtro.estado=Todas');
      expect(url).toContain('filtro.fechaDesde=');
      expect(url).toContain('filtro.fechaHasta=');
    });

    it('getEstadoCuenta → /api/v2/estadocuenta', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: estadoCuentaFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getEstadoCuenta();
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/estadocuenta');
    });

    it('getDatosPerfil → /api/v2/datos-perfil', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: datosPerfilFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getDatosPerfil();
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/datos-perfil');
    });

    it('getOperationDetail → /api/v2/operaciones/{numero}', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { numero: 12345, mercado: 'BCBA', simbolo: 'AAPL' } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getOperationDetail(12345);
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/operaciones/12345');
    });

    it('getMEP → /api/v2/Cotizaciones/MEP/AL30', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: 1429.73 },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.getMEP();
      expect(apiCallUrl()).toBe('https://api.invertironline.com/api/v2/Cotizaciones/MEP/AL30');
    });
  });

  // ── placeOrder ───────────────────────────────────────────────────────────

  describe('placeOrder', () => {
    it('buy order hits /operar/Comprar', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { ok: true, messages: [] } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.placeOrder({
        mercado: 'bCBA',
        simbolo: 'AAPL',
        cantidad: 10,
        precio: 18350,
        plazo: 't1',
        validez: '2026-03-28T00:00:00',
        side: 'buy',
      });
      expect(fetchSpy.mock.calls[1][0]).toContain('/operar/Comprar');
    });

    it('sell order hits /operar/Vender', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { ok: true, messages: [] } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.placeOrder({
        mercado: 'bCBA',
        simbolo: 'AAPL',
        cantidad: 5,
        precio: 18500,
        plazo: 't1',
        validez: '2026-03-28T00:00:00',
        side: 'sell',
      });
      expect(fetchSpy.mock.calls[1][0]).toContain('/operar/Vender');
    });

    it('strips side field from request body', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { ok: true, messages: [] } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      await client.placeOrder({
        mercado: 'bCBA',
        simbolo: 'AAPL',
        cantidad: 10,
        precio: 18350,
        plazo: 't1',
        validez: '2026-03-28T00:00:00',
        side: 'buy',
      });

      const sentBody = JSON.parse(fetchSpy.mock.calls[1][1].body as string);
      expect(sentBody).not.toHaveProperty('side');
      expect(sentBody.simbolo).toBe('AAPL');
      expect(sentBody.cantidad).toBe(10);
    });
  });

  // ── getMEP ───────────────────────────────────────────────────────────────

  describe('getMEP', () => {
    it('returns the numeric MEP rate', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: 1429.73 },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const rate = await client.getMEP();
      expect(rate).toBe(1429.73);
    });

    it('returns 1200 fallback on API error', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 500, body: 'Internal Server Error', ok: false },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const rate = await client.getMEP();
      expect(rate).toBe(1200);
    });

    it('returns 1200 fallback when response is not a number', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: { cotizacion: 1429 } },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const rate = await client.getMEP();
      expect(rate).toBe(1200);
    });
  });

  // ── Response parsing ─────────────────────────────────────────────────────

  describe('response parsing', () => {
    it('getPortfolio returns parsed portfolio', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: portfolioFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const result = await client.getPortfolio();
      expect(result.pais).toBe('argentina');
      expect(result.activos).toHaveLength(3);
      expect(result.activos[0].titulo.simbolo).toBe('ABT');
    });

    it('getEstadoCuenta returns parsed account data', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: estadoCuentaFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const result = await client.getEstadoCuenta();
      expect(result.cuentas).toHaveLength(2);
      expect(result.cuentas[0].tipo).toBe('inversion_Argentina_Pesos');
      expect(result.cuentas[1].tipo).toBe('inversion_Argentina_Dolares');
      expect(result.totalEnPesos).toBeGreaterThan(0);
    });

    it('getOperations returns parsed operations array', async () => {
      fetchSpy = mockFetchSequence([
        tokenResponse(),
        { status: 200, body: operationsFixture },
      ]);
      vi.stubGlobal('fetch', fetchSpy);
      const { IOLClient } = await createClientWithMockedFs();
      const client = new IOLClient();
      const result = await client.getOperations();
      expect(result).toHaveLength(3);
      expect(result[0].estado).toBe('iniciada');
      expect(result[1].estado).toBe('terminada');
      expect(result[1].fechaOperada).toBe('2026-03-25T10:34:22');
    });
  });
});
