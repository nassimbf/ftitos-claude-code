# Changelog

## [6.0.0] — 2026-09-14

The hardening pass. Almost everything here was found by the harness blocking real work,
not by review — which is the Hashimoto rule doing what it exists for.

### New enforcement

- **`ship-gate.js`** — fires on `git push` / `gh pr create`. Blocks secrets, debug
  artifacts (`console.log`, `pdb`, `debugger`, `.only`) and TODOs with no issue
  reference, then audits dependencies when the outgoing diff touched a manifest.
  `rules/security.md` and `rules/code.md` already required all of this; it was prose,
  which the model may skip. Only ADDED diff lines count — removing a `console.log` is the
  fix, not the offence.
- **`read-injection-scanner.js`** — scans what Read/WebFetch/WebSearch returned for
  prompt injection. Advisory by design: by PostToolUse the content is already in the
  context window, so refusing the call cannot un-read it and blocking would be theatre.
  Labelling it as data is what helps.
- **`lib/hook-exit.js`** — a hook must DECLARE fail-open or fail-closed. A helper with a
  default lets a future hook inherit the wrong policy by saying nothing.
- **`scripts/ci/mutation-ratchet.js`** — a test-quality gate that deleting tests cannot
  game. Uncovered mutants stay in the denominator, so "fixing" survivors by removing
  their tests lowers the score instead of raising it.

### Fixed

- **Four obfuscation bypasses** in `cc-safety-net.js`: `${IFS}rm -rf ~`,
  `X=rm; $X -rf /`, and two base64-to-shell forms. The first was an own-goal — the
  brace-group hardening that put this hook ahead of upstream displaced the command from
  the position its own anchor required.
- **The borrowed-evidence class, three times.** A pattern's wildcard runs past a shell
  separator and judges a command against an unrelated later one. `rm` was fixed in
  e544109; six more rules still matched literal text anywhere; the interpreter rule still
  used `.*`. And the obvious fix was wrong for the last one: `SEG` stops at the first
  `;`, but a one-liner's `;` sits inside its quoted body, so a real `python3 -c` attack
  walked straight through. Bound by the quote, not the separator.
- **Both secret hooks failed open on their own crash.** `pre-secrets-block` wrapped parse
  failure and scan failure in one `catch`, so a throw mid-scan shipped the secret.
  `secret-read-guard` had no outer catch at all — exit 1, undefined blocking behaviour.
  Both now fail closed.
- **The installer skipped existing files**, so a hook fixed here never reached
  `~/.claude`. It blocked legitimate work twice in one session while the repo copy was
  correct. Now distinguishes `SKIP (identical)` from `WOULD UPDATE (stale)`.
- **Duplicate hook registrations, again.** v4 deduped `settings.json`; nothing stopped
  the installer re-creating them. It compared raw command strings, so `$HOME/...` and
  `/Users/...` read as different registrations — one install produced 9 duplicates. Now
  matched by resolved path, and a second install is a no-op.
- **`stop-verify.js` recovered from `~/.claude`**, where it had been 67 lines ahead since
  the field fix. Scopes verification to files this session edited, because several
  sessions can share a worktree and `git status` cannot tell them apart.

### Added

- Six stack-matched agents from `affaan-m/ecc` (MIT) — FastAPI, PostgreSQL, TypeScript,
  React, RAG pipelines, TDD. A generic reviewer catches generic bugs.
- `NOTICE` — `open-gsd/gsd-core` had no attribution despite 33 files deriving from it.
- `VENDOR-MINING.md` — 13 ecosystem projects cloned and read from source. Six earlier
  conclusions, made from READMEs and the GitHub API, turned out to be wrong.

### Removed

- The agent count cap. Same proxy mistake v5 removed for skills: it would reject a
  30-token agent while an unbounded description rewrite passed untouched. The budget
  decides.
- The orphaned `graphify` skill in A3 — skill present, no graph, no hooks, no wiring.

Tests 14 → 20 files. Agents 8 → 14. Always-on 6,239 → ~6,600 of 8,000.

## [5.0.0] — 2026-09-14

Native-primitives cut. `commands/`, `pipeline/` and `frameworks/` removed: the first two
were never in the installer's copy map, so Claude Code had never read a byte of either,
and `commands/` was installed and broken — `/go` chained to 17 commands, ten of which did
not exist. Added `block-no-verify.js` (before it, every gate here was optional),
`write-shrink-guard.js`, `secret-read-guard.js` and `worktree-path-guard.js`; vendored
`cso`/`browse`/`qa` from gstack. Replaced the skill-count cap with a measured token
budget, after it blocked a 61-token skill while unbounded description growth passed.

## [4.0.0] — 2026-08-12

The evidence pass. v3 was audited against 7,077 real prompts spanning 2026-04-01 to
2026-08-11. Everything with no usage behind it was removed.

### What the audit found

- 26 of 32 skills: **zero invocations** in 4.5 months.
- 8 of 15 commands: zero invocations (`/verify`, `/tdd`, `/learn`, `/code-review`,
  `/build-fix`, `/project:ship`, `/project:constitution`, `/project:analyze`).
- 3 agent types dispatched out of 23 shipped.
- The `Skill` tool: never invoked once across the sampled transcripts.
- Always-on context: **22,162 tokens per session** before the user typed anything.
- 8 hooks registered twice in `settings.json` (absolute-path and `$HOME` variants both
  present) — every edit wrote two backups and ran GateGuard twice.
- `rules/standards.md` contained `coding-style.md`, `anti-slop.md` and `performance.md`
  verbatim; `quality.md` contained `testing.md` and `security.md`. ~10 KB of duplicate text
  injected into every session.
- The v2 doctor reported "12 OK, system healthy" against all of the above.

### Added

- `hooks/scripts/pre-secrets-block.js` — PreToolUse guard blocking writes to `.env`,
  `*.pem`, `*.key`, `id_rsa`, `credentials.*` and content carrying `sk-`, `ghp_`, `AKIA`,
  PEM blocks, or a password/token assigned a real literal. Allows `*.example`/`*.template`
  and env-var references. Secret handling was previously advice in three separate rules
  files, which had never stopped anything.
- `tests/secrets-block.test.js` — 8 behaviour tests, written before the hook.

### Changed

- `scripts/doctor.js` rewritten. It now fails on duplicate hook registrations, hooks
  pointing at scripts that do not exist, repo/install version drift, and always-on context
  over 8,000 tokens. It no longer counts files it did not install and calls that health.
- `rules/` 16 files → 3 (`code.md`, `workflow.md`, `security.md`), 32,489 → 5,570 bytes.
- Review Army and Review Council prompts moved out of always-on `rules/` and into
  `commands/project/review.md`. ~10 KB that loads only when the command runs.
- `skills/TIER.md` replaced. Tiers were fiction — Claude Code scans every installed skill's
  description every session regardless of tier. Replaced with admission and removal criteria.
- `hooks/hooks.json` 45 registrations → 15, de-duplicated.

### Recovered

Two field fixes existed only in `~/.claude` and were never committed back to v3. Both are
now in the repo:

- `cc-safety-net.js` — blocks bare `git stash pop`. The stash stack is repo-global; a bare
  pop applied another session's WIP into a clean worktree and produced 26 conflicted files
  (observed 2026-06-10, A3 phase1-tools).
- `stop-verify.js` — resolves ruff/mypy/pytest from the project `.venv`, and skips a
  verifier rather than falling back to a global binary. A Homebrew pytest on a different
  Python produced 188 phantom collection errors on every Stop event (observed 2026-06-10, A3).

### Removed

Everything below moved to `.archive/`, not deleted.

- 26 skills with zero invocations, including the entire L1/L3/L7 layer set
  (`beads-workflow`, `blind-judge`, `mutation-testing`, `property-based-testing`,
  `openspec`, `harness-evals`, `engram-advanced`, `verification-loop`, `tdd-workflow`,
  `writing-plans`, `executing-plans`, `subagent-driven-development`, `safety-guard`,
  `security-review`, `api-design`, `backend-patterns`, `docker-patterns`, `e2e-testing`,
  `canary-watch`, `database-migrations`, `git-workflow`, `python-testing`,
  `incremental-implementation`, `context-engineering`, `brain-merge`,
  `dispatching-parallel-agents`).
- 17 agents + the 5 `agents-ccg` team agents.
- 6 zero-use commands.
- 13 duplicate or maintenance-only rules files.
- 30 hook registrations, including the brain hooks (`brain-pretooluse` ran on every Grep
  and Glob), `veto-rate-logger`, `check-console-log`, `evaluate-session` and 8 duplicates.

### Honest status

- The L8 eval harness still has 1 real task (`task-001`) and 19 prompt stubs without
  `checks.py`. The stubs are archived rather than shipped as if they were a harness.
- The v3 test suite validated file shape, not behaviour. `secrets-block.test.js` is the
  first test in this repo that exercises a hook end to end. The other four remain structural.

### Result

| | v3 | v4 |
|---|---|---|
| Always-on context | ~22,162 tokens | ~5,798 tokens (−74%) |
| Skills | 32 | 6 |
| Agents | 23 | 6 |
| Commands | 15 | 9 |
| Rules bytes | 32,489 | 5,570 |
| Hook registrations | 45 | 15 |

## [3.0.0] — 2026-06-10

### Architecture
- 8-layer factory architecture (L0 Doctrine through L8 Evals) — see FACTORY-BLUEPRINT.md
- Hashimoto rule as the operating principle: every failure → permanent engineered fix

### Added (L2 Loop Engine)
- `skills/loop-engine/` — ralph-loop + fresh-context runner, dual exit gate, circuit breaker, error gate, relay notes

### Added (L3 Verification Stack)
- `hooks/scripts/stop-verify.js` — silent-success Stop hook (ruff/mypy/pytest; surfaces only errors)
- `skills/mutation-testing/` — Trail-of-Bits two-phase mutmut campaign
- `skills/property-based-testing/` — Anthropic red-team PBT recipe with Hypothesis
- `skills/blind-judge/` — permission-denied holdout scenarios, write-tool-less reviewers, veto-rate logging

### Added (L4 Fleet Orchestration)
- `agents/refinery.md` — serialized merge-queue agent (prevents worktree rebase conflicts)
- `agents/witness.md` — stuck-agent watchdog with heartbeat nudges
- `agents/deacon.md` — passive transcript observer, Seance mode, Hashimoto candidate extraction

### Added (L1 Beads)
- `skills/beads-workflow/` — hash-ID tasks, atomic bd update --claim, dependency-aware bd ready

### Added (L5 Memory)
- `skills/engram-advanced/` — progressive disclosure, Seance, citation IDs, temporal search

### Added (L6 Safety)
- `hooks/scripts/cc-safety-net.js` — semantic destructive command guard (recursive unwrapping, interpreter detection)
- `rules/security-guidance.md` — 3-layer security (regex → LLM diff review → commit tracing)
- `rules/cache-retention.md` — 60-day session cache policy + entropy GC doctrine

### Added (L7 Specs)
- `skills/openspec/` — delta-specs against living source-of-truth, brownfield-native
- EARS syntax reference added to `skills/spec-driven-development/`
- `templates/AGENTS.md` — ≤100-line ToC template for project agent handbooks

### Added (L8 Harness Evals)
- `skills/harness-evals/` — Harbor-style golden task harness, 5-run protocol, SWE-smith integration
- `tests/eval-harness/` — eval harness scaffolded; 1 task fully implemented (task-001), 19 prompt stubs pending checks.py

### Hooks Updated
- `hooks/hooks.json` — cc-safety-net PreToolUse + Stop hook for stop-verify + veto-rate PostToolUse

### Cuts (v2 → v3)
- Custom /go autonomous chaining → superseded by native /goal with separate Haiku judge
- Third-party goal/loop installs (goal-cc, ralph-mcp) → native /goal is strictly stronger
- Worktree UI managers → native agent teams + Refinery pattern cover it

## [2.0.0] - 2026-05-21

### Rebuilt from scratch

v2.0 is a complete rebuild of the reference repo, incorporating the best of what evolved in 3 months of daily use while cutting 74% of the bloat.

### Changed

- **Rules**: 10 files merged to 6 (standards.md, workflow.md, quality.md + 3 kept as-is)
- **Skills**: 67 cut to 24 (9 TIER 1 core + 15 TIER 2 on-demand)
- **Agents**: 21 narrowed to 18 base + 5 CCG team = 23 total
- **Hooks**: 14 cut to 8 (removed heavy/redundant hooks)
- **Commands**: 14 evolved to 15 (8 root + 7 project)
- **Install script**: Rewritten with `--core-only` flag and auto-run doctor
- **Doctor**: 12 checks (was 9), now validates per-tier skills, GateGuard pair, pipeline phases
- **Review Army**: Condensed from 194 to 120 lines, same 7 specialists
- **CI**: Updated validators for v2 counts

### Added

- `go.md` command — CEO single-command pipeline entry point
- `learn.md` command — Pattern extraction from sessions
- `project:analyze` — 8-check cross-artifact consistency gate
- `project:constitution` — Versioned project governance
- `specify.md` pipeline phase — User story decomposition
- `analyze.md` pipeline phase — Consistency validation before Gate 1
- `agents-ccg/` — 5 CCG team agents (init-architect, team-architect, team-qa, team-reviewer, planner)
- `TIER.md` — Skill tier definitions with promotion/demotion criteria
- TypeScript language rules (5 files)
- `agents.test.js` — Agent validation tests

### Removed

- 43 skills archived (django, nuxt, data science, heavy design, meta-skills, overlapping)
- 3 agents cut (anti-patterns, constitutional-validator, data-analyst)
- 6 hooks cut (brain-pretooluse, brain-post-commit, session-start-learnings, evaluate-session, check-console-log, PostCompact echo)
- GBrain and Graphify brain setup guides (kept Engram + GitNexus only)
- guides/ directory (content folded into README)
- design-systems/ templates

### Numbers

| Component | v1.0 | v2.0 | Change |
|-----------|------|------|--------|
| Agents | 21 | 23 | +2 (CCG team) |
| Skills | 67 | 24 | -64% |
| Rules | 15 | 16 | +1 (TS rules) |
| Hooks | 14 | 8 | -43% |
| Commands | 14 | 15 | +1 |
| Pipeline | 7 | 9 | +2 phases |

## [1.0.0] - 2026-04-18

Initial release.
