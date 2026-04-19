import type { MarketDataKey } from './es';

export const marketDataEn: Record<MarketDataKey, string> = {
  // ── MarketDataWindow tabs ──
  'tabs.mine': 'My CEDEARs',
  'tabs.all': 'All',
  'tabs.trade': 'Trade',

  // ── MarketDataWindow — ListView headers ──
  'col.symbol': 'Symbol',
  'col.last': 'Last',
  'col.pct': '7D %',
  'col.chart': '7 Days',

  // ── MarketDataWindow — fieldset & status ──
  'legend.mine': 'My CEDEARs',
  'legend.all': 'All CEDEARs',
  'loading': 'Loading market data…',
  'error': 'Failed to load data.',
  'empty.mine': 'No CEDEARs in portfolio.',
  'empty.all': 'No other CEDEARs available.',
  'status.items': '{count} item{s}',
  'status.noData': 'No data',
  'status.tradable': '{count} tradable CEDEAR{s}',
  'footer.updatingMd': 'Updating...',
  'footer.updateMd': 'Update MD',
  'footer.updatingOp': 'Updating...',
  'footer.updateOp': 'Update Trade',

  // ── QuickTradePanel — Summary ──
  'trade.available': 'Available:',
  'trade.committed': 'Committed:',
  'trade.operable': 'Tradable (net comm.):',
  'trade.loading': 'Loading available CEDEARs...',
  'trade.searchPlaceholder': 'Search ticker or name...',
  'trade.filterLabel': 'Filter:',
  'trade.filterBuyable': 'With balance only',
  'trade.filterAll': 'All',

  // ── QuickTradePanel — Table headers ──
  'trade.col.ticker': 'Ticker',
  'trade.col.name': 'Name',
  'trade.col.price': 'Price',
  'trade.col.var': 'Chg%',
  'trade.col.maxQty': 'Max Qty',
  'trade.col.dailyVol': 'Daily Vol.',

  // ── QuickTradePanel — Empty states ──
  'trade.noResults': 'No results',
  'trade.noCedears': 'No CEDEARs',
  'trade.noCedearsAvailable': 'No CEDEARs available with your current balance',

  // ── QuickTradePanel — Order form ──
  'trade.buy': 'Buy {ticker}',
  'trade.qty': 'Quantity:',
  'trade.term': 'Term:',
  'trade.type': 'Type:',
  'trade.typeLimit': 'Limit',
  'trade.typeMarket': 'Market',
  'trade.total': 'Total:',
  'trade.commissionEst': '(est. comm. ~${amount})',
  'trade.cancel': 'Cancel',
  'trade.sending': 'Sending...',
  'trade.buyBtn': 'Buy',

  // ── QuickTradePanel — Order messages ──
  'trade.orderSent': 'Order sent successfully',
  'trade.orderSentWithNum': 'Order sent successfully (Operation #{num})',
  'trade.orderUnconfirmed': 'IOL did not confirm the order. Check Movements to verify.',
  'trade.orderError': 'Error sending order',
};
