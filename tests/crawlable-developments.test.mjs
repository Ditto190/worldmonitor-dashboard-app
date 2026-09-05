import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BRIEF_SECTION_HEADERS,
  briefTextLines,
  isBriefBullet,
  isBriefOutlookRow,
  isBriefSectionHeader,
  MIN_BRIEF_GROUNDING_SOURCES,
  normalizeBriefText,
  normalizeFrozenDevelopments,
  stripBriefBullet,
} from '../scripts/crawlable-developments.mjs';

// Shapes taken from the 2026-09-04 frozen snapshot: 32 of 40 briefs carried
// `**` markers, 23 carried the ISO code in the "WHAT THIS MEANS FOR" heading,
// and Georgia's opened with an "INTELLIGENCE BRIEF / CLASSIFICATION:
// CONFIDENTIAL" preamble (#7738, #7748).
const NORWAY_RAW = [
  'SITUATION NOW',
  'Norway’s $2 trillion fund proposed cutting U.S. Treasury holdings [1][2].',
  '',
  'WHAT THIS MEANS FOR NO',
  '• **Norges Bank Investment Management (NBIM)**: Proposed slashing of holdings — billions moved [1][2].',
  '• **Norwegian krone**: could strengthen temporarily.',
  '',
  'KEY RISKS',
  '- **Retaliation**: Moscow may respond.',
  '',
  'OUTLOOK',
  'NEXT 24H: Pushback from U.S. Treasury officials.',
  'NEXT 48H: Security measures in the Barents Sea.',
  '',
  'WATCH ITEMS',
  'NBIM announcement · Russian maritime declarations',
].join('\n');

const GEORGIA_RAW = [
  '**INTELLIGENCE BRIEF: GE (GEORGIA)**',
  '**DATE:** 2026-09-04',
  '**CLASSIFICATION:** CONFIDENTIAL',
  '',
  '**SITUATION NOW**',
  'Georgia faces an energy inflection point [1].',
  '',
  '**WHAT THIS MEANS FOR GE**',
  '- **Black Sea Petroleum terminal:** cessation of Russian crude processing.',
].join('\n');

describe('normalizeBriefText', () => {
  it('strips markdown emphasis, keeps structure, and repairs the coded heading', () => {
    const text = normalizeBriefText(NORWAY_RAW, { countryCode: 'NO', countryName: 'Norway' });
    assert.ok(!text.includes('**'));
    assert.ok(text.includes('WHAT THIS MEANS FOR NORWAY'));
    assert.ok(!/\bFOR NO\b/.test(text));
    assert.ok(text.startsWith('SITUATION NOW\n'));
    assert.ok(text.includes('• Norges Bank Investment Management (NBIM): Proposed slashing'));
    assert.ok(text.includes('NEXT 24H: Pushback'));
    assert.ok(text.endsWith('NBIM announcement · Russian maritime declarations'));
  });

  it('drops a model preamble before the first contract section', () => {
    const text = normalizeBriefText(GEORGIA_RAW, { countryCode: 'GE', countryName: 'Georgia' });
    assert.ok(text.startsWith('SITUATION NOW\n'), `preamble must go, got: ${text.slice(0, 40)}`);
    assert.ok(!text.includes('CLASSIFICATION'));
    assert.ok(!text.includes('INTELLIGENCE BRIEF'));
    assert.ok(text.includes('WHAT THIS MEANS FOR GEORGIA'));
  });

  it('keeps a brief that has no contract sections at all', () => {
    const prose = 'Two paragraphs of plain analysis [1].\n\nSecond paragraph.';
    assert.equal(normalizeBriefText(prose, { countryCode: 'NO', countryName: 'Norway' }), prose);
  });

  it('repairs the heading only for the page country and only when a name is known', () => {
    const foreign = normalizeBriefText('WHAT THIS MEANS FOR SD\n• item', { countryCode: 'NO', countryName: 'Norway' });
    assert.ok(foreign.includes('WHAT THIS MEANS FOR SD'), 'another country code is not this page’s to rewrite');
    const unnamed = normalizeBriefText('WHAT THIS MEANS FOR NO\n• item', { countryCode: 'NO', countryName: '' });
    assert.ok(unnamed.includes('WHAT THIS MEANS FOR NO'), 'without a name there is nothing to repair with');
    const trailing = normalizeBriefText('WHAT THIS MEANS FOR ES  \n• item', { countryCode: 'ES', countryName: 'Spain' });
    assert.ok(trailing.includes('WHAT THIS MEANS FOR SPAIN'));
    const named = normalizeBriefText('WHAT THIS MEANS FOR NORWAY\n• item', { countryCode: 'NO', countryName: 'Norway' });
    assert.ok(named.includes('WHAT THIS MEANS FOR NORWAY'));
  });

  it('is idempotent', () => {
    const once = normalizeBriefText(NORWAY_RAW, { countryCode: 'NO', countryName: 'Norway' });
    assert.equal(normalizeBriefText(once, { countryCode: 'NO', countryName: 'Norway' }), once);
  });
});

describe('brief line classifiers', () => {
  it('recognises the five contract headers case-insensitively', () => {
    for (const header of BRIEF_SECTION_HEADERS) {
      assert.equal(isBriefSectionHeader(header), true);
      assert.equal(isBriefSectionHeader(`${header} NORWAY`), true);
      assert.equal(isBriefSectionHeader(header.toLowerCase()), true);
    }
    assert.equal(isBriefSectionHeader('Convoys move under escort.'), false);
    assert.equal(isBriefSectionHeader(''), false);
  });

  it('classifies bullets and outlook rows', () => {
    assert.equal(isBriefBullet('• Port Sudan: closed'), true);
    assert.equal(isBriefBullet('- Port Sudan: closed'), true);
    assert.equal(isBriefBullet('Port Sudan - closed'), false);
    assert.equal(stripBriefBullet('• Port Sudan: closed'), 'Port Sudan: closed');
    assert.equal(stripBriefBullet('- Port Sudan: closed'), 'Port Sudan: closed');
    assert.equal(isBriefOutlookRow('NEXT 24H: quiet'), true);
    assert.equal(isBriefOutlookRow('NEXT week: quiet'), false);
    assert.deepEqual(briefTextLines('a\n\n  b  \n'), ['a', 'b']);
  });
});

describe('normalizeFrozenDevelopments', () => {
  const source = (n) => ({
    title: `Story ${n}`,
    source: 'Wire',
    url: `https://example.test/${n}`,
    publishedAt: '2026-09-02T10:00:00.000Z',
  });
  const brief = (sources) => ({
    text: 'SITUATION NOW\n**Bold** claim [1].\n\nWHAT THIS MEANS FOR SD\n• item',
    model: 'm',
    generatedAt: '2026-09-02T12:00:00.000Z',
    sources,
  });

  it('withholds a brief grounded on fewer than the floor and records why', () => {
    assert.equal(MIN_BRIEF_GROUNDING_SOURCES, 2);
    const row = { headlines: [source(1)], brief: brief([source(1)]), timeline: [], briefSkipped: null };
    const out = normalizeFrozenDevelopments(row, { countryCode: 'SD', countryName: 'Sudan' });
    assert.equal(out.brief, null);
    assert.equal(out.briefSkipped, 'thin-grounding');
    assert.deepEqual(out.headlines, row.headlines, 'the dated headline stays');
    assert.equal(row.brief !== null, true, 'the input is not mutated');
  });

  it('normalizes the text of a sufficiently grounded brief and keeps its sources', () => {
    const row = { headlines: [source(1), source(2)], brief: brief([source(1), source(2)]), timeline: [], briefSkipped: null };
    const out = normalizeFrozenDevelopments(row, { countryCode: 'SD', countryName: 'Sudan' });
    assert.equal(out.briefSkipped, null);
    assert.equal(out.brief.sources.length, 2);
    assert.ok(!out.brief.text.includes('**'));
    assert.ok(out.brief.text.includes('WHAT THIS MEANS FOR SUDAN'));
    assert.equal(out.brief.generatedAt, '2026-09-02T12:00:00.000Z');
  });

  it('passes rows without a brief through unchanged', () => {
    const row = { headlines: [], brief: null, timeline: null, briefSkipped: 'no-grounding' };
    assert.deepEqual(normalizeFrozenDevelopments(row, { countryCode: 'PW', countryName: 'Palau' }), row);
    assert.equal(normalizeFrozenDevelopments(null, {}), null);
    assert.equal(normalizeFrozenDevelopments(undefined, {}), undefined);
  });
});
