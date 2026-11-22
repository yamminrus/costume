/**
 * Shared type definitions for the COSTUME parser layer.
 *
 * These types define the data model that flows through the pipeline:
 *   splitClauses → classifyClause → scanArtifacts / detectDecline → resolveState → RegisterMap
 */

/** The six registers that COSTUME evaluates. */
export type Register = 'WHO' | 'WHAT' | 'PROOF' | 'PRICE' | 'EDGES' | 'RECHECK'

/** The four possible states a register can be in after resolution. */
export type State = 'SOLID' | 'DECLINED' | 'COSTUME' | 'HOLE'

/** The single hand-off point between the parser layer and the renderer layer. */
export type RegisterMap = Record<Register, State>

/** An artifact token found within a single clause. */
export type ArtifactToken = {
  /** Structural kind of the artifact. */
  type: 'number+unit' | 'date' | 'url' | 'enumeration' | 'named-thing' | 'imperative'
  /** The matched text. */
  value: string
  /** True if a negation word governs this token in the same clause. */
  negated: boolean
}

/** Per-clause analysis record (used internally by the pipeline). */
export type ClauseAnalysis = {
  text: string
  registers: Register[]
  artifacts: ArtifactToken[]
  isDecline: boolean
  /** Populated only when isDecline === true and a specific thing is named. */
  declineNames: Register[]
}
