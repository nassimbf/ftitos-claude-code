# Changelog

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
