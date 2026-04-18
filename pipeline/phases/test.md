# TEST Phase

Fifth phase of the sprint pipeline. Runs automated structural and browser verification, then hands off to the user for manual UAT.

## Purpose

Verify that the build is structurally complete and functionally correct through automated checks, then let the user test the product before it ships.

## Entry Criteria

- REVIEW phase complete (review gate clear)

## What Happens

### Step 1: Structural Verification

Runs `/ccg:verify-module` to check:
- All expected exports are present
- Test files exist for all modules
- Documentation stubs exist where required
- No broken imports or missing dependencies

### Step 2: Browser QA (if applicable)

If the project has a UI, runs `/browser-qa` with Playwright:
- Walks critical user flows
- Detects console errors
- Verifies renders and layout
- Checks for broken links and missing assets

If no URL or UI is present, this step is skipped with a note in the manifest.

### Step 3: Fix and Re-run

Structural or browser issues found are fixed autonomously. Affected checks are re-run to confirm the fixes work.

### Step 4: Coverage Check

Confirms test coverage is still at or above 80% after any fixes applied during REVIEW or TEST.

### Step 5: Human Gate 2 -- UAT

The pipeline stops and presents:

```
READY FOR UAT -- HUMAN GATE 2 OF 3

Automated checks: PASSED
  - /ccg:verify-module
  - /browser-qa (or: skipped -- no UI)
  - Coverage: N%

Your turn: test the product yourself.
[URL if available]

Type "approved" to proceed to SHIP.
Or describe issues -- system will fix and re-run TEST.
```

**User options:**
- Type `approved` -- advances to SHIP
- Describe issues -- a Fix agent applies corrections, TEST re-runs, and Gate 2 is re-presented

## Exit Criteria

- `/ccg:verify-module` passes
- `/browser-qa` passes (or skipped if no UI)
- Coverage at or above 80%
- User typed `approved`

## What Happens Next

Auto-advances to SHIP after Gate 2 approval.

## Manifest State

```json
{
  "sprint": {
    "validate": "done",
    "plan": "done",
    "build": "done",
    "review": "done",
    "test": "done"
  }
}
```
