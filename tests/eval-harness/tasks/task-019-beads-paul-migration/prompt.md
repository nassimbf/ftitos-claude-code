# Task: PAUL-to-Beads Migration

Given a PAUL `PLAN.md` with 5 tasks across 2 phases:
- Phase 1: tasks A, B, C (no dependencies)
- Phase 2: tasks D (depends on A and B), E (depends on A and B)

Convert the PAUL plan to beads commands and verify the dependency graph is
correctly represented.

Your task:

1. Run `bd create` for each of the 5 tasks (A, B, C, D, E). Each bead must
   receive a unique hash ID. Tasks D and E must be created with
   `--depends-on <hash-of-A> <hash-of-B>`.

2. After creation, run `bd list` and verify:
   - Exactly 5 beads are present.
   - Tasks A, B, C have no dependencies (`deps: []`).
   - Tasks D and E each have exactly 2 dependencies pointing to A's and B's
     hash IDs.

3. Run `bd ready` and verify it returns ONLY tasks A, B, and C (the three with
   no unmet dependencies).

4. Mark tasks A and B as done (`bd done <hash>`).

5. Run `bd ready` again and verify it now returns ONLY task D (C has no
   dependency on A/B but was not yet done; E depends on A and B but D must
   come first within Phase 2 ordering is not enforced — both D and E should
   appear). Adjust assertion: after A and B are done, `bd ready` must include
   D and E but NOT C (C has no dependencies and was already ready — if it
   remains undone it stays ready; clarify: verify D and E are now in the ready
   set).

The check passes when all `bd ready` outputs match the expected sets at each
stage and the dependency hashes resolve correctly.
