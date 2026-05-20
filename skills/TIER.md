# Skill Tiers

## Loading Strategy
- TIER 1 (Core): Always scanned by Claude Code at session start
- TIER 2 (Active): Loaded on-demand when a matching command or intent is detected
- TIER 3 (Reference): Archived — not shipped in v2, available in v1 reference

## TIER 1 — Core (9 skills, always loaded)
1. tdd-workflow — RED/GREEN gates, git checkpoints
2. writing-plans — Anti-placeholder discipline, self-review checklist
3. executing-plans — Plan execution with verification gates
4. subagent-driven-development — Two-stage review (spec first, quality second)
5. security-review — Code patterns reference (Zod, parameterized SQL, JWT)
6. incremental-implementation — Slicing strategies, scope discipline
7. product-lens — Forcing questions, founder signal detection, anti-sycophancy
8. continuous-learning-v2 — Instinct model with confidence scoring
9. context-engineering — Context hierarchy, trust levels, confusion management

## TIER 2 — Active (10 skills, on-demand)
10. code-review — Code review pipeline and checklists
11. verification-loop — Comprehensive verification system
12. safety-guard — Destructive action prevention
13. dispatching-parallel-agents — Parallel agent dispatch patterns
14. spec-driven-development — Creates specs before coding
15. git-workflow — Git workflow patterns
16. python-testing — Python testing strategies (pytest)
17. codebase-onboarding — Analyze unfamiliar codebases
18. api-design — REST API design patterns
19. backend-patterns — Backend architecture patterns

## TIER 2 — Domain (5 skills, context-specific)
20. docker-patterns — Docker and Docker Compose patterns
21. browser-qa — Automated visual regression testing
22. e2e-testing — Playwright E2E testing patterns
23. canary-watch — Deployment canary monitoring
24. database-migrations — Database migration best practices

## Promotion / Demotion Criteria
- Promotion to TIER 1: >80% usage across 3+ projects
- Demotion to archive: 60+ days with zero invocations
