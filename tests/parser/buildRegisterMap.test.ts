import { describe, expect, it } from 'vitest'
import { buildRegisterMap } from '../../src/parser/index'

/**
 * The scope statement text from the spec (design.md §RegisterMap Builder fixture).
 * Used as the canonical full-pipeline fixture.
 */
const SCOPE_STATEMENT =
  'This checks whether the evidence a claim needs is present. ' +
  'It does not judge whether that evidence is any good. ' +
  'A specification can be present and wrong and this will credit it.'

describe('buildRegisterMap', () => {
  // ── Full-pipeline fixture: scope statement text ────────────────────────────

  it('scope statement: returns a RegisterMap with all six registers', () => {
    const map = buildRegisterMap(SCOPE_STATEMENT)
    const expectedKeys = ['WHO', 'WHAT', 'PROOF', 'PRICE', 'EDGES', 'RECHECK']
    for (const key of expectedKeys) {
      expect(map).toHaveProperty(key)
    }
  })

  it('scope statement: every state value is one of the four valid states', () => {
    const map = buildRegisterMap(SCOPE_STATEMENT)
    const validStates = new Set(['SOLID', 'DECLINED', 'COSTUME', 'HOLE'])
    for (const [, state] of Object.entries(map)) {
      expect(validStates.has(state)).toBe(true)
    }
  })

  it('scope statement: result is deterministic across multiple calls', () => {
    const map1 = buildRegisterMap(SCOPE_STATEMENT)
    const map2 = buildRegisterMap(SCOPE_STATEMENT)
    const map3 = buildRegisterMap(SCOPE_STATEMENT)
    expect(map1).toEqual(map2)
    expect(map2).toEqual(map3)
  })

  it('scope statement: all six registers resolve predictably and consistently', () => {
    // Run twice and assert both runs agree — this is the "no randomness" requirement.
    const runA = buildRegisterMap(SCOPE_STATEMENT)
    const runB = buildRegisterMap(SCOPE_STATEMENT)
    const registers = ['WHO', 'WHAT', 'PROOF', 'PRICE', 'EDGES', 'RECHECK'] as const
    for (const reg of registers) {
      expect(runA[reg]).toBe(runB[reg])
    }
  })

  // ── Smoke tests for individual register wiring ────────────────────────────

  it('PROOF register is SOLID when an accuracy benchmark is present', () => {
    const map = buildRegisterMap(
      'Achieved 94.2% accuracy on the MMLU benchmark. Results at https://example.com/report',
    )
    expect(map.PROOF).toBe('SOLID')
  })

  it('PRICE register is SOLID when a price figure is present', () => {
    const map = buildRegisterMap('$12 per seat per month.')
    expect(map.PRICE).toBe('SOLID')
  })

  it('PROOF register is HOLE for a document with no PROOF signal', () => {
    const map = buildRegisterMap('Contact support@company.com for questions.')
    expect(map.PROOF).toBe('HOLE')
  })

  it('all registers are HOLE for an empty input', () => {
    const map = buildRegisterMap('')
    expect(map.WHO).toBe('HOLE')
    expect(map.WHAT).toBe('HOLE')
    expect(map.PROOF).toBe('HOLE')
    expect(map.PRICE).toBe('HOLE')
    expect(map.EDGES).toBe('HOLE')
    expect(map.RECHECK).toBe('HOLE')
  })

  it('EDGES register is DECLINED when the document explicitly declines retention', () => {
    const map = buildRegisterMap(
      'This tool processes text. We do not measure retention.',
    )
    expect(map.EDGES).toBe('DECLINED')
  })

  it('PROOF register is DECLINED when benchmark results are explicitly declined', () => {
    const map = buildRegisterMap(
      'We do not publish benchmark results. Internal evaluation is ongoing.',
    )
    expect(map.PROOF).toBe('DECLINED')
  })

  // ── "We make no claims" does not produce a DECLINED for any register ──────
  //
  // AC-P2A end-to-end: blanket refusal resolves as HOLE for any register that
  // has no other mention — not as DECLINED.

  it('AC-P2A (pipeline): "We make no claims" → no register is DECLINED', () => {
    const map = buildRegisterMap('We make no claims.')
    // None of the registers should be DECLINED — they should be HOLE.
    // (The sentence has no register-specific keywords so it classifies as nothing.)
    expect(map.WHO).not.toBe('DECLINED')
    expect(map.WHAT).not.toBe('DECLINED')
    expect(map.PROOF).not.toBe('DECLINED')
    expect(map.PRICE).not.toBe('DECLINED')
    expect(map.EDGES).not.toBe('DECLINED')
    expect(map.RECHECK).not.toBe('DECLINED')
  })

  // ── "We publish no latency threshold" does not produce SOLID for any register
  //
  // AC-P1 end-to-end: negated artifact → does not credit PROOF

  it('AC-P1 (pipeline): "We publish no latency threshold" → PROOF is not SOLID', () => {
    const map = buildRegisterMap('We publish no latency threshold.')
    expect(map.PROOF).not.toBe('SOLID')
  })
})
