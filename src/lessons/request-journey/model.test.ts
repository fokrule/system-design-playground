import { describe, expect, it } from 'vitest';
import { buildTimeline, FIRST_VISIT, REPEAT_VISIT, rttForDistance } from './model';

describe('rttForDistance', () => {
  it('gives ~150ms across ~10,000 km', () => {
    expect(rttForDistance(10_000)).toBe(150);
  });
  it('never goes below 2ms', () => {
    expect(rttForDistance(0)).toBe(2);
  });
});

describe('buildTimeline', () => {
  it('far user, fast server: ~500ms before HTML arrives, mostly network', () => {
    const t = buildTimeline({ distanceKm: 10_000, serverMs: 5, ...FIRST_VISIT });
    // DNS 40 + TCP 150 + TLS 150 + HTTP (150 + 5)
    expect(t.htmlArrivesMs).toBe(495);
    expect(t.serverMs).toBe(5);
    expect(t.networkMs / t.totalMs).toBeGreaterThan(0.95);
    expect(t.roundTrips).toBe(4);
  });

  it('nearby user, slow server: server time dominates', () => {
    const t = buildTimeline({ distanceKm: 20, serverMs: 200, ...FIRST_VISIT });
    expect(t.serverMs / t.totalMs).toBeGreaterThan(0.6);
  });

  it('repeat visit skips DNS, handshakes and assets', () => {
    const t = buildTimeline({ distanceKm: 10_000, serverMs: 5, ...REPEAT_VISIT });
    const skipped = t.phases.filter((p) => p.skipped).map((p) => p.id);
    expect(skipped).toEqual(['dns', 'tcp', 'tls', 'assets']);
    expect(t.totalMs).toBe(155);
    expect(t.roundTrips).toBe(1);
  });

  it('legs are contiguous and sum to the total', () => {
    const t = buildTimeline({ distanceKm: 5000, serverMs: 30, ...FIRST_VISIT });
    let cursor = 0;
    for (const leg of t.legs) {
      expect(leg.start).toBeCloseTo(cursor);
      cursor += leg.ms;
    }
    expect(cursor).toBeCloseTo(t.totalMs);
  });
});
