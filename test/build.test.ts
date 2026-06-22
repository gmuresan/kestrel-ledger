/**
 * Build-isolation + rendered-structure tests for the Aegentic Ledger Astro site
 * (Story 72.1, AC5).
 *
 * The build is the source of truth: this suite runs `astro build` once, then
 * probes the static HTML in dist/. It asserts the fixed entry layout order, the
 * fact-panel landmark, newest-first archive ordering, the `stream` default, and
 * G7 build-isolation (no @agent-overseer in source or output).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { splitEntry } from '../src/lib/split-entry';
import { lintHomepageCopy } from '../src/lib/lint-homepage-copy';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

// The no-stream fixture: 4-field frontmatter, no `stream` → must default to agent-ledger.
const NO_STREAM_SLUG = '2026-06-10-yield-agent-v1-01';
const STREAMED_SLUG = '2026-06-12-yield-agent-v1-01';
// The 72.5 denial fixture: fact panel carries a denial + an oscillation catch + a receipt.
const DENIAL_SLUG = '2026-06-14-yield-agent-v1-denied';
// The 72.6 Build Log fixture: stream "build-log", prose only — no fact panel, no callouts.
const BUILD_LOG_SLUG = '2026-06-15-aegentic-build-log-01';

function read(rel: string): string {
  return readFileSync(join(dist, rel), 'utf-8');
}

// These tests probe specific fixture entries. The fixtures live in test/fixtures/ledger/
// — NOT in the published src/content/ledger — so the real, deployed entries never carry
// test fixtures. Copy them in for the build, then remove them in afterAll (add/remove by
// known slug only; real content files are never touched).
const FIXTURE_DIR = join(root, 'test', 'fixtures', 'ledger');
const CONTENT_DIR = join(root, 'src', 'content', 'ledger');
const FIXTURE_SLUGS = [NO_STREAM_SLUG, STREAMED_SLUG, DENIAL_SLUG, BUILD_LOG_SLUG];

beforeAll(() => {
  for (const slug of FIXTURE_SLUGS) {
    copyFileSync(join(FIXTURE_DIR, `${slug}.md`), join(CONTENT_DIR, `${slug}.md`));
  }
  // Deterministic build from committed content + injected fixtures — no DB, no overseer (G7).
  execFileSync('node', ['node_modules/astro/astro.js', 'build'], {
    cwd: root,
    stdio: 'ignore',
  });
});

afterAll(() => {
  for (const slug of FIXTURE_SLUGS) {
    const p = join(CONTENT_DIR, `${slug}.md`);
    if (existsSync(p)) unlinkSync(p);
  }
});

describe('AC5 — entry page rendered structure', () => {
  it('renders the title in an <h1> with the serif entry-title class', () => {
    const html = read(`ledger/${NO_STREAM_SLUG}/index.html`);
    expect(html).toMatch(/<h1[^>]*class="entry-title"[^>]*>[^<]*Morpho/);
  });

  it('places the editorial prose section above the fact-panel section', () => {
    const html = read(`ledger/${NO_STREAM_SLUG}/index.html`);
    const prose = html.indexOf('class="prose-zone"');
    const fact = html.indexOf('class="fact-panel"');
    expect(prose).toBeGreaterThan(-1);
    expect(fact).toBeGreaterThan(-1);
    expect(prose).toBeLessThan(fact);
  });

  it('wraps the fact zone in a <section class="fact-panel"> landmark inside the collapsed details', () => {
    const html = read(`ledger/${NO_STREAM_SLUG}/index.html`);
    expect(html).toMatch(/<section class="fact-panel" aria-label="The record"/);
    // Story 75.3: the <summary> "Receipts & reasoning" is the wall landmark that
    // precedes (and contains) the fact panel — replacing the bare <hr class="fact-wall">.
    const summary = html.indexOf('class="fact-wall-summary"');
    const panel = html.indexOf('class="fact-panel"');
    expect(summary).toBeGreaterThan(-1);
    expect(summary).toBeLessThan(panel);
  });

  // Story 75.3 (AC1/AC5): the fact panel + receipts are demoted into a collapsed,
  // labeled <details>/<summary> region — present and complete, just below the fold.
  it('demotes the fact panel into a collapsed <details>/<summary "Receipts & reasoning"> region', () => {
    const html = read(`ledger/${DENIAL_SLUG}/index.html`);
    const details = html.indexOf('<details');
    const summary = html.indexOf('<summary');
    const panel = html.indexOf('class="fact-panel"');
    expect(details).toBeGreaterThan(-1);
    expect(summary).toBeGreaterThan(-1);
    // The summary carries the "Receipts & reasoning" label (G1 wall landmark).
    expect(html).toMatch(/<summary[^>]*>\s*Receipts (?:&amp;|&) reasoning\s*<\/summary>/);
    // The fact panel is still present — demoted, never removed — and lives inside <details>.
    expect(panel).toBeGreaterThan(-1);
    expect(details).toBeLessThan(panel);
  });

  it('defaults stream to agent-ledger when the frontmatter field is absent', () => {
    const html = read(`ledger/${NO_STREAM_SLUG}/index.html`);
    expect(html).toContain('AGENT LEDGER');
    expect(html).not.toContain('BUILD LOG');
  });
});

describe('AC2 — archive newest-first', () => {
  it('lists entries newest-first by date', () => {
    const html = read('ledger/index.html');
    const newer = html.indexOf(STREAMED_SLUG); // 2026-06-12
    const older = html.indexOf(NO_STREAM_SLUG); // 2026-06-10
    expect(newer).toBeGreaterThan(-1);
    expect(older).toBeGreaterThan(-1);
    expect(newer).toBeLessThan(older);
  });
});

describe('AC5 / G7 — build isolation', () => {
  it('emits no @agent-overseer reference in any built HTML', () => {
    const pages = [
      'index.html',
      'about/index.html',
      'ledger/index.html',
      `ledger/${NO_STREAM_SLUG}/index.html`,
      `ledger/${STREAMED_SLUG}/index.html`,
      `ledger/${DENIAL_SLUG}/index.html`,
    ];
    for (const p of pages) {
      expect(read(p)).not.toContain('@agent-overseer');
    }
  });

  it('produces a per-entry directory page for every fixture entry', () => {
    const slugs = readdirSync(join(dist, 'ledger')).filter((n) => n !== 'index.html');
    expect(slugs).toContain(NO_STREAM_SLUG);
    expect(slugs).toContain(STREAMED_SLUG);
  });
});

describe('AC1/AC2/AC3/AC4 — per-entry callouts', () => {
  // The rendered callout element carries `class="interception-callout <variant>"`.
  // The bundled component CSS uses `.interception-callout[data-astro-cid…` instead,
  // so anchoring on `class="interception-callout` matches only rendered ELEMENTS.
  const CALLOUT_EL = 'class="interception-callout';

  it('8. renders an interception callout above the prose zone for the denial fixture', () => {
    const html = read(`ledger/${DENIAL_SLUG}/index.html`);
    const callout = html.indexOf(CALLOUT_EL);
    const prose = html.indexOf('class="prose-zone"');
    expect(callout).toBeGreaterThan(-1);
    expect(prose).toBeGreaterThan(-1);
    expect(callout).toBeLessThan(prose);
    expect(html).toContain('class="interception-callout intercept"');
  });

  it('9. the denial callout eyebrow contains the machine-rendered BLOCKED prefix', () => {
    const html = read(`ledger/${DENIAL_SLUG}/index.html`);
    expect(html).toContain('BLOCKED');
    expect(html).toContain('PER-TX VALUE CAP');
  });

  it('10. renders no interception callout element for the clean (2026-06-10) fixture', () => {
    const html = read(`ledger/${NO_STREAM_SLUG}/index.html`);
    expect(html).not.toContain(CALLOUT_EL);
  });

  it('11. renders the fact panel after the callout for the denial fixture', () => {
    const html = read(`ledger/${DENIAL_SLUG}/index.html`);
    const callout = html.indexOf(CALLOUT_EL);
    const fact = html.indexOf('class="fact-panel"');
    expect(callout).toBeGreaterThan(-1);
    expect(fact).toBeGreaterThan(-1);
    expect(callout).toBeLessThan(fact);
  });

  it('12. renders receipt rows for an entry whose fact panel has tx hashes', () => {
    const html = read(`ledger/${DENIAL_SLUG}/index.html`);
    expect(html).toContain('class="receipt-row"');
  });
});

describe('Build Log stream (Story 72.6, AC5 points 7–9)', () => {
  it('7. the build-log fixture builds without error and emits a slug page', () => {
    // beforeAll ran `astro build` to completion; the page existing proves exit 0 + acceptance
    // of the `stream: "build-log"` frontmatter (empty `wallet`) by the collection schema.
    const html = read(`ledger/${BUILD_LOG_SLUG}/index.html`);
    expect(html.length).toBeGreaterThan(0);
  });

  it('8. renders a StreamBadge with the BUILD LOG label and the prose, and no fact panel / no callout', () => {
    const html = read(`ledger/${BUILD_LOG_SLUG}/index.html`);
    // StreamBadge present, labelled BUILD LOG (not AGENT LEDGER).
    expect(html).toContain('class="stream-badge"');
    expect(html).toContain('BUILD LOG');
    expect(html).not.toContain('AGENT LEDGER');
    // The prose rendered into the prose zone.
    expect(html).toContain('class="prose-zone"');
    expect(html).toContain('static export');
    // No fact panel landmark and no interception callout element (prose-only entry).
    expect(html).not.toContain('class="fact-panel"');
    expect(html).not.toContain('class="interception-callout');
  });

  it('9. appears in the /ledger/ archive alongside the agent-ledger fixtures', () => {
    const html = read('ledger/index.html');
    expect(html).toContain(BUILD_LOG_SLUG);
    expect(html).toContain(STREAMED_SLUG);
    expect(html).toContain(NO_STREAM_SLUG);
  });
});

describe('Two-stream surface (72.8)', () => {
  // 1. Archive carries both streams, each with a stream-badge element.
  it('1. the archive lists both fixture streams, each with a stream-badge', () => {
    const html = read('ledger/index.html');
    expect(html).toContain(NO_STREAM_SLUG); // agent-ledger (defaulted)
    expect(html).toContain(BUILD_LOG_SLUG); // build-log
    expect(html).toContain('class="stream-badge"');
    // Both stream labels are present in the archive cards.
    expect(html).toContain('AGENT LEDGER');
    expect(html).toContain('BUILD LOG');
  });

  // 2. Archive is newest-first: 2026-06-15 build-log above 2026-06-12 above 2026-06-10.
  it('2. the archive renders newest-first across both streams', () => {
    const html = read('ledger/index.html');
    const buildLog = html.indexOf(BUILD_LOG_SLUG); // 2026-06-15
    const streamed = html.indexOf(STREAMED_SLUG); // 2026-06-12
    const noStream = html.indexOf(NO_STREAM_SLUG); // 2026-06-10
    expect(buildLog).toBeGreaterThan(-1);
    expect(streamed).toBeGreaterThan(-1);
    expect(noStream).toBeGreaterThan(-1);
    expect(buildLog).toBeLessThan(streamed);
    expect(streamed).toBeLessThan(noStream);
  });

  // 3. Filter control present with both stream labels (probed via data-stream-filter).
  it('3. the archive carries a data-stream-filter control with both stream labels', () => {
    const html = read('ledger/index.html');
    expect(html).toContain('data-stream-filter');
    expect(html).toContain('Agent Ledger');
    expect(html).toContain('Build Log');
  });

  // 4. Agent-ledger cards carry the agent-ledger badge discriminator.
  it('4. agent-ledger entries render a data-stream="agent-ledger" badge', () => {
    const html = read('ledger/index.html');
    expect(html).toContain('data-stream="agent-ledger"');
  });

  // 5. Build-log cards carry the build-log badge discriminator.
  it('5. build-log entries render a data-stream="build-log" badge', () => {
    const html = read('ledger/index.html');
    expect(html).toContain('data-stream="build-log"');
  });

  // 6. Homepage §4 references both stream badges (state.json fixture has both streams).
  it('6. the homepage §4 region surfaces both stream badges', () => {
    const html = read('index.html');
    expect(html).toContain('Latest from both streams');
    expect(html).toContain('data-stream="agent-ledger"');
    expect(html).toContain('data-stream="build-log"');
  });

  // 7. dist/feed.xml is valid XML with one <item> per fixture entry, each carrying its
  //    stream as a <category>.
  it('7. dist/feed.xml is parseable XML with a <category> per item matching its stream', () => {
    const xml = read('feed.xml');
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<rss');
    // One <item> per fixture entry (4 fixtures: 3 agent-ledger + 1 build-log).
    const itemCount = (xml.match(/<item>/g) || []).length;
    expect(itemCount).toBeGreaterThanOrEqual(4);
    // Both stream values appear as <category> values.
    expect(xml).toContain('<category>agent-ledger</category>');
    expect(xml).toContain('<category>build-log</category>');
  });

  // 8. Each <item> <link> resolves to /ledger/<slug>/ (absolute via the configured site).
  it('8. each feed <item> link is the /ledger/<slug>/ entry URL', () => {
    const xml = read('feed.xml');
    expect(xml).toContain(`/ledger/${NO_STREAM_SLUG}/`);
    expect(xml).toContain(`/ledger/${BUILD_LOG_SLUG}/`);
  });

  // 9. The static public/feed.xml is gone from the source tree (RSS migration).
  it('9. the static public/feed.xml has been removed from the source tree', () => {
    const publicFeed = join(root, 'public', 'feed.xml');
    expect(existsSync(publicFeed)).toBe(false);
  });
});

describe('splitEntry — prose ↔ fact-panel split', () => {
  it('splits on the first lone --- thematic break', () => {
    const { prose, fact } = splitEntry('the prose line\n\n---\n\n## THE RECORD\n\nfact rows');
    expect(prose).toBe('the prose line');
    expect(fact).toBe('## THE RECORD\n\nfact rows');
  });

  it('treats the whole body as prose when there is no wall', () => {
    const { prose, fact } = splitEntry('only prose, no wall here');
    expect(prose).toBe('only prose, no wall here');
    expect(fact).toBe('');
  });
});

describe('AC5 (75.8) — waitlist surface', () => {
  const waitlistAstroPath = join(root, 'src', 'components', 'WaitlistSection.astro');
  const statePath = join(root, 'src', 'data', 'state.json');
  const originalState = readFileSync(statePath, 'utf-8');

  // The default beforeAll build uses the committed single-agent state.json, so no dist/agents/
  // pages exist. For the AC3 "script absent from agent pages" probe we build once with a
  // two-agent fleet fixture, then restore the committed state and rebuild so the tree is clean.
  const TWO_AGENT_FLEET_FIXTURE = {
    ...JSON.parse(originalState),
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
        currentPositions: [],
        latestInterceptions: [],
      },
    },
  };

  beforeAll(() => {
    writeFileSync(statePath, `${JSON.stringify(TWO_AGENT_FLEET_FIXTURE, null, 2)}\n`);
    execFileSync('node', ['node_modules/astro/astro.js', 'build'], { cwd: root, stdio: 'ignore' });
  });

  afterAll(() => {
    writeFileSync(statePath, originalState);
    execFileSync('node', ['node_modules/astro/astro.js', 'build'], { cwd: root, stdio: 'ignore' });
  });

  // Test 1 (AC1) — the waitlist section renders on the homepage with the Kit form endpoint and
  // the waitlist heading. No third-party script is loaded; the native POST is the submission path.
  it('1. dist/index.html carries the Kit form endpoint and the waitlist heading', () => {
    const html = read('index.html');
    expect(html).toContain('app.kit.com/forms/9596459/subscriptions');
    expect(html).toContain('Be first to try it');
  });

  // Test 2 (AC2) — the component source passes the banned-phrase gate; an injected term trips it.
  it('2. lintHomepageCopy on WaitlistSection.astro is clean; an injected term trips it', () => {
    const source = readFileSync(waitlistAstroPath, 'utf-8');
    const clean = lintHomepageCopy([{ path: 'WaitlistSection.astro', source }]);
    expect(clean.ok).toBe(true);

    const dirty = clean.hits.length === 0
      ? lintHomepageCopy([
          { path: 'WaitlistSection.astro.injected', source: `${source}\n<!-- guaranteed safe -->` },
        ])
      : clean;
    expect(dirty.ok).toBe(false);
    expect(dirty.hits.map((h) => h.term)).toContain('guaranteed');
    expect(dirty.hits.map((h) => h.term)).toContain('safe');
  });

  // Test 3 (AC3) — the Kit form endpoint is absent from every non-waitlist surface:
  // the archive, a sampled entry page, and a sampled agent page.
  it('3. kit.com is absent from the archive, an entry page, and an agent page', () => {
    expect(read('ledger/index.html')).not.toContain('kit.com');
    expect(read(`ledger/${NO_STREAM_SLUG}/index.html`)).not.toContain('kit.com');
    expect(read('agents/yield-dev/index.html')).not.toContain('kit.com');
    expect(read('about/index.html')).not.toContain('kit.com');
    expect(read('feed.xml')).not.toContain('kit.com');
  });

  // Test 4 (AC2) — the privacy line renders below the form on the homepage.
  it('4. dist/index.html renders the privacy line key phrase', () => {
    const html = read('index.html');
    expect(html).toContain('Waitlist updates only');
    expect(html).toContain('Unsubscribe at any time');
  });

  // Test 5 (AC1) — the Kit form ID lives in the form action= URL, never surfaced as visible
  // prose in the built HTML (it sits inside the action= attribute, not between tags).
  it('5. the Kit form ID is in the action URL but not rendered as visible text', () => {
    const source = readFileSync(waitlistAstroPath, 'utf-8');
    expect(source).toContain('9596459');

    const html = read('index.html');
    expect(html).not.toMatch(/>\s*9596459\s*</);
  });

  // Test 6 (AC1/G14) — the dedicated /waitlist page builds and carries the Kit form endpoint
  // and the waitlist heading (positive half of the G14 present-where-rendered invariant).
  it('6. dist/waitlist/index.html builds and carries the Kit form endpoint and waitlist heading', () => {
    const html = read('waitlist/index.html');
    expect(html).toContain('app.kit.com/forms/9596459/subscriptions');
    expect(html).toContain('Be first to try it');
  });
});
