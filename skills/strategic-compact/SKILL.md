---
name: strategic-compact
description: Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.
origin: ECC
---

# Strategic Compact Skill

Suggests manual `/compact` at strategic points in your workflow rather than relying on arbitrary auto-compaction.

## When to Activate

- Running long sessions that approach context limits (200K+ tokens)
- Working on multi-phase tasks (research -> plan -> implement -> test)
- Switching between unrelated tasks within the same session
- After completing a major milestone and starting new work
- When responses slow down or become less coherent (context pressure)

## Why Strategic Compaction?

Auto-compaction triggers at arbitrary points:
- Often mid-task, losing important context
- No awareness of logical task boundaries
- Can interrupt complex multi-step operations

Strategic compaction at logical boundaries:
- **After exploration, before execution** -- Compact research context, keep implementation plan
- **After completing a milestone** -- Fresh start for next phase
- **Before major context shifts** -- Clear exploration context before different task

## Compaction Decision Guide

| Phase Transition | Compact? | Why |
|-----------------|----------|-----|
| Research -> Planning | Yes | Research context is bulky; plan is the distilled output |
| Planning -> Implementation | Yes | Plan is in task list or a file; free up context for code |
| Implementation -> Testing | Maybe | Keep if tests reference recent code; compact if switching focus |
| Debugging -> Next feature | Yes | Debug traces pollute context for unrelated work |
| Mid-implementation | No | Losing variable names, file paths, and partial state is costly |
| After a failed approach | Yes | Clear the dead-end reasoning before trying a new approach |

## What Survives Compaction

| Persists | Lost |
|----------|------|
| CLAUDE.md instructions | Intermediate reasoning and analysis |
| Task list | File contents you previously read |
| Memory files | Multi-step conversation context |
| Git state (commits, branches) | Tool call history and counts |
| Files on disk | Nuanced user preferences stated verbally |

## Best Practices

1. **Compact after planning** -- Once plan is finalized in task list, compact to start fresh
2. **Compact after debugging** -- Clear error-resolution context before continuing
3. **Don't compact mid-implementation** -- Preserve context for related changes
4. **Read the suggestion** -- The hook tells you *when*, you decide *if*
5. **Write before compacting** -- Save important context to files or memory before compacting
6. **Use `/compact` with a summary** -- Add a custom message: `/compact Focus on implementing auth middleware next`

## Token Optimization Patterns

### Trigger-Table Lazy Loading
Instead of loading full skill content at session start, use a trigger table that maps keywords to skill paths. Skills load only when triggered, reducing baseline context by 50%+.

### Context Composition Awareness
Monitor what's consuming your context window:
- **CLAUDE.md files** -- Always loaded, keep lean
- **Loaded skills** -- Each skill adds 1-5K tokens
- **Conversation history** -- Grows with each exchange
- **Tool results** -- File reads, search results add bulk

### Duplicate Instruction Detection
Common sources of duplicate context:
- Same rules in both global and project rules
- Skills that repeat CLAUDE.md instructions
- Multiple skills covering overlapping domains
