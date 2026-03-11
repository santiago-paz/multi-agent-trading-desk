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
  portfolio: url('places/32/folder.png'),
  analysis: url('places/32/user-home.png'),
  agent: url('places/32/folder.png'),
  orders: url('places/32/folder.png'),
  news: url('apps/48/mail.png'),
  marketdata: url('apps/32/libreoffice-calc.png'),
} as const;

export type DesktopAppId = keyof typeof DESKTOP_APP_ICONS;
