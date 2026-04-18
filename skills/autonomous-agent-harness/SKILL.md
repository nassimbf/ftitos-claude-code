---
name: autonomous-agent-harness
description: Transform Claude Code into a fully autonomous agent system with persistent memory, scheduled operations, and task queuing.
origin: ECC
---

# Autonomous Agent Harness

Turn Claude Code into a persistent, self-directing agent system using native features and MCP servers.

## When to Activate

- User wants an agent that runs continuously or on a schedule
- Setting up automated workflows that trigger periodically
- Building a personal AI assistant that remembers context across sessions
- User says "run this every day", "check on this regularly", "keep monitoring"
- Needs computer use combined with scheduled execution

## Architecture

```
Claude Code Runtime
  ├── Crons (scheduled tasks)
  ├── Dispatch (remote agents)
  ├── Memory Store (persistent context)
  └── Computer Use (browser/desktop)
        │
        ▼
  Skill + Agent Layer
  (skills, agents, commands, hooks)
        │
        ▼
  MCP Server Layer
  (memory, github, search, browser-use)
```

## Core Components

### 1. Persistent Memory

- **Built-in memory**: Project memory files, loaded at session start
- **MCP memory server**: Structured knowledge graph with entities, relations, observations
- **Short-term**: TodoWrite for in-session tracking
- **Medium-term**: Project memory files for cross-session recall
- **Long-term**: MCP knowledge graph for permanent structured data

### 2. Scheduled Operations (Crons)

| Pattern | Schedule | Use Case |
|---------|----------|----------|
| Daily standup | `0 9 * * 1-5` | Review PRs, issues, deploy status |
| Weekly review | `0 10 * * 1` | Code quality metrics, test coverage |
| Hourly monitor | `0 * * * *` | Production health, error rate checks |
| Nightly build | `0 2 * * *` | Full test suite, security scan |

### 3. Dispatch / Remote Agents

Trigger Claude Code agents remotely for event-driven workflows:

```bash
# Trigger from CI/CD
claude -p "Build failed on main. Diagnose and fix."

# Trigger from another agent
claude -p "Analyze the output of the security scan and create issues for findings"
```

### 4. Task Queue

Manage a persistent queue of tasks that survive session boundaries:

```markdown
## Active Tasks
- [ ] PR #123: Review and approve if CI green
- [ ] Monitor deploy: check /health every 30 min for 2 hours

## Completed
- [x] Daily standup: reviewed 3 PRs, 2 issues
```

## Example Workflows

### Autonomous PR Reviewer
```
Cron: every 30 min during work hours
1. Check for new PRs on watched repos
2. For each new PR: pull branch, run tests, review changes
3. Post review comments
4. Update memory with review status
```

### Personal Research Agent
```
Cron: daily at 6 AM
1. Check saved search queries in memory
2. Run searches for each query
3. Summarize new findings
4. Compare against yesterday's results
5. Flag high-priority items for morning review
```

## Constraints

- Cron tasks run in isolated sessions -- no shared context with interactive sessions unless through memory
- Computer use requires explicit permission grants
- Remote dispatch may have rate limits
- Memory files should be kept concise -- archive old data
- Always verify that scheduled tasks completed successfully
