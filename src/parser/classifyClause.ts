/**
 * classifyClause — return the registers a clause mentions.
 *
 * Each clause is scored against all six registers independently.
 * A clause may return multiple registers.
 *
 * Keyword data lives in keywords.ts; no logic lives there.
 *
 * Signature (from design.md §Parser Layer §2):
 *   classifyClause(clause: string): Register[]
 */

import type { Register } from './types'
import { KEYWORDS, VAGUE } from './keywords'

/** All six registers in a stable order (used internally for iteration). */
const ALL_REGISTERS: readonly Register[] = [
  'WHO',
  'WHAT',
  'PROOF',
  'PRICE',
  'EDGES',
  'RECHECK',
]

/**
 * Returns the list of registers signalled by the given clause.
 * The comparison is case-insensitive.
 * Returns an empty array if no register keyword matches.
 */
export function classifyClause(clause: string): Register[] {
  const lower = clause.toLowerCase()
  const matched: Register[] = []

  for (const register of ALL_REGISTERS) {
    // A register is MENTIONED if either vocabulary matches. KEYWORDS is
    // artifact-adjacent and VAGUE is deliberately not, so the mention test
    // and the evidence test downstream read different signals. Sharing one
    // signal between them is what made COSTUME unreachable: a register could
    // only be seen to be claimed when it was already backed.
    const concrete = KEYWORDS[register].some((kw) => lower.includes(kw))
    const vague = VAGUE[register].some((kw) => lower.includes(kw))
    if (concrete || vague) {
      matched.push(register)
    }
  }

  return matched
}
