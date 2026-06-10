---
name: property-based-testing
description: Anthropic red-team PBT recipe — infer invariants, write Hypothesis tests, reflect before fixing counterexamples.
---

# Property-Based Testing

Anthropic red-team agentic-PBT recipe using Hypothesis. The agent infers postconditions from source, writes property tests, and reflects before fixing any counterexample — preventing the common trap of encoding a bug as a "correct" assertion.

## When to Activate

- After writing any function that processes numeric data (Decimal arithmetic, reconciliation)
- When example-based tests pass but you suspect the logic fails on edge inputs
- Before shipping a stateful multi-step workflow to production
- On any function where the spec is "for all valid inputs, output satisfies X"

---

## Step 1 — Invariant Inference

Before writing a single test, the agent reads the source and lists postconditions explicitly. This is the most important step — a weak invariant produces a test that passes trivially.

**Invariant inference checklist:**

1. What must always be true about the return value regardless of input?
2. What relationships must hold between inputs and outputs? (e.g., sum of outputs = sum of inputs)
3. What must never happen? (e.g., Decimal result is never `NaN`, list is never shorter than input)
4. What idempotency or commutativity properties exist? (e.g., `f(f(x)) == f(x)`)
5. What round-trip properties exist? (e.g., encode → decode returns original)

Write the invariants as comments before writing any `@given` decorator. Do not write the test first.

Example — `saa.engine.areas.fixed_assets.rollforward`:

```python
# Invariant 1: closing = opening + additions - disposals - depreciation (to the cent)
# Invariant 2: no field in the output is None if all inputs are non-None
# Invariant 3: rollforward(rollforward(x)) raises on already-closed period (idempotency check)
# Invariant 4: total of all line items reconciles to Anlagenspiegel closing balance exactly
```

---

## Step 2 — Hypothesis Strategy Selection

Match the strategy to the domain. Do not default to `st.integers()` for financial data.

| Domain | Recommended strategy | Notes |
|--------|----------------------|-------|
| Decimal amounts | `st.decimals(min_value=0, max_value=1e12, allow_nan=False, allow_infinity=False)` | Always set allow_nan=False for financial |
| List of line items | `st.lists(item_strategy, min_size=1, max_size=200)` | min_size=1 prevents vacuous reconciliation |
| Dates | `st.dates(min_value=date(2000,1,1), max_value=date(2099,12,31))` | Avoid unreachable calendar edge cases |
| Enum / code values | `st.sampled_from(MyEnum)` | Cleaner than st.integers with manual mapping |
| Structured input | `st.from_type(MyModel)` (with `hypothesis-pydantic`) | Generates valid Pydantic models automatically |
| Free-form strings | `st.from_regex(r'[A-Z]{2}[0-9]{6}', fullmatch=True)` | Use regex when format is constrained |

```python
from hypothesis import given, settings, assume
from hypothesis import strategies as st
from decimal import Decimal

@given(
    opening=st.decimals(min_value=Decimal('0'), max_value=Decimal('1e12'),
                        allow_nan=False, allow_infinity=False),
    additions=st.decimals(min_value=Decimal('0'), max_value=Decimal('1e9'),
                          allow_nan=False, allow_infinity=False),
    depreciation=st.decimals(min_value=Decimal('0'), max_value=Decimal('1e9'),
                              allow_nan=False, allow_infinity=False),
)
@settings(max_examples=500)
def test_rollforward_closes_exactly(opening, additions, depreciation):
    assume(depreciation <= opening + additions)  # domain constraint
    result = compute_rollforward(opening, additions, depreciation)
    expected_closing = opening + additions - depreciation
    assert result.closing_balance == expected_closing
```

---

## Step 3 — Reflection Loop

When Hypothesis finds a counterexample, the agent MUST stop and ask:

> "Is this a real bug in the implementation, or a flaw in my invariant?"

**Reflection protocol:**

1. Print the counterexample values. Read the source manually for those values.
2. Trace through the logic by hand (or with a debugger). Is the output actually wrong?
3. If wrong → the implementation has a bug. Fix the implementation. Do not change the test.
4. If the test is wrong → the invariant was imprecise. Revise the invariant comment first, then fix the `@given` test. Do not `assume()` away the counterexample without understanding it.
5. Never use `assume()` to filter out a counterexample that exposes a real bug.

```python
# When Hypothesis prints this — stop and reflect before touching any code:
# Falsifying example: test_rollforward_closes_exactly(
#   opening=Decimal('0.001'), additions=Decimal('0'), depreciation=Decimal('0.001')
# )
```

---

## Step 4 — Stateful Testing

Use `RuleBasedStateMachine` for multi-step workflows where state transitions must remain consistent.

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize, invariant
from hypothesis import settings

class AnlagenspiegelMachine(RuleBasedStateMachine):
    """Model-based test: verify Anlagenspiegel invariants hold across all operations."""

    @initialize()
    def setup(self):
        self.ledger = FixedAssetLedger()
        self.expected_total = Decimal('0')

    @rule(
        amount=st.decimals(min_value=Decimal('1'), max_value=Decimal('1e8'),
                           allow_nan=False, allow_infinity=False),
        asset_id=st.text(alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ', min_size=6, max_size=6),
    )
    def add_asset(self, amount, asset_id):
        self.ledger.add(asset_id, amount)
        self.expected_total += amount

    @rule(
        asset_id=st.text(alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ', min_size=6, max_size=6),
    )
    def dispose_asset(self, asset_id):
        disposed = self.ledger.dispose(asset_id)
        if disposed is not None:
            self.expected_total -= disposed.net_book_value

    @invariant()
    def total_reconciles(self):
        assert self.ledger.total() == self.expected_total, (
            f"Ledger total {self.ledger.total()} != expected {self.expected_total}"
        )

TestAnlagenspiegelStateful = AnlagenspiegelMachine.TestCase
```

---

## Step 5 — A3-Specific Targets

These are the highest-priority targets for property-based testing in the A3 codebase.

### `saa.engine.areas.fixed_assets` — Anlagenspiegel reconciliation

**Key invariant:** The sum of all line items in the Anlagenspiegel must equal the balance sheet closing balance to the cent. Any floating-point rounding is a bug.

```python
@given(
    line_items=st.lists(
        st.fixed_dictionaries({
            'asset_id': st.text(min_size=6, max_size=10),
            'cost': st.decimals(min_value=Decimal('0'), max_value=Decimal('1e9'),
                                allow_nan=False, allow_infinity=False),
            'accumulated_dep': st.decimals(min_value=Decimal('0'), max_value=Decimal('1e9'),
                                           allow_nan=False, allow_infinity=False),
        }),
        min_size=1, max_size=100,
    )
)
@settings(max_examples=500)
def test_anlagenspiegel_reconciles_to_balance_sheet(line_items):
    assume(all(i['accumulated_dep'] <= i['cost'] for i in line_items))
    result = build_anlagenspiegel(line_items)
    balance_sheet_total = sum(i['cost'] - i['accumulated_dep'] for i in line_items)
    assert result.net_book_value_total == balance_sheet_total
```

### Depreciation — Decimal arithmetic

**Key invariant:** Depreciation computed over N periods must equal straight-line annual depreciation × N, with no accumulated rounding error beyond 1 cent per asset per year.

### Rollforward — lossless round trip

**Key invariant:** `opening_balance + additions - disposals - depreciation == closing_balance` with exact Decimal equality (no float conversion anywhere in the chain).

---

## Integration with pytest

```python
# conftest.py — suppress Hypothesis health checks that are irrelevant to deterministic pipelines
from hypothesis import settings, HealthCheck

settings.register_profile(
    "ci",
    max_examples=500,
    suppress_health_check=[HealthCheck.too_slow],
    deriving_from=settings.default,
)
settings.load_profile("ci")
```

```bash
# Run property tests only
pytest tests/ -k "property" --hypothesis-seed=0

# Reproduce a specific failure (Hypothesis prints this on failure)
@reproduce_failure('6.x.x', b'...')
```

```python
# Pinning a reproduction case permanently
from hypothesis import reproduce_failure

@reproduce_failure('6.112.0', b'AXicY2BgYGBkAAIAAAAA//8=')
def test_rollforward_closes_exactly(opening, additions, depreciation):
    ...
```

Always commit `@reproduce_failure` decorators with the failure case — they serve as regression tests for bugs found by Hypothesis.
