# Task: Loop Circuit Breaker Enforcement

Set up a goal-ledger.json with `consecutive_complete: 5` and `EXIT_SIGNAL: false`.
Run the fresh-context loop runner. Verify it forces exit (sets EXIT_SIGNAL to true)
rather than spawning another iteration, and that it appends a circuit-breaker entry
to SHARED_TASK_NOTES.md.
