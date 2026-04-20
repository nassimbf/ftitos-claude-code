# ftitos-claude-code

A Claude Code configuration that runs a project from first commit to deployed and monitored — with only 3 human checkpoints.

---

## What it does

Claude Code ships with a good base, but no structure around how it plans, reviews, tests, or ships. This project provides that structure: 20 specialist agents, 48 skills, 15 behavioral rules, and a lifecycle hook system — all installed into `~/.claude/` with one command.

Start a feature with `/project:sprint validate`. Claude validates scope, writes a plan, gets your approval (Gate 1), builds autonomously, runs 7 parallel code reviewers, executes tests, asks you to do UAT (Gate 2), ships, then confirms the push (Gate 3). The three gates are the only manual steps.

Built for developers who want Claude Code to behave like a disciplined engineering team, not a chat assistant.

---

## Quick Start

```bash
# Clone
git clone https://github.com/nassimbf/ftitos-claude-code.git
cd ftitos-claude-code

# Install (copies agents, skills, rules, hooks, commands into ~/.claude/)
./install.sh

# Verify everything installed correctly
npm run doctor
```

Expected output from `doctor`:
```
[OK] 20 agents loaded
[OK] 48 skills loaded
[OK] 15 rules loaded
[OK] 14 hooks registered
[OK] 11 commands available
All checks passed.
```

Requirements: Node.js 18+, Claude Code CLI. Zero external npm dependencies.

---

## How it works

```mermaid
flowchart LR
    V[VALIDATE] -->|auto| P[PLAN]
    P -->|"Gate 1: approve plan"| B[BUILD]
    B -->|auto| R[REVIEW]
    R -->|auto| T[TEST]
    T -->|"Gate 2: UAT"| S[SHIP]
    S -->|"Gate 3: confirm push"| M[MONITOR]
```

Three gates. Everything between them runs without intervention.

| Gate | Trigger | Your action |
|------|---------|-------------|
| Gate 1 | `PLAN.md` generated with scope, tasks, and risks | Review, type `approve` |
| Gate 2 | Build complete, review cleared, tests pass | Test the product, type `approved` |
| Gate 3 | Release packaged, changelog generated | Confirm push, type `ship` |

**Start:** `/project:sprint validate` — **Check status:** `/project:status`

See [guides/architecture.md](guides/architecture.md) for the full system design.

---

## Key features

- **Review Army** — 7 parallel specialist reviewers (security, performance, migrations, API contracts, testing, maintainability, UX) dispatched based on what changed in the diff. Each has a focused checklist and a confidence threshold.
- **Review Council** — when a specialist flags a CRITICAL finding, two independent reviewer agents validate it before it can block ship. Neither sees the other's verdict (anti-anchoring). Two dismissals downgrade the finding; a split escalates to you.
- **GateGuard** — blocks `Edit` and `Write` calls on any file that has not been `Read` in the current session. Prevents modifying code you have not looked at.
- **4-brain memory** — four MCP engines routed via `/brain <query>`: GBrain (people/companies), Graphify (concepts/knowledge), GitNexus (code structure/blast radius), Engram (session memory/cross-session recall).
- **CARL decision log** — every architectural decision is recorded with domain scoping and recall keywords, queryable across sessions, promotable to permanent rules.
- **Anti-slop enforcement** — 17-item behavioral rule that blocks generic AI output patterns (gradient backgrounds, copy clichés, meaningless abstractions) before they reach output.
- **Context survival** — auto-checkpoint before compaction, auto-recovery after. Session context survives `claude --compact`.
- **20 specialist agents** — architect, security-reviewer, tdd-guide, debugger, refactor-cleaner, and 15 others. Each has a focused role and dispatch conditions.
- **48 skills** — covering TDD, architecture patterns, agentic engineering, deployment, context management, design intelligence, and language-specific conventions.
- **15 behavioral rules** — coding style, git workflow, testing discipline, security pre-commit checklist, agent usage, and more. All enforced via hooks and rule files.

---

## Documentation

| Guide | What it covers |
|-------|---------------|
| [guides/quickstart.md](guides/quickstart.md) | Install and verify in under 5 minutes |
| [guides/architecture.md](guides/architecture.md) | Full system design, component relationships, data flow |
| [guides/brain-system.md](guides/brain-system.md) | 4-brain MCP setup, routing, and usage |
| [guides/customization.md](guides/customization.md) | Adding agents, skills, rules, and hooks |
| [guides/hackathon-playbook.md](guides/hackathon-playbook.md) | Speed-run setup for time-constrained events |
| [frameworks/README.md](frameworks/README.md) | BASE, PAUL, Aegis, and CARL framework details |

---

## Credits

This project builds on 9 open-source projects. Nothing here was invented from scratch.

| Source | Author | Role |
|--------|--------|------|
| [everything-claude-code](https://github.com/anthropics/everything-claude-code) | Anthropic community | Foundation architecture: hook lifecycle, agent dispatch, skill registration, GateGuard, Review Army, anti-slop rules, context recovery |
| [claude-code-best-practice](https://github.com/anthropics/claude-code-best-practice) | Anthropic | Reference patterns for rules, context management, and project structure |
| [gstack](https://github.com/garrytan/gstack) | Garry Tan | QA automation, canary monitoring, ship pipeline, security audit, browser QA, and 30+ production workflow skills |
| [gbrain](https://github.com/garrytan/gbrain) | Garry Tan | People and company intelligence (WHO + WHY engine, 30+ MCP tools) |
| [graphify](https://github.com/safishamsi/graphify) | Safi Shamsi | Concept mapping and knowledge graphs (WHAT + HOW engine, 7 MCP tools) |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Abhigyan Patwari | Code knowledge graphs, blast radius analysis, call chain tracing (WHERE + IMPACT engine, 16 MCP tools) |
| [engram](https://github.com/Gentleman-Programming/engram) | Gentleman Programming | Persistent session memory with cross-session recall (LEARNED engine, 11 MCP tools) |
| [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | nextlevelbuilder | UI/UX design intelligence — 344+ searchable design resources via BM25 engine (styles, colors, fonts, UX rules) |
| [agent-skills](https://github.com/addyosmani/agent-skills) | Addy Osmani | Engineering workflow skills — source-driven development, context engineering, debugging triage, spec-driven development, idea refinement |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, skills, rules, and hooks. CI validates every component on push.

## License

[MIT](LICENSE)
