/**
 * splitClauses — split text into clauses for the parser pipeline.
 *
 * Split rules (from design.md §Parser Layer §1):
 *   SPLIT on sentence-ending punctuation (. ! ?) followed by whitespace + capital letter.
 *   SPLIT on newline characters.
 *
 *   DO NOT split on `:` — a spec row like "Latency: under 12ms" must stay whole
 *   so the register keyword and its artifact stay together.
 *
 *   DO NOT split on `|` — a table cell like "Format | CSV, JSON, Parquet" must
 *   stay whole so the register keyword and its enumeration stay together.
 *
 * Empty strings (produced by consecutive newlines, trailing punctuation, etc.)
 * are filtered out before returning.
 */
export function splitClauses(text: string): string[] {
  // Step 1: split on newlines.
  const byNewline = text.split('\n')

  // Step 2: within each newline-separated chunk, split on sentence-ending
  // punctuation followed by whitespace + capital letter.
  //
  // Regex breakdown:
  //   ([.!?])   — capture the punctuation (kept with the left side via lookahead)
  //   (?=\s+[A-Z]) — lookahead: followed by whitespace then a capital letter
  //
  // Using a lookahead preserves the capital letter (it is not consumed), and
  // the punctuation stays on the left side because we split on the zero-width
  // position after it, not on the character itself — achieved here by splitting
  // on the position between the punctuation and the whitespace.
  //
  // Concretely: split at the boundary between [.!?] and the following \s+[A-Z],
  // keeping the punctuation attached to the clause that ends with it.
  const sentenceBreak = /(?<=[.!?])\s+(?=[A-Z])/

  const clauses: string[] = []
  for (const chunk of byNewline) {
    const parts = chunk.split(sentenceBreak)
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.length > 0) {
        clauses.push(trimmed)
      }
    }
  }

  return clauses
}
