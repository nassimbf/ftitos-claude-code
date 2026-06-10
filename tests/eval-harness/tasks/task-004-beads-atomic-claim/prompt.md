# Task: Beads Atomic Claim Concurrency

Initialize a beads ledger with two tasks. Simulate two agents both attempting
`bd update HASH --claim` on the same task simultaneously. Verify that exactly
one succeeds and the other receives a conflict error, and that the ledger shows
the task claimed by only one agent.
