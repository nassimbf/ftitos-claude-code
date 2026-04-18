---
name: markdown-mermaid-writing
description: Comprehensive markdown and Mermaid diagram writing skill. Text-based diagrams as the default documentation standard with style guides and diagram type references.
origin: ECC
---

# Markdown and Mermaid Writing

Create scientific documentation using markdown with embedded Mermaid diagrams as the default format.

## When to Use

- Creating any scientific document, report, analysis, or visualization
- Writing any documentation -- READMEs, how-tos, decision records, project docs
- Producing any diagram -- workflows, data pipelines, architectures, timelines
- Generating any output that will be version-controlled
- Someone asks to "add a diagram" or "visualize the relationship"

## Why Text-Based Diagrams Win

| What matters | Mermaid in Markdown | Image |
|---|:---:|:---:|
| Git diff readable | Yes | No (binary) |
| Editable without regenerating | Yes | No |
| Token efficient vs prose | Yes | No |
| Renders without build step | Yes | No |
| Parseable by AI without vision | Yes | No |
| Works in GitHub / GitLab / Notion | Yes | Requires hosting |

## Diagram Type Selection (24 types)

| Use case | Diagram type |
|---|---|
| Workflow / decision logic | Flowchart |
| Service interactions / API calls | Sequence |
| Data model / schema | ER diagram |
| State machine / lifecycle | State |
| Project timeline / roadmap | Gantt |
| System architecture (zoom levels) | C4 |
| Concept hierarchy / brainstorm | Mindmap |
| Chronological events | Timeline |
| Class hierarchy / type relationships | Class |
| User journey / satisfaction map | User Journey |
| Two-axis comparison | Quadrant |
| Flow magnitude / resource distribution | Sankey |
| Numeric trends / charts | XY Chart |
| Work item status | Kanban |
| Multi-dimensional comparison | Radar |
| Git branching strategy | Git Graph |

Pick the right type, not the easy one. Don't default to flowcharts for everything.

## Mandatory Rules

Every Mermaid diagram must include:

```
accTitle: Short Name 3-8 Words
accDescr: One or two sentences explaining what this diagram shows.
```

- No `%%{init}` directives (breaks GitHub dark mode)
- No inline `style` -- use `classDef` only
- One emoji per node max, at the start of the label
- `snake_case` node IDs

## Markdown Style Rules

- **One H1 per document** -- the title
- **Cite everything** -- every external claim gets a footnote `[^N]` with full URL
- **Bold sparingly** -- max 2-3 bold terms per paragraph
- **Tables over prose** for comparisons, configurations, structured data
- **Diagrams over walls of text** -- if it describes flow or structure, add Mermaid

## Common Pitfalls

### Radar chart syntax

Use `radar-beta` (not `radar`), `axis` (not `x-axis`), `curve` (not quoted labels with colon).

### XY Chart vs Radar

| Diagram | Keyword | Axis syntax | Data syntax |
|---|---|---|---|
| XY Chart | `xychart-beta` | `x-axis ["Label1", "Label2"]` | `bar [10, 20]` |
| Radar | `radar-beta` | `axis id["Label"]` | `curve id["Label"]{10, 20}` |
