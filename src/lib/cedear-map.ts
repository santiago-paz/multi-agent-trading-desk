/**
 * CEDEAR ticker mapping: IOL symbol → US/international ticker used by FMP.
 *
 * Most CEDEARs share the exact same ticker as the underlying stock (e.g. AAPL, KO, TSLA).
 * This map only contains the **exceptions** — tickers that IOL lists differently
 * from the symbol FMP (Financial Modeling Prep) recognizes.
 *
 * When adding entries:
 *  - key   = IOL base symbol (after stripping C/D suffix)
 *  - value = FMP-recognized ticker (US exchange), or null if there is
 *            no US-listed equivalent (e.g. Brazilian-only stocks)
 */
const IOL_TO_FMP: Record<string, string | null> = {
  // ── BYMA code differs from US/FMP ticker ────────────────────────────────
  // Source: official BYMA CEDEAR list (updated 3/2/2026)

  XROX: 'XRX',     // Xerox Holdings (NYSE: XRX)
  ADGO: 'AGRO',    // Adecoagro S.A. (NYSE: AGRO)
  AOCA: 'ACH',     // Aluminum Corp of China (NYSE: ACH)
  'BA.C': 'BAC',   // Bank of America (NYSE: BAC) — BYMA uses BA.C to avoid clash with Boeing (BA)
  // B maps to itself on FMP — Barrick Mining Corporation (ex Barrick Gold) trades as "B" on NYSE
  BRKB: 'BRK-B',   // Berkshire Hathaway (NYSE: BRK-B)
  BNG: 'BG',       // Bunge Limited (NYSE: BG)
  DISN: 'DIS',     // Walt Disney Co. (NYSE: DIS)
  DTEA: 'DTEGY',   // Deutsche Telekom (OTC: DTEGY)
  KOFM: 'KOF',     // Coca-Cola Femsa (NYSE: KOF)
  NOKA: 'NOK',     // Nokia Corporation (NYSE: NOK)
  PKS: 'PKX',      // Posco Holdings (NYSE: PKX)
  TEFO: 'TEF',     // Telefonica S.A. (NYSE: TEF)
  TRVV: 'TRV',     // Travelers Cos. (NYSE: TRV)
  TXR: 'TX',       // Ternium S.A. (NYSE: TX)
  UN: 'NU',        // Nu Holdings (NYSE: NU)
  WBO: 'WB',       // Weibo Corporation (NASDAQ: WB)
  YZCA: 'YZC',     // Yanzhou Coal Mining (OTC: YZC)

  // ── Brazilian B3 tickers → NYSE/NASDAQ ADR ──────────────────────────────
  ABEV3: 'ABEV',   // Ambev S.A. (NASDAQ: ABEV)
  BBDC3: 'BBD',    // Banco Bradesco (NYSE: BBD)
  BPA11: null,      // Banco BTG Pactual — no US ADR
  BBAS3: null,      // Banco do Brasil — no US ADR
  ITUB3: 'ITUB',   // Itaú Unibanco (NYSE: ITUB)
  CSNA3: null,      // Companhia Siderúrgica Nacional — no US ADR (use SID for the ADR version)
  HAPV3: null,      // Hapvida — no US ADR
  LREN3: null,      // Lojas Renner — no US ADR
  MGLU3: null,      // Magazine Luiza — no US ADR
  NTCO3: 'NTCO',   // Natura & Co (NYSE: NTCO)
  PETR3: 'PBR',    // Petrobras (NYSE: PBR)
  PRIO3: null,      // PetroRio — no US ADR
  RENT3: null,      // Localiza Rent a Car — no US ADR
  SBSP3: null,      // Cia Saneamento Básico de SP — no US ADR (use SBS for the ADR version)
  SUZB3: 'SUZ',    // Suzano (NYSE: SUZ)
  TIMS3: 'TIMB',   // TIM S.A. (NYSE: TIMB)
  VALE3: 'VALE',   // Vale S.A. (NYSE: VALE)
  VIVT3: 'VIV',    // Telefônica Brasil (NYSE: VIV)
  WEGE3: null,      // Weg S.A. — no US ADR
  RCTB4: null,      // Telebras — no liquid US equivalent

  // ── ETFs / ETNs / Funds — same ticker on FMP (identity mapping) ─────────
  ACWI: 'ACWI',     // iShares MSCI ACWI ETF
  ARKK: 'ARKK',     // ARK Innovation ETF
  CIBR: 'CIBR',     // First Trust NASDAQ Cybersecurity ETF
  COPX: 'COPX',     // Global X Copper Miners ETF
  DIA: 'DIA',       // SPDR Dow Jones Industrial Average ETF Trust
  EEM: 'EEM',       // iShares MSCI Emerging Markets ETF
  EFA: 'EFA',       // iShares MSCI EAFE ETF
  ESGU: 'ESGU',     // iShares ESG Aware MSCI USA ETF
  ETHA: 'ETHA',     // iShares Ethereum Trust ETF
  EWJ: 'EWJ',       // iShares MSCI Japan ETF
  EWZ: 'EWZ',       // iShares MSCI Brazil ETF
  FXI: 'FXI',       // iShares China Large-Cap ETF
  GDX: 'GDX',       // VanEck Gold Miners ETF
  GLD: 'GLD',       // SPDR Gold Shares
  IBB: 'IBB',       // iShares Biotechnology ETF
  IBIT: 'IBIT',     // iShares Bitcoin Trust ETF
  IEMG: 'IEMG',     // iShares Core MSCI Emerging Markets ETF
  IEUR: 'IEUR',     // iShares Core MSCI Europe ETF
  IJH: 'IJH',       // iShares Core S&P Mid-Cap ETF
  ILF: 'ILF',       // iShares Latin America 40 ETF
  ITA: 'ITA',       // iShares U.S. Aerospace & Defense ETF
  IVE: 'IVE',       // iShares S&P 500 Value ETF
  IVV: 'IVV',       // iShares Core S&P 500 ETF
  IVW: 'IVW',       // iShares S&P 500 Growth ETF
  IWM: 'IWM',       // iShares Russell 2000 ETF
  PSQ: 'PSQ',       // ProShares Short QQQ
  QQQ: 'QQQ',       // Invesco QQQ Trust
  SH: 'SH',         // ProShares Short S&P500
  SLV: 'SLV',       // iShares Silver Trust
  SMH: 'SMH',       // VanEck Semiconductor ETF
  SPHQ: 'SPHQ',     // Invesco S&P 500 Quality ETF
  SPXL: 'SPXL',     // Direxion Daily S&P500 Bull 3X Shares
  SPY: 'SPY',       // SPDR S&P 500 ETF Trust
  TQQQ: 'TQQQ',     // ProShares UltraPro QQQ
  URA: 'URA',       // Global X Uranium ETF
  USO: 'USO',       // United States Oil Fund
  VEA: 'VEA',       // Vanguard FTSE Developed Markets ETF
  VIG: 'VIG',       // Vanguard Dividend Appreciation ETF
  VO: 'VO',         // Vanguard Mid-Cap ETF
  VXX: 'VXX',       // iPath S&P 500 VIX Short-Term Futures ETN
  XLB: 'XLB',       // Materials Select Sector SPDR ETF
  XLC: 'XLC',       // Communication Services Select Sector SPDR ETF
  XLE: 'XLE',       // Energy Select Sector SPDR ETF
  XLF: 'XLF',       // Financial Select Sector SPDR ETF
  XLI: 'XLI',       // Industrial Select Sector SPDR ETF
  XLK: 'XLK',       // Technology Select Sector SPDR ETF
  XLP: 'XLP',       // Consumer Staples Select Sector SPDR ETF
  XLRE: 'XLRE',     // Real Estate Select Sector SPDR ETF
  XLU: 'XLU',       // Utilities Select Sector SPDR ETF
  XLV: 'XLV',       // Health Care Select Sector SPDR ETF
  XLY: 'XLY',       // Consumer Discretionary Select Sector SPDR ETF

  // ── Non-US exchanges (London, Frankfurt, etc.) ──────────────────────────
  ADS: null,        // Adidas (XETRA only — no US ADR)
  BAS: null,        // BASF (Frankfurt only)
  BAYN: null,       // Bayer (Frankfurt only)
  BSN: null,        // Danone (Frankfurt only)
  EOAN: null,       // E.On (Frankfurt only)
  MBG: null,        // Mercedes-Benz (Frankfurt only)
  NEC1: null,       // NEC Corporation (Frankfurt only)
  HHPD: null,       // Hon Hai Precision (London only)
  SMSN: null,       // Samsung Electronics (London only)
  NLM: null,        // Novolipetsk Steel (London only)
  OGZD: null,       // Gazprom (London only)
  LKOD: null,       // Lukoil (London only)
  ATAD: null,       // Tatneft (London only)
  IWDA: null,       // iShares Core MSCI World UCITS (London only)
};

/**
 * Strip the IOL currency suffix (C = pesos, D = dollars) from a CEDEAR symbol.
 *
 *   AAPLC → AAPL,  AAPLD → AAPL,  AAPL → AAPL
 *
 * When both the C and D variants exist in `allSymbols`, this ensures
 * we produce a single base symbol.
 */
export function stripCurrencySuffix(symbol: string): string {
  // Only strip C/D suffix when preceded by an alphanumeric char (not a dot).
  // This avoids mangling tickers like "BA.C" (Bank of America on BYMA).
  if (symbol.length > 1 && /[A-Za-z0-9][CD]$/.test(symbol)) {
    return symbol.slice(0, -1);
  }
  return symbol;
}

/**
 * Convert an IOL CEDEAR base symbol to the FMP-compatible ticker.
 *
 * Returns `null` when the CEDEAR has no US-listed equivalent and
 * therefore cannot be looked up on FMP at all.
 *
 *   toFmpTicker('AAPL')  → 'AAPL'   (identity — most CEDEARs)
 *   toFmpTicker('XROX')  → 'XRX'    (mapped exception)
 *   toFmpTicker('CSNA3') → null      (no US equivalent)
 */
export function toFmpTicker(iolSymbol: string): string | null {
  // Check raw symbol first (handles tickers like "BA.C" that are map keys as-is)
  if (iolSymbol in IOL_TO_FMP) return IOL_TO_FMP[iolSymbol];
  const base = stripCurrencySuffix(iolSymbol);
  if (base in IOL_TO_FMP) return IOL_TO_FMP[base];
  return base;
}

/**
 * Build a bidirectional lookup: FMP ticker → IOL base symbol.
 * Useful when receiving data keyed by FMP ticker and needing to
 * map it back to the IOL symbol the rest of the app uses.
 */
export function buildFmpToIolMap(iolSymbols: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const sym of iolSymbols) {
    const base = stripCurrencySuffix(sym);
    const fmp = toFmpTicker(base);
    if (fmp && fmp !== base) {
      map.set(fmp, base);
    }
  }
  return map;
}

/**
 * Deduplicate an array of raw IOL symbols:
 *  1. Strip C/D suffixes, collapsing variants into a single base symbol
 *  2. Preserve insertion order (first occurrence wins)
 */
export function deduplicateIolSymbols(rawSymbols: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const sym of rawSymbols) {
    const base = stripCurrencySuffix(sym);
    if (!seen.has(base)) {
      seen.add(base);
      result.push(base);
    }
  }
  return result;
}
