// Issue #7744 — /compare/ pages must publish the same provider count as
// /sources/ and public/ai-search.md. The compare generator hardcoded 747
// after reconciliation moved the catalog to 748; these tests pin the
// matrix cells and FAQ copy to computeStats() so the next tick cannot
// ship a disagreeing numeral.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  COMPARISON_HUB_MATRIX_ROWS,
  COMPARISON_MATRIX_COLUMNS,
  COMPARISON_PAGES,
  WORLD_MONITOR_CHOKEPOINT_COUNT,
  __test,
} from '../scripts/build-comparison-pages.mjs';
import { computeStats } from '../scripts/docs-stats.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), 'utf8');
const SOURCE_COUNT_COLUMN = COMPARISON_MATRIX_COLUMNS.indexOf('Source count & licensing');
const PROVIDER_CLAIM_RE = /(\d[\d,]*)\s+(?:active providers|attributed(?: public)? providers)\b/gi;
const INVENTORY_CLAIMS = [
  { re: /(\d[\d,]*)\s+active providers\b/gi, valueOf: (stats) => stats.sourceAttribution.providerCount, label: 'active providers' },
  { re: /(\d[\d,]*)\s+attributed(?: public)? providers\b/gi, valueOf: (stats) => stats.sourceAttribution.providerCount, label: 'attributed providers' },
  { re: /(\d[\d,]*)\s+chokepoints fused\b/gi, valueOf: () => WORLD_MONITOR_CHOKEPOINT_COUNT, label: 'fused chokepoints' },
  { re: /(\d[\d,]*)\s+maritime chokepoints\b/gi, valueOf: () => WORLD_MONITOR_CHOKEPOINT_COUNT, label: 'maritime chokepoints' },
  { re: /(\d[\d,]*)\s+MCP tools\b/gi, valueOf: (stats) => stats.mcpToolCount, label: 'MCP tools' },
  { re: /(\d[\d,]*)\s+feed definitions\b/gi, valueOf: (stats) => stats.feedDefinitions, label: 'feed definitions' },
  { re: /(\d[\d,]*)\s+map layer types\b/gi, valueOf: (stats) => stats.layerDefinitions, label: 'map layer types' },
];

function worldMonitorRows() {
  return [
    ...COMPARISON_HUB_MATRIX_ROWS,
    ...COMPARISON_PAGES.flatMap((page) => page.matrixRows),
  ].filter((row) => row[0].startsWith('World Monitor'));
}

function worldMonitorCompareCopy() {
  const chunks = worldMonitorRows().flat();
  for (const page of COMPARISON_PAGES) {
    chunks.push(page.whyWeWin, page.concessionIntro);
    for (const [question, answer] of page.faqs) chunks.push(question, answer);
  }
  return chunks.join('\n');
}

function parseCount(value) {
  return Number(String(value).replace(/,/g, ''));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const tpl = {
  escapeHtml,
  breadcrumbLd: () => ({}),
  pageDocument: ({ body }) => body,
};

function renderedComparePages() {
  const lastmod = '2026-09-05';
  const baseUrl = 'https://www.worldmonitor.app';
  return [
    ['hub', __test.renderCompareHub({ tpl, baseUrl, lastmod })],
    ...COMPARISON_PAGES.map((page) => [page.slug, __test.renderComparePage(page, { tpl, baseUrl, lastmod })]),
  ];
}

describe('#7744 compare pages agree with reconciled product facts', () => {
  const stats = computeStats();
  const providerCount = stats.sourceAttribution.providerCount;
  const expectedSourceCell = `${providerCount.toLocaleString('en-US')} active providers, attributed public feeds`;

  it('loads a live provider count from the same registry /sources/ uses', () => {
    assert.ok(Number.isInteger(providerCount) && providerCount > 0, 'providerCount must be a positive integer');
    assert.notEqual(
      SOURCE_COUNT_COLUMN,
      -1,
      'the universal matrix must keep a Source count & licensing column',
    );
  });

  it('puts the live provider count in every World Monitor source-count cell', () => {
    const rows = worldMonitorRows();
    assert.ok(rows.length > 0, 'compare matrices must include World Monitor rows');
    for (const row of rows) {
      assert.equal(
        row[SOURCE_COUNT_COLUMN],
        expectedSourceCell,
        `${row[0]} source-count cell must match computeStats().sourceAttribution.providerCount`,
      );
    }
  });

  it('keeps FAQ and prose provider claims on the same numeral', () => {
    const copy = worldMonitorCompareCopy();
    const claims = [...copy.matchAll(PROVIDER_CLAIM_RE)];
    assert.ok(claims.length > 0, 'compare copy must still state a provider count');
    for (const match of claims) {
      assert.equal(
        parseCount(match[1]),
        providerCount,
        `compare copy "${match[0]}" must match the reconciled provider count`,
      );
    }
  });

  it('does not hardcode a provider numeral in the compare generator', () => {
    const source = read('scripts/build-comparison-pages.mjs');
    assert.doesNotMatch(
      source,
      /\b\d{3,}\s+active providers\b/,
      'matrix cells must format the live provider count, not a typed numeral',
    );
    assert.doesNotMatch(
      source,
      /\b\d{3,}\s+attributed(?: public)? providers\b/,
      'FAQ copy must format the live provider count, not a typed numeral',
    );
    assert.match(
      source,
      /sourceAttribution\.providerCount/,
      'the compare generator must read the attribution registry, not a sibling copy of the number',
    );
  });

  it('renders the live provider count on every /compare/ page', () => {
    const liveClaim = `${providerCount.toLocaleString('en-US')} active providers`;
    for (const [label, html] of renderedComparePages()) {
      assert.match(
        html,
        new RegExp(liveClaim.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${label} must publish ${liveClaim}`,
      );
      const claims = [...html.matchAll(PROVIDER_CLAIM_RE)];
      for (const match of claims) {
        assert.equal(
          parseCount(match[1]),
          providerCount,
          `${label} published "${match[0]}" which disagrees with the registry`,
        );
      }
    }
  });

  it('does not publish other World Monitor inventory figures that disagree with the registry', () => {
    const copy = worldMonitorCompareCopy();
    for (const claim of INVENTORY_CLAIMS) {
      claim.re.lastIndex = 0;
      const expected = claim.valueOf(stats);
      for (const match of copy.matchAll(claim.re)) {
        assert.equal(
          parseCount(match[1]),
          expected,
          `compare copy "${match[0]}" disagrees with live ${claim.label} (${expected})`,
        );
      }
    }
  });
});
