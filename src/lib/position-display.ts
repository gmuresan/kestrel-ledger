/**
 * Pure position-display helpers for the per-agent page (Story 86.1, AC1).
 *
 * Extracted from `src/pages/agents/[agentSlug].astro` so the AC1 dust-threshold rule is
 * unit-testable directly. The page imports these; behavior is preserved exactly.
 *
 * G1 (no fabricated dollar value): a held leg with a null, non-finite, or sub-cent USD
 * value is dust, not a $0.00 holding. positionDisplayUsd returns `null` for those so the
 * row renders an honest "unpriced — dust" caption instead of a fake number.
 *
 * Pure module: no Astro imports, no DB, no fetch — importable by the test and resolved
 * at build time (G7).
 */

/** Format a raw decimal string as a USD display string ($1,234.50). */
export function formatUsd(raw: string | null): string {
  if (raw === null) return '$—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '$—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** A position below this USD value is dust, not a holding worth a dollar figure. */
export const DUST_THRESHOLD_USD = 0.01;

/**
 * The display USD for a held leg, or `null` when the value is a data gap (null,
 * non-finite, or sub-cent dust). A `null` return signals the row to render the honest
 * "unpriced — dust" caption rather than $0.00 / $— (AC1, G1).
 */
export function positionDisplayUsd(raw: string | null): string | null {
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < DUST_THRESHOLD_USD) return null;
  return formatUsd(raw);
}
