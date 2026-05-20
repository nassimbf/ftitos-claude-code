# CLAUDE.md

## What

Brief description of this project and what it does.

## Where

```
project-root/
├── src/           # Application source code
├── tests/         # Test files
├── docs/          # Documentation
├── scripts/       # Build and deployment scripts
└── CLAUDE.md      # This file
```

## How

### Development Workflow

1. All changes go through the sprint pipeline: Validate > Plan > Build > Review > Test > Ship
2. TDD is mandatory: write failing tests before implementation
3. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
4. 80% minimum test coverage before shipping

### Key Commands

- `npm test` -- Run test suite
- `npm run lint` -- Run linter
- `npm run build` -- Build for production

### Rules

- Never commit secrets or credentials
- Never skip the review gate
- All dev servers run inside tmux
- Atomic commits: one logical change per commit

### Architecture Notes

Document key architectural decisions here so Claude understands the system.
