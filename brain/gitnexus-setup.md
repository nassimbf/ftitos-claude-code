# GitNexus Setup

GitNexus is the WHERE + IMPACT engine. It indexes codebases into a knowledge graph, enabling structural queries, call chain tracing, blast radius analysis, and change impact detection.

## What It Does

- Indexes source code into a Kuzu graph database (functions, classes, methods, files, folders)
- Tracks relationships: CALLS, IMPORTS, EXTENDS, IMPLEMENTS, HAS_METHOD, HAS_PROPERTY, ACCESSES
- Groups code into communities (auto-detected functional areas) and processes (execution flows)
- Provides blast radius analysis before making changes
- Detects which execution flows are affected by uncommitted git changes
- Maps API routes to handlers and consumers
- Supports raw Cypher queries against the code graph

## Prerequisites

- Node.js 18+
- Python 3.10+ (for the indexer)
- Git (for change detection)
- Claude Code with MCP support

## Installation

1. Install the GitNexus MCP server:
   ```bash
   npm install -g gitnexus-mcp
   ```

2. Install the indexer (Python):
   ```bash
   pip install gitnexus-indexer
   ```

3. Register in `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "gitnexus": {
         "command": "gitnexus-mcp",
         "args": [],
         "env": {
           "GITNEXUS_DATA": "/path/to/gitnexus/data"
         }
       }
     }
   }
   ```

## Configuration

| Environment Variable | Purpose | Default |
|---------------------|---------|---------|
| `GITNEXUS_DATA` | Directory for Kuzu databases and index data | `~/.gitnexus` |

## Indexing a Repository

Before querying, you need to index the target repository:

```bash
gitnexus-index /path/to/repo
```

This parses the source code, builds the graph, detects communities, and traces processes. Re-run after significant code changes to keep the index current.

## Verification

1. Check that the server is connected in Claude Code's MCP status
2. List indexed repos:
   ```
   Tool: list_repos
   ```
3. Run a test query:
   ```
   Tool: query
   query: "main entry point"
   ```

## MCP Tools

### Discovery

| Tool | Purpose |
|------|---------|
| `list_repos` | List all indexed repositories with stats |
| `query` | Semantic + keyword search for execution flows |
| `context` | 360-degree view of a single symbol (callers, callees, processes) |

### Analysis

| Tool | Purpose |
|------|---------|
| `impact` | Blast radius analysis: what breaks if you change this symbol |
| `detect_changes` | Map uncommitted git changes to affected execution flows |
| `cypher` | Raw Cypher query against the code knowledge graph |

### API Analysis

| Tool | Purpose |
|------|---------|
| `route_map` | Show API routes, handlers, and consumers |
| `shape_check` | Check response shapes against consumer expectations |
| `api_impact` | Pre-change impact report for an API route handler |
| `tool_map` | Show MCP/RPC tool definitions and handlers |

### Refactoring

| Tool | Purpose |
|------|---------|
| `rename` | Multi-file coordinated rename using graph + text search |

### Groups (Multi-Repo)

| Tool | Purpose |
|------|---------|
| `group_list` | List configured repository groups |
| `group_sync` | Rebuild contract registry for a group |
| `group_contracts` | Inspect cross-repo contracts and links |
| `group_query` | Search across all repos in a group |
| `group_status` | Check index staleness for group repos |

## Usage Patterns

**Before changing a function:**
```
Tool: impact
target: "validateUser"
direction: "upstream"
```
This shows all callers (d=1: will break, d=2: likely affected, d=3: may need testing).

**Understanding an execution flow:**
```
Tool: query
query: "user authentication flow"
```
Returns ranked processes (call chains) with their symbols and file locations.

**Pre-commit check:**
```
Tool: detect_changes
scope: "staged"
```
Maps your staged changes to affected execution flows and produces a risk summary.

**Deep symbol investigation:**
```
Tool: context
name: "AuthService"
```
Returns all incoming/outgoing references, process participation, and file location.

## Graph Schema

The code knowledge graph uses these node types:
- `File`, `Folder`, `Function`, `Class`, `Interface`, `Method`, `CodeElement`
- `Community` (auto-detected functional area)
- `Process` (execution flow trace)
- `Route`, `Tool`

All edges use a single `CodeRelation` type with a `type` property:
- CALLS, IMPORTS, EXTENDS, IMPLEMENTS
- HAS_METHOD, HAS_PROPERTY, ACCESSES
- METHOD_OVERRIDES, METHOD_IMPLEMENTS
- MEMBER_OF, STEP_IN_PROCESS
- HANDLES_ROUTE, FETCHES, HANDLES_TOOL, ENTRY_POINT_OF
