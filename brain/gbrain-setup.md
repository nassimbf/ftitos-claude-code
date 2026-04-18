# GBrain Setup

GBrain is the WHO + WHY engine. It maintains a knowledge graph of people, companies, and relationships with queryable observations.

## What It Does

- Stores entities (people, companies, systems) with typed observations
- Tracks relationships between entities (works_at, manages, collaborates_with)
- Provides search across entity names, types, and observation content
- Supports create, read, update, delete operations on entities, relations, and observations

## Prerequisites

- Node.js 18+
- Claude Code with MCP support
- The `memory` MCP server package

## Installation

GBrain uses the `@anthropic/memory` MCP server (or compatible knowledge graph server).

1. Install the MCP server:
   ```bash
   npm install -g @anthropic/memory-mcp
   ```

2. Register in `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "memory": {
         "command": "memory-mcp",
         "args": []
       }
     }
   }
   ```

3. The knowledge graph file is created automatically on first use.

## Configuration

The memory MCP server stores its graph in a local file (typically `~/.memory/graph.json` or configured via environment variable).

To set a custom storage path:
```json
{
  "mcpServers": {
    "memory": {
      "command": "memory-mcp",
      "args": [],
      "env": {
        "MEMORY_FILE": "/path/to/graph.json"
      }
    }
  }
}
```

## Verification

Test that GBrain is working:

1. Create a test entity:
   ```
   Tool: create_entities
   entities: [{"name": "Test Person", "entityType": "person", "observations": ["Created for verification"]}]
   ```

2. Search for it:
   ```
   Tool: search_nodes
   query: "Test Person"
   ```

3. Clean up:
   ```
   Tool: delete_entities
   entityNames: ["Test Person"]
   ```

## MCP Tools

### Entity Operations

| Tool | Purpose |
|------|---------|
| `create_entities` | Create one or more entities with type and observations |
| `open_nodes` | Retrieve specific entities by name |
| `search_nodes` | Search entities by name, type, or observation content |
| `delete_entities` | Delete entities and their associated relations |

### Observation Operations

| Tool | Purpose |
|------|---------|
| `add_observations` | Add observations to existing entities |
| `delete_observations` | Remove specific observations from entities |

### Relation Operations

| Tool | Purpose |
|------|---------|
| `create_relations` | Create directed relations between entities (active voice) |
| `delete_relations` | Remove relations between entities |

### Graph Operations

| Tool | Purpose |
|------|---------|
| `read_graph` | Read the entire knowledge graph (use sparingly on large graphs) |

## Usage Patterns

**Tracking a new contact:**
```
create_entities: [{
  "name": "Jane Smith",
  "entityType": "person",
  "observations": [
    "CTO at Acme Corp",
    "Expert in distributed systems",
    "Met at conference 2026-03"
  ]
}]
```

**Recording a relationship:**
```
create_relations: [{
  "from": "Jane Smith",
  "to": "Acme Corp",
  "relationType": "works_at"
}]
```

**Finding context before a meeting:**
```
search_nodes: { "query": "Acme Corp" }
```
