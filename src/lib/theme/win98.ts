import React from 'react';

/* ─── Win98 authentic inline style constants ─────────────────────────────── */
export const FONT: React.CSSProperties = {
  fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif',
  fontSize: '11px',
  WebkitFontSmoothing: 'none',
  // @ts-ignore – non-standard
  MozOsxFontSmoothing: 'grayscale',
};

export const LABEL: React.CSSProperties = {
  ...FONT,
  width: '80px',
  flexShrink: 0,
  textAlign: 'right',
  paddingRight: '6px',
  whiteSpace: 'nowrap',
};

export const LABEL_ACCOUNT: React.CSSProperties = {
  ...LABEL,
  width: '90px',
};

/* ─── Win98 ListView column header (raised 3D button look) ───────────────── */
export const COL_HEADER_BASE: React.CSSProperties = {
  ...FONT,
  fontWeight: 'normal',
  padding: '2px 6px',
  background: '#c0c0c0',
  whiteSpace: 'nowrap',
  cursor: 'default',
  userSelect: 'none',
};

/* Raised look (default / inactive) */
export const COL_RAISED: React.CSSProperties = {
  ...COL_HEADER_BASE,
  borderTop: '1px solid #ffffff',
  borderLeft: '1px solid #ffffff',
  borderRight: '1px solid #808080',
  borderBottom: '1px solid #808080',
};

/* Sunken look (active sort column – pressed button) */
export const COL_SUNKEN: React.CSSProperties = {
  ...COL_HEADER_BASE,
  borderTop: '1px solid #808080',
  borderLeft: '1px solid #808080',
  borderRight: '1px solid #ffffff',
  borderBottom: '1px solid #ffffff',
};

export const COL_HEADER: React.CSSProperties = {
  ...COL_RAISED,
  textAlign: 'left',
};

export const COL_HEADER_RIGHT: React.CSSProperties = {
  ...COL_HEADER,
  textAlign: 'right',
};

/* Win98 cell style */
export const CELL: React.CSSProperties = {
  ...FONT,
  padding: '1px 6px',
  borderRight: '1px solid #c0c0c0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const CELL_RIGHT: React.CSSProperties = {
  ...CELL,
  textAlign: 'right',
};

/* Win98 inset groove separator (horizontal rule) */
export const HR98: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #808080',
  borderBottom: '1px solid #ffffff',
  margin: '4px 0',
};
