# Task: Entropy GC — Session Temp File Cleanup

The `~/.claude/sessions/` directory accumulates `*.tmp` files over time. Files
older than 60 days must be pruned by the entropy GC command.

Your task:

1. Implement or invoke the entropy GC command targeting `~/.claude/sessions/*.tmp`.
2. The command must delete ONLY `.tmp` files whose modification time is strictly
   older than 60 days from the current date.
3. Files modified within the last 60 days must be left untouched.
4. No project files, git history, or files outside `~/.claude/sessions/` may be
   touched during the run.
5. After the run, print to stdout:

   ```
   Entropy GC complete.
   Deleted: <N> file(s)
   Retained: <M> file(s)
   ```

   where N is the count of deleted files and M is the count of files that were
   within the retention window and were not deleted.

The check passes when: only files older than 60 days are removed, the deletion
count is accurate, and no files outside the target glob are modified.
