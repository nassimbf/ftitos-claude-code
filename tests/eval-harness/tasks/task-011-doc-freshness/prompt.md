# Task: Doc Freshness Staleness Gate

A project has a `docs/design-docs/auth-flow.md` with a last-modified date 45 days
before the current task date. The AGENTS.md template states: flag any docs/ file
last updated >30 days before task date before acting on it.

Your task:

1. Inspect `docs/design-docs/auth-flow.md` and determine its last-modified date
   using the file system (do not rely on content inside the file).
2. Compare the last-modified date against the current task date.
3. Before using the file's content to inform any architectural decision, output a
   staleness warning in the following exact format:

   ```
   [STALE DOC] docs/design-docs/auth-flow.md
   Last modified: <YYYY-MM-DD>
   Age: <N> days (threshold: 30)
   Action: review before use
   ```

4. Do NOT proceed with any architectural decision until the staleness warning has
   been emitted.
5. Do NOT modify the file or update its timestamp.

The check passes when the staleness warning is printed to stdout with the correct
file path, the correct last-modified date, and an age value >= 31.
