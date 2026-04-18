# Engram Setup

Engram is the LEARNED engine. It provides persistent session memory -- observations, decisions, and learnings that survive across conversations and are searchable by future sessions.

## What It Does

- Saves structured observations after completing work (what, why, where, learned)
- Tracks session lifecycle (start, end, summary)
- Provides semantic search across all past observations
- Captures passive learnings from task output
- Supports topic-based upserts for evolving knowledge (same topic updates the same observation)
- Separates project-scoped and personal-scoped memories

## Prerequisites

- Node.js 18+ or Python 3.10+
- SQLite3
- Claude Code with MCP support

## Installation

1. Install the Engram MCP server:
   ```bash
   npm install -g engram-mcp
   ```

2. Register in `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "engram": {
         "command": "engram-mcp",
         "args": [],
         "env": {
           "ENGRAM_DB": "/path/to/engram.db"
         }
       }
     }
   }
   ```

3. The SQLite database is created automatically on first use.

## Configuration

| Environment Variable | Purpose | Default |
|---------------------|---------|---------|
| `ENGRAM_DB` | Path to SQLite database file | `~/.engram/engram.db` |

## Verification

1. Start a test session:
   ```
   Tool: mem_session_start
   id: "test-session"
   project: "verification"
   ```

2. Save a test observation:
   ```
   Tool: mem_save
   title: "Test observation"
   content: "**What**: Verifying Engram setup\n**Why**: Testing MCP connection"
   ```

3. Search for it:
   ```
   Tool: mem_search
   query: "test observation"
   ```

4. End the session:
   ```
   Tool: mem_session_end
   id: "test-session"
   ```

## MCP Tools

### Session Lifecycle

| Tool | Purpose |
|------|---------|
| `mem_session_start` | Register the start of a coding session |
| `mem_session_end` | Mark a session as completed with optional summary |
| `mem_session_summary` | Save a structured end-of-session summary (Goal, Discoveries, Accomplished, Files) |

### Observation Management

| Tool | Purpose |
|------|---------|
| `mem_save` | Save an observation with title, content, type, and optional topic key |
| `mem_save_prompt` | Save a user prompt for context tracking |
| `mem_update` | Update an existing observation by ID |
| `mem_get_observation` | Get full content of an observation by ID |
| `mem_suggest_topic_key` | Suggest a stable topic key for upserts |

### Search and Recall

| Tool | Purpose |
|------|---------|
| `mem_search` | Search observations by query, project, type, or scope |
| `mem_context` | Get recent memory context from previous sessions |

### Passive Capture

| Tool | Purpose |
|------|---------|
| `mem_capture_passive` | Extract structured learnings from text output (looks for "Key Learnings" sections) |

## Observation Format

The recommended format for observations:

```
**What**: [concise description of what was done]
**Why**: [the reasoning or problem that drove it]
**Where**: [files/paths affected]
**Learned**: [gotchas, edge cases, decisions made]
```

## Observation Types

| Type | When to Use |
|------|-------------|
| `decision` | Architectural or design decisions |
| `architecture` | System structure choices |
| `bugfix` | Bug fixes with root cause |
| `pattern` | Recurring patterns or conventions |
| `config` | Configuration changes |
| `discovery` | Non-obvious findings |
| `learning` | General learnings |
| `manual` | Anything else |

## Topic Keys for Upserts

For knowledge that evolves over time (like architecture decisions), use `topic_key` to update the same observation instead of creating duplicates:

```
Tool: mem_save
title: "Auth architecture"
content: "**What**: Using JWT with refresh tokens..."
topic_key: "architecture/auth-model"
```

Future saves with the same `topic_key` update the existing observation rather than creating a new one.

## Scoping

Observations have a `scope` field:

- **project**: Visible only when working on that project
- **personal**: Visible across all projects (personal preferences, general learnings)

Use project scope for implementation details and personal scope for workflow preferences.

## Session Summaries

End-of-session summaries use a structured format:

```
## Goal
[One sentence: what were we working on]

## Discoveries
- [Technical findings, gotchas]

## Accomplished
- [Completed tasks with key details]

## Relevant Files
- path/to/file.ts -- [what changed]
```

These summaries are the primary way future sessions understand what happened previously.
