---
name: brain
description: Unified brain interface — routes queries to GBrain (people/decisions), Graphify (concepts/research), GitNexus (code structure/impact), or Engram (session memory/learnings)
argument-hint: "<query or subcommand>"
allowed-tools: [Read, Bash, Glob, Grep, AskUserQuestion]
---

<objective>
Single entry point for all knowledge operations across the 4 brain systems.
Routes to the right backend based on query type.

Usage:
  /brain who is Sarah Chen         -> GBrain (person lookup)
  /brain how does auth work        -> GitNexus (code architecture)
  /brain what concepts relate to X -> Graphify (concept graph)
  /brain impact of changing X      -> GitNexus (blast radius)
  /brain what did we decide about  -> Engram (session memory search)
  /brain remember <observation>    -> Engram (save learning)
  /brain last session              -> Engram (previous session context)
  /brain index                     -> Index current project in all brain systems
  /brain status                    -> Show brain system status
  /brain search <query>            -> Search all 4 systems in parallel
</objective>

<process>

## Step 1: Parse Intent

Classify the query into one of these categories:

| Pattern | Route To | MCP Tool |
|---------|----------|----------|
| "who is", "tell me about [person]", "when did we meet", company names | **GBrain** | `mcp__gbrain__query` or `mcp__gbrain__get_page` |
| "how does [feature] work", "what calls X", "what will break", "impact of", "blast radius" | **GitNexus** | `mcp__gitnexus__context` or `mcp__gitnexus__impact` |
| "what concepts", "shortest path between", "communities", "god nodes", "architecture overview" | **Graphify** | `mcp__graphify__query_graph` or `mcp__graphify__god_nodes` |
| "what did we decide", "what did I learn", "previous session", "last time", "remember when" | **Engram** | `mcp__engram__mem_search` or `mcp__engram__mem_context` |
| "remember [this]", "save [observation]", "note that" | **Engram** | `mcp__engram__mem_save` |
| "last session", "session summary", "what was I working on" | **Engram** | `mcp__engram__mem_context` |
| "index" | All 4 | Run indexing commands |
| "status" | All 4 | Check each system |
| "search" | All 4 | Parallel search |

If ambiguous, default to parallel search across all 4.

### For Engram queries:
1. For "what did we decide/learn": use `mcp__engram__mem_search` with query + type filter
2. For "remember [this]": use `mcp__engram__mem_save` with title, type (decision/architecture/bugfix/pattern/discovery/learning/preference), and structured What/Why/Where/Learned content
3. For "last session": use `mcp__engram__mem_context` to get recent sessions + observations
4. For session end: ALWAYS run `mcp__engram__mem_session_summary` with Goal/Discoveries/Accomplished/Next Steps before ending

## Step 2: Execute Query

### For GBrain queries:
1. Use `mcp__gbrain__query` with the natural language query
2. If a specific person/company: use `mcp__gbrain__get_page` with the slug
3. Display compiled truth first, then relevant timeline entries

### For GitNexus queries:
1. For "how does X work": use `mcp__gitnexus__context` with the symbol name
2. For "what will break": use `mcp__gitnexus__impact` with target, direction=downstream
3. For "what calls X": use `mcp__gitnexus__context` and read callers
4. Show execution flows (processes) that include the symbol

### For Graphify queries:
1. For concept questions: use `mcp__graphify__query_graph` with the search term
2. For architecture: use `mcp__graphify__god_nodes` to get the most connected nodes
3. For connections: use `mcp__graphify__shortest_path` between two concepts
4. Reference graphify-out/GRAPH_REPORT.md for community structure

### For "index" subcommand:
Run all 3 in parallel:
```bash
# GitNexus: index current repo (AST + Leiden + processes)
gitnexus analyze .

# Graphify: build knowledge graph (AST first, then suggest semantic pass)
graphify build .

# GBrain: sync if brain repo exists
# gbrain sync (only if ~/.gbrain exists)
```

After indexing: install Graphify skill and GitNexus skills:
```bash
graphify install --platform claude
```

### For "status" subcommand:
Check all 3 in parallel:
```
BRAIN STATUS
============================

GBrain     [Y/N]  ~/.gbrain/ exists
           Pages: [count]  |  Last sync: [date]

GitNexus   [Y/N]  .gitnexus/ exists
           Symbols: [count]  |  Relationships: [count]
           Staleness: [N commits behind or "current"]

Graphify   [Y/N]  graphify-out/ exists
           Nodes: [count]  |  Edges: [count]
           Communities: [count]  |  Last build: [date]

MCP Servers: gbrain [Y/N] | gitnexus [Y/N] | graphify [Y/N]
============================
```

### For "search" subcommand:
Run all 3 in parallel using the Agent tool:
- Agent 1: GBrain query
- Agent 2: GitNexus query
- Agent 3: Graphify query
Merge results, deduplicate, present unified answer with source attribution.

## Step 3: Present Results

Always attribute which brain system provided the information:
- `[GBrain]` for people/company/decision data
- `[GitNexus]` for code structure/impact data
- `[Graphify]` for concept/research/cross-modal data

</process>

<success_criteria>
- [ ] Query correctly routed to the right brain system
- [ ] Results displayed with source attribution
- [ ] For "search": all 3 systems queried in parallel
- [ ] For "index": all applicable systems indexed
- [ ] For "status": all 3 systems checked
</success_criteria>
