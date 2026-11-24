import { describe, expect, it } from 'vitest';
import { offsetFromSpineEm, spineOffsetEm } from '../src/spine.js';

describe('spineOffsetEm', () => {
  it('is zero when the spine sits in the middle of the content area', () => {
    expect(
      spineOffsetEm({ fontAscent: 80, fontDescent: 20, spineAscent: 35, spineDescent: -25 }, 100),
    ).toBeCloseTo(0);
  });

  it('is negative (leftward in vertical-lr) when the spine is below the line middle', () => {
    // Content area 1.457 + 0.293 em; a spine band 0.1–0.4 em above the baseline.
    const m = { fontAscent: 145.7, fontDescent: 29.3, spineAscent: 40, spineDescent: -10 };
    expect(spineOffsetEm(m, 100)).toBeCloseTo(-0.332, 3);
  });
});

describe('offsetFromSpineEm', () => {
  it('is zero when the metrics are set around the spine', () => {
    // hhea 1279 / 471 per 1000, spine 0.404em above the baseline.
    expect(offsetFromSpineEm(0.404, 127.9, 47.1, 100)).toBeCloseTo(0, 3);
  });

  it('is -0.178em for the same spine with hhea 1457 / 293', () => {
    expect(offsetFromSpineEm(0.404, 145.7, 29.3, 100)).toBeCloseTo(-0.178, 3);
  });
});
