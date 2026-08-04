import type { PortfolioKey } from './es';

export const portfolioEn: Record<PortfolioKey, string> = {
  // ── PortfolioWindow tabs ──
  'tabs.holdings': 'Holdings',
  'tabs.account': 'My Account',
  'loading': 'Loading portfolio...',
  'error': 'Could not load portfolio.',

  // ── PortfolioSummary — Valuation ──
  'valuation.title': 'Valuation',
  'valuation.currency': 'Currency:',
  'valuation.currencyUSD': 'MEP Dollar (U$D)',
  'valuation.currencyARS': 'Pesos (AR$)',
  'valuation.total': 'Total:',
  'valuation.profit': 'Profit:',
  'valuation.cash': 'Cash:',
  'valuation.committed': 'Committed:',
  'valuation.distribution': 'Distribution',
  'valuation.others': 'Others',

  // ── PortfolioSummary — Holdings table ──
  'holdings.title': 'Holdings ({count} securities)',
  'col.symbol': 'Symbol',
  'col.description': 'Description',
  'col.qty': 'Qty',
  'col.lastPrice': 'Last Price',
  'col.valued': 'Value',
  'col.dailyVar': 'Chg %',
  'col.profit': 'Profit',
  'col.yield': 'Return %',

  // ── PortfolioSummary — Asset types ──
  'assetType.all': 'All',
  'assetType.cedears': 'CEDEARs',
  'assetType.stocks': 'Stocks',
  'assetType.bonds': 'Bonds',
  'assetType.options': 'Options',
  'assetType.mutualFunds': 'Mutual Funds',
  'assetType.corporateBonds': 'Corporate Bonds',

  // ── PortfolioSummary — Footer ──
  'footer.titlesInPortfolio': '{count} securities in portfolio',
  'footer.updating': 'Updating...',
  'footer.update': 'Update',

  // ── AccountData — Holder info ──
  'account.holderTitle': 'Account holder',
  'account.name': 'Name:',
  'account.accountNumber': 'Account #:',
  'account.email': 'Email:',
  'account.investorProfile': 'Profile:',
  'account.profileError': 'Could not load profile.',
  'account.loading': 'Loading account data...',

  // ── AccountData — Portfolio state ──
  'account.stateTitle': 'Portfolio state',
  'account.accountLabel': 'Account:',
  'account.available': 'Available:',
  'account.committed': 'Committed:',
  'account.securitiesValued': 'Securities Val.:',
  'account.total': 'Total:',
  'account.immediate': 'CI (T+0):',
  'account.24h': '24h (T+1):',
  'account.48h': '48h (T+2):',
  'account.status': 'Status:',
  'account.stateError': 'Could not load account state.',

  // ── AccountData — Summary ──
  'account.summaryTitle': 'Summary',
  'account.totalUSD': 'Total (USD):',
  'account.noData': 'No data.',
  'col.period': 'Period',
  'col.operations': 'Operations',
  'col.volume': 'Volume',

  // ── AccountData — Status bar ──
  'account.ready': 'Ready',
  'account.noSession': 'No session',
  'account.accountPrefix': 'Acct:',

  // ── OperationsFeed — Column headers ──
  'col.date': 'Date',
  'col.type': 'Type',
  'col.price': 'Price',
  'col.amount': 'Amount',
  'col.status': 'Status',

  // ── OperationsFeed — Movimientos ──
  'movements.legend': 'Recent transactions (IOL)',
  'movements.loading': 'Loading transactions...',
  'movements.empty': 'No recent transactions.',
  'movements.count': '{count} transactions',

  // ── OperationsFeed — op.tipo / op.estado display values ──
  'op.type.buy': 'Buy',
  'op.type.sell': 'Sell',
  'op.status.terminada': 'completed',
  'op.status.pendiente': 'pending',
  'op.status.iniciada': 'started',
  'op.status.cancelada': 'cancelled',
  'op.status.rechazada': 'rejected',

  // ── AccountData — perfilInversor display values ──
  'profile.aggressive': 'Aggressive',
  'profile.moderate': 'Moderate',
  'profile.conservative': 'Conservative',

  // ── AccountData — estadisticas[].descripcion display values ──
  'stat.purchases': 'Purchases',
  'stat.sales': 'Sales',
};
