# AGENTS.md -- Cross-Harness Agent Instructions

## Agent Dispatch Rules

### Model Selection

| Model | Use Case |
|-------|----------|
| claude-haiku-4-5 | Classification, routing, simple extraction, worker tasks |
| claude-sonnet-4-6 | Reasoning, code review, main conversation thread |
| claude-opus-4-6 | Orchestration of multi-agent workflows only |

Default subagents to haiku unless the task requires reasoning.

### Dispatch by Task Type

| Task | Agent Type | Parallelizable |
|------|-----------|----------------|
| Codebase search | Explore | Yes |
| Implementation planning | Plan | No (sequential) |
| Bug diagnosis | Debugger | Yes |
| Security review | Security-reviewer | Yes (post-write) |
| Code review | Code-reviewer | Yes (post-write) |
| Multi-step research | General-purpose | Depends |

### Parallel Dispatch

Independent agent calls must be dispatched in parallel. Never run independent searches or reviews sequentially.

```
Good:  [search-auth, search-db, search-api]  -- all at once
Bad:   search-auth -> wait -> search-db -> wait -> search-api
```

### Context Rules

1. Never pass session history to builder agents
2. Each agent receives: CONTEXT.md + task description only
3. Use agents to isolate large outputs from the main context window
4. Never duplicate work that a subagent is already doing

### Review Army Dispatch

The Review Army dispatches 2-7 specialist agents based on diff scope:

| Specialist | Condition |
|-----------|-----------|
| Security | SCOPE_AUTH=true OR SCOPE_BACKEND=true |
| Performance | (SCOPE_FRONTEND OR SCOPE_BACKEND) AND changed_lines >= 50 |
| Data Migration | SCOPE_MIGRATIONS=true |
| API Contract | SCOPE_API=true |
| Testing | changed_lines >= 50 |
| Maintainability | changed_lines >= 50 |
| Design/UX | SCOPE_FRONTEND=true |

Run `scripts/diff-scope.sh` to detect scope before dispatching specialists.

### Review Council (Santa Method)

When any specialist flags a CRITICAL finding:

1. Spawn 2 independent reviewer agents in parallel
2. Each reviewer sees only the finding + relevant code
3. Reviewers cannot see each other's output (anti-anchoring)
4. Both CONFIRM = blocks ship. Both DISMISS = downgrade to MEDIUM. Split = escalate to user.
