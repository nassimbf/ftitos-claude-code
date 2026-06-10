# Task: Refinery Merge Queue Processing

Initialize `.claude/merge-queue.json` with two branch entries. Run the refinery agent.
Verify it processes the queue in order: claims the first entry (sets locked=true), runs
verification, merges, pops it from the queue, then moves to the second entry. Confirm
merge-log.jsonl has two entries at completion.
