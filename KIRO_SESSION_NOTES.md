# Kiro session notes

Kept **during** the build, not reconstructed afterwards. The submission's
write-up field asks which Kiro surfaces were used and how they differed, what
hooks automated, how spec-driven development compared to vibe coding, and what
MCP enabled. None of that survives being remembered a month later, and
Technological Implementation is scored on how thoroughly Kiro was used.

Every entry is dated and says what was measured rather than how it felt.

---

## 2026-11-02: setup

| | |
|---|---|
| `kiro-cli` | 2.37.1, `brew install --cask kiro-cli`, `/usr/local/bin/kiro-cli` |
| Kiro IDE | 1.4.62, `brew install --cask kiro`, `/Applications/Kiro.app` |
| Auth | Builder ID (free tier), OAuth device flow |
| Host | macOS 15.8 (24H23), Intel Xeon W-2150B, 10 cores, 64 GB |

**Kiro Web was not used: it requires a Pro, Pro+ or Power subscription.** The
free surfaces are the IDE and the CLI, and the sign-in screen says so itself.
Worth knowing before planning around Web.

### The device flow has two steps and only the first is advertised

`kiro-cli login --license free --use-device-flow` prints a code and a
`view.awsapps.com/start/#/device` URL. Confirming the code there is **not**
enough. A second screen follows, *"Allow Kiro CLI to access your data?"*, with
three scopes (code analysis, chat, inline suggestions), and until that is
accepted the CLI keeps polling until the code expires, printing nothing but a
spinner. Two codes were lost to this before the second screen was found.

The code is also single-use: once accepted, reloading the device page reports
*"Invalid code"*, which looks like a failure and is actually the opposite.
`kiro-cli whoami` is the authority, not the page.

### Intel matters here

Homebrew prints, on every install: *"Apple have dropped Intel x86_64 support in
macOS Golden Gate (27)... Homebrew no longer builds bottles for this
configuration."* **Casks still work**, because a cask fetches a vendor binary
rather than a brew-built one, which is why both Kiro casks installed cleanly
on a machine where new formulae now have to build from source.

Also measured: brew reported `/usr/local/Cellar is not writable` and advised
`sudo chown -R`. That was false: the directory is already owned by the user.
The real cause was an OS-level command sandbox. **A tool's own account of why
it failed is an assertion, not a diagnosis**, and following this one would have
meant a needless recursive chown of `/usr/local` under sudo.

---

## 2026-11-02: spec-driven, first attempt: a plan with no files

`kiro-cli chat --agent kiro_planner --no-interactive --trust-tools=fs_read,fs_write`
against `REGISTERS.md` and `CONCEPT.md`.

**Result: exit code 0, a complete and genuinely good plan in stdout, and zero
files written.** `.kiro/` did not exist afterwards.

The cause is worth recording because it is a real property of agentic planning
rather than a bug: the planner finished its plan and then **asked three
clarifying questions**: state-priority resolution, mirror placement, and
whether to unit-test WebGL, and `--no-interactive` means nobody was there to
answer. It exited successfully having produced an artifact nobody asked for and
none of the ones requested.

**This is the comparison with vibe coding, concretely.** Vibe coding would have
produced files immediately and silently absorbed those three decisions into
whatever the model preferred. The planner instead stopped and named exactly the
three choices that were genuinely ambiguous in the input. Every one was a real
fork:

1. **State priority.** SOLID > DECLINED > COSTUME > HOLE, or last-clause-wins?
   Answered highest-wins, because a register with any real artifact is backed
   regardless of vaguer mentions elsewhere, and a decline is honest where
   costume is not, so a document that both names a thing loosely and declines
   it explicitly should read DECLINED, not COSTUME. Nothing in the input said
   this. A vibe-coded version would have picked one and never surfaced it.
2. **Mirror geometry** for RECHECK. Minor, and correctly identified as mine.
3. **Whether to unit-test the WebGL layer.** Answered no: unit-test the
   **parser** exhaustively with plain string fixtures and keep the render
   visual-only. The parser is where the three silent-failure rules live; the
   figure is judged by eye. Getting this backwards would have produced slow,
   brittle canvas tests and left the parser, the part that can be wrong
   without looking wrong, untested.

**The surfaced question was worth more than the files would have been.** That
is the honest case for spec-driven development here, and it is an argument from
something that happened rather than from the method's own marketing.

**Second attempt** re-ran the same agent with all three answers written into
the prompt and an explicit instruction to create the directory and write the
files rather than ask.

### A measurement error of my own, recorded because it is the same shape

The first run's output was piped through `tail -40` before being saved, so only
2,199 bytes survived. Counting register names across that fragment produced
`WHO 0, WHAT 0, EDGES 0` and a conclusion that the planner had dropped half the
register set. It had not; the evidence had been truncated before it was
counted. **A check run against a fragment reports on the fragment**, and it
reads exactly like a check run against the whole thing.

---

## 2026-11-02: `--trust-tools` is silently ineffective in non-interactive mode

Tasks 1 and 2 were dispatched with
`--agent kiro_default --no-interactive --trust-tools=fs_read,fs_write`. The
agent read the spec, built its task list, and then:

```
[tool] Creating package.json
[denied] tool permission approval is not supported in non-interactive mode.
        Use --trust-all-tools to auto-approve.
[tool] status: Failed: Creating package.json
```

**Every write and shell call was blocked, and the command still exited.** The
agent itself worked out what had happened and dumped the file contents into
stdout as a fallback, which is good behaviour, but `find src tests` returned
nothing, so from outside it looked exactly like the earlier plan-with-no-files
run.

The confusing part, and the reason this is worth writing down: **the same flag
combination had already written three files successfully**: the spec files
under `.kiro/specs/costume/`. So `--trust-tools=fs_read,fs_write` is not
uniformly ignored. Spec authoring goes through a pre-trusted path; ordinary
file writes and shell do not. A flag that works for one kind of write and
silently fails for another is worse than one that never works, because the
first success teaches you to trust it.

**Fix:** `--trust-all-tools` is the only form `--no-interactive` honours for
write and shell. That is a broader grant than wanted, so it is used inside the
clean room only, which sits outside every ecosystem repository and now has
commit `e760c46` as a restore point. The narrower grant does not exist in this
mode; pretending otherwise would mean believing a flag that had already been
observed to do nothing.

**Carried into the build:** the agent writes, and the tests are run and read
here rather than relayed from the agent's own report. Three times today a tool
has asserted something false about its own state: brew about directory
ownership, a browser tool about Chrome not running, and this flag about tool
trust. An agent's account of whether its work landed is not the measurement.

---

## 2026-11-02: tasks 3-7, and an acceptance criterion that could not fail

Kiro wrote the whole parser chain: keywords, classifier, artifact scanner,
decline detector, state resolver, pipeline entry point, and six test files.
**82 tests passed.** No test was skipped, none marked `.only` or `.todo`, and
all four load-bearing fixtures were present and asserting the right way. It
also added one nobody asked for -- `"We do not measure retention"` against
PROOF returns false -- checking that a decline is register-specific rather
than global. Good work, honestly done.

Then the plant.

**Disabling the negation rule outright -- forcing `negated: false` on every
token -- turned only ONE test red, and it was an incidental `url` case. AC-P1,
the headline acceptance criterion FOR the negation rule, stayed green.**

The cause, measured rather than guessed:

```
scanArtifacts('We publish no latency threshold')  ->  []     (zero tokens)
scanArtifacts('We publish no latency numbers under 12ms')
                              ->  [{number+unit, "12ms", negated: true}]
```

The fixture produces **no artifact at all**, so
`expect(tokens.filter(t => !t.negated)).toHaveLength(0)` is an assertion about
an empty array. It passes with the rule present and passes with the rule
deleted. A second negation test had the same shape -- a `for` loop over an
empty array runs zero assertions -- and its own comment admitted it was unsure
what it caught.

**This was my error, not Kiro's.** The implementation is correct: "threshold"
is properly not a named-thing under the artifact definitions in REGISTERS.md
(not capitalised mid-sentence, no file extension). I wrote that fixture into
REGISTERS.md and into both agent prompts to illustrate the negation rule, and
under the definitions I also wrote, it can never exercise it. Kiro implemented
the spec faithfully; the spec specified a test that was not a test.

Fixed by adding a fixture that bites plus a control arm:

- `"We publish no latency numbers under 12ms"` -> at least one token, and none
  un-negated. Asserting `length > 0` FIRST is the whole correction.
- the same clause without `no` -> at least one token, and at least one
  un-negated. Without this, a rule that marks everything negated would also
  pass.

Re-planted: AC-P1 (guarded) now goes red. 84 tests, and the negation rule is
guarded against its own removal for the first time.

**The transferable lesson for the app being built.** COSTUME exists to tell a
claim that carries evidence from one that merely names it. Its own test suite
contained an acceptance criterion that named the property and carried nothing
able to check it. An assertion over an empty collection is a register in
COSTUME, not SOLID -- and only a plant distinguishes them, because both print
green.

---

## 2026-11-02: tasks 8-11: a whole run spent on one undecided question

Dispatched tasks 8, 9, 10 and 11 together. The run exited 0 with 4,104 bytes of
output, **no files written**, and the last line mid-sentence:

> "Now let me implement everything. I'll write all the files:"

Every byte before that was the agent working on a real gap the spec left open.
Task 1 had written `index.html` pointing at `src/main.js`, while the entire
parser is TypeScript. It cycled through five resolutions -- reimplement the
parser in plain JS, hand-bundle, Vite dev server, Vite build, import `.ts`
directly -- checked whether Vite was present, confirmed it was, and ran out of
budget before writing anything.

**It was right to notice.** `index.html` referencing a `.js` entry point beside
a `.ts` codebase genuinely does not work, and the spec never said which way to
resolve it. A model that guessed would have duplicated the parser in JS, which
the agent itself identified as "error-prone" -- and it would have been: two
copies of the negation rule, one of them untested.

**Third time this pattern has both helped and cost.** Kiro surfaces the
genuinely undecided question rather than silently picking. Under an interactive
session that is the feature. Under `--no-interactive` the question goes
nowhere and the budget goes with it:

| run | what it surfaced | cost |
|---|---|---|
| plan | state priority, mirror geometry, WebGL test strategy | no files, plan kept |
| tasks 1-2 | nothing -- `--trust-tools` silently blocked writes | no files, content dumped to stdout |
| tasks 8-11 | `.js` entry point vs `.ts` parser | no files, no plan either |

**The working pattern, arrived at by losing three runs to it:** decide every
toolchain and architecture question IN the prompt, state that it is decided and
not to be reconsidered, scope to ONE task, and tell it to write files before
explaining. Re-dispatched Task 8 alone with TypeScript throughout, Vite as
bundler, `index.html` loading `src/main.ts`, and `base: './'` for Pages.

**For the write-up, this is the honest answer to "how did spec-driven compare
to vibe coding".** Vibe coding never surfaces these. It picks, and the choice
becomes invisible until something built on it breaks. Spec-driven surfaces them
at the point where they are cheap -- but only if someone is there to answer,
and a non-interactive agent has no one. The method does not remove the need for
a decision-maker; it relocates the moment the decision gets made, and makes
visible that one was needed at all.
