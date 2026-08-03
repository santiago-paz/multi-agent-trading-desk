import { describe, it, expect, afterEach } from 'vitest';
import { IOLClient } from './client';

describe('IOL demo guard', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_DEMO_MODE; });

  it('refuses to make authed calls in demo mode', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const client = new IOLClient();
    // getEstadoCuenta (or any authed method) must reject before touching the network.
    await expect(client.getEstadoCuenta()).rejects.toThrow(/demo mode/i);
  });
});
