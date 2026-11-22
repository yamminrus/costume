/**
 * resolveState — resolve the state of a single register given all clauses.
 *
 * Priority rule (design.md §Parser Layer §5):
 *   SOLID > DECLINED > COSTUME > HOLE
 *
 * Algorithm:
 *   1. Filter to clauses that mention the register (via classifyClause).
 *   2. For each such clause, run scanArtifacts and detectDecline.
 *   3. Apply priority:
 *      - Any clause carries ≥1 non-negated artifact → SOLID
 *      - Any clause has detectDecline(clause, register) === true → DECLINED
 *      - Any clause was classified as mentioning the register (no artifact, no decline) → COSTUME
 *      - No clause mentions the register → HOLE
 *
 * Signature: resolveState(clauses: string[], register: Register): State
 */

import type { Register, State } from './types'
import { classifyClause } from './classifyClause'
import { scanArtifacts } from './scanArtifacts'
import { detectDecline } from './detectDecline'

export function resolveState(clauses: string[], register: Register): State {
  // Collect clauses that mention this register.
  const relevant = clauses.filter((c) => classifyClause(c).includes(register))

  if (relevant.length === 0) {
    return 'HOLE'
  }

  let hasDecline = false
  let hasCostume = false

  for (const clause of relevant) {
    // Check for at least one non-negated artifact → SOLID (highest priority).
    const artifacts = scanArtifacts(clause)
    const nonNegated = artifacts.filter((a) => !a.negated)
    if (nonNegated.length > 0) {
      return 'SOLID'
    }

    // Check for a named decline.
    if (detectDecline(clause, register)) {
      hasDecline = true
    } else {
      // Clause mentions the register but has no artifact and is not a decline.
      hasCostume = true
    }
  }

  if (hasDecline) return 'DECLINED'
  if (hasCostume) return 'COSTUME'

  // Fallback (all relevant clauses were declines with no costume mentions).
  return 'DECLINED'
}
