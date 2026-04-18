# Customization Guide

How to add your own agents, skills, rules, hooks, and commands to extend the system.

---

## Adding Agents

Agents are Markdown files that define a specialized subagent with a specific role, model, and dispatch conditions.

### File Location

```
~/.claude/agents/your-agent-name.md
```

Or in the repo:

```
agents/your-agent-name.md
```

### File Format

```markdown
# Agent: your-agent-name

## Model
claude-sonnet-4-6

## Role
One paragraph describing what this agent does. Be specific about its domain
and what types of tasks it handles.

## Dispatch Conditions
- When the user asks about [specific domain]
- When [specific condition] is detected in the codebase
- During [specific pipeline phase]

## Checklist
- [ ] Check item 1
- [ ] Check item 2
- [ ] Check item 3

## Instructions
Detailed instructions for the agent. What to look for, what to flag,
what format to use for output.
```

### Model Selection

Choose the model based on the agent's workload:

| Model | Use When |
|-------|----------|
| `claude-haiku-4-5-20251001` | Simple classification, routing, extraction, worker tasks |
| `claude-sonnet-4-6` | Reasoning, code review, narrative generation (default) |
| `claude-opus-4-6` | Complex multi-agent orchestration only |

### Naming Convention

- Lowercase, hyphenated: `my-agent-name.md`
- Descriptive: name should indicate what the agent does
- No abbreviations unless universally understood

---

## Adding Skills

Skills are workflow automations triggered by slash commands. Each skill is a directory with a `SKILL.md` file.

### File Location

```
~/.claude/skills/your-skill-name/
  SKILL.md           # Required: skill definition
  hooks/             # Optional: pre/post hook scripts
    pre-tool-use.sh
    post-tool-use.sh
```

Or in the repo:

```
skills/your-skill-name/
  SKILL.md
```

### SKILL.md Format

```markdown
# Skill: your-skill-name

## Trigger
/your-command

## Description
What this skill does in one sentence.

## Instructions

Step-by-step instructions for Claude to follow when this skill is triggered.

1. First, do X
2. Then check Y
3. Output Z in this format

## Output Format

Describe the expected output format here.

## Dependencies

- Requires: [list of required tools, MCP servers, or other skills]
- Optional: [list of optional enhancements]
```

### Adding Hooks to Skills

If your skill needs to run scripts before or after certain tool calls, add a `hooks/` subdirectory:

```
skills/your-skill-name/
  SKILL.md
  hooks/
    pre-tool-use.sh    # Runs before tool calls within this skill
    post-tool-use.sh   # Runs after tool calls within this skill
```

Hook scripts receive the tool name and parameters as arguments. See [Adding Hooks](#adding-hooks) for the script interface.

---

## Adding Rules

Rules are behavioral constraints that Claude follows. They are Markdown files loaded into the system prompt.

### File Location

Common rules (apply to all languages):

```
~/.claude/rules/your-rule.md
```

Language-specific rules (apply only when that language is detected):

```
~/.claude/rules/python/your-python-rule.md
~/.claude/rules/typescript/your-ts-rule.md
~/.claude/rules/golang/your-go-rule.md
~/.claude/rules/swift/your-swift-rule.md
```

Or in the repo:

```
rules/common/your-rule.md
rules/python/your-python-rule.md
```

### Rule File Format

```markdown
# Rule Name

Brief description of what this rule enforces.

## Rules

- **Rule 1**: Description of the constraint
- **Rule 2**: Description of the constraint
- **Rule 3**: Description of the constraint
```

### Guidelines for Writing Rules

- Be specific. "Write clean code" is useless. "Functions must be under 50 lines" is actionable.
- Rules are constraints, not suggestions. Claude treats them as mandatory.
- Keep rules short. A rule file over 100 lines is too long — split it into multiple files.
- Test your rule by intentionally violating it in a Claude Code session. If Claude does not flag the violation, the rule is too vague.
- Rules in `~/.claude/rules/` apply to all projects. Use project-level rules (in the project's `.claude/rules/`) for project-specific constraints.

---

## Adding Hooks

Hooks are shell scripts that execute in response to Claude Code lifecycle events.

### Configuration

Hooks are registered in `~/.claude/hooks.json` (global) or `.claude/hooks.json` (project-level).

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "name": "my-hook",
        "command": "bash ~/.claude/hooks/scripts/my-hook.sh",
        "description": "What this hook does"
      }
    ]
  }
}
```

### Available Hook Events

| Event | When It Fires | Common Use |
|-------|--------------|------------|
| `PreToolUse` | Before any tool call executes | Block unsafe operations (GateGuard) |
| `PostToolUse` | After a tool call completes | Log actions, save observations |
| `PreCompact` | Before context compaction | Checkpoint critical state |
| `PostCompact` | After context compaction | Recover essential context |
| `SessionStart` | When a Claude Code session begins | Load instincts, check state |
| `SessionEnd` | When a session ends | Save summary, flush memory |
| `Stop` | When Claude stops generating | Final cleanup |
| `UserPromptSubmit` | When the user sends a message | Input validation |

### Script Interface

Hook scripts receive information via environment variables and stdin. The script's exit code determines behavior:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Allow the action to proceed |
| Non-zero | Block the action (for Pre* hooks) / Flag an issue (for Post* hooks) |

For `PreToolUse` hooks, the tool name and parameters are available as environment variables:

```bash
#!/bin/bash
# Example: block Write calls to .env files
TOOL_NAME="$1"
FILE_PATH="$2"

if [[ "$TOOL_NAME" == "Write" && "$FILE_PATH" == *.env* ]]; then
  echo "BLOCKED: Cannot write to .env files"
  exit 1
fi

exit 0
```

### Making Hooks Executable

Hook scripts must be executable:

```bash
chmod +x ~/.claude/hooks/scripts/my-hook.sh
```

---

## Adding Commands

Commands are slash-command definitions that appear in the Claude Code session.

### File Location

```
~/.claude/commands/your-command.md
```

Or for namespaced commands:

```
~/.claude/commands/namespace/command-name.md
```

This creates the command `/namespace:command-name`.

### Command File Format

```markdown
# /your-command

## Description
What this command does in one sentence.

## Arguments
- `$1` — first argument description
- `$2` — second argument description (optional)

## Instructions

Detailed instructions for Claude to follow when this command is invoked.

Step 1: ...
Step 2: ...
Step 3: ...
```

### Namespacing

Commands in subdirectories are namespaced with a colon:

```
commands/project/init.md     -> /project:init
commands/project/sprint.md   -> /project:sprint
commands/base/status.md      -> /base:status
```

This keeps related commands grouped and prevents name collisions.

---

## Extending Frameworks

The 4 frameworks (BASE, PAUL, Aegis, CARL) can be extended with additional data surfaces, phases, or rules.

### BASE: Adding Data Surfaces

BASE stores workspace state in `.base/data/`. Add new data surfaces by creating JSON files:

```json
// .base/data/my-surface.json
{
  "name": "my-surface",
  "description": "What this surface tracks",
  "data": {}
}
```

Register the surface in `.base/workspace.json` under the `surfaces` array.

### PAUL: Adding Phases

PAUL manages project phases in `.paul/phases/`. Add a new phase by creating a directory:

```
.paul/phases/05-my-phase/
  PHASE.md      # Phase description and tasks
  tasks/        # Individual task files
```

Phase numbering determines execution order. PAUL chains phases sequentially.

### Aegis: Adding Audit Rules

Aegis runs pre-commit audits. Add rules by editing `.aegis/config.json`:

```json
{
  "rules": [
    {
      "name": "my-rule",
      "description": "What this rule checks",
      "severity": "HIGH",
      "check": "grep -r 'pattern' --include='*.py'"
    }
  ]
}
```

### CARL: Adding Decision Domains

CARL manages decisions via MCP. Add a new domain:

```
Use the carl_v2_create_domain tool with domain "MY_DOMAIN" and recall keywords ["keyword1", "keyword2"]
```

Or add decisions to existing domains:

```
Use the carl_v2_log_decision tool with domain "DEVELOPMENT", decision "chose X over Y", rationale "because Z"
```

---

## Validation

After adding any component, verify it with the health check:

```bash
npm run doctor
```

For specific component types:

```bash
npm run validate:agents    # Check all agent files parse correctly
npm run validate:skills    # Check all skills have SKILL.md
npm run validate:hooks     # Check all hook scripts exist and are executable
```

---

## Tips

- Start small. Add one agent or rule, test it, then iterate.
- Read existing components before creating new ones. The patterns are consistent and intentional.
- Rules and hooks are the highest-leverage additions. A single rule change affects every session.
- Agents are the lowest-leverage addition unless you have a specific, recurring workflow that needs specialization.
- Always test in a scratch project before applying to real work.
