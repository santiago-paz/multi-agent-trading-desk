/**
 * CEDEAR ↔ underlying-share ratios.
 *
 * A CEDEAR is a depository receipt that represents a fractional share of a
 * foreign-listed company. The conversion ratio is published by BYMA and
 * differs across instruments (AAPL: 20 CEDEARs = 1 share; ORLY: 222:1; ABEV: 1:3).
 *
 * Format: `[num, den]` where `num` CEDEARs equal `den` underlying shares.
 *
 *   ADBE: [44, 1]   →  44 CEDEARs  = 1 share
 *   ABEV: [1, 3]    →  1 CEDEAR    = 3 shares (rare inverse case)
 *
 * Source: BYMA "CEDEARs Negociables en BYMA", actualizado 2026-04-17.
 *
 * Keys are BYMA tickers (= the IOL base symbol after currency-suffix
 * stripping). Tickers with dots (`B.`, `BA.C`, `AKO.B`) are quoted.
 */

import { stripCurrencySuffix } from './cedear-map';

const CEDEAR_RATIOS: Record<string, [number, number]> = {
  AABA: [3, 1],  // Altaba Inc.
  AAL: [2, 1],  // American Airlines Group Inc
  AAP: [14, 1],  // Advanced Auto Parts Inc
  AAPL: [20, 1],  // Apple Inc.
  ABBV: [10, 1],  // AbbVie Inc.
  ABEV: [1, 3],  // Ambev S.A. (1 CEDEAR = 3 shares)
  ABEV3: [1, 1],  // Ambev S.A.
  ABNB: [15, 1],  // Airbnb Inc
  ABT: [4, 1],  // Abbott Labs
  ACN: [75, 1],  // Accenture
  ACWI: [26, 1],  // iShares MSCI ACWI ETF
  ADBE: [44, 1],  // Adobe Systems Incorporated
  ADGO: [1, 1],  // Adecoagro S.A.
  ADI: [15, 1],  // Analog Devices
  ADP: [6, 1],  // Automatic Data Processing Inc.
  ADS: [22, 1],  // Adidas AG
  AEG: [1, 1],  // Aegon N.V.
  AEM: [6, 1],  // Agnico Eagle Mines Limited
  AI: [5, 1],  // C3.AI INC
  AIG: [5, 1],  // American International Group (AIG)
  'AKO.B': [1, 1],  // Embotelladora Andina S.A.
  ALAB: [44, 1],  // Astera Labs Inc
  AMAT: [5, 1],  // Applied Materials Inc.
  AMD: [10, 1],  // Advanced Micro Devices, Inc.
  AMGN: [30, 1],  // Amgen Inc.
  AMX: [1, 1],  // America Movil
  AMZN: [144, 1],  // Amazon.Com, Inc.
  ANF: [1, 1],  // Abercrombie & Fitch Co
  AOCA: [1, 1],  // Aluminum Corp Of China
  ARCO: [1, 2],  // Arcos Dorados Holdings Inc. (1 CEDEAR = 2 shares)
  ARKK: [10, 1],  // ARK INNOVATION
  ARM: [27, 1],  // ARM Holdings Plc
  ASML: [146, 1],  // ASML HOLDING NV
  ASR: [20, 1],  // Grupo Aeroportuario Del Sureste, S.A.B. de C.V.
  ASTS: [15, 1],  // AST SpaceMobile Inc
  ATAD: [4, 1],  // Pjsc Tatneft
  AUY: [1, 1],  // Yamana Gold Inc.
  AVGO: [39, 1],  // Broadcom Inc.
  AVY: [18, 1],  // Avery Dennison Corp.
  AXP: [15, 1],  // American Express Co
  AZN: [4, 1],  // Astrazeneca Plc
  B: [2, 1],  // Barrick Gold Corp
  BA: [24, 1],  // The Boeing Company
  'BA.C': [4, 1],  // Bank Of America Corporation
  BABA: [9, 1],  // Alibaba Group Holding Limited
  BAK: [2, 1],  // Braskem SA
  BAS: [2, 1],  // Basf SE
  BAYN: [3, 1],  // Bayer AG
  BB: [3, 1],  // Blackberry Limited
  BBAS3: [2, 1],  // Banco do Brasil S.A.
  BBD: [1, 1],  // Banco Bradesco S.A.
  BBDC3: [1, 1],  // Banco Bradesco S.A.
  BBV: [1, 1],  // Bilbao Vizcaya Argentaria S.A.
  BCS: [1, 1],  // Barclays Bank Plc
  BHP: [2, 1],  // Bhp Group Ltd
  BIDU: [11, 1],  // Baidu, Inc.
  BIIB: [13, 1],  // Biogen Inc.
  BIOX: [1, 1],  // Bioceres Crop Solutions Corp.
  BK: [2, 1],  // The Bank Of New York Mellon Corp.
  BKNG: [700, 1],  // Booking
  BKR: [7, 1],  // Baker Hughes Co
  BMNR: [8, 1],  // Bitmine Inmersion Technologies, Inc.
  BMY: [3, 1],  // Bristol-Myers Squibb Company
  BNG: [5, 1],  // Bunge Limited
  BP: [5, 1],  // BP PCL
  BPA11: [1, 1],  // Banco BTG Pactual S.A.
  BRFS: [1, 3],  // BRF S.A. (1 CEDEAR = 3 shares)
  BRKB: [22, 1],  // Berkshire Hathaway Inc.
  BSBR: [1, 1],  // Banco Santander (Brasil) S.A.
  BSN: [20, 1],  // Danone
  BX: [30, 1],  // Blackstone Inc.
  C: [3, 1],  // Citigroup Inc
  CAAP: [1, 4],  // Corporación America Airports S.A. (1 CEDEAR = 4 shares)
  CAH: [3, 1],  // Cardinal Health Inc
  CAJ: [2, 1],  // Canon Inc
  CAR: [26, 1],  // Avis Budget Group Inc.
  CAT: [20, 1],  // Caterpillar Inc
  CBRD: [1, 1],  // Companhia Brasileira De Dis NPV ADR
  CCL: [3, 1],  // Carnival
  CDE: [1, 1],  // Coeur Mining Inc.
  CEG: [45, 1],  // Constellation Energy Corporation
  CIBR: [10, 1],  // First Trust NASDAQ Cybersecurity
  CL: [3, 1],  // Colgate Palmolive Co
  CLS: [20, 1],  // Celestica Inc
  COIN: [27, 1],  // Coinbase Global Inc
  COPX: [14, 1],  // Global X Copper Miners ETF
  COST: [48, 1],  // Costco Wholesale Corp
  CRM: [18, 1],  // Salesforce Inc.
  CRWV: [27, 1],  // CoreWeave Inc
  CS: [1, 1],  // Credit Suisse Group
  CSCO: [5, 1],  // Cisco Systems Inc
  CSNA3: [1, 1],  // Companhia Siderúrgica Nacional S.A.
  CVS: [15, 1],  // CVS Health
  CVX: [16, 1],  // Chevron Corp.
  CX: [1, 1],  // Cemex S.A.B. de CV
  DAL: [8, 1],  // Delta Air Lines
  DD: [5, 1],  // Dupont de Nemours Inc.
  DE: [40, 1],  // Deere & Co.
  DECK: [25, 1],  // Deckers Outdoor Corporation
  DEO: [6, 1],  // Diageo PLC
  DHR: [54, 1],  // Danaher Corp
  DIA: [20, 1],  // SPDR Dow Jones Industrial
  DISN: [12, 1],  // The Walt Disney Co.
  DOCU: [22, 1],  // DocuSign Inc.
  DOW: [6, 1],  // Dow Inc
  DTEA: [3, 1],  // Deutsche Telekom Ag
  E: [4, 1],  // Eni Spa
  EA: [14, 1],  // Electronic Arts Inc
  EBAY: [2, 1],  // Ebay Inc.
  EBR: [1, 4],  // Centrais Eléctricas Brasileiras S.A. - Eletrobras (1 CEDEAR = 4 shares)
  ECL: [56, 1],  // Ecolab Inc
  EEM: [5, 1],  // iShares MSCI Emerging Markets ETF
  EFA: [18, 1],  // iShares MSCI EAFE ETF
  EFX: [16, 1],  // Equifax Inc.
  ELP: [1, 3],  // Companhia Paranaense de Energía - COPEL (1 CEDEAR = 3 shares)
  EOAN: [6, 1],  // E.On Se
  EQNR: [6, 1],  // Equinor Asa
  ERIC: [2, 1],  // Lm Ericsson Telephone Co.
  ERJ: [1, 1],  // Embraer-Empresa Brasileira de Aeronáutica S.A.
  ESGU: [30, 1],  // iShares ESG Aware MSCI USA ETF
  ETHA: [5, 1],  // iShares Ethereum Trust ETF
  ETSY: [16, 1],  // Etsy Inc.
  EWJ: [14, 1],  // iShares MSCI Japan ETF
  EWY: [50, 1],  // iShares MSCI South Korea ETF
  EWZ: [2, 1],  // iShares MSCI Brazil Cap ETF
  F: [1, 1],  // Ford Motor Company
  FCX: [3, 1],  // Freeport Mcmoran Copper & Gold Inc.
  FDX: [10, 1],  // Fedex Corp
  FMCC: [1, 1],  // Freddie Mac (Federal Home Loan)
  FMX: [6, 1],  // Fomento Economico Mexicano - Femsa
  FNMA: [1, 1],  // Fed. Natl, Mortgage - Fannie Mae
  FSLR: [18, 1],  // First Solar Inc.
  FXI: [5, 1],  // iShares China Large-Cap ETF
  GDX: [10, 1],  // Van Eck Gold Miners ETF/USA
  GE: [8, 1],  // General Electric Co.
  GFI: [1, 1],  // Gold Fields Ltd.
  GGB: [1, 4],  // Gerdau S.A. (1 CEDEAR = 4 shares)
  GILD: [4, 1],  // Gilead Sciences, Inc.
  GLD: [50, 1],  // ETF SPDR Gold Trust
  GLOB: [18, 1],  // Globant S.A.
  GLW: [4, 1],  // Corning Inc.
  GM: [6, 1],  // General Motors Co
  GOOGL: [58, 1],  // Alphabet Inc.
  GPRK: [1, 1],  // Geopark Ltd.
  GRMN: [3, 1],  // Garmin Ltd.
  GS: [13, 1],  // The Goldman Sachs Group, Inc
  GSK: [4, 1],  // GSK Plc.
  GT: [2, 1],  // Goodyear Tire & Rubber co.
  HAL: [2, 1],  // Halliburton Co.
  HAPV3: [1, 1],  // Hapvida Participacoes E Investimentos S.A.
  HD: [32, 1],  // The Home Depot Inc.
  HDB: [2, 1],  // Hdfc Bank Limited.
  HHPD: [2, 1],  // Hon Hai Precision Industry Co. Ltd.
  HL: [1, 1],  // Hecla Mining Co.
  HMC: [1, 1],  // Honda Motor Co. Ltd
  HMY: [1, 1],  // Harmony Gold Mining Company Ltd.
  HNPIY: [1, 1],  // Huaneng Power Intl
  HOG: [3, 1],  // Harley-Davidson Inc.
  HON: [8, 1],  // Honeywell International Inc.
  HOOD: [29, 1],  // Robinhood Markets Inc
  HPQ: [1, 1],  // Hp Inc
  HSBC: [2, 1],  // Hsbc Holdings Plc
  HSY: [21, 1],  // The Hershey Company
  HUT: [1, 5],  // Hut 8 Mining Corp. (1 CEDEAR = 5 shares)
  HWM: [1, 1],  // Howmet Aerospace Inc.
  IBB: [27, 1],  // iShares Nasdaq Biotechnology ETF
  IBIT: [10, 1],  // iShares Bitcoin Trust
  IBM: [15, 1],  // International Business Machines
  IBN: [1, 1],  // Icici Bank Ltd.
  ICLN: [5, 1],  // iShares Global Clean Energy ETF
  IEMG: [12, 1],  // iShares Core MSCI Emerging Markets ETF
  IEUR: [11, 1],  // iShares Core MSCI Europe ETF
  IFF: [12, 1],  // International Flavors & Fragrances Inc.
  IJH: [12, 1],  // iShares Core S&P Mid-Cap ETF
  ILF: [6, 1],  // iShares Latin America 40 ETF
  INFY: [1, 1],  // Infosys Limited
  ING: [3, 1],  // Ing Groep Nv
  INTC: [5, 1],  // Intel Corporation
  IP: [4, 1],  // International Paper Co.
  IREN: [12, 1],  // Iren Ltd
  ISRG: [90, 1],  // Intuitive Surgical inc
  ITA: [50, 1],  // iShares U.S. Aerospace & Defense
  ITUB: [1, 1],  // Itaú Unibanco Holding S.A.
  ITUB3: [1, 1],  // Banco Itaú Unibanco S.A
  IVE: [40, 1],  // iShares S&P 500 Value ETF
  IVV: [692, 1],  // iShares Core S&P 500 ETF
  IVW: [20, 1],  // iShares S&P 500 Growth ETF
  IWM: [10, 1],  // iShares Trust Russell 2000
  JCI: [2, 1],  // Johnson Controls International
  JD: [4, 1],  // Jd.Com, Inc.
  JMIA: [1, 1],  // Adr Jumia Technologies Ag
  JNJ: [15, 1],  // Johnson & Johnson
  JOYY: [5, 1],  // JOYY Inc.
  JPM: [15, 1],  // J.P. Morgan & Chase Co.
  KB: [2, 1],  // Kb Financial Group Inc.
  KEEL: [1, 5],  // Bitfarms Ltd. (1 CEDEAR = 5 shares)
  KEP: [1, 1],  // Korea Electric Power Corp.
  KGC: [1, 1],  // Kinross Gold Corp
  KMB: [6, 1],  // Kimberly-Clark Corp.
  KO: [5, 1],  // The Coca Cola Company
  KOFM: [2, 1],  // Coca-Cola Femsa, S.A.B. De C.V.
  LAC: [1, 1],  // Lithium Americas Corp
  LAR: [1, 1],  // Lithium Americas (Argentina) Corp
  LFC: [2, 1],  // China Life Insurance
  LKOD: [4, 1],  // Pjsc Lukoil
  LLY: [56, 1],  // Eli Lilly and Company
  LMT: [20, 1],  // Lockheed Martin Corporation
  LND: [1, 1],  // Brasilagro - Co Brasileira de Propriedades Agrícolas
  LRCX: [56, 1],  // Lam Research Corp
  LREN3: [1, 1],  // Lojas Renner S.A.
  LVS: [2, 1],  // Las Vegas Sands Corp
  LYG: [2, 1],  // Lloyds Banking Group Plc
  MA: [33, 1],  // Mastercard Inc.
  MBG: [4, 1],  // Mercedes-Benz Group AG
  MBT: [2, 1],  // Mobile Telesystems
  MCD: [24, 1],  // Mcdonald's Corp.
  MDLZ: [15, 1],  // Mondelez
  MDT: [4, 1],  // Medtronic Public Limited Company
  MELI: [120, 1],  // Mercadolibre Inc.
  META: [24, 1],  // Meta Platforms Inc
  MFG: [1, 1],  // Mizuho Financial Group
  MGLU3: [1, 1],  // Magazine Luiza S.A.
  MMC: [16, 1],  // Marsh & Mclennan Companies Inc.
  MMM: [10, 1],  // 3M Company
  MO: [4, 1],  // Altria Group Inc.
  MOS: [5, 1],  // The Mosaic Co
  MRK: [5, 1],  // Merck & Co. Inc.
  MRNA: [19, 1],  // Moderna Inc
  MRVL: [14, 1],  // Marvell Technology Inc
  MSFT: [30, 1],  // Microsoft Corp.
  MSI: [20, 1],  // Motorola Solutions, Inc.
  MSTR: [20, 1],  // Microstrategy Inc Cl A New
  MU: [5, 1],  // Micron Technology Inc
  MUFG: [1, 1],  // Mitsubishi Ufj Financial Group
  MUX: [2, 1],  // McEwen Mining Inc
  NATU3: [1, 1],  // Natura Cosmeticos SA
  NEC1: [1, 3],  // Nec Corporation (1 CEDEAR = 3 shares)
  NEM: [3, 1],  // Newmont Corporation
  NFLX: [48, 1],  // Netflix, Inc.
  NG: [1, 4],  // Novagold Resources INC. (1 CEDEAR = 4 shares)
  NGG: [2, 1],  // National Grid Plc
  NIO: [4, 1],  // NIO Inc.
  NKE: [12, 1],  // Nike Inc.
  NLM: [2, 1],  // Novolipetsk Steel PJSC
  NMR: [1, 1],  // Nomura Holdings, Inc
  NOKA: [1, 1],  // Nokia Corporation
  NOW: [172, 1],  // ServiceNow Inc
  NSAN: [1, 1],  // Nissan Motor Co., Ltd
  NTES: [14, 1],  // Netease, Inc
  NUE: [16, 1],  // Nucor Corp
  NVDA: [24, 1],  // Nvidia Corporation
  NVS: [4, 1],  // Novartis Ag
  NXE: [1, 1],  // Nexgen Energy LTD
  OGZD: [2, 1],  // Pjsc Gazprom
  OKLO: [28, 1],  // Oklo Inc
  ORAN: [1, 1],  // Orange S.A.
  ORCL: [3, 1],  // Oracle Corporation
  ORLY: [222, 1],  // O'Reilly Automotive Inc
  OXY: [5, 1],  // Occidental Petroleum Corp.
  PAAS: [3, 1],  // Pan American Silver Corp.
  PAC: [16, 1],  // Grupo Aeroportuario del Pacifico, S.A.B. de C.V.
  PAGS: [3, 1],  // Pagseguro Digital Ltd
  PANW: [50, 1],  // Palo Alto Networks Inc
  PATH: [2, 1],  // Uipath Inc
  PBI: [1, 1],  // Pitney Bowes Inc
  PBR: [1, 1],  // Petrobras (ADR)
  PCAR: [3, 1],  // Paccar Inc.
  PCRF: [2, 1],  // Panasonic Corporation
  PDD: [25, 1],  // PDD Holdings Inc
  PEP: [18, 1],  // Pepsico Inc
  PETR3: [1, 1],  // Petrobras - Petróleo Brasileiro S.A.
  PFE: [4, 1],  // Pfizer Inc.
  PG: [15, 1],  // Procter & Gamble
  PHG: [5, 1],  // Koninklijke Philips N.V.
  PINS: [7, 1],  // Pinterest
  PKS: [3, 1],  // Posco Holdings Inc.
  PLTR: [3, 1],  // Palantir Technologies Inc
  PM: [18, 1],  // Philip Morris International
  PRIO3: [2, 1],  // Petro Rio S.A.
  PSO: [1, 1],  // Pearson Plc
  PSQ: [8, 1],  // ProShares Short QQQ
  PSX: [6, 1],  // Phillips 66
  PTR: [4, 1],  // Petrochina Co Ltd
  PYPL: [8, 1],  // Paypal Holdings, Inc.
  QCOM: [11, 1],  // Qualcomm Inc.
  QQQ: [20, 1],  // Invesco QQQ Trust
  RACE: [83, 1],  // Ferrari
  RBLX: [2, 1],  // Roblox Corp.
  RCTB4: [1, 1000],  // Telebras PN (1 CEDEAR = 1000 shares)
  RENT3: [2, 1],  // Localiza Rent A Car S.A.
  RGTI: [2, 1],  // Rigetti Computing Inc
  RIO: [8, 1],  // Rio Tinto Plc
  RIOT: [3, 1],  // Riot Platforms
  RKLB: [12, 1],  // Rocket Lab Corp
  ROKU: [13, 1],  // Roku
  ROST: [4, 1],  // Ross Stores, Inc.
  RSP: [30, 1],  // Invesco S&P 500 eql wght ETF
  RTX: [5, 1],  // Raytheon Technologies Corp
  SAN: [1, 4],  // Banco Santander S.A (1 CEDEAR = 4 shares)
  SAP: [6, 1],  // Sap Se
  SATL: [1, 1],  // Satellogic Inc.
  SBS: [1, 2],  // Companhia de Saneamento Básico de SP (1 CEDEAR = 2 shares)
  SBSP3: [1, 1],  // Cia Saneamento Básico de SP
  SBUX: [12, 1],  // Starbucks Corporation
  SCCO: [2, 1],  // Southern Copper Corp
  SCHW: [13, 1],  // Charles Schwab
  SDA: [2, 1],  // SunCar Technology Group Inc
  SE: [32, 1],  // Sea Ltd.
  SH: [8, 1],  // ProShares Short S&P500
  SHEL: [2, 1],  // Royal Dutch Shell Plc
  SHOP: [107, 1],  // Shopify Inc.
  SHPW: [1, 2],  // Shapeways Holdings Inc (1 CEDEAR = 2 shares)
  SI: [10, 1],  // Silvergate Bancorp
  SID: [1, 8],  // Companhia Siderúrgica Nacional (1 CEDEAR = 8 shares)
  SIEGY: [3, 1],  // Siemens Ag Adr
  SLB: [3, 1],  // Schlumberger Ltd
  SLV: [6, 1],  // iShares Silver Trust
  SMH: [50, 1],  // Van Eck Semiconductor ETF
  SMSN: [14, 1],  // Samsung Electronics Co. Ltd.
  SNA: [6, 1],  // Snap-On Inc
  SNAP: [1, 1],  // Snap Inc.
  SNOW: [30, 1],  // Snowflake Inc.
  SNP: [3, 1],  // China Petroleum & Chem
  SONY: [8, 1],  // Sony Group Corporation
  SPCE: [1, 2],  // Virgin Galactic (1 CEDEAR = 2 shares)
  SPGI: [45, 1],  // S&P Global Inc
  SPHQ: [14, 1],  // Invesco S&P 500 quality ETF
  SPOT: [28, 1],  // Spotify Technology S.A.
  SPXL: [25, 1],  // Direxion Daily S&P 500 Bull 3X
  SPY: [20, 1],  // SPDR S&P 500
  STLA: [5, 1],  // Stellantis
  STNE: [3, 1],  // StoneCo Ltd
  SUZ: [1, 1],  // Suzano Papel E Celulose S.A.
  SUZB3: [1, 1],  // Suzano S.A.
  SWKS: [21, 1],  // Skyworks Solutions
  SYY: [8, 1],  // Sysco Corp.
  T: [3, 1],  // At &T Inc.
  TCOM: [2, 1],  // Trip.com Group Ltd.
  TEAM: [47, 1],  // Atlassian Corporation
  TEFO: [8, 1],  // Telefonica S.A.
  TEM: [12, 1],  // Tempus AI Inc
  TEN: [1, 1],  // Tenaris
  TGT: [24, 1],  // Target Corporation
  TIIAY: [1, 1],  // Telecom Italia S.P.A. Ordinary Shares
  TIMB: [1, 1],  // Tim Participações S.A.
  TIMS3: [1, 1],  // TIM S.A.
  TJX: [22, 1],  // TJX Companies Inc/The
  TM: [15, 1],  // Toyota Motor Corporation
  TMO: [22, 1],  // Thermo Fisher Scientific Inc.
  TMUS: [33, 1],  // T-mobile
  TQQQ: [25, 1],  // ProShares UltraPro QQQ
  TRIP: [2, 1],  // Tripadvisor, Inc.
  TRVV: [6, 1],  // The Travelers Cos. Inc.
  TSLA: [15, 1],  // Tesla, Inc.
  TSM: [9, 1],  // Taiwan Semiconductor Manufacturing
  TTE: [3, 1],  // TotalEnergies SE
  TTM: [1, 1],  // Tata Motors Ltd
  TV: [3, 1],  // Grupo Televisa S.A.
  TWLO: [36, 1],  // Twilio Inc
  TWTR: [2, 1],  // Twitter, Inc.
  TXN: [5, 1],  // Texas Instruments Inc
  TXR: [4, 1],  // Ternium S.A.
  UAL: [5, 1],  // United Airlines Holdings Inc.
  UBER: [2, 1],  // Uber Technologies Inc.
  UGP: [1, 1],  // Ultrapar Participações S.A.
  UL: [3, 1],  // Unilever PLC - Sponsored
  UN: [2, 1],  // NU Holdings Ltd/Cayman Islands
  UNH: [33, 1],  // UnitedHealth Group Inc.
  UNP: [20, 1],  // Union Pacific Corp.
  UPST: [5, 1],  // Upstart Hldgs Inc
  URA: [5, 1],  // Global X Uranium ETF
  URBN: [2, 1],  // Urban Outfitters INC.
  USB: [5, 1],  // U.S. Bancorp
  USO: [15, 1],  // United States Oil Fund
  V: [18, 1],  // Visa Inc
  VALE: [2, 1],  // Vale S.A.
  VALE3: [1, 1],  // Vale S.A.
  VEA: [10, 1],  // Vanguard FTSE Developed Markets ETF
  VIG: [39, 1],  // Vanguard Dividend Appreciation
  VIST: [3, 1],  // Vista Energy S.A.B. de C.V.
  VIV: [1, 1],  // Telefônica Brasil S.A.
  VIVT3: [1, 1],  // Telefônica Brasil S.A.
  VOD: [1, 1],  // Vodafone Group Plc
  VRSN: [6, 1],  // Verisign, Inc.
  VRTX: [101, 1],  // Vertex Pharmaceuticals Inc
  VST: [26, 1],  // Vistra Corporation
  VXX: [5, 1],  // iPath Series B S&P 500 VIX
  VZ: [4, 1],  // Verizon Communications Inc.
  WBA: [3, 1],  // Walgreens Boots Alliance Inc.
  WBO: [6, 1],  // Weibo Corporation
  WEGE3: [1, 1],  // Weg S.A.
  WFC: [5, 1],  // Wells Fargo & Co.
  WMT: [18, 1],  // Walmart Inc.
  XLB: [18, 1],  // The Materials Select Sector SPDR Fund
  XLC: [19, 1],  // The Communication Services Select Sector SPDR Fund
  XLE: [2, 1],  // Energy Select Sector SPDR Fund
  XLF: [2, 1],  // Financial Select Sector SPDR Fund
  XLI: [28, 1],  // The Industrial Select Sector SPDR Fund
  XLK: [46, 1],  // The Technology Select Sector SPDR Fund
  XLP: [16, 1],  // The Consumer Staples Select Sector SPDR Fund
  XLRE: [9, 1],  // The Real Estate Select Sector SPDR Fund
  XLU: [15, 1],  // Utilities Select Sector SPDR Fund
  XLV: [29, 1],  // The Health Care Select Sector SPDR Fund
  XLY: [43, 1],  // The Consumer Discretionary Select Sector SPDR Fund
  XME: [30, 1],  // State Street SPDR S&P Metals & Mining ETF
  XOM: [10, 1],  // Exxon Mobil Corporation
  XP: [4, 1],  // XP Inc
  XPEV: [4, 1],  // XPENG INC
  XROX: [1, 1],  // Xerox Holding Corporation
  XYZ: [20, 1],  // Square Inc.
  YELP: [2, 1],  // Yelp Inc.
  YZCA: [2, 1],  // Yanzhou Coal Mining Co. Ltd.
  ZM: [47, 1],  // Zoom Video Communications Inc.
};

/**
 * Look up the BYMA CEDEAR ratio for a symbol.
 *
 * Returns `[num, den]` such that `num` CEDEARs equal `den` underlying shares.
 * Accepts raw symbols, currency-suffixed variants (`AAPLC`, `ADBED`), and
 * dotted forms (`B.`, `BA.C`). Returns `null` when the symbol is not in the
 * BYMA list — caller decides how to handle the gap.
 */
export function getCedearRatio(symbol: string): [number, number] | null {
  if (symbol in CEDEAR_RATIOS) return CEDEAR_RATIOS[symbol];
  // Strip currency suffix and try again (covers AAPLC, ADBED, etc.)
  const stripped = stripCurrencySuffix(symbol);
  if (stripped in CEDEAR_RATIOS) return CEDEAR_RATIOS[stripped];
  // BYMA keys Barrick as "B" but IOL portfolio rows sometimes carry "B." —
  // try toggling the trailing dot in either direction.
  if (symbol.endsWith('.')) {
    const noDot = symbol.slice(0, -1);
    if (noDot in CEDEAR_RATIOS) return CEDEAR_RATIOS[noDot];
  } else if (`${symbol}.` in CEDEAR_RATIOS) {
    return CEDEAR_RATIOS[`${symbol}.`];
  }
  return null;
}

/**
 * Convert a CEDEAR quantity into the equivalent number of underlying shares.
 *
 * For most CEDEARs `num > den` so the result is fractional (1 ADBE CEDEAR =
 * 0.0227 shares). For inverse ratios (`ABEV`, `SID`) the result is larger
 * than the input.
 *
 * Returns `cedears` unchanged when the symbol is unknown — safer default than
 * throwing, but caller may want to log/flag the miss.
 */
export function cedearsToShares(cedears: number, symbol: string): number {
  const r = getCedearRatio(symbol);
  if (!r) return cedears;
  const [num, den] = r;
  return (cedears * den) / num;
}

/**
 * Convert a share quantity into the equivalent number of CEDEARs.
 *
 * `mode` controls rounding when the result is fractional. Use `'floor'`
 * (default) when sizing orders against a hard cash/holdings cap so we never
 * exceed the available amount.
 */
export function sharesToCedears(
  shares: number,
  symbol: string,
  mode: 'floor' | 'ceil' | 'round' = 'floor',
): number {
  const r = getCedearRatio(symbol);
  if (!r) return Math[mode](shares);
  const [num, den] = r;
  const cedears = (shares * num) / den;
  return Math[mode](cedears);
}
