import { describe, it, expect, vi } from 'vitest';
import { waitForOrderSettlement, type OrderStatusResult } from './order-polling';

function makeNow() {
  let t = 0;
  return {
    now: () => t,
    advance: (ms: number) => { t += ms; },
  };
}

function makeSleep(advance: (ms: number) => void) {
  return (ms: number) => { advance(ms); return Promise.resolve(); };
}

function statusOk(estadoActual: string, extra: Partial<{ cantidadOperada: number; montoOperado: number }> = {}): OrderStatusResult {
  return { success: true, data: { estadoActual, ...extra } };
}

describe('waitForOrderSettlement', () => {
  it('returns "filled" immediately when first poll is terminada', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('terminada', { cantidadOperada: 5 }));
    const outcome = await waitForOrderSettlement(123, {
      getStatus,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome).toEqual({ kind: 'filled', estado: 'terminada', filledQty: 5 });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps polling through "iniciada" / "en_Proceso" until terminada', async () => {
    const clock = makeNow();
    const getStatus = vi.fn()
      .mockResolvedValueOnce(statusOk('iniciada'))
      .mockResolvedValueOnce(statusOk('en_Proceso'))
      .mockResolvedValueOnce(statusOk('terminada', { cantidadOperada: 2 }));
    const outcome = await waitForOrderSettlement(123, {
      getStatus,
      pollMs: 5_000,
      timeoutMs: 60_000,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome.kind).toBe('filled');
    expect(getStatus).toHaveBeenCalledTimes(3);
  });

  it('returns "partial" on parcialmente_Terminada', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('parcialmente_Terminada', { cantidadOperada: 3 }));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome).toEqual({ kind: 'partial', estado: 'parcialmente_Terminada', filledQty: 3 });
  });

  it('returns "partial" on parcialmente_Terminada_Con_Pedido_Cancelacion', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('parcialmente_Terminada_Con_Pedido_Cancelacion'));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome.kind).toBe('partial');
  });

  it('returns "cancelled" on cancelada', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('cancelada'));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome).toEqual({ kind: 'cancelled', estado: 'cancelada' });
  });

  it('returns "cancelled" on cancelada_Por_Vencimiento_Validez', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('cancelada_Por_Vencimiento_Validez'));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome.kind).toBe('cancelled');
  });

  it('returns "timeout" with last seen estado after deadline', async () => {
    const clock = makeNow();
    const getStatus = vi.fn().mockResolvedValue(statusOk('en_Proceso'));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      pollMs: 5_000,
      timeoutMs: 60_000,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome).toEqual({ kind: 'timeout', lastEstado: 'en_Proceso' });
    // 60s budget, 5s poll → ~12 iterations (one per slot up to deadline).
    expect(getStatus.mock.calls.length).toBeGreaterThan(1);
  });

  it('keeps polling on transient API errors and resolves once status is known', async () => {
    const clock = makeNow();
    const getStatus = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'network' } as OrderStatusResult)
      .mockResolvedValueOnce(statusOk('terminada'));
    const outcome = await waitForOrderSettlement(1, {
      getStatus,
      pollMs: 5_000,
      timeoutMs: 60_000,
      sleep: makeSleep(clock.advance),
      now: clock.now,
    });
    expect(outcome.kind).toBe('filled');
    expect(getStatus).toHaveBeenCalledTimes(2);
  });
});
