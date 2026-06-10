# Task: Refinery Conflict Detection and Queue Unblock

Initialize a merge queue with a branch that has a deliberate conflict with main.
Both the branch and main have modified the same line in `src/config.py`.

Your task:

1. Initialize the refinery merge queue with the conflicting branch as the head
   entry. The queue state file is `.claude/merge-queue.json` with `locked: true`.

2. Run the refinery agent. The agent must:
   a. Attempt `git merge --no-ff --no-commit` of the branch into a clean worktree.
   b. Detect the resulting merge conflict in `src/config.py`.
   c. Write conflict details to `.claude/merge-conflicts.md` in the following
      format:

      ```
      ## Conflict: <branch-name> → main
      Date: <ISO-8601>
      Files: src/config.py
      Reason: Both modified line <N>
      Status: unresolved
      ```

   d. Set `locked: false` in `.claude/merge-queue.json` to unblock the queue for
      the next entry.
   e. Do NOT commit anything. The working tree must remain unmodified after the run
      (merge aborted or cleaned up).

3. Verify the final state:
   - `.claude/merge-conflicts.md` exists and contains the conflict entry.
   - `.claude/merge-queue.json` has `"locked": false`.
   - `git status` shows a clean working tree (no staged or unstaged changes).

The check passes when all three verification conditions are met.
