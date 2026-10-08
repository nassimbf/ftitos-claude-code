"""Self-check for a3hooks.py. Run: python3 -I ~/.claude/hooks/test_a3hooks.py

Builds a throwaway git repo that plays A3 (A3_REPO points at it) and drives each
hook through stdin JSON, the way Claude Code calls it.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HOOK = Path(__file__).with_name("a3hooks.py")


def sh(*args, cwd):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def run(event, payload, env):
    p = subprocess.run([sys.executable, "-I", str(HOOK), event], input=json.dumps(payload),
                       capture_output=True, text=True, env=env, timeout=120)
    return p.returncode, p.stdout, p.stderr


def make_repo(root):
    """origin (bare) + clone on branch feat/x, one commit past origin/main."""
    origin = root / "origin.git"
    sh("git", "init", "-q", "--bare", "-b", "main", str(origin), cwd=root)
    repo = root / "a3"
    sh("git", "clone", "-q", str(origin), str(repo), cwd=root)
    for k, v in (("user.email", "t@t"), ("user.name", "t"), ("commit.gpgsign", "false")):
        sh("git", "config", k, v, cwd=repo)
    (repo / "pkg").mkdir()
    (repo / "pkg" / "calc.py").write_text("def add(a, b):\n    return a + b\n")
    (repo / "tests").mkdir()
    (repo / "tests" / "test_calc.py").write_text("from pkg.calc import add\n\ndef test_add():\n    assert add(1, 2) == 3\n")
    sh("git", "add", "-A", cwd=repo)
    sh("git", "commit", "-qm", "init", cwd=repo)
    sh("git", "push", "-q", "origin", "main", cwd=repo)
    sh("git", "checkout", "-qb", "feat/x", cwd=repo)
    return repo


def main():
    with tempfile.TemporaryDirectory() as t:
        root = Path(t).resolve()
        repo = make_repo(root)
        other = root / "other"
        other.mkdir()
        sh("git", "init", "-q", cwd=other)
        env = {**os.environ, "A3_REPO": str(repo), "A3_STATE_DIR": str(root / "state"),
               "A3_PYTEST": "true", "A3_RUFF": "true", "A3_ROLLOUT": "0"}
        base = {"session_id": "s1", "transcript_path": "", "cwd": str(repo)}

        # --- bash-guard
        def bash(cmd, cwd=repo):
            return run("bash-guard", {**base, "cwd": str(cwd), "tool_input": {"command": cmd}}, env)[0]
        assert bash("SKIP=ruff git commit -m x") == 2, "SKIP= bypass must be blocked"
        assert bash("git push --force origin main") == 2, "force-push to main must be blocked"
        assert bash("git push -f origin HEAD:master") == 2
        assert bash("git push --force origin main-sync") == 0, "branch names containing main are fine"
        assert bash("git push origin main") == 0, "plain push is not this hook's business"
        assert bash("sed -i '' 's/a/b/' pkg/calc.py") == 2, "sed -i in A3 must be blocked"
        assert bash("sed -i '' 's/a/b/' x", cwd=other) == 0, "sed -i outside A3 is allowed"
        assert bash("sed -n 1,5p pkg/calc.py") == 0
        assert bash("pytest -q") == 0

        # --- scope-guard
        def edit(path, cwd=repo):
            return run("scope-guard", {**base, "cwd": str(cwd), "tool_name": "Edit",
                                       "tool_input": {"file_path": str(path)}}, env)
        assert edit(other / "f.py")[0] == 0, "non-A3 files are not guarded"
        code, _, err = edit(repo / "pkg" / "calc.py")
        assert code == 2 and "/brief" in err, f"no brief must block: {err}"
        code, _, err = edit(repo / "pkg" / "calc.py", cwd=root)
        assert code == 2 and "/brief" in err, f"from outside the checkout, the checkout's own brief rules: {err}"
        old = root / "old-session.jsonl"
        old.write_text("{}\n")
        old_env = {**env, "A3_ROLLOUT": str(time.time() + 1000)}
        assert run("scope-guard", {**base, "transcript_path": str(old), "tool_input": {"file_path": str(repo / "pkg" / "calc.py")}},
                   old_env)[0] == 0, "sessions started before the rollout keep their old workflow"
        brief = Path(run("brief-path", base, env)[1].strip())
        assert brief.parent.name == ".git" or ".git" in brief.parts, brief
        assert edit(brief)[0] == 0, "writing the brief itself is allowed"
        brief.write_text("# Brief\nGoal: x\n## Scope\n- pkg/*\n## Open questions\n- [ ] sign of disposals?\n")
        code, _, err = edit(repo / "pkg" / "calc.py")
        assert code == 2 and "open question" in err, f"open questions in the brief block edits: {err}"
        brief.write_text("# Brief\nGoal: x\n## Scope\n- pkg/*\n## Open questions\n- [x] sign of disposals? negative (owner)\n"
                         "## Out of scope\n- tests/*\n")
        assert edit(repo / "pkg" / "calc.py")[0] == 0, "in-scope edit allowed"
        assert edit(repo / "pkg" / "calc.py", cwd=root)[0] == 0, \
            "subagents (they report the parent's cwd) may edit any checkout whose brief allows it"
        assert edit(repo / "pkg" / "new_file.py")[0] == 0, "new file in scope allowed"
        code, _, err = edit(repo / "tests" / "test_calc.py")
        assert code == 2 and "scope" in err, f"out-of-scope edit must block: {err}"
        brief.write_text("# Brief\nGoal: x\n")
        assert edit(repo / "tests" / "test_calc.py")[0] == 0, "brief without scope list allows all"

        tr = root / "t.jsonl"

        # --- doubt-inject (UserPromptSubmit) and doubt-check (Stop): "are you sure?" must trigger real reading
        for p in ("are you sure ?", "are yuo sure", "did you read the code", "is this true?", "hast du das gelesen"):
            assert "file:line" in run("doubt-inject", {**base, "prompt": p}, env)[1], p
        for p in ("make sure the tests pass", "add a sure-path test",
                  "<task-notification> agent finished, findings verified </task-notification>"):
            assert run("doubt-inject", {**base, "prompt": p}, env)[1] == "", p
        def turn(prompt, tool_uses):
            recs = [{"type": "user", "message": {"role": "user", "content": prompt}},
                    {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Read"}] * tool_uses
                                                     + [{"type": "text", "text": "Yes."}]}}]
            tr.write_text("\n".join(json.dumps(r) for r in recs) + "\n")
            return run("doubt-check", {**base, "transcript_path": str(tr)}, env)
        code, _, err = turn("are you sure?", 0)
        assert code == 2 and "verify" in err, f"doubt answered without a tool must block: {err}"
        assert turn("are you sure?", 1)[0] == 0, "doubt answered after reading passes"
        assert turn("add a button", 0)[0] == 0, "normal prompt without tools passes"
        assert run("doubt-check", {**base, "transcript_path": str(tr), "stop_hook_active": True}, env)[0] == 0

        # --- post-compact saves the summary as the branch hand-over; session-start re-injects brief + hand-over
        assert run("post-compact", {**base, "trigger": "auto", "compact_summary": "SUMMARY-123"}, env)[0] == 0
        out = run("session-start", {**base, "source": "compact"}, env)[1]
        assert "Goal: x" in out and "SUMMARY-123" in out, out
        assert "re-read" in out.lower(), "after compaction: re-read files before editing"
        assert run("session-start", {**base, "cwd": str(other), "source": "clear"}, env)[1] == "", "non-A3: silent"
        brief.rename(brief.with_suffix(".off"))
        assert "/brief" in run("session-start", {**base, "source": "clear"}, env)[1], "no brief: tell Claude to run /brief"
        brief.with_suffix(".off").rename(brief)

        # --- gate
        def gate(sid="g1", active=False):
            return run("gate", {**base, "session_id": sid, "stop_hook_active": active}, env)
        assert gate()[0] == 0, "no .py change vs main: pass"
        (repo / "pkg" / "calc.py").write_text("def add(a, b):\n    return a + b + 0\n")
        assert gate()[0] == 0, "green check passes"
        env["A3_PYTEST"] = "false"
        assert gate()[0] == 0, "same diff as last green run is cached, not re-run"
        (repo / "pkg" / "calc.py").write_text("def add(a, b):\n    return b + a\n")
        code, _, err = gate()
        assert code == 2 and "check failed" in err, f"red check must block: {err}"
        assert gate(active=True)[0] == 0, "stop after a block passes: a red it cannot fix must not loop"
        env["A3_PYTEST"] = "true"
        (repo / "tests" / "test_calc.py").write_text(
            "import pytest\nfrom pkg.calc import add\n\n@pytest.mark.xfail\ndef test_add():\n    assert add(1, 2) == 3\n")
        code, _, err = gate()
        assert code == 2 and "xfail" in err, f"added xfail must block: {err}"
        brief.write_text("# Brief\nGoal: x\nallow-test-weakening\n")
        assert gate()[0] == 0, "brief override lets the xfail through"
        brief.write_text("# Brief\nGoal: x\n")
        sh("git", "checkout", "-q", "--", "tests/test_calc.py", cwd=repo)
        sh("git", "rm", "-q", "tests/test_calc.py", cwd=repo)
        code, _, err = gate()
        assert code == 2 and "deleted" in err, f"deleted test file must block: {err}"
        sh("git", "reset", "-q", "--hard", cwd=repo)
        assert run("gate", {**base, "cwd": str(other)}, env)[0] == 0, "non-A3 cwd: pass"
        # gate runs on every checkout the session or its subagents edited, not only on the cwd
        assert run("scope-guard", {**base, "session_id": "rec1", "cwd": str(root), "tool_name": "Edit",
                                   "tool_input": {"file_path": str(repo / "pkg" / "calc.py")}}, env)[0] == 0
        (repo / "pkg" / "test_rec.py").write_text("def test_r():\n    assert True\n")
        env["A3_PYTEST"] = "false"
        code, _, err = run("gate", {**base, "session_id": "rec1", "cwd": str(root)}, env)
        assert code == 2 and "test_rec" in err, f"gate must check the edited checkout: {err}"
        env["A3_PYTEST"] = "true"
        (repo / "pkg" / "test_rec.py").unlink()

        # --- gate checks only files this session touched (modified after its transcript was created)
        sess = root / "sess.jsonl"
        stale = repo / "pkg" / "test_stale.py"
        stale.write_text("import missing_module\n")
        old_t = time.time() - 86400
        os.utime(stale, (old_t, old_t))
        sess.write_text("{}\n")
        env["A3_PYTEST"] = "false"
        assert run("gate", {**base, "session_id": "g9", "transcript_path": str(sess)}, env)[0] == 0, \
            "stale untracked files from before the session are not this session's work"
        (repo / "pkg" / "test_fresh.py").write_text("def test_x():\n    assert True\n")
        code, _, err = run("gate", {**base, "session_id": "g9", "transcript_path": str(sess)}, env)
        assert code == 2 and "test_fresh" in err and "test_stale" not in err, f"only touched files: {err}"
        stale.unlink()
        (repo / "pkg" / "test_fresh.py").unlink()
        env["A3_PYTEST"] = "true"

        # --- a branch cut from another branch into a fresh worktree: every file on disk is new, but what the base
        #     branch committed before the session is not this session's work (2026-10-08)
        day_ago = f"@{int(time.time() - 86400)}"
        (repo / "tests" / "test_calc.py").write_text(
            "import pytest\nfrom pkg.calc import add\n\n@pytest.mark.xfail\ndef test_add():\n    assert add(1, 2) == 3\n")
        subprocess.run(["git", "commit", "-qam", "base branch xfail"], cwd=repo, check=True,
                       env={**os.environ, "GIT_COMMITTER_DATE": day_ago, "GIT_AUTHOR_DATE": day_ago})
        fresh = root / "fresh.jsonl"
        fresh.write_text("{}\n")
        for f in (repo / "tests" / "test_calc.py", repo / "pkg" / "calc.py"):
            f.touch()
        code, _, err = run("gate", {**base, "session_id": "w1", "transcript_path": str(fresh)}, env)
        assert code == 0, f"the base branch's xfail, committed before the session, is not this session's: {err}"
        with (repo / "tests" / "test_calc.py").open("a") as f:
            f.write("\n@pytest.mark.xfail\ndef test_mine():\n    assert True\n")
        code, _, err = run("gate", {**base, "session_id": "w1", "transcript_path": str(fresh)}, env)
        assert code == 2 and "xfail" in err, f"an xfail this session adds still blocks: {err}"
        sh("git", "reset", "-q", "--hard", "HEAD~1", cwd=repo)

        # --- council findings: non-ASCII names, broken extra-rule ruff run, timeout keeps other problems
        uni = repo / "pkg" / "test_\u00e4.py"
        uni.write_text("import pytest\n\n@pytest.mark.xfail\ndef test_u():\n    assert True\n")
        code, _, err = gate()
        assert code == 2 and "xfail" in err, f"non-ASCII file names are checked, not skipped: {err}"
        uni.unlink()
        (repo / "pkg" / "calc2.py").write_text("z = 1\n")
        env["A3_RUFF"] = "sh -c 'case \"$*\" in *output-format*) exit 2;; esac' ruff"
        code, _, err = gate()
        assert code == 2 and "extra rules" in err, f"a ruff run that crashes must not pass: {err}"
        env.update(A3_RUFF="false", A3_PYTEST="sleep 5; true", A3_CHECK_TIMEOUT="1")
        (repo / "pkg" / "test_calc2.py").write_text("def test_c():\n    assert True\n")
        code, _, err = gate()
        assert code == 2 and "timed out" in err and "ruff" in err, f"timeout must keep other problems: {err}"
        env.update(A3_RUFF="true", A3_PYTEST="true", A3_CHECK_TIMEOUT="840")
        (repo / "pkg" / "calc2.py").unlink()
        (repo / "pkg" / "test_calc2.py").unlink()

        # --- the corpus conftest fails a run that is only slow; owner 2026-10-06: slowness is no problem
        slow = repo / "pkg" / "test_slow.py"
        def pytest_says(*rows, rc=1):
            env["A3_PYTEST"] = f"sh -c 'printf \"%s\\n\" {' '.join(map(json.dumps, rows))}; exit {rc}' sh"
        budget = "fixtures/corpus took 340.3 s, over the 90 s budget: test_measure_traps.py 196.0 s"
        for i, (rows, rc, red) in enumerate([
            ((budget, "== 730 passed, 41 skipped, 6 xfailed, 3 warnings in 340.68s (0:05:40) =="), 1, False),
            ((budget, "== 1 failed, 729 passed in 340.68s =="), 1, True),
            ((budget, "== 1 error in 2.00s =="), 1, True),
            ((budget, "!!! Interrupted: 1 error during collection !!!", "== 3 passed, 1 error in 2.00s =="), 1, True),
            (("== 730 passed in 3.00s ==",), 1, True),
            ((budget, "== 730 passed in 340.68s =="), 2, True),
            ((budget, "== 1 failed, 2 passed in 340.68s ==", "== 730 passed in 1.00s =="), 1, True),
        ]):
            slow.write_text(f"def test_s():\n    assert {i}\n")
            pytest_says(*rows, rc=rc)
            code, _, err = gate()
            assert (code == 2) == red, f"case {i} {rows} rc={rc}: {err}"
        env["A3_PYTEST"] = "true"
        slow.unlink()

        # --- fast set runs once per commit (HEAD), not every turn; touched tests run every turn
        fast = repo / "apps" / "backend" / "tests" / "test_dev_plan_citations.py"
        fast.parent.mkdir(parents=True)
        fast.write_text("def test_f():\n    assert True\n")
        sh("git", "add", "-A", cwd=repo)
        sh("git", "commit", "-qm", "fast set", cwd=repo)
        sh("git", "push", "-q", "origin", "HEAD:main", cwd=repo)
        sh("git", "fetch", "-q", "origin", cwd=repo)
        args = root / "pytest-args"
        env["A3_PYTEST"] = f"sh -c 'echo \"$@\" > {args}' sh"
        (repo / "pkg" / "calc.py").write_text("def add(a, b):\n    return a + b  # turn 1\n")
        assert gate()[0] == 0 and "test_dev_plan_citations" in args.read_text(), "first check on a commit runs the fast set"
        (repo / "pkg" / "calc.py").write_text("def add(a, b):\n    return a + b  # turn 2\n")
        assert gate()[0] == 0
        assert "test_calc" in args.read_text() and "test_dev_plan_citations" not in args.read_text(), \
            "later turns on the same commit run only the touched tests"
        sh("git", "commit", "-qam", "turn 2", cwd=repo)
        assert gate()[0] == 0 and "test_dev_plan_citations" in args.read_text(), "a new commit runs the fast set again"
        env["A3_PYTEST"] = "true"
        sh("git", "reset", "-q", "--hard", "origin/main", cwd=repo)

        # --- speedbump
        (repo / "pkg" / "big.py").write_text("x = 1\n" * 900)
        sh("git", "add", "-A", cwd=repo)
        sh("git", "commit", "-qm", "big", cwd=repo)
        code, _, err = run("speedbump", {**base, "session_id": "b1"}, env)
        assert code == 2 and "900" in err, f"big branch must bump once: {err}"
        assert run("speedbump", {**base, "session_id": "b1"}, env)[0] == 0, "second stop in same session passes"
        sh("git", "reset", "-q", "--hard", "HEAD~1", cwd=repo)
        assert run("speedbump", {**base, "session_id": "b2"}, env)[0] == 0, "small young branch passes"

        # --- autopush
        def push(sid="p1"):
            return run("autopush", {**base, "session_id": sid}, env)
        (repo / "pkg" / "a.py").write_text("a = 1\n")
        sh("git", "add", "-A", cwd=repo)
        sh("git", "commit", "-qm", "feat: a [skip ci]", cwd=repo)
        code, out, _ = push()
        assert code == 0 and "pushed feat/x" in out, f"never-pushed branch is pushed: {out}"
        assert sh("git", "rev-parse", "origin/feat/x", cwd=repo) == sh("git", "rev-parse", "HEAD", cwd=repo)
        (repo / "pkg" / "b.py").write_text("b = 1\n")
        sh("git", "add", "-A", cwd=repo)
        sh("git", "commit", "-qm", "feat: b [skip ci]", cwd=repo)
        assert "pushed" not in push()[1], "pushed under 30 min ago: wait"
        sh("git", "checkout", "-q", "main", cwd=repo)
        assert "pushed" not in push()[1], "never push main"
        sh("git", "checkout", "-q", "feat/x", cwd=repo)

    print("a3hooks self-check: all passed")


if __name__ == "__main__":
    t0 = time.time()
    main()
    print(f"{time.time() - t0:.1f}s")
