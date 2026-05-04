// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgents } from './useAgents';
import type { Agent } from '../types';

function makeAgent(key: string, order: number, overrides: Partial<Agent> = {}): Agent {
  return {
    key,
    display_name: key,
    description: '',
    investing_style: 'value',
    order,
    ...overrides,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAgents', () => {
  it('starts in loading state with no agents and no selection', () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAgents());
    expect(result.current.agents).toEqual([]);
    expect(result.current.selectedAgents.size).toBe(0);
    expect(result.current.isLoadingAgents).toBe(true);
    expect(result.current.apiUrl).toBe('/api/hedge-fund');
  });

  it('fetches and sorts agents by order ascending', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        agents: [makeAgent('c', 30), makeAgent('a', 10), makeAgent('b', 20)],
      }),
    });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));
    expect(result.current.agents.map(a => a.key)).toEqual(['a', 'b', 'c']);
    expect(fetchMock).toHaveBeenCalledWith('/api/hedge-fund/agents');
  });

  it('handles missing agents field by using empty list', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({}) });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));
    expect(result.current.agents).toEqual([]);
  });

  it('finishes loading and logs error when fetch fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));
    expect(result.current.agents).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('toggleAgent adds a key when absent and removes it when present', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ agents: [makeAgent('a', 1)] }) });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));

    act(() => {
      result.current.toggleAgent('a');
    });
    expect(result.current.selectedAgents.has('a')).toBe(true);

    act(() => {
      result.current.toggleAgent('a');
    });
    expect(result.current.selectedAgents.has('a')).toBe(false);
  });

  it('selectAllAgents picks every loaded agent key', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ agents: [makeAgent('a', 1), makeAgent('b', 2)] }),
    });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));

    act(() => {
      result.current.selectAllAgents();
    });
    expect([...result.current.selectedAgents].sort()).toEqual(['a', 'b']);
  });

  it('selectNoAgents clears the selection', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ agents: [makeAgent('a', 1), makeAgent('b', 2)] }),
    });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));

    act(() => {
      result.current.selectAllAgents();
    });
    expect(result.current.selectedAgents.size).toBe(2);

    act(() => {
      result.current.selectNoAgents();
    });
    expect(result.current.selectedAgents.size).toBe(0);
  });

  it('setAgentsByKeys replaces the selection with the given keys', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ agents: [makeAgent('a', 1), makeAgent('b', 2), makeAgent('c', 3)] }),
    });
    const { result } = renderHook(() => useAgents());
    await waitFor(() => expect(result.current.isLoadingAgents).toBe(false));

    act(() => {
      result.current.toggleAgent('a');
    });
    act(() => {
      result.current.setAgentsByKeys(['b', 'c']);
    });
    expect([...result.current.selectedAgents].sort()).toEqual(['b', 'c']);
  });
});
