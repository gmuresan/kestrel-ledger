/**
 * Marketing-landing build-probe + honesty-gate tests (Story 72.2, AC5).
 *
 * The build is the source of truth: each fixture writes src/data/state.json, runs `astro build`,
 * and probes the static HTML in dist/. This proves the widgets render the aggregate's figures
 * verbatim (G1/G7) — every metric-strip number maps to the fixture, never a hardcoded fallback —
 * and that the §3 empty-interceptions fallback and the null-capital ($—) state render honestly.
 *
 * The banned-phrase gate (AC4) is exercised against the REAL landing source and against a copy
 * with an injected banned term, importing the same denylist the gate enforces (one honesty bar).
 *
 * state.json is committed (Task 6); this suite saves and restores its original bytes so the repo
 * is left clean and the committed fixture is the one that ships.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { lintHomepageCopy, BANNED_TERMS } from '../src/lib/lint-homepage-copy';
import type { HomepageState } from '../src/lib/state-types';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const statePath = join(root, 'src', 'data', 'state.json');
const screenshotsPath = join(root, 'src', 'data', 'screenshots.json');
const indexAstroPath = join(root, 'src', 'pages', 'index.astro');
const aboutAstroPath = join(root, 'src', 'pages', 'about.astro');
const agentPageAstroPath = join(root, 'src', 'pages', 'agents', '[agentSlug].astro');
const fleetRosterAstroPath = join(root, 'src', 'components', 'FleetRosterSection.astro');
const landingComponents = [
  'MetricStrip.astro',
  'HowItWorksSection.astro',
  'SafetyLayerSection.astro',
  'LatestEntriesSection.astro',
].map((c) => join(root, 'src', 'components', c));

function build(): void {
  execFileSync('node', ['node_modules/astro/astro.js', 'build'], { cwd: root, stdio: 'ignore' });
}

function buildWithState(state: unknown): string {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  build();
  return readFileSync(join(dist, 'index.html'), 'utf-8');
}

// Story 75.7 (AC5) — write a fixture screenshots.json, build, return the rendered homepage HTML.
// state.json is left as the committed fixture so the rest of the build is unaffected.
function buildWithScreenshots(shots: unknown): string {
  writeFileSync(screenshotsPath, `${JSON.stringify(shots, null, 2)}\n`);
  build();
  return readFileSync(join(dist, 'index.html'), 'utf-8');
}

// Fixture with KNOWN values distinct from the committed state.json so the no-new-numbers
// assertions prove the widgets read the fixture, not a baked-in default.
const FIXTURE = {
  generatedAt: '2026-07-01T00:00:00.000Z',
  cyclesSupervised: 137,
  selfCustodiedCapital: { formatted: '$999.99', symbol: 'USD' },
  movesBlocked: 9,
  drained: 0,
  currentPositions: [{ protocol: 'morpho-vault', token: 'morpho-vault', positionUsd: '999.99' }],
  latestInterceptions: [
    {
      policyLabel: 'per-tx value cap',
      intentSummary: 'deposit 7777 USDC into morpho-vault',
      entrySlug: '2026-06-12-yield-agent-v1-01',
    },
  ],
  latestByStream: {
    agent: [
      {
        slug: '2026-06-12-yield-agent-v1-01',
        title: 'A value-cap denial blocked an oversized deposit',
        date: '2026-06-12',
        stream: 'agent-ledger',
      },
    ],
    build: [],
  },
};

// Story 75.5 (AC5) — two-agent fleet fixture. Keeps every top-level field from FIXTURE (so the
// widgets that read the single-agent shape still render during the build), and adds the `fleet`
// roll-up + `perAgent` map the fleet hub and per-agent pages consume. Fleet figures (15 / $300 /
// 3 / 0) are distinct from each agent's so the build-probe proves the strip reads the roll-up,
// not an agent figure or a top-level default.
const TWO_AGENT_FLEET_FIXTURE = {
  ...FIXTURE,
  fleet: {
    agentsCount: 2,
    cyclesSupervised: 15,
    movesBlocked: 3,
    selfCustodiedCapital: { formatted: '$300.00', symbol: 'USD' },
    drained: 0,
  },
  perAgent: {
    'yield-dev': {
      agentName: 'yield-dev',
      cyclesSupervised: 10,
      movesBlocked: 1,
      selfCustodiedCapital: { formatted: '$200.00', symbol: 'USD' },
      drained: 0,
      currentPositions: [
        { protocol: 'morpho-vault', token: 'morpho-vault', positionUsd: '200.00' },
      ],
      latestInterceptions: [],
    },
    'trader-dev': {
      agentName: 'trader-dev',
      cyclesSupervised: 5,
      movesBlocked: 2,
      selfCustodiedCapital: { formatted: '$100.00', symbol: 'USD' },
      drained: 0,
      currentPositions: [],
      latestInterceptions: [],
    },
  },
};

const originalState = readFileSync(statePath, 'utf-8');
const originalScreenshots = readFileSync(screenshotsPath, 'utf-8');

afterAll(() => {
  // Restore the committed fixtures and rebuild so dist/ + the working tree are clean.
  writeFileSync(statePath, originalState);
  writeFileSync(screenshotsPath, originalScreenshots);
  build();
});

describe('AC5.1 — widget grounding (metric strip reads the fixture verbatim)', () => {
  let html = '';
  beforeAll(() => {
    html = buildWithState(FIXTURE);
  });

  it('renders the verbatim hero headline and subhead', () => {
    expect(html).toContain('Know exactly what an AI does with real money — before you trust one with yours.');
    // The subhead wraps across source lines in the rendered HTML — normalize whitespace before
    // asserting the verbatim text is present in full.
    const normalized = html.replace(/\s+/g, ' ');
    expect(normalized).toContain(
      'An autonomous agent runs live capital on-chain under a supervised safety layer. ' +
        'Every action it takes, and every move the rail blocks, is on the public record.',
    );
  });

  it('renders each metric figure exactly from the fixture (no hardcoded fallback)', () => {
    expect(html).toContain('>137<'); // cyclesSupervised
    expect(html).toContain('$999.99'); // selfCustodiedCapital.formatted
    expect(html).toContain('>9<'); // movesBlocked
    // drained === 0 renders neutral, scoped "to date".
    expect(html).toMatch(/drained[^>]*>0</);
    expect(html).toContain('to date');
  });

  it('labels the blocks stat "moves blocked", never "risky moves"', () => {
    expect(html.toLowerCase()).toContain('moves blocked');
    expect(html.toLowerCase()).not.toContain('risky moves');
  });

  it('renders the §3 interception callout with the fixture policyLabel + intentSummary, linked', () => {
    expect(html).toContain('per-tx value cap');
    expect(html).toContain('deposit 7777 USDC into morpho-vault');
    expect(html).toContain('/ledger/2026-06-12-yield-agent-v1-01/');
  });

  it('renders the §4 entry card from latestByStream.agent', () => {
    expect(html).toContain('A value-cap denial blocked an oversized deposit');
  });

  it('stamps §3 and §4 with the fixture freshness date', () => {
    // 2026-07-01 → "Jul 1, 2026" (en-US short month, no leading zero).
    expect(html).toContain('as of Jul 1, 2026');
  });
});

describe('AC5.5 — no-new-numbers (rendered digits come only from the fixture)', () => {
  it('the metric values match the fixture, not the committed defaults (42 / $312.40 / 1)', () => {
    const html = buildWithState(FIXTURE);
    expect(html).toContain('>137<');
    expect(html).not.toContain('>42<'); // the committed default cycle count must be gone
    expect(html).not.toContain('$312.40'); // the committed default capital must be gone
  });
});

describe('AC5.2 — empty interceptions falls back to "Every decision, on the record"', () => {
  it('shows the fallback heading and renders NO interception callout', () => {
    const html = buildWithState({ ...FIXTURE, latestInterceptions: [] });
    expect(html).toContain('Every decision, on the record');
    expect(html).not.toContain('The safety layer, on the record');
    // No callout body should leak when the array is empty.
    expect(html).not.toContain('deposit 7777 USDC into morpho-vault');
  });
});

describe('AC5.3 — null self-custodied capital renders $—', () => {
  it('shows the em-dash placeholder, never a fabricated $0', () => {
    const html = buildWithState({ ...FIXTURE, selfCustodiedCapital: null });
    expect(html).toContain('$—');
  });
});

describe('AC5.4 — banned-phrase gate (G2)', () => {
  it('the real landing source (index.astro + about.astro + components) is clean', () => {
    const files = [indexAstroPath, aboutAstroPath, ...landingComponents].map((p) => ({
      path: p,
      source: readFileSync(p, 'utf-8'),
    }));
    const result = lintHomepageCopy(files);
    expect(result.ok).toBe(true);
  });

  it('catches an injected banned term in a copy of the landing source', () => {
    const clean = readFileSync(indexAstroPath, 'utf-8');
    const dirty = clean.replace('on the public record', 'a trustless, risk-free record');
    const result = lintHomepageCopy([{ path: 'index.astro.injected', source: dirty }]);
    expect(result.ok).toBe(false);
    expect(result.hits.map((h) => h.term)).toContain('trustless');
    expect(result.hits.map((h) => h.term)).toContain('risk-free');
  });

  it('exposes the full denylist for downstream surfaces (one honesty bar)', () => {
    expect(BANNED_TERMS).toContain('guaranteed');
    expect(BANNED_TERMS).toContain('non-custodial');
    expect(BANNED_TERMS).toContain('risky moves');
  });
});

describe('AC5 — fleet hub + per-agent pages (two-agent fixture)', () => {
  let html = '';
  beforeAll(() => {
    html = buildWithState(TWO_AGENT_FLEET_FIXTURE);
  });

  it('the homepage metric strip shows the FLEET roll-up figures, not an agent or default', () => {
    expect(html).toContain('>15<'); // fleet cyclesSupervised
    expect(html).toContain('$300.00'); // fleet selfCustodiedCapital
    expect(html).toContain('>3<'); // fleet movesBlocked
    expect(html).toMatch(/drained[^>]*>0</);
  });

  it('renders the fleet roster section linking to each agent page', () => {
    expect(html).toContain('THE FLEET');
    expect(html).toContain('/agents/yield-dev/');
    expect(html).toContain('/agents/trader-dev/');
  });

  it('builds dist/agents/yield-dev/index.html with its own per-agent figures', () => {
    const agentHtml = readFileSync(join(dist, 'agents', 'yield-dev', 'index.html'), 'utf-8');
    expect(agentHtml).toContain('yield-dev');
    expect(agentHtml).toContain('>10<'); // per-agent cyclesSupervised
    expect(agentHtml).toContain('$200.00'); // per-agent selfCustodiedCapital
  });

  it('builds dist/agents/trader-dev/index.html with its own per-agent figures', () => {
    const agentHtml = readFileSync(join(dist, 'agents', 'trader-dev', 'index.html'), 'utf-8');
    expect(agentHtml).toContain('trader-dev');
    expect(agentHtml).toContain('>5<'); // per-agent cyclesSupervised
    expect(agentHtml).toContain('$100.00'); // per-agent selfCustodiedCapital
  });
});

describe('AC4 — single-agent fallback (no fleet/perAgent)', () => {
  let html = '';
  beforeAll(() => {
    html = buildWithState(FIXTURE);
  });

  it('renders the top-level single-agent cyclesSupervised', () => {
    expect(html).toContain('>137<');
  });

  it('renders NO fleet roster section', () => {
    expect(html).not.toContain('THE FLEET');
  });

  it('builds NO per-agent pages (no dist/agents/ directory)', () => {
    expect(existsSync(join(dist, 'agents'))).toBe(false);
  });
});

describe('AC3 — entry attribution chip', () => {
  // Inject a temporary ledger entry carrying agentSlug, build, assert the chip renders on the
  // archive, then remove it so the committed collection is left clean. The filename must NOT
  // start with `_` — Astro content collections exclude underscore-prefixed files.
  const tempEntryPath = join(root, 'src', 'content', 'ledger', 'zzz-attribution-fixture.md');
  let archiveHtml = '';

  beforeAll(() => {
    writeFileSync(
      tempEntryPath,
      [
        '---',
        'title: "Attribution fixture entry"',
        'date: "2026-07-09T00:00:00Z"',
        'agent: "yield-dev"',
        'wallet: "0x326e18Ade6Edc700F765F0906B5C5f05FF51F753"',
        'agentSlug: "yield-dev"',
        'stream: "agent-ledger"',
        '---',
        '',
        'An attributed entry used only by the test suite.',
        '',
        '---',
        '',
        'No on-chain action.',
        '',
      ].join('\n'),
    );
    build();
    archiveHtml = readFileSync(join(dist, 'ledger', 'index.html'), 'utf-8');
  });

  afterAll(() => {
    if (existsSync(tempEntryPath)) unlinkSync(tempEntryPath);
  });

  it('shows the agent chip on an entry that carries agentSlug', () => {
    expect(archiveHtml).toContain('class="agent-chip"');
    expect(archiveHtml).toContain('yield-dev');
  });

  it('renders the per-agent filter button for the observed agentSlug', () => {
    expect(archiveHtml).toContain('data-agent-value="yield-dev"');
  });
});

describe('AC5 — banned-phrase gate for fleet hub + agent page sources', () => {
  it('the new agent page + fleet roster sources are clean', () => {
    const files = [agentPageAstroPath, fleetRosterAstroPath].map((p) => ({
      path: p,
      source: readFileSync(p, 'utf-8'),
    }));
    const result = lintHomepageCopy(files);
    expect(result.ok).toBe(true);
  });
});

// Story 86.2 (AC3) — the banned-phrase lint scans an explicit file list, so the new
// /build-log page source AND the curated build-log entries must be added to the linted
// set here (they are not globbed). G2 honesty bar — one denylist, no overclaim.
describe('Story 86.2 (AC3) — banned-phrase gate for the Build Log page + curated entries', () => {
  const buildLogPageAstroPath = join(root, 'src', 'pages', 'build-log', 'index.astro');
  const curatedEntryPaths = [
    join(root, 'src', 'content', 'ledger', '2026-06-09-build-log-03.md'),
    join(root, 'src', 'content', 'ledger', '2026-06-10-build-log-02.md'),
  ];

  it('the /build-log page source is clean', () => {
    const result = lintHomepageCopy([
      { path: buildLogPageAstroPath, source: readFileSync(buildLogPageAstroPath, 'utf-8') },
    ]);
    expect(result.ok).toBe(true);
  });

  it('the curated build-log entries are clean', () => {
    const files = curatedEntryPaths.map((p) => ({ path: p, source: readFileSync(p, 'utf-8') }));
    const result = lintHomepageCopy(files);
    expect(result.ok).toBe(true);
  });
});

// Story 86.3 (AC3) — the banned-phrase lint scans an explicit file list, so the new
// /verify page source must be added to the linted set here. G2 honesty bar — one denylist,
// no overclaim on the verify surface.
describe('Story 86.3 (AC3) — banned-phrase gate for the verify page', () => {
  const verifyPagePath = join(root, 'src', 'pages', 'verify.astro');
  it('the /verify page source is clean', () => {
    const result = lintHomepageCopy([
      { path: verifyPagePath, source: readFileSync(verifyPagePath, 'utf-8') },
    ]);
    expect(result.ok).toBe(true);
  });
});

// Helper: build with a given screenshots.json and return the HTML for a specific output file.
function buildWithScreenshotsForPath(shots: unknown, relPath: string): string {
  writeFileSync(screenshotsPath, `${JSON.stringify(shots, null, 2)}\n`);
  build();
  return readFileSync(join(dist, relPath), 'utf-8');
}

describe('AC5 (75.7) — screenshot surfacing', () => {
  const HOME_SHOT = {
    viewId: 'home',
    captureDate: '2026-06-16T12:00:00.000Z',
    sourceBuild: 'abc1234',
    filePath: 'screenshots/home.png',
  };

  it('Test 1 — a one-shot manifest renders a <figure> with the provenance caption', () => {
    const html = buildWithScreenshots([HOME_SHOT]);
    expect(html).toContain('class="screenshot-figure"');
    // The deterministic caption: "Dashboard screenshot — as of Jun 16, 2026, build abc1234".
    expect(html).toContain('Jun 16, 2026');
    expect(html).toContain('abc1234');
    expect(html).toMatch(/<figcaption[^>]*class="screenshot-caption"/);
    // The <img> points at the manifest filePath (root-absolute).
    expect(html).toContain('src="/screenshots/home.png"');
  });

  it('Test 2 — an empty manifest produces no screenshot HTML (graceful degradation)', () => {
    const html = buildWithScreenshots([]);
    // No screenshot figure/img/gallery — no broken image placeholder.
    expect(html).not.toContain('class="screenshot-figure"');
    expect(html).not.toContain('class="screenshot-gallery"');
    expect(html).not.toContain('src="/screenshots/');
  });

  it('Test 3 — the deterministic caption passes the banned-phrase gate; an injected term trips it', () => {
    const caption = 'Dashboard screenshot — as of Jun 16, 2026, build abc1234';
    const clean = lintHomepageCopy([{ path: 'caption', source: caption }]);
    expect(clean.ok).toBe(true);
    expect(clean.hits.length).toBe(0);

    const dirty = lintHomepageCopy([
      { path: 'caption.injected', source: `${caption} — trustless` },
    ]);
    expect(dirty.ok).toBe(false);
    expect(dirty.hits.map((h) => h.term)).toContain('trustless');
  });

  it('Test 4 — a refreshed manifest updates the caption date (captions derive from the manifest)', () => {
    const html = buildWithScreenshots([
      { ...HOME_SHOT, captureDate: '2026-07-04T00:00:00.000Z' },
    ]);
    // New date appears in the screenshot caption; the old date does not.
    expect(html).toContain('Jul 4, 2026');
    const caption = html.match(/class="screenshot-caption"[^>]*>([^<]*)</);
    expect(caption).not.toBeNull();
    expect(caption?.[1]).toContain('Jul 4, 2026');
    expect(caption?.[1]).not.toContain('Jun 16, 2026');
  });
});

// COVERAGE-1 (HIGH) — agent-page ScreenshotGallery embed is asserted.
// Uses the two-agent fleet fixture so agent pages are built, then writes a screenshots.json
// with a portfolio shot and verifies it appears on the per-agent page.
describe('AC5 (75.7) COVERAGE-1 — agent-page screenshot embed', () => {
  const PORTFOLIO_SHOT = {
    viewId: 'portfolio',
    captureDate: '2026-06-16T12:00:00.000Z',
    sourceBuild: 'abc1234',
    filePath: 'screenshots/portfolio.png',
  };

  beforeAll(() => {
    writeFileSync(statePath, `${JSON.stringify(TWO_AGENT_FLEET_FIXTURE, null, 2)}\n`);
  });

  afterAll(() => {
    writeFileSync(statePath, originalState);
  });

  it('dist/agents/yield-dev/index.html contains screenshot-figure + provenance caption', () => {
    const agentHtml = buildWithScreenshotsForPath(
      [PORTFOLIO_SHOT],
      'agents/yield-dev/index.html',
    );
    expect(agentHtml).toContain('class="screenshot-figure"');
    expect(agentHtml).toContain('src="/screenshots/portfolio.png"');
    expect(agentHtml).toContain('Jun 16, 2026');
    expect(agentHtml).toContain('abc1234');
    expect(agentHtml).toMatch(/<figcaption[^>]*class="screenshot-caption"/);
  });
});

// COVERAGE-2 (HIGH) — portfolio→home→none fallback on the agent page.
describe('AC5 (75.7) COVERAGE-2 — agent-page portfolio→home→none fallback', () => {
  const PORTFOLIO_SHOT = {
    viewId: 'portfolio',
    captureDate: '2026-06-16T12:00:00.000Z',
    sourceBuild: 'build-p',
    filePath: 'screenshots/portfolio.png',
  };
  const HOME_SHOT_ALT = {
    viewId: 'home',
    captureDate: '2026-06-16T12:00:00.000Z',
    sourceBuild: 'build-h',
    filePath: 'screenshots/home.png',
  };

  beforeAll(() => {
    writeFileSync(statePath, `${JSON.stringify(TWO_AGENT_FLEET_FIXTURE, null, 2)}\n`);
  });

  afterAll(() => {
    writeFileSync(statePath, originalState);
  });

  it('portfolio-only manifest renders on the agent page', () => {
    const agentHtml = buildWithScreenshotsForPath(
      [PORTFOLIO_SHOT],
      'agents/yield-dev/index.html',
    );
    expect(agentHtml).toContain('class="screenshot-figure"');
    expect(agentHtml).toContain('src="/screenshots/portfolio.png"');
  });

  it('portfolio+home manifest → portfolio wins (portfolio preferred over home)', () => {
    const agentHtml = buildWithScreenshotsForPath(
      [HOME_SHOT_ALT, PORTFOLIO_SHOT],
      'agents/yield-dev/index.html',
    );
    // portfolio shot should appear, home shot should not be used as the embed
    expect(agentHtml).toContain('src="/screenshots/portfolio.png"');
    expect(agentHtml).not.toContain('src="/screenshots/home.png"');
    expect(agentHtml).toContain('build-p');
    expect(agentHtml).not.toContain('build-h');
  });
});

// COVERAGE-3 (MEDIUM) — homepage first-entry fallback: a non-'home' viewId still renders.
describe('AC5 (75.7) COVERAGE-3 — homepage first-entry fallback (non-home viewId)', () => {
  it('a manifest whose only entry has viewId!=="home" still renders on the homepage', () => {
    const html = buildWithScreenshots([
      {
        viewId: 'overview',
        captureDate: '2026-06-16T12:00:00.000Z',
        sourceBuild: 'fallback-build',
        filePath: 'screenshots/overview.png',
      },
    ]);
    // The first-entry fallback (screenshots[0]) picks the overview shot.
    expect(html).toContain('class="screenshot-figure"');
    expect(html).toContain('src="/screenshots/overview.png"');
    expect(html).toContain('fallback-build');
  });
});
