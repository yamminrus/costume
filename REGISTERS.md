# The register set, and what counts as an artifact

**Input for the Kiro session, 2026-11-02.** This is the domain content: the
part an agent cannot derive from a prompt. It is deliberately **not** a Kiro
spec: no `requirements.md`, no `design.md`, no `tasks.md`. Those get generated
in the session, from this, because how the spec was arrived at is itself
scored.

---

## 0 · Hard refuses, before anything else

These are not preferences. `tools/gate_no_ecosystem_vocabulary.py` enforces
them and runs in `gate_cycle.sh` before any commit.

1. **This grades documents. Never a person.** No surface, label, tooltip,
   placeholder or example may score, rank or rate a human being.
2. **No private-work vocabulary on the shipped page.** The gate holds the list.
3. **The scope statement ships in the UI**, not just in a readme. See §5.

---

## 1 · The six registers

A claim is a figure in costume. Each register is a part of that figure, and
each part is either worn or paid for.

| register | the question it asks | the costume failure |
|---|---|---|
| **WHO** | who is accountable for this | "our team", "industry leaders" |
| **WHAT** | what it does, bounded | "powerful", "seamless", "next-generation" |
| **PROOF** | how you know | "proven", "trusted by thousands" |
| **PRICE** | what it takes from the reader | "affordable", "get started free" with no terms |
| **EDGES** | where it stops working | silence, which reads as "everywhere" |
| **RECHECK** | how the reader verifies it alone | "contact us to learn more" |

Six because the figure needs distinguishable parts and more than six stops
being an image. The names are plain English on purpose: a register the reader
has to learn is a register they will not use.

### WHO
**Artifact:** a resolvable name: a person, a named organisation, an email, or
a URL that identifies someone.
**Not an artifact:** "our team", "we", "experts", a logo alone.

### WHAT
**Artifact:** a verb plus a bounded object. "Converts PDF tables to CSV."
"Runs on macOS 13 and later."
**Not an artifact:** adjectives without an object. A sentence whose only
content is positive affect. If removing every adjective leaves nothing, the
register is costume.

### PROOF
The strongest register, and the one most often worn rather than paid for.
**Artifact, any one of:** a number with a unit; a dated measurement; a named
benchmark, dataset or test; a URL to a result; a reproducible command.
**Not an artifact:** "proven", "validated", "best in class", a customer count
with no source, a percentage with no denominator.

### PRICE
**Artifact:** a figure with a unit (money, time, tokens, requests, seats), or
an explicit "no cost" **with the terms that make it true**.
**Not an artifact:** "affordable", "free" standing alone, "starts at" with no
number.

### EDGES
**Artifact:** a named condition, a stated bound, or an enumerated exclusion.
"Not for real-time use." "Tested up to 10,000 rows." "English only."
**Not an artifact:** "some limitations apply". An empty EDGES is the most
common hole in real documents, and the one that misleads most, because silence
about limits reads as absence of limits.

### RECHECK
**Artifact:** an imperative the reader can follow: a command, a reproduction
step, a link to method, a downloadable sample.
**Not an artifact:** "contact sales", "request a demo", "read more".

---

## 2 · Four states, and the one that carries the whole idea

| state | condition | visual |
|---|---|---|
| **SOLID** | named **and** carries an artifact | lit, opaque, has weight |
| **COSTUME** | named, no artifact | translucent: fabric with nobody in it |
| **DECLINED** | openly refused, and says what is refused | absent, cleanly outlined, **costs nothing** |
| **HOLE** | never mentioned at all | a gap, glowing at its edge |

**DECLINED is not a HOLE, and this distinction is the product.**

A document that says "we do not publish latency numbers" has made a decision.
It can be argued with. It pays nothing here.

A document that simply never mentions latency has a hole wearing the same
clothes. The reader cannot tell whether it was considered and rejected or
never thought about, and most tools in this space cannot either.

If the build gets only one thing right, it is this.

---

## 3 · Parser rules: deterministic, no model call

### Artifact tokens
Scanned per clause, not per document, because an artifact three paragraphs
away does not back this sentence.

| token | pattern in plain terms |
|---|---|
| number + unit | a figure adjacent to a unit, currency, or % |
| date | ISO, or month-year, or a named month with a year |
| URL | http/https, or a bare domain with a path |
| enumeration | two or more comma- or bullet-separated items of the same kind |
| named thing | a capitalised token mid-sentence, or one ending in a file extension |
| imperative | a clause opening with a verb in command form, or a code span |

### Two rules that are easy to get wrong, and wrong is silent

**The negation rule.** A clause containing the word for a thing is not
evidence of the thing. *"We publish no latency threshold"* contains
"threshold". A naive artifact test credits it and the document's own
confession of absence scores as presence. **So: negation vetoes the artifact
test.** It must not veto the decline test, because a decline is phrased with a
negative by its nature.

**The decline rule.** A decline counts only when it **names what it
declines**. *"We do not measure retention"* is a decline of a specific thing.
*"We make no claims"* names nothing and is a hole with better manners. The
bare noun is not the thing: *"there is no pricing page"* must not credit
PRICE.

### Clause splitting
Split on sentence boundaries, and on newlines. **Do not split on `:` or `|`**:
a spec table row is `Latency: under 12ms`, and splitting it severs the register
from its own artifact. Getting this wrong makes every well-documented page
score worse than a vague one, which would invert the entire result.

---

## 4 · The visual, since Design and Presentation are forty percent

One figure, centre screen, built from the six registers.

| register | part of the figure |
|---|---|
| WHO | the mask |
| WHAT | the costume body |
| PROOF | what the hands carry |
| PRICE | the ground it stands on, and its shadow |
| EDGES | the silhouette: crisp where stated, fraying where not |
| RECHECK | the mirror beside it, which shows the same figure from behind |

Scroll and the costume comes off a layer at a time. What is still standing at
the bottom is what the claim actually supports.

**The image to aim for:** a confident, beautiful, fully-dressed figure that
turns out to be nine-tenths fabric, and beside it a small, plain one that is
entirely solid. Nobody needs that explained.

**Craft notes:** no horror clichés, no blood, no jump scares. The unsettling
thing is the truth, and dressing it as a haunted house would undercut it. Dark
ground, one warm light source, named in the code so the look can be
reproduced rather than tweaked.

---

## 5 · The scope statement, which ships in the UI

Verbatim, visible on the page, not buried in a readme:

> This checks whether the evidence a claim needs is **present**. It does not
> judge whether that evidence is any good. A specification can be present and
> wrong and this will credit it.

A grade whose scope is unstated is the thing this app exists to refuse. Saying
so on the page is the difference between a tool and a verdict machine.

---

## 6 · What the Kiro session produces from this

Not written here on purpose:

- `.kiro/specs/<name>/requirements.md`, `design.md`, `tasks.md`
- hooks (a natural one: run both gates on save)
- steering docs (the hard refuses in §0 are the obvious candidate)

Those are the evidence of Kiro usage and they come from using it. Fed this
document, a session should be able to derive the acceptance criteria for each
register, which is the point of handing it the domain content instead of a
finished spec.

**Keep notes during the session.** The write-up field asks which surfaces were
used, which hooks automated what, how the spec compared to vibe coding, and
what MCP enabled. It cannot be reconstructed from memory afterwards.
