// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { Win98WindowAnimationOverlay } from './Win98WindowAnimationOverlay';
import { useWin98AnimStore, type Rect } from '@/lib/store/win98-anim-store';

const FROM: Rect = { x: 100, y: 100, width: 400, height: 200 };
const TO: Rect = { x: 0, y: 1000, width: 100, height: 24 };

beforeEach(() => {
  useWin98AnimStore.setState({ items: [] });
});

afterEach(() => {
  useWin98AnimStore.setState({ items: [] });
});

describe('Win98WindowAnimationOverlay', () => {
  it('renders nothing when there are no active animations', () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an SVG containing one rect per active animation after the first frame', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 5000 });
    });
    await waitFor(() => {
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(1);
    });
  });

  it('renders one rect per concurrent animation', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 5000 });
      useWin98AnimStore.getState().play(TO, FROM, { duration: 5000 });
    });
    await waitFor(() => {
      expect(container.querySelectorAll('rect').length).toBe(2);
    });
  });

  it('positions the wireframe at the start rect at the beginning of the animation', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 5000 });
    });
    let rect: SVGRectElement | null = null;
    await waitFor(() => {
      rect = container.querySelector('rect');
      expect(rect).not.toBeNull();
    });
    // At t≈0 the discrete step is 0 → rect should match `from` (with crisp-edge offsets).
    expect(Number(rect!.getAttribute('x'))).toBeCloseTo(FROM.x + 0.5, 1);
    expect(Number(rect!.getAttribute('y'))).toBeCloseTo(FROM.y + 0.5, 1);
    expect(Number(rect!.getAttribute('width'))).toBeCloseTo(FROM.width - 1, 1);
    expect(Number(rect!.getAttribute('height'))).toBeCloseTo(FROM.height - 1, 1);
  });

  it('uses mix-blend-mode: difference to emulate Win98 XOR drawing', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 5000 });
    });
    let svg: SVGSVGElement | null = null;
    await waitFor(() => {
      svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });
    expect(svg!.style.mixBlendMode).toBe('difference');
    expect(svg!.style.pointerEvents).toBe('none');
  });

  it('removes the SVG once all animations finish', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 30 });
    });
    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });
    await waitFor(
      () => {
        expect(container.querySelector('svg')).toBeNull();
      },
      { timeout: 1000 },
    );
  });

  it('paints the wireframe with a solid 1px white stroke (XOR via difference)', async () => {
    const { container } = render(<Win98WindowAnimationOverlay />);
    act(() => {
      useWin98AnimStore.getState().play(FROM, TO, { duration: 5000 });
    });
    let rect: SVGRectElement | null = null;
    await waitFor(() => {
      rect = container.querySelector('rect');
      expect(rect).not.toBeNull();
    });
    expect(rect!.getAttribute('fill')).toBe('none');
    expect(rect!.getAttribute('stroke')).toBe('#ffffff');
    expect(rect!.getAttribute('stroke-width')).toBe('1');
    expect(rect!.getAttribute('shape-rendering')).toBe('crispEdges');
  });
});
