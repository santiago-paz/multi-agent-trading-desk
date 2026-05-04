export const fmtARS = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtARS2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export { parseSSEChunk } from '@/lib/sse';

/** Remap FMP-keyed record to IOL symbols. */
export function remapToIol<T>(record: Record<string, T>, fmpToIol: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, val] of Object.entries(record)) {
    result[fmpToIol[key] ?? key] = val;
  }
  return result;
}
