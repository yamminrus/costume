/**
 * scanArtifacts — find artifact tokens in a clause with negation marking.
 *
 * Six token types detected (design.md §Parser Layer §3):
 *   number+unit  — numeral adjacent to unit, currency symbol, or %
 *   date         — ISO date, YYYY-MM, or named month + four-digit year
 *   url          — http://, https://, or bare domain containing /
 *   enumeration  — two or more comma-separated or bullet-separated same-kind items
 *   named-thing  — capitalised mid-sentence token OR token ending in a file extension
 *   imperative   — clause opening with a command verb OR backtick-delimited code span
 *
 * Negation rule (AC-P1):
 *   Before marking a token non-negated, check whether a negation word
 *   (no, not, never, without, neither, nor) appears in the same clause and
 *   precedes that token within a short window (≤5 words).
 *   If governed by negation → negated: true.
 *
 * Signature: scanArtifacts(clause: string): ArtifactToken[]
 */

import type { ArtifactToken } from './types'

// ── Negation words ────────────────────────────────────────────────────────────

const NEGATION_WORDS = new Set(['no', 'not', 'never', 'without', 'neither', 'nor'])

/**
 * Decide whether a match at `matchIndex` in the clause string is governed by
 * a negation word.  A negation word governs a token if it appears within the
 * five words immediately preceding the match.
 */
function isNegated(clause: string, matchIndex: number): boolean {
  // Take the substring before the match.
  const before = clause.slice(0, matchIndex)
  // Split into words and take at most the last five.
  const words = before.trim().split(/\s+/).slice(-5)
  return words.some((w) => NEGATION_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, '')))
}

// ── Token detectors ──────────────────────────────────────────────────────────

/**
 * number+unit: a numeral (with optional commas/decimals) adjacent to a
 * unit abbreviation, currency symbol, or % sign.
 *
 * Examples: "10,000 rows", "94.2%", "$12", "12ms", "3 GB"
 */
const NUMBER_UNIT_RE =
  /(?:[$€£])[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?(?:\s?(?:%|ms|s\b|kb|mb|gb|tb|px|req\/s|rpm|k\b|m\b|b\b|rows?|seats?|months?|tokens?|requests?))/gi

/**
 * date: ISO date (YYYY-MM-DD), YYYY-MM, or named month + four-digit year.
 */
const DATE_RE =
  /\b\d{4}-\d{2}(?:-\d{2})?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi

/**
 * url: http://, https://, or a bare domain containing at least one slash.
 *
 * Bare domain pattern: word.tld/path  (avoids matching plain file extensions)
 */
const URL_RE = /https?:\/\/[^\s"'<>)]+|(?<!\w)\b(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'<>)]+/gi

/**
 * enumeration: two or more comma-separated items (at least one comma).
 * We require at least two non-trivial tokens separated by commas or " and "/ " or ".
 *
 * We use a simple heuristic: find comma-separated runs of ≥2 word-like tokens.
 */
const ENUM_RE = /(?:[A-Za-z0-9_./-]+)(?:\s*,\s*(?:[A-Za-z0-9_./-]+)){1,}/g

/**
 * named-thing: a capitalised token appearing mid-sentence (not sentence-initial),
 * or a token ending in a recognised file extension, or any capitalised token in
 * a very short clause (≤3 words — these are labels/values, not sentences).
 */
const FILE_EXT_RE = /\b\S+\.(?:csv|json|pdf|parquet|xlsx|xml|tsv|yaml|yml|txt|md|zip|gz|tar)\b/gi

/**
 * imperative: a code span (backtick-delimited) OR a clause that opens with a
 * command verb.  We detect code spans as tokens here; sentence-opening imperatives
 * are detected at the clause level.
 */
const CODE_SPAN_RE = /`[^`]+`/g

const IMPERATIVE_VERBS = new Set([
  'run',
  'execute',
  'install',
  'clone',
  'download',
  'verify',
  'reproduce',
  'see',
  'check',
  'curl',
  'wget',
  'open',
  'deploy',
  'build',
  'test',
  'update',
])

// ── Main scanner ─────────────────────────────────────────────────────────────

export function scanArtifacts(clause: string): ArtifactToken[] {
  const tokens: ArtifactToken[] = []

  // Helper: add a token, computing negation from match position.
  function add(
    type: ArtifactToken['type'],
    value: string,
    matchIndex: number,
  ): void {
    tokens.push({ type, value, negated: isNegated(clause, matchIndex) })
  }

  // 1. number+unit
  for (const m of clause.matchAll(NUMBER_UNIT_RE)) {
    add('number+unit', m[0], m.index!)
  }

  // 2. date
  for (const m of clause.matchAll(DATE_RE)) {
    add('date', m[0], m.index!)
  }

  // 3. url
  for (const m of clause.matchAll(URL_RE)) {
    add('url', m[0], m.index!)
  }

  // 4. enumeration — a comma-separated LIST, but only when the things listed
  //    are themselves artifact-like.
  //
  //    ENUM_RE matches the SHAPE of a list: two or more word-like tokens with
  //    a comma between them. That shape is also what adjective-stacking looks
  //    like, so "powerful, seamless" matched and WHAT resolved to SOLID on a
  //    clause that is pure marketing. An app built to tell a backed claim from
  //    a dressed-up one was crediting a pair of adjectives as evidence.
  //
  //    REGISTERS.md says "two or more items OF THE SAME KIND", which is too
  //    loose: adjectives are the same kind as each other. The test is tightened
  //    to require that at least ONE listed item carry something checkable --
  //    a digit, a capital letter mid-list, or a file extension. "CSV, JSON,
  //    Parquet" passes on capitals; "powerful, seamless" has none of the three
  //    and is correctly not an artifact.
  for (const m of clause.matchAll(ENUM_RE)) {
    if (!m[0].includes(',')) continue
    const items = m[0].split(',').map((x) => x.trim()).filter((x) => x.length > 0)
    if (items.length < 2) continue
    const carriesSomething = items.some(
      (item) =>
        /\d/.test(item) ||                                  // a number
        /[A-Z]/.test(item) ||                                // a proper noun or acronym
        /\.[A-Za-z0-9]{2,5}$/.test(item),                    // a file extension
    )
    if (carriesSomething) {
      add('enumeration', m[0], m.index!)
    }
  }

  // 5. named-thing
  //   a) file extension tokens
  for (const m of clause.matchAll(FILE_EXT_RE)) {
    add('named-thing', m[0], m.index!)
  }
  //   b) capitalised tokens mid-sentence
  //      Strategy: split clause into words.  Skip the very first word (sentence-
  //      initial capitals are not named-things) UNLESS the clause is very short
  //      (≤ 3 words): short clauses are labels/values where the first word IS the
  //      named thing (e.g. "English only" → "English" is the named-thing).
  {
    const words = clause.split(/\s+/)
    const isShortClause = words.length <= 3
    let charOffset = 0
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordStart = clause.indexOf(word, charOffset)
      charOffset = wordStart + word.length

      // Strip trailing punctuation for the check, keep original for value.
      const stripped = word.replace(/[^A-Za-z0-9]/g, '')
      if (stripped.length < 2) continue
      if (!/^[A-Z]/.test(stripped)) continue

      // In a long clause (>3 words), skip the first word (sentence-initial).
      if (i === 0 && !isShortClause) continue

      add('named-thing', word, wordStart)
    }
  }

  // 6. imperative
  //   a) code spans
  for (const m of clause.matchAll(CODE_SPAN_RE)) {
    add('imperative', m[0], m.index!)
  }
  //   b) clause opens with an imperative verb (first word in IMPERATIVE_VERBS)
  {
    const firstWord = clause.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
    if (firstWord && IMPERATIVE_VERBS.has(firstWord)) {
      add('imperative', clause.trim(), 0)
    }
  }

  return tokens
}
