/**
 * Pure APR-formatting helpers for the entry-page apr-miss callout (Story 86.1, AC2).
 *
 * Extracted from `src/pages/ledger/[slug].astro` so the AC2 rounding + suppression
 * rules are unit-testable directly (no .astro build fixture needed). The page imports
 * these; behavior is preserved exactly.
 *
 * G1 (no fabricated numbers): a non-numeric token (e.g. "—", "(not captured)") passes
 * through unchanged — capAprPrecision never invents a value. The apr-miss callout is
 * suppressed entirely unless BOTH projected and realized are real numeric APRs, so a
 * partially-captured signal never renders a half-broken "realized (not captured)" title.
 *
 * Pure module: no Astro imports, no DB, no fetch — importable by the test and resolved
 * at build time (G7).
 */

/** A parsed APR token is non-numeric when it is one of these sentinels. */
const NON_NUMERIC_SENTINELS = new Set(['(not captured)', '—']);

// A numeric APR string: optional leading sign (+ or -), digits, optional fraction,
// trailing `%`. The leading `[-+]?` makes positive deltas ("+1.50%") cap consistently
// with negative ones (PATTERN-1).
const NUMERIC_APR_RE = /^([-+]?\d+(?:\.\d+)?)%$/;

/**
 * Cap a parsed APR string ("3.23672%", "4.00%", "+1.50%", "—", "(not captured)") to at
 * most 2 decimal places (AC2) without inventing precision. Strips a trailing `%`, rounds
 * the numeric part to 2 decimals, and re-adds `%`. A leading `+` (positive delta) is
 * preserved so the delta still reads as signed (PATTERN-1); `Number().toFixed` would
 * otherwise drop it. A non-numeric token passes through unchanged — no fabricated number (G1).
 */
export function capAprPrecision(raw: string): string {
  const m = NUMERIC_APR_RE.exec(raw.trim());
  if (m === null) return raw;
  // Preserve an explicit leading '+' (Number().toFixed drops it); '-' survives via toFixed.
  const sign = m[1].startsWith('+') ? '+' : '';
  return `${sign}${Number(m[1]).toFixed(2)}%`;
}

/** True when a parsed APR token is a non-numeric placeholder rather than a real value. */
function isNonNumericApr(token: string): boolean {
  return NON_NUMERIC_SENTINELS.has(token.trim()) || NUMERIC_APR_RE.exec(token.trim()) === null;
}

/**
 * Decide whether an apr-miss callout should be suppressed (AC2). Suppress when either
 * the projected or realized APR is non-numeric (e.g. "(not captured)" / "—"): with no
 * real both-sides delta there is no honest above-fold story, so the callout is dropped
 * and the raw line stays in the fact panel beneath the fold (G1). The delta is derived
 * from the two and follows; requiring both projected and realized numeric is sufficient.
 */
export function shouldSuppressAprMiss(signal: { projected: string; realized: string }): boolean {
  return isNonNumericApr(signal.projected) || isNonNumericApr(signal.realized);
}
