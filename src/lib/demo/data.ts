/**
 * Mock data for demo mode (NEXT_PUBLIC_DEMO_MODE=true).
 * Returns realistic-looking but entirely fictitious values so the app
 * can be shown on social media without exposing real IOL account data.
 */

import type { PortfolioResponse, Operation, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import type { HistoricalRow, NewsItem } from '@/lib/fmp/types';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ── MEP Rate ──────────────────────────────────────────────────────────────────
export const DEMO_MEP_RATE = 1347.50;

// ── Profile ───────────────────────────────────────────────────────────────────
export const DEMO_PERFIL: DatosPerfil = {
  nombre: 'Demo',
  apellido: 'User',
  numeroCuenta: '000000',
  perfilInversor: 'Agresivo',
  email: 'demo@example.com',
};

// ── Estado de Cuenta ──────────────────────────────────────────────────────────
// Portfolio total ~5773 USD * 1347.5 ≈ 7,779,000 ARS in holdings
export const DEMO_ESTADO_CUENTA: EstadoCuenta = {
  cuentas: [
    {
      numero: '000000',
      tipo: 'inversion_Argentina_Pesos',
      moneda: 'peso_Argentino',
      disponible: 350_000,
      comprometido: 28_000,
      saldo: 378_000,
      titulosValorizados: 7_779_000,
      total: 8_157_000,
      margenDescubierto: 0,
      saldos: [
        { liquidacion: 'inmediato', saldo: 378_000, comprometido: 28_000, disponible: 350_000, disponibleOperar: 350_000 },
        { liquidacion: 'hrs24', saldo: 378_000, comprometido: 0, disponible: 378_000, disponibleOperar: 378_000 },
        { liquidacion: 'hrs48', saldo: 378_000, comprometido: 0, disponible: 378_000, disponibleOperar: 378_000 },
      ],
      estado: 'operable',
    },
    {
      numero: '000000',
      tipo: 'inversion_Argentina_Dolares',
      moneda: 'dolar_Estadounidense',
      disponible: 120,
      comprometido: 0,
      saldo: 120,
      titulosValorizados: 0,
      total: 120,
      margenDescubierto: 0,
      saldos: [
        { liquidacion: 'inmediato', saldo: 120, comprometido: 0, disponible: 120, disponibleOperar: 120 },
      ],
      estado: 'operable',
    },
  ],
  estadisticas: [
    { descripcion: 'Compras', cantidad: 47, volumen: 7_350_000 },
    { descripcion: 'Ventas', cantidad: 23, volumen: 2_210_000 },
  ],
  totalEnPesos: 8_157_000,
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

const M = DEMO_MEP_RATE; // shorthand for ARS conversion

const makeTitulo = (simbolo: string, descripcion: string) => ({
  simbolo,
  descripcion: `Cedear ${descripcion}`,
  pais: 'argentina',
  mercado: 'bCBA',
  tipo: 'CEDEARS',
  plazo: 't2',
  moneda: 'peso_Argentino',
});

/** Helper: build a PortfolioAsset from USD-denominated display values (matching the screenshot). */
function makeAsset(simbolo: string, descripcion: string, cantidad: number, priceUSD: number, chgPct: number, profitUSD: number, returnPct: number) {
  const ultimoPrecio = Math.round(priceUSD * M * 100) / 100;
  const valorizado = Math.round(ultimoPrecio * cantidad * 100) / 100;
  const gananciaDinero = Math.round(profitUSD * M * 100) / 100;
  const ppc = Math.round(ultimoPrecio / (1 + returnPct / 100) * 100) / 100;
  const puntosVariacion = Math.round(ultimoPrecio * chgPct / 100 * 100) / 100;
  return {
    cantidad,
    comprometido: 0,
    puntosVariacion,
    variacionDiaria: chgPct,
    ultimoPrecio,
    ppc,
    gananciaPorcentaje: returnPct,
    gananciaDinero,
    valorizado,
    titulo: makeTitulo(simbolo, descripcion),
    parking: null,
  };
}

export const DEMO_PORTFOLIO: PortfolioResponse = {
  pais: 'argentina',
  activos: [
    makeAsset('ABT',   'Abbott Laboratories',       1,   25.31,  2.34,   -4.48,  -15.16),
    makeAsset('ADBE',  'Adobe Systems Incorporated', 1,    5.82, -1.35,   -2.25,  -28.15),
    makeAsset('B',     'Barrick Mining Corporation', 78,  22.33,  2.46,  362.75,   26.30),
    makeAsset('BB',    'Blackberry',                  1,    1.66,  3.90,    0.54,   47.92),
    makeAsset('BIOX',  'Bioceres Crop Solutions',   200,   0.63, -3.07,    2.11,    1.73),
    makeAsset('BKNG',  'Booking Holdings Inc.',     123,   0.29,  0.24,    1.38,    4.10),
    makeAsset('GOOGL', 'Alphabet Inc. Cl. A',       211,   6.10,  2.61,  155.81,   13.76),
    makeAsset('HMY',   'Harmony Gold Mining Co',     45,  19.35,  6.31,  131.58,   17.84),
    makeAsset('KO',    'The Coca Cola Company',       1,  15.66, -0.19,   -0.05,   -0.31),
    makeAsset('NFLX',  'Netflix, Inc.',               1,   2.12, -8.02,    0.09,    4.39),
    makeAsset('NIO',   'Nio Inc.',                   94,   1.77,  1.14,   61.58,   59.51),
    makeAsset('NVDA',  'Nvidia Corporation',         67,   8.69,  1.51,  159.76,   37.99),
    makeAsset('ORLY',  'O\'reilly Automotive Inc.',   1,   0.45,  0.44,    0.01,    2.56),
    makeAsset('PAAS',  'Pan American Silver Corp',   45,  20.26,  4.00,  338.47,   58.75),
  ],
};

// ── USD Prices (D-variant prices from panel) ──────────────────────────────────
export const DEMO_USD_PRICES: Record<string, { price: number; pct: number }> = {
  ABT:   { price: 25.31, pct:  2.34 },
  ADBE:  { price:  5.82, pct: -1.35 },
  B:     { price: 22.33, pct:  2.46 },
  BB:    { price:  1.66, pct:  3.90 },
  BIOX:  { price:  0.63, pct: -3.07 },
  BKNG:  { price:  0.29, pct:  0.24 },
  GOOGL: { price:  6.10, pct:  2.61 },
  HMY:   { price: 19.35, pct:  6.31 },
  KO:    { price: 15.66, pct: -0.19 },
  NFLX:  { price:  2.12, pct: -8.02 },
  NIO:   { price:  1.77, pct:  1.14 },
  NVDA:  { price:  8.69, pct:  1.51 },
  ORLY:  { price:  0.45, pct:  0.44 },
  PAAS:  { price: 20.26, pct:  4.00 },
};

// ── Portfolio value in USD ────────────────────────────────────────────────────
// Quantities scaled ~1.96x from original: total ≈ 5773 USD
export const DEMO_VALUE_USD = 5_773;

// ── Operations ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const DEMO_OPERATIONS: Operation[] = [
  { numero: 100234, fechaOrden: daysAgo(1), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'NVDA', cantidad: 10, monto: 117_160, modalidad: 'precioLimite', precio: 11_716, fechaOperada: daysAgo(1), cantidadOperada: 10, precioOperado: 11_716, montoOperado: 117_160, plazo: 't2' },
  { numero: 100189, fechaOrden: daysAgo(2), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'GOOGL', cantidad: 20, monto: 164_430, modalidad: 'precioLimite', precio: 8_222, fechaOperada: daysAgo(2), cantidadOperada: 20, precioOperado: 8_222, montoOperado: 164_430, plazo: 't2' },
  { numero: 100145, fechaOrden: daysAgo(3), tipo: 'Venta', estado: 'terminada', mercado: 'bCBA', simbolo: 'NIO', cantidad: 12, monto: 28_620, modalidad: 'precioLimite', precio: 2_385, fechaOperada: daysAgo(3), cantidadOperada: 12, precioOperado: 2_385, montoOperado: 28_620, plazo: 't2' },
  { numero: 100098, fechaOrden: daysAgo(5), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'PAAS', cantidad: 10, monto: 273_200, modalidad: 'precioMercado', precio: 27_320, fechaOperada: daysAgo(5), cantidadOperada: 10, precioOperado: 27_320, montoOperado: 273_200, plazo: 't2' },
  { numero: 100055, fechaOrden: daysAgo(7), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'B', cantidad: 15, monto: 451_400, modalidad: 'precioLimite', precio: 30_093, fechaOperada: daysAgo(7), cantidadOperada: 15, precioOperado: 30_093, montoOperado: 451_400, plazo: 't2' },
  { numero: 100012, fechaOrden: daysAgo(10), tipo: 'Venta', estado: 'terminada', mercado: 'bCBA', simbolo: 'ADBE', cantidad: 5, monto: 39_240, modalidad: 'precioLimite', precio: 7_848, fechaOperada: daysAgo(10), cantidadOperada: 5, precioOperado: 7_848, montoOperado: 39_240, plazo: 't2' },
  { numero: 99980, fechaOrden: daysAgo(12), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'HMY', cantidad: 8, monto: 208_600, modalidad: 'precioLimite', precio: 26_075, fechaOperada: daysAgo(12), cantidadOperada: 8, precioOperado: 26_075, montoOperado: 208_600, plazo: 't2' },
  { numero: 99941, fechaOrden: daysAgo(15), tipo: 'Compra', estado: 'terminada', mercado: 'bCBA', simbolo: 'BIOX', cantidad: 50, monto: 42_500, modalidad: 'precioLimite', precio: 850, fechaOperada: daysAgo(15), cantidadOperada: 50, precioOperado: 850, montoOperado: 42_500, plazo: 't2' },
];

// ── Market Data ───────────────────────────────────────────────────────────────

function generateSparkline(basePrice: number, days: number, volatility: number = 0.02): HistoricalRow[] {
  const rows: HistoricalRow[] = [];
  let price = basePrice * (1 - volatility * days * 0.3);
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const change = (Math.random() - 0.45) * volatility * price;
    price += change;
    const high = price * (1 + Math.random() * volatility);
    const low = price * (1 - Math.random() * volatility);
    rows.push({
      date: d,
      open: price - change * 0.3,
      high,
      low,
      close: price,
      volume: Math.floor(10_000_000 + Math.random() * 50_000_000),
    });
  }
  return rows;
}

// Portfolio holdings first, then popular CEDEARs for market data panel
const DEMO_SYMBOLS = [
  // Holdings (14)
  'ABT', 'ADBE', 'B', 'BB', 'BIOX', 'BKNG', 'GOOGL', 'HMY', 'KO', 'NFLX', 'NIO', 'NVDA', 'ORLY', 'PAAS',
  // Additional popular CEDEARs
  'AAPL', 'TSLA', 'MELI', 'MSFT', 'AMZN', 'META', 'V', 'JPM', 'DIS', 'PEP', 'VALE', 'GLOB', 'VIST', 'INTC', 'BA', 'GOLD',
];

// US stock prices (used for company detail / fundamentals generation)
const DEMO_BASE_PRICES: Record<string, number> = {
  ABT: 130, ADBE: 450, B: 18, BB: 5, BIOX: 8, BKNG: 5000, GOOGL: 178, HMY: 14,
  KO: 73, NFLX: 920, NIO: 4, NVDA: 890, ORLY: 1300, PAAS: 25,
  AAPL: 218, TSLA: 285, MELI: 2150, MSFT: 445, AMZN: 198, META: 580,
  V: 310, JPM: 245, DIS: 115, PEP: 165, VALE: 10.5, GLOB: 215,
  VIST: 58, INTC: 32, BA: 195, GOLD: 18,
};

const DEMO_COMPANY_NAMES: Record<string, string> = {
  ABT: 'Abbott Laboratories', ADBE: 'Adobe Systems Inc.', B: 'Barrick Mining Corp.',
  BB: 'BlackBerry Ltd.', BIOX: 'Bioceres Crop Solutions', BKNG: 'Booking Holdings Inc.',
  GOOGL: 'Alphabet Inc.', HMY: 'Harmony Gold Mining', KO: 'Coca-Cola Company',
  NFLX: 'Netflix Inc.', NIO: 'Nio Inc.', NVDA: 'NVIDIA Corp.',
  ORLY: "O'Reilly Automotive", PAAS: 'Pan American Silver',
  AAPL: 'Apple Inc.', TSLA: 'Tesla Inc.', MELI: 'MercadoLibre Inc.',
  MSFT: 'Microsoft Corp.', AMZN: 'Amazon.com Inc.', META: 'Meta Platforms Inc.',
  V: 'Visa Inc.', JPM: 'JPMorgan Chase', DIS: 'Walt Disney Co.',
  PEP: 'PepsiCo Inc.', VALE: 'Vale S.A.', GLOB: 'Globant S.A.',
  VIST: 'Vista Energy', INTC: 'Intel Corp.', BA: 'Boeing Co.', GOLD: 'Barrick Gold',
};

// Seed the random sparklines once so they're stable within a session
let _cachedMarketData: { symbol: string; data: HistoricalRow[] }[] | null = null;

export function getDemoMarketData() {
  if (!_cachedMarketData) {
    _cachedMarketData = DEMO_SYMBOLS.map(symbol => ({
      symbol,
      data: generateSparkline(DEMO_BASE_PRICES[symbol] ?? 100, 7),
    }));
  }
  return {
    marketData: _cachedMarketData,
    ownedSymbols: DEMO_PORTFOLIO.activos.map(a => a.titulo.simbolo),
    companyNames: DEMO_COMPANY_NAMES,
  };
}

// ── News ──────────────────────────────────────────────────────────────────────
export const DEMO_NEWS_GENERAL: NewsItem[] = [
  { title: 'Fed signals potential rate cut in upcoming meeting', link: '#', publisher: 'Reuters', providerPublishTime: new Date(Date.now() - 3600_000), text: 'Federal Reserve officials indicated they may consider lowering interest rates at the next FOMC meeting amid cooling inflation data.' },
  { title: 'S&P 500 hits new all-time high on tech rally', link: '#', publisher: 'Bloomberg', providerPublishTime: new Date(Date.now() - 7200_000), text: 'Major indices surged as technology stocks led a broad market rally.' },
  { title: 'Argentina\'s Milei announces new economic reforms package', link: '#', publisher: 'Financial Times', providerPublishTime: new Date(Date.now() - 10800_000), text: 'President Milei unveiled a comprehensive package aimed at liberalizing capital markets.' },
  { title: 'Oil prices drop on OPEC+ production increase plans', link: '#', publisher: 'CNBC', providerPublishTime: new Date(Date.now() - 14400_000), text: 'Crude oil prices fell 2.3% as OPEC+ members signaled willingness to increase output.' },
  { title: 'Global semiconductor demand surges on AI infrastructure build-out', link: '#', publisher: 'Wall Street Journal', providerPublishTime: new Date(Date.now() - 18000_000), text: 'Chip companies report record orders driven by data center expansion for AI workloads.' },
  { title: 'Emerging markets see capital inflows as dollar weakens', link: '#', publisher: 'Reuters', providerPublishTime: new Date(Date.now() - 21600_000), text: 'Latin American and Asian markets attract foreign investment amid softening US dollar.' },
];

export const DEMO_NEWS_SPECIFIC: Record<string, NewsItem[]> = {
  AAPL: [
    { title: 'Apple unveils new AI features for iPhone lineup', link: '#', publisher: 'TechCrunch', providerPublishTime: new Date(Date.now() - 5400_000), relatedTickers: ['AAPL'] },
  ],
  TSLA: [
    { title: 'Tesla reports strong Q1 deliveries, exceeding estimates', link: '#', publisher: 'Electrek', providerPublishTime: new Date(Date.now() - 9000_000), relatedTickers: ['TSLA'] },
  ],
  NVDA: [
    { title: 'NVIDIA announces next-gen GPU architecture for AI training', link: '#', publisher: 'The Verge', providerPublishTime: new Date(Date.now() - 12000_000), relatedTickers: ['NVDA'] },
  ],
};

// ── CEDEARs for Quick Trade ───────────────────────────────────────────────────
export function getDemoCedearsForTrading() {
  return {
    cedears: DEMO_SYMBOLS.slice(0, 15).map(symbol => {
      const price = Math.floor((DEMO_BASE_PRICES[symbol] ?? 100) * DEMO_MEP_RATE / 10) * 10;
      return {
        simbolo: symbol + 'C',
        base: symbol,
        descripcion: DEMO_COMPANY_NAMES[symbol] ?? symbol,
        ultimoPrecio: price,
        variacionPorcentual: Math.round((Math.random() - 0.4) * 400) / 100,
        maxCantidad: Math.floor(2_450_000 / price * 0.95),
        volumen: Math.floor(50_000 + Math.random() * 500_000),
      };
    }),
    cash: 2_450_000,
    comprometido: 180_000,
    effectiveCash: 2_450_000 * 0.9935,
    commissionRate: 0.0065,
  };
}

// ── Full Portfolio Context (Auto Trader) ──────────────────────────────────────
export function getDemoFullPortfolioContext() {
  const holdingTickers = DEMO_PORTFOLIO.activos.map(a => a.titulo.simbolo);
  const holdings: Record<string, number> = {};
  for (const a of DEMO_PORTFOLIO.activos) {
    holdings[a.titulo.simbolo] = a.cantidad;
  }

  const panelSymbols = DEMO_SYMBOLS.filter(s => !holdingTickers.includes(s)).slice(0, 10);
  const allIolSymbols = [...holdingTickers, ...panelSymbols];

  // Use actual CEDEAR ARS prices from portfolio (ultimoPrecio), not US stock prices
  const arsPrices: Record<string, number> = {};
  for (const a of DEMO_PORTFOLIO.activos) {
    arsPrices[a.titulo.simbolo] = a.ultimoPrecio;
  }
  // For non-holding panel symbols, use DEMO_USD_PRICES if available, otherwise a rough CEDEAR-scale price
  for (const s of panelSymbols) {
    if (!arsPrices[s]) {
      const usd = DEMO_USD_PRICES[s];
      arsPrices[s] = usd ? Math.round(usd.price * DEMO_MEP_RATE) : Math.floor(Math.random() * 30_000 + 5_000);
    }
  }

  const portfolioPositions = DEMO_PORTFOLIO.activos.map(a => ({
    ticker: a.titulo.simbolo,
    quantity: a.cantidad,
    trade_price: Math.round((a.ppc / DEMO_MEP_RATE) * 100) / 100,
  }));

  const iolToFmp: Record<string, string> = {};
  const fmpToIol: Record<string, string> = {};
  for (const s of allIolSymbols) {
    iolToFmp[s] = s;
    fmpToIol[s] = s;
  }

  return {
    success: true as const,
    holdings,
    holdingTickers,
    panelSymbols,
    allIolSymbols,
    fmpTickers: allIolSymbols,
    iolToFmp,
    fmpToIol,
    cashArs: 350_000,
    comprometidoArs: 28_000,
    arsPrices,
    mepRate: DEMO_MEP_RATE,
    portfolioPositions,
  };
}

