import { describe, expect, it } from 'vitest'
import { detectDecline } from '../../src/parser/detectDecline'
import type { Register } from '../../src/parser/types'

describe('detectDecline', () => {
  // ── AC-P2A: blanket refusal that names nothing → false for all registers ──

  it('AC-P2A: "We make no claims" → false for WHO', () => {
    expect(detectDecline('We make no claims', 'WHO')).toBe(false)
  })

  it('AC-P2A: "We make no claims" → false for WHAT', () => {
    expect(detectDecline('We make no claims', 'WHAT')).toBe(false)
  })

  it('AC-P2A: "We make no claims" → false for PROOF', () => {
    expect(detectDecline('We make no claims', 'PROOF')).toBe(false)
  })

  it('AC-P2A: "We make no claims" → false for PRICE', () => {
    expect(detectDecline('We make no claims', 'PRICE')).toBe(false)
  })

  it('AC-P2A: "We make no claims" → false for EDGES', () => {
    expect(detectDecline('We make no claims', 'EDGES')).toBe(false)
  })

  it('AC-P2A: "We make no claims" → false for RECHECK', () => {
    expect(detectDecline('We make no claims', 'RECHECK')).toBe(false)
  })

  // ── AC-P2B: named decline for EDGES ───────────────────────────────────────

  it('AC-P2B: "We do not measure retention" against EDGES → true', () => {
    expect(detectDecline('We do not measure retention', 'EDGES')).toBe(true)
  })

  // ── "There is no pricing page" against PRICE → false ──────────────────────
  //
  // "pricing page" names a web page, not a price figure.
  // The bare noun "page" is not the artifact the PRICE register tracks.

  it('"There is no pricing page" against PRICE → false (names a page, not a price figure)', () => {
    expect(detectDecline('There is no pricing page', 'PRICE')).toBe(false)
  })

  // Sanity: the same clause against WHAT should also be false
  it('"There is no pricing page" against WHAT → false', () => {
    expect(detectDecline('There is no pricing page', 'WHAT')).toBe(false)
  })

  // ── Named decline for PROOF ───────────────────────────────────────────────

  it('"We do not publish benchmark results" against PROOF → true', () => {
    expect(detectDecline('We do not publish benchmark results', 'PROOF')).toBe(true)
  })

  // ── DECLINED does not fire on the wrong register ──────────────────────────

  it('"We do not measure retention" against PROOF → false (retention maps to EDGES, not PROOF)', () => {
    expect(detectDecline('We do not measure retention', 'PROOF')).toBe(false)
  })

  it('"We do not publish benchmark results" against PRICE → false', () => {
    expect(detectDecline('We do not publish benchmark results', 'PRICE')).toBe(false)
  })

  // ── No negation → false even with an artifact keyword ─────────────────────

  it('no negation word → false even if artifact keyword is present', () => {
    // "We publish benchmark results" — no negation, not a decline
    expect(detectDecline('We publish benchmark results', 'PROOF')).toBe(false)
  })

  // ── Additional named declines ─────────────────────────────────────────────

  it('"There is no billing model" against PRICE → true', () => {
    expect(detectDecline('There is no billing model', 'PRICE')).toBe(true)
  })

  it('"We do not provide latency measurements" against PROOF → true', () => {
    expect(detectDecline('We do not provide latency measurements', 'PROOF')).toBe(true)
  })

  it('"We never share the reproduction steps" against RECHECK → true', () => {
    expect(detectDecline('We never share the reproduction steps', 'RECHECK')).toBe(true)
  })
})
