import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { centerPosition, DEFAULT_WINDOWS, COMPANY_DETAIL_DEFAULTS, APP_IDS } from './useWindowManager';

// ── centerPosition ──────────────────────────────────────────────────────────

describe('centerPosition', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore original window
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
  });

  function mockViewport(innerWidth: number, innerHeight: number) {
    vi.stubGlobal('window', { ...globalThis.window, innerWidth, innerHeight });
  }

  it('centers a window in a 1920×1080 viewport', () => {
    mockViewport(1920, 1080);
    const pos = centerPosition(800, 600);
    // usableHeight = 1080 - 28 (taskbar) = 1052; y = (1052-600)/2 = 226
    expect(pos).toEqual({ x: 560, y: 226 });
  });

  it('centers a window in a 1280×720 viewport', () => {
    mockViewport(1280, 720);
    const pos = centerPosition(400, 300);
    // usableHeight = 720 - 28 (taskbar) = 692; y = (692-300)/2 = 196
    expect(pos).toEqual({ x: 440, y: 196 });
  });

  it('clamps to 0 when window is larger than viewport', () => {
    mockViewport(500, 400);
    const pos = centerPosition(800, 600);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it('handles exact fit (window same size as viewport)', () => {
    mockViewport(800, 600);
    const pos = centerPosition(800, 600);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it('floors fractional positions', () => {
    mockViewport(1001, 701);
    const pos = centerPosition(400, 300);
    // (1001-400)/2 = 300.5 → 300; usableHeight = 701-28 = 673, (673-300)/2 = 186.5 → 186
    expect(pos).toEqual({ x: 300, y: 186 });
  });

  it('returns {0,0} when window is undefined (SSR)', () => {
    const win = globalThis.window;
    // @ts-expect-error — simulate SSR environment
    delete globalThis.window;
    const pos = centerPosition(800, 600);
    expect(pos).toEqual({ x: 0, y: 0 });
    globalThis.window = win;
  });
});

// ── DEFAULT_WINDOWS ─────────────────────────────────────────────────────────

describe('DEFAULT_WINDOWS', () => {
  it('has an entry for every APP_ID', () => {
    for (const id of APP_IDS) {
      expect(DEFAULT_WINDOWS[id]).toBeDefined();
    }
  });

  it('every entry has positive width and height', () => {
    for (const id of APP_IDS) {
      const def = DEFAULT_WINDOWS[id];
      expect(def.width, `${id} width`).toBeGreaterThan(0);
      expect(def.height, `${id} height`).toBeGreaterThan(0);
    }
  });
});

// ── COMPANY_DETAIL_DEFAULTS ─────────────────────────────────────────────────

describe('COMPANY_DETAIL_DEFAULTS', () => {
  it('has positive width and height', () => {
    expect(COMPANY_DETAIL_DEFAULTS.width).toBeGreaterThan(0);
    expect(COMPANY_DETAIL_DEFAULTS.height).toBeGreaterThan(0);
  });

  it('does not have x or y (centering is dynamic)', () => {
    expect(COMPANY_DETAIL_DEFAULTS).not.toHaveProperty('x');
    expect(COMPANY_DETAIL_DEFAULTS).not.toHaveProperty('y');
  });
});
