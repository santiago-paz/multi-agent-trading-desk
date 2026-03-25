/**
 * Win98SE icon theme from https://github.com/nestoris/Win98SE
 * Icons loaded via jsDelivr CDN. Only use icon paths that are real PNG files
 * (many in the theme are symlinks; those return ~17 bytes and break as images).
 */
const BASE = 'https://cdn.jsdelivr.net/gh/nestoris/Win98SE@main/SE98';

function url(path: string): string {
  return `${BASE}/${path}`;
}

/** Icon URLs verified to be real PNG files (not symlinks) in Win98SE/SE98. */
export const DESKTOP_APP_ICONS = {
  portfolio: url('apps/32/accessories-character-map.png'),
  analysis: url('apps/32/system-search.png'),
  agent: url('apps/32/utilities-terminal.png'),
  orders: url('actions/32/document-new.png'),
  news: url('mimes/32/application-rss+xml.png'),
  marketdata: url('mimes/32/x-office-spreadsheet.png'),
  account: url('apps/32/system-users.png'),
  movements: url('places/32/folder-recent.png'),
  aihedgefund: url('apps/32/system-search.png'),
  backtesting: url('apps/32/accessories-calculator.png'),
  quicktrade: url('actions/32/document-new.png'),
  autotrader: url('apps/32/utilities-system-monitor.png'),
} as const;

export type DesktopAppId = keyof typeof DESKTOP_APP_ICONS;