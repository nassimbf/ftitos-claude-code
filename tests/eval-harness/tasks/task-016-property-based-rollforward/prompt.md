# Task: Property-Based Test — Rollforward Ledger Invariant

Write a Hypothesis `RuleBasedStateMachine` test that verifies the mathematical
invariant of a fixed-asset rollforward ledger.

Your task:

1. Implement a `RollforwardMachine` class extending
   `hypothesis.stateful.RuleBasedStateMachine` with the following rules:
   - `add_asset`: draws a positive `Decimal` amount and adds it to `additions`.
   - `dispose_asset`: draws a non-negative `Decimal` (capped to current net book
     value) and adds it to `disposals`.
   - `apply_depreciation`: draws a non-negative `Decimal` (capped to current net
     book value) and adds it to `depreciation`.

2. The invariant (checked via `@invariant()`):

   ```
   closing_balance == opening_balance + sum(additions) - sum(disposals) - sum(depreciation)
   ```

   All arithmetic must use `decimal.Decimal` with no floating-point types.

3. The machine must initialize with `opening_balance = Decimal("0")`.

4. Run the test with `settings(max_examples=200)`. Hypothesis must complete
   200 examples without finding a counterexample.

5. Place the test at `tests/pbt/test_rollforward_machine.py`.

The check passes when `pytest tests/pbt/test_rollforward_machine.py` exits 0
with all examples passing and no shrinking failures.
