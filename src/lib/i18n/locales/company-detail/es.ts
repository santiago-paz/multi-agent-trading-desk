export const companyDetailEs = {
  // ── Search ──
  'search.placeholder': 'Buscar ticker...',
  'search.go': 'Ir',
  'search.searching': 'Buscando…',
  'search.noMatches': 'Sin coincidencias',

  // ── Loading / Error states ──
  'loading': 'Cargando información de {symbol}...',
  'noUsEquivalent': 'Este CEDEAR no tiene equivalente listado en EE.UU.',
  'noUsEquivalentSub': 'No se puede obtener información desde FMP.',
  'noProfile': 'No se encontró información para {symbol}.',
  'fmpRateLimit': 'Límite de uso de FMP alcanzado. Esperá unos minutos o ampliá tu plan.',

  // ── Tabs ──
  'tabs.info': 'Info',
  'tabs.charts': 'Gráficos',
  'tabs.advanced': 'Avanzado',
  'tabs.news': 'Noticias',

  // ── Info tab ──
  'info.companyData': 'Datos de la empresa',
  'info.etfData': 'Datos del ETF',
  'info.sector': 'Sector',
  'info.industry': 'Industria',
  'info.marketCap': 'Cap. de mercado',
  'info.beta': 'Beta',
  'info.avgVolume': 'Vol. promedio',
  'info.country': 'País',
  'info.ipo': 'IPO',
  'info.inception': 'Inception',
  'info.web': 'Web',
  'info.noDescription': 'Sin descripción disponible.',

  // ── Charts tab ──
  'chart.price': 'Precio (1 año)',
  'chart.priceHelp': 'Precio de cierre diario del último año en la bolsa de EE.UU. Verde si subió, rojo si bajó respecto al inicio del período.',
  'chart.priceTooltip': 'Precio',
  'chart.noPrice': 'Sin datos de precio.',
  'chart.volume': 'Volumen (1 año)',
  'chart.volumeHelp': 'Cantidad de acciones operadas por día. Un volumen alto indica mayor liquidez e interés del mercado.',
  'chart.volumeTooltip': 'Volumen',
  'chart.revenue': 'Revenue & Net Income',
  'chart.revenueHelp': 'Revenue (barras): ingresos totales anuales. Net Income (línea): ganancia neta después de impuestos y gastos. Crecimiento sostenido indica un negocio saludable.',
  'chart.noFinancials': 'Sin datos financieros disponibles.',
  'chart.margins': 'Márgenes (%)',
  'chart.marginsHelp': 'Bruto: % de ingreso que queda después del costo de producción. Operativo: después de gastos operativos. Neto: ganancia final como % del ingreso. Márgenes estables o crecientes indican eficiencia.',
  'chart.marginGross': 'Bruto',
  'chart.marginOperating': 'Operativo',
  'chart.marginNet': 'Neto',
  'chart.eps': 'EPS',
  'chart.epsHelp': 'Earnings Per Share: ganancia neta dividida por la cantidad de acciones. Un EPS creciente sugiere mayor rentabilidad por acción para el inversor.',

  // ── Advanced tab ──
  'adv.loading': 'Cargando datos avanzados...',
  'adv.noData': 'No se pudieron obtener datos avanzados.',
  'adv.noScores': 'Sin datos de scores disponibles.',
  'adv.scoresTitle': 'Scores & Valuación',
  'adv.scoresHelp': 'Altman Z-Score: riesgo de quiebra (>2.99 seguro, 1.81-2.99 zona gris, <1.81 peligro). Piotroski F-Score: calidad del valor (0-9, ≥7 fuerte). DCF: valor intrínseco estimado por flujo de caja descontado.',
  'adv.dcfFairValue': 'DCF (valor justo)',
  'adv.currentPrice': 'Precio actual',
  'adv.signal': 'Señal',
  'adv.undervalued': 'Subvaluada',
  'adv.overvalued': 'Sobrevaluada',
  'adv.valuation': 'Valuación (P/E & P/B)',
  'adv.valuationHelp': 'P/E (barras): precio dividido ganancias — cuántos años de ganancias se pagan. P/B (línea): precio vs valor contable. Valores bajos pueden indicar subvaluación.',
  'adv.profitability': 'Rentabilidad (ROE & ROA)',
  'adv.profitabilityHelp': 'ROE: retorno sobre patrimonio — cuánto genera por cada peso invertido por accionistas. ROA: retorno sobre activos totales. Valores más altos indican mejor eficiencia.',
  'adv.cashFlow': 'Flujo de Caja',
  'adv.cashFlowHelp': 'Operating CF (barras): efectivo generado por operaciones. Free CF (línea): efectivo disponible después de inversiones en capital. FCF positivo y creciente es señal de solidez financiera.',
  'adv.capitalStructure': 'Estructura de Capital',
  'adv.capitalHelp': 'Equity (verde) + Liabilities (azul) = Total Assets. Net Debt (línea): deuda total menos efectivo. Una proporción creciente de equity indica mayor solidez.',
  'adv.equity': 'Patrimonio',
  'adv.liabilities': 'Pasivos',
  'adv.netDebt': 'Deuda Neta',
  'adv.leverage': 'Apalancamiento',
  'adv.leverageHelp': 'Debt/Equity (barras): cuánta deuda por cada peso de patrimonio. Current Ratio (línea): activos corrientes / pasivos corrientes — >1 indica solvencia a corto plazo.',

  // ── News tab ──
  'news.loading': 'Cargando noticias...',
  'news.empty': 'No hay noticias disponibles para {symbol}.',
  'news.error': 'No se pudieron obtener noticias.',
} as const;

export type CompanyDetailKey = keyof typeof companyDetailEs;
