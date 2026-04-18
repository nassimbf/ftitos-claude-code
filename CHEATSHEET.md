# ftitos-claude-code — The Complete Cheat Sheet

> **Version 1.0.0** | 20 Agents | 40 Skills | 15 Rules | 25 Hooks | 4 Frameworks | 4 Brain Engines
>
> One-command install. 3 human gates. Everything else autonomous.

---

## Table of Contents

1. [Install & Verify](#1-install--verify)
2. [The Sprint Pipeline (7 Phases, 3 Gates)](#2-the-sprint-pipeline)
3. [Every Command](#3-every-command)
4. [Every Agent (20)](#4-every-agent)
5. [Every Skill (40)](#5-every-skill)
6. [Every Rule (15)](#6-every-rule)
7. [Every Hook (25)](#7-every-hook)
8. [The 4 Frameworks](#8-the-4-frameworks)
9. [The 4-Brain System](#9-the-4-brain-system)
10. [Parallel Agent Patterns](#10-parallel-agent-patterns)
11. [Review Army + Council Protocol](#11-review-army--council-protocol)
12. [Model Selection Guide](#12-model-selection-guide)
13. [TDD Workflow (RED/GREEN/REFACTOR)](#13-tdd-workflow)
14. [Project Templates](#14-project-templates)
15. [Customization (Add Your Own)](#15-customization)
16. [Scripts & CI](#16-scripts--ci)
17. [Troubleshooting](#17-troubleshooting)
18. [The 6 Principles](#18-the-6-principles)

---

## 1. Install & Verify

### Prerequisites

| Requirement | Check |
|-------------|-------|
| Node.js 18+ | `node --version` |
| Claude Code CLI | `claude --version` |
| git | `git --version` |

### Install (2 minutes)

```bash
git clone https://github.com/nassimbf/ftitos-claude-code.git
cd ftitos-claude-code
./install.sh
```

### What gets installed

```
~/.claude/
├── agents/          ← 20 specialist agent definitions
├── skills/          ← 40 skill directories (each with SKILL.md)
├── rules/           ← 15 behavioral rules (10 common + 5 Python)
├── hooks/scripts/   ← 14 hook scripts
├── commands/        ← 11 slash commands
└── settings.json    ← hooks.json merged into settings
```

### Verify

```bash
npm run doctor       # Full health check
npm run test         # Run test suite
```

Expected output:
```
[OK] 20 agents loaded
[OK] 40 skills loaded
[OK] 15 rules loaded
[OK] 25 hooks registered
[OK] 10+ commands available
Status: HEALTHY
```

### Uninstall

```bash
npm run uninstall    # Reads manifest, removes only what was installed
```

### Installer flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Show what would be installed without copying |
| `--force` | Overwrite existing files (creates `.bak.TIMESTAMP` backups) |
| `--help` | Show usage |

---

## 2. The Sprint Pipeline

### The Flow

```
VALIDATE ──→ PLAN ──→ [GATE 1] ──→ BUILD ──→ REVIEW ──→ TEST ──→ [GATE 2] ──→ SHIP ──→ [GATE 3] ──→ MONITOR
  auto        auto     approve       auto      auto       auto     approved      auto      ship        auto
```

### Phase-by-Phase

| # | Phase | What Happens | Duration | Human? |
|---|-------|-------------|----------|--------|
| 1 | **VALIDATE** | Product-lens analysis, market research (4 parallel agents), risk assessment | 5-10 min | Auto |
| 2 | **PLAN** | Generate PLAN.md, validate tasks, lock CONTEXT.md, decompose into waves | 10-20 min | Auto |
| - | **GATE 1** | Review plan + architecture decisions | - | Type `approve` |
| 3 | **BUILD** | Parallel TDD builders: RED → GREEN → REFACTOR → atomic commit per task | 1-4 hrs | Auto |
| 4 | **REVIEW** | 7 specialist reviewers + security scan + Aegis audit + OWASP/STRIDE | 10-30 min | Auto |
| 5 | **TEST** | Module verification, browser QA (if UI), coverage check (80%+) | 10-20 min | Auto |
| - | **GATE 2** | Test the product yourself | - | Type `approved` |
| 6 | **SHIP** | Pre-flight checks, rollback tag, commit, push, release docs, CARL log | 5 min | Auto |
| - | **GATE 3** | Final push confirmation | - | Type `ship` |
| 7 | **MONITOR** | Canary health checks, browser smoke tests, auto-rollback if failure | 5-10 min | Auto |

### Quick Start

```
/project:init my-app                  # Bootstrap all 4 frameworks
/project:sprint validate              # Start the pipeline
# ... pipeline runs autonomously ...
approve                               # Gate 1: approve the plan
# ... BUILD + REVIEW + TEST run ...
approved                              # Gate 2: you tested it
# ... SHIP prepares ...
ship                                  # Gate 3: push to production
# ... MONITOR watches deployment ...
```

### Check Status Anytime

```
/project:status                       # Dashboard: phase, progress, blockers
/project:sprint status                # Current phase details
```

---

## 3. Every Command

### Root Commands

| Command | What It Does | Args |
|---------|-------------|------|
| `/brain <query>` | Routes query to right brain engine (GBrain/Graphify/GitNexus/Engram) | `<query or subcommand>` |
| `/plan <desc>` | Create implementation plan with planner agent, waits for `approve` | `<what to build>` |
| `/tdd <desc>` | Full TDD cycle: scaffold → RED → GREEN → REFACTOR → verify 80%+ | `<what to test and implement>` |
| `/build-fix` | Auto-detect build system, fix errors one-by-one (max 3 retries per error) | none (auto-detects) |
| `/code-review` | Security + quality review of uncommitted changes | none |
| `/verify [mode]` | Run all quality checks: build → types → lint → tests → secrets → logs | `quick`, `full`, `pre-commit`, `pre-pr` |

### Project Commands (`/project:*`)

| Command | What It Does | Args |
|---------|-------------|------|
| `/project:init <name>` | Bootstrap project with BASE + PAUL + Aegis + CARL | `<name> [--path /abs] [--description "..."]` |
| `/project:sprint <phase>` | Advance pipeline phase | `validate`, `plan`, `build`, `review`, `test`, `ship`, `monitor`, `status`, `next` |
| `/project:status [name]` | Unified dashboard (all frameworks + sprint + compliance) | `[project-name or path]` |
| `/project:review [mode]` | Full review pipeline (code + security + Aegis + OWASP + Army + Council) | `--quick`, `--security-only`, `--full` |
| `/project:ship` | Ship pipeline (verify gate → test → coverage → commit → push → docs → CARL) | `[--force] [--message '...']` |

### Brain Subcommands

```
/brain who is Sarah Chen              → GBrain (person lookup)
/brain how does auth work             → GitNexus (code architecture)
/brain what concepts relate to X      → Graphify (concept graph)
/brain impact of changing X           → GitNexus (blast radius)
/brain what did we decide about       → Engram (session memory)
/brain remember <observation>         → Engram (save learning)
/brain last session                   → Engram (session summary)
/brain index                          → Index project in all systems
/brain status                         → Show brain health
/brain search <query>                 → Parallel search all 4 brains
```

### Verify Modes

```
/verify                               # Full: build + types + lint + tests + secrets + logs
/verify quick                         # Build + types only
/verify pre-commit                    # Checks relevant for commits
/verify pre-pr                        # Full + security scan
```

---

## 4. Every Agent

### Agent Overview (20 total)

| Agent | Model | Color | Role | Tools |
|-------|-------|-------|------|-------|
| **architect** | opus | blue | System design, scalability, tech decisions | Read, Grep, Glob |
| **planner** | opus | cyan | Task decomposition, phase planning, risk ID | Read, Grep, Glob |
| **product-manager** | sonnet | blue | Product lifecycle, roadmap, PRDs, launch | WebFetch, WebSearch, Read, Write, Edit |
| **backend-developer** | sonnet | blue | APIs, microservices, DB schema, auth | Read, Write, Edit, Bash, Glob, Grep |
| **fullstack-developer** | sonnet | - | DB-to-UI feature implementation | Read, Write, Edit, Bash, Glob, Grep |
| **code-reviewer** | sonnet | yellow | Quality, security, maintainability review | Read, Grep, Glob, Bash |
| **python-reviewer** | sonnet | - | PEP 8, type hints, Pythonic idioms, security | Read, Grep, Glob, Bash |
| **security-reviewer** | sonnet | red | OWASP Top 10, secrets, injection, auth bypass | Read, Write, Edit, Bash, Grep, Glob |
| **tdd-guide** | sonnet | - | RED → GREEN → REFACTOR enforcement, 80%+ coverage | Read, Write, Edit, Bash, Grep |
| **debugger** | sonnet | orange | Root cause analysis, stack traces, log analysis | Read, Write, Edit, Bash, Glob, Grep |
| **build-error-resolver** | sonnet | - | Fix build/type errors with minimal diffs only | Read, Write, Edit, Bash, Grep, Glob |
| **performance-engineer** | sonnet | magenta | N+1, memory leaks, caching, load testing | Read, Write, Edit, Bash, Glob, Grep |
| **e2e-runner** | sonnet | - | Playwright tests, flaky test quarantine, artifacts | Read, Write, Edit, Bash, Grep, Glob |
| **qa-expert** | sonnet | yellow | Test strategy, coverage analysis, quality metrics | Read, Grep, Glob, Bash |
| **data-analyst** | haiku | green | Dashboards, statistical analysis, SQL optimization | Read, Write, Edit, Bash, Glob, Grep |
| **doc-updater** | haiku | - | Codemaps, READMEs, AST analysis, dependency maps | Read, Write, Edit, Bash, Grep, Glob |
| **refactor-cleaner** | sonnet | - | Dead code removal, deduplication, dependency cleanup | Read, Write, Edit, Bash, Grep, Glob |
| **research-analyst** | sonnet | - | Multi-source research, synthesis, trend reports | Read, Grep, Glob, WebFetch, WebSearch |
| **prompt-engineer** | sonnet | - | Prompt design, token optimization, eval frameworks | Read, Write, Edit, Bash, Glob, Grep |
| **constitutional-validator** | sonnet | purple | Principle alignment check before implementation | Read, Grep, Glob |

### When to Use Which Agent

| Task | Primary Agent | Backup |
|------|--------------|--------|
| Plan a feature | planner | architect |
| Build backend API | backend-developer | fullstack-developer |
| Build full feature (DB→UI) | fullstack-developer | backend-developer |
| Review code | code-reviewer | python-reviewer (Python) |
| Security audit | security-reviewer | code-reviewer |
| Diagnose a bug | debugger | code-reviewer |
| Fix build errors | build-error-resolver | debugger |
| Performance issues | performance-engineer | backend-developer |
| Write tests | tdd-guide | e2e-runner |
| E2E browser tests | e2e-runner | tdd-guide |
| Remove dead code | refactor-cleaner | code-reviewer |
| Update docs | doc-updater | architect |
| Product decisions | product-manager | planner |
| Data analysis | data-analyst | - |
| Research a topic | research-analyst | - |
| Optimize prompts | prompt-engineer | - |
| QA strategy | qa-expert | - |
| Validate against principles | constitutional-validator | planner |

---

## 5. Every Skill

### By Category

#### Architecture & Design (10)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `agent-harness-construction` | Auto | Action space design, tool schemas, observation formatting for agents |
| `agentic-engineering` | Auto | Eval-first execution, 15-min unit decomposition, cost-aware routing |
| `ai-first-engineering` | Auto | Process shifts for AI-heavy teams: planning > speed, behavior > syntax |
| `autonomous-agent-harness` | Auto | Persistent memory, scheduled ops, task queuing for Claude Code |
| `autonomous-loops` | Auto | Loop architectures: sequential, infinite, continuous PR, RFC-driven DAG |
| `hexagonal-architecture` | Auto | Ports & Adapters: domain model, use cases, inbound/outbound ports |
| `backend-patterns` | Auto | Repository/service layers, middleware, N+1 prevention, caching, RBAC |
| `django-patterns` | Auto | Django + DRF: split settings, custom QuerySets, service layer, signals |
| `docker-patterns` | Auto | Compose for dev, multi-stage Dockerfiles, networking, container security |
| `frontend-patterns` | Auto | React composition, custom hooks, context + reducer, virtualization |

#### Testing & Quality (8)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `tdd-workflow` | `/tdd` | RED → GREEN → REFACTOR with git checkpoints, 80%+ coverage |
| `ai-regression-testing` | Auto | Catch AI blind spots: sandbox/prod mismatch, SELECT omission, state leakage |
| `python-testing` | Auto | pytest: fixtures, parametrize, markers, mocking, async, conftest |
| `e2e-testing` | Auto | Playwright: Page Object Model, config, flaky test quarantine, CI/CD |
| `code-review` | `/code-review` | Automated checks → focus areas → severity grouping → fix cycle |
| `eval-harness` | Auto | Eval-driven development: capability/regression evals, pass@k, graders |
| `verification-loop` | `/verify` | Build → types → lint → tests → security → diff review |
| `skill-comply` | Auto | Auto-generate scenarios, run agents, report compliance rates |

#### Process & Workflow (7)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `brainstorming` | Auto | Idea → clarifying questions → 2-3 approaches → design doc → spec review |
| `search-first` | Auto | Check npm/PyPI/GitHub/MCPs before building custom. Decision: adopt/extend/compose/build |
| `deep-research` | Auto | 3-5 sub-questions, 15-30 sources, parallel subagents, cited reports |
| `dispatching-parallel-agents` | Auto | 3+ independent problems → focused agent tasks → parallel dispatch → integrate |
| `subagent-driven-development` | Auto | Plan → per-task builder dispatch → spec reviewer → code reviewer → done |
| `continuous-learning-v2` | Auto | Session hooks → observations → pattern detection → instincts → evolution |
| `strategic-compact` | Auto | Compact at phase boundaries, not mid-task. Token optimization patterns |

#### Development Patterns (8)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `coding-standards` | Auto | TypeScript/JS/React standards: naming, functions, immutability, types |
| `git-workflow` | Auto | Branching (GitHub Flow), conventional commits, PR templates, conflict resolution |
| `api-design` | Auto | REST: resource naming, status codes, pagination, filtering, rate limiting, versioning |
| `database-migrations` | Auto | Safety checklist, PostgreSQL patterns, ORM workflows, expand-contract strategy |
| `deployment-patterns` | Auto | Rolling/blue-green/canary, Docker, GitHub Actions CI/CD, health checks, rollback |
| `python-patterns` | Auto | PEP 8, type hints, EAFP, context managers, dataclasses, concurrency |
| `markdown-mermaid-writing` | Auto | 24 diagram types, accTitle rules, snake_case IDs, text-based docs |
| `mcp-server-patterns` | Auto | Build MCP servers: tools, resources, prompts, Zod validation, stdio/HTTP |

#### DevOps & Monitoring (3)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `canary-watch` | Auto | Post-deploy monitoring: HTTP, console errors, performance, content, API health |
| `browser-qa` | Auto | Playwright smoke test, interaction test, visual regression, accessibility (axe-core) |
| `cost-aware-llm-pipeline` | Auto | Model routing by complexity, budget tracking, retry logic, prompt caching |

#### Product & Security (2)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `product-lens` | Auto | Office hours (7 forcing questions), founder review, user journey audit, ICE scoring |
| `security-review` | Auto | Secrets, input validation, SQL injection, auth, XSS, CSRF, rate limiting, deps |

#### Onboarding & Documentation (2)

| Skill | Invoke | What It Does |
|-------|--------|-------------|
| `codebase-onboarding` | Auto | Reconnaissance → architecture map → convention detection → onboarding guide |
| `context-budget` | Auto | Audit context window: scan agents/skills/rules/MCPs, classify, report token usage |

---

## 6. Every Rule

### Common Rules (10)

| Rule | File | Key Constraints |
|------|------|----------------|
| **Coding Style** | `coding-style.md` | Immutability, files < 800 lines, functions < 50 lines, nesting < 3, no dead code |
| **Testing** | `testing.md` | 80%+ coverage, TDD mandatory, test pyramid, no mocking internals, no flaky tests |
| **Security** | `security.md` | No hardcoded secrets, parameterized SQL, XSS prevention, CSRF, rate limiting, input validation |
| **Git Workflow** | `git-workflow.md` | Conventional commits, atomic commits, no secrets in commits, no force push to main |
| **Development Workflow** | `development-workflow.md` | Research → Plan → TDD → Implement → Review → Commit. Dev servers in tmux only |
| **Agents** | `agents.md` | Parallel by default, fresh context per agent, right agent for job, no duplicate work |
| **Performance** | `performance.md` | Haiku for workers, Sonnet for main, Opus for orchestration. Compact aggressively |
| **Anti-Slop** | `anti-slop.md` | 17-item blacklist: no gradient heroes, no "unleash the power", no Lorem Ipsum |
| **Review Army** | `review-army.md` | 7 specialists with dispatch conditions, confidence gates, severity mappings |
| **Review Council** | `review-council.md` | Santa Method: 2 independent reviewers for CRITICALs, anti-anchoring, decision matrix |

### Python Rules (5)

| Rule | File | Key Constraints |
|------|------|----------------|
| **Coding Style** | `python/coding-style.md` | PEP 8, type annotations on all functions, frozen dataclasses, black/isort/ruff |
| **Testing** | `python/testing.md` | pytest framework, `--cov=src`, pytest.mark categorization |
| **Security** | `python/security.md` | dotenv + os.environ, bandit for static analysis |
| **Hooks** | `python/hooks.md` | Auto-format .py with black/ruff, type check with mypy/pyright, warn on print() |
| **Patterns** | `python/patterns.md` | Pythonic idioms, EAFP, context managers, Protocol-based typing |

### Anti-Slop Blacklist (17 items)

**Visual (7):** No purple gradients, no icon-in-circle grids, no shadow-on-everything, no emoji in UI, no stock-photo heroes, no glassmorphism, no particle animations

**Copy (5):** No "unleash/unlock", no "revolutionary/cutting-edge", no empty "seamless/robust/scalable", no "leverage/synergy", no "In today's fast-paced world"

**Code (5):** No Lorem Ipsum, no fake data (John Doe), no meaningless spinners, no untracked TODOs, no passthrough wrappers, no restating comments

---

## 7. Every Hook

### Hook Events (7 types, 25 total)

| Event | Count | Fires When |
|-------|-------|-----------|
| **PreToolUse** | 9 | Before a tool executes |
| **PostToolUse** | 5 | After a tool executes |
| **PreCompact** | 1 | Before context compaction |
| **PostCompact** | 1 | After context compaction |
| **SessionStart** | 4 | New session begins |
| **SessionEnd** | 2 | Session ends |
| **Stop** | 1 | After each response |

### Hook Details

#### GateGuard — Read Before Edit

| Hook | Event | Matches | Behavior |
|------|-------|---------|----------|
| `gateguard-pre-edit.js` | PreToolUse | Edit, Write | **BLOCKS** edits to files not Read in session. New files allowed. |
| `gateguard-track-read.js` | PostToolUse | Read | Tracks which files have been Read (session file: `.gateguard-reads-[PID]`) |

#### Brain Integration

| Hook | Event | Matches | Behavior |
|------|-------|---------|----------|
| `brain-pretooluse.js` | PreToolUse | Grep, Glob | Augments search with GitNexus + Graphify code graph results (async, 5s timeout) |
| `brain-post-commit.js` | PostToolUse | Bash | After git commit/merge/rebase, warns if brain indexes are stale |

#### Session Management

| Hook | Event | Behavior |
|------|-------|----------|
| `session-start.js` | SessionStart | Loads most recent session summary (matches by worktree → project → recency) |
| `session-start-learnings.js` | SessionStart | Loads cross-session instincts (confidence > 0.5) |
| `session-end.js` | SessionEnd | Extracts session summary from transcript, saves for next session |
| `evaluate-session.js` | SessionEnd | Evaluates session for extractable patterns |

#### Safety & Quality

| Hook | Event | Matches | Behavior |
|------|-------|---------|----------|
| `pre-edit-backup.js` | PreToolUse | Edit, Write | Backs up files before editing (only outside git repos) |
| `pre-bash-dev-server-block.js` | PreToolUse | Bash | **BLOCKS** `npm run dev` / `pnpm dev` / `yarn dev` / `bun run dev` outside tmux |
| `check-console-log.js` | Stop | - | Warns about `console.log` in modified JS/TS files (excludes tests) |

#### Context Management

| Hook | Event | Matches | Behavior |
|------|-------|---------|----------|
| `suggest-compact.js` | PreToolUse | Edit, Write | Suggests compaction every 50 tool calls (configurable via `COMPACT_THRESHOLD`) |
| `pre-compact.js` | PreCompact | - | Saves checkpoint: branch, commits, modified files, sprint phase |

### Hook Protocol

**Block a tool call:**
```json
{ "decision": "block", "reason": "File not read yet" }
```

**Pass through (no changes):**
```json
{}
```

**Inject context:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Previous session summary..."
  }
}
```

---

## 8. The 4 Frameworks

### Overview

| Framework | Purpose | Location | Scope |
|-----------|---------|----------|-------|
| **BASE** | Workspace state, project registry, operator profile | `~/.base/` | Global (home dir) |
| **PAUL** | Phased planning, task decomposition, dependencies | `.paul/` per project | Per-project |
| **Aegis** | Code audit, security scans, architecture validation | `.aegis/` per project | Per-project |
| **CARL** | Decision logging with rationale and recall keywords | `~/.carl/` via MCP | Global (queryable) |

### BASE — Workspace State

```
~/.base/
├── workspace.json       # Workspace config, project registry
├── operator.json        # Your profile (name, email, values, north star)
└── data/                # 9 data surfaces
    ├── projects.json
    ├── team.json
    ├── ideas.json
    ├── compliance-scores.json
    └── failure-patterns.json
```

**Key commands:**
```
/base:orientation        # Complete your operator profile
/base:status             # Workspace health check
/base:audit              # Deep workspace optimization
/base:pulse              # Daily health briefing
/base:weekly             # Weekly review + planning
```

### PAUL — Phased Planning

```
project/
└── .paul/
    ├── PROJECT.md       # Project definition
    ├── PLAN.md          # Current plan with tasks
    ├── ROADMAP.md       # High-level roadmap
    ├── STATE.md         # Current state
    └── phases/          # Phase directories
        └── 01-phase-name/
            └── tasks/   # Individual task files
```

**Key commands:**
```
/paul:init               # Initialize PAUL in a project
/paul:plan               # Generate implementation plan
/paul:progress           # Show completion status
/paul:status             # Current phase details
```

**Task format:** Each task is < 2 hours, single responsibility, specific file ownership, clear acceptance criteria.

### Aegis — Code Audit

```
project/
└── .aegis/
    ├── STATE.md         # Audit state
    ├── MANIFEST.md      # Audit config
    └── findings/        # Stored findings per run
```

**Audit domains:** Security, Architecture, Correctness, Performance, Testing, Maintainability

**Key commands:**
```
/aegis:init              # Initialize Aegis in a project
/aegis:audit             # Run full diagnostic
/aegis:report            # View audit report
/aegis:remediate         # Generate fix plans
```

### CARL — Decision Logging

```
~/.carl/                 # Managed via MCP server
├── domains/             # Decision domains
│   ├── architecture/
│   ├── performance/
│   ├── security/
│   └── development/
└── staging/             # Pending rule proposals
```

**Key commands:**
```
/carl:log <domain> <decision> <rationale>    # Record a decision
/carl:search <keyword>                        # Find past decisions
/carl:domains                                 # List all domains
```

**Example:**
```
/carl:log ARCHITECTURE "chose SQLite over Postgres" "Single file, zero config, fast for demo scale"
```

---

## 9. The 4-Brain System

### Architecture

```
/brain <query>
    │
    ├── "who is..." ──────→ GBrain   (30+ tools)  WHO + WHY
    ├── "how does..." ────→ GitNexus (16 tools)   WHERE + IMPACT
    ├── "what concept..." ─→ Graphify (7 tools)    WHAT + HOW
    └── "what did we..." ──→ Engram   (11 tools)   LEARNED
```

### GBrain — People & Decisions (WHO + WHY)

| Tool | What It Does |
|------|-------------|
| `create_entities` | Add person/company with observations |
| `search_nodes` | Find entities by name/type/content |
| `create_relations` | Map relationships (works_at, manages, etc.) |
| `add_observations` | Add facts about existing entities |
| `open_nodes` | Retrieve specific entities by name |
| `delete_entities` | Remove entities |
| `delete_relations` | Remove relationships |

**Example queries:**
```
/brain who is responsible for the payment module?
/brain why did we switch from REST to GraphQL?
```

### GitNexus — Code Intelligence (WHERE + IMPACT)

| Tool | What It Does |
|------|-------------|
| `query` | Search code patterns, execution flows (BM25 + semantic) |
| `context` | 360-degree view: callers, callees, processes for a symbol |
| `impact` | Blast radius: what breaks at depth 1/2/3 if you change this |
| `detect_changes` | Map uncommitted git diff to affected execution flows |
| `rename` | Multi-file coordinated rename via graph + text search |
| `route_map` | API route → handler → consumer mappings |
| `shape_check` | Response shape mismatches between routes and consumers |
| `api_impact` | Pre-change impact report for API route handlers |
| `cypher` | Raw Cypher queries against code knowledge graph |
| `tool_map` | MCP/RPC tool definitions and handlers |
| `group_query` | Search across multiple repos |
| `group_sync` | Rebuild cross-repo contract registry |

**Example queries:**
```
/brain where is the user validation logic?
/brain what breaks if I rename validateUser?
/brain show execution flow for POST /api/users
/brain impact of changing AuthService
```

### Graphify — Concept Mapping (WHAT + HOW)

| Tool | What It Does |
|------|-------------|
| Create notes | Add concept notes with rich markdown |
| Search notes | Semantic search across knowledge graph |
| Link notes | Connect related concepts |
| List by tag | Filter notes by category |
| Sync | Bidirectional sync with Obsidian vault |

**Example queries:**
```
/brain what is our authentication flow?
/brain how does the event processing pipeline work?
```

### Engram — Session Memory (LEARNED)

| Tool | What It Does |
|------|-------------|
| `mem_save` | Save observation (decision, bugfix, pattern, discovery) |
| `mem_search` | Find past observations by keyword |
| `mem_context` | Get recent observations for context loading |
| `mem_session_start` | Track session start |
| `mem_session_end` | Track session end |
| `mem_session_summary` | Save structured end-of-session summary |
| `mem_capture_passive` | Extract learnings from text output |
| `mem_update` | Update existing observation |
| `mem_get_observation` | Retrieve full observation by ID |
| `mem_save_prompt` | Save user prompt for context |
| `mem_suggest_topic_key` | Get stable key for upserts |

**Observation types:** `decision`, `architecture`, `bugfix`, `pattern`, `config`, `discovery`, `learning`, `manual`

**Example queries:**
```
/brain what did we learn about rate limiting?
/brain what bugs have we fixed in auth?
/brain what was accomplished last session?
```

### Brain Setup (all optional)

All 4 brains are optional. The sprint pipeline, agents, skills, rules, and hooks work without them.

Register in `~/.claude.json`:
```json
{
  "mcpServers": {
    "memory":    { "command": "memory-mcp" },
    "graphify":  { "command": "graphify-mcp" },
    "gitnexus":  { "command": "gitnexus-mcp" },
    "engram":    { "command": "engram-mcp" }
  }
}
```

---

## 10. Parallel Agent Patterns

### Rule: Parallel by Default

Independent agent calls MUST go in a single message with multiple tool calls. Never run them sequentially.

### Pattern: Research Phase (3+ parallel agents)

```
┌──────────────────────────────────────────────┐
│  Single message with 3 Agent tool calls      │
│                                              │
│  Agent 1: Market research     ──→ results    │
│  Agent 2: Competitor analysis ──→ results    │
│  Agent 3: Tech stack review   ──→ results    │
│                                              │
│  All run simultaneously                      │
└──────────────────────────────────────────────┘
```

### Pattern: Review Phase (2-7 parallel specialists)

```
Step 1: Run diff-scope.sh to detect SCOPE flags
Step 2: Dispatch matching specialists in ONE message

┌──────────────────────────────────────────────┐
│  Single message with N Agent tool calls      │
│                                              │
│  If SCOPE_AUTH:     → Security Specialist    │
│  If SCOPE_BACKEND:  → Performance Specialist │
│  If SCOPE_MIGRATIONS: → Migration Specialist │
│  If SCOPE_API:      → API Contract Specialist│
│  If 50+ lines:      → Testing Specialist     │
│  If 50+ lines:      → Maintainability Spec.  │
│  If SCOPE_FRONTEND: → Design/UX Specialist   │
│                                              │
│  All dispatch in parallel                    │
└──────────────────────────────────────────────┘
```

### Pattern: Build Phase (wave-based parallelism)

```
Wave 1: Independent tasks (no dependencies)
  ├── Builder A: task-1 (auth module)
  ├── Builder B: task-2 (database schema)
  └── Builder C: task-3 (config setup)

Wave 2: Tasks that depend on Wave 1
  ├── Builder D: task-4 (API endpoints, needs DB schema)
  └── Builder E: task-5 (auth middleware, needs auth module)

Wave 3: Integration tasks
  └── Builder F: task-6 (wire everything together)
```

### Pattern: Council Protocol (2 parallel reviewers)

```
When a CRITICAL finding is flagged:

┌──────────────────────────────────────────────┐
│  Single message with 2 Agent tool calls      │
│                                              │
│  Reviewer A: sees finding + code only        │
│  Reviewer B: sees finding + code only        │
│                                              │
│  Neither sees the other's output             │
│  (anti-anchoring)                            │
└──────────────────────────────────────────────┘

Decision matrix:
  Both CONFIRM  → CRITICAL stands, blocks ship
  Both DISMISS  → downgrade to MEDIUM
  Split verdict → escalate to user
```

### Fresh Context Rule

Every builder/subagent gets:
- `CONTEXT.md` (architecture decisions)
- Task description
- Relevant file list

Every builder/subagent does NOT get:
- Session history
- Other agents' outputs
- Full repo contents

---

## 11. Review Army + Council Protocol

### Diff Scope Detection

The `diff-scope.sh` script sets these flags:

| Flag | Triggered By |
|------|-------------|
| `SCOPE_AUTH` | auth, login, session, jwt, oauth, permission, rbac, password, credential |
| `SCOPE_BACKEND` | *.py, *.go, *.rs, *.java, server/, backend/, services/, models/ |
| `SCOPE_FRONTEND` | *.tsx, *.jsx, *.vue, *.svelte, components/, pages/, *.css, *.html |
| `SCOPE_MIGRATIONS` | migration, migrate, alembic, schema, flyway |
| `SCOPE_API` | api/*, routes/*, endpoints/*, openapi, swagger, *.graphql |
| `changed_lines` | Total insertions + deletions |

### The 7 Specialists

| # | Specialist | Dispatch Condition | Confidence Gate | Gating |
|---|-----------|-------------------|-----------------|--------|
| 1 | **Security** | SCOPE_AUTH OR SCOPE_BACKEND | 8/10 | NEVER_GATE (always runs) |
| 2 | **Performance** | (FRONTEND OR BACKEND) AND 50+ lines | 7/10 | AUTO_GATE |
| 3 | **Data Migration** | SCOPE_MIGRATIONS | 8/10 | NEVER_GATE (always runs) |
| 4 | **API Contract** | SCOPE_API | 7/10 | AUTO_GATE |
| 5 | **Testing** | 50+ lines changed | 7/10 | AUTO_GATE |
| 6 | **Maintainability** | 50+ lines changed | 7/10 | AUTO_GATE |
| 7 | **Design/UX** | SCOPE_FRONTEND | 7/10 | AUTO_GATE |

### Finding Format

```
[SEVERITY] Confidence: X/10 — description
Evidence: file:line
Impact: what breaks or degrades
Fix: specific action
```

### Auto-Fix Rules

| Action | Auto-Fix? |
|--------|----------|
| Replace hardcoded secret with env var | Yes |
| Remove dead code, unused imports | Yes |
| Magic numbers → named constants | Yes |
| Fix obvious N+1 with unambiguous ORM method | Yes |
| Add missing alt text (clear context) | Yes |
| Change auth logic, session handling, crypto | **Ask first** |
| Add database indexes (requires migration) | **Ask first** |
| Change visual design | **Ask first** |
| Edit migration files | **Never auto-fix** |

### Council Protocol (for CRITICALs only)

```
CRITICAL finding flagged
         │
    ┌────┴────┐
    ▼         ▼
Reviewer A  Reviewer B     (parallel, independent, anti-anchored)
    │         │
    ▼         ▼
 CONFIRM?   CONFIRM?
    │         │
    └────┬────┘
         │
    ┌────┴────────────────────┐
    │ Both CONFIRM → CRITICAL │  blocks ship
    │ Both DISMISS → MEDIUM   │  does not block
    │ Split       → ASK USER  │  user decides
    └─────────────────────────┘
```

---

## 12. Model Selection Guide

| Model | Cost | Use For | Agent Examples |
|-------|------|---------|---------------|
| **claude-haiku-4-5** | Cheapest | Classification, routing, extraction, worker tasks | data-analyst, doc-updater |
| **claude-sonnet-4-6** | Medium | Reasoning, code generation, review, main conversation | code-reviewer, backend-developer, security-reviewer, tdd-guide, debugger (13 agents) |
| **claude-opus-4-6** | Highest | Complex multi-agent orchestration only | architect, planner (2 agents) |

### Rules of Thumb

- Start with haiku for subagents. Route up only if quality is insufficient.
- Main conversation thread uses sonnet by default.
- Opus is for orchestration of complex workflows, never for routine tasks.
- Log model decisions for cost tracking.
- Use prompt caching for system prompts > 1024 tokens.

---

## 13. TDD Workflow

### The Cycle

```
1. WRITE TEST (RED)
   └── Test describes expected behavior
   └── Run test → MUST FAIL

2. WRITE CODE (GREEN)
   └── Minimum code to pass the test
   └── Run test → MUST PASS

3. REFACTOR
   └── Clean up while keeping tests green
   └── Run test → STILL PASSES

4. COMMIT
   └── git commit -m "feat(scope): description"

5. VERIFY COVERAGE
   └── Must be >= 80%
```

### Git Checkpoint Pattern

```bash
# After RED phase
git commit -m "test(auth): add failing test for login validation"

# After GREEN phase
git commit -m "feat(auth): implement login validation"

# After REFACTOR phase
git commit -m "refactor(auth): extract validation helpers"
```

### Edge Cases to Always Test

1. Null/undefined input
2. Empty arrays/strings
3. Invalid types
4. Boundary values (min/max)
5. Error paths (network failures, DB errors)
6. Race conditions (concurrent operations)
7. Large data (10k+ items)
8. Special characters (Unicode, SQL chars)

### Coverage Requirements

| Code Type | Minimum Coverage |
|-----------|-----------------|
| Critical paths (auth, payment, data deletion) | 100% |
| Business logic | 80% |
| Utility functions | 80% |
| UI components | 80% |

---

## 14. Project Templates

### Generic Project (`CLAUDE.md`)

```markdown
## What
[Project description]

## Where
[Directory structure]

## How
- Sprint pipeline: Validate → Plan → Build → Review → Test → Ship
- TDD mandatory (80%+ coverage)
- Conventional commits
- Dev servers in tmux
```

### Fullstack (React + Node.js + Express + Prisma)

```markdown
Stack: React 18, Node.js, Express, Prisma, PostgreSQL
Tests: Vitest (unit), supertest (API), Playwright (E2E)
Dev: npm run dev (in tmux)
DB: npx prisma migrate dev
Conventions: services for API calls, validate client + server
Error shape: { error: string, details?: object }
```

### Python API (FastAPI + SQLAlchemy)

```markdown
Stack: FastAPI, SQLAlchemy 2.0, PostgreSQL, pytest
Tests: pytest --cov=app
Dev: uvicorn app.main:app --reload (in tmux)
Migrations: Alembic
Conventions: parameterized SQL, Pydantic validation, service layer
```

---

## 15. Customization

### Add an Agent

Create `~/.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: What this agent does
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
model: sonnet
color: green
---

# My Agent

## Role
One paragraph describing the agent's purpose.

## When to Use
- Condition 1
- Condition 2

## Checklist
- [ ] Check item 1
- [ ] Check item 2

## Instructions
Detailed behavioral instructions.
```

### Add a Skill

Create `~/.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: What this skill does in one sentence
origin: custom
---

# My Skill

## When to Use
Describe activation conditions.

## Workflow
1. Step one
2. Step two
3. Step three

## Output Format
What the skill produces.
```

### Add a Rule

Create `~/.claude/rules/my-rule.md`:

```markdown
# My Rule

- **Constraint 1**: Description of what must/must not happen
- **Constraint 2**: Description of what must/must not happen
```

### Add a Hook

1. Create script `~/.claude/hooks/scripts/my-hook.js`:

```javascript
const input = JSON.parse(require("fs").readFileSync("/dev/stdin", "utf8"));
const filePath = input.tool_input?.file_path || "";

if (filePath.endsWith(".env")) {
  console.log(JSON.stringify({ decision: "block", reason: "Cannot edit .env files" }));
} else {
  console.log(JSON.stringify({}));
}
```

2. Register in hooks.json or settings.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node ~/.claude/hooks/scripts/my-hook.js" }
        ]
      }
    ]
  }
}
```

### Validate Custom Components

```bash
npm run validate:agents    # Check agent files
npm run validate:skills    # Check skill directories
npm run validate:hooks     # Check hook scripts
npm run doctor             # Full health check
```

---

## 16. Scripts & CI

### Available Scripts

| Command | Script | What It Does |
|---------|--------|-------------|
| `./install.sh` | `scripts/install-apply.js` | Copy agents/skills/rules/hooks to `~/.claude/`, merge hooks.json |
| `npm run uninstall` | `scripts/uninstall.js` | Remove installed files via manifest |
| `npm run doctor` | `scripts/doctor.js` | Validate Node.js, CLI, agents, skills, rules, hooks, MCPs |
| `npm run test` | `tests/run-all.js` | Run all `*.test.js` files |
| `npm run validate:agents` | `scripts/ci/validate-agents.js` | Check agent files are > 10 chars |
| `npm run validate:skills` | `scripts/ci/validate-skills.js` | Check skills have SKILL.md with frontmatter |
| `npm run validate:hooks` | `scripts/ci/validate-hooks.js` | Check hooks.json structure + script syntax |

### Diff Scope Script

```bash
bash scripts/diff-scope.sh
```

Analyzes git diff and outputs scope flags used by Review Army:
```
SCOPE_AUTH=true
SCOPE_BACKEND=true
SCOPE_FRONTEND=false
SCOPE_MIGRATIONS=false
SCOPE_API=true
changed_lines=142
```

### CI Validation (GitHub Actions)

The repo includes `.github/workflows/` with CI that runs:
1. `npm run validate:agents`
2. `npm run validate:skills`
3. `npm run validate:hooks`
4. `npm run test`

---

## 17. Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run doctor` fails | Check Node.js >= 18 (`node --version`). Reinstall with `./install.sh --force` |
| GateGuard blocks my edit | Read the file first with the Read tool. GateGuard requires Read before Edit/Write |
| Review Army dispatches 0 specialists | Change is < 50 lines or touches unrecognized file types. Run `bash scripts/diff-scope.sh` to check |
| Pipeline stuck after Gate 1 | Type exactly `approve` (not "approved", "yes", "ok") |
| Pipeline stuck after Gate 2 | Type exactly `approved` |
| Pipeline stuck after Gate 3 | Type exactly `ship` |
| Hook script failing | Ensure Node.js 18+ is in shell PATH. Run `node scripts/doctor.js` |
| Dev server blocked | Use tmux: `tmux new-session -d -s dev "npm run dev"` |
| MCP server not connecting | Check `~/.claude.json` for server config. Run `/brain status` |
| Context feels sluggish | Run `context-budget` skill to audit token usage. Compact with `/compact` |
| Install overwrote my files | Files are backed up as `filename.bak.TIMESTAMP`. Restore from backup |
| Want to install only specific parts | Copy individual directories manually: `cp -r agents/ ~/.claude/agents/` |

---

## 18. The 6 Principles

### 1. TDD First
Write the failing test before the implementation. RED → GREEN → REFACTOR. 80% coverage minimum. Tests written after the fact are verification theater.

### 2. No AI Slop
17-item blacklist prevents generic AI patterns. No gradient heroes, no "unleash the power", no Lorem Ipsum, no passthrough wrappers. Goal: work that passes review by a senior engineer who doesn't care how it was made.

### 3. Autonomous Pipeline
7 phases, 3 human gates. Everything between gates runs unsupervised. The system must be reliable enough to execute autonomously. Every phase must leave the codebase working.

### 4. Decision Logging
Every non-trivial decision recorded in CARL with domain, rationale, and recall keywords. Future-you needs to know why decisions were made. Without a log, decisions get relitigated. With a log, they get referenced.

### 5. Fact-Forcing
Never accept AI claims without evidence. Read the source. Run the code. Check the docs. GateGuard blocks edits to files not read first. Prevents the most common failure: confidently modifying code you haven't looked at.

### 6. Multi-Specialist Review
No single reviewer catches everything. 7 specialists dispatch based on diff scope. When a specialist flags CRITICAL, Review Council (Santa Method) spawns 2 independent reviewers with anti-anchoring. Prevents both false positives and groupthink.

---

## Quick Reference Card

```
GETTING STARTED
  ./install.sh                          Install everything
  npm run doctor                        Verify installation
  /project:init my-app                  Bootstrap a new project
  /project:sprint validate              Start the pipeline

DAILY WORKFLOW
  /project:status                       Where am I?
  /project:sprint next                  Advance to next phase
  /tdd <feature>                        Write tests then code
  /code-review                          Review before commit
  /verify                               Run all quality checks
  /brain <query>                        Search across all 4 brains

SHIPPING
  /project:review                       Full review pipeline
  /project:ship                         Commit + push + docs
  approve / approved / ship             Gate responses

DEBUGGING
  npm run doctor                        Health check
  /build-fix                            Fix build errors
  /verify quick                         Fast build + types check

RESEARCH
  /brain who is <person>                People lookup
  /brain how does <code> work           Code architecture
  /brain what did we decide about       Past decisions
  /brain impact of changing <symbol>    Blast radius analysis
```

---

*Built on [everything-claude-code](https://github.com/anthropics/everything-claude-code), [gstack](https://github.com/anthropics/gstack), [gbrain](https://github.com/anthropics/gbrain), [graphify](https://github.com/anthropics/graphify), [GitNexus](https://github.com/anthropics/gitnexus), [engram](https://github.com/anthropics/engram), and [claude-code-best-practice](https://github.com/anthropics/claude-code-best-practice).*
