import { describe, it, expect } from 'vitest';
import { DEMO_AGENTS, getDemoAgents } from './agents';

describe('demo agents', () => {
  it('exposes a curated roster', () => {
    expect(DEMO_AGENTS.length).toBeGreaterThanOrEqual(10);
    for (const a of DEMO_AGENTS) {
      expect(a.key).toMatch(/^[a-z_]+$/);
      expect(a.display_name.length).toBeGreaterThan(0);
      expect(typeof a.order).toBe('number');
    }
  });

  it('getDemoAgents returns them sorted by order', () => {
    const { agents } = getDemoAgents();
    const orders = agents.map(a => a.order);
    expect(orders).toEqual([...orders].sort((x, y) => x - y));
  });
});
