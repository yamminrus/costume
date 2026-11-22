import { describe, expect, it } from 'vitest'
import { classifyClause } from '../../src/parser/classifyClause'

describe('classifyClause', () => {
  // ── Spec fixtures — at least one per register ──────────────────────────────

  it('WHO: "Contact support@example.com for questions" → includes WHO', () => {
    const result = classifyClause('Contact support@example.com for questions')
    expect(result).toContain('WHO')
  })

  it('WHAT: "Converts PDF tables to CSV" → includes WHAT', () => {
    const result = classifyClause('Converts PDF tables to CSV')
    expect(result).toContain('WHAT')
  })

  it('PROOF: "Achieved 94.2% accuracy on the MMLU benchmark" → includes PROOF', () => {
    const result = classifyClause('Achieved 94.2% accuracy on the MMLU benchmark')
    expect(result).toContain('PROOF')
  })

  it('PRICE: "$12 per seat per month" → includes PRICE', () => {
    const result = classifyClause('$12 per seat per month')
    expect(result).toContain('PRICE')
  })

  it('EDGES: "Not for real-time use" → includes EDGES', () => {
    const result = classifyClause('Not for real-time use')
    expect(result).toContain('EDGES')
  })

  it('RECHECK: "Run `npm install` to reproduce" → includes RECHECK', () => {
    const result = classifyClause('Run `npm install` to reproduce')
    expect(result).toContain('RECHECK')
  })

  // ── Multi-register fixture ─────────────────────────────────────────────────

  it('clause mentioning both responsible party and pricing → returns both WHO and PRICE', () => {
    // "Contact billing@company.com for pricing information"
    // WHO: "contact", "@"   PRICE: "pricing"
    const result = classifyClause('Contact billing@company.com for pricing information')
    expect(result).toContain('WHO')
    expect(result).toContain('PRICE')
  })

  // ── Negative cases ─────────────────────────────────────────────────────────

  it('returns an empty array when no register keyword is present', () => {
    // A truly generic filler sentence with no register signal
    const result = classifyClause('The quick brown fox jumps over the lazy dog')
    expect(result).toEqual([])
  })

  // ── Additional per-register coverage ──────────────────────────────────────

  it('WHO: "Maintained by the platform team" → includes WHO', () => {
    expect(classifyClause('Maintained by the platform team')).toContain('WHO')
  })

  it('WHAT: "Supports Python 3.10 and above" → includes WHAT', () => {
    expect(classifyClause('Supports Python 3.10 and above')).toContain('WHAT')
  })

  it('PROOF: "Latency measured at p99" → includes PROOF', () => {
    expect(classifyClause('Latency measured at p99')).toContain('PROOF')
  })

  it('PRICE: "Free tier available" → includes PRICE', () => {
    expect(classifyClause('Free tier available')).toContain('PRICE')
  })

  it('EDGES: "English only" → includes EDGES', () => {
    expect(classifyClause('English only')).toContain('EDGES')
  })

  it('RECHECK: "Clone the repo and run npm install" → includes RECHECK', () => {
    expect(classifyClause('Clone the repo and run npm install')).toContain('RECHECK')
  })
})
