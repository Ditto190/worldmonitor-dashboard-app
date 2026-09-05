// Shared shape rules for the frozen "Recent developments" rows (#7615), used
// by the freeze on the way in (scripts/freeze-crawlable-live-pulse.mjs) and by
// the corpus build on the way out (scripts/build-crawlable-corpus.mjs), so a
// snapshot frozen before a rule existed renders under the same rule as one
// frozen after it.
//
// Plain .mjs with no repo imports: the freeze runs under bare `node`.

// Briefs need at least this many distinct grounding headlines before the
// freeze requests one and before the corpus publishes one (#7748 item 3). A
// 24/48/72h outlook synthesised from a single article is a confident
// multi-horizon forecast off one source — a trust liability on a YMYL page.
// Below the floor the page keeps its dated headline and drops the brief.
export const MIN_BRIEF_GROUNDING_SOURCES = 2;

// The five-section contract get-country-intel-brief prompts for, in order.
// Mirrors SECTION_HEADERS in src/utils/format-intel-brief.ts.
export const BRIEF_SECTION_HEADERS = Object.freeze([
  'SITUATION NOW',
  'WHAT THIS MEANS FOR',
  'KEY RISKS',
  'OUTLOOK',
  'WATCH ITEMS',
]);

const BULLET_RE = /^[•\-]\s+/;
const OUTLOOK_ROW_RE = /^NEXT \d+H:/;
// "WHAT THIS MEANS FOR NO" — the server interpolated the ISO code where the
// name belongs (#7738). Repaired only when the code is this page's own code,
// so a brief that genuinely discusses another country is left alone.
const BARE_CODE_HEADING_RE = /^(WHAT THIS MEANS FOR)\s+([A-Z]{2})\s*:?$/;

export function isBriefSectionHeader(line) {
  const upper = String(line || '').trim().toUpperCase();
  return upper.length > 0 && BRIEF_SECTION_HEADERS.some((header) => upper.startsWith(header));
}

export function isBriefBullet(line) {
  return BULLET_RE.test(String(line || '').trim());
}

export function isBriefOutlookRow(line) {
  return OUTLOOK_ROW_RE.test(String(line || '').trim());
}

export function stripBriefBullet(line) {
  return String(line || '').trim().replace(BULLET_RE, '');
}

/**
 * Plain-text form of a generated brief:
 * - markdown emphasis markers removed (the model writes `**entity**`; the
 *   corpus injects text, so the markers rendered literally — #7738);
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
    .replace(/\*\*/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));
  const firstHeader = lines.findIndex((line) => isBriefSectionHeader(line));
  const body = firstHeader > 0 ? lines.slice(firstHeader) : lines;
  const repaired = body.map((line) => {
    const match = line.trim().match(BARE_CODE_HEADING_RE);
    if (!match || !code || !name || match[2] !== code) return line;
    return `${match[1]} ${name.toUpperCase()}`;
  });
  return repaired.join('\n').trim();
}

/** Non-empty trimmed lines of a brief, the unit both the renderer and the render guard work in. */
export function briefTextLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Apply the publish-time rules to one frozen developments row. Returns a new
 * object; the input is never mutated. Rows without a brief pass through with
 * only the shape preserved.
 */
export function normalizeFrozenDevelopments(developments, { countryCode = '', countryName = '' } = {}) {
  if (!developments || typeof developments !== 'object') return developments;
  const brief = developments.brief && typeof developments.brief === 'object' ? developments.brief : null;
  if (!brief) return { ...developments };
  const sources = Array.isArray(brief.sources) ? brief.sources : [];
  if (sources.length < MIN_BRIEF_GROUNDING_SOURCES) {
    return { ...developments, brief: null, briefSkipped: 'thin-grounding' };
  }
  return {
    ...developments,
    brief: { ...brief, text: normalizeBriefText(brief.text, { countryCode, countryName }) },
  };
}
