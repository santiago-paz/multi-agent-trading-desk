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
  analysis: url('apps/32/system-search.png'), // document + magnifier: inspect a company
  agent: url('apps/32/utilities-system-monitor.png'), // same icon as autotrader (landing page)
  orders: url('actions/32/document-new.png'),
  news: url('apps/32/internet-feed-reader.png'), // stack of newspapers
  marketdata: url('apps/32/invest-applet.png'), // 3D bar chart: quotes
  account: url('apps/32/system-users.png'),
  movements: url('apps/32/evolution-tasks.png'), // clipboard with ticked entries: executed operations
  backtesting: url('apps/32/timeshift.png'), // red rewind arrow into a PC: replay the past
  quicktrade: url('apps/32/system-software-installer.png'),
  autotrader: url('apps/32/utilities-system-monitor.png'),
  displayproperties: url('apps/32/preferences-desktop-wallpaper.png'),
  appmanager: url('apps/32/software-properties.png'), // window of app icons + status list
  start: url('places/16/start-here.png'),
} as const;

export type DesktopAppId = keyof typeof DESKTOP_APP_ICONS;
