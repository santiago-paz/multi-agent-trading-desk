import { describe, it, expect, afterEach } from 'vitest';
import { getCompanyProfile } from './market-data';

describe('FMP demo guard', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_DEMO_MODE; });

  it('throws before any network call when demo mode is on', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    await expect(getCompanyProfile('AAPL')).rejects.toThrow(/demo mode/i);
  });
});
