# Task: Witness Agent Stuck Detection

Create a `progress.json` file with the same SHA-256 checksum across three consecutive
witness polling cycles (simulating a stuck agent). Run the witness agent. Verify it
writes a `NUDGE.md` file to the stuck agent's directory after the 3rd identical
checksum, and appends a `stuck` entry to `.claude/witness-log.jsonl`.
