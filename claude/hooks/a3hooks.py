"""Claude Code hooks: deterministic checks for A3 work, plus a global "are you sure?" check.

Registered in ~/.claude/settings.json as `/usr/bin/python3 -I ~/.claude/hooks/a3hooks.py <event>`.
Local to this machine on purpose: nothing here is committed to A3, so co-founders are not affected.

Events
  bash-guard    PreToolUse Bash        block SKIP= commits, force-push to main, `sed -i` inside A3
  scope-guard   PreToolUse Edit|Write  A3 edits need the checkout's brief (no open question) and the path in scope
  session-start SessionStart           inject the branch brief + last hand-over (startup, /clear, compaction)
  post-compact  PostCompact            save the compaction summary as the branch hand-over
  doubt-inject  UserPromptSubmit       "are you sure?" -> tell the model to read before answering
  doubt-check   Stop                   block an answer to a doubt prompt that used no tool
  gate          Stop                   ruff + test-guard + touched tests + fast set must be green
  speedbump     Stop                   branch > 800 lines or > 3 days from main: block once per session
  autopush      Stop                   push the working branch every 30 min (never main, never force)
  brief-path    (CLI)                  print the brief file path for the cwd's checkout

Exit 2 + stderr blocks and is fed back to the model. Any crash exits 0: a broken hook must
not wedge every session (run test_a3hooks.py after each change).
"""
import fnmatch
import hashlib
import json
import os
import re
import shlex
import signal
import subprocess
import sys
import time
from pathlib import Path

A3 = Path(os.environ.get("A3_REPO", "~/Desktop/A3-core")).expanduser()
STATE = Path(os.environ.get("A3_STATE_DIR", "/tmp/claude-a3hooks"))
RUFF = os.environ.get("A3_RUFF", "ruff")
PYTEST = os.environ.get(
    "A3_PYTEST",
    "make -s apps/backend/.secret_key.dev && SECRET_KEY=$(cat apps/backend/.secret_key.dev) "
    "PYTHONPATH=agents:libs:apps/backend:. uv run pytest -q -x -p no:cacheprovider",
)
FAST_SET = ["fixtures/corpus/test_measure_fast.py", "fixtures/corpus/test_measure_traps.py",
            "apps/backend/tests/test_dev_plan_citations.py"]
EXTRA_RULES = "BLE001,S110,B904"  # swallowed or re-labelled errors: a silent wrong figure in the engine
PROTECTED = {"", "HEAD", "main", "master", "main-ftt"}
MAX_LINES, MAX_DAYS, PUSH_EVERY_S = 800, 3, 1800
CHECK_TIMEOUT_S = int(os.environ.get("A3_CHECK_TIMEOUT", "840"))
# Sessions started before this time (2026-10-07 15:26 CEST) keep their old workflow: no brief, gate or speedbump.
ROLLOUT = float(os.environ.get("A3_ROLLOUT", "1791379606"))

OVER_BUDGET_RE = re.compile(r"^fixtures/corpus took [\d.]+ s, over the \d+ s budget", re.M)
PASSED_RE = re.compile(r"\b\d+ passed\b.* in [\d.]+s\b")
FAILED_RE = re.compile(r"\b\d+ (failed|errors?)\b")
SKIP_RE = re.compile(r"^\+(?!\+\+).*(@pytest\.mark\.(skip|xfail)\b|pytest\.(skip|xfail)\()", re.M)
DOUBT_RE = re.compile(
    r"\b(are|r) (you|u|yuo|yu) (sure|certain)|\byou sure\b|\bsure\s*\?"
    r"|\b(did|have|do) (you|u) (actually |really |even )?(read|check|look|verify|open|test|run|see)\b"
    r"|\bis (this|that|it) (true|correct|right|real|so)\b|\bverif(y|ied)\b|\bdouble.?check"
    r"|\bhow do (you|u) know\b|\bprove (it|this|that)\b|\breally\s*\?"
    r"|\bstimmt das\b|\bsicher\s*\?|\bhast du\b.*\b(gelesen|geprüft|gecheckt)\b",
    re.I,
)
DOUBT_MSG = (
    "The user is asking you to verify. Do not answer from memory or from your earlier messages. "
    "In this turn, open what the claim rests on (Read, Grep, Bash: code, logs, command output). "
    "Answer with what you found and cite file:line or the command you ran. If you cannot check it, "
    "say 'not verified' and why. If an earlier claim of yours was unverified or wrong, say so first."
)


# ---------- helpers

def git(*args, cwd):
    p = subprocess.run(["git", "-c", "core.quotePath=false", *args], cwd=cwd, capture_output=True, text=True)
    return p.stdout.strip() if p.returncode == 0 else None


def lines(s):
    return [x for x in (s or "").splitlines() if x.strip()]


def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)


def say(user_msg, model_msg=None, event=None):
    out = {"systemMessage": user_msg}
    if model_msg:
        out["hookSpecificOutput"] = {"hookEventName": event, "additionalContext": model_msg}
    print(json.dumps(out))


def toplevel(p):
    p = Path(p)
    while not p.is_dir() and p != p.parent:
        p = p.parent
    return git("rev-parse", "--show-toplevel", cwd=p)


def is_a3(top):
    common = git("rev-parse", "--git-common-dir", cwd=top)
    return bool(common) and Path(top, common).resolve() == (A3 / ".git").resolve()


def cwd_a3(inp):
    top = toplevel(inp.get("cwd") or os.getcwd())
    return top if top and is_a3(top) else None


def git_dir(top):
    return Path(top, git("rev-parse", "--git-dir", cwd=top)).resolve()


def branch(top):
    return git("branch", "--show-current", cwd=top) or "HEAD"


def safe(s):
    return re.sub(r"[^\w.-]", "-", s)


def brief_path(top):
    return git_dir(top) / f"claude-brief-{safe(branch(top))}.md"


def brief_text(top):
    p = brief_path(top)
    return p.read_text() if p.exists() else ""


def scope(text):
    m = re.search(r"^## Scope\s*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return [x[2:].strip().strip("`") for x in m.group(1).splitlines() if x.startswith("- ")] if m else []


def session_birth(inp):
    """Creation time of the session's transcript; 0 when unknown (then everything counts)."""
    try:
        return os.stat(inp.get("transcript_path") or "").st_birthtime
    except (OSError, AttributeError):
        return 0


def grandfathered(inp):
    try:
        return os.stat(inp.get("transcript_path") or "").st_birthtime < ROLLOUT
    except (OSError, AttributeError):
        return False


def is_test(f):
    name = Path(f).name
    return name.startswith("test_") and name.endswith(".py")


def read(p):
    return p.read_text() if p.exists() else ""


def tail_records(path, nbytes=4_000_000):
    """Transcript records, newest first (reads only the tail: transcripts reach hundreds of MB)."""
    if not path or not Path(path).exists():
        return
    with open(path, "rb") as f:
        f.seek(0, 2)
        f.seek(max(0, f.tell() - nbytes))
        data = f.read().decode("utf-8", "replace")
    for raw in reversed(data.splitlines()):
        try:
            yield json.loads(raw)
        except ValueError:
            continue


def blocks(rec):
    content = (rec.get("message") or {}).get("content")
    return content if isinstance(content, list) else []


def prompt_text(rec):
    """The text of a real user prompt, or None for tool results and injected meta messages."""
    if rec.get("type") != "user" or rec.get("isMeta"):
        return None
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, str):
        return None if content.lstrip().startswith("<") else content
    if any(b.get("type") == "tool_result" for b in content or []):
        return None
    text = " ".join(b.get("text", "") for b in content or [] if b.get("type") == "text")
    return text or None


# ---------- PreToolUse

def bash_guard(inp):
    cmd = (inp.get("tool_input") or {}).get("command", "")
    if re.search(r"\bSKIP=\S+.*\bgit\s+commit\b", cmd):
        block("SKIP= turns off pre-commit checks. Fix what the check reports instead.")
    if (re.search(r"\bgit\s+push\b", cmd)
            and re.search(r"\s(--force(-with-lease)?\b|-f\b|\+[\w/])", cmd)
            and re.search(r"(?<![\w/-])(main|master)(?![\w/-])", cmd)):
        block("Force-push to main/master is never allowed.")
    if re.search(r"\bsed\b[^|;&]*\s(-[a-zA-Z]*i[a-zA-Z]*|--in-place)\b", cmd) and cwd_a3(inp):
        block("Use the Edit tool, not `sed -i`: Edit goes through the brief scope check.")


def scope_guard(inp):
    if grandfathered(inp):
        return
    ti = inp.get("tool_input") or {}
    raw = ti.get("file_path") or ti.get("notebook_path")
    if not raw:
        return
    cwd = inp.get("cwd") or os.getcwd()
    path = Path(raw) if os.path.isabs(raw) else Path(cwd, raw)
    path = path.resolve()
    top = toplevel(path.parent)
    if not top or not is_a3(top):
        return
    rel = os.path.relpath(path, top)
    if rel.split(os.sep)[0] == ".git":
        return
    text = brief_text(top)
    if not text:
        block(f"No brief for branch {branch(top)}. Run /brief first (goal, scope, done-check), "
              "show it to the user, and wait for their go before you edit.")
    open_q = re.findall(r"^\s*- \[ \] (.+)$", text, re.M)
    if open_q:
        block(f"The brief still has {len(open_q)} open question(s), e.g. '{open_q[0]}'. Resolve them with the "
              "user (or prove them from the code), mark them '- [x]', then edit.")
    globs = scope(text)
    if globs and not any(fnmatch.fnmatch(rel, g) or rel.startswith(g.rstrip("/") + "/") for g in globs):
        block(f"{rel} is outside the brief scope in {brief_path(top)}. Ask the user; "
              "if they agree, add it under '## Scope' and continue.")
    _record(inp, top)


def _edited_file(inp):
    return STATE / f"edited-{safe(str(inp.get('session_id')))}"


def _record(inp, top):
    """Remember the checkout: subagents report the parent's session_id and cwd (verified 2026-10-07)."""
    f = _edited_file(inp)
    if top not in lines(read(f)):
        STATE.mkdir(parents=True, exist_ok=True)
        with f.open("a") as fh:
            fh.write(top + "\n")


def session_tops(inp):
    """Every A3 checkout this session or its subagents edited, plus the cwd's checkout."""
    tops = set(lines(read(_edited_file(inp))))
    cwd_top = cwd_a3(inp)
    if cwd_top:
        tops.add(cwd_top)
    return sorted(t for t in tops if Path(t).is_dir() and is_a3(t))


# ---------- UserPromptSubmit

def doubt_inject(inp):
    prompt = inp.get("prompt") or ""
    if not prompt.lstrip().startswith("<") and DOUBT_RE.search(prompt):  # "<..." = system notification
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit",
                                                 "additionalContext": DOUBT_MSG}}))


# ---------- SessionStart / PostCompact: auto-compaction at 200k (autoCompactWindow) sweeps the
# context; these two carry the brief and the last summary into the fresh context.

def handover_path(top):
    return git_dir(top) / f"claude-handover-{safe(branch(top))}.md"


def post_compact(inp):
    top = cwd_a3(inp)
    if top and inp.get("compact_summary"):
        handover_path(top).write_text(f"# Hand-over {time.strftime('%Y-%m-%d %H:%M')} ({inp.get('trigger')})\n\n"
                                      f"{inp['compact_summary']}\n")


def session_start(inp):
    top = cwd_a3(inp)
    if not top or grandfathered(inp):
        return
    brief, handover = brief_text(top), read(handover_path(top))
    parts = [f"A3 branch {branch(top)}."]
    parts.append(f"Brief ({brief_path(top)}):\n{brief}" if brief
                 else "No brief for this branch yet: run /brief before any edit.")
    if handover:
        parts.append(f"Last hand-over ({handover_path(top)}):\n{handover[-6000:]}")
    if inp.get("source") in ("compact", "resume"):
        parts.append("Your context was summarised. Re-read every file before you edit it: "
                     "the summary is not the file, and its line numbers and code may be wrong.")
    print("\n\n".join(parts))


# ---------- Stop

def doubt_check(inp):
    if inp.get("stop_hook_active"):
        return
    tools = 0
    for rec in tail_records(inp.get("transcript_path")):
        if rec.get("type") == "assistant":
            tools += sum(1 for b in blocks(rec) if b.get("type") == "tool_use")
            continue
        text = prompt_text(rec)
        if text is not None:
            if DOUBT_RE.search(text) and tools == 0:
                block("The user asked you to verify, and you answered without opening anything. "
                      "Read the code or run the command the claim rests on now, then answer again "
                      "with file:line evidence. If you cannot check it, say 'not verified'.")
            return


def gate(inp):
    if inp.get("stop_hook_active") or grandfathered(inp):  # blocked once already: a second block only loops
        return
    # ponytail: checkouts are checked one after another; run them in parallel if several lanes make stops slow
    msgs = [m for m in (_gate_one(inp, top) for top in session_tops(inp)) if m]
    if msgs:
        block("\n\n".join(msgs))


def session_base(top, start):
    """The commit this session's work is measured from: the newest commit on HEAD made before the session began,
    else where HEAD left origin/main. A branch cut from another branch into a fresh worktree writes every file
    anew; its base branch's commits are still not this session's (2026-10-08)."""
    main = git("merge-base", "HEAD", "origin/main", cwd=top)
    before = git("rev-list", "-1", f"--before=@{int(start)}", "HEAD", cwd=top) if start and main else None
    if before and git("merge-base", "--is-ancestor", main, before, cwd=top) is not None:
        return before
    return main


def _gate_one(inp, top):
    """None when green or nothing to check, else the message that blocks the turn."""
    # Only this session's work: files modified after its transcript was created. Stale leftovers
    # (old untracked copies, branch commits from earlier sessions) are not this session's to fix.
    start = session_birth(inp)
    base = session_base(top, start)
    if not base:
        return None
    def touched(f):
        try:
            return os.stat(Path(top, f)).st_mtime >= start - 2
        except OSError:
            return False
    untracked = [f for f in lines(git("ls-files", "-o", "--exclude-standard", "--", "*.py", cwd=top)) if touched(f)]
    tracked = [f for f in lines(git("diff", "--name-only", "--diff-filter=d", base, "--", "*.py", cwd=top))
               if touched(f)]
    changed = tracked + untracked
    since = [f"--since=@{int(start)}"] if start else []
    deleted = sorted({f for f in lines(git("diff", "--name-only", "--diff-filter=D", "HEAD", "--", "*.py", cwd=top))
                      + lines(git("log", *since, "--format=", "--name-only", "--diff-filter=D", f"{base}..HEAD",
                                  "--", "*.py", cwd=top)) if is_test(f)})
    if not changed and not deleted:
        return
    brief = brief_text(top)
    h = hashlib.sha256()
    # ponytail: hashes .py changes + brief only; a changed non-.py fixture keeps an old green until a .py changes
    h.update((git("diff", base, "--", *tracked, cwd=top) if tracked else "").encode() + "|".join(deleted).encode())
    for f in untracked:
        h.update(f.encode() + Path(top, f).read_bytes())
    head = git("rev-parse", "HEAD", cwd=top) or ""
    h.update(brief.encode() + head.encode())  # a new commit re-checks, with the fast set
    h = h.hexdigest()
    gd = git_dir(top)
    green, red = gd / "claude-green", gd / "claude-red"
    if read(green) == h:
        return
    cached = read(red).split("\n", 1)
    if cached[0] == h and len(cached) == 2:
        return cached[1]  # nothing changed since the red run: same answer, no re-run

    problems = []
    if "allow-test-weakening" not in brief:
        if deleted:
            problems.append("Test files deleted: " + ", ".join(deleted))
        touched_tests = [f for f in tracked if is_test(f)]
        tests_diff = (git("diff", "-U0", base, "--", *touched_tests, cwd=top) or "") if touched_tests else ""
        tests_diff += "".join("".join("+" + x for x in Path(top, f).read_text().splitlines(True))
                              for f in untracked if is_test(f))
        hits = [m.group(0)[1:].strip() for m in SKIP_RE.finditer(tests_diff)]
        if hits:
            problems.append("Added skip/xfail: " + "; ".join(hits[:5]))
    if problems:
        problems[-1] += ("\n  (If the user agrees this is right, add a line 'allow-test-weakening' "
                         "to the brief.)")

    if changed:
        r = subprocess.run([*shlex.split(RUFF), "check", "--no-fix", "--quiet", *changed],
                           cwd=top, capture_output=True, text=True)
        if r.returncode:
            problems.append("ruff:\n" + "\n".join((r.stdout + r.stderr).splitlines()[-30:]))
        r = subprocess.run([*shlex.split(RUFF), "check", "--no-fix", "--output-format", "json",
                            "--select", EXTRA_RULES, *changed], cwd=top, capture_output=True, text=True)
        if r.returncode not in (0, 1):  # 1 = violations found, anything else = ruff itself failed
            problems.append("ruff extra rules failed to run:\n" + "\n".join((r.stdout + r.stderr).splitlines()[-10:]))
        try:
            found = json.loads(r.stdout or "[]")
        except ValueError:
            found = []
        new = {}
        for v in found:
            f = os.path.relpath(v["filename"], top)
            if f not in new:
                new[f] = None if f in untracked else _new_lines(top, base, f)
            row = v["location"]["row"]
            if new[f] is None or row in new[f]:
                problems.append(f"{f}:{row} {v['code']} {v['message']} (log or re-raise; never swallow)")

    fast_marker = gd / "claude-fastset"
    with_fast = read(fast_marker) != head  # owner rule: fast set per change (commit), not per turn
    tests = _select_tests(top, changed, with_fast)
    if len(tests) > 60:  # ponytail: huge branch (an integration branch); scope to uncommitted work, the full suite belongs to the batch run
        tests = _select_tests(top, [f for f in lines(git("diff", "--name-only", "--diff-filter=d", "HEAD", "--",
                                                          "*.py", cwd=top)) if touched(f)] + untracked, with_fast)
    if tests:
        # ponytail: no cap on parallel runs across worktrees; add a 3-slot lock if sessions stall or run out of memory
        p = subprocess.Popen(f"{PYTEST} {' '.join(map(shlex.quote, tests))}", shell=True, cwd=top,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                             start_new_session=True)
        try:
            out, _ = p.communicate(timeout=CHECK_TIMEOUT_S)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
            out = f"timed out after {CHECK_TIMEOUT_S}s"
            problems.append(f"pytest timed out after {CHECK_TIMEOUT_S}s on: {' '.join(tests)}")
        # Owner 2026-10-06: a slow run is no problem, but fixtures/corpus/conftest.py fails one over 90 s.
        only_slow = (p.returncode == 1 and OVER_BUDGET_RE.search(out) and PASSED_RE.search(out)
                     and not FAILED_RE.search(out))
        if p.returncode and not out.startswith("timed out") and not only_slow:
            problems.append("pytest " + " ".join(tests) + ":\n" + "\n".join(out.splitlines()[-40:]))

    if problems:
        msg = (f"A3 check failed in {top}; the turn cannot end while it is red.\n\n" + "\n\n".join(problems)
               + "\n\nFix the cause, not the test. If a failure is pre-existing and unrelated, "
               "tell the user which one and why.")
        red.write_text(h + "\n" + msg)
        return msg
    green.write_text(h)
    if with_fast:
        fast_marker.write_text(head)


def _new_lines(top, base, f):
    out = git("diff", "-U0", base, "--", f, cwd=top) or ""
    rows = set()
    for start, count in re.findall(r"^@@ -\S+ \+(\d+)(?:,(\d+))? @@", out, re.M):
        rows.update(range(int(start), int(start) + int(count or 1)))
    return rows


def _select_tests(top, changed, with_fast=True):
    tests = {f for f in changed if is_test(f)}
    for f in changed:
        if not is_test(f):
            tests.update(lines(git("ls-files", f"*test_{Path(f).stem}.py", cwd=top)))
    if with_fast:
        tests.update(FAST_SET)
    return sorted(t for t in tests if Path(top, t).exists())


def speedbump(inp):
    if not grandfathered(inp):
        for top in session_tops(inp):
            _speedbump_one(inp, top)


def _speedbump_one(inp, top):
    b = branch(top)
    base = b not in PROTECTED and git("merge-base", "HEAD", "origin/main", cwd=top)
    if not base:
        return
    n = 0
    for row in lines(git("diff", "--numstat", base, cwd=top)):
        added, removed, _ = row.split("\t", 2)
        if added != "-":
            n += int(added) + int(removed)
    first = lines(git("log", "--reverse", "--format=%ct", f"{base}..HEAD", cwd=top))
    days = (time.time() - int(first[0])) / 86400 if first else 0
    if n <= MAX_LINES and days <= MAX_DAYS:
        return
    stamp = STATE / f"bump-{inp.get('session_id')}-{safe(b)}"
    if stamp.exists():
        return
    STATE.mkdir(parents=True, exist_ok=True)
    stamp.touch()
    block(f"Branch {b} is {n} lines from main and {days:.0f} days old (limit {MAX_LINES} lines, "
          f"{MAX_DAYS} days). Tell the user, and propose landing what is done as a small PR to main, "
          "or splitting the branch. Then continue.")


def autopush(inp):
    msgs = [m for m in (_autopush_one(top) for top in session_tops(inp)) if m]
    if msgs:
        say("; ".join(msgs))


def _autopush_one(top):
    b = branch(top)
    if b in PROTECTED:
        return
    gd = git_dir(top)
    if any((gd / x).exists() for x in ("MERGE_HEAD", "rebase-merge", "rebase-apply")):
        return
    if git("rev-parse", "-q", "--verify", f"refs/remotes/origin/{b}", cwd=top):
        if int(git("rev-list", "--count", f"origin/{b}..{b}", cwd=top) or 0) == 0:
            return
        last = 0
        for row in lines(git("reflog", "show", "--date=unix", "--format=%gd %gs", f"refs/remotes/origin/{b}",
                             cwd=top)):
            if "update by push" in row:
                last = int(re.search(r"@\{(\d+)\}", row).group(1))
                break
        if time.time() - last < PUSH_EVERY_S:
            return
    if "[skip ci]" not in (git("log", "-1", "--format=%B", cwd=top) or ""):
        pr = subprocess.run(["gh", "pr", "view", b, "--json", "baseRefName", "-q", ".baseRefName"],
                            cwd=top, capture_output=True, text=True, timeout=30).stdout.strip()
        if pr in ("main", "main-ftt"):
            return f"not pushed {b}: head commit lacks [skip ci] and its PR targets {pr} (CI would run)"
    p = subprocess.run(["git", "push", "-q", "-u", "origin", b], cwd=top, capture_output=True, text=True,
                       timeout=120)
    sha = git("rev-parse", "--short", "HEAD", cwd=top)
    return f"pushed {b} {sha}" if p.returncode == 0 else f"push failed {b}: {p.stderr.strip()[-200:]}"


def print_brief_path(inp):
    top = cwd_a3(inp)
    if not top:
        sys.exit("not inside an A3 checkout")
    print(brief_path(top))


HANDLERS = {
    "bash-guard": bash_guard, "scope-guard": scope_guard, "session-start": session_start,
    "post-compact": post_compact,
    "doubt-inject": doubt_inject, "doubt-check": doubt_check, "gate": gate,
    "speedbump": speedbump, "autopush": autopush, "brief-path": print_brief_path,
}

if __name__ == "__main__":
    event = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = "" if event == "brief-path" and sys.stdin.isatty() else sys.stdin.read()
    try:
        HANDLERS[event](json.loads(raw or "{}"))
    except SystemExit:
        raise
    except Exception as e:  # fail open: a hook bug must not wedge every session
        print(f"a3hooks {event}: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(0)
