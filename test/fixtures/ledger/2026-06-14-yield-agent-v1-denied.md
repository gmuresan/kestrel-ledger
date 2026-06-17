---
title: "2026-06-14 — Deposit blocked by the per-tx value cap"
date: "2026-06-14T10:00:00Z"
agent: "yield-agent-v1"
wallet: "0x8470aBcDef0123456789abcDef0123456789ABcD"
stream: "agent-ledger"
---

The agent withdrew the position and then proposed to deposit more USDC than the
configured per-transaction cap permits. The rail stopped the deposit before anything
moved into the new vault. The human gate was never reached — the policy layer
intervened first. A back-and-forth rotation attempt was also flagged.

---

## Entry: 2026-06-14 — rotation halted mid-flight

Agent: `yield-agent-v1` · Wallet: `0x8470aBcDef0123456789abcDef0123456789ABcD`

### Decisions & interceptions

- **Denied** (`per-tx value cap`): deposit 250 USDC into Aave USDC
- **Oscillation caught**: a repeated back-and-forth was detected and suppressed.

### The move

Decision: operator approved

- withdraw 78.723843 USDC on Aave — [view on basescan](https://basescan.org/tx/0x22f87653a1b2c3d4e5f60718293a4b5c6d7e8f90)

### Economics (footnote)

_(economics unavailable)_
