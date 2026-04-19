export const CHART_FONT = { fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif', fontSize: 9 };

export const fmtMktCap = (n: number): string => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString('en-US')}`;
};

export const fmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};

export const fmtVol = (n: number): string => n.toLocaleString('en-US');
