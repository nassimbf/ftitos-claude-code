# Changelog

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
