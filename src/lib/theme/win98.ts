import React from 'react';

/* ─── Win98 authentic inline style constants ─────────────────────────────── */
export const FONT: React.CSSProperties = {
  fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif',
  fontSize: '11px',
  WebkitFontSmoothing: 'none',
  // @ts-expect-error – non-standard
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
  position: 'sticky',
  top: 0,
  zIndex: 1,
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

/* ─── Semantic colors ────────────────────────────────────────────────────── */
export const COLOR_POSITIVE = '#008000';
export const COLOR_NEGATIVE = '#800000';
export const COLOR_LINK = '#0000ff';
export const COLOR_SECONDARY = '#555555';
export const COLOR_DISABLED = '#808080';

/** Pressed / toggled button (Sunken Outer + Sunken Inner, with focus ring). */
export const BUTTON_PRESSED: React.CSSProperties = {
  boxShadow: 'inset 1px 1px var(--window-frame, #0a0a0a), inset -1px -1px var(--btn-highlight, #ffffff), inset 2px 2px var(--btn-shadow, #808080), inset -2px -2px var(--btn-face, #dfdfdf)',
  paddingTop: '3px',
  paddingLeft: '5px',
  paddingRight: '3px',
  paddingBottom: '1px',
  outline: '1px dotted var(--window-frame, #000)',
  outlineOffset: '-4px',
};

/* ─── Shared window layout patterns ─────────────────────────────────────── */

/** Outer container for every panel window (flex column, full height). */
export const WINDOW_CONTAINER: React.CSSProperties = {
  ...FONT,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#c0c0c0',
  overflow: 'hidden',
};

/** Scrollable inner body area inside a panel window. */
export const SCROLLABLE_BODY: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  margin: 0,
  padding: '6px',
  background: '#c0c0c0',
};

/** Refresh button footer strip (bottom of panel windows). */
export const REFRESH_FOOTER: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '2px 6px 4px',
  background: '#c0c0c0',
  borderTop: '1px solid #808080',
  flexShrink: 0,
};

/** Status bar inline style (applied to the .status-bar div). */
export const STATUS_BAR_STYLE: React.CSSProperties = {
  ...FONT,
  flexShrink: 0,
  margin: 0,
};
