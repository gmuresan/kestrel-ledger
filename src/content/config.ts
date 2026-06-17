import { defineCollection, z } from 'astro:content';

/**
 * The `ledger` content collection (Story 72.1, AC2).
 *
 * Consumes `entries/*.md` produced by the Epic 71 publish pipeline. Those entries
 * carry a 4-field frontmatter `{title, date, agent, wallet}`. Epic 72 build-shape
 * contract #1 adds a `stream` field; it `.default('agent-ledger')` so all existing
 * 71 entries render unchanged with no backfill (AC2).
 *
 * The collection root is src/content/ledger/. In the monorepo this holds fixture
 * entries (and __fixtures__/) for development/testing; in the public repo the
 * publish pipeline (72.3) copies the real entries/*.md into this directory before
 * `astro build`.
 */
const ledger = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(), // ISO-8601 as written by the publish skill
    agent: z.string(),
    wallet: z.string(),
    // Story 75.4 (AC1): stable per-agent slug for attribution + 75.5 per-agent
    // routing. `.optional()` (NOT `.default()`) so existing 71/72 entries that
    // omit the field validate unchanged — a missing slug stays `undefined`,
    // never a misleading empty string.
    agentSlug: z.string().optional(),
    stream: z.enum(['agent-ledger', 'build-log']).default('agent-ledger'),
  }),
});

export const collections = { ledger };
