# Graphify Setup

Graphify is the WHAT + HOW engine. It manages concept-level knowledge through linked notes, with optional Obsidian vault integration.

## What It Does

- Creates and manages concept notes with rich content
- Builds a linked knowledge graph between concepts
- Integrates with Obsidian vaults for bidirectional sync
- Supports semantic search across concept notes
- Maps domain knowledge to implementation artifacts

## Prerequisites

- Node.js 18+
- Claude Code with MCP support
- Obsidian (optional, for vault integration)

## Installation

1. Install the Graphify MCP server:
   ```bash
   npm install -g graphify-mcp
   ```

2. Register in `~/.claude.json`:
   ```json
   {
     "mcpServers": {
       "graphify": {
         "command": "graphify-mcp",
         "args": [],
         "env": {
           "VAULT_PATH": "/path/to/obsidian/vault"
         }
       }
     }
   }
   ```

3. If using Obsidian, point `VAULT_PATH` to your vault root.

## Configuration

| Environment Variable | Purpose | Default |
|---------------------|---------|---------|
| `VAULT_PATH` | Path to Obsidian vault | `~/.graphify/vault` |

The vault path determines where Graphify stores and reads markdown notes. If you use Obsidian, set this to your actual vault directory.

## Verification

Test that Graphify is working:

1. Create a test concept note
2. Query it back
3. Verify search returns the note
4. Delete the test note

All operations should return without errors. Check Claude Code's MCP status panel to confirm the server is connected.

## MCP Tools

| Tool | Purpose |
|------|---------|
| Create note | Create a new concept note with title, content, and tags |
| Search notes | Semantic search across all notes |
| Get note | Retrieve a specific note by title or path |
| Update note | Modify note content |
| Link notes | Create a link between two concept notes |
| List notes | List all notes, optionally filtered by tag |
| Delete note | Remove a note |

## Usage Patterns

**Documenting a domain concept:**
Create a note titled "Materiality Calculation" with content explaining the IDW PS 200 waterfall, linked to notes on "Audit Planning" and "Sampling Strategy".

**Architecture documentation:**
Create notes for each system layer, linking them to show data flow and dependencies.

**Research capture:**
When researching a new technology or approach, create a note with findings and link it to the project context.

## Obsidian Integration

If `VAULT_PATH` points to an Obsidian vault:

- Notes created by Graphify appear in Obsidian as markdown files
- Obsidian's graph view shows the concept connections
- Manual edits in Obsidian are picked up by Graphify on next read
- Tags and frontmatter are preserved

This makes Graphify a bridge between AI-assisted development and manual knowledge management.
