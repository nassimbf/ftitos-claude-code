# Task: Stop Hook Ruff Verification

You are working in a Python project that has ruff configured for linting.
The project contains a Python file with a line length violation (a line exceeding
88 characters) that ruff is configured to catch.

Your task:

1. Implement a stop-verify hook script at `hooks/scripts/stop-verify.sh` that runs
   `ruff check .` against the project.
2. The script must exit with code **2** (not 1) when ruff reports any violation.
   Exit code 2 is the hard-block signal used by Claude Code's Stop hook to surface
   errors as re-engagement prompts rather than silently passing.
3. The script must write the ruff error output to stderr so it is visible in the
   Claude Code Stop hook output.
4. The script must exit with code **0** when ruff reports no violations.

Do not fix the ruff violation itself. The violation must remain so that the hook's
error path is exercised by checks.py.

When you are done, the file `hooks/scripts/stop-verify.sh` must exist and be executable.
