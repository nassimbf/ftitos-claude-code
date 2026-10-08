---
name: lesson
description: Turn a mistake the user just corrected into a check that stops it next time (a test, a lint rule, or a hook rule); only if no check is possible, add one line to ~/.claude/rules/a3-lessons.md. Use when the user says /lesson, or after the user corrects the same kind of mistake twice.
---

# Lesson

A correction written as prose is advice the next session may ignore. A check is not. Climb this
ladder and stop at the first rung that works:

1. **Name the mistake** in one sentence, from the conversation: what Claude did, what was right.
   Quote the user's correction. If it is not clear, ask one question.
2. **Can a test catch it?** (wrong figure, wrong mapping, lost row, wrong sign): write a failing
   test in A3 that reproduces it, then fix the code. Use the normal brief and gate flow.
3. **Can a lint rule catch it?** (a code pattern): name the ruff rule. If it is not in
   `EXTRA_RULES` in `~/.claude/hooks/a3hooks.py`, propose adding it to the user.
4. **Can a hook catch it?** (a behaviour: editing before a go, skipping a check, a command):
   propose the smallest change to `~/.claude/hooks/a3hooks.py`, with a new assert in
   `~/.claude/hooks/test_a3hooks.py`. Show it to the user. Build it only after their go, and run
   `/usr/bin/python3 -I ~/.claude/hooks/test_a3hooks.py` until it passes.
5. **Only if none of 2–4 can catch it:** add ONE line to `~/.claude/rules/a3-lessons.md`:
   `- <date> <the rule, imperative, max 20 words> (why: <the incident in 10 words>)`.
   The file holds at most 100 lines. If full, delete the oldest line that a check now covers,
   or ask the user which line to drop.

Report in two lines: the mistake, and which rung now catches it.
