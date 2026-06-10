# Task: EARS Spec Hypothesis Property Test

Given the EARS statement `WHEN the rollforward is executed THE SYSTEM SHALL produce
a closing balance equal to opening + additions - disposals - depreciation within
0.00 EUR tolerance`, write a Hypothesis property test that verifies this invariant
using `st.decimals()` strategies. The test should fail with a concrete counterexample
if the invariant is violated.
