# COSTUME — Tasks

Each task is a working, demoable increment. A task is not done until its demo criterion passes. Work in order — later tasks depend on earlier ones.

**Test framework:** Vitest. **Build:** no bundler required for early tasks; add one when the renderer needs it.

---

## Task 1 — Project scaffold and test harness

**Goal:** establish the repo layout, toolchain, and a single passing smoke test.

**Deliverables:**
- Bare `index.html` shell (title, empty body, script tag pointing to `src/main.js`)
- `package.json` with Vitest as a dev dependency
- `src/parser/` directory (empty except for a placeholder)
- `src/renderer/` directory (empty except for a placeholder)
- `tests/smoke.test.ts` with one assertion: `expect(true).toBe(true)`

**Demo:** `npx vitest run` exits with `1 passed, 0 failed`.

---

## Task 2 — Clause splitter

**Goal:** pure function that splits input text into clauses correctly.

**Signature:** `splitClauses(text: string): string[]`

**Location:** `src/parser/splitClauses.ts`

**Rules implemented:**
- Split on sentence-ending punctuation followed by whitespace + capital letter
- Split on newlines
- Do **not** split on `:`
- Do **not** split on `|`

**Fixtures (all must pass):**
- `"Latency: under 12ms"` → `["Latency: under 12ms"]` (one clause, no split)
- `"Format | CSV, JSON, Parquet"` → `["Format | CSV, JSON, Parquet"]` (one clause, no split)
- `"First sentence. Second sentence."` → `["First sentence", "Second sentence"]` (two clauses)

**Demo:** `npx vitest run tests/parser/splitClauses.test.ts` — all clause-splitting fixtures pass (AC-P3 satisfied).

---

## Task 3 — Register classifier

**Goal:** pure function that returns which registers a clause mentions.

**Signature:** `classifyClause(clause: string): Register[]`

**Location:** `src/parser/classifyClause.ts`

**Keyword data:** `src/parser/keywords.ts` — a plain object mapping each `Register` to its keyword list. No logic here, only data.

**Fixtures (at least one per register):**
- `"Contact support@example.com for questions"` → includes `'WHO'`
- `"Converts PDF tables to CSV"` → includes `'WHAT'`
- `"Achieved 94.2% accuracy on the MMLU benchmark"` → includes `'PROOF'`
- `"$12 per seat per month"` → includes `'PRICE'`
- `"Not for real-time use"` → includes `'EDGES'`
- `` "Run `npm install` to reproduce" `` → includes `'RECHECK'`
- A clause mentioning both a responsible party and pricing → returns both `'WHO'` and `'PRICE'`

**Demo:** `npx vitest run tests/parser/classifyClause.test.ts` — all register fixtures pass.

---

## Task 4 — Artifact scanner with negation rule

**Goal:** pure function that returns artifact tokens found in a clause, with negation correctly applied.

**Signature:** `scanArtifacts(clause: string): ArtifactToken[]`

**Location:** `src/parser/scanArtifacts.ts`

**Token types implemented:** all six (`number+unit`, `date`, `url`, `enumeration`, `named-thing`, `imperative`).

**Negation rule:** if a negation word (`no`, `not`, `never`, `without`, `neither`, `nor`) governs an artifact token, set `negated: true` on that token.

**Fixtures (all must pass):**
- `"We publish no latency threshold"` → all tokens have `negated: true`; no non-negated artifact (AC-P1)
- `"Tested up to 10,000 rows"` → returns a `number+unit` token with `negated: false`
- `"See results at https://example.com/report"` → returns a `url` token with `negated: false`
- `"English only"` → returns a `named-thing` token with `negated: false`

**Demo:** `npx vitest run tests/parser/scanArtifacts.test.ts` — negation fixture and all token-type fixtures pass (AC-P1 satisfied).

---

## Task 5 — Decline detector with named-decline rule

**Goal:** pure function that returns whether a clause constitutes a named decline for a given register.

**Signature:** `detectDecline(clause: string, register: Register): boolean`

**Location:** `src/parser/detectDecline.ts`

**Named-decline rule:** a decline requires both a negation word and a named specific thing for the register. A blanket refusal that names nothing returns `false`.

**Fixtures (all must pass):**
- `"We make no claims"` against any register → `false` (names nothing; resolves to HOLE, not DECLINED) (AC-P2A)
- `"We do not measure retention"` against `'EDGES'` → `true` (names "retention", maps to EDGES) (AC-P2B)
- `"There is no pricing page"` against `'PRICE'` → `false` (names a page, not a price figure; the bare noun is not the artifact)
- `"We do not publish benchmark results"` against `'PROOF'` → `true` (names "benchmark results", maps to PROOF)

**Demo:** `npx vitest run tests/parser/detectDecline.test.ts` — both named-decline fixtures pass (AC-P2 satisfied).

---

## Task 6 — State resolver with priority logic

**Goal:** pure function that resolves the state of a single register given all clauses.

**Signature:** `resolveState(clauses: string[], register: Register): State`

**Location:** `src/parser/resolveState.ts`

**Priority rule:** SOLID > DECLINED > COSTUME > HOLE.

**Fixtures (all must pass):**
- Clauses containing one artifact clause and one vague clause for the same register → `'SOLID'` (artifact wins)
- Clauses containing one decline clause and one vague clause, no artifact → `'DECLINED'` (decline beats costume)
- Clauses containing one vague mention, no artifact, no decline → `'COSTUME'`
- No clauses mentioning the register → `'HOLE'`

**Demo:** `npx vitest run tests/parser/resolveState.test.ts` — all four state outcomes covered.

---

## Task 7 — RegisterMap builder (full pipeline integration)

**Goal:** single public entry point that runs the full parser pipeline and returns a `RegisterMap`.

**Signature:** `buildRegisterMap(text: string): RegisterMap`

**Location:** `src/parser/index.ts`

**Wires:** `splitClauses` → `classifyClause` → `scanArtifacts` / `detectDecline` → `resolveState` → `RegisterMap`.

**Fixture:**
- Paste the scope statement text (`"This checks whether the evidence a claim needs is present. It does not judge whether that evidence is any good. A specification can be present and wrong and this will credit it."`) → all six registers resolve predictably and consistently across runs.

**Demo:** `npx vitest run tests/parser/buildRegisterMap.test.ts` — full-pipeline fixture passes; no register's state is random between runs.

---

## Task 8 — Static WebGL figure (hard-coded SOLID state)

**Goal:** render the six-part figure in the correct anatomy, all parts lit and opaque, as a baseline for all subsequent render work.

**Location:** `src/renderer/figure.ts`

**Six parts rendered in correct positions:**
- Mask (WHO) — upper face area
- Costume body (WHAT) — torso
- Hands / carried object (PROOF) — hands and what they hold
- Ground and shadow (PRICE) — base plane and cast shadow
- Silhouette (EDGES) — outer edge of the figure
- Mirror to the right (RECHECK) — smaller figure, same anatomy, positioned right

**Visual constants (named, not magic numbers):**
- `LIGHT_COLOR` — warm light source colour
- `GROUND_COLOR` — dark ground colour
- `AMBIENT_LEVEL` — ambient light intensity

**Demo:** open `index.html` in a browser and see a complete, fully-lit figure with all six parts visible and correctly placed. No parser wired yet; state is hard-coded to SOLID for all registers.

---

## Task 9 — Connect parser to renderer (live state rendering)

**Goal:** wire the textarea input through the full parser pipeline to the WebGL figure so each part reflects its register's resolved state.

**Changes:**
- `index.html` — textarea with placeholder, triggers `buildRegisterMap` on input
- `src/main.ts` — listens for textarea input, calls `buildRegisterMap`, passes `RegisterMap` to `updateFigure(map: RegisterMap)`
- `src/renderer/figure.ts` — implement `updateFigure` to apply the correct visual per state:
  - SOLID: lit, opaque
  - COSTUME: translucent, fabric shader
  - DECLINED: absent, clean outline only
  - HOLE: gap, glowing edge shader

**Demo:** paste a vague marketing paragraph (no artifacts, no numbers, no names) into the textarea — all or most parts go translucent or absent. Paste the clause `"Achieved 94.2% accuracy on the MMLU benchmark"` — the PROOF part lights up solid.

---

## Task 10 — Scroll reveal animation

**Goal:** on scroll, COSTUME-state parts peel off one at a time from outermost inward; SOLID parts do not change.

**Implementation notes:**
- Track scroll position; map scroll distance to a "reveal stage" index.
- At each stage, transition the next outermost COSTUME part from translucent to absent.
- SOLID parts remain unchanged throughout.
- HOLE and DECLINED parts do not change on scroll (they were never costume).

**Demo:** paste a document where most registers are COSTUME. Scroll down — parts dissolve one by one. What remains at the bottom is the SOLID subset. The RECHECK mirror follows the RECHECK register state throughout.

---

## Task 11 — RECHECK mirror

**Goal:** the mirror figure to the right is fully functional and driven by the RECHECK register state.

**Implementation notes:**
- The mirror is already scaffolded in Task 8. This task makes it state-responsive.
- When RECHECK is HOLE: mirror renders as a glowing outlined gap.
- When RECHECK is COSTUME: mirror renders translucent.
- When RECHECK is DECLINED: mirror renders as a clean outline.
- When RECHECK is SOLID: mirror renders lit and opaque.

**Demo:** paste a document with no imperative or link that a reader could follow — RECHECK resolves to HOLE — the mirror shows as a glowing gap. Add `"Run npm install to reproduce"` — RECHECK resolves to SOLID — the mirror lights up.

---

## Task 12 — Scope statement and acceptance criteria verification

**Goal:** ship the scope statement in the UI and verify all three acceptance criteria from `requirements.md`.

**Deliverables:**
- Scope statement rendered as visible UI text on page load (not a tooltip, not a footer, not a hover state):

  > This checks whether the evidence a claim needs is **present**. It does not judge whether that evidence is any good. A specification can be present and wrong and this will credit it.

**Acceptance criteria checklist (all must pass before this task is done):**

| Criterion | Check |
|---|---|
| HR-01: grades documents only | Confirm no label, tooltip, placeholder, or example mentions a person being scored |
| HR-02: no private-work vocabulary | Run `tools/gate_no_ecosystem_vocabulary.py` — must exit 0 |
| HR-03: scope statement visible on load | Open `index.html` with no interaction — scope text is immediately visible |
| AC-P1: negation rule | `npx vitest run` — negation fixture passes |
| AC-P2: named-decline rule | `npx vitest run` — both decline fixtures pass |
| AC-P3: clause-splitting rule | `npx vitest run` — both clause fixtures pass |
| Deterministic parser | Run `buildRegisterMap` on the same input twice — identical output |

**Demo:** open the app in a browser — scope statement is immediately visible without scrolling or interaction. Run `npx vitest run` — all parser unit tests pass.

---

## Task 13 — Gate hook and deploy

**Goal:** gate runs automatically on save; the app is live on GitHub Pages.

**Deliverables:**
- Kiro on-save hook configured to run `tools/gate_cycle.sh`
- `gate_cycle.sh` passes on a clean working tree (no ecosystem code, no private-work vocabulary, no `.kiro/` excluded from git)
- App deployed to GitHub Pages
- Submission live URL verified in browser (loads without errors, WebGL figure renders, scope statement visible)

**Demo:** make a trivial edit and save — Kiro hook runs `gate_cycle.sh` and passes. Open the GitHub Pages URL — the app loads and works end-to-end.
