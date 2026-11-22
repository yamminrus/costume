/**
 * detectDecline — return whether a clause constitutes a named decline for a register.
 *
 * Named-decline rule (design.md §Parser Layer §4):
 *   A decline counts only when it NAMES what it declines.
 *   The algorithm:
 *     1. Check if the clause contains a negation word.
 *     2. Check whether the clause also contains a register-specific ARTIFACT keyword
 *        (a word that names the kind of thing the register tracks, not merely a
 *        context word that happens to mention the domain).
 *     3. Return true only if both conditions hold.
 *
 * Critical distinction (spec fixture):
 *   "There is no pricing page" against PRICE → false.
 *     "pricing" is present, but the noun being declined is "page" — a container,
 *     not a price figure.  The artifact keyword list for PRICE must contain terms
 *     that name price figures themselves, not every word that touches the domain.
 *
 * Signature: detectDecline(clause: string, register: Register): boolean
 */

import type { Register } from './types'

/** Negation words (same set as scanArtifacts). */
const NEGATION_WORDS = new Set(['no', 'not', 'never', 'without', 'neither', 'nor'])

/**
 * Artifact-level keywords per register.
 *
 * These are terms that name the kind of thing the register actually tracks —
 * not general domain words.  A clause must contain one of these (along with a
 * negation word) to count as a named decline.
 *
 * Contrast with the full keyword lists in keywords.ts, which are broader and
 * used for classification (any mention counts).  For decline detection we need
 * specificity: "pricing page" contains "pricing" but declines a page, not a
 * price — so "pricing" alone is NOT in PRICE's artifact keyword list.
 */
const ARTIFACT_KEYWORDS: Record<Register, readonly string[]> = {
  WHO: [
    'contact',
    'author',
    'maintainer',
    'owner',
    'responsible party',
    'point of contact',
  ],

  WHAT: [
    'feature',
    'functionality',
    'capability',
    'conversion',
    'integration',
    'format support',
    'support for',
    'version',
  ],

  PROOF: [
    'benchmark',
    'benchmark results',
    'test results',
    'evaluation',
    'measurement',
    'accuracy',
    'f1',
    'precision',
    'recall',
    'latency',
    'dataset',
    'metric',
  ],

  PRICE: [
    // A decline for PRICE must name a price figure or pricing model — not just
    // a page that contains prices.  "pricing page" → not a decline.
    // "pricing model", "cost", "price", "fee", "charge", "rate" → are declines.
    'cost',
    'fee',
    'charge',
    'rate',
    'per seat',
    'per request',
    'per token',
    'per month',
    'subscription',
    'billing',
    'pricing model',
    'price list',
    'price point',
    // NOTE: bare "pricing" is intentionally ABSENT — "pricing page" must not match.
    // "no pricing model" → matches "pricing model"; "no pricing page" → no match.
  ],

  EDGES: [
    'retention',
    'real-time',
    'real time',
    'language support',
    'offline',
    'streaming',
    'concurrency',
    'throughput',
    'sla',
    'uptime',
    'availability',
    'scale',
    'limit',
    'maximum',
    'minimum',
    'support for',
    'use case',
  ],

  RECHECK: [
    'reproduction',
    'repro',
    'instructions',
    'steps',
    'source',
    'code',
    'repository',
    'repo',
    'link',
    'download',
  ],
}

/** Return true if any negation word is present in the clause (case-insensitive). */
function hasNegation(clauseLower: string): boolean {
  // Split into tokens, strip punctuation, check for negation words.
  return clauseLower.split(/\s+/).some((w) => NEGATION_WORDS.has(w.replace(/[^a-z]/g, '')))
}

/**
 * Return true if the clause names a specific artifact for the given register.
 * Uses the artifact-level keyword list (stricter than the classifier list).
 */
function namesSpecificArtifact(clauseLower: string, register: Register): boolean {
  return ARTIFACT_KEYWORDS[register].some((kw) => clauseLower.includes(kw))
}

/**
 * Detect whether a clause constitutes a named decline for the given register.
 *
 * Returns true only when:
 *   - The clause contains a negation word, AND
 *   - The clause names a specific artifact-level thing for this register.
 *
 * A blanket assertion like "We make no claims" names nothing specific for any
 * register and therefore returns false for all registers.
 */
export function detectDecline(clause: string, register: Register): boolean {
  const lower = clause.toLowerCase()
  return hasNegation(lower) && namesSpecificArtifact(lower, register)
}
