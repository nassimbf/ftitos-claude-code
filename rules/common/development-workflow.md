# Development Workflow

Order of operations for any new feature or fix:

1. **Skill check**: Before implementing, check if a skill applies. If it does, invoke it — no exceptions.
2. **Research first**: Search GitHub, npm/PyPI, official docs before writing new code. Don't reinvent what exists.
3. **Plan**: Write a brief plan (what, how, edge cases) before touching code. Align with the user on approach.
4. **TDD**: Write failing tests first. No implementation before a red test exists.
5. **Implement**: Minimum code to make tests green. No speculative features.
6. **Review**: Run linting, type checks, and security scan. Fix all errors before proceeding.
7. **Commit**: Atomic conventional commit per task.
8. **No dev servers outside tmux**: All long-running processes must run in a named tmux session.
9. **No half-finished work**: Never leave the codebase in a broken state. Each task must leave things working.

## Skill Discipline

These rationalizations are incorrect — never use them to skip a skill:

| Rationalization | Why it's wrong |
|---|---|
| "This is too small for a skill" | Small tasks done wrong still create tech debt. The skill takes seconds to invoke. |
| "I already know how to do this" | Skills enforce process, not knowledge. Knowing the answer doesn't mean skipping the checklist. |
| "I'll follow the skill mentally" | Implicit is invisible. Invoke the skill so the process is documented and verifiable. |
| "I'll add tests/spec/review later" | Later never comes. The skill enforces the right order now. |

## Key Intent Routes

| User intent | Start with skill |
|---|---|
| New feature or project | `spec-driven-development` → `incremental-implementation` → `tdd-workflow` |
| Bug or unexpected behavior | `debugging-and-error-recovery` |
| UI/UX work | `ui-ux-pro-max` |
| Refactoring or simplification | `code-simplification` |
| Vague idea needs shaping | `idea-refine` |
| Verify against framework docs | `source-driven-development` |
| Code review | `code-review` |
