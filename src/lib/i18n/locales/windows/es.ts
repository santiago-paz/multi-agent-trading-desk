export const windowsEs = {
  // Window titles
  'portfolio': 'Portafolio y Cuenta',
  'news': 'Noticias del Mercado',
  'marketdata': 'Datos de Mercado',
  'movements': 'Movimientos',
  'backtesting': 'Backtesting',
  'autotrader': 'Auto Trader',
  'displayproperties': 'Propiedades de Pantalla',
  'companyDetail': '{symbol} — Detalle',
  'start': 'Inicio',
  // Desktop icon labels
  'icon.portfolio': 'Portafolio',
  'icon.news': 'Noticias',
  'icon.marketdata': 'Mercado',
  'icon.movements': 'Movimientos',
  'icon.backtesting': 'Backtesting',
  'icon.autotrader': 'Auto Trader',
  'icon.displayproperties': 'Pantalla',
} as const;

export type WindowsKey = keyof typeof windowsEs;
