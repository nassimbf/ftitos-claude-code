# ftitos-claude-code v2.0

Claude Code configuration for CEO vibe coders. Parallel agents, framework-driven pipeline, ships fast, 3 human gates only.

## What's Included

| Component | Count | Purpose |
|-----------|-------|---------|
| Agents | 18 + 5 CCG | Specialist subagents (security, performance, TDD, etc.) |
| Skills | 24 (9 core + 15 on-demand) | Behavioral patterns loaded by tier |
| Rules | 6 + 10 language | Code standards, workflow, quality, review army |
| Hooks | 8 | GateGuard, tmux enforcement, session management |
| Commands | 8 root + 7 project | `/go`, `/plan`, `/tdd`, `/project:sprint`, etc. |
| Pipeline | 9 phases | VALIDATE > SPECIFY > PLAN > ANALYZE > BUILD > REVIEW > TEST > SHIP > MONITOR |
| Frameworks | 4 | BASE, PAUL, Aegis, CARL |
| Brain | 2 | Engram (session memory) + GitNexus (code structure) |

## Quick Start

```bash
git clone https://github.com/ftitos/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh          # Full install
./install.sh --dry-run  # Preview what gets copied
npm run doctor        # Health check (12 checks)
```

## Pipeline

```
VALIDATE > SPECIFY > PLAN > ANALYZE > [Gate 1: approve] > BUILD > REVIEW > TEST > [Gate 2: approved] > SHIP > [Gate 3: ship] > MONITOR
```

Start with `/go "Build feature X"` — everything between gates runs autonomously.

## Commands

| Command | Purpose |
|---------|---------|
| `/go "feature"` | CEO entry point, chains full pipeline |
| `/plan` | Write implementation plan |
| `/tdd` | Enforce test-driven development |
| `/build-fix` | Fix build errors |
| `/verify` | Run verification checks |
| `/code-review` | Trigger code review |
| `/brain <query>` | Query Engram/GitNexus |
| `/learn` | Extract reusable patterns |
| `/project:init` | Initialize project with all frameworks |
| `/project:sprint` | Advance sprint phase |
| `/project:status` | Show current state |
| `/project:review` | Run 7-specialist review army |
| `/project:analyze` | 8-check consistency gate |
| `/project:constitution` | Versioned project governance |
| `/project:ship` | Push with validation |

## Review Army

7 specialists dispatched in parallel based on diff scope:

1. **Security** (8/10 gate, NEVER_GATE) — auth bypass, injection, secrets, XSS
2. **Performance** (7/10, AUTO_GATE) — N+1, unbounded loops, missing indexes
3. **Data Migration** (8/10, NEVER_GATE) — reversibility, data loss, zero-downtime
4. **API Contract** (7/10, AUTO_GATE) — breaking changes, versioning, validation
5. **Testing** (7/10, AUTO_GATE) — coverage gaps, flaky tests, mock boundaries
6. **Maintainability** (7/10, AUTO_GATE) — function size, dead code, DRY
7. **Design/UX** (7/10, AUTO_GATE) — a11y, responsive, loading/error states

CRITICAL findings go through the Review Council (2 independent reviewers, anti-anchoring).

## Development

```bash
npm test              # Run all tests
npm run validate:agents
npm run validate:skills
npm run validate:hooks
```

## License

MIT
