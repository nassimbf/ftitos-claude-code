# Standards — Code, Design, Models

## Code Style

- **Immutability**: Never mutate existing objects or arrays. Always return new objects (`{...obj, key: val}`, `[...arr, item]`, `map/filter/reduce` over `push/splice`).
- **File size**: 200-800 lines max. Extract utilities/modules when approaching the limit.
- **Function size**: < 50 lines. Single responsibility. Extract helpers for anything longer.
- **Nesting depth**: Max 2-3 levels. Early returns over nested if-else chains.
- **No hardcoded values**: All config, credentials, URLs, and magic numbers go in constants, env vars, or config files. Never inline.
- **Naming**: Descriptive names. No abbreviations unless universally understood (id, url, ctx).
- **No dead code**: Remove unused variables, imports, functions, and commented-out blocks before committing.

## Anti-Slop — Banned Patterns

### Visual Design
- NEVER use purple/violet/indigo gradient backgrounds
- NEVER create 3-column feature grids with icon-in-colored-circle cards
- NEVER use rounded-card-with-shadow-on-everything layouts
- NEVER add emoji as design elements in professional interfaces
- NEVER create generic stock-photo hero sections with overlaid text
- NEVER use glassmorphism/frosted glass effects unless the design system calls for it
- NEVER create floating particle/dot animations as backgrounds

### Copy
- NEVER write "unleash the power of...", "unlock your potential"
- NEVER use "revolutionary", "cutting-edge", "game-changing", "next-generation"
- NEVER write "seamless", "robust", "scalable" without concrete evidence
- NEVER use "leverage" as a verb, "synergy", "paradigm shift"
- NEVER start paragraphs with "In today's fast-paced world..." or "In the ever-evolving landscape..."

### Code
- NEVER leave Lorem Ipsum in shipped code
- NEVER include placeholder data that looks real (fake "John Doe", "test@test.com")
- NEVER create meaningless loading spinners that mask empty states
- NEVER add TODO comments without issue tracker references
- NEVER create wrapper functions that just pass through to one other function
- NEVER generate boilerplate comments that restate what the code says

### Detection Rule
When generating ANY frontend component, UI design, marketing copy, or user-facing text:
1. Review against this blacklist before outputting
2. If any pattern matches, replace with a specific, contextual alternative
3. When in doubt, choose plain and functional over decorative and generic

## Model Selection

- **claude-haiku-4-5-20251001**: Classification, routing, simple extraction, worker tasks. Default for subagents.
- **claude-sonnet-4-6**: Reasoning, narrative generation, code review, main conversation. Default for main thread.
- **claude-opus-4-6**: Orchestration of complex multi-agent workflows only. Not for routine tasks.

## Context Window Management

- Compact aggressively. Don't accumulate tool results you no longer need.
- Use subagents to isolate large outputs (logs, search results, full file reads) from main context.
- Pass only the minimum context slice needed to each agent.

## Code Performance

- Profile before optimizing. No premature optimization.
- Database queries: use indexes, avoid N+1, paginate large result sets.
- Async where I/O-bound. Sync where CPU-bound and simple.
- Cache at the right layer — avoid caching prematurely.
