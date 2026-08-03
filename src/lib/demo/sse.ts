export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface PacedItem { chunk: string; delayMs?: number }

/** Emits chunks in order with optional per-chunk delay; stops cleanly on cancel. */
export function pacedStream(items: PacedItem[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const item of items) {
        if (cancelled) break;
        controller.enqueue(encoder.encode(item.chunk));
        if (item.delayMs && item.delayMs > 0) {
          await new Promise((r) => setTimeout(r, item.delayMs));
        }
      }
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; },
  });
}
