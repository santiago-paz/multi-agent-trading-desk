export const fmtARS = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtARS2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function parseSSEChunk(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventType = '';
    let dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataStr = line.slice(6);
    }
    if (eventType && dataStr) {
      try { events.push({ event: eventType, data: JSON.parse(dataStr) }); } catch { /* skip */ }
    }
  }
  return events;
}

/** Remap FMP-keyed record to IOL symbols. */
export function remapToIol<T>(record: Record<string, T>, fmpToIol: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, val] of Object.entries(record)) {
    result[fmpToIol[key] ?? key] = val;
  }
  return result;
}
