# COSTUME

**Everything arrives in costume. Paste a claim in and watch it undress.**

Live: https://yamminrus.github.io/costume/

Paste any public claim: a product page, a README, a press release, an AI model card, a grant abstract. COSTUME renders it as a figure in the browser and shows, piece by piece, what the claim is *wearing* versus what it actually *paid for*.

| what the text does | what the figure does |
|---|---|
| names a thing AND backs it (a number with a unit, a date, a named file, a link, a list) | that part is **solid and lit** |
| names a thing with nothing behind it | **translucent**: costume with nobody in it |
| openly says it does not claim it ("we do not measure X") | **absent and marked**, costs nothing |
| never mentions it at all | a **hole**, glowing at the edge |

Scroll, and the costume comes off one layer at a time. What is still standing at the bottom is what the claim actually supports.

## The idea underneath

An absence is not a refusal. "We do not measure retention" is a decision, and it can be argued with. Never mentioning retention is a hole wearing the same clothes. Telling those two apart is the point of the whole thing.

The figure is built from six registers, each a question a claim has to answer: **WHO** is accountable, **WHAT** it does, **PROOF** of it, its **PRICE**, its **EDGES** (where it stops working) and how a reader can **RECHECK** it alone. The full rules are in [`REGISTERS.md`](REGISTERS.md).

## What it does not do

It checks whether the evidence a claim needs is **present**. It does not judge whether that evidence is any good. A specification can be present and wrong, and this will still credit it. That statement is on the page itself, not only here.

It grades documents, never people.

## How it works

- A single page, entirely in the browser. No backend, no API key, no account, works offline.
- Detection is a **deterministic parser**, not an AI model, so it can say exactly what it checked.
- 98 automated tests, including tests that were proven able to fail by deliberately breaking the rule they guard.

## Run it

```bash
npm ci
npm run dev       # local server
npm test          # 98 tests
npm run build     # static build in dist/
```

## Built with Kiro

The spec came first. [`REGISTERS.md`](REGISTERS.md) is the domain content Kiro was given. Kiro turned it into the spec in [`.kiro/specs/costume/`](.kiro/specs/costume/) (requirements, design and tasks), then built the parser and renderer from that spec. A Kiro hook in [`.kiro/agents/gate-cycle.json`](.kiro/agents/gate-cycle.json) runs the repository gates after every write.

[`KIRO_SESSION_NOTES.md`](KIRO_SESSION_NOTES.md) is the build diary, kept during the work rather than reconstructed afterwards. It records:
- where spec-driven development beat vibe coding;
- where Kiro stopped to ask the question that was genuinely undecided;
- one acceptance criterion that could not fail until it was fixed.

## Clean room

This repository carries no code from the author's private work. That is enforced by a gate rather than promised:

```bash
bash tools/gate_cycle.sh
```

The list of what the gate protects lives outside the repository. Without that list, the gate fails rather than passing blind, so it is green only on the author's machine. That is deliberate.

## Licence

MIT. See [`LICENSE`](LICENSE).

Built for Kiroween 2026, Costume Contest category.
