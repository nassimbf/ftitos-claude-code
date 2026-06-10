# Task: Blind Judge Convergence — Stuck Builder Detection

Set up a blind judge convergence loop where `progress.json` shows the same file
checksums across 3 consecutive reviewer polls, simulating a stuck builder.

Your task:

1. Create `progress.json` with a `checksums` map of 3 source files. The map must
   be identical across poll rounds 1, 2, and 3 (no files changed between polls).

2. Run the blind judge convergence loop for 3 poll iterations. After each poll,
   the judge compares the current checksums against the previous poll's checksums.

3. After 3 consecutive identical checksum maps, the judge must:
   a. Detect the stuck state and write structured feedback to the builder's
      working directory at `builder-feedback.md`. The feedback must include:
      - The list of files that did not change.
      - A directive: "No progress detected. Unblock by addressing the
        earliest open bead or reporting a blocker."
   b. Append a `stuck` entry to `.claude/witness-log.jsonl`:
      ```json
      {"event": "stuck", "poll": <N>, "unchanged_files": [...], "timestamp": "<ISO-8601>"}
      ```
   c. If the builder remains stuck after 2 nudges (i.e., 5 total identical
      polls), escalate by writing to `pending_for_human.md`:
      ```
      ## Escalation: Builder Stuck
      Polls without progress: 5
      Files unchanged: [...]
      Action required: human intervention
      ```

4. For this task, simulate only 3 polls (triggering nudge 1, not escalation).
   Verify that `builder-feedback.md` exists and `.claude/witness-log.jsonl`
   contains a `stuck` entry, but `pending_for_human.md` does NOT exist.

The check passes when all three conditions in step 4 are confirmed.
