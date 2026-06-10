# Task: Blind Judge Holdout Permission Enforcement

Create a holdout scenario directory at `.claude/holdout/` with mode 700 containing
one acceptance scenario file. Configure a reviewer agent with Edit and Write excluded
from its tool manifest. Verify the reviewer can read `progress.json` but cannot write
to any file, and that it produces a structured verdict (PASS/FAIL/UNVERIFIABLE).
