# Hooks

Claude Code hooks system for automated quality gates, session management, and developer experience enhancements.

All hooks run as Node.js scripts with **zero external dependencies** (Node.js built-ins only). They read JSON from stdin and write JSON to stdout following the Claude Code hook protocol.

## Hook Protocol

Hooks receive JSON on stdin with the tool invocation context:

```json
{
  "tool_name": "Edit",
  "tool_input": { "file_path": "/path/to/file", ... }
}
```

Hooks respond on stdout with one of:

```json
{ "decision": "block", "reason": "..." }
```

```json
{}
```

Or inject context via:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "..."
  }
}
```

Logging goes to stderr (`console.error`), which is visible to the user but does not affect hook behavior.

## Hook Lifecycle Events

| Event | When | Use Case |
|-------|------|----------|
| `PreToolUse` | Before a tool executes | Block, modify, or augment tool calls |
| `PostToolUse` | After a tool executes | Track state, warn about issues |
| `PreCompact` | Before context compaction | Save checkpoints |
| `PostCompact` | After context compaction | Remind about lost context |
| `SessionStart` | New session begins | Load previous context |
| `SessionEnd` | Session ends | Persist session summary |
| `Stop` | After each response | Check for issues |

## Scripts

### GateGuard (Read-Before-Edit)

**gateguard-pre-edit.js** (PreToolUse: Edit|Write)
Blocks edits to files that have not been Read first in the current session. Prevents blind edits based on assumptions. New file creation is always allowed.

**gateguard-track-read.js** (PostToolUse: Read)
Tracks which files have been read by recording paths to a session-specific tracking file. Companion to the pre-edit guard.

### Brain Integration

**brain-pretooluse.js** (PreToolUse: Grep|Glob, async)
Augments search operations with code structure context from GitNexus (BM25 search) and Graphify graph reports. Runs asynchronously with a 5-second timeout.

**brain-post-commit.js** (PostToolUse: Bash, async)
After git commit/merge/rebase/pull, checks if GitNexus index and Graphify graph are stale and warns if re-indexing is needed.

### Session Management

**session-start.js** (SessionStart)
Loads the most recent session summary into context. Matches sessions by worktree path, project name, or recency. Also loads checkpoint recovery data if a recent compaction occurred.

**session-start-learnings.js** (SessionStart)
Loads cross-session learnings (instincts) from the continuous learning system. Includes prompt-injection protection to block malicious content in learning files.

**session-end.js** (SessionEnd)
Extracts session summary from the transcript (user messages, tools used, files modified) and writes/updates a session file for cross-session continuity.

**evaluate-session.js** (SessionEnd)
Evaluates sessions with sufficient message count for extractable patterns. Signals that learned skills should be saved.

### Safety & Quality

**pre-edit-backup.js** (PreToolUse: Edit|Write)
Backs up files before editing when outside a git repo. Backups go to `~/.claude/backups/<date>/<time>_<filename>`.

**pre-bash-dev-server-block.js** (PreToolUse: Bash)
Blocks dev server starts (`npm run dev`, `pnpm dev`, etc.) outside tmux. Forces use of tmux so logs remain accessible and the terminal is not blocked.

**check-console-log.js** (Stop)
Checks git-modified JS/TS files for `console.log` statements. Excludes test files, config files, and scripts directories.

### Context Management

**suggest-compact.js** (PreToolUse: Edit|Write)
Tracks tool call count and suggests manual compaction at strategic intervals (default: every 50 calls, then every 25 after that). Configurable via `COMPACT_THRESHOLD` env var.

**pre-compact.js** (PreCompact)
Saves checkpoint state (branch, recent commits, modified files, sprint phase) before context compaction. Keeps last 10 checkpoints per project. Used by session-start.js for recovery.

### Shared Library

**lib/utils.js**
Cross-platform utility functions used by all hooks: directory resolution, file operations, stdin JSON parsing, git helpers, ANSI stripping, and date formatting.

**lib/shell-split.js**
Shell command parser that splits commands by operators (`&&`, `||`, `;`, `&`) while respecting quoting. Used by the dev-server-block hook.

## Configuration

### hooks.json

The `hooks.json` file contains hook definitions with `$HOME`-relative paths. To install, merge the hooks section into your `~/.claude/settings.json`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPACT_THRESHOLD` | `50` | Tool call count before suggesting compaction |
| `CLAUDE_SESSION_ID` | — | Session identifier (set by Claude Code) |

## Customization

To add a new hook:

1. Create a script in `hooks/scripts/` that reads stdin JSON and writes stdout JSON
2. Add an entry to `hooks.json` with the appropriate matcher and event
3. Use `require('./lib/utils')` for common operations

To disable a hook, remove its entry from your settings.json hooks section.

## File Structure

```
hooks/
  hooks.json                          # Hook definitions (sanitized, portable)
  README.md                           # This file
  scripts/
    gateguard-pre-edit.js             # Block edits to unread files
    gateguard-track-read.js           # Track Read tool calls
    brain-pretooluse.js               # GitNexus/Graphify context injection
    brain-post-commit.js              # Brain staleness monitor
    session-start.js                  # Load previous session context
    session-start-learnings.js        # Load cross-session learnings
    session-end.js                    # Persist session summary
    evaluate-session.js               # Evaluate session for patterns
    pre-edit-backup.js                # Backup files before editing
    pre-bash-dev-server-block.js      # Block dev servers outside tmux
    check-console-log.js              # Warn about console.log
    suggest-compact.js                # Strategic compaction suggestions
    pre-compact.js                    # Checkpoint before compaction
    lib/
      utils.js                        # Shared utilities (cross-platform)
      shell-split.js                  # Shell command parser
```
