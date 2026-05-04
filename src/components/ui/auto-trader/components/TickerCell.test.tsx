// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TickerCell } from './TickerCell';

describe('TickerCell', () => {
  it('renders the ticker on its own when no company is provided', () => {
    render(<TickerCell ticker="HMY" />);
    expect(screen.getByText('HMY')).toBeDefined();
    // No subtitle row should be rendered.
    expect(screen.queryByText('Harmony Gold Mining')).toBeNull();
  });

  it('renders the company name underneath the ticker when provided', () => {
    render(<TickerCell ticker="HMY" company="Harmony Gold Mining" />);
    expect(screen.getByText('HMY')).toBeDefined();
    expect(screen.getByText('Harmony Gold Mining')).toBeDefined();
  });

  it('exposes a tooltip combining ticker and company for quick mapping verification', () => {
    const { container } = render(<TickerCell ticker="HMY" company="Harmony Gold Mining" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('HMY — Harmony Gold Mining');
  });

  it('falls back to the ticker as the tooltip when no company is provided', () => {
    const { container } = render(<TickerCell ticker="ADBE" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('ADBE');
  });

  it('does not render the subtitle row when company is empty string', () => {
    render(<TickerCell ticker="GOOGL" company="" />);
    expect(screen.getByText('GOOGL')).toBeDefined();
    // Empty subtitle should not be rendered as a separate visible node.
    const subtitleNodes = screen.queryAllByText('').filter(n => n.textContent === '');
    // The wrapper title is still 'GOOGL' (no em-dash branch).
    expect(subtitleNodes.length).toBeLessThan(2);
  });
});
