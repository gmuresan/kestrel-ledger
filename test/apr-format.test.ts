/**
 * Unit tests locking the apr-miss callout formatting helpers (Story 86.1, AC2).
 *
 * capAprPrecision is the AC2 rounding rule (numeric → 2dp, non-numeric passthrough,
 * positive AND negative signs capped). shouldSuppressAprMiss is the suppression decision
 * the entry page applies: drop the callout unless both projected and realized are real
 * numeric APRs, so a partially-captured signal never renders a half-broken title (G1).
 */
import { describe, it, expect } from 'vitest';
import { capAprPrecision, shouldSuppressAprMiss } from '../src/lib/apr-format';

describe('capAprPrecision — AC2 rounding (COVERAGE-1)', () => {
  it('rounds a >2-decimal APR to exactly 2 decimals', () => {
    expect(capAprPrecision('3.23672%')).toBe('3.24%');
  });

  it('leaves an already-2-decimal APR unchanged', () => {
    expect(capAprPrecision('4.00%')).toBe('4.00%');
  });

  it('pads a whole-number APR to 2 decimals', () => {
    expect(capAprPrecision('5%')).toBe('5.00%');
  });

  it('passes a non-numeric em-dash token through unchanged (G1)', () => {
    expect(capAprPrecision('—')).toBe('—');
  });

  it('passes the (not captured) sentinel through unchanged (G1)', () => {
    expect(capAprPrecision('(not captured)')).toBe('(not captured)');
  });

  it('caps a negative delta to 2 decimals', () => {
    expect(capAprPrecision('-0.87654%')).toBe('-0.88%');
  });

  // PATTERN-1: a leading '+' must be tolerated so positive deltas cap consistently.
  it('caps a positive (+) delta to 2 decimals (PATTERN-1)', () => {
    expect(capAprPrecision('+1.5%')).toBe('+1.50%');
  });

  it('caps a positive (+) >2-decimal delta to 2 decimals (PATTERN-1)', () => {
    expect(capAprPrecision('+0.90634%')).toBe('+0.91%');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(capAprPrecision('  3.14159%  ')).toBe('3.14%');
  });
});

describe('shouldSuppressAprMiss — AC2 suppression (COVERAGE-2 / DEBT-1 / PATTERN-2)', () => {
  it('does NOT suppress when both projected and realized are numeric', () => {
    expect(shouldSuppressAprMiss({ projected: '3.10%', realized: '2.95%' })).toBe(false);
  });

  it('suppresses when projected is (not captured)', () => {
    expect(shouldSuppressAprMiss({ projected: '(not captured)', realized: '3.10%' })).toBe(true);
  });

  // DEBT-1 / PATTERN-2: a realized-only-uncaptured signal must also suppress so the
  // callout never renders "realized (not captured)".
  it('suppresses when realized is (not captured), even if projected is numeric', () => {
    expect(shouldSuppressAprMiss({ projected: '3.10%', realized: '(not captured)' })).toBe(true);
  });

  it('suppresses when realized is the em-dash placeholder', () => {
    expect(shouldSuppressAprMiss({ projected: '3.10%', realized: '—' })).toBe(true);
  });

  it('suppresses when both sides are non-numeric', () => {
    expect(shouldSuppressAprMiss({ projected: '(not captured)', realized: '—' })).toBe(true);
  });
});
