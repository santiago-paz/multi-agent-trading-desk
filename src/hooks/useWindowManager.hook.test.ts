// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowManager } from './useWindowManager';

// Provide a deterministic viewport so centerPosition produces stable values.
const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
});

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ORIGINAL_INNER_WIDTH });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: ORIGINAL_INNER_HEIGHT });
});

describe('useWindowManager (hook)', () => {
  // ── initial state ────────────────────────────────────────────────────────

  it('starts with no windows and no focus', () => {
    const { result } = renderHook(() => useWindowManager());
    expect(result.current.windows).toEqual({});
    expect(result.current.focusedId).toBeNull();
    expect(result.current.allOpenWindows).toEqual([]);
  });

  // ── openOrFocusWindow ────────────────────────────────────────────────────

  it('openOrFocusWindow creates a new window with default size and focus', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    const w = result.current.windows.portfolio;
    expect(w).toBeDefined();
    expect(w.id).toBe('portfolio');
    expect(w.width).toBe(752);
    expect(w.height).toBe(552);
    expect(w.minimized).toBe(false);
    expect(w.zIndex).toBeGreaterThan(100);
    expect(result.current.focusedId).toBe('portfolio');
  });

  it('openOrFocusWindow on an existing window restores minimized + bumps z-index', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    const firstZ = result.current.windows.portfolio.zIndex;
    act(() => {
      result.current.minimizeWindow('portfolio');
    });
    expect(result.current.windows.portfolio.minimized).toBe(true);

    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    expect(result.current.windows.portfolio.minimized).toBe(false);
    expect(result.current.windows.portfolio.zIndex).toBeGreaterThan(firstZ);
    expect(result.current.focusedId).toBe('portfolio');
  });

  // ── openDynamicWindow ────────────────────────────────────────────────────

  it('openDynamicWindow opens an arbitrary id with custom dimensions', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openDynamicWindow('company:AAPL', { width: 560, height: 600 });
    });
    const w = result.current.windows['company:AAPL'];
    expect(w).toBeDefined();
    expect(w.width).toBe(560);
    expect(w.height).toBe(600);
    expect(w.minimized).toBe(false);
    expect(result.current.focusedId).toBe('company:AAPL');
  });

  it('openDynamicWindow applies offset to centered position', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openDynamicWindow('a', { width: 400, height: 300 });
      result.current.openDynamicWindow('b', { width: 400, height: 300, offset: 30 });
    });
    const a = result.current.windows.a;
    const b = result.current.windows.b;
    expect(b.x).toBe(a.x + 30);
    expect(b.y).toBe(a.y + 30);
  });

  it('openDynamicWindow on an existing id focuses it instead of recreating', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openDynamicWindow('foo', { width: 400, height: 300 });
    });
    const firstX = result.current.windows.foo.x;
    const firstZ = result.current.windows.foo.zIndex;
    act(() => {
      result.current.updateWindow('foo', { x: 999 });
    });
    act(() => {
      result.current.openDynamicWindow('foo', { width: 400, height: 300, offset: 50 });
    });
    // Position is preserved (not reset by re-open), z-index bumped.
    expect(result.current.windows.foo.x).toBe(999);
    expect(result.current.windows.foo.x).not.toBe(firstX);
    expect(result.current.windows.foo.zIndex).toBeGreaterThan(firstZ);
  });

  // ── updateWindow ─────────────────────────────────────────────────────────

  it('updateWindow patches existing window state', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('news');
    });
    act(() => {
      result.current.updateWindow('news', { x: 42, y: 84, width: 600 });
    });
    const w = result.current.windows.news;
    expect(w.x).toBe(42);
    expect(w.y).toBe(84);
    expect(w.width).toBe(600);
    // Untouched properties survive
    expect(w.height).toBe(440);
  });

  it('updateWindow is a no-op for unknown ids', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.updateWindow('does-not-exist', { x: 99 });
    });
    expect(result.current.windows['does-not-exist']).toBeUndefined();
  });

  // ── closeWindow ──────────────────────────────────────────────────────────

  it('closeWindow removes window and clears focus when matching', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    expect(result.current.focusedId).toBe('portfolio');
    act(() => {
      result.current.closeWindow('portfolio');
    });
    expect(result.current.windows.portfolio).toBeUndefined();
    expect(result.current.focusedId).toBeNull();
  });

  it('closeWindow keeps focus when a different window is focused', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.openOrFocusWindow('news');
    });
    expect(result.current.focusedId).toBe('news');
    act(() => {
      result.current.closeWindow('portfolio');
    });
    expect(result.current.focusedId).toBe('news');
    expect(result.current.windows.portfolio).toBeUndefined();
    expect(result.current.windows.news).toBeDefined();
  });

  // ── minimizeWindow ───────────────────────────────────────────────────────

  it('minimizeWindow sets minimized=true and clears focus when matching', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('marketdata');
    });
    act(() => {
      result.current.minimizeWindow('marketdata');
    });
    expect(result.current.windows.marketdata.minimized).toBe(true);
    expect(result.current.focusedId).toBeNull();
  });

  it('minimizeWindow is a no-op for unknown ids', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.minimizeWindow('nope');
    });
    expect(result.current.windows.nope).toBeUndefined();
  });

  // ── focusWindow ──────────────────────────────────────────────────────────

  it('focusWindow restores minimized state and bumps z-index', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.openOrFocusWindow('news');
    });
    const portfolioZ = result.current.windows.portfolio.zIndex;
    act(() => {
      result.current.minimizeWindow('portfolio');
    });
    act(() => {
      result.current.focusWindow('portfolio');
    });
    expect(result.current.windows.portfolio.minimized).toBe(false);
    expect(result.current.windows.portfolio.zIndex).toBeGreaterThan(portfolioZ);
    expect(result.current.focusedId).toBe('portfolio');
  });

  it('focusWindow on unknown id still updates focus state', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.focusWindow('ghost');
    });
    expect(result.current.focusedId).toBe('ghost');
    expect(result.current.windows.ghost).toBeUndefined();
  });

  // ── arrangeWindows ───────────────────────────────────────────────────────

  it('arrangeWindows repositions multiple windows and restores them from minimized', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.openOrFocusWindow('news');
      result.current.minimizeWindow('news');
    });
    act(() => {
      result.current.arrangeWindows([
        { id: 'portfolio', x: 0, y: 0, width: 400, height: 300 },
        { id: 'news', x: 400, y: 0, width: 400, height: 300 },
      ]);
    });
    expect(result.current.windows.portfolio).toMatchObject({ x: 0, y: 0, width: 400, height: 300, minimized: false });
    expect(result.current.windows.news).toMatchObject({ x: 400, y: 0, width: 400, height: 300, minimized: false });
  });

  it('arrangeWindows ignores ids that do not exist', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    act(() => {
      result.current.arrangeWindows([
        { id: 'portfolio', x: 1, y: 2, width: 300, height: 200 },
        { id: 'ghost', x: 0, y: 0, width: 100, height: 100 },
      ]);
    });
    expect(result.current.windows.portfolio).toMatchObject({ x: 1, y: 2, width: 300, height: 200 });
    expect(result.current.windows.ghost).toBeUndefined();
  });

  it('arrangeWindows places focusId on top with the highest z-index', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.openOrFocusWindow('news');
    });
    act(() => {
      result.current.arrangeWindows(
        [
          { id: 'portfolio', x: 0, y: 0, width: 400, height: 300 },
          { id: 'news', x: 400, y: 0, width: 400, height: 300 },
        ],
        'portfolio',
      );
    });
    expect(result.current.focusedId).toBe('portfolio');
    expect(result.current.windows.portfolio.zIndex).toBeGreaterThan(result.current.windows.news.zIndex);
  });

  // ── toggleMinimize ───────────────────────────────────────────────────────

  it('toggleMinimize minimizes when window is open and clears focus', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    act(() => {
      result.current.toggleMinimize('portfolio');
    });
    expect(result.current.windows.portfolio.minimized).toBe(true);
    expect(result.current.focusedId).toBeNull();
  });

  it('toggleMinimize restores when window is minimized and focuses it', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.minimizeWindow('portfolio');
    });
    const minimizedZ = result.current.windows.portfolio.zIndex;
    act(() => {
      result.current.toggleMinimize('portfolio');
    });
    expect(result.current.windows.portfolio.minimized).toBe(false);
    expect(result.current.windows.portfolio.zIndex).toBeGreaterThan(minimizedZ);
    expect(result.current.focusedId).toBe('portfolio');
  });

  it('toggleMinimize is a no-op for unknown ids', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.toggleMinimize('nope');
    });
    expect(result.current.windows.nope).toBeUndefined();
  });

  // ── z-index monotonicity ────────────────────────────────────────────────

  it('z-index increases monotonically across operations', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    const z1 = result.current.windows.portfolio.zIndex;
    act(() => {
      result.current.openOrFocusWindow('news');
    });
    const z2 = result.current.windows.news.zIndex;
    act(() => {
      result.current.focusWindow('portfolio');
    });
    const z3 = result.current.windows.portfolio.zIndex;
    expect(z2).toBeGreaterThan(z1);
    expect(z3).toBeGreaterThan(z2);
  });

  // ── allOpenWindows ──────────────────────────────────────────────────────

  it('allOpenWindows reflects current windows as entries', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.openOrFocusWindow('news');
    });
    const ids = result.current.allOpenWindows.map(([id]) => id).sort();
    expect(ids).toEqual(['news', 'portfolio']);
  });

  // ── escape key ──────────────────────────────────────────────────────────

  it('Escape closes a regular focused window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.windows.portfolio).toBeUndefined();
    expect(result.current.focusedId).toBeNull();
  });

  it('Escape minimizes the autotrader window instead of closing it', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('autotrader');
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.windows.autotrader).toBeDefined();
    expect(result.current.windows.autotrader.minimized).toBe(true);
    expect(result.current.focusedId).toBeNull();
  });

  it('Escape minimizes the backtesting window instead of closing it', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('backtesting');
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.windows.backtesting).toBeDefined();
    expect(result.current.windows.backtesting.minimized).toBe(true);
  });

  it('Escape does nothing when no window is focused', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
      result.current.minimizeWindow('portfolio');
    });
    expect(result.current.focusedId).toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    // Still there, still minimized.
    expect(result.current.windows.portfolio).toBeDefined();
    expect(result.current.windows.portfolio.minimized).toBe(true);
  });

  it('Non-Escape keys are ignored', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => {
      result.current.openOrFocusWindow('portfolio');
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    expect(result.current.windows.portfolio).toBeDefined();
    expect(result.current.focusedId).toBe('portfolio');
  });
});
