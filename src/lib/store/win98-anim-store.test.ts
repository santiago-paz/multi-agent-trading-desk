// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWin98AnimStore, type Rect } from './win98-anim-store';

const FROM: Rect = { x: 100, y: 200, width: 400, height: 300 };
const TO: Rect = { x: 10, y: 980, width: 120, height: 24 };

beforeEach(() => {
  vi.useFakeTimers();
  useWin98AnimStore.setState({ items: [] });
});

afterEach(() => {
  vi.useRealTimers();
  useWin98AnimStore.setState({ items: [] });
});

describe('useWin98AnimStore.play', () => {
  it('appends an animation item with from/to and a duration', () => {
    useWin98AnimStore.getState().play(FROM, TO);
    const items = useWin98AnimStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].from).toEqual(FROM);
    expect(items[0].to).toEqual(TO);
    expect(items[0].duration).toBeGreaterThan(0);
    expect(typeof items[0].startedAt).toBe('number');
  });

  it('uses the provided duration when supplied', () => {
    useWin98AnimStore.getState().play(FROM, TO, { duration: 500 });
    expect(useWin98AnimStore.getState().items[0].duration).toBe(500);
  });

  it('returns a unique numeric id per call', () => {
    const a = useWin98AnimStore.getState().play(FROM, TO);
    const b = useWin98AnimStore.getState().play(FROM, TO);
    const c = useWin98AnimStore.getState().play(FROM, TO);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(useWin98AnimStore.getState().items.map((i) => i.id)).toEqual([a, b, c]);
  });

  it('removes the item from the store after its duration elapses', () => {
    useWin98AnimStore.getState().play(FROM, TO, { duration: 200 });
    expect(useWin98AnimStore.getState().items).toHaveLength(1);
    vi.advanceTimersByTime(199);
    expect(useWin98AnimStore.getState().items).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(useWin98AnimStore.getState().items).toHaveLength(0);
  });

  it('invokes onComplete exactly once after the duration elapses', () => {
    const onComplete = vi.fn();
    useWin98AnimStore.getState().play(FROM, TO, { duration: 100, onComplete });
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps multiple concurrent animations independent', () => {
    useWin98AnimStore.getState().play(FROM, TO, { duration: 100 });
    useWin98AnimStore.getState().play(FROM, TO, { duration: 300 });
    expect(useWin98AnimStore.getState().items).toHaveLength(2);
    vi.advanceTimersByTime(150);
    expect(useWin98AnimStore.getState().items).toHaveLength(1);
    expect(useWin98AnimStore.getState().items[0].duration).toBe(300);
    vi.advanceTimersByTime(200);
    expect(useWin98AnimStore.getState().items).toHaveLength(0);
  });

  it('only removes the matching animation when others are still active', () => {
    const firstId = useWin98AnimStore.getState().play(FROM, TO, { duration: 100 });
    const secondId = useWin98AnimStore.getState().play(FROM, TO, { duration: 500 });
    vi.advanceTimersByTime(100);
    const remainingIds = useWin98AnimStore.getState().items.map((i) => i.id);
    expect(remainingIds).toEqual([secondId]);
    expect(remainingIds).not.toContain(firstId);
  });
});
