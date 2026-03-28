# FMP (Financial Modeling Prep) API Reference

Base URL: `https://financialmodelingprep.com/stable`

## Authorization

All requests require an API key via either:

- **Header:** `apikey: YOUR_API_KEY`
- **Query parameter:** `?apikey=YOUR_API_KEY` (use `&apikey=` if other params exist)

Environment variable: `FMP_API_KEY`

---

## Table of Contents

1. [Company Search](#company-search)
2. [Stock Directory](#stock-directory)
3. [Company Information](#company-information)
4. [Quote](#quote)
5. [Financial Statements](#financial-statements)
6. [Charts (Historical Prices)](#charts)
7. [Economics](#economics)
8. [Earnings, Dividends, Splits](#earnings-dividends-splits)
9. [Earnings Transcript](#earnings-transcript)
10. [News](#news)
11. [Form 13F (Institutional Ownership)](#form-13f)
12. [Analyst](#analyst)
13. [Market Performance](#market-performance)
14. [Technical Indicators](#technical-indicators)
15. [ETF and Mutual Funds](#etf-and-mutual-funds)
16. [SEC Filings](#sec-filings)
17. [Insider Trades](#insider-trades)
18. [Indexes](#indexes)
19. [Market Hours](#market-hours)
20. [Commodity](#commodity)
21. [Discounted Cash Flow](#discounted-cash-flow)
22. [Forex](#forex)
23. [Crypto](#crypto)
24. [Senate / House Disclosures](#senate)
25. [ESG](#esg)
26. [Commitment of Traders](#commitment-of-traders)
27. [Fundraisers](#fundraisers)
28. [Bulk Endpoints](#bulk)

> Legend: 🌐 = Global | 🇺🇸 = US only

---

## Company Search

### Stock Symbol Search 🌐
Search by symbol across multiple global markets.
```
GET /search-symbol?query=AAPL
```

### Company Name Search 🌐
Search by full or partial company name.
```
GET /search-name?query=AA
```

### CIK Search 🇺🇸
Retrieve Central Index Key (CIK) for SEC filings.
```
GET /search-cik?cik=320193
```

### CUSIP Search 🌐
Search securities by CUSIP number.
```
GET /search-cusip?cusip=037833100
```

### ISIN Search 🌐
Search securities by ISIN (International Securities Identification Number).
```
GET /search-isin?isin=US0378331005
```

### Stock Screener 🌐
Filter stocks by market cap, price, volume, beta, sector, country, etc.
```
GET /company-screener
```

### Exchange Variants 🌐
Find all exchanges where a given symbol is listed.
```
GET /search-exchange-variants?symbol=AAPL
```

---

## Stock Directory

### Company Symbols List 🌐
Full list of stock symbols and tradable financial instruments.
```
GET /stock-list
```
Response: `[{ "symbol": "6898.HK", "companyName": "China Aluminum Cans Holdings Limited" }]`

### Financial Statement Symbols List 🌐
Companies with available financial statements.
```
GET /financial-statement-symbol-list
```
Response: `[{ "symbol": "6898.HK", "companyName": "...", "tradingCurrency": "HKD", "reportingCurrency": "HKD" }]`

### CIK List 🇺🇸
Database of CIK numbers for SEC-registered entities.
```
GET /cik-list?page=0&limit=1000
```
| Param | Type | Example |
|-------|------|---------|
| page | number | 0 |
| limit | number | 1000 |

Max 10000 records per request.

Response: `[{ "cik": "0002036063", "companyName": "LUZ Capital Partners, LLC" }]`

### Symbol Changes List 🇺🇸
Track stock symbol changes (mergers, splits, name changes).
```
GET /symbol-change
```
| Param | Type | Example |
|-------|------|---------|
| invalid | string | false |
| limit | number | 100 |

Response: `[{ "date": "2025-02-03", "companyName": "...", "oldSymbol": "NEP", "newSymbol": "XIFR" }]`

### ETF Symbol Search 🌐
Find ETF ticker symbols and names.
```
GET /etf-list
```
Response: `[{ "symbol": "GULF", "name": "WisdomTree Middle East Dividend Fund" }]`

### Actively Trading List 🌐
Securities currently being traded on public exchanges.
```
GET /actively-trading-list
```
Response: `[{ "symbol": "6898.HK", "name": "China Aluminum Cans Holdings Limited" }]`

### Earnings Transcript List 🇺🇸
Companies with available earnings transcripts.
```
GET /earnings-transcript-list
```
Response: `[{ "symbol": "MCUJF", "companyName": "Medicure Inc.", "noOfTranscripts": "16" }]`

### Available Exchanges 🌐
List of supported stock exchanges.
```
GET /available-exchanges
```
Response: `[{ "exchange": "AMEX", "name": "New York Stock Exchange Arca", "countryName": "United States of America", "countryCode": "US", "symbolSuffix": "N/A", "delay": "Real-time" }]`

### Available Sectors
```
GET /available-sectors
```
Response: `[{ "sector": "Basic Materials" }]`

### Available Industries
```
GET /available-industries
```
Response: `[{ "industry": "Steel" }]`

### Available Countries
```
GET /available-countries
```
Response: `[{ "country": "FK" }]`

---

## Company Information

### Company Profile 🌐
Detailed profile: market cap, stock price, industry, etc.
```
GET /profile?symbol=AAPL
```

### Company Profile by CIK 🇺🇸
```
GET /profile-cik?cik=320193
```

### Company Notes 🇺🇸
Company-issued notes (CIK, symbol, title, exchange).
```
GET /company-notes?symbol=AAPL
```

### Stock Peer Comparison 🌐
Companies in same sector and market cap range.
```
GET /stock-peers?symbol=AAPL
```

### Delisted Companies 🇺🇸
```
GET /delisted-companies?page=0&limit=100
```

### Employee Count 🇺🇸
```
GET /employee-count?symbol=AAPL
```

### Historical Employee Count 🇺🇸
```
GET /historical-employee-count?symbol=AAPL
```

### Market Capitalization 🌐
```
GET /market-capitalization?symbol=AAPL
```

### Batch Market Cap 🌐
Multiple companies in one request.
```
GET /market-capitalization-batch?symbols=AAPL,MSFT,GOOG
```

### Historical Market Cap 🌐
```
GET /historical-market-capitalization?symbol=AAPL
```

### Share Float & Liquidity 🌐
```
GET /shares-float?symbol=AAPL
```

### All Shares Float 🌐
```
GET /shares-float-all?page=0&limit=1000
```

### Latest Mergers & Acquisitions 🇺🇸
```
GET /mergers-acquisitions-latest?page=0&limit=100
```

### Search Mergers & Acquisitions 🇺🇸
```
GET /mergers-acquisitions-search?name=Apple
```

### Company Executives 🌐
Name, title, compensation, gender, year of birth.
```
GET /key-executives?symbol=AAPL
```

### Executive Compensation 🇺🇸
Salaries, stock awards, total compensation.
```
GET /governance-executive-compensation?symbol=AAPL
```

### Executive Compensation Benchmark 🇺🇸
Average compensation by industry.
```
GET /executive-compensation-benchmark
```

---

## Quote

### Stock Quote 🌐
Real-time price, changes, volume.
```
GET /quote?symbol=AAPL
```

### Stock Quote Short 🌐
Condensed: current price, volume, price changes.
```
GET /quote-short?symbol=AAPL
```

### Aftermarket Trade 🇺🇸
Post-market trade prices, sizes, timestamps.
```
GET /aftermarket-trade?symbol=AAPL
```

### Aftermarket Quote 🇺🇸
Post-market bid/ask prices, volume.
```
GET /aftermarket-quote?symbol=AAPL
```

### Stock Price Change 🌐
Percentage/value changes: daily, weekly, monthly, long-term.
```
GET /stock-price-change?symbol=AAPL
```

### Batch Quote 🌐
Multiple stocks in one request.
```
GET /batch-quote?symbols=AAPL
```

### Batch Quote Short 🌐
```
GET /batch-quote-short?symbols=AAPL
```

### Batch Aftermarket Trade 🇺🇸
```
GET /batch-aftermarket-trade?symbols=AAPL
```

### Batch Aftermarket Quote 🇺🇸
```
GET /batch-aftermarket-quote?symbols=AAPL
```

### Exchange Stock Quotes 🌐
All stocks on a specific exchange.
```
GET /batch-exchange-quote?exchange=NASDAQ
```

### Mutual Fund Price Quotes 🇺🇸
```
GET /batch-mutualfund-quotes
```

### ETF Price Quotes 🌐
```
GET /batch-etf-quotes
```

### Commodities Quotes
```
GET /batch-commodity-quotes
```

### Cryptocurrency Quotes
```
GET /batch-crypto-quotes
```

### Forex Quotes
```
GET /batch-forex-quotes
```

### Index Quotes
```
GET /batch-index-quotes
```

---

## Financial Statements

### Income Statement 🌐
```
GET /income-statement?symbol=AAPL
```

### Balance Sheet Statement 🌐
```
GET /balance-sheet-statement?symbol=AAPL
```

### Cash Flow Statement 🌐
```
GET /cash-flow-statement?symbol=AAPL
```

### Latest Financial Statements 🌐
```
GET /latest-financial-statements?page=0&limit=250
```

### Income Statement TTM 🌐
```
GET /income-statement-ttm?symbol=AAPL
```

### Balance Sheet Statement TTM 🌐
```
GET /balance-sheet-statement-ttm?symbol=AAPL
```

### Cash Flow Statement TTM 🌐
```
GET /cash-flow-statement-ttm?symbol=AAPL
```

### Key Metrics 🌐
Revenue, net income, P/E ratio, etc.
```
GET /key-metrics?symbol=AAPL
```

### Financial Ratios 🌐
Profitability, liquidity, efficiency ratios.
```
GET /ratios?symbol=AAPL
```

### Key Metrics TTM 🌐
```
GET /key-metrics-ttm?symbol=AAPL
```

### Financial Ratios TTM 🌐
```
GET /ratios-ttm?symbol=AAPL
```

### Financial Scores 🌐
Altman Z-Score, Piotroski Score.
```
GET /financial-scores?symbol=AAPL
```

### Owner Earnings 🌐
```
GET /owner-earnings?symbol=AAPL
```

### Enterprise Values 🌐
```
GET /enterprise-values?symbol=AAPL
```

### Income Statement Growth 🌐
```
GET /income-statement-growth?symbol=AAPL
```

### Balance Sheet Statement Growth 🌐
```
GET /balance-sheet-statement-growth?symbol=AAPL
```

### Cash Flow Statement Growth 🌐
```
GET /cash-flow-statement-growth?symbol=AAPL
```

### Financial Statement Growth 🌐
Combined growth across all statements.
```
GET /financial-growth?symbol=AAPL
```

### Financial Reports Dates
```
GET /financial-reports-dates?symbol=AAPL
```

### Financial Reports Form 10-K (JSON)
```
GET /financial-reports-json?symbol=AAPL&year=2022&period=FY
```

### Financial Reports Form 10-K (XLSX)
```
GET /financial-reports-xlsx?symbol=AAPL&year=2022&period=FY
```

### Revenue Product Segmentation
```
GET /revenue-product-segmentation?symbol=AAPL
```

### Revenue Geographic Segments
```
GET /revenue-geographic-segmentation?symbol=AAPL
```

### As Reported Income Statements
```
GET /income-statement-as-reported?symbol=AAPL
```

### As Reported Balance Statements
```
GET /balance-sheet-statement-as-reported?symbol=AAPL
```

### As Reported Cash Flow Statements
```
GET /cash-flow-statement-as-reported?symbol=AAPL
```

### As Reported Financial Statements (Full)
```
GET /financial-statement-full-as-reported?symbol=AAPL
```

---

## Charts

### Stock Chart Light 🌐
Simplified: date, price, volume.
```
GET /historical-price-eod/light?symbol=AAPL
```

### Stock Price & Volume (Full) 🌐
OHLCV + price changes, percentage changes, VWAP.
```
GET /historical-price-eod/full?symbol=AAPL
```

### Unadjusted Stock Price 🌐
Without stock split adjustments.
```
GET /historical-price-eod/non-split-adjusted?symbol=AAPL
```

### Dividend-Adjusted Price Chart 🌐
Adjusted for dividend payouts.
```
GET /historical-price-eod/dividend-adjusted?symbol=AAPL
```

### Intraday Charts 🌐

| Interval | Endpoint |
|----------|----------|
| 1 min | `/historical-chart/1min?symbol=AAPL` |
| 5 min | `/historical-chart/5min?symbol=AAPL` |
| 15 min | `/historical-chart/15min?symbol=AAPL` |
| 30 min | `/historical-chart/30min?symbol=AAPL` |
| 1 hour | `/historical-chart/1hour?symbol=AAPL` |
| 4 hour | `/historical-chart/4hour?symbol=AAPL` |

---

## Economics

### Treasury Rates
```
GET /treasury-rates
```

### Economic Indicators
GDP, unemployment, inflation, etc.
```
GET /economic-indicators?name=GDP
```

### Economic Calendar
Upcoming economic data releases.
```
GET /economic-calendar
```

### Market Risk Premium
```
GET /market-risk-premium
```

---

## Earnings, Dividends, Splits

### Dividends Company 🌐
Record/payment/declaration dates for a symbol.
```
GET /dividends?symbol=AAPL
```

### Dividends Calendar 🌐
Upcoming dividend events for all stocks.
```
GET /dividends-calendar
```

### Earnings Report 🌐
Earnings dates, EPS estimates, revenue projections.
```
GET /earnings?symbol=AAPL
```

### Earnings Calendar 🌐
Upcoming/past earnings announcements.
```
GET /earnings-calendar
```

### IPO Calendar 🌐
Upcoming IPOs with dates, pricing, exchange listings.
```
GET /ipos-calendar
```

### IPO Disclosure 🇺🇸
SEC filing disclosures for upcoming IPOs.
```
GET /ipos-disclosure
```

### IPO Prospectus 🇺🇸
Offering prices, commissions, proceeds, SEC links.
```
GET /ipos-prospectus
```

### Stock Split Details 🌐
Split date and ratio for a specific company.
```
GET /splits?symbol=AAPL
```

### Stock Splits Calendar 🌐
Upcoming splits across multiple companies.
```
GET /splits-calendar
```

---

## Earnings Transcript

### Latest Earning Transcripts 🌐
```
GET /earning-call-transcript-latest
```

### Earnings Transcript 🌐
Full transcript of a company's earnings call.
```
GET /earning-call-transcript?symbol=AAPL&year=2020&quarter=3
```

### Transcript Dates By Symbol 🌐
```
GET /earning-call-transcript-dates?symbol=AAPL
```

### Available Transcript Symbols 🌐
```
GET /earnings-transcript-list
```

---

## News

### FMP Articles 🇺🇸
```
GET /fmp-articles?page=0&limit=20
```

### General News 🌐
```
GET /news/general-latest?page=0&limit=20
```

### Press Releases 🇺🇸
```
GET /news/press-releases-latest?page=0&limit=20
```

### Stock News (Latest)
```
GET /news/stock-latest?page=0&limit=20
```

### Crypto News
```
GET /news/crypto-latest?page=0&limit=20
```

### Forex News
```
GET /news/forex-latest?page=0&limit=20
```

### Search Press Releases 🇺🇸
```
GET /news/press-releases?symbols=AAPL
```

### Search Stock News
```
GET /news/stock?symbols=AAPL
```

### Search Crypto News
```
GET /news/crypto?symbols=BTCUSD
```

### Search Forex News
```
GET /news/forex?symbols=EURUSD
```

---

## Form 13F

### Institutional Ownership Filings 🇺🇸
```
GET /institutional-ownership/latest?page=0&limit=100
```

### Filings Extract 🇺🇸
Extract data from SEC filings.
```
GET /institutional-ownership/extract?cik=0001388838&year=2023&quarter=3
```

### Form 13F Filings Dates 🇺🇸
```
GET /institutional-ownership/dates?cik=0001067983
```

### Filings Extract With Analytics By Holder 🇺🇸
Analytical breakdown of institutional filings.
```
GET /institutional-ownership/extract-analytics/holder?symbol=AAPL&year=2023&quarter=3&page=0&limit=10
```

### Holder Performance Summary 🇺🇸
```
GET /institutional-ownership/holder-performance-summary?cik=0001067983&page=0
```

### Holders Industry Breakdown 🇺🇸
```
GET /institutional-ownership/holder-industry-breakdown?cik=0001067983&year=2023&quarter=3
```

### Positions Summary 🇺🇸
Institutional holdings snapshot for a stock.
```
GET /institutional-ownership/symbol-positions-summary?symbol=AAPL&year=2023&quarter=3
```

### Industry Performance Summary 🇺🇸
```
GET /institutional-ownership/industry-summary?year=2023&quarter=3
```

---

## Analyst

### Financial Estimates 🌐
Projected revenue, EPS, etc.
```
GET /analyst-estimates?symbol=AAPL&period=annual&page=0&limit=10
```

### Ratings Snapshot 🌐
Financial ratings based on key ratios.
```
GET /ratings-snapshot?symbol=AAPL
```

### Historical Ratings 🌐
```
GET /ratings-historical?symbol=AAPL
```

### Price Target Summary 🇺🇸
Average price targets from analysts.
```
GET /price-target-summary?symbol=AAPL
```

### Price Target Consensus 🇺🇸
High, low, median, consensus targets.
```
GET /price-target-consensus?symbol=AAPL
```

### Stock Grades 🌐
Upgrades, downgrades, maintained ratings.
```
GET /grades?symbol=AAPL
```

### Historical Stock Grades 🌐
```
GET /grades-historical?symbol=AAPL
```

### Stock Grades Summary 🌐
Consolidated summary: strong buy, buy, hold, sell, strong sell counts.
```
GET /grades-consensus?symbol=AAPL
```

---

## Market Performance

### Sector Performance Snapshot 🌐
```
GET /sector-performance-snapshot?date=2024-02-01
```

### Industry Performance Snapshot 🌐
```
GET /industry-performance-snapshot?date=2024-02-01
```

### Historical Sector Performance 🌐
```
GET /historical-sector-performance?sector=Energy
```

### Historical Industry Performance 🌐
```
GET /historical-industry-performance?industry=Biotechnology
```

### Sector PE Snapshot 🌐
```
GET /sector-pe-snapshot?date=2024-02-01
```

### Industry PE Snapshot 🌐
```
GET /industry-pe-snapshot?date=2024-02-01
```

### Historical Sector PE 🌐
```
GET /historical-sector-pe?sector=Energy
```

### Historical Industry PE 🌐
```
GET /historical-industry-pe?industry=Biotechnology
```

### Biggest Gainers 🇺🇸
```
GET /biggest-gainers
```

### Biggest Losers 🇺🇸
```
GET /biggest-losers
```

### Most Active 🇺🇸
```
GET /most-actives
```

---

## Technical Indicators

All technical indicators share a common pattern:
```
GET /technical-indicators/{indicator}?symbol=AAPL&periodLength=10&timeframe=1day
```

| Indicator | Path |
|-----------|------|
| Simple Moving Average (SMA) | `/technical-indicators/sma` |
| Exponential Moving Average (EMA) | `/technical-indicators/ema` |
| Weighted Moving Average (WMA) | `/technical-indicators/wma` |
| Double Exponential MA (DEMA) | `/technical-indicators/dema` |
| Triple Exponential MA (TEMA) | `/technical-indicators/tema` |
| Relative Strength Index (RSI) | `/technical-indicators/rsi` |
| Standard Deviation | `/technical-indicators/standarddeviation` |
| Williams %R | `/technical-indicators/williams` |
| Average Directional Index (ADX) | `/technical-indicators/adx` |

All are available globally (🌐).

---

## ETF and Mutual Funds

### ETF & Fund Holdings 🌐
Assets and their weights in the portfolio.
```
GET /etf/holdings?symbol=SPY
```

### ETF & Mutual Fund Information 🌐
Ticker, name, expense ratio, AUM, etc.
```
GET /etf/info?symbol=SPY
```

### ETF Country Allocation 🌐
```
GET /etf/country-weightings?symbol=SPY
```

### ETF Asset Exposure 🌐
Which ETFs hold a specific stock.
```
GET /etf/asset-exposure?symbol=AAPL
```

### ETF Sector Weighting 🌐
```
GET /etf/sector-weightings?symbol=SPY
```

### Mutual Fund & ETF Disclosure 🇺🇸
```
GET /funds/disclosure-holders-latest?symbol=AAPL
```

### Mutual Fund Disclosures 🇺🇸
```
GET /funds/disclosure?symbol=VWO&year=2023&quarter=4
```

### Disclosure Name Search 🇺🇸
```
GET /funds/disclosure-holders-search?name=Federated Hermes Government Income Securities, Inc.
```

### Fund Disclosures by Date 🇺🇸
```
GET /funds/disclosure-dates?symbol=VWO
```

---

## SEC Filings

### Latest 8-K Filings 🇺🇸
```
GET /sec-filings-8k?from=2024-01-01&to=2024-03-01&page=0&limit=100
```

### Latest SEC Filings 🇺🇸
```
GET /sec-filings-financials?from=2024-01-01&to=2024-03-01&page=0&limit=100
```

### By Form Type 🇺🇸
```
GET /sec-filings-search/form-type?formType=8-K&from=2024-01-01&to=2024-03-01&page=0&limit=100
```

### By Symbol 🇺🇸
```
GET /sec-filings-search/symbol?symbol=AAPL&from=2024-01-01&to=2024-03-01&page=0&limit=100
```

### By CIK 🇺🇸
```
GET /sec-filings-search/cik?cik=0000320193&from=2024-01-01&to=2024-03-01&page=0&limit=100
```

### By Name 🇺🇸
```
GET /sec-filings-company-search/name?company=Berkshire
```

### Company Search By Symbol 🇺🇸
```
GET /sec-filings-company-search/symbol?symbol=AAPL
```

### Company Search By CIK 🇺🇸
```
GET /sec-filings-company-search/cik?cik=0000320193
```

### SEC Company Full Profile 🇺🇸
```
GET /sec-profile?symbol=AAPL
```

### Industry Classification List 🇺🇸
SIC codes and industry titles.
```
GET /standard-industrial-classification-list
```

### Industry Classification Search 🇺🇸
```
GET /industry-classification-search
```

### All Industry Classification 🇺🇸
```
GET /all-industry-classification
```

---

## Insider Trades

### Latest Insider Trading 🇺🇸
```
GET /insider-trading/latest?page=0&limit=100
```

### Search Insider Trades 🇺🇸
```
GET /insider-trading/search?page=0&limit=100
```

### Search by Reporting Name 🇺🇸
```
GET /insider-trading/reporting-name?name=Zuckerberg
```

### All Transaction Types 🇺🇸
```
GET /insider-trading-transaction-type
```

### Insider Trade Statistics 🇺🇸
```
GET /insider-trading/statistics?symbol=AAPL
```

### Acquisition Ownership 🇺🇸
```
GET /acquisition-of-beneficial-ownership?symbol=AAPL
```

---

## Indexes

### Stock Market Indexes List
```
GET /index-list
```

### Index Quote 🇺🇸
```
GET /quote?symbol=^GSPC
```

### Index Short Quote 🇺🇸
```
GET /quote-short?symbol=^GSPC
```

### All Index Quotes
```
GET /batch-index-quotes
```

### Historical Index Light Chart
```
GET /historical-price-eod/light?symbol=^GSPC
```

### Historical Index Full Chart
```
GET /historical-price-eod/full?symbol=^GSPC
```

### Intraday Index Charts

| Interval | Endpoint |
|----------|----------|
| 1 min | `/historical-chart/1min?symbol=^GSPC` |
| 5 min | `/historical-chart/5min?symbol=^GSPC` |
| 1 hour | `/historical-chart/1hour?symbol=^GSPC` |

### Index Constituents

| Index | Endpoint |
|-------|----------|
| S&P 500 | `/sp500-constituent` |
| Nasdaq | `/nasdaq-constituent` |
| Dow Jones | `/dowjones-constituent` |
| Historical S&P 500 | `/historical-sp500-constituent` |
| Historical Nasdaq | `/historical-nasdaq-constituent` |
| Historical Dow Jones | `/historical-dowjones-constituent` |

---

## Market Hours

### Exchange Market Hours 🌐
```
GET /exchange-market-hours?exchange=NASDAQ
```

### Holidays By Exchange 🌐
```
GET /holidays-by-exchange?exchange=NASDAQ
```

### All Exchange Market Hours 🌐
```
GET /all-exchange-market-hours
```

---

## Commodity

### Commodities List
```
GET /commodities-list
```

### Commodity Quote 🇺🇸
```
GET /quote?symbol=GCUSD
```

### Commodity Quote Short 🇺🇸
```
GET /quote-short?symbol=GCUSD
```

### All Commodities Quotes
```
GET /batch-commodity-quotes
```

### Historical Commodity Charts

| Type | Endpoint |
|------|----------|
| Light (EOD) | `/historical-price-eod/light?symbol=GCUSD` |
| Full (EOD) | `/historical-price-eod/full?symbol=GCUSD` |
| 1 min | `/historical-chart/1min?symbol=GCUSD` |
| 5 min | `/historical-chart/5min?symbol=GCUSD` |
| 1 hour | `/historical-chart/1hour?symbol=GCUSD` |

---

## Discounted Cash Flow

### DCF Valuation 🌐
```
GET /discounted-cash-flow?symbol=AAPL
```

### Levered DCF 🌐
Post-debt valuation accounting for debt obligations.
```
GET /levered-discounted-cash-flow?symbol=AAPL
```

### Custom DCF Advanced 🌐
Fine-tune assumptions and variables.
```
GET /custom-discounted-cash-flow?symbol=AAPL
```

### Custom DCF Levered 🌐
```
GET /custom-levered-discounted-cash-flow?symbol=AAPL
```

---

## Forex

### Forex Currency Pairs List
```
GET /forex-list
```

### Forex Quote 🇺🇸
```
GET /quote?symbol=EURUSD
```

### Forex Short Quote 🇺🇸
```
GET /quote-short?symbol=EURUSD
```

### Batch Forex Quotes
```
GET /batch-forex-quotes
```

### Historical Forex Charts

| Type | Endpoint |
|------|----------|
| Light (EOD) | `/historical-price-eod/light?symbol=EURUSD` |
| Full (EOD) | `/historical-price-eod/full?symbol=EURUSD` |
| 1 min | `/historical-chart/1min?symbol=EURUSD` |
| 5 min | `/historical-chart/5min?symbol=EURUSD` |
| 1 hour | `/historical-chart/1hour?symbol=EURUSD` |

---

## Crypto

### Cryptocurrency List
```
GET /cryptocurrency-list
```

### Crypto Quote
```
GET /quote?symbol=BTCUSD
```

### Crypto Quote Short
```
GET /quote-short?symbol=BTCUSD
```

### All Crypto Quotes
```
GET /batch-crypto-quotes
```

### Historical Crypto Charts

| Type | Endpoint |
|------|----------|
| Light (EOD) | `/historical-price-eod/light?symbol=BTCUSD` |
| Full (EOD) | `/historical-price-eod/full?symbol=BTCUSD` |
| 1 min | `/historical-chart/1min?symbol=BTCUSD` |
| 5 min | `/historical-chart/5min?symbol=BTCUSD` |
| 1 hour | `/historical-chart/1hour?symbol=BTCUSD` |

---

## Senate

### Latest Senate Financial Disclosures 🇺🇸
```
GET /senate-latest?page=0&limit=100
```

### Latest House Financial Disclosures 🇺🇸
```
GET /house-latest?page=0&limit=100
```

### Senate Trading Activity 🇺🇸
```
GET /senate-trades?symbol=AAPL
```

### Senate Trades By Name 🇺🇸
```
GET /senate-trades-by-name?name=Jerry
```

### House Trades 🇺🇸
```
GET /house-trades?symbol=AAPL
```

### House Trades By Name 🇺🇸
```
GET /house-trades-by-name?name=James
```

---

## ESG

### ESG Investment Search 🇺🇸
```
GET /esg-disclosures?symbol=AAPL
```

### ESG Ratings 🇺🇸
```
GET /esg-ratings?symbol=AAPL
```

### ESG Benchmark Comparison 🇺🇸
```
GET /esg-benchmark
```

---

## Commitment of Traders

### COT Report
```
GET /commitment-of-traders-report
```

### COT Analysis By Dates
```
GET /commitment-of-traders-analysis
```

### COT Report List
```
GET /commitment-of-traders-list
```

---

## Fundraisers

### Latest Crowdfunding 🇺🇸
```
GET /crowdfunding-offerings-latest?page=0&limit=100
```

### Crowdfunding Search 🇺🇸
```
GET /crowdfunding-offerings-search?name=enotap
```

### Crowdfunding By CIK 🇺🇸
```
GET /crowdfunding-offerings?cik=0001916078
```

### Equity Offering Updates 🇺🇸
```
GET /fundraising-latest?page=0&limit=10
```

### Equity Offering Search 🇺🇸
```
GET /fundraising-search?name=NJOY
```

### Equity Offering By CIK 🇺🇸
```
GET /fundraising?cik=0001547416
```

---

## Bulk

Bulk endpoints retrieve data for many symbols at once.

### Company Profile Bulk 🌐
```
GET /profile-bulk?part=0
```

### Stock Rating Bulk 🌐
```
GET /rating-bulk
```

### DCF Valuations Bulk 🌐
```
GET /dcf-bulk
```

### Financial Scores Bulk 🌐
```
GET /scores-bulk
```

### Price Target Summary Bulk 🇺🇸
```
GET /price-target-summary-bulk
```

### ETF Holder Bulk 🌐
```
GET /etf-holder-bulk?part=1
```

### Upgrades/Downgrades Consensus Bulk 🌐
```
GET /upgrades-downgrades-consensus-bulk
```

### Key Metrics TTM Bulk 🌐
```
GET /key-metrics-ttm-bulk
```

### Ratios TTM Bulk 🌐
```
GET /ratios-ttm-bulk
```

### Stock Peers Bulk 🌐
```
GET /peers-bulk
```

### Earnings Surprises Bulk 🌐
```
GET /earnings-surprises-bulk?year=2025
```

### Income Statement Bulk 🌐
```
GET /income-statement-bulk?year=2025&period=Q1
```

### Income Statement Growth Bulk 🌐
```
GET /income-statement-growth-bulk?year=2025&period=Q1
```

### Balance Sheet Statement Bulk 🌐
```
GET /balance-sheet-statement-bulk?year=2025&period=Q1
```

### Balance Sheet Statement Growth Bulk 🌐
```
GET /balance-sheet-statement-growth-bulk?year=2025&period=Q1
```

### Cash Flow Statement Bulk 🌐
```
GET /cash-flow-statement-bulk?year=2025&period=Q1
```

### Cash Flow Statement Growth Bulk 🌐
```
GET /cash-flow-statement-growth-bulk?year=2025&period=Q1
```

### EOD Bulk 🌐
End-of-day price data for all symbols on a given date.
```
GET /eod-bulk?date=2024-10-22
```
