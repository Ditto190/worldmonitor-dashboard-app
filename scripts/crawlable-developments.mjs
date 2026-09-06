// Shared shape rules for the frozen "Recent developments" rows (#7615), used
// by the freeze on the way in (scripts/freeze-crawlable-live-pulse.mjs) and by
// the corpus build on the way out (scripts/build-crawlable-corpus.mjs), so a
// snapshot frozen before a rule existed renders under the same rule as one
// frozen after it.
//
// Plain .mjs importing only plain-JS shared modules: the freeze runs under
// bare `node`.

import { publisherFamilyFor } from '../shared/publisher-families.js';
const BRIEF_SECTION_HEADERS = ['SITUATION NOW', 'WHAT THIS MEANS FOR', 'KEY RISKS', 'OUTLOOK', 'WATCH ITEMS'];

function isBriefSectionHeader(line) {
  const upper = String(line || '').trim().toUpperCase();
  return BRIEF_SECTION_HEADERS.some((header) => upper.startsWith(header));
}

// Briefs need grounding from at least this many DISTINCT PUBLISHERS before
// the freeze requests one and before the corpus publishes one (#7748 item
// 3). A 24/48/72h outlook synthesised from one outlet is a confident
// multi-horizon forecast off one source — a trust liability on a YMYL page —
// and three articles from one newsroom are still one outlet: the count reads
// publisher families (shared/publisher-families.js, #6428), never raw source
// labels. Below the floor the page keeps its dated headlines and drops the
// brief.
export const MIN_BRIEF_GROUNDING_PUBLISHERS = 2;

// Public suffixes with a second level ("co.uk", "com.au", "co.nz"): the
// registrable domain is the third label from the right, not the second.
// A full public-suffix list is overkill for a floor whose failure direction
// is "count one site twice"; these are the shapes news hosts actually take.
const SECOND_LEVEL_SUFFIX_LABELS = new Set(['ac', 'co', 'com', 'edu', 'go', 'gov', 'mil', 'ne', 'net', 'or', 'org']);

/** Registrable domain of an article URL ("www.bbc.co.uk/…" → "bbc.co.uk"), or '' when unparseable. */
export function registrableDomain(url) {
  let hostname = '';
  try {
    hostname = new URL(String(url || '').trim()).hostname.toLowerCase().replace(/\.+$/, '');
  } catch {
    return '';
  }
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  const take = tld.length === 2 && SECOND_LEVEL_SUFFIX_LABELS.has(second) ? 3 : 2;
  return labels.slice(-take).join('.');
}

/**
 * Distinct publishers across a list of frozen rows (headlines or brief
 * sources). Labels resolve through the family table (shared/publisher-
 * families.js), and rows published on one site are one publisher whatever
 * their labels say: a digest row labelled "Guardian ME" and a GDELT index
 * row labelled "theguardian.com" (#7748) are the same newsroom, and the
 * floor must not clear on it twice.
 */
export function briefGroundingPublisherCount(rows) {
  if (!Array.isArray(rows)) return 0;
  const parent = new Map();
  const find = (id) => {
    let current = id;
    for (;;) {
      const next = parent.get(current);
      if (next === undefined || next === current) return current;
      current = next;
    }
  };
  const familyBySite = new Map();
  for (const row of rows) {
    const family = publisherFamilyFor(row?.source);
    if (!family) continue;
    if (!parent.has(family)) parent.set(family, family);
    const site = registrableDomain(row?.url);
    if (!site) continue;
    const sharing = familyBySite.get(site);
    if (!sharing) {
      familyBySite.set(site, family);
      continue;
    }
    const a = find(family);
    const b = find(sharing);
    if (a !== b) parent.set(a, b);
  }
  return new Set([...parent.keys()].map(find)).size;
}

/** True when the rows ground a brief: at least MIN_BRIEF_GROUNDING_PUBLISHERS distinct publishers. */
export function hasBriefGrounding(rows) {
  return briefGroundingPublisherCount(rows) >= MIN_BRIEF_GROUNDING_PUBLISHERS;
}

// "WHAT THIS MEANS FOR NO" — the server interpolated the ISO code where the
// name belongs (#7738). Repaired only when the code is this page's own code,
// so a brief that genuinely discusses another country is left alone.
const BARE_CODE_HEADING_RE = /^(WHAT THIS MEANS FOR)\s+([A-Z]{2})\s*:?$/i;
// Markdown the model emits and the corpus injects as text: bold/italic
// marker pairs and ATX heading hashes. Kept as a list so the next marker is
// one entry, not a new guard (the first round pinned `**` alone).
const MARKDOWN_MARKERS_RE = /\*\*|__/g;
const MARKDOWN_HEADING_RE = /^#{1,6}\s+/;

/**
 * Plain-text form of a generated brief:
 * - markdown emphasis markers and heading hashes removed (the model writes
 *   `**entity**`; the corpus injects text, so the markers rendered literally
 *   — #7738);
 * - any preamble before the first contract section dropped ("INTELLIGENCE
 *   BRIEF: GE (GEORGIA) / CLASSIFICATION: CONFIDENTIAL" is model theatre, not
 *   content, and must not reach a public page);
 * - the "WHAT THIS MEANS FOR <CODE>" heading repaired to the country name.
 * Idempotent: normalizing normalized text is a no-op.
 */
export function normalizeBriefText(text, { countryCode = '', countryName = '' } = {}) {
  const code = String(countryCode || '').trim().toUpperCase();
  const name = String(countryName || '').trim();
  const lines = String(text || '')
    .replace(MARKDOWN_MARKERS_RE, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/, '').replace(MARKDOWN_HEADING_RE, ''));
  const firstHeader = lines.findIndex((line) => isBriefSectionHeader(line));
  // Theatre carries no citations. A lead the model wrote under its own
  // header name ("CURRENT SITUATION ... [1]") is content, so a preamble with
  // a [n] citation anywhere is kept whole rather than guessed at.
  const preambleIsTheatre = firstHeader > 0
    && !lines.slice(0, firstHeader).some((line) => /\[\d+\]/.test(line));
  const body = preambleIsTheatre ? lines.slice(firstHeader) : lines;
  const repaired = body.map((line) => {
    const match = line.trim().match(BARE_CODE_HEADING_RE);
    if (!match || !code || !name || match[2].toUpperCase() !== code) return line;
    return `${match[1].toUpperCase()} ${name.toUpperCase()}`;
  });
  return repaired.join('\n').trim();
}

// True when the frozen developments carry at least one dated, sourced item:
// a headline, a brief, or a timeline event. The dated-absence shape
// (headlines: [], brief: null, timeline: [] or null) does not count. One
// predicate for the freeze's coverage counters and the corpus's tripwire.
export function developmentsHasDatedItem(developments) {
  if (!developments || typeof developments !== 'object') return false;
  if (Array.isArray(developments.headlines) && developments.headlines.length > 0) return true;
  if (developments.brief && typeof developments.brief.text === 'string' && developments.brief.text.trim()) return true;
  return Array.isArray(developments.timeline) && developments.timeline.length > 0;
}

/** Markdown emphasis markers removed from one published display string; non-strings pass through. */
export function stripMarkdownMarkers(value) {
  return typeof value === 'string' ? value.replace(MARKDOWN_MARKERS_RE, '') : value;
}

function stripRowMarkers(row, fields) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const field of fields) out[field] = stripMarkdownMarkers(out[field]);
  return out;
}

/**
 * Apply the publish-time rules to one frozen developments row. Returns a new
 * object; the input is never mutated. Every string the page renders is
 * cleared of markdown markers — headline and source titles, timeline titles
 * and summaries — not only the brief, because the build guard reads the
 * whole <main> and one marker in a timeline summary would otherwise fail a
 * complete weekly capture. Rows without a brief keep their shape.
 */
export function normalizeFrozenDevelopments(developments, { countryCode = '', countryName = '' } = {}) {
  if (!developments || typeof developments !== 'object') return developments;
  const cleaned = {
    ...developments,
    headlines: Array.isArray(developments.headlines)
      ? developments.headlines.map((row) => stripRowMarkers(row, ['title']))
      : developments.headlines,
    timeline: Array.isArray(developments.timeline)
      ? developments.timeline.map((row) => stripRowMarkers(row, ['title', 'summary']))
      : developments.timeline,
  };
  const brief = developments.brief && typeof developments.brief === 'object' ? developments.brief : null;
  if (!brief) return cleaned;
  // A malformed sources field is not thin grounding, it is a broken row:
  // hand it back untouched so the renderer's shape validation reds the build
  // instead of this rule quietly withholding it.
  const malformedSources = !Array.isArray(brief.sources)
    || brief.sources.some((row) => typeof row?.source !== 'string' || !row.source.trim());
  if (malformedSources) return { ...cleaned, brief };
  if (!hasBriefGrounding(brief.sources)) {
    return { ...cleaned, brief: null, briefSkipped: 'thin-grounding' };
  }
  return {
    ...cleaned,
    brief: {
      ...brief,
      text: normalizeBriefText(brief.text, { countryCode, countryName }),
      sources: Array.isArray(brief.sources)
        ? brief.sources.map((row) => stripRowMarkers(row, ['title']))
        : brief.sources,
    },
  };
}
