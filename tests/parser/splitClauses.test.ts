import { describe, expect, it } from 'vitest'
import { splitClauses } from '../../src/parser/splitClauses'

describe('splitClauses', () => {
  // ── Spec fixtures (AC-P3) ──────────────────────────────────────────────────

  it('does not split on colon: "Latency: under 12ms" stays as one clause', () => {
    const result = splitClauses('Latency: under 12ms')
    expect(result).toEqual(['Latency: under 12ms'])
  })

  it('does not split on pipe: "Format | CSV, JSON, Parquet" stays as one clause', () => {
    const result = splitClauses('Format | CSV, JSON, Parquet')
    expect(result).toEqual(['Format | CSV, JSON, Parquet'])
  })

  it('splits two sentences separated by period + space + capital', () => {
    const result = splitClauses('First sentence. Second sentence.')
    expect(result).toEqual(['First sentence.', 'Second sentence.'])
  })

  // ── Extra test: proves the colon rule is active, not just passing by luck ──
  //
  // This test constructs a clause where the only potential split point is a
  // colon followed by a capital letter.  If the colon rule were removed and
  // the splitter instead split on any punctuation-before-capital pattern, it
  // would return two items.  The test therefore FAILS if the colon rule is
  // removed, proving the rule rather than merely asserting it.

  it('does not split on colon even when followed directly by a capital letter', () => {
    // "Throughput: Maximum 1 000 req/s" — colon is immediately followed by a
    // capital M.  Without the colon rule a naive splitter would break here.
    const input = 'Throughput: Maximum 1000 req/s'
    const result = splitClauses(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(input)
  })

  // ── Additional behavioural tests ───────────────────────────────────────────

  it('splits on newline', () => {
    const result = splitClauses('Line one\nLine two')
    expect(result).toEqual(['Line one', 'Line two'])
  })

  it('splits on exclamation mark + space + capital', () => {
    const result = splitClauses('Watch out! Danger ahead.')
    expect(result).toEqual(['Watch out!', 'Danger ahead.'])
  })

  it('splits on question mark + space + capital', () => {
    const result = splitClauses('Is this safe? Yes it is.')
    expect(result).toEqual(['Is this safe?', 'Yes it is.'])
  })

  it('returns an empty array for an empty string', () => {
    expect(splitClauses('')).toEqual([])
  })

  it('returns a single element for a string with no split points', () => {
    const input = 'No split points here at all'
    expect(splitClauses(input)).toEqual([input])
  })

  it('trims leading and trailing whitespace from each clause', () => {
    const result = splitClauses('  First sentence.  Second sentence.  ')
    expect(result[0]).toBe('First sentence.')
    expect(result[1]).toBe('Second sentence.')
  })

  it('does not split on a period followed by a lowercase letter', () => {
    // "supports csv." — period then lowercase: no split.
    const result = splitClauses('This tool supports csv. output formats are configurable.')
    // First part ends at "csv." — next word is lowercase "output", so NO split.
    expect(result).toHaveLength(1)
  })
})
