# Task: Mutmut Phase 1 Targeted Mutation Run

Given a Python file `calculator.py` with a function `def add(a, b): return a + b`
and a test file `test_calculator.py` with `assert add(2, 3) == 5`, run mutmut
Phase 1 (targeted mode) targeting only `test_calculator.py`. Verify that the
mutant `return a - b` is detected as surviving or killed, and that the SQLite
triage DB is written.
