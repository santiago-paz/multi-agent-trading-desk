import { IOLToken, PortfolioResponse, Quote, OrderRequest, OrderResponse, Operation, EstadoCuenta, DatosPerfil } from './types';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
const TOKEN_CACHE_PATH = join(process.cwd(), '.iol_token_cache.json');
const TOKEN_SAFETY_MARGIN_MS = 60 * 1000; // Refresh 60s before expiry

interface CachedToken extends IOLToken {
  cached_at: string;
  computed_expiry?: string;
}

export class IOLClient {
  private baseUrl = 'https://api.invertironline.com';
  private token: IOLToken | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    if (SIMULATION_MODE) return;

    // Try to load cached token from disk
    const cached = this.loadCachedToken();
    if (cached) {
      this.token = cached;
      // Use pre-computed expiry if available, otherwise fall back to cached_at + expires_in
      if (cached.computed_expiry) {
        this.tokenExpiry = new Date(cached.computed_expiry);
      } else {
        const cachedAt = new Date(cached.cached_at).getTime();
        this.tokenExpiry = new Date(cachedAt + (cached.expires_in * 1000));
      }
      console.log('[IOL AUTH] Loaded token from cache, expires:', this.tokenExpiry.toISOString());
    }
  }

  private loadCachedToken(): CachedToken | null {
    try {
      const data = readFileSync(TOKEN_CACHE_PATH, 'utf-8');
      const cached = JSON.parse(data) as CachedToken;
      if (cached.access_token && cached.refresh_token) {
        return cached;
      }
    } catch {
      // No cache file or invalid — that's fine
    }
    return null;
  }

  private saveCachedToken(token: IOLToken, expiry: Date): void {
    try {
      const cached: CachedToken = {
        ...token,
        cached_at: new Date().toISOString(),
        computed_expiry: expiry.toISOString(),
      };
      writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cached, null, 2), 'utf-8');
      console.log('[IOL AUTH] Token saved to cache, expires:', expiry.toISOString());
    } catch (err) {
      console.warn('[IOL AUTH] Failed to save token cache:', err);
    }
  }

  private deleteCachedToken(): void {
    try {
      unlinkSync(TOKEN_CACHE_PATH);
      console.log('[IOL AUTH] Deleted stale token cache');
    } catch {
      // File doesn't exist — that's fine
    }
  }

  private async authenticate(): Promise<void> {
    if (SIMULATION_MODE) return;

    // Token still valid (with safety margin) — skip auth
    if (this.token && this.tokenExpiry && this.tokenExpiry.getTime() > (Date.now() + TOKEN_SAFETY_MARGIN_MS)) {
      return;
    }

    console.log('[IOL AUTH] Token expired or missing, authenticating...');

    // 1. Try refresh token (from current token or env)
    const refreshToken = this.token?.refresh_token || process.env.IOL_REFRESH_TOKEN;
    if (refreshToken) {
      try {
        await this.requestToken(new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }));
        console.log('[IOL AUTH] Authenticated via refresh token');
        return;
      } catch {
        console.warn('[IOL AUTH] Refresh token failed, falling back to credentials');
      }
    }

    // 2. Fall back to username/password
    const username = process.env.IOL_USERNAME;
    const password = process.env.IOL_PASSWORD;
    if (!username || !password) {
      throw new Error('No refresh token or credentials available to authenticate with IOL');
    }

    await this.requestToken(new URLSearchParams({
      username,
      password,
      grant_type: 'password',
    }));
    console.log('[IOL AUTH] Authenticated via username/password');
  }

  private async requestToken(body: URLSearchParams): Promise<void> {
    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[IOL AUTH] Token request failed (${response.status}): ${errorText}`);
      throw new Error(`Authentication failed: ${response.statusText} - ${errorText}`);
    }

    this.token = await response.json();
    if (this.token) {
      // Use .expires from the API response if available (more accurate than expires_in)
      const expiresHeader = (this.token as unknown as Record<string, unknown>)['.expires'];
      if (expiresHeader && typeof expiresHeader === 'string') {
        this.tokenExpiry = new Date(expiresHeader);
        console.log(`[IOL AUTH] Using server .expires: ${expiresHeader}`);
      } else {
        this.tokenExpiry = new Date(Date.now() + this.token.expires_in * 1000);
      }
      this.saveCachedToken(this.token, this.tokenExpiry);
    }
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}, _isRetry = false): Promise<unknown> {
    if (SIMULATION_MODE) {
      return this.mockResponse(endpoint);
    }

    await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token?.access_token}`,
      },
    });

    // If we get a 401 and haven't retried yet, force re-authentication and retry once
    if (response.status === 401 && !_isRetry) {
      console.warn(`[IOL API] Got 401 on ${endpoint}, forcing token refresh and retrying...`);
      this.token = null;
      this.tokenExpiry = null;
      this.deleteCachedToken();
      return this.fetchWithAuth(endpoint, options, true);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Mock responses for simulation mode
  private mockResponse(endpoint: string): unknown {
    console.log(`[SIMULATION] Mocking response for ${endpoint}`);
    
    if (endpoint.includes('/api/v2/Portafolio')) {
      return {
        pais: 'argentina',
        activos: [
          { cantidad: 10, comprometido: 0, puntosVariacion: 0, variacionDiaria: 1.5, ultimoPrecio: 15000, ppc: 14000, gananciaPorcentaje: 7.14, gananciaDinero: 10000, valorizado: 150000, titulo: { simbolo: 'AAPL', descripcion: 'Cedear Apple Inc.', pais: 'argentina', mercado: 'bcba', tipo: 'CEDEARS', plazo: 't1', moneda: 'peso_Argentino' }, parking: null },
          { cantidad: 5, comprometido: 0, puntosVariacion: 0, variacionDiaria: -0.5, ultimoPrecio: 12000, ppc: 11500, gananciaPorcentaje: 4.35, gananciaDinero: 2500, valorizado: 60000, titulo: { simbolo: 'KO', descripcion: 'Cedear Coca-Cola Co.', pais: 'argentina', mercado: 'bcba', tipo: 'CEDEARS', plazo: 't1', moneda: 'peso_Argentino' }, parking: null },
          { cantidad: 100000, comprometido: 0, puntosVariacion: 0, variacionDiaria: 0, ultimoPrecio: 1, ppc: 1, gananciaPorcentaje: 0, gananciaDinero: 0, valorizado: 100000, titulo: { simbolo: 'PESOS', descripcion: 'Cuenta Corriente', pais: 'argentina', mercado: 'bcba', tipo: 'MONEDA', plazo: 't0', moneda: 'peso_Argentino' }, parking: null },
        ]
      } as PortfolioResponse;
    }

    if (endpoint.includes('/api/v2/Cotizaciones')) {
      // Return a mock quote
      return {
        simbolo: 'MOCK',
        ultimoPrecio: 1000,
        variacionPorcentual: 1.5,
        apertura: 990,
        maximo: 1010,
        minimo: 980,
        cierreAnterior: 985,
        volumen: 5000,
        cantidadOperaciones: 150,
        fecha: new Date().toISOString(),
        mercado: 'bcba',
        moneda: 'peso_argentino'
      } as Quote;
    }

    if (endpoint.includes('/api/v2/estadocuenta')) {
      return {
        cuentas: [
          {
            numero: '123456',
            tipo: 'inversion_Argentina_Pesos',
            moneda: 'peso_Argentino',
            disponible: 100000,
            comprometido: 0,
            saldo: 100000,
            titulosValorizados: 250000,
            total: 350000,
            margenDescubierto: 0,
            saldos: [
              { liquidacion: 'inmediato', saldo: 100000, comprometido: 0, disponible: 100000, disponibleOperar: 100000 },
              { liquidacion: 'hrs24', saldo: 0, comprometido: 0, disponible: 0, disponibleOperar: 100000 },
              { liquidacion: 'hrs48', saldo: 0, comprometido: 0, disponible: 0, disponibleOperar: 100000 },
            ],
            estado: 'operable',
          },
        ],
        estadisticas: [
          { descripcion: 'Anterior', cantidad: 0, volumen: 0 },
          { descripcion: 'Actual', cantidad: 5, volumen: 150000 },
        ],
        totalEnPesos: 350000,
      } as EstadoCuenta;
    }

    if (endpoint.includes('/api/v2/datos-perfil')) {
      return {
        numeroCuenta: '123456',
        email: 'user@example.com',
        nombre: 'Satoshi',
        apellido: 'Nakamoto',
        tipoInversor: 'Fisica',
        perfilInversor: 'Agresivo'
      } as DatosPerfil;
    }

    return {};
  }

  async getPortfolio(): Promise<PortfolioResponse> {
    return this.fetchWithAuth('/api/v2/Portafolio/Argentina') as Promise<PortfolioResponse>;
  }

  async getQuote(symbol: string, market: string = 'bcba'): Promise<Quote> {
    if (SIMULATION_MODE) {
        // Mock specific quotes for CCL calculation or general use
        if (symbol === 'GGAL') return { ...(this.mockResponse('/api/v2/Cotizaciones') as Quote), simbolo: 'GGAL', ultimoPrecio: 4500 };
        if (symbol === 'GGAL.D') return { ...(this.mockResponse('/api/v2/Cotizaciones') as Quote), simbolo: 'GGAL.D', ultimoPrecio: 4.5 }; // Mock ADR price roughly
        if (symbol === 'AAPL') return { ...(this.mockResponse('/api/v2/Cotizaciones') as Quote), simbolo: 'AAPL', ultimoPrecio: 22000 };
        if (symbol === 'KO') return { ...(this.mockResponse('/api/v2/Cotizaciones') as Quote), simbolo: 'KO', ultimoPrecio: 18000 };
        return { ...(this.mockResponse('/api/v2/Cotizaciones') as Quote), simbolo: symbol };
    }
    return this.fetchWithAuth(`/api/v2/Cotizaciones/${market}/${symbol}`) as Promise<Quote>;
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    if (SIMULATION_MODE) {
      console.log(`[SIMULATION] Placing order: ${JSON.stringify(order)}`);
      return { numeroOperacion: 123456, mensaje: 'Orden simulada exitosa' };
    }

    const endpoint = order.side === 'buy' ? '/api/v2/Operar/Comprar' : '/api/v2/Operar/Vender';

    return this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    }) as Promise<OrderResponse>;
  }

  async getOperations(): Promise<Operation[]> {
    if (SIMULATION_MODE) {
      return [
        { numero: 1001, fechaOrden: new Date().toISOString(), tipo: 'Compra', estado: 'Terminada', mercado: 'bcba', simbolo: 'AAPL', cantidad: 10, monto: 150000, modalidad: 't0', precio: 15000 },
        { numero: 1002, fechaOrden: new Date(Date.now() - 86400000).toISOString(), tipo: 'Venta', estado: 'Terminada', mercado: 'bcba', simbolo: 'KO', cantidad: 5, monto: 60000, modalidad: 't0', precio: 12000 },
        { numero: 1003, fechaOrden: new Date(Date.now() - 172800000).toISOString(), tipo: 'Compra', estado: 'Pendiente', mercado: 'bcba', simbolo: 'TSLA', cantidad: 2, monto: 40000, modalidad: 't0', precio: 20000 },
      ];
    }
    return this.fetchWithAuth(`/api/v2/operaciones`) as Promise<Operation[]>;
  }

  async getEstadoCuenta(): Promise<EstadoCuenta> {
    return this.fetchWithAuth('/api/v2/estadocuenta') as Promise<EstadoCuenta>;
  }

  async getDatosPerfil(): Promise<DatosPerfil> {
    return this.fetchWithAuth('/api/v2/datos-perfil') as Promise<DatosPerfil>;
  }


  async getCCL(): Promise<number> {
    try {
      // CCL = (GGAL local price / GGAL.D cedear-ADR price) * conversion ratio
      // GGAL conversion ratio: 10 CEDEARs = 1 ADR
      if (SIMULATION_MODE) return 1200;

      const [ggalLocal, ggalD] = await Promise.all([
        this.getQuote('GGAL', 'bcba'),
        this.getQuote('GGAL.D', 'bcba'),
      ]);

      if (ggalLocal?.ultimoPrecio && ggalD?.ultimoPrecio) {
        const ccl = (ggalLocal.ultimoPrecio / ggalD.ultimoPrecio) * 10;
        console.log(`[IOL CCL] GGAL=${ggalLocal.ultimoPrecio} GGAL.D=${ggalD.ultimoPrecio} → CCL=${ccl.toFixed(2)}`);
        return ccl;
      }

      console.warn('[IOL CCL] Could not get GGAL prices, using fallback');
      return 1200;
    } catch (error) {
      console.error('[IOL CCL] Error calculating CCL:', error);
      return 1200;
    }
  }
}

export const iolClient = new IOLClient();
