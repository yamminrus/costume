import { describe, expect, it } from 'vitest'
import { resolveState } from '../../src/parser/resolveState'

describe('resolveState', () => {
  // ── SOLID: artifact clause + vague clause → SOLID wins ────────────────────

  it('SOLID: one artifact clause and one vague clause for PROOF → SOLID', () => {
    const clauses = [
      // Artifact clause: has a non-negated number+unit artifact and PROOF keyword
      'Achieved 94.2% accuracy on the MMLU benchmark',
      // Vague clause: mentions PROOF keyword but no artifact
      'We evaluated the model carefully',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('SOLID')
  })

  it('SOLID: one artifact clause for PRICE → SOLID', () => {
    const clauses = [
      '$12 per seat per month',
      'Pricing varies by usage',
    ]
    expect(resolveState(clauses, 'PRICE')).toBe('SOLID')
  })

  // ── DECLINED: decline + vague, no artifact → DECLINED ─────────────────────

  it('DECLINED: decline clause + vague clause, no artifact, for PROOF → DECLINED', () => {
    const clauses = [
      // Named decline: names "benchmark results" for PROOF
      'We do not publish benchmark results',
      // Vague clause with no artifact
      'Testing is performed internally',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('DECLINED')
  })

  it('DECLINED: "We do not measure retention" for EDGES → DECLINED', () => {
    const clauses = [
      'We do not measure retention',
      'Usage is limited to enterprise customers only',
    ]
    expect(resolveState(clauses, 'EDGES')).toBe('DECLINED')
  })

  // ── COSTUME: vague mention, no artifact, no decline ───────────────────────

  it('COSTUME: one vague mention, no artifact, no decline → COSTUME', () => {
    const clauses = [
      // Mentions PROOF keyword "benchmark" but no artifact, no decline
      'We care about benchmark quality',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('COSTUME')
  })

  it('COSTUME: multiple vague mentions, no artifact, no decline → COSTUME', () => {
    const clauses = [
      'Accuracy is important to us',
      'We take evaluation seriously',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('COSTUME')
  })

  // ── HOLE: no clause mentions the register ─────────────────────────────────

  it('HOLE: no clause mentions PRICE → HOLE', () => {
    const clauses = [
      'We evaluate models carefully',
      'The system runs on Linux',
    ]
    expect(resolveState(clauses, 'PRICE')).toBe('HOLE')
  })

  it('HOLE: empty clause list → HOLE', () => {
    expect(resolveState([], 'WHO')).toBe('HOLE')
  })

  // ── Priority: SOLID beats DECLINED ────────────────────────────────────────

  it('SOLID beats DECLINED: artifact clause and decline clause both present → SOLID', () => {
    const clauses = [
      // decline
      'We do not publish benchmark results',
      // artifact — wins regardless
      'Achieved 94.2% accuracy on the MMLU benchmark',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('SOLID')
  })

  // ── Priority: DECLINED beats COSTUME ──────────────────────────────────────

  it('DECLINED beats COSTUME: decline and vague present, no artifact → DECLINED', () => {
    const clauses = [
      // vague mention (COSTUME level)
      'Testing is part of our process',
      // named decline
      'We do not publish benchmark results',
    ]
    expect(resolveState(clauses, 'PROOF')).toBe('DECLINED')
  })

  // ── "We make no claims" resolves to HOLE (not DECLINED) ──────────────────
  //
  // AC-P2A: blanket refusal names nothing → detectDecline returns false for all
  // registers → the clause is never a decline → if no other clause mentions the
  // register, the result is HOLE.

  it('AC-P2A: "We make no claims" alone → HOLE for WHO (not DECLINED)', () => {
    // "We make no claims" does not classify as WHO (no WHO keyword present)
    // so it never enters the relevant set → HOLE.
    expect(resolveState(['We make no claims'], 'WHO')).toBe('HOLE')
  })

  it('AC-P2A: "We make no claims" alone → HOLE for PROOF (not DECLINED)', () => {
    expect(resolveState(['We make no claims'], 'PROOF')).toBe('HOLE')
  })
})
