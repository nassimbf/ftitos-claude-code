# Frameworks

Four frameworks work together to manage the full lifecycle of AI-assisted development: workspace state, project planning, code auditing, and decision logging.

## Overview

| Framework | Purpose | Location | Scope |
|-----------|---------|----------|-------|
| BASE | Workspace state management | `~/.base/` | Global (one per workspace) |
| PAUL | Phased project planning | `projects/*/.paul/` | Per-project |
| Aegis | Code audit and validation | `projects/*/.aegis/` | Per-project |
| CARL | Dynamic rules and decision logging | `~/.carl/` via MCP | Global + per-domain |

## How They Integrate

```
BASE (workspace layer)
 ├── Tracks all projects, satellites, and data surfaces
 ├── Registers PAUL-tracked projects in workspace.json
 ├── Grooming cadence triggers staleness checks across all areas
 │
 ├── PAUL (per-project planning)
 │    ├── Milestone-based phased execution
 │    ├── Loop lifecycle: discuss -> plan -> apply -> verify -> unify
 │    ├── STATE.md tracks current position in the loop
 │    └── Reports progress back to BASE surfaces
 │
 ├── Aegis (per-project auditing)
 │    ├── Diagnostic audit across security, architecture, correctness domains
 │    ├── Finding severity: CRITICAL > HIGH > MEDIUM > LOW
 │    ├── Runs independently or as part of sprint review gate
 │    └── Produces actionable remediation plans
 │
 └── CARL (cross-cutting rules)
      ├── Domain-scoped rules loaded by recall keywords
      ├── Decision logging with rationale capture
      ├── Rule staging pipeline: propose -> stage -> approve
      └── always_on domains (GLOBAL, APW) load every session
```

## When to Use Each

**Starting a new project?** Run `/paul:init` inside the project directory. This creates the `.paul/` structure with `paul.json`, `PROJECT.md`, and `ROADMAP.md`.

**Need workspace-level tracking?** Use BASE. Register the project as a satellite in `workspace.json`, create data surfaces for structured tracking.

**Shipping code?** The sprint pipeline runs `VALIDATE -> PLAN -> BUILD -> REVIEW -> TEST -> SHIP -> MONITOR`. Aegis runs during REVIEW. PAUL tracks which phase you are in.

**Making an architectural decision?** Log it in CARL with `carl_v2_log_decision`. The decision persists across sessions and can be searched later.

**Auditing existing code?** Run `/aegis:init` then `/aegis:audit`. Aegis produces domain-specific findings with severity ratings and remediation steps.

## Setup Order

1. **BASE** first -- it manages the workspace and registers everything else
2. **CARL** second -- rules and decisions are cross-cutting and inform all other work
3. **PAUL** per-project -- initialize when you start planning a project
4. **Aegis** per-project -- initialize when code exists and needs auditing

## Directory Structure

```
~/
├── .base/
│   ├── workspace.json          # Workspace config, areas, surfaces, satellites
│   ├── operator.json           # Operator profile (deep why, north star, values)
│   └── data/
│       ├── projects.json       # Active work + backlog
│       ├── entities.json       # People, orgs, systems
│       ├── state.json          # Workspace health + drift
│       ├── psmm.json           # Per-session meta memory
│       ├── ideas.json          # Idea lifecycle tracking
│       ├── staging.json        # Proposed changes for review
│       ├── orchestration.json  # Multi-execution state
│       └── team.json           # Skill matrix + load
│
├── .carl/
│   └── carl-mcp/               # MCP server (Node.js)
│       ├── index.js
│       └── carl.json            # All domains, rules, decisions
│
├── projects/
│   └── <project>/
│       ├── .paul/
│       │   ├── paul.json        # Project + milestone + phase state
│       │   ├── PROJECT.md       # Project brief
│       │   ├── ROADMAP.md       # Phase roadmap
│       │   └── STATE.md         # Current loop position
│       │
│       └── .aegis/
│           ├── MANIFEST.md      # Framework version + installed tools
│           ├── scope.md         # What is being audited and why
│           ├── STATE.md         # Current audit progress
│           └── domain_*.md      # Per-domain findings
```

## Further Reading

- [BASE documentation](base/README.md)
- [PAUL documentation](paul/README.md)
- [Aegis documentation](aegis/README.md)
- [CARL documentation](carl/README.md)
