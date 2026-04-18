# Performance & Model Selection

## Model Selection
- **claude-haiku-4-5-20251001**: Classification, routing, simple extraction, worker tasks. Use by default for subagents.
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
