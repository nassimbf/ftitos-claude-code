---
name: project:init
description: Initialize a project with all integrated frameworks -- BASE + PAUL + Aegis + CARL in one command
argument-hint: "<project-name> [--path /absolute/path]"
allowed-tools: [Read, Write, Edit, Bash, Glob, AskUserQuestion]
---

<objective>
Bootstrap a new project with all four frameworks properly wired together:
1. Verify BASE workspace is scaffolded (parent .base/ exists)
2. Create project directory structure
3. Initialize PAUL phased planning (auto-registers with BASE via satellite protocol)
4. Initialize Aegis audit structure
5. Create shared project manifest (.project/manifest.json)
6. Log initial CARL decision
7. Summarize what was created and next steps

This is the single command that replaces running /base:scaffold, /paul:init, /aegis:init, and /carl_log_decision separately.
</objective>

<process>

## Step 1: Parse Arguments

Extract from $ARGUMENTS:
- `project-name`: required, used for directory and manifest
- `--path`: optional override for project location (default: cwd or $HOME/projects/[name])
- `--description`: optional project description

If project-name is missing, use AskUserQuestion to ask.

## Step 2: Verify BASE Workspace

Check if `.base/workspace.json` exists in the home directory (`$HOME/.base/workspace.json`).

If it does NOT exist:
```
Warning: BASE workspace not scaffolded.

Running /base:scaffold --full first...
```
Then follow the base:scaffold process (read @$HOME/.claude/base-framework/tasks/scaffold.md).

If it DOES exist:
```
OK: BASE workspace found at $HOME/.base/
```

## Step 3: Determine Project Path

- Default path: `$HOME/projects/[project-name]`
- If --path provided: use that path
- Create directory if it doesn't exist

```bash
mkdir -p $HOME/projects/[project-name]
mkdir -p $HOME/projects/[project-name]/.project
mkdir -p $HOME/projects/[project-name]/src
mkdir -p $HOME/projects/[project-name]/tests
mkdir -p $HOME/projects/[project-name]/docs
```

## Step 4: Initialize PAUL

Follow the PAUL init process for the project directory.
Reference: @$HOME/.claude/paul-framework/workflows/plan-phase.md

PAUL init will:
- Create `.paul/` directory in the project
- Create `.paul/PROJECT.md` -- project brief
- Create `.paul/ROADMAP.md` -- phase roadmap
- Create `.paul/STATE.md` -- current state
- Auto-register with BASE (satellite protocol triggers if .base/workspace.json found)

After PAUL init completes, verify:
```bash
ls $HOME/projects/[project-name]/.paul/
```

Expected: PROJECT.md, ROADMAP.md, STATE.md, and/or PHASES/ directory.

## Step 5: Initialize Aegis

Run /aegis:init process for the project directory.
Reference: @$HOME/.claude/commands/aegis/init.md

Aegis init will:
- Create `.aegis/` directory
- Create `.aegis/STATE.md` -- initialized, no audit started
- Create `.aegis/MANIFEST.md` -- project context for audits
- Create `.aegis/findings/` -- empty, populated by /aegis:audit

After Aegis init, verify:
```bash
ls $HOME/projects/[project-name]/.aegis/
```

## Step 6: Create Shared Project Manifest

Create `.project/manifest.json` using the template at `$HOME/.claude/scripts/templates/project-manifest.json`.

Fill in:
- `name`: project-name argument
- `description`: --description argument (or empty)
- `created`: current ISO timestamp (use `date -u +"%Y-%m-%dT%H:%M:%SZ"`)
- `frameworks.base.initialized`: true
- `frameworks.base.workspace_root`: `$HOME/.base`
- `frameworks.paul.initialized`: true (after step 4 succeeds)
- `frameworks.aegis.initialized`: true (after step 5 succeeds)
- `frameworks.carl.decisions_logged`: 0

Write to: `$HOME/projects/[project-name]/.project/manifest.json`

## Step 7: Create Project CLAUDE.md

Create a project-level CLAUDE.md at the project root:

```markdown
# [project-name]

[description]

## Framework Status
- BASE: Registered at $HOME/.base/
- PAUL: Initialized -- see .paul/STATE.md for current phase
- Aegis: Initialized -- run /project:review to audit
- CARL: Use /carl_log_decision to log decisions

## Commands
- /project:status -- Unified status dashboard
- /project:review -- Integrated code review + Aegis audit
- /project:sprint <phase> -- Advance sprint phase
- /project:ship -- Ship with full validation
- /paul:plan -- Create phased implementation plan
- /paul:apply -- Execute current phase
- /aegis:audit -- Full Aegis diagnostic
- /carl_log_decision -- Log architectural decision

## Workflow
VALIDATE -> PLAN -> BUILD -> REVIEW -> TEST -> SHIP -> MONITOR
Each step is gated: REVIEW must pass before SHIP.

## Testing
80% coverage minimum. TDD mandatory (write tests first).
```

## Step 8: Log Initial CARL Decision

Call the CARL MCP tool to log the project creation decision:

Use mcp__carl-mcp__carl_v2_log_decision with:
- domain: "project-init"
- decision: "Created project [project-name] with full framework integration"
- rationale: "Using BASE for workspace state, PAUL for phased planning, Aegis for validation, CARL for decision history"
- recall: "project-init, [project-name], framework-setup"

## Step 9: Update manifest carl counter

After CARL logging succeeds, update `.project/manifest.json`:
- Set `frameworks.carl.decisions_logged` to 1
- Set `frameworks.carl.last_decision` to the CARL decision ID

## Step 10: Display Summary

Output:
```
============================
PROJECT INITIALIZED: [project-name]
============================

Location: $HOME/projects/[project-name]

Frameworks:
  OK BASE   -- Registered in workspace at .base/data/
  OK PAUL   -- Phased planning at .paul/
  OK Aegis  -- Audit structure at .aegis/
  OK CARL   -- Decision logged (ID: [carl-id])

Created:
  .project/manifest.json    -- Shared framework state
  .paul/PROJECT.md          -- Project brief
  .paul/ROADMAP.md          -- Phase roadmap
  .paul/STATE.md            -- Current state (Phase: Research)
  .aegis/STATE.md           -- Audit ready (no audit run yet)
  CLAUDE.md                 -- Project rules

Next Steps:
  1. Run /paul:plan to create implementation plan
  2. Begin development following TDD
  3. Run /project:review before shipping
  4. Run /project:ship to ship with full validation

============================
```

</process>

<success_criteria>
- [ ] BASE workspace verified or created
- [ ] Project directory created at correct path
- [ ] .paul/ directory with PROJECT.md, ROADMAP.md, STATE.md
- [ ] .aegis/ directory with STATE.md, MANIFEST.md
- [ ] .project/manifest.json created with all frameworks marked initialized
- [ ] CLAUDE.md created with project rules and commands
- [ ] CARL decision logged (ID returned)
- [ ] Summary displayed with next steps
</success_criteria>
