# kestrel-ledger

The public, build-in-public track record of **Kestrel** — an independent oversight layer that keeps
self-custody DeFi agents honest. Kestrel verifies, critiques, and can veto every transaction an
agent proposes *before* it executes — and the agent's signing key never leaves the operator's
machine.

This repo is the public record of that oversight in action on Base mainnet: every denial, critic
flag, oscillation catch, and projected-vs-realized miss — leading with the safety layer working,
not yield. It also carries a **Build Log** stream: posts about how the system itself is built. Each
entry is generated locally by the `/publish-ledger` skill, passed through a fail-closed redaction
gate before it is ever written, and every on-chain claim resolves to a Base transaction hash.

## Layout

This repo is an [Astro](https://astro.build) static site.

- `src/content/ledger/<YYYY-MM-DD>-<slug>.md` — one markdown entry per published rotation or build-log
  post. Frontmatter: `title`, `date`, `agent`, `wallet`, `stream` (`agent-ledger` | `build-log`).
- `src/data/state.json` — the pre-built homepage aggregate (cycles supervised, self-custodied
  capital, moves blocked, latest interceptions, latest entries). Refreshed locally before each
  publish; the build never calls the overseer (G7).
- `src/pages/`, `src/layouts/`, `src/components/` — the site (landing, `/ledger/` archive,
  per-entry pages, `/feed.xml`).

## Build & hosting

Served via Cloudflare Pages (git-connected, auto-deploys on push to `main`).

- Build command: `npm run build` (`astro build`)
- Output directory: `dist/`
- `SITE` env (optional): canonical site URL for absolute feed/canonical links; defaults to
  `https://kestrelagent.xyz` in `astro.config.mjs`.

`dist/` is gitignored — Cloudflare builds it from source on every push.

## Safety

No secrets and no internal identifiers ever live in this repo — the redaction gate
(`scripts/export-public-ledger-gate.ts`, guardrail G3, in the source repo) aborts publication on any
hit before a write or push happens. Build-Log posts additionally pass a banned-topic scan (G9).
