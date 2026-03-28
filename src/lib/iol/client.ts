import { IOLToken, PortfolioResponse, Quote, CotizacionResponse, OrderRequest, OrderResponse, Operation, OperationDetail, EstadoCuenta, DatosPerfil, PanelResponse } from './types';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

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

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
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
      const errorText = await response.text();
      const shortError = errorText.includes('<html') ? `[HTML error page]` : errorText.slice(0, 200);
      console.warn(`[IOL API] Request to ${endpoint} failed with ${response.status}: ${shortError}`);
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const json = await response.json();

    // IOL sometimes returns HTTP 200 with a maintenance/error message body instead of real data.
    // Detect this pattern and throw a clear error so callers don't crash on missing fields.
    if (json && typeof json === 'object' && 'message' in json && !Array.isArray(json)) {
      const keys = Object.keys(json);
      if (keys.length === 1 || (keys.length <= 2 && keys.includes('message'))) {
        console.warn(`[IOL API] ${endpoint} returned HTTP ${response.status} but body is a service message:`, json.message);
        throw new Error(json.message);
      }
    }

    return json as T;
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
    return this.fetchWithAuth<PortfolioResponse>('/api/v2/Portafolio/Argentina');
  }

  async getQuote(symbol: string, market: string = 'bcba'): Promise<CotizacionResponse> {
    return this.fetchWithAuth<CotizacionResponse>(`/api/v2/${market}/Titulos/${symbol}/Cotizacion`);
  }

  async getPanelQuotes(instrumento: string, pais: string = 'argentina'): Promise<PanelResponse> {    
    return this.fetchWithAuth<PanelResponse>(`/api/v2/Cotizaciones/${instrumento}/${pais}/Todos`);
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const endpoint = order.side === 'buy' ? '/api/v2/operar/Comprar' : '/api/v2/operar/Vender';

    // Strip internal `side` field before sending to IOL API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { side: _side, ...apiBody } = order;

    return this.fetchWithAuth<OrderResponse>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiBody),
    });
  }

  async getOperations(daysToFetch: number = 30): Promise<Operation[]> {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - daysToFetch);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const queryString = new URLSearchParams({
      'filtro.estado': 'Todas',
      'filtro.fechaDesde': formatDate(fromDate),
      'filtro.fechaHasta': formatDate(toDate),
    }).toString();

    return this.fetchWithAuth<Operation[]>(`/api/v2/operaciones?${queryString}`);
  }

  async getOperationDetail(numero: number): Promise<OperationDetail> {
    return this.fetchWithAuth<OperationDetail>(`/api/v2/operaciones/${numero}`);
  }

  async getEstadoCuenta(): Promise<EstadoCuenta> {
    return this.fetchWithAuth<EstadoCuenta>('/api/v2/estadocuenta');
  }

  async getDatosPerfil(): Promise<DatosPerfil> {
    return this.fetchWithAuth<DatosPerfil>('/api/v2/datos-perfil');
  }


  async getMEP(): Promise<number> {
    try {
      const data = await this.fetchWithAuth<number>('/api/v2/Cotizaciones/MEP/AL30');
      if (typeof data === 'number') {
        return data;
      }
      return 1200;
    } catch (error) {
      console.error('[IOL MEP] Error fetching MEP:', error);
      return 1200;
    }
  }
}

export const iolClient = new IOLClient();
