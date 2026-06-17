/**
 * Banned-phrase gate for the marketing landing static copy (Story 72.2, AC4 / G2).
 *
 * The homepage is a pitch, but it may not overclaim. This module owns the canonical
 * banned-term denylist from `EXPERIENCE.md §Voice and Tone` + the Epic 72 locked
 * "Honesty/copy fixes" decision, and a deterministic scanner that reports any hit in a
 * supplied source string. The Astro homepage source (`index.astro` + the static landing
 * components) is scanned by the test suite (AC5.4) so the constraint is CI-enforced, not
 * review-only.
 *
 * The scan is over the COMPONENT SOURCE (`.astro` template text), not rendered HTML — so it
 * catches a prohibited phrase in the markup itself, not only in a JS string (AC4 / Task 4.3).
 *
 * Architecture notes (mirror scripts/export-public-ledger.ts):
 * - AR4: lives in scripts/ — no `@/` aliases, no cross-package imports.
 * - NFR36: process.stderr.write / process.stdout.write instead of console.* (used by the CLI).
 * - G4: reads only the committed site source from disk; touches no overseer route.
 *
 * Usage (optional CLI — the test imports the functions directly):
 *   tsx scripts/lint-homepage-copy.ts <file...>
 *
 * Exit codes:
 *   0  no banned phrase found in any file
 *   1  a banned phrase was found (the report is printed to stderr)
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';

/**
 * The canonical banned-term denylist (Story 72.2, AC4). Versioned and exported so the test
 * suite imports the SAME list the gate enforces — there is exactly one honesty bar (G8).
 *
 * Sourced verbatim from `EXPERIENCE.md §Voice and Tone` and the Epic 72 locked decision
 * §"Honesty/copy fixes". "risky moves" stands in for the banned editorial adjective "risky"
 * applied to "moves" (the metric-strip label must be "moves blocked", never "risky moves").
 */
export const BANNED_TERMS: readonly string[] = [
  'trustless',
  'non-custodial',
  'guaranteed',
  'risk-free',
  'safe',
  'secure',
  'audited',
  'insured',
  'protected',
  "can't be drained",
  'undrainable',
  'never loses',
  'battle-tested',
  'bulletproof',
  'bank-grade',
  'institutional-grade',
  'risky moves',
];

/** A single banned-phrase hit: which term, and the 1-based line it appeared on. */
export interface BannedPhraseHit {
  term: string;
  line: number;
}

/**
 * Scan a source string for any banned term (case-insensitive). Returns every hit with its line
 * number. Pure — deterministic for a given input. Exported for test use.
 *
 * Single-word terms are matched as WHOLE WORDS (a word boundary on both sides), so the banned
 * adjective "safe" trips on "safe" but NOT on the spec-mandated noun "safety" ("supervised
 * safety layer" is the named mechanism, not an overclaim). Likewise "secure" does not fire on
 * "security". Multi-word / hyphenated terms ("can't be drained", "risky moves", "non-custodial")
 * are matched as a raw substring. Hyphenated single tokens ("risk-free") use the substring path
 * because `\b` does not behave as a word boundary around hyphens.
 */
export function scanForBannedPhrases(source: string): BannedPhraseHit[] {
  const hits: BannedPhraseHit[] = [];
  const lines = source.split('\n');
  for (const term of BANNED_TERMS) {
    // A plain word = letters only, no spaces, no apostrophes, no hyphens → whole-word regex.
    const isPlainWord = /^[a-z]+$/i.test(term);
    const re = isPlainWord ? new RegExp(`\\b${term}\\b`, 'i') : null;
    const needle = term.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const found = re !== null ? re.test(line) : line.toLowerCase().includes(needle);
      if (found) hits.push({ term, line: i + 1 });
    }
  }
  return hits;
}

/**
 * Lint the raw source of one or more files for banned phrases. Returns `{ ok, hits }` where
 * `hits` carries the file path alongside each term/line. Pure relative to the supplied
 * contents map. Exported for test use (tests pass synthetic contents directly).
 */
export function lintHomepageCopy(
  files: Array<{ path: string; source: string }>,
): { ok: boolean; hits: Array<BannedPhraseHit & { path: string }> } {
  const hits: Array<BannedPhraseHit & { path: string }> = [];
  for (const { path, source } of files) {
    for (const hit of scanForBannedPhrases(source)) {
      hits.push({ ...hit, path });
    }
  }
  return { ok: hits.length === 0, hits };
}

// ---------------------------------------------------------------------------
// CLI — scan files passed as positional args (used by CI / the publish flow)
// ---------------------------------------------------------------------------

function main(): void {
  const { positionals } = parseArgs({ allowPositionals: true, strict: false });
  if (positionals.length === 0) {
    process.stderr.write('usage: tsx scripts/lint-homepage-copy.ts <file...>\n');
    process.exit(1);
  }
  const files = positionals.map((p) => ({ path: p, source: readFileSync(p, 'utf-8') }));
  const result = lintHomepageCopy(files);
  if (!result.ok) {
    process.stderr.write('Banned-phrase gate FAILED — landing copy must not overclaim:\n');
    for (const h of result.hits) {
      process.stderr.write(`  - ${h.path}:${h.line} banned term "${h.term}"\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Banned-phrase gate passed (${files.length} file(s) clean)\n`);
}

// Only run main when executed directly (not when imported by the test file).
if (process.argv[1] && process.argv[1].endsWith('lint-homepage-copy.ts')) {
  main();
}
