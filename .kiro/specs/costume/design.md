# COSTUME — Design

**Derived from:** `REGISTERS.md`, `CONCEPT.md`, and `requirements.md`. This document answers "how is it built?" — the requirements document answers "what does it do?".

---

## Architecture

Single HTML file plus a small JS module bundle. Zero server round-trips. The application works offline once loaded.

Two layers, strictly separated:

- **`parser/`** — pure functions with no DOM or canvas dependency. Fully unit-testable with plain string fixtures. No side effects.
- **`renderer/`** — WebGL figure. Consumes a `RegisterMap` and produces pixels. Visual-inspection only; no headless canvas tests.

### Data Flow

```mermaid
flowchart LR
    A[Pasted text] --> B[Clause splitter]
    B --> C[Register classifier]
    C --> D[Artifact scanner]
    D --> E[State resolver\nSOLID > DECLINED > COSTUME > HOLE]
    E --> F[RegisterMap\n{WHO,WHAT,PROOF,PRICE,EDGES,RECHECK} × State]
    F --> G[WebGL figure renderer]
    F --> H[RECHECK mirror renderer]
```

The `RegisterMap` is the single hand-off point between layers. The parser produces it; the renderer consumes it. Nothing else crosses the boundary.

---

## Data Model

```typescript
type State    = 'SOLID' | 'DECLINED' | 'COSTUME' | 'HOLE'
type Register = 'WHO' | 'WHAT' | 'PROOF' | 'PRICE' | 'EDGES' | 'RECHECK'
type RegisterMap = Record<Register, State>

type ArtifactToken = {
  type: 'number+unit' | 'date' | 'url' | 'enumeration' | 'named-thing' | 'imperative'
  value: string
  negated: boolean
}

type ClauseAnalysis = {
  text: string
  registers: Register[]
  artifacts: ArtifactToken[]
  isDecline: boolean
  declineNames: Register[]   // populated only when isDecline === true and a specific thing is named
}
```

---

## Parser Layer

### 1. Clause Splitter

**Signature:** `splitClauses(text: string): string[]`

**Split on:**
- Sentence-ending punctuation (`.`, `!`, `?`) followed by whitespace and a capital letter
- Newline characters (`\n`)

**Do NOT split on:**
- `:` — a spec table row is `Latency: under 12ms`; splitting it severs the register keyword from its own artifact
- `|` — a table cell is `Format | CSV, JSON, Parquet`; splitting severs register from enumeration

**Rationale:** getting this wrong makes every well-documented page score worse than a vague one, inverting the entire result. The colon and pipe rules are not preferences — they are correctness requirements.

### 2. Register Classifier

**Signature:** `classifyClause(clause: string): Register[]`

Each clause is scored against all six registers independently. A clause may return multiple registers.

**Keyword lists per register:**

| Register | Signal patterns |
|---|---|
| WHO | "responsible", "contact", "maintained by", "owned by", "author", "support@", email patterns, bare domains that identify an organisation or person |
| WHAT | action verbs with bounded objects: "converts", "runs on", "supports", "processes", "generates", "exports to", version strings, OS names, file format names |
| PROOF | "benchmark", "test", "dataset", "measured", "latency", "accuracy", "f1", "precision", "recall", number+unit patterns, URLs containing `/results`, `/report`, `/paper` |
| PRICE | "$", "€", "£", "cost", "price", "pricing", "free", "per seat", "per request", "per token", "per month", "no charge", "tokens", "credits" |
| EDGES | "not for", "only", "limited to", "up to", "requires", "minimum", "maximum", "english only", "no support for", "tested up to", "does not support", "exclusion", "limitation" |
| RECHECK | "run", "execute", "download", "clone", "git", "pip install", "npm install", "curl", "wget", "see", "verify", "reproduce", code spans, URLs to downloadable assets |

**Implementation note:** keyword lists are data, not logic. Keep them in a separate `keywords.ts` constant file so they can be audited and extended without touching the classifier function.

### 3. Artifact Scanner

**Signature:** `scanArtifacts(clause: string): ArtifactToken[]`

Scanned per clause, not per document. An artifact three paragraphs away does not back a given sentence.

**Six token types (from `REGISTERS.md §3`):**

| Token type | Detection pattern |
|---|---|
| `number+unit` | A numeral adjacent to a unit, currency symbol, or `%` |
| `date` | ISO date, `YYYY-MM`, or a named month with a four-digit year |
| `url` | `http://`, `https://`, or a bare domain containing `/` |
| `enumeration` | Two or more comma-separated or bullet-separated items of the same grammatical kind |
| `named-thing` | A capitalised token appearing mid-sentence, or a token ending in a file extension (`.csv`, `.json`, `.pdf`, etc.) |
| `imperative` | A clause opening with a verb in command form, or a code span (backtick-delimited) |

**Negation check:**

Before marking a token as a non-negated artifact, check whether a negation word appears in the same clause and governs that token. Negation words: `no`, `not`, `never`, `without`, `neither`, `nor`.

- If governed by negation → set `negated: true` on the token. This token does **not** count toward SOLID or COSTUME resolution.
- Negation does **not** suppress decline detection. The decline test runs independently on the full clause text.

**Fixture (AC-P1):** `"We publish no latency threshold"` → the token "threshold" is a `named-thing`, but governed by "no" → `negated: true` → does not credit PROOF.

### 4. Decline Detector

**Signature:** `detectDecline(clause: string, register: Register): boolean`

A decline counts only when it **names what it declines**. The named-decline rule is a gate, not a hint.

**Algorithm:**
1. Check if the clause contains a negation word.
2. If yes, check whether the clause also contains a register-specific keyword (from the classifier keyword list) **and** whether that keyword refers to a specific named thing rather than a blanket assertion.
3. Return `true` only if both conditions hold.

**Fixture (AC-P2A):** `"We make no claims"` → contains negation ("no"), but names nothing specific for any register → `false` for all registers → resolves as HOLE, not DECLINED.

**Fixture (AC-P2B):** `"We do not measure retention"` against register EDGES → contains negation ("not"), names a specific thing ("retention") that maps to EDGES → `true` → resolves as DECLINED.

### 5. State Resolver

**Signature:** `resolveState(clauses: string[], register: Register): State`

**Algorithm (per register):**

1. Filter to clauses that mention the register (via `classifyClause`).
2. For each such clause, run `scanArtifacts` and `detectDecline`.
3. Apply priority rules:
   - If **any** clause carries at least one non-negated artifact → **SOLID**
   - Else if **any** clause has `detectDecline(..., register) === true` → **DECLINED**
   - Else if **any** clause was classified as mentioning this register (keyword match, no artifact, no decline) → **COSTUME**
   - Else (no clause mentions this register) → **HOLE**

**Priority rationale (record for reviewers):**
- SOLID beats DECLINED: a register with any real artifact is backed, regardless of vaguer mentions elsewhere in the same document.
- DECLINED beats COSTUME: a document that both names a thing loosely (COSTUME) and explicitly declines it (DECLINED) is honest about the absence. DECLINED is the more informative signal.
- COSTUME beats HOLE: the register was at least mentioned, which is distinct from silence.

### 6. RegisterMap Builder

**Signature:** `buildRegisterMap(text: string): RegisterMap`

Wires the full pipeline:

```
splitClauses(text)
  → for each register: resolveState(clauses, register)
  → RegisterMap
```

This is the only public entry point the renderer calls.

---

## Renderer Layer

### Figure Anatomy

Register-to-figure-part mapping (from `REGISTERS.md §4`):

| Register | Figure part |
|---|---|
| WHO | The mask |
| WHAT | The costume body |
| PROOF | What the hands carry |
| PRICE | The ground and shadow |
| EDGES | The silhouette |
| RECHECK | The mirror to the right |

### State Visual Treatment

| State | Visual |
|---|---|
| SOLID | Lit, opaque, full weight — the part exists and is paid for |
| COSTUME | Translucent — fabric-textured, nobody inside |
| DECLINED | Absent, cleanly outlined — a deliberate gap that costs nothing |
| HOLE | A gap with a glowing edge — unacknowledged absence |

### RECHECK Mirror

The RECHECK register renders as a separate, smaller figure to the right of the main figure. It shows the same anatomy from behind. Its state is driven solely by the RECHECK register value in the `RegisterMap`.

When RECHECK is HOLE, the mirror is a glowing outlined gap — the reader has no way to verify the claim independently.

### Scroll Reveal Animation

On scroll, costume layers peel off one at a time, from outermost inward:

1. Parts in COSTUME state dissolve first (translucent → absent).
2. Parts in HOLE state pulse their glow edge.
3. Parts in DECLINED state remain as clean outlines throughout.
4. Parts in SOLID state do not change — they were never costume.

**The image to aim for:** a confident, beautiful, fully-dressed figure that turns out to be nine-tenths fabric. Beside it, a small, plain figure that is entirely solid. Nobody needs that explained.

### Aesthetic Constraints

- Dark ground. One warm light source. Both defined as named constants in the renderer — not magic numbers — so the look can be reproduced rather than tweaked.
- No horror clichés, no blood, no jump scares. The unsettling thing is the truth; dressing it as a haunted house undercuts it.
- The scope statement (FR-15) is rendered as UI text, visually integrated with the figure — not a footer, not a tooltip.

---

## Testing Strategy

### Parser layer

Framework: Vitest (runs without a DOM, integrates with the same toolchain as the build).

Tests are plain string-in / value-out assertions. No mocking, no DOM, no canvas. The full fixture set from the requirements acceptance criteria must be covered:

- All three clause-splitting fixtures (AC-P3)
- Both negation fixtures (AC-P1)
- Both named-decline fixtures (AC-P2)
- At least one fixture per register for the classifier
- At least one artifact fixture per token type
- A full-pipeline fixture using the scope statement text itself

### Render layer

Visual inspection only. No headless canvas tests, no WebGL unit tests. The render layer is tested by opening `index.html` in a browser and verifying the figure looks correct.

### Gate integration

`tools/gate_cycle.sh` runs both `tools/selftest_no_ecosystem_code.py` and `tools/gate_no_ecosystem_vocabulary.py`. A Kiro on-save hook triggers `gate_cycle.sh` automatically so the gate never goes unrun.

---

## Deployment

GitHub Pages from the repo root (or a `dist/` output directory). No build server, no CI/CD pipeline required. The submission live URL points to the Pages deployment.
