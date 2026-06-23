/**
 * Unit tests locking the per-agent position-display dust rule (Story 86.1, AC1).
 *
 * positionDisplayUsd returns `null` for a data gap (null, non-finite, or sub-cent dust)
 * so the row renders the honest "unpriced — dust" caption instead of a fabricated $0.00
 * holding (G1), and a real value formats as USD.
 */
import { describe, it, expect } from 'vitest';
import { positionDisplayUsd, DUST_THRESHOLD_USD } from '../src/lib/position-display';

describe('positionDisplayUsd — AC1 dust threshold (COVERAGE-3)', () => {
  it('returns null for a null value (no fabricated dollar figure)', () => {
    expect(positionDisplayUsd(null)).toBeNull();
  });

  it('returns null for a sub-cent value (dust)', () => {
    expect(positionDisplayUsd('0.004')).toBeNull();
  });

  it('returns null for a non-finite value (NaN)', () => {
    expect(positionDisplayUsd('NaN')).toBeNull();
  });

  it('returns null for unparseable junk', () => {
    expect(positionDisplayUsd('not-a-number')).toBeNull();
  });

  it('formats a real value as USD', () => {
    expect(positionDisplayUsd('999.99')).toBe('$999.99');
  });

  it('formats a value exactly at the dust threshold (boundary)', () => {
    expect(positionDisplayUsd(String(DUST_THRESHOLD_USD))).toBe('$0.01');
  });

  it('treats a value just below the threshold as dust', () => {
    expect(positionDisplayUsd('0.009')).toBeNull();
  });
});
