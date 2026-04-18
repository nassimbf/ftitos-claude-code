---
name: search-first
description: Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code.
origin: ECC
---

# Search First -- Research Before You Code

Systematizes the "search for existing solutions before implementing" workflow.

## When to Activate

- Starting a new feature that likely has existing solutions
- Adding a dependency or integration
- The user asks "add X functionality" and you're about to write code
- Before creating a new utility, helper, or abstraction

## Workflow

```
1. NEED ANALYSIS
   Define what functionality is needed
   Identify language/framework constraints

2. PARALLEL SEARCH
   - npm / PyPI / package registries
   - MCP servers and skills
   - GitHub / open source

3. EVALUATE
   Score candidates (functionality, maintenance,
   community, docs, license, deps)

4. DECIDE
   - Adopt as-is
   - Extend / wrap
   - Build custom

5. IMPLEMENT
   Install package / Configure / Write minimal custom code
```

## Decision Matrix

| Signal | Action |
|--------|--------|
| Exact match, well-maintained, MIT/Apache | **Adopt** -- install and use directly |
| Partial match, good foundation | **Extend** -- install + write thin wrapper |
| Multiple weak matches | **Compose** -- combine 2-3 small packages |
| Nothing suitable found | **Build** -- write custom, but informed by research |

## Quick Checklist

Before writing a utility or adding functionality:

0. Does this already exist in the repo? Search through relevant modules first
1. Is this a common problem? Search npm/PyPI
2. Is there an MCP for this? Check available MCP servers
3. Is there a skill for this? Check available skills
4. Is there a GitHub implementation/template? Search for maintained OSS

## Search Shortcuts by Category

### Development Tooling
- Linting: `eslint`, `ruff`, `textlint`, `markdownlint`
- Formatting: `prettier`, `black`, `gofmt`
- Testing: `jest`, `pytest`, `go test`

### AI/LLM Integration
- Claude SDK: Context7 for latest docs
- Document processing: `unstructured`, `pdfplumber`, `mammoth`

### Data & APIs
- HTTP clients: `httpx` (Python), `ky`/`got` (Node)
- Validation: `zod` (TS), `pydantic` (Python)

## Anti-Patterns

- **Jumping to code**: Writing a utility without checking if one exists
- **Ignoring MCP**: Not checking if an MCP server already provides the capability
- **Over-customizing**: Wrapping a library so heavily it loses its benefits
- **Dependency bloat**: Installing a massive package for one small feature
