import { describe, expect, it } from 'vitest'
import { scanArtifacts } from '../../src/parser/scanArtifacts'
import type { ArtifactToken } from '../../src/parser/types'

describe('scanArtifacts', () => {
  // ── AC-P1: negation rule ───────────────────────────────────────────────────

  it('AC-P1: "We publish no latency threshold" → all tokens have negated: true; no non-negated artifact', () => {
    // "threshold" is a named-thing governed by "no"
    const tokens = scanArtifacts('We publish no latency threshold')
    // There must be no token with negated: false
    const nonNegated = tokens.filter((t) => !t.negated)
    expect(nonNegated).toHaveLength(0)
    // There must be at least one token (so the test is not trivially passing on empty)
    // "threshold" should be detected as named-thing (capitalised or common noun)
    // and "latency" may also be detected; both must be negated.
    // We only assert the negation property — the fixture does not require a specific count.
    for (const tok of tokens) {
      expect(tok.negated).toBe(true)
    }
  })

  // ── number+unit ───────────────────────────────────────────────────────────

  it('number+unit: "Tested up to 10,000 rows" → returns a number+unit token with negated: false', () => {
    const tokens = scanArtifacts('Tested up to 10,000 rows')
    const match = tokens.find((t) => t.type === 'number+unit')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
    expect(match!.value).toMatch(/10,000/)
  })

  it('number+unit: "94.2% accuracy" → returns a number+unit token', () => {
    const tokens = scanArtifacts('Achieved 94.2% accuracy on the MMLU benchmark')
    const match = tokens.find((t) => t.type === 'number+unit')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  it('number+unit: "$12 per seat per month" → returns a number+unit token', () => {
    const tokens = scanArtifacts('$12 per seat per month')
    const match = tokens.find((t) => t.type === 'number+unit')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  // ── url ───────────────────────────────────────────────────────────────────

  it('url: "See results at https://example.com/report" → returns a url token with negated: false', () => {
    const tokens = scanArtifacts('See results at https://example.com/report')
    const match = tokens.find((t) => t.type === 'url')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
    expect(match!.value).toMatch(/https:\/\/example\.com\/report/)
  })

  it('url: negated url → negated: true', () => {
    const tokens = scanArtifacts('There is no https://example.com/report available')
    const match = tokens.find((t) => t.type === 'url')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(true)
  })

  // ── named-thing ───────────────────────────────────────────────────────────

  it('named-thing: "English only" → returns a named-thing token with negated: false', () => {
    // "English" is a capitalised mid-sentence token (it is the first word here,
    // but as a proper noun it would also be expected). The spec fixture is
    // "English only" → named-thing, negated: false.
    // Since "English" is the first word, we check for "only" or treat the
    // whole phrase as a named-thing.  The spec says the token should be present.
    const tokens = scanArtifacts('English only')
    // Accept either "English" detected as named-thing or "only" — the key
    // requirement is that a named-thing token exists and is not negated.
    // Given the clause has no negation word the negated property must be false.
    const match = tokens.find((t) => t.type === 'named-thing')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  it('named-thing: capitalised mid-sentence token', () => {
    const tokens = scanArtifacts('Runs on Linux and Windows')
    const namedThings = tokens.filter((t) => t.type === 'named-thing')
    // "Linux" and/or "Windows" are mid-sentence capitalised tokens
    expect(namedThings.length).toBeGreaterThanOrEqual(1)
    for (const t of namedThings) {
      expect(t.negated).toBe(false)
    }
  })

  it('named-thing: file extension token', () => {
    const tokens = scanArtifacts('Output is written to report.csv')
    const match = tokens.find((t) => t.type === 'named-thing' && t.value.endsWith('.csv'))
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  // ── date ──────────────────────────────────────────────────────────────────

  it('date: ISO date "2024-03-15" → returns a date token', () => {
    const tokens = scanArtifacts('Published on 2024-03-15')
    const match = tokens.find((t) => t.type === 'date')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  it('date: YYYY-MM "2024-03" → returns a date token', () => {
    const tokens = scanArtifacts('Released in 2024-03')
    const match = tokens.find((t) => t.type === 'date')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  it('date: named month + year → returns a date token', () => {
    const tokens = scanArtifacts('Evaluated in March 2024')
    const match = tokens.find((t) => t.type === 'date')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  // ── enumeration ───────────────────────────────────────────────────────────

  it('enumeration: "CSV, JSON, Parquet" → returns an enumeration token', () => {
    const tokens = scanArtifacts('Supports CSV, JSON, Parquet')
    const match = tokens.find((t) => t.type === 'enumeration')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  // ── imperative ────────────────────────────────────────────────────────────

  it('imperative: backtick code span → returns an imperative token', () => {
    const tokens = scanArtifacts('Run `npm install` to reproduce')
    const match = tokens.find((t) => t.type === 'imperative')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  it('imperative: clause opening with command verb → returns an imperative token', () => {
    const tokens = scanArtifacts('Download the dataset from the link below')
    const match = tokens.find((t) => t.type === 'imperative')
    expect(match).toBeDefined()
    expect(match!.negated).toBe(false)
  })

  // ── Negation governs token regardless of position in clause ───────────────

  it('negation: "No benchmark results available" → named-thing token is negated', () => {
    const tokens = scanArtifacts('No benchmark results available')
    // "benchmark" is a named-thing (capitalised? no — but "results" may be caught)
    // The important thing: any token present should be negated (negation at start)
    for (const tok of tokens) {
      expect(tok.negated).toBe(true)
    }
  })

  // ── AC-P1, made non-vacuous ────────────────────────────────────────────
  //
  // Two tests above assert over tokens WITHOUT first asserting that any token
  // exists: `filter(t => !t.negated)` on an empty array has length 0, and a
  // `for` loop over an empty array runs zero assertions. Both pass with the
  // negation rule ENTIRELY DISABLED. Proven by planting `negated: false` on
  // every token: 81 of 82 tests stayed green.
  //
  // "We publish no latency threshold" produces ZERO tokens, because
  // "threshold" is correctly not a named-thing under the artifact definitions
  // in REGISTERS.md. The implementation is right; the fixture was never a
  // test. These two replace it as the actual guard.

  it('AC-P1 (guarded): a negated clause with a REAL artifact marks it negated', () => {
    const tokens = scanArtifacts('We publish no latency numbers under 12ms')
    expect(tokens.length).toBeGreaterThan(0)            // the fixture must bite
    expect(tokens.filter((t) => !t.negated)).toHaveLength(0)
  })

  it('AC-P1 (control): the same clause WITHOUT negation is not marked negated', () => {
    const tokens = scanArtifacts('We publish latency numbers under 12ms')
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.some((t) => !t.negated)).toBe(true)
  })
})
