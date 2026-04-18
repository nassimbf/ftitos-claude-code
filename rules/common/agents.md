# Agent Usage

- **Parallel by default**: Never run independent agent calls sequentially. Batch all independent work in a single message with multiple tool calls.
- **Fresh context per agent**: Never pass session history to Builder agents. Give each agent: CONTEXT.md + task description only.
- **Right agent for the job**:
  - `Explore` — codebase search, file discovery, keyword grep
  - `Plan` — architecture design, implementation strategy
  - `debugger` — diagnosing failures, reading stack traces
  - `security-reviewer` — after writing auth, input handling, or API code
  - `code-reviewer` — after completing a major implementation step
  - `general-purpose` — multi-step research, open-ended tasks

- **Multi-perspective analysis**: For non-trivial decisions, get at least 2 agent opinions before deciding.
- **Subagents protect main context**: Use agents to isolate large search/analysis results from the main conversation.
- **Never duplicate work**: If an agent is already doing a search, don't repeat the same search yourself.
