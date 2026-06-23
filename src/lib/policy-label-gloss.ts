/**
 * Plain-English glosses for the machine `policyLabel` tokens carried by denial
 * signals (Story 86.1, AC3/AC4).
 *
 * The `[slug].astro` entry page renders a denial callout — the strongest visual
 * on the page — whose `title` must read as honest English to a skeptical
 * crypto-native, not as a raw machine token (`unsupported`, `approval-timeout`,
 * `value-cap`). The eyebrow still shows the machine token in CAPS for
 * traceability, and the raw token stays verbatim in the fact panel beneath the
 * fold (G1) — this gloss only renames the headline.
 *
 * G1 (no derived numbers): every gloss string is a fixed, deterministic
 * description with zero numbers — no ms durations, no percentages, no counts.
 * The machine line keeps any numeric detail (e.g. `approval_timeout after
 * 300000ms`) in the fact panel, never here.
 *
 * The map keys are the `policyLabel` values the parser extracts (the backtick
 * value in `- **Denied** (`<policyLabel>`): <intentSummary>`). Both the
 * production content tokens (`unsupported`, `approval-timeout`) and the
 * test-fixture tokens (`value-cap`, `vault-cap`, `per-tx value cap`, …) are
 * covered so every entry that can ship renders a plain-English title.
 *
 * Pure module: no Astro imports, no DB, no fetch — importable directly by the
 * test and resolved at build time (G7).
 */

/** policyLabel → deterministic plain-English gloss. Zero numbers (G1). */
export const POLICY_LABEL_GLOSS: Readonly<Record<string, string>> = {
  // Production content tokens (src/content/ledger/2026-06-12-yield-hunter-01.md).
  unsupported: 'The agent tried to take an action the rail does not support',
  'approval-timeout': 'A proposal expired unapproved rather than firing late',
  // Tokens seen across fixtures + the epic spec's policy taxonomy.
  whitelist_add: 'The agent tried to grant itself a permission it does not have',
  approval_timeout: 'A proposal expired unapproved rather than firing late',
  'value-cap': 'A proposed trade exceeded the per-transaction value limit',
  'per-tx value cap': 'A proposed trade exceeded the per-transaction value limit',
  'vault-cap': 'A proposed trade would exceed the per-vault concentration limit',
  'token-not-whitelisted': 'The destination token was not on the approved list',
  'trade-velocity': 'The agent exceeded the maximum permitted trading rate',
  'volatile-exposure-cap': 'A trade would have pushed volatile-asset exposure over the cap',
  'anti-churn': 'A reverse trade was blocked to prevent rapid back-and-forth',
  'value-cap-token-unknown': 'The trade could not be priced, so the cap defaulted to block it',
};

/** The safe fallback for any unknown label — never `undefined` (G1). */
export const POLICY_LABEL_GLOSS_FALLBACK = 'A policy condition blocked this proposal';

/**
 * Map a machine `policyLabel` to its plain-English gloss. Unknown labels return
 * the safe fallback string — never `undefined`, never an empty string.
 */
export function glossPolicyLabel(label: string): string {
  return POLICY_LABEL_GLOSS[label] ?? POLICY_LABEL_GLOSS_FALLBACK;
}
