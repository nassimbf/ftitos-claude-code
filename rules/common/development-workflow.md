# Development Workflow

Order of operations for any new feature or fix:

1. **Research first**: Search GitHub, npm/PyPI, official docs before writing new code. Don't reinvent what exists.
2. **Plan**: Write a brief plan (what, how, edge cases) before touching code. Align with the user on approach.
3. **TDD**: Write failing tests first. No implementation before a red test exists.
4. **Implement**: Minimum code to make tests green. No speculative features.
5. **Review**: Run linting, type checks, and security scan. Fix all errors before proceeding.
6. **Commit**: Atomic conventional commit per task.
7. **No dev servers outside tmux**: All long-running processes must run in a named tmux session.
8. **No half-finished work**: Never leave the codebase in a broken state. Each task must leave things working.
