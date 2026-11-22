import { describe, it, expect } from 'vitest'
import { buildRegisterMap } from '../../src/parser/index'
import type { Register } from '../../src/parser/types'

/**
 * COSTUME must be reachable for every register.
 *
 * Before the VAGUE vocabulary existed, four of six registers could never
 * reach COSTUME: the mention test only matched artifact-adjacent words, so a
 * register was seen as claimed only when it was already evidenced. A page of
 * pure marketing prose was reported as SILENT about its claims rather than as
 * making unbacked ones -- which is the HOLE/COSTUME confusion, and it is the
 * exact error the app exists to catch.
 *
 * Each case below is paired. The vague phrasing must be COSTUME and the
 * evidenced phrasing must be SOLID. Without the SOLID half, a fix that simply
 * marked everything COSTUME would pass.
 */
const PAIRS: ReadonlyArray<{ register: Register; vague: string; solid: string }> = [
  {
    register: 'WHO',
    vague: 'Our team of experts built this',
    solid: 'Maintained by Jane Okafor, contact support@example.com',
  },
  {
    register: 'WHAT',
    vague: 'A powerful, seamless platform for modern teams',
    solid: 'Converts PDF tables to CSV and runs on macOS 13 and later',
  },
  {
    register: 'PROOF',
    vague: 'Proven and trusted by thousands of customers',
    solid: 'Achieved 94.2% accuracy on the MMLU benchmark',
  },
  {
    register: 'PRICE',
    vague: 'Affordable pricing that scales with you',
    solid: '$12 per seat per month',
  },
  {
    register: 'EDGES',
    vague: 'Some limitations may apply',
    solid: 'Not for real-time use, and tested up to 10,000 rows',
  },
  {
    register: 'RECHECK',
    vague: 'Contact sales to learn more',
    solid: 'Run `npm install` to reproduce the result',
  },
]

describe('COSTUME is reachable for every register', () => {
  for (const { register, vague, solid } of PAIRS) {
    it(`${register}: a vague claim is COSTUME, not HOLE`, () => {
      const map = buildRegisterMap(vague) as Record<Register, string>
      expect(map[register]).toBe('COSTUME')
    })

    it(`${register}: CONTROL -- an evidenced claim is still SOLID`, () => {
      const map = buildRegisterMap(solid) as Record<Register, string>
      expect(map[register]).toBe('SOLID')
    })
  }

  it('CONTROL: an empty document is HOLE everywhere, so COSTUME is not the default', () => {
    const map = buildRegisterMap('') as Record<Register, string>
    for (const value of Object.values(map)) {
      expect(value).toBe('HOLE')
    }
  })

  it('CONTROL: unrelated prose does not mark every register COSTUME', () => {
    const map = buildRegisterMap(
      'The weather in Porto is mild in June and the trams run along the river.',
    ) as Record<Register, string>
    const costumed = Object.values(map).filter((v) => v === 'COSTUME')
    expect(costumed.length).toBeLessThanOrEqual(1)
  })
})
