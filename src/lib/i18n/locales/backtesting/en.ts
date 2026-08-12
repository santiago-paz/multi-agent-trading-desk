import type { BacktestingKey } from './es';

export const backtestingEn: Record<BacktestingKey, string> = {
  // ── Date presets ──
  'preset.1m': '1 month',
  'preset.3m': '3 months',
  'preset.6m': '6 months',
  'preset.1y': '1 year',

  // ── Agent signal words (renderAgentDetail) ──
  'signal.bullish': '🟢 Bullish',
  'signal.bearish': '🔴 Bearish',
  'signal.neutral': '⚪ Neutral',

  // ── Agent detail block ──
  'detail.signal': 'Signal:',
  'detail.confidencePct': '(Confidence: {confidence}%)',
  'detail.newsAnalyzed': 'News analyzed:',
  'detail.summary': 'Summary:',

  // ── Equity curve ──
  'equity.totalReturn': 'Total return:',
  'equity.daysCount': '{count} days',
  'equity.initialLabel': 'initial ${amount}',

  // ── Exposure curve ──
  'exposure.currentGross': 'Current gross exposure:',
  'exposure.max': 'max {value}',
  'exposure.tooltipLabel': 'Exposure',

  // ── Metrics table ──
  'metrics.sharpe.tooltip': 'Risk-adjusted return: (return − risk-free rate) / standard deviation. > 1 is good, > 2 very good, negative means you lost against cash.',
  'metrics.sortino.tooltip': 'Like Sharpe, but only penalizes downside volatility. More representative when returns aren’t symmetric.',
  'metrics.maxDrawdown.tooltip': 'Largest drop from a peak to a trough in portfolio value during the backtest. Closer to 0% is better.',
  'metrics.totalReturn': 'Total Return',
  'metrics.totalReturn.tooltip': 'Percentage change between the initial capital and the final portfolio value.',
  'metrics.finalValue': 'Final Portfolio Value',
  'metrics.finalValue.tooltip': 'Total value (cash + positions) at the close of the last day of the backtest.',
  'metrics.grossExposure': 'Gross Exposure',
  'metrics.grossExposure.tooltip': '(longs + |shorts|) / portfolio value at close. Measures how much of the capital is invested — 100% = fully invested, > 100% = leveraged.',
  'metrics.netExposure': 'Net Exposure',
  'metrics.netExposure.tooltip': '(longs − shorts) / portfolio value at close. Measures net direction: close to 100% = bullish bias, close to 0% = market-neutral.',
  'metrics.avgCash': 'Average Cash',
  'metrics.avgCash.tooltip': 'Average percentage of the portfolio held in cash throughout the backtest. High = defensive strategy or few opportunities; low = capital constantly deployed.',
  'metrics.colMetric': 'Metric',
  'metrics.colValue': 'Value',

  // ── Config tab ──
  'config.periodLegend': 'Backtest period',
  'config.from': 'From:',
  'config.to': 'To:',
  'config.initialCapitalLegend': 'Initial capital (USD)',
  'config.initialCapital': 'Initial capital: ${amount} USD',
  'config.tickersList': 'Tickers: {tickers}',
  'config.period': 'Period: {start} → {end}',

  // ── Agent selector ──
  'agents.connectionError': 'Could not connect to the AI Hedge Fund server ({url})',

  // ── Actions ──
  'action.cancel': 'Cancel',
  'run.executing': 'Running...',
  'run.button': 'Run backtest',

  // ── Tabs ──
  'tabs.config': '1. Configuration',
  'tabs.run': '2. Execution',
  'tabs.results': '3. Results',
  'tabs.history': '4. History',

  // ── Run tab ──
  'run.noDataHint': 'No execution data yet. Configure the parameters and press "Run backtest" in the Configuration tab.',
  'run.progress': 'Progress',
  'run.progressDetail': '({current}/{total} days)',
  'run.starting': 'Starting backtest with {count} agent(s)...',
  'run.processing': 'Processing day {current}/{total}...',

  // ── Log messages ──
  'log.started': 'Backtest started',
  'log.tinyTrade': '{date}: {ticker} tiny trade (${amount})',
  'log.unknownError': 'Unknown error',
  'log.errorPrefix': 'Error: {message}',
  'log.completed': 'Backtest complete',
  'log.completedDays': 'Backtest complete — {count} days processed',
  'log.cancelled': 'Backtest cancelled by the user',

  // ── Status bar ──
  'status.starting': 'Starting backtest...',
  'status.error': 'Backtest error',
  'status.loading': 'Loading...',
  'status.ready': 'Ready',
  'status.agentsCount': '{count} agents',

  // ── Shared column headers ──
  'col.date': 'Date',

  // ── Results tab ──
  'results.empty': 'Results will appear here once the backtest has processed at least 2 days.',
  'results.equityCurveLegend': 'Equity Curve',
  'results.exposureLegend': 'Exposure',
  'results.metricsLegend': 'Performance Metrics',
  'results.dailyLegend': 'Daily Results ({count} days)',
  'results.dateTooltip': 'Simulated calendar day. Click a row with ► to expand the agents’ decisions for that day.',
  'results.colPortfolioValue': 'Portfolio Value',
  'results.portfolioValueTooltip': 'Cash + market value of positions at the close of the day (in USD).',
  'results.colChange': 'Change',
  'results.changeTooltip': 'Percentage change in portfolio value versus the previous day (or versus the initial capital on the first day).',
  'results.cashTooltip': 'Cash available at the close of the day, uninvested.',
  'results.cashPctTooltip': 'Cash / Portfolio Value. Indicates what fraction of the capital remains undeployed that day.',
  'results.tradesTooltip': 'Trades executed that day. + sign = buy, − = sell. Quantity is expressed in underlying shares.',
  'results.decisionsLabel': 'Decisions:',
  'results.decisionColAction': 'Action',
  'results.decisionColQuantity': 'Quantity',
  'results.decisionColConfidence': 'Confidence',
  'results.decisionColReasoning': 'Reasoning',
  'results.pricesLabel': 'Prices:',

  // ── History tab ──
  'history.empty': 'No saved reports. Completed backtests are saved here automatically.',
  'history.colPeriod': 'Period',
  'history.colReturn': 'Return',
  'history.colDays': 'Days',
  'history.colAgents': 'Agents',
  'report.loadHint': 'Click to load this report in the Results tab',
  'history.deleteHint': 'Delete this report',
  'confirm.clearHistory': 'Clear the entire backtest history?',
  'history.clearAll': 'Clear all',
};
