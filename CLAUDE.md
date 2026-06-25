# CLAUDE.md — aegentic-ledger

Public build-in-public ledger for the live autonomous agent (Astro static site,
deployed on Cloudflare). Lives at `kestrelagent.xyz`.

## Deploy

**Pushes to `main` auto-deploy** via Cloudflare's connected-repo git integration.
Commit + push to `main` is the whole deploy step — no manual command needed.

- Do NOT run `wrangler deploy` / `pnpm run deploy` by hand; the git push already
  builds and ships. (Manual deploy also needs a `CLOUDFLARE_API_TOKEN` with
  Workers Scripts:Edit and won't run in a non-interactive shell anyway.)
- There is no `.github/workflows` — the build runs on Cloudflare's side, not in
  GitHub Actions.

## Tests

`pnpm test` (vitest). Build-output assertions live in `test/build.test.ts`.

> Known broken env: `vitest@4` is installed against `vite@5`
> (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Until deps are realigned (`vite@6` or pin
> `vitest@3`), verify behavior by running `pnpm build` and grepping `dist/`.

## Waitlist / email capture

`src/components/WaitlistSection.astro` — Kit (kit.com) form, form ID `9596459`.
Native POST to the Kit form endpoint, no third-party script (LD5: managed
double-opt-in / unsubscribe live in Kit; repo ships zero server-side code).
