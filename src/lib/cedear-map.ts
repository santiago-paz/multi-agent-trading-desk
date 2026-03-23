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
  // IOL "XROX" → NYSE "XRX" (Xerox Holdings)
  XROX: 'XRX',

  // Brazilian tickers traded as CEDEARs but NOT listed in the US:
  CSNA3: null, // Companhia Siderúrgica Nacional (Bovespa only)
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
  if (symbol.length > 1 && /[CD]$/.test(symbol)) {
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
