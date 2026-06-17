import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

// Scoped ESLint config for the isolated Astro app (Story 72.1, build-shape contract #8).
//
// This app is EXCLUDED from the root `pnpm lint` (root eslint.config.mjs ignores
// `public-ledger-site/**`), mirroring how packages/overseer/dashboard is handled.
// It runs its own `pnpm lint` against src/ only.
//
// Deliberately does NOT enforce AR4 (no-restricted-imports for relative imports):
// Astro components/layouts use relative imports natively within src/. The one rule
// that carries forward from the monorepo standard is NFR36 (no-console).
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // NFR36: no console statements (the one monorepo rule that carries forward).
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // dist/, .astro/, node_modules/ are build output; src/env.d.ts is an
    // Astro-generated type shim (regenerated on every build, gitignored).
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'src/env.d.ts'],
  },
);
