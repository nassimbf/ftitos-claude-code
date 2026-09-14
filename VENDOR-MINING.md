# Vendor Mining — 2026-09-14

Thirteen Claude Code ecosystem repos, cloned and read from source. This file records
what was decided about each and why, so the next audit does not re-litigate it.

It is a **decision record, not a roadmap.** `FACTORY-BLUEPRINT.md` was written the other
way round — it listed adoptions as directories to create, those directories were created
empty, and the v4 lean cut correctly deleted all of them for having no usage evidence
(`1f4fafc`: "19 eval-harness stubs without checks.py archived rather than shipped as a
harness"). Nothing in this file is a promise. The Port list below is small on purpose;
each line is one commit with a test.

## Why it had to be redone

The 2026-09-14 morning pass judged these repos from READMEs and the GitHub API without
cloning them. It produced six factual errors, listed under Corrections. Star counts,
issue counts and file listings are enough to rank a repo. They are not enough to mine
one — and they actively mislead, because a README describes intent while the source
describes behaviour.

Clones live in `.vendor/` (gitignored, `--depth 1`, 712 MB). Re-clone with the URLs in
the Provenance table rather than committing them.

## Decisions

| Repo | Verdict | The reason in one line |
|---|---|---|
| `open-gsd/gsd-core` | **INSTALL PARTS** | Zero-dep Node hook libs fill two named gaps |
| `Graphify-Labs/graphify` | **INSTALL PARTS** (A3 only) | Deterministic AST + real staleness handling; A3 install is orphaned |
| `garrytan/gstack` | PATTERN-ONLY | 3 skills already vendored; 3 shell guards worth porting as code |
| `affaan-m/ecc` | PATTERN-ONLY | Real engineering, but ~30,200 always-on tokens to install |
| `shareAI-lab/learn-claude-code` | PATTERN-ONLY | Python teaching repo; value is its tests |
| `rtk-ai/rtk` | PATTERN-ONLY | Rust + `jq` breaks zero-dep; binary sits in the request path |
| `JuliusBrussee/caveman` | SKIP (A3) / PATTERN-ONLY | BSL commercial-licence clause vs A3 being a hosted service |
| `garrytan/gbrain` | PATTERN-ONLY | 29 npm deps; MCP surface alone exceeds our headroom |
| `DietrichGebert/ponytail` | PATTERN-ONLY | ~1,540 always-on tokens; 0 of 6 hooks block anything |
| `Egonex-AI/Understand-Anything` | PATTERN-ONLY | 58,868-byte SKILL.md ≈ 15–16k tokens on invoke |
| `farion1231/cc-switch` | PATTERN-ONLY | Tauri GUI; defaults are monetised reseller endpoints |
| `shanraisshan/claude-code-best-practice` | **SKIP** | Ships `Bash(*)` with an empty deny list |
| `ComposioHQ/awesome-claude-skills` | **SKIP** | Unlicensed; ~33–36k always-on tokens |

Two repos yield installable components. Eleven yield code to port or nothing.

## Install

### gsd-core → this repo

MIT. Node built-ins only. All four cost 0 always-on tokens.

| Component | Source | Enforces |
|---|---|---|
| `hook-exit.js`, `cli-exit.js`, `exit-code-registry.js` | `hooks/lib/` | A hook must *declare* fail-open or fail-closed; omitting it terminates at call time (`hook-exit.js:30`). Frozen 6-entry exit-code table, throws on anything unregistered (`exit-code-registry.js:15`) |
| `gsd-read-injection-scanner.js` + `lib/injection-patterns.js` | `hooks/` | PostToolUse scan of Read/WebFetch/WebSearch **returned content** for injection strings |
| `gsd-prompt-guard.js` | `hooks/` | Same pattern set applied to writes into planning artifacts |
| `no-tautological-assert.cjs`, `no-swallowed-precondition.cjs`, `no-source-grep.cjs` | `eslint-rules/` | Kills `assert(true)`; catch-swallow over `mkdirSync`/`openSync`; tests that assert on source *text* |

No overlap with what we ship: `secret-read-guard` blocks reads of secret-bearing *paths*
and `gateguard-track-read` records reads to gate later edits. Neither inspects returned
content. Different trigger, different verdict.

`gsd-write-guard.js` is **not** on this list — `write-shrink-guard.js` was already ported
from it. Only delta worth backporting is its path-bound single-use sentinel hatch
(`gsd-write-guard.js:52-58`). Incident #973 is confirmed verbatim at `gsd-write-guard.js:7-16`:
a planner collapsed ROADMAP.md 292→16 lines after reading the advisory and classifying it
non-binding.

**Their tests do not port.** `exit-code-registry.test.cjs` and `cli-exit.test.cjs` need
`fast-check`; `hooks-crash-policy.test.cjs` needs a build step. Its table-driven shape is
worth copying — it drives every hook with allow input, deny input, malformed JSON and
unclosed stdin, asserting the declared crash policy holds. Write ours first, per the
repo rule.

### graphify → A3 only, not this repo

Deterministic tree-sitter extraction, zero LLM in the build path
(`graphify/extract.py:1`; "Graph construction costs zero LLM credits", `BENCHMARKS.md:168`).
Python and TypeScript are first-class core deps.

A3 currently has the pointer without the thing: a 56,950-byte `SKILL.md` and **no graph,
no git hooks, no PreToolUse wiring, no CLAUDE.md rules**. The standing open item said the
graph was never built; none of the maintenance machinery was installed either.

Its staleness ladder is the reason to finish rather than delete: per-file mtime check at
read time (`cli.py:911-920`), warning injected into context on stale (`cli.py:42-52`),
stale softens and never blocks (`cli.py:915`), and strict deny fires at most once per
session via an O_EXCL claim (`cli.py:710`) so an agent cannot be stranded. **All of that
is inert unless the PreToolUse hook is installed.**

Decision: complete the install or delete `~/projects/A3/.claude/skills/graphify/`. A skill
documenting `/graphify` against a nonexistent graph is a trap.

**Resolved 2026-09-14 — archived, not completed.** The directory was untracked in A3 and
is now at `~/projects/A3/.claude/skills-archive/graphify-orphaned-2026-09-14/` with a
`WHY-ARCHIVED.md` recording what a real install needs. Archived rather than deleted, per
this repo's own convention.

Archiving is the right half of "complete or delete" because completing it is not a small
step: ~30 Python wheels per machine, four separate pieces of wiring, and a full rebuild
whose wall-clock nobody has measured on a repo this size. That is a decision to make
deliberately, not a side effect of a cleanup pass. What could not stay was the pointer
without the thing.

**Cost of completing it.** The ~39-token frontmatter claim is confirmed (140 bytes), but a
*working* install also wants `always_on/claude-md.md` (772 B) in CLAUDE.md, so true always-on
is **~230 tokens** — 6× advertised, and still inside the ceiling (6,239 → ~6,470). The body is
~14k tokens on invoke. The real cost is not tokens: it is ~30 tree-sitter wheels plus
networkx/numpy/rapidfuzz, a per-machine Python install rather than a file copy.

**Measure the rebuild before wiring it to a commit hook.** Updates are incremental off an AST
cache (`cli.py:409-506`), but `post-checkout` forces a **full** rebuild (`hooks.py:257`), and
`BENCHMARKS.md` reports cost only in dollars and tokens — **wall-clock rebuild time is
unmeasured.** A3 is ~7,100 source files across 33 worktrees. Time it first.

**Its evidence is thinner than it looks.** The headline benchmarks (LOCOMO n=300,
LongMemEval-S n=50) measure *memory*, not code. The code result is ERPNext at **n=6**:
70.8% grep baseline → 82.0%, at ~140k tokens per query. A six-question sample is an
indication, not a finding.

**Where it actually beats grep:** transitive reachability and call-graph work, impact analysis
(`graphify path A B`), cross-file type and import resolution. Grep structurally cannot do
transitive closure. Grep is better for known symbols, config and string hunts, any named file,
and anywhere correctness beats recall — grep is never stale. Orientation is already covered by
our `codebase-onboarding` skill.

## Port as code — tests first

| From | Item | Why |
|---|---|---|
| gstack | `careful/bin/check-careful.sh:78` — `${IFS}`/base64-to-shell tripwire | Closes verified bypasses, below |
| gstack | `freeze/bin/check-freeze.sh:24-30` — fail-closed EXIT trap | Claude Code reads no-output as **allow**, so a crashed hook currently permits |
| gstack | `check-careful.sh:29-45` — real JSON parse instead of grep | `grep -o '"command"…"[^"]*"'` truncates at the first escaped quote |
| ecc | `tests/hooks/block-no-verify.test.js` — 35-case corpus | **Ports as-is.** Zero setup, Node built-ins, verified 35/0 |
| rtk | 4-state decision contract | Ours are 2-state |
| learn-cc | `tests/test_compaction_tool_pairs.py:203-231` | Never trust a filesystem path found *inside tool output*; re-resolve and prefix-check |
| caveman | `engine/safety/safety.go:43-49` + `engine/evals/probes.go:11-39` | A lossy operation refuses to run unless the original is recoverable |
| gbrain | `src/core/context/sensitivity-scan.ts:1-18` | Detector, not redactor: findings carry family + fingerprint, never the matched text. → A3 anonymizer |
| Understand-Anything | `validate-incremental-symbols.mjs:244,486` | Symbol present in source but absent from rebuilt graph blocks publication, exit 1 |
| cc-switch | `failover_switch.rs:41`, `circuit_breaker.rs:66` | Promote-on-success + half-open probe, as a shell wrapper |

### rtk's 4-state contract

States are **AllowRewrite / AskRewrite / Defer / Deny** (`src/hooks/decision.rs:27-36`).
Rewrite is the payload, not a state.

| State | Exit | Stdout | Host behaviour |
|---|---|---|---|
| AllowRewrite | 0 | rewritten cmd | `updatedInput` **with** `permissionDecision: "allow"` |
| Defer | 1 | empty | exit 0, no JSON — host handles natively |
| Deny | 2 | empty | exit 0, no JSON — host's own deny rule fires |
| AskRewrite | 3 | rewritten cmd | `updatedInput`, **omit** `permissionDecision` → host prompts |

Three invariants worth taking verbatim:

- **Deny is evaluated before rewrite is considered** (`decision.rs:82-84`).
- **No rule matched must map to Ask, never Allow** (`decision.rs:91-94`, their issue #1155).
  The other way round, every rewritable command auto-approves on a machine with no rules.
- **Unattestable constructs defer** (`decision.rs:86-88`) — command substitution, redirects
  and heredocs cannot be decomposed into checkable segments, so a rewrite could smuggle an
  unchecked command past an allow rule.

Reference implementation in bash+jq: `hooks/claude/rtk-rewrite.sh:81-100`.

### ecc's block-no-verify cases

Named cases a naive implementation misses, for when the corpus is ported:

- Prefix abbreviation — git accepts unambiguous prefixes, so `--no-veri` and `--no-verif`
  bypass a literal match, while `--no-verbose` must still pass.
- `core.hooksPath` in both cases — a bypass that never uses `--no-verify` at all.
- Short-flag values: allow `-tn`, `-uno`, `-Sn` (n is a value); block `-nu`.
- Position: block on the git segment of an `&&` chain and on later chained commands; block
  `git push --no-verify`; allow the phrase inside a quoted commit message but block a real
  quoted flag; do not read `commit` as a subcommand when it is an argument to `push`.

## Verified finding — 4 bypasses in `cc-safety-net.js`

Probed directly against the shipped hook on 2026-09-14, not inferred:

| Command | Result |
|---|---|
| `rm${IFS}-rf${IFS}/` | blocked |
| `rm -rf $(echo /)` | blocked |
| `${IFS}rm -rf ~` | **allowed** |
| `X=rm; $X -rf /` | **allowed** |
| `echo cm0gLXJmIC8= \| base64 -d \| sh` | **allowed** |
| `eval "$(echo cm0gLXJmIC8= \| base64 -d)"` | **allowed** |

The first is an own-goal. Our command-position anchor is `(?:^|[;&|(\n{])\s*`. A leading
`${IFS}` means the command neither starts at `^` nor follows an anchor character, so the
guard falls through — the same hardening that put us ahead of upstream opened the hole.
The rest are variable indirection and base64-to-shell, never covered.

This is defence in depth, not the last line; the permission system still sits behind it.
But catching exactly this is what the hook exists for.

## Corrections to the 2026-09-14 morning pass

| Claim | Source says |
|---|---|
| caveman ships a closed-source BSL binary in the request path | 143 `.go` files ship and compile, no committed binaries. `proxy/` runs locally, upstream is config-driven (`proxy/cmd/caveman-proxy/main.go:320-327`); prompt content stays on-host. Real blocker is `LICENSING.md:55-57` — hosted/managed/embedded use needs a commercial licence, and A3 is hosted |
| caveman never measured anything | `docs/HONEST-NUMBERS.md:16` says "Not published" and `benchmarks/results/` holds only `.gitkeep` — but `evals/snapshots/results.json` is real, committed and offline-reproducible: **−48.5% vs baseline, −52.6% vs a terse control.** The README's 65% is unsupported; ~50% is real |
| rtk is BSL-licensed | **Apache-2.0** (`Cargo.toml:10`, `LICENSE:1`). The disqualifier is the binary wrapping every Bash command, not the licence |
| rtk ships 155 golden fixtures | **79** files in `tests/fixtures/`, and they pin CLI parser output, not hook behaviour |
| ecc's 24 hooks are untestable inline one-liners | True at the registration layer only — those 24 are byte-identical plugin-root shims that exec real files. Underneath: **53 Node scripts, 11,624 LOC, 55 hook test files.** Right shelf, wrong reason |
| ecc ships 903 skills / 415 agents / 426 commands | **292 / 68 / 94** distinct; the rest are translation and harness mirrors (MD5 of every `SKILL.md`: 292 unique, zero duplicate groups) |
| Understand-Anything builds an LLM graph, not AST | Real tree-sitter with WASM grammars (`packages/core/src/plugins/tree-sitter-plugin.ts:1-80`), parsing 100% local. LLM confined to prose summaries. The token claim held; the AST claim did not |
| gbrain has bi-temporal edges and a Seance pattern | Neither exists — zero hits repo-wide. Progressive disclosure and citation IDs do exist |
| gstack's `setup` wires an hourly self-updating hook | `--team`-gated and off by default (`setup:442` `TEAM_MODE=0`); fires at SessionStart, not hourly. Still do not run `setup` — it symlinks into `~/.claude` |

## Not taken, and why

**`awesome-claude-skills` — SKIP.** No root LICENSE; `README.md:497` claims Apache-2.0 and
`:499` disclaims it per-skill, so the 19 community skills are unlicensed and unsafe to
redistribute. 832/864 reference rube.app; after stripping slugs and digits, **555 are
byte-identical** and 732 are exactly 91 lines. Measured always-on cost: mean 151 chars of
frontmatter × 864 ≈ **33,000–36,000 tokens, 4.5× the ceiling.** Grepped all 864 for
mutation testing, property-based testing, blind judge, work ledger, delta spec,
deterministic oracle, eval harness and golden test: **zero hits on every term.**

**`claude-code-best-practice` — SKIP, and it is a hazard.** `.claude/settings.json:3-29`
ships `"Bash(*)"` with `"deny": []`. The `ask` list covers `rm`/`dd`/`chmod`/`docker` and
nothing covers `curl`, `ssh`, `sudo` or `git push`. The same grant is copy-pasted into 10
agent frontmatters — `time-agent.md:4-15` gives an agent that runs `date` full `Bash(*)`
plus `Write` plus `mcp__*`. Its own prose contradicts it (`best-practice/claude-settings.md:337`
advises `"deny":["*"]` plus specific allows). Current, not stale. Its single hook script is
483 lines mapping 30 events to `afplay` sounds and always exits 0. One idea is worth
remembering: `changelog/best-practice/claude-settings/verification-checklist.md:24-32`
keeps an **Origin column** recording the escape that created each rule — a prose ledger of
the Hashimoto rule.

**`ponytail` — PATTERN-ONLY.** 0 of its 6 JS hooks deny anything; `hooks/ponytail-config.js:40`
is a correctness fix, not a block. ~1,540 always-on tokens (234 frontmatter + 1,307 injected
per session, re-charged per subagent) for a ruleset with no enforcement. Its own benchmark is
the honest part: **−94% LOC on over-build tasks, a wash on irreducible CRUD** (44→44), and the
"80–94%" headline is publicly retracted. Best artefact in the repo is a self-reported failure
— their own SessionStart hook fired on the benchmark's control arm
(`benchmarks/results/2026-06-17-agentic-safety.md:3`).

**`cc-switch` — PATTERN-ONLY, defaults untrustworthy.** 30 unique third-party reseller domains
carrying affiliate codes per README, and **28 affiliate URLs compiled into the shipped presets**
(`src/config/*.ts`) — the provider picker is ad inventory. The auto-updater is minisign-signed
from a maintainer endpoint (`tauri.conf.json:63-64`), which proves provenance but not intent:
each update reships a revised reseller list. A `ccswitch://` deeplink (`:59`) accepts provider
configs from a clicked link. Failover re-sends **the same request body** to the next vendor
(`forwarder.rs:464`) — under §203 StGB that is an uncontrolled disclosure path, not resilience.

**`gbrain` — PATTERN-ONLY; Engram keeps the slot.** Postgres+pgvector or embedded PGLite, but
still requires Bun, 29 npm deps, an MCP server process and `OPENAI_API_KEY` by default. Its
MCP surface alone is ~1,600–2,000 tokens against ~1,761 of headroom. Its edge is corpus RAG,
which is a per-repo search problem, not a globally installed memory engine. Two memories that
disagree is worse than one thin one. Worth stealing beyond the sensitivity scanner:
`turn-context.ts:62`, a hard 8,192-byte budget that sets `degradedReason='budget_trimmed'`
rather than silently truncating.

**`learn-claude-code` — PATTERN-ONLY, and it closed two questions.** Its suite runs (480 passed,
2 failed, both environmental). Two standing items resolved:

- The deferred plan to port `test_compaction_tool_pairs.py` against our `pre-compact.js` is
  **void**. Our hook saves session state to disk and never sees the message array — Claude Code
  compacts internally, so the invariant has nothing to hold over.
- It does **not** resolve whether `ralph-loop.js` and `loop-runner.js` depend on Stop-payload
  fields that exist at runtime. `PreCompact`, `SessionStart` and `SessionEnd` appear nowhere in
  it, and its hooks are in-process Python callbacks, not the JSON-over-stdin protocol.
  **Still unverified.**

Its permission regex has diverged and **ours is ahead**: we added `{` to the opener class
(brace-group bypass) and a runner-prefix alternation (`sudo|xargs|command|…`), neither of which
is upstream. Their `command rm file.txt` case only passes via a crude `"rm " in command`
substring check (`s04_hooks/code.py:146`) that we correctly rejected. Nothing to pull.

**`gstack` — zero drift.** `git ls-remote origin main` still equals our pin `71f6048`, and
`1.84.1.0` is the newest changelog entry. Every difference between `skills/{cso,browse,qa}` and
upstream is our own de-vendoring. One property to preserve: de-vendoring **stripped all
`gstack-question-log` / `gstack-learnings-log` / `gstack-decision-search` calls** — a naive
re-vendor would reintroduce them. Of 61 skills, only `browse`, `careful` and `freeze` ship
executable `bin/`; the rest is prose. No other skill clears the Hashimoto bar.

## Behaviour-steering text shipped as documentation

Two of the thirteen tripped the harness's instruction-shaped-content detector during mining.
Both were benign on inspection, but the property is worth tracking on any vendored repo,
because a file that reads as documentation to a human reads as instruction to an agent.

- **graphify** ships `AGENTS.md` and `always_on/*.md` written as imperatives aimed at an agent
  ("Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md"),
  designed to be pasted into CLAUDE.md, and `cli.py:42` injects text into a live agent turn via
  `additionalContext`. That is how the tool works — but installing it means adopting text whose
  purpose is to redirect the agent, and the `additionalContext` path means upstream can change
  what your agent is told without changing anything you reviewed.
- **claude-code-best-practice** hit the same detector by quoting a `settings.json`. No finding.

The rule this suggests: when vendoring, review `AGENTS.md`, `CLAUDE.md`, `always_on/` and any
`additionalContext` injection as **code that runs in the model's context**, not as prose. Diff
them on every re-pin.

## Provenance

All shallow clones taken 2026-09-14.

| Repo | URL | License |
|---|---|---|
| gsd-core | `github.com/open-gsd/gsd-core` | MIT |
| gbrain | `github.com/garrytan/gbrain` | MIT |
| gstack | `github.com/garrytan/gstack` | MIT (pin `71f6048`, v1.84.1.0) |
| ponytail | `github.com/DietrichGebert/ponytail` | MIT |
| rtk | `github.com/rtk-ai/rtk` | Apache-2.0 |
| graphify | `github.com/Graphify-Labs/graphify` | Apache-2.0 (`NOTICE` resolves the dual files: Apache governs, `LICENSE-MIT` is historical provenance for pre-relicensing contributions) |
| ecc | `github.com/affaan-m/ecc` | MIT |
| caveman | `github.com/JuliusBrussee/caveman` | MIT + BSL-1.1 on `engine/ rewriter/ proxy/ browse/ mcp/ shrink/ mem/` |
| learn-claude-code | `github.com/shareAI-lab/learn-claude-code` | MIT |
| Understand-Anything | `github.com/Egonex-AI/Understand-Anything` | MIT |
| cc-switch | `github.com/farion1231/cc-switch` | MIT |
| claude-code-best-practice | `github.com/shanraisshan/claude-code-best-practice` | MIT |
| awesome-claude-skills | `github.com/ComposioHQ/awesome-claude-skills` | **none at root** |

Anything copied from these repos carries its licence and attribution into `.archive/` and
the file header. gsd-core, ecc, gstack, learn-claude-code and Understand-Anything are MIT —
attribution is required, redistribution is not restricted.
