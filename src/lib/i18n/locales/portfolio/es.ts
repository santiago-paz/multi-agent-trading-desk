export const portfolioEs = {
  // ── PortfolioWindow tabs ──
  'tabs.holdings': 'Tenencias',
  'tabs.account': 'Mi Cuenta',
  'loading': 'Cargando portafolio...',
  'error': 'No se pudo cargar el portafolio.',

  // ── PortfolioSummary — Valuation ──
  'valuation.title': 'Valuación',
  'valuation.currency': 'Moneda:',
  'valuation.currencyUSD': 'Dólar MEP (U$D)',
  'valuation.currencyARS': 'Pesos (AR$)',
  'valuation.total': 'Total:',
  'valuation.profit': 'Ganancia:',
  'valuation.cash': 'Efectivo:',
  'valuation.committed': 'Comprometido:',
  'valuation.distribution': 'Distribución',
  'valuation.others': 'Otros',

  // ── PortfolioSummary — Holdings table ──
  'holdings.title': 'Tenencia ({count} títulos)',
  'col.symbol': 'Símbolo',
  'col.description': 'Descripción',
  'col.qty': 'Cant.',
  'col.lastPrice': 'Últ. Precio',
  'col.valued': 'Valorizado',
  'col.dailyVar': 'Var %',
  'col.profit': 'Ganancia',
  'col.yield': 'Rend. %',

  // ── PortfolioSummary — Asset types ──
  'assetType.all': 'Todos',
  'assetType.cedears': 'CEDEARs',
  'assetType.stocks': 'Acciones',
  'assetType.bonds': 'Bonos',
  'assetType.options': 'Opciones',
  'assetType.mutualFunds': 'FCIs',
  'assetType.corporateBonds': 'ONs',

  // ── PortfolioSummary — Footer ──
  'footer.titlesInPortfolio': '{count} títulos en cartera',
  'footer.updating': 'Actualizando...',
  'footer.update': 'Actualizar',

  // ── AccountData — Holder info ──
  'account.holderTitle': 'Información del titular',
  'account.name': 'Nombre:',
  'account.accountNumber': 'Nro. Cuenta:',
  'account.email': 'Email:',
  'account.investorProfile': 'Perfil:',
  'account.profileError': 'No se pudo cargar el perfil.',
  'account.loading': 'Cargando datos de la cuenta...',

  // ── AccountData — Portfolio state ──
  'account.stateTitle': 'Estado del portfolio',
  'account.accountLabel': 'Cuenta:',
  'account.available': 'Disponible:',
  'account.committed': 'Comprometido:',
  'account.securitiesValued': 'Títulos Valor.:',
  'account.total': 'Total:',
  'account.immediate': 'CI (T+0):',
  'account.24h': '24hs (T+1):',
  'account.48h': '48hs (T+2):',
  'account.status': 'Estado:',
  'account.stateError': 'No se pudo cargar el estado de cuenta.',

  // ── AccountData — Summary ──
  'account.summaryTitle': 'Resumen',
  'account.totalUSD': 'Total (USD):',
  'account.noData': 'Sin datos.',
  'col.period': 'Período',
  'col.operations': 'Operaciones',
  'col.volume': 'Volumen',

  // ── AccountData — Status bar ──
  'account.ready': 'Listo',
  'account.noSession': 'Sin sesión',
  'account.accountPrefix': 'Cta:',
} as const;

export type PortfolioKey = keyof typeof portfolioEs;
