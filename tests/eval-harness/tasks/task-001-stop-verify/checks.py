#!/usr/bin/env python3
"""
Deterministic checks for task-001-stop-verify.

Verifies that the agent created hooks/scripts/stop-verify.sh with the correct
behavior:
  - Exists and is executable
  - Exits with code 2 when ruff reports violations
  - Exits with code 0 when ruff reports no violations
  - Writes ruff output to stderr on failure

Exit 0 → task passed.
Exit 1 → task failed (reason written to stderr).
"""
import os
import stat
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path


HOOK_PATH = Path("hooks/scripts/stop-verify.sh")

VIOLATION_SRC = textwrap.dedent("""\
    def compute_depreciation(asset_value: float, useful_life_years: int, salvage_value: float) -> float:
        return (asset_value - salvage_value) / useful_life_years
""")

CLEAN_SRC = textwrap.dedent("""\
    def add(a: int, b: int) -> int:
        return a + b
""")

PYPROJECT_TOML = textwrap.dedent("""\
    [tool.ruff]
    line-length = 88

    [tool.ruff.lint]
    select = ["E", "W", "F"]
""")


def fail(reason: str) -> int:
    print(f"FAIL: {reason}", file=sys.stderr)
    return 1


def check_exists_and_executable() -> int:
    if not HOOK_PATH.exists():
        return fail(f"{HOOK_PATH} does not exist")

    mode = HOOK_PATH.stat().st_mode
    if not (mode & stat.S_IXUSR):
        return fail(f"{HOOK_PATH} exists but is not executable (missing u+x)")

    return 0


def check_exits_2_on_violation() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        # Write the pyproject.toml so ruff picks up the config
        (tmp_path / "pyproject.toml").write_text(PYPROJECT_TOML)

        # Write a Python file with a line-length violation
        (tmp_path / "bad.py").write_text(VIOLATION_SRC)

        result = subprocess.run(
            ["bash", str(HOOK_PATH.resolve())],
            cwd=tmp,
            capture_output=True,
            text=True,
        )

        if result.returncode != 2:
            return fail(
                f"Expected exit code 2 on ruff violation, got {result.returncode}. "
                f"stderr: {result.stderr[:500]!r}"
            )

        if not result.stderr.strip():
            return fail(
                "Hook exited with code 2 but wrote nothing to stderr. "
                "Ruff errors must be surfaced to stderr for Claude Code re-engagement."
            )

    return 0


def check_exits_0_on_clean() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        (tmp_path / "pyproject.toml").write_text(PYPROJECT_TOML)
        (tmp_path / "clean.py").write_text(CLEAN_SRC)

        result = subprocess.run(
            ["bash", str(HOOK_PATH.resolve())],
            cwd=tmp,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return fail(
                f"Expected exit code 0 on clean project, got {result.returncode}. "
                f"stderr: {result.stderr[:500]!r}"
            )

    return 0


def check_ruff_available() -> int:
    result = subprocess.run(
        ["ruff", "--version"], capture_output=True, text=True
    )
    if result.returncode != 0:
        return fail(
            "ruff is not installed or not on PATH — cannot run checks. "
            "Install with: pip install ruff"
        )
    return 0


def main() -> int:
    checks = [
        ("ruff available", check_ruff_available),
        ("hook exists and is executable", check_exists_and_executable),
        ("exits code 2 on ruff violation", check_exits_2_on_violation),
        ("exits code 0 on clean project", check_exits_0_on_clean),
    ]

    for name, check_fn in checks:
        code = check_fn()
        if code != 0:
            print(f"FAIL at check: {name}", file=sys.stderr)
            return code

    return 0


if __name__ == "__main__":
    sys.exit(main())
