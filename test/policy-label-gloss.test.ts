/**
 * Unit tests locking the denial policy-label gloss map (Story 86.1, AC3/AC4).
 *
 * The gloss renames a machine `policyLabel` token to plain English for the denial
 * callout title on the entry page. These tests pin three contracts:
 *   1. every known label returns a non-empty, number-free string (G1);
 *   2. an unknown label falls back to a safe default — never `undefined`/empty;
 *   3. every `policyLabel` that can ship today (the production content entry and
 *      the parser-test fixtures) is covered by the map, so no live entry renders
 *      the bare fallback by accident.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import {
  glossPolicyLabel,
  POLICY_LABEL_GLOSS,
  POLICY_LABEL_GLOSS_FALLBACK,
} from '../src/lib/policy-label-gloss';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe('glossPolicyLabel — known labels (AC3/AC4)', () => {
  const knownLabels = Object.keys(POLICY_LABEL_GLOSS);

  it('maps at least the documented policy labels', () => {
    // Sanity: the map is non-trivial and includes the production tokens.
    expect(knownLabels.length).toBeGreaterThanOrEqual(10);
    expect(knownLabels).toContain('unsupported');
    expect(knownLabels).toContain('approval-timeout');
  });

  it('every known label returns a non-empty string', () => {
    for (const label of knownLabels) {
      const gloss = glossPolicyLabel(label);
      expect(gloss, label).toBeTypeOf('string');
      expect(gloss.length, label).toBeGreaterThan(0);
    }
  });

  it('no gloss carries a derived number — no digits, no %, no ms (G1)', () => {
    for (const label of knownLabels) {
      const gloss = glossPolicyLabel(label);
      // Zero numeric digits and zero percent signs in any gloss string.
      expect(gloss, label).not.toMatch(/\d/);
      expect(gloss, label).not.toContain('%');
      expect(gloss, label).not.toMatch(/\bms\b/);
    }
  });

  it('the fallback string itself carries no derived number (G1)', () => {
    expect(POLICY_LABEL_GLOSS_FALLBACK.length).toBeGreaterThan(0);
    expect(POLICY_LABEL_GLOSS_FALLBACK).not.toMatch(/\d/);
    expect(POLICY_LABEL_GLOSS_FALLBACK).not.toContain('%');
  });
});

describe('glossPolicyLabel — unknown labels fall back safely (AC4)', () => {
  it('returns the safe fallback for an arbitrary unknown label', () => {
    expect(glossPolicyLabel('totally-made-up-label')).toBe(POLICY_LABEL_GLOSS_FALLBACK);
  });

  it('returns the fallback (not undefined / not empty) for the empty string', () => {
    const gloss = glossPolicyLabel('');
    expect(gloss).toBe(POLICY_LABEL_GLOSS_FALLBACK);
    expect(gloss).not.toBe('');
  });

  it('never returns undefined', () => {
    for (const label of ['', 'x', 'unsupported', 'approval-timeout', 'no-such-label']) {
      expect(glossPolicyLabel(label)).not.toBeUndefined();
    }
  });
});

describe('gloss map covers every shippable policyLabel (AC4)', () => {
  // The parser extracts policyLabel as the backtick value in:
  //   - **Denied** (`<policyLabel>`): <intentSummary>
  const DENIAL_RE = /^- \*\*Denied\*\* \(`([^`]+)`\):/gm;

  function policyLabelsIn(source: string): string[] {
    return [...source.matchAll(DENIAL_RE)].map((m) => m[1]);
  }

  it('covers every policyLabel in the production content entry', () => {
    const entryPath = join(root, 'src', 'content', 'ledger', '2026-06-12-yield-hunter-01.md');
    const labels = policyLabelsIn(readFileSync(entryPath, 'utf-8'));
    // The entry actually contains denials.
    expect(labels.length).toBeGreaterThan(0);
    for (const label of new Set(labels)) {
      expect(POLICY_LABEL_GLOSS[label], `unglossed production label: ${label}`).toBeTypeOf(
        'string',
      );
    }
  });

  it('covers the policyLabels exercised by the parser-test fixtures', () => {
    // These appear in test/parse-entry-signals.test.ts denial fixtures + the
    // homepage fixture; a live entry built from the same generator could carry them.
    const fixtureLabels = ['per-tx value cap', 'value-cap', 'vault-cap'];
    for (const label of fixtureLabels) {
      expect(POLICY_LABEL_GLOSS[label], `unglossed fixture label: ${label}`).toBeTypeOf('string');
    }
  });
});
