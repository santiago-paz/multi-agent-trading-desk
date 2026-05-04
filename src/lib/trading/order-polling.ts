export type OrderSettlementOutcome =
  | { kind: 'filled'; estado: string; filledQty?: number }
  | { kind: 'partial'; estado: string; filledQty?: number }
  | { kind: 'cancelled'; estado: string }
  | { kind: 'timeout'; lastEstado?: string };

export interface OrderStatusOk {
  success: true;
  data: { estadoActual: string; cantidadOperada?: number; montoOperado?: number };
}
export interface OrderStatusErr {
  success: false;
  error: string;
}
export type OrderStatusResult = OrderStatusOk | OrderStatusErr;

export interface PollOptions {
  getStatus: (numero: number) => Promise<OrderStatusResult>;
  timeoutMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const TERMINAL_FILLED = new Set(['terminada']);
const TERMINAL_PARTIAL = new Set([
  'parcialmente_Terminada',
  'parcialmente_Terminada_Con_Pedido_Cancelacion',
]);
const TERMINAL_CANCELLED = new Set([
  'cancelada',
  'cancelada_Por_Vencimiento_Validez',
]);

export async function waitForOrderSettlement(
  numero: number,
  opts: PollOptions,
): Promise<OrderSettlementOutcome> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const pollMs = opts.pollMs ?? 5_000;
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());

  const deadline = now() + timeoutMs;
  let lastEstado: string | undefined;

  while (now() < deadline) {
    const res = await opts.getStatus(numero);
    if (res.success) {
      const estado = res.data.estadoActual;
      lastEstado = estado;
      if (TERMINAL_FILLED.has(estado)) {
        return { kind: 'filled', estado, filledQty: res.data.cantidadOperada };
      }
      if (TERMINAL_PARTIAL.has(estado)) {
        return { kind: 'partial', estado, filledQty: res.data.cantidadOperada };
      }
      if (TERMINAL_CANCELLED.has(estado)) {
        return { kind: 'cancelled', estado };
      }
    }
    if (now() + pollMs >= deadline) break;
    await sleep(pollMs);
  }
  return { kind: 'timeout', lastEstado };
}
