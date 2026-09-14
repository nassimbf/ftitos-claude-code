---
trigger: always_on
---

# Workflow

## Order of operations

1. **Research** — search GitHub, npm/PyPI, official docs before writing new code.
2. **Plan** — brief plan (what, how, edge cases). Align before touching code.
3. **TDD** — failing test first (RED), minimum code to pass (GREEN), then refactor. Never write tests after the fact.
4. **Implement** — no speculative features.
5. **Review** — lint, type check, security scan. Fix all errors before proceeding.
6. **Commit** — atomic conventional commit per task.

No dev servers outside tmux. Never leave the codebase broken — each task ends working.

## Testing

- 80% minimum coverage before a task is done. Measure it; don't assume.
- Unit tests for pure logic, integration for service boundaries, E2E for critical flows.
- Mock at system boundaries only (HTTP, DB, filesystem). Never mock internal modules.
- Name tests `test_<what>_<when>_<expected>`.
- No flaky tests — fix or quarantine anything intermittent.
- pytest for Python. Every number-generating function gets exhaustive known-input tests.

## Git

- Conventional commits: `feat:` `fix:` `refactor:` `docs:` `test:` `chore:` — `type(scope): message`.
- One logical change per commit. Never bundle unrelated changes.
- Branches: `feat/…`, `fix/…`, `chore/…`.
- Scan the diff before committing. Never commit `.env`, credentials, or tokens.
- Non-trivial changes go through a PR, one concern per PR.
- Never force-push to main/master. Confirm before any destructive git operation.
- Never `git stash pop` bare — use `git stash apply stash@{n}` with an explicit ref (the stash stack is shared across worktrees).

## Agents

- Batch independent agent calls in one message. Never run them sequentially.
- Fresh context per agent: CONTEXT.md + task description only. Never pass session history.
- Use subagents to keep large search/analysis output out of the main context.
- Never duplicate a search an agent is already running.
- Never mark a task complete without validation. Require proof.
