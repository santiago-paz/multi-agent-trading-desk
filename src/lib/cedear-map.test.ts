import { describe, it, expect } from 'vitest';
import {
  stripCurrencySuffix,
  toFmpTicker,
  buildFmpToIolMap,
  deduplicateIolSymbols,
  isEtf,
} from './cedear-map';

// ── stripCurrencySuffix ─────────────────────────────────────────────────────

describe('stripCurrencySuffix', () => {
  it('strips C suffix (pesos)', () => {
    expect(stripCurrencySuffix('AAPLC')).toBe('AAPL');
  });

  it('strips D suffix (dollars)', () => {
    expect(stripCurrencySuffix('AAPLD')).toBe('AAPL');
  });

  it('returns symbol unchanged when no C/D suffix', () => {
    expect(stripCurrencySuffix('AAPL')).toBe('AAPL');
  });

  it('does not strip C/D from single-character symbols', () => {
    expect(stripCurrencySuffix('C')).toBe('C');
    expect(stripCurrencySuffix('D')).toBe('D');
  });

  it('does not strip lowercase c/d', () => {
    expect(stripCurrencySuffix('AAPLc')).toBe('AAPLc');
  });

  it('handles empty string', () => {
    expect(stripCurrencySuffix('')).toBe('');
  });

  it('strips KOC → KO (typical currency-variant pattern)', () => {
    expect(stripCurrencySuffix('KOC')).toBe('KO');
  });

  it('does NOT strip natural tickers ending in C/D registered in IOL_TO_FMP', () => {
    // These are real US tickers that already end in C or D — IOL lists them
    // bare (no currency suffix), so stripping would map to the wrong company.
    expect(stripCurrencySuffix('JD')).toBe('JD');     // JD.com (was being stripped to "J" = Jacobs)
    expect(stripCurrencySuffix('HD')).toBe('HD');     // Home Depot
    expect(stripCurrencySuffix('AMD')).toBe('AMD');   // Advanced Micro Devices
    expect(stripCurrencySuffix('BBD')).toBe('BBD');   // Banco Bradesco
    expect(stripCurrencySuffix('DD')).toBe('DD');     // DuPont
    expect(stripCurrencySuffix('GILD')).toBe('GILD'); // Gilead
    expect(stripCurrencySuffix('HMC')).toBe('HMC');   // Honda
    expect(stripCurrencySuffix('HOOD')).toBe('HOOD'); // Robinhood
    expect(stripCurrencySuffix('HSBC')).toBe('HSBC'); // HSBC
    expect(stripCurrencySuffix('INTC')).toBe('INTC'); // Intel
    expect(stripCurrencySuffix('KGC')).toBe('KGC');   // Kinross Gold
    expect(stripCurrencySuffix('LAC')).toBe('LAC');   // Lithium Americas
    expect(stripCurrencySuffix('LND')).toBe('LND');   // BrasilAgro
    expect(stripCurrencySuffix('MCD')).toBe('MCD');   // McDonald's
    expect(stripCurrencySuffix('PAC')).toBe('PAC');   // Grupo Aeroport. Pacífico
    expect(stripCurrencySuffix('PDD')).toBe('PDD');   // PDD Holdings
    expect(stripCurrencySuffix('SID')).toBe('SID');   // CSN
    expect(stripCurrencySuffix('VOD')).toBe('VOD');   // Vodafone
    expect(stripCurrencySuffix('WFC')).toBe('WFC');   // Wells Fargo
    expect(stripCurrencySuffix('ERIC')).toBe('ERIC'); // Ericsson
  });

  it('does NOT strip ETF symbols ending in D registered in IOL_TO_FMP', () => {
    expect(stripCurrencySuffix('GLD')).toBe('GLD');   // SPDR Gold Shares
  });
});

// ── toFmpTicker ─────────────────────────────────────────────────────────────

describe('toFmpTicker', () => {
  it('returns identity for standard tickers', () => {
    expect(toFmpTicker('AAPL')).toBe('AAPL');
    expect(toFmpTicker('TSLA')).toBe('TSLA');
    expect(toFmpTicker('KO')).toBe('KO');
  });

  it('maps XROX → XRX (known exception)', () => {
    expect(toFmpTicker('XROX')).toBe('XRX');
  });

  it('maps every BYMA exception to its FMP ticker', () => {
    // Full BYMA exceptions block from IOL_TO_FMP. If FMP renames any of these,
    // the whole pipeline silently breaks — assert each one explicitly.
    expect(toFmpTicker('ADGO')).toBe('AGRO');   // Adecoagro
    expect(toFmpTicker('AOCA')).toBe('ACH');    // Aluminum Corp of China
    expect(toFmpTicker('BA.C')).toBe('BAC');    // Bank of America (BYMA disambiguates from Boeing)
    expect(toFmpTicker('BRKB')).toBe('BRK-B');  // Berkshire Hathaway B
    expect(toFmpTicker('BNG')).toBe('BG');      // Bunge
    expect(toFmpTicker('DISN')).toBe('DIS');    // Disney
    expect(toFmpTicker('DTEA')).toBe('DTEGY');  // Deutsche Telekom
    expect(toFmpTicker('GOGL')).toBe('GOOGL');  // Alphabet Cl. A — FMP "GOGL" is Golden Ocean!
    expect(toFmpTicker('KOFM')).toBe('KOF');    // Coca-Cola Femsa
    expect(toFmpTicker('NOKA')).toBe('NOK');    // Nokia
    expect(toFmpTicker('PKS')).toBe('PKX');     // Posco
    expect(toFmpTicker('TEFO')).toBe('TEF');    // Telefonica
    expect(toFmpTicker('TRVV')).toBe('TRV');    // Travelers
    expect(toFmpTicker('TXR')).toBe('TX');      // Ternium
    expect(toFmpTicker('UN')).toBe('NU');       // Nu Holdings (NOT Unilever — UN was delisted)
    expect(toFmpTicker('WBO')).toBe('WB');      // Weibo
    expect(toFmpTicker('YZCA')).toBe('YZC');    // Yanzhou Coal
  });

  it('maps BYMA exceptions correctly when arriving with C/D suffix', () => {
    // IOL emits these with currency suffixes (C = pesos, D = dollars)
    expect(toFmpTicker('XROXC')).toBe('XRX');
    expect(toFmpTicker('GOGLD')).toBe('GOOGL');
    expect(toFmpTicker('DISNC')).toBe('DIS');
    expect(toFmpTicker('BRKBD')).toBe('BRK-B');
  });

  it('returns identity for natural C/D-ending tickers (full coverage)', () => {
    // Complete the set started above — these were the symbols being wrongly
    // stripped to "X" (e.g. HD → H = Hyatt) before the whitelist was added.
    expect(toFmpTicker('BBD')).toBe('BBD');     // Banco Bradesco
    expect(toFmpTicker('DD')).toBe('DD');       // DuPont
    expect(toFmpTicker('HMC')).toBe('HMC');     // Honda
    expect(toFmpTicker('HOOD')).toBe('HOOD');   // Robinhood
    expect(toFmpTicker('HSBC')).toBe('HSBC');   // HSBC
    expect(toFmpTicker('KGC')).toBe('KGC');     // Kinross Gold
    expect(toFmpTicker('LAC')).toBe('LAC');     // Lithium Americas
    expect(toFmpTicker('LND')).toBe('LND');     // BrasilAgro
    expect(toFmpTicker('PAC')).toBe('PAC');     // Grupo Aeroport. Pacífico
    expect(toFmpTicker('SID')).toBe('SID');     // CSN ADR
  });

  it('maps Brazilian B3 tickers to their NYSE/NASDAQ ADR', () => {
    expect(toFmpTicker('ABEV3')).toBe('ABEV');  // Ambev
    expect(toFmpTicker('BBDC3')).toBe('BBD');   // Bradesco
    expect(toFmpTicker('ITUB3')).toBe('ITUB');  // Itaú
    expect(toFmpTicker('NTCO3')).toBe('NTCO');  // Natura
    expect(toFmpTicker('PETR3')).toBe('PBR');   // Petrobras
    expect(toFmpTicker('SUZB3')).toBe('SUZ');   // Suzano
    expect(toFmpTicker('TIMS3')).toBe('TIMB');  // TIM
    expect(toFmpTicker('VALE3')).toBe('VALE');  // Vale
    expect(toFmpTicker('VIVT3')).toBe('VIV');   // Telefônica Brasil
  });

  it('returns null for B3 tickers without a US ADR', () => {
    expect(toFmpTicker('BPA11')).toBeNull();    // BTG Pactual
    expect(toFmpTicker('BBAS3')).toBeNull();    // Banco do Brasil
    expect(toFmpTicker('HAPV3')).toBeNull();    // Hapvida
    expect(toFmpTicker('LREN3')).toBeNull();    // Lojas Renner
    expect(toFmpTicker('MGLU3')).toBeNull();    // Magazine Luiza
    expect(toFmpTicker('PRIO3')).toBeNull();    // PetroRio
    expect(toFmpTicker('RENT3')).toBeNull();    // Localiza
    expect(toFmpTicker('SBSP3')).toBeNull();    // Cia Saneamento Básico SP
    expect(toFmpTicker('WEGE3')).toBeNull();    // Weg
    expect(toFmpTicker('RCTB4')).toBeNull();    // Telebras
  });

  it('returns null for non-US-listed European/Asian symbols', () => {
    expect(toFmpTicker('ADS')).toBeNull();      // Adidas (XETRA)
    expect(toFmpTicker('BAS')).toBeNull();      // BASF
    expect(toFmpTicker('BAYN')).toBeNull();     // Bayer
    expect(toFmpTicker('BSN')).toBeNull();      // Danone
    expect(toFmpTicker('EOAN')).toBeNull();     // E.On
    expect(toFmpTicker('MBG')).toBeNull();      // Mercedes-Benz
    expect(toFmpTicker('NEC1')).toBeNull();     // NEC
    expect(toFmpTicker('HHPD')).toBeNull();     // Hon Hai (London)
    expect(toFmpTicker('SMSN')).toBeNull();     // Samsung (London)
    expect(toFmpTicker('NLM')).toBeNull();      // Novolipetsk
    expect(toFmpTicker('OGZD')).toBeNull();     // Gazprom
    expect(toFmpTicker('LKOD')).toBeNull();     // Lukoil
    expect(toFmpTicker('ATAD')).toBeNull();     // Tatneft
    expect(toFmpTicker('IWDA')).toBeNull();     // iShares MSCI World UCITS
  });

  it('resolves common ETFs to themselves (identity)', () => {
    // Sample across the ETF block — if any of these change shape on FMP,
    // the dashboard's market-data window stops updating.
    expect(toFmpTicker('SPY')).toBe('SPY');
    expect(toFmpTicker('QQQ')).toBe('QQQ');
    expect(toFmpTicker('GLD')).toBe('GLD');
    expect(toFmpTicker('SLV')).toBe('SLV');
    expect(toFmpTicker('EWZ')).toBe('EWZ');     // Brazil
    expect(toFmpTicker('XLE')).toBe('XLE');     // Energy
    expect(toFmpTicker('IBIT')).toBe('IBIT');   // Bitcoin trust
    expect(toFmpTicker('ETHA')).toBe('ETHA');   // Ethereum trust
  });

  it('returns null for CSNA3 (no US equivalent)', () => {
    expect(toFmpTicker('CSNA3')).toBeNull();
  });

  it('strips C/D suffix before mapping', () => {
    expect(toFmpTicker('XROXC')).toBe('XRX');
    expect(toFmpTicker('XROXD')).toBe('XRX');
    expect(toFmpTicker('CSNA3C')).toBeNull();
  });

  it('handles standard ticker with C/D suffix', () => {
    expect(toFmpTicker('AAPLC')).toBe('AAPL');
    expect(toFmpTicker('AAPLD')).toBe('AAPL');
  });

  it('resolves natural tickers ending in C/D to themselves (no strip)', () => {
    expect(toFmpTicker('JD')).toBe('JD');       // JD.com — was returning "J" (Jacobs)
    expect(toFmpTicker('HD')).toBe('HD');       // Home Depot
    expect(toFmpTicker('AMD')).toBe('AMD');     // AMD
    expect(toFmpTicker('GILD')).toBe('GILD');   // Gilead
    expect(toFmpTicker('INTC')).toBe('INTC');   // Intel
    expect(toFmpTicker('MCD')).toBe('MCD');     // McDonald's
    expect(toFmpTicker('PDD')).toBe('PDD');     // PDD Holdings
    expect(toFmpTicker('VOD')).toBe('VOD');     // Vodafone
    expect(toFmpTicker('WFC')).toBe('WFC');     // Wells Fargo
    expect(toFmpTicker('ERIC')).toBe('ERIC');   // Ericsson
  });

  it('resolves IOL-specific symbols to their FMP equivalents', () => {
    expect(toFmpTicker('TEN')).toBe('TS');      // Tenaris
    expect(toFmpTicker('BBV')).toBe('BBVA');    // BBVA
    expect(toFmpTicker('BBVD')).toBe('BBVA');
    expect(toFmpTicker('ALAD')).toBe('ALAB');   // Astera Labs
    expect(toFmpTicker('PETR')).toBe('PBR');    // Petrobras ADR
    expect(toFmpTicker('VAL3D')).toBe('VALE');  // Vale ADR
    expect(toFmpTicker('NAT3D')).toBe('NTCO');  // Natura
    expect(toFmpTicker('NATU3')).toBe('NTCO');
    expect(toFmpTicker('BBDCD')).toBe('BBD');   // Bradesco D-suffix form
  });

  it('handles symbols with dots/dashes', () => {
    expect(toFmpTicker('B.')).toBe('B');         // Barrick
    expect(toFmpTicker('C.D')).toBe('C');        // Citigroup
    expect(toFmpTicker('BB.D')).toBe('BB');      // BlackBerry
    expect(toFmpTicker('CAR.')).toBe('CAR');     // Avis Budget
    expect(toFmpTicker('AKO.B')).toBe('AKO-B');  // Embotelladora Andina
    expect(toFmpTicker('AKOBD')).toBe('AKO-B');
  });
});

// ── buildFmpToIolMap ────────────────────────────────────────────────────────

describe('buildFmpToIolMap', () => {
  it('maps FMP ticker back to IOL base for exceptions', () => {
    const map = buildFmpToIolMap(['XROXC', 'XROXD', 'AAPLC']);
    expect(map.get('XRX')).toBe('XROX');
  });

  it('does not include identity mappings', () => {
    const map = buildFmpToIolMap(['AAPLC', 'KOD', 'TSLA']);
    // AAPL → AAPL is identity, should NOT be in map
    expect(map.has('AAPL')).toBe(false);
    expect(map.has('KO')).toBe(false);
    expect(map.has('TSLA')).toBe(false);
  });

  it('skips null FMP tickers', () => {
    const map = buildFmpToIolMap(['CSNA3C']);
    expect(map.size).toBe(0);
  });

  it('returns empty map for empty input', () => {
    const map = buildFmpToIolMap([]);
    expect(map.size).toBe(0);
  });
});

// ── deduplicateIolSymbols ───────────────────────────────────────────────────

describe('deduplicateIolSymbols', () => {
  it('collapses C/D variants into single base symbol', () => {
    expect(deduplicateIolSymbols(['AAPLC', 'AAPLD'])).toEqual(['AAPL']);
  });

  it('preserves insertion order (first occurrence wins)', () => {
    const result = deduplicateIolSymbols(['KOD', 'AAPLC', 'KOC', 'AAPLD', 'TSLAC']);
    expect(result).toEqual(['KO', 'AAPL', 'TSLA']);
  });

  it('handles symbols without suffix', () => {
    expect(deduplicateIolSymbols(['AAPL', 'TSLA'])).toEqual(['AAPL', 'TSLA']);
  });

  it('handles mixed suffixed and unsuffixed', () => {
    expect(deduplicateIolSymbols(['AAPL', 'AAPLC'])).toEqual(['AAPL']);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateIolSymbols([])).toEqual([]);
  });
});

// ── isEtf ───────────────────────────────────────────────────────────────────

describe('isEtf', () => {
  it('recognises ETFs by their bare symbol', () => {
    expect(isEtf('SPY')).toBe(true);
    expect(isEtf('QQQ')).toBe(true);
    expect(isEtf('GLD')).toBe(true);
    expect(isEtf('IBIT')).toBe(true);
    expect(isEtf('XLE')).toBe(true);
  });

  it('recognises ETFs even when they arrive with C/D currency suffix', () => {
    expect(isEtf('SPYC')).toBe(true);
    expect(isEtf('SPYD')).toBe(true);
    expect(isEtf('QQQC')).toBe(true);
    expect(isEtf('GLDC')).toBe(true);
  });

  it('returns false for stocks (even those listed in IOL_TO_FMP)', () => {
    expect(isEtf('AAPL')).toBe(false);
    expect(isEtf('TSLA')).toBe(false);
    expect(isEtf('XROX')).toBe(false);   // mapped exception, not an ETF
    expect(isEtf('GOGL')).toBe(false);   // Alphabet, not the Golden Ocean ETF
    expect(isEtf('JD')).toBe(false);     // natural C/D-ending stock
  });

  it('returns false for unknown symbols', () => {
    expect(isEtf('')).toBe(false);
    expect(isEtf('NOTREAL')).toBe(false);
  });
});
