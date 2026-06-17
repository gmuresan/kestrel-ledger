/**
 * Unit tests for the deterministic fact-panel signal parser (Story 72.5, AC1/AC4).
 *
 * These tests pin the text contract between renderFactPanel (the 71 generator) and
 * the 72.5 callout parser: a denial, a critic flag, an oscillation catch, and an
 * APY miss each map to one typed signal; a quiet entry and an empty string map to
 * [] (no callout block — honest empties). Receipts parse from the "The move"
 * section only.
 */
import { describe, it, expect } from 'vitest';
import { parseEntrySignals, parseReceiptRows } from '../src/lib/parse-entry-signals';

function factPanel(interceptions: string): string {
  return ['### Decisions & interceptions', '', interceptions, '', '### The move', ''].join('\n');
}

describe('parseEntrySignals — interception signals (AC1/AC4)', () => {
  it('1. parses a denial with its policy label and intent summary', () => {
    const fact = factPanel('- **Denied** (`per-tx value cap`): deposit 250 USDC into Aave USDC');
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      {
        kind: 'denial',
        policyLabel: 'per-tx value cap',
        intentSummary: 'deposit 250 USDC into Aave USDC',
      },
    ]);
  });

  it('2. parses an oscillation catch', () => {
    const fact = factPanel(
      '- **Oscillation caught**: a repeated back-and-forth was detected and suppressed.',
    );
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([{ kind: 'oscillation' }]);
  });

  it('3. parses a denial + oscillation in order', () => {
    const fact = factPanel(
      [
        '- **Denied** (`per-tx value cap`): deposit 250 USDC into Aave USDC',
        '- **Oscillation caught**: a repeated back-and-forth was detected and suppressed.',
      ].join('\n'),
    );
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      {
        kind: 'denial',
        policyLabel: 'per-tx value cap',
        intentSummary: 'deposit 250 USDC into Aave USDC',
      },
      { kind: 'oscillation' },
    ]);
  });

  it('4. parses a critic flag with severity and detail', () => {
    const fact = factPanel('- **Critic flag** (warn): venue TVL fell below the floor');
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      { kind: 'critic', severity: 'warn', detail: 'venue TVL fell below the floor' },
    ]);
  });

  it('5. parses a projected-vs-realized APY miss', () => {
    const fact = factPanel(
      '- **Projected vs realized APY**: projected 4.00% → realized 3.10% (delta -0.90%)',
    );
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      { kind: 'apr-miss', projected: '4.00%', realized: '3.10%', delta: '-0.90%' },
    ]);
  });

  it('5b. parses an APY miss with a null projected APR — the `(not captured)` case', () => {
    // aprStr renders null as the literal `(not captured)` and a null delta as `—`.
    // Verbatim renderFactPanel output for projectedApr=null, realizedApr=3.1, aprDelta=null.
    const fact = factPanel(
      '- **Projected vs realized APY**: projected (not captured) → realized 3.1% (delta —)',
    );
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      { kind: 'apr-miss', projected: '(not captured)', realized: '3.1%', delta: '—' },
    ]);
  });

  it('5c. APY miss with the real two-line renderFactPanel output (COVERAGE-2: caveat line)', () => {
    // renderFactPanel emits a second indented caveat line immediately after every APR-miss row:
    //   `  _Note: realizedApr is the protocol's spot rate post-execution, not earned interest._`
    // The parser must extract exactly one apr-miss signal and not choke on the caveat line.
    const REALIZED_APR_CAVEAT =
      "  _Note: realizedApr is the protocol's spot rate post-execution, not earned interest._";
    const fact = factPanel(
      [
        '- **Projected vs realized APY**: projected 4.00% → realized 3.10% (delta -0.90%)',
        REALIZED_APR_CAVEAT,
      ].join('\n'),
    );
    const signals = parseEntrySignals(fact);
    expect(signals).toEqual([
      { kind: 'apr-miss', projected: '4.00%', realized: '3.10%', delta: '-0.90%' },
    ]);
  });

  it('6. returns [] for a quiet entry (the "No denials…" line)', () => {
    const fact = factPanel(
      '- No denials, critic flags, or oscillation catches for this entry.',
    );
    expect(parseEntrySignals(fact)).toEqual([]);
  });

  it('7. returns [] for an empty string', () => {
    expect(parseEntrySignals('')).toEqual([]);
  });

  it('also parses a critic summary', () => {
    const fact = factPanel('- **Critic summary**: the rotation spread was thin but acceptable');
    expect(parseEntrySignals(fact)).toEqual([
      { kind: 'critic-summary', text: 'the rotation spread was thin but acceptable' },
    ]);
  });

  it('stops at the next "###" heading — does not bleed into "The move"', () => {
    const fact = [
      '### Decisions & interceptions',
      '',
      '- **Oscillation caught**: a repeated back-and-forth was detected and suppressed.',
      '',
      '### The move',
      '',
      '- **Denied** (`should-not-parse`): this line is in the wrong section',
    ].join('\n');
    expect(parseEntrySignals(fact)).toEqual([{ kind: 'oscillation' }]);
  });

  it('parses multiple denials and multiple critic flags in generator order (COVERAGE-3)', () => {
    // renderFactPanel loops over entry.denials then entry.critiqueFlags then the
    // critic summary — every row must parse, in that order.
    const fact = factPanel(
      [
        '- **Denied** (`value-cap`): deposit 250 USDC into Aave',
        '- **Denied** (`vault-cap`): deposit 400 USDC into gtUSDCp',
        '- **Critic flag** (warn): venue TVL fell below the floor',
        '- **Critic flag** (error): destination contract is not whitelisted',
        '- **Critic summary**: the rotation spread was thin but acceptable',
      ].join('\n'),
    );
    expect(parseEntrySignals(fact)).toEqual([
      { kind: 'denial', policyLabel: 'value-cap', intentSummary: 'deposit 250 USDC into Aave' },
      { kind: 'denial', policyLabel: 'vault-cap', intentSummary: 'deposit 400 USDC into gtUSDCp' },
      { kind: 'critic', severity: 'warn', detail: 'venue TVL fell below the floor' },
      { kind: 'critic', severity: 'error', detail: 'destination contract is not whitelisted' },
      { kind: 'critic-summary', text: 'the rotation spread was thin but acceptable' },
    ]);
  });
});

describe('parseReceiptRows — "The move" receipts (AC2/AC4)', () => {
  it('parses a receipt line in the REAL renderFactPanel format', () => {
    // Line copied verbatim from renderFactPanel's per-leg push + txLink helper
    // (export-public-ledger.ts): `- <op> <amount> <symbol> on <protocol> — [<linkText>](<url>)`.
    const fact = [
      '### The move',
      '',
      'Decision: operator approved',
      '',
      '- withdraw 78.723843 USDC on Aave — [view on basescan](https://basescan.org/tx/0x22f87653a1b2c3d4e5f60718293a4b5c6d7e8f90)',
    ].join('\n');
    expect(parseReceiptRows(fact)).toEqual([
      {
        verb: 'withdraw',
        amount: '78.723843 USDC',
        hash: '0x22f87653a1b2c3d4e5f60718293a4b5c6d7e8f90',
        explorerName: 'view on basescan',
        explorerUrl: 'https://basescan.org/tx/0x22f87653a1b2c3d4e5f60718293a4b5c6d7e8f90',
      },
    ]);
  });

  it('parses multiple receipt legs (withdraw + deposit) in order', () => {
    const fact = [
      '### The move',
      '',
      'Decision: operator approved',
      '',
      '- withdraw 78.723843 USDC on Aave — [view on basescan](https://basescan.org/tx/0xaaa1)',
      '- deposit 78.723843 USDC on gtUSDCp — [view on basescan](https://basescan.org/tx/0xbbb2)',
    ].join('\n');
    expect(parseReceiptRows(fact)).toEqual([
      {
        verb: 'withdraw',
        amount: '78.723843 USDC',
        hash: '0xaaa1',
        explorerName: 'view on basescan',
        explorerUrl: 'https://basescan.org/tx/0xaaa1',
      },
      {
        verb: 'deposit',
        amount: '78.723843 USDC',
        hash: '0xbbb2',
        explorerName: 'view on basescan',
        explorerUrl: 'https://basescan.org/tx/0xbbb2',
      },
    ]);
  });

  it('ignores a leg with no tx link (txHash null → no link part)', () => {
    // renderFactPanel omits the ` — [..](..)` link part entirely when txHash is null,
    // so the line has no URL and is not a parseable receipt row.
    const fact = ['### The move', '', '- deposit 100 USDC on Aave'].join('\n');
    expect(parseReceiptRows(fact)).toEqual([]);
  });

  it('returns [] when there are no receipt-formatted lines', () => {
    const fact = ['### The move', '', 'No transaction executed this cycle.'].join('\n');
    expect(parseReceiptRows(fact)).toEqual([]);
  });

  it('returns [] when there is no "The move" section', () => {
    expect(parseReceiptRows('')).toEqual([]);
  });
});
