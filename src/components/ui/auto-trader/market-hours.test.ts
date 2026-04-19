import { describe, it, expect } from 'vitest';
import { isMarketOpen, AI_MODELS, DEFAULT_MODEL } from './market-hours';

// Helper: create a Date at a specific ART time.
// ART = UTC-3, so we add 3 hours to get UTC.
function artDate(year: number, month: number, day: number, hour: number, minute: number = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

// ── isMarketOpen ────────────────────────────────────────────────────────────

describe('isMarketOpen', () => {
  describe('weekdays during market hours', () => {
    it('returns open at 11:00 ART (market open)', () => {
      // Monday 2026-04-20 at 11:00 ART
      const result = isMarketOpen(artDate(2026, 4, 20, 11, 0));
      expect(result.open).toBe(true);
    });

    it('returns open at 14:30 ART (mid-session)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 14, 30));
      expect(result.open).toBe(true);
    });

    it('returns open at 16:59 ART (just before close)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 16, 59));
      expect(result.open).toBe(true);
    });
  });

  describe('weekdays outside market hours', () => {
    it('returns closed before open (10:59 ART)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 10, 59));
      expect(result.open).toBe(false);
      expect(result.reasonKey).toBe('market.opensAt');
      expect(result.reasonParams).toEqual({ hour: '11:00' });
    });

    it('returns closed at market close (17:00 ART)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 17, 0));
      expect(result.open).toBe(false);
      expect(result.reasonKey).toBe('market.closedAt');
      expect(result.reasonParams).toEqual({ hour: '17:00' });
    });

    it('returns closed late at night (23:00 ART)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 23, 0));
      expect(result.open).toBe(false);
    });

    it('returns closed early morning (7:00 ART)', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 7, 0));
      expect(result.open).toBe(false);
      expect(result.reasonKey).toBe('market.opensAt');
    });
  });

  describe('weekends', () => {
    it('returns closed on Saturday', () => {
      // Saturday 2026-04-25 at 13:00 ART
      const result = isMarketOpen(artDate(2026, 4, 25, 13, 0));
      expect(result.open).toBe(false);
      expect(result.reasonKey).toBe('market.weekend');
    });

    it('returns closed on Sunday', () => {
      // Sunday 2026-04-26 at 13:00 ART
      const result = isMarketOpen(artDate(2026, 4, 26, 13, 0));
      expect(result.open).toBe(false);
      expect(result.reasonKey).toBe('market.weekend');
    });
  });

  describe('edge cases', () => {
    it('handles midnight ART correctly', () => {
      // Tuesday 2026-04-21 at 00:00 ART = Monday 2026-04-20 at 03:00 UTC
      const result = isMarketOpen(artDate(2026, 4, 21, 0, 0));
      expect(result.open).toBe(false);
    });

    it('returns open on Friday during market hours', () => {
      // Friday 2026-04-24 at 12:00 ART
      const result = isMarketOpen(artDate(2026, 4, 24, 12, 0));
      expect(result.open).toBe(true);
    });

    it('reasonParams includes current ART time when open', () => {
      const result = isMarketOpen(artDate(2026, 4, 20, 14, 30));
      expect(result.reasonKey).toBe('market.continuous');
      expect(result.reasonParams).toEqual({ time: '14:30' });
    });
  });
});

// ── AI_MODELS ───────────────────────────────────────────────────────────────

describe('AI_MODELS', () => {
  it('contains at least 3 models', () => {
    expect(AI_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  it('each model has id, label, and descriptionKey', () => {
    for (const model of AI_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.label).toBeTruthy();
      expect(model.descriptionKey).toBeTruthy();
    }
  });

  it('DEFAULT_MODEL is a valid model id', () => {
    const ids = AI_MODELS.map(m => m.id);
    expect(ids).toContain(DEFAULT_MODEL);
  });
});
