export const marketDataEs = {
  // ── MarketDataWindow tabs ──
  'tabs.mine': 'Mis CEDEARs',
  'tabs.all': 'Todos',
  'tabs.trade': 'Operar',

  // ── MarketDataWindow — ListView headers ──
  'col.symbol': 'Símbolo',
  'col.last': 'Último',
  'col.pct': '7D %',
  'col.chart': '7 Días',

  // ── MarketDataWindow — fieldset & status ──
  'legend.mine': 'Mis CEDEARs',
  'legend.all': 'Todos los CEDEARs',
  'loading': 'Cargando datos de mercado…',
  'error': 'Error al cargar datos.',
  'empty.mine': 'No hay CEDEARs en tenencia.',
  'empty.all': 'No hay otros CEDEARs disponibles.',
  'status.items': '{count} elemento{s}',
  'status.noData': 'Sin datos',
  'status.tradable': '{count} CEDEAR{s} operable{s2}',
  'footer.updatingMd': 'Actualizando...',
  'footer.updateMd': 'Actualizar MD',
  'footer.updatingOp': 'Actualizando...',
  'footer.updateOp': 'Actualizar Op',

  // ── QuickTradePanel — Summary ──
  'trade.available': 'Disponible:',
  'trade.committed': 'Comprometido:',
  'trade.operable': 'Operable (neto com.):',
  'trade.loading': 'Cargando CEDEARs disponibles...',
  'trade.searchPlaceholder': 'Buscar ticker o nombre...',
  'trade.filterLabel': 'Filtro:',
  'trade.filterBuyable': 'Solo con saldo',
  'trade.filterAll': 'Todos',

  // ── QuickTradePanel — Table headers ──
  'trade.col.ticker': 'Ticker',
  'trade.col.name': 'Nombre',
  'trade.col.price': 'Precio',
  'trade.col.var': 'Var%',
  'trade.col.maxQty': 'Max Cant.',
  'trade.col.dailyVol': 'Vol. Diario',

  // ── QuickTradePanel — Empty states ──
  'trade.noResults': 'Sin resultados',
  'trade.noCedears': 'No hay CEDEARs',
  'trade.noCedearsAvailable': 'No hay CEDEARs disponibles con tu saldo actual',

  // ── QuickTradePanel — Order form ──
  'trade.buy': 'Comprar {ticker}',
  'trade.qty': 'Cantidad:',
  'trade.term': 'Plazo:',
  'trade.type': 'Tipo:',
  'trade.typeLimit': 'Límite',
  'trade.typeMarket': 'Mercado',
  'trade.total': 'Total:',
  'trade.commissionEst': '(com. est. ~${amount})',
  'trade.cancel': 'Cancelar',
  'trade.sending': 'Enviando...',
  'trade.buyBtn': 'Comprar',

  // ── QuickTradePanel — Order messages ──
  'trade.orderSent': 'Orden enviada correctamente',
  'trade.orderSentWithNum': 'Orden enviada correctamente (Operación #{num})',
  'trade.orderUnconfirmed': 'IOL no confirmó la orden. Verificá en Movimientos si fue enviada.',
  'trade.orderError': 'Error al enviar orden',
} as const;

export type MarketDataKey = keyof typeof marketDataEs;
