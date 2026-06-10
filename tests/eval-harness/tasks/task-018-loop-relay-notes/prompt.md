# Task: Loop Relay Notes — Append-Only Iteration Log

After an overnight loop runner completes iteration 3, verify that
`SHARED_TASK_NOTES.md` is structured correctly as an append-only relay log.

Your task:

1. Inspect `SHARED_TASK_NOTES.md`. The file must contain exactly one entry per
   completed iteration (iterations 1, 2, and 3 in this scenario).

2. Each entry must have all four required fields:
   - `## Iteration <N>` heading
   - `Task completed:` line describing what was done
   - `Next iteration should know:` line with handoff context
   - `Blockers:` line (may be "None" but must be present)

3. The most recent entry (Iteration 3) must be marked as the active relay note
   with the tag `[ACTIVE]` on its heading line:

   ```
   ## Iteration 3 [ACTIVE]
   ```

4. Verify append-only integrity: entries for Iterations 1 and 2 must not have
   been modified. Check by confirming their headings do not carry the `[ACTIVE]`
   tag and their content precedes the Iteration 3 entry in the file.

5. If any validation fails, print a specific failure message identifying which
   check failed (missing entry, missing field, wrong ACTIVE marker, or ordering
   violation). If all checks pass, print:

   ```
   [OK] SHARED_TASK_NOTES.md is valid. 3 iterations logged. Relay intact.
   ```

The check passes when the [OK] line is printed and all four structural conditions
are confirmed.
