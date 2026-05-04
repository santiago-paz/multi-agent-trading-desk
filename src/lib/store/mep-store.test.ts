// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the server actions module before importing the store.
// We don't care about IOL/FMP clients here — the store just calls getMEPRate.
const getMEPRate = vi.fn<() => Promise<{ success: boolean; data?: number; error?: string }>>();

vi.mock('@/app/trading/actions', () => ({ getMEPRate }));

// Dynamic import so the mock is in place when the store is loaded.
const { useMepStore } = await import('./mep-store');

describe('useMepStore', () => {
  beforeEach(() => {
    getMEPRate.mockReset();
    useMepStore.setState({
      mepRate: 1200,
      lastUpdated: null,
      isLoading: false,
      error: null,
    });
  });

  it('starts with default fallback rate of 1200', () => {
    expect(useMepStore.getState().mepRate).toBe(1200);
    expect(useMepStore.getState().lastUpdated).toBeNull();
  });

  it('updates mepRate and lastUpdated on successful fetch', async () => {
    getMEPRate.mockResolvedValueOnce({ success: true, data: 1350 });
    await useMepStore.getState().fetchMepRate();
    const s = useMepStore.getState();
    expect(s.mepRate).toBe(1350);
    expect(s.lastUpdated).toBeInstanceOf(Date);
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('sets error when the action returns success=false', async () => {
    getMEPRate.mockResolvedValueOnce({ success: false, error: 'IOL down' });
    await useMepStore.getState().fetchMepRate();
    const s = useMepStore.getState();
    expect(s.error).toBe('IOL down');
    expect(s.isLoading).toBe(false);
    expect(s.mepRate).toBe(1200); // fallback unchanged
  });

  it('sets error when the action throws', async () => {
    getMEPRate.mockRejectedValueOnce(new Error('network'));
    await useMepStore.getState().fetchMepRate();
    const s = useMepStore.getState();
    expect(s.error).toBe('network');
    expect(s.isLoading).toBe(false);
  });

  it('skips overlapping fetches while isLoading=true', async () => {
    useMepStore.setState({ isLoading: true });
    await useMepStore.getState().fetchMepRate();
    expect(getMEPRate).not.toHaveBeenCalled();
  });

  it('uses generic message when success=false has no error string', async () => {
    getMEPRate.mockResolvedValueOnce({ success: false });
    await useMepStore.getState().fetchMepRate();
    expect(useMepStore.getState().error).toBe('Failed to fetch MEP');
  });
});
