/**
 * index.ts — public entry point for the COSTUME parser layer.
 *
 * Exports a single function: buildRegisterMap(text: string): RegisterMap
 *
 * Wires the full pipeline:
 *   splitClauses → for each register: resolveState → RegisterMap
 *
 * This is the only function the renderer calls.  Everything below this point
 * is an implementation detail of the parser layer.
 */

import type { Register, RegisterMap } from './types'
import { splitClauses } from './splitClauses'
import { resolveState } from './resolveState'

/** All six registers in a stable iteration order. */
const ALL_REGISTERS: readonly Register[] = [
  'WHO',
  'WHAT',
  'PROOF',
  'PRICE',
  'EDGES',
  'RECHECK',
]

/**
 * Run the full parser pipeline on the given text and return a RegisterMap.
 *
 * The result is deterministic: the same input always produces the same output
 * because every step in the pipeline is a pure function.
 */
export function buildRegisterMap(text: string): RegisterMap {
  const clauses = splitClauses(text)

  const map = {} as RegisterMap
  for (const register of ALL_REGISTERS) {
    map[register] = resolveState(clauses, register)
  }

  return map
}
