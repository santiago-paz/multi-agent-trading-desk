export const backtestingEs = {
  // ── Date presets ──
  'preset.1m': '1 mes',
  'preset.3m': '3 meses',
  'preset.6m': '6 meses',
  'preset.1y': '1 año',

  // ── Agent signal words (renderAgentDetail) ──
  'signal.bullish': '🟢 Alcista',
  'signal.bearish': '🔴 Bajista',
  'signal.neutral': '⚪ Neutral',

  // ── Agent detail block ──
  'detail.signal': 'Señal:',
  'detail.confidencePct': '(Confianza: {confidence}%)',
  'detail.newsAnalyzed': 'Noticias analizadas:',
  'detail.summary': 'Resumen:',

  // ── Equity curve ──
  'equity.totalReturn': 'Retorno total:',
  'equity.daysCount': '{count} días',
  'equity.initialLabel': 'inicial ${amount}',

  // ── Exposure curve ──
  'exposure.currentGross': 'Exposición bruta actual:',
  'exposure.max': 'máx {value}',
  'exposure.tooltipLabel': 'Exposición',

  // ── Metrics table ──
  'metrics.sharpe.tooltip': 'Retorno ajustado por riesgo: (retorno − tasa libre de riesgo) / desvío estándar. > 1 es bueno, > 2 muy bueno, negativo significa que perdiste contra el cash.',
  'metrics.sortino.tooltip': 'Como Sharpe, pero solo penaliza la volatilidad a la baja. Más representativo cuando los retornos no son simétricos.',
  'metrics.maxDrawdown.tooltip': 'Mayor caída desde un pico hasta un valle del valor del portfolio durante el backtest. Cuanto más cercano a 0%, mejor.',
  'metrics.totalReturn': 'Retorno Total',
  'metrics.totalReturn.tooltip': 'Variación porcentual entre el capital inicial y el valor final del portfolio.',
  'metrics.finalValue': 'Valor Final del Portfolio',
  'metrics.finalValue.tooltip': 'Valor total (cash + posiciones) al cierre del último día del backtest.',
  'metrics.grossExposure': 'Exposición Bruta',
  'metrics.grossExposure.tooltip': '(longs + |shorts|) / valor del portfolio al cierre. Mide cuánto del capital está invertido — 100% = totalmente invertido, > 100% = apalancado.',
  'metrics.netExposure': 'Exposición Neta',
  'metrics.netExposure.tooltip': '(longs − shorts) / valor del portfolio al cierre. Mide la dirección neta: cercano a 100% = sesgo alcista, cercano a 0% = neutral al mercado.',
  'metrics.avgCash': 'Cash Promedio',
  'metrics.avgCash.tooltip': 'Porcentaje promedio del portfolio mantenido en efectivo a lo largo del backtest. Alto = estrategia defensiva o pocas oportunidades; bajo = capital constantemente desplegado.',
  'metrics.colMetric': 'Métrica',
  'metrics.colValue': 'Valor',

  // ── Config tab ──
  'config.periodLegend': 'Período de backtest',
  'config.from': 'Desde:',
  'config.to': 'Hasta:',
  'config.initialCapitalLegend': 'Capital inicial (USD)',
  'config.initialCapital': 'Capital inicial: ${amount} USD',
  'config.tickersList': 'Tickers: {tickers}',
  'config.period': 'Período: {start} → {end}',

  // ── Agent selector ──
  'agents.connectionError': 'No se pudo conectar al servidor AI Hedge Fund ({url})',

  // ── Actions ──
  'action.cancel': 'Cancelar',
  'run.executing': 'Ejecutando...',
  'run.button': 'Ejecutar backtest',

  // ── Tabs ──
  'tabs.config': '1. Configuración',
  'tabs.run': '2. Ejecución',
  'tabs.results': '3. Resultados',
  'tabs.history': '4. Histórico',

  // ── Run tab ──
  'run.noDataHint': 'No hay datos de ejecución. Configure los parámetros y presione "Ejecutar backtest" en la pestaña de Configuración.',
  'run.progress': 'Progreso',
  'run.progressDetail': '({current}/{total} días)',
  'run.starting': 'Iniciando backtest con {count} agente(s)...',
  'run.processing': 'Procesando día {current}/{total}...',

  // ── Log messages ──
  'log.started': 'Backtest iniciado',
  'log.tinyTrade': '{date}: {ticker} trade minúsculo (${amount})',
  'log.unknownError': 'Error desconocido',
  'log.errorPrefix': 'Error: {message}',
  'log.completed': 'Backtest completado',
  'log.completedDays': 'Backtest completado — {count} días procesados',
  'log.cancelled': 'Backtest cancelado por el usuario',

  // ── Status bar ──
  'status.starting': 'Iniciando backtest...',
  'status.error': 'Error en backtest',
  'status.loading': 'Cargando...',
  'status.ready': 'Listo',
  'status.agentsCount': '{count} agentes',

  // ── Shared column headers ──
  'col.date': 'Fecha',

  // ── Results tab ──
  'results.empty': 'Los resultados aparecerán aquí cuando el backtest haya procesado al menos 2 días.',
  'results.equityCurveLegend': 'Curva de Equity',
  'results.exposureLegend': 'Exposición',
  'results.metricsLegend': 'Métricas de Rendimiento',
  'results.dailyLegend': 'Resultados Diarios ({count} días)',
  'results.dateTooltip': 'Día calendario simulado. Click en una fila con ► para expandir las decisiones de los agentes ese día.',
  'results.colPortfolioValue': 'Valor Portfolio',
  'results.portfolioValueTooltip': 'Cash + valor de mercado de las posiciones al cierre del día (en USD).',
  'results.colChange': 'Cambio',
  'results.changeTooltip': 'Variación porcentual del valor del portfolio respecto al día anterior (o respecto al capital inicial el primer día).',
  'results.cashTooltip': 'Efectivo disponible al cierre del día, sin invertir.',
  'results.cashPctTooltip': 'Cash / Valor Portfolio. Indica qué fracción del capital queda sin desplegar ese día.',
  'results.tradesTooltip': 'Operaciones ejecutadas el día. Signo + = compra, − = venta. La cantidad está expresada en acciones del subyacente.',
  'results.decisionsLabel': 'Decisiones:',
  'results.decisionColAction': 'Acción',
  'results.decisionColQuantity': 'Cantidad',
  'results.decisionColConfidence': 'Confianza',
  'results.decisionColReasoning': 'Razonamiento',
  'results.pricesLabel': 'Precios:',

  // ── History tab ──
  'history.empty': 'Sin reportes guardados. Los backtests completados se guardan automáticamente acá.',
  'history.colPeriod': 'Período',
  'history.colReturn': 'Retorno',
  'history.colDays': 'Días',
  'history.colAgents': 'Agentes',
  'report.loadHint': 'Click para cargar este reporte en la pestaña Resultados',
  'history.deleteHint': 'Borrar este reporte',
  'confirm.clearHistory': '¿Borrar todo el histórico de backtests?',
  'history.clearAll': 'Borrar todo',
} as const;

export type BacktestingKey = keyof typeof backtestingEs;
