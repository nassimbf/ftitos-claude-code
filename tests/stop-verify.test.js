#!/usr/bin/env node
/**
 * Tests for hooks/scripts/stop-verify.js
 *
 * Regression driver (observed 2026-09-14): several Claude sessions can share one
 * working tree, and `git status` cannot tell them apart. The hook reported a peer
 * session's half-finished code as this session's failure and never cleared, so
 * every Stop event blocked on work the user had not done.
 *
 * Second driver, same session: `mypy .` is wrong in a repo whose sources live
 * under several roots. A3-core has three roots each holding a package named
 * `tests`, so one run from the top sees a file under two module names and dies
 * before checking anything.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  editedPathsInLine,
  sessionEditedFiles,
  mypyTargets,
} = require('../hooks/scripts/stop-verify.js');

function transcriptLine(toolName, filePath) {
  return JSON.stringify({
    message: { content: [{ type: 'tool_use', name: toolName, input: { file_path: filePath } }] },
  });
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-verify-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const cases = [
  ['extracts edited paths from a tool_use line', () => {
    assert.deepStrictEqual(editedPathsInLine(transcriptLine('Edit', '/repo/a.py')), ['/repo/a.py']);
    assert.deepStrictEqual(editedPathsInLine(transcriptLine('Write', '/repo/b.py')), ['/repo/b.py']);
  }],

  ['ignores non-edit tools and unparseable lines', () => {
    assert.deepStrictEqual(editedPathsInLine(transcriptLine('Read', '/repo/a.py')), []);
    assert.deepStrictEqual(editedPathsInLine(transcriptLine('Bash', '/repo/a.py')), []);
    assert.deepStrictEqual(editedPathsInLine('not json at all'), []);
    assert.deepStrictEqual(editedPathsInLine(''), []);
  }],

  ['collects only the files this session edited', () => withTempDir(root => {
    const transcript = path.join(root, 'session.jsonl');
    fs.writeFileSync(transcript, [
      transcriptLine('Edit', path.join(root, 'mine.py')),
      transcriptLine('Read', path.join(root, 'theirs.py')),
    ].join('\n'));

    const edited = sessionEditedFiles(transcript, root);
    assert(edited.has('mine.py'), 'file this session edited must be included');
    assert(!edited.has('theirs.py'), 'a file this session only READ is not ours to verify');
  })],

  // The load-bearing case. null is not "no files" — it means the transcript could
  // not be read, and the caller must then verify everything git reports rather
  // than nothing. Edits made through Bash are invisible to the transcript, so
  // treating an unreadable transcript as an empty set would silently disable the
  // hook. Returning null keeps that distinction in the type.
  ['returns null when the transcript is unreadable, not an empty set', () => {
    assert.strictEqual(sessionEditedFiles(undefined, '/repo'), null);
    assert.strictEqual(sessionEditedFiles('', '/repo'), null);
    assert.strictEqual(sessionEditedFiles('/nonexistent/transcript.jsonl', '/repo'), null);
  }],

  ['a peer session\'s edits stay out of our set', () => withTempDir(root => {
    const ours = path.join(root, 'ours.jsonl');
    fs.writeFileSync(ours, transcriptLine('Edit', path.join(root, 'ours.py')));

    const edited = sessionEditedFiles(ours, root);
    assert(edited.has('ours.py'));
    // A peer editing peer.py in the same worktree shows up in `git status` but
    // never in our transcript. That gap is the entire point of the filter.
    assert(!edited.has('peer.py'), 'peer session work must not be attributed to us');
  })],

  ['mypy targets drop deleted files', () => withTempDir(root => {
    fs.writeFileSync(path.join(root, 'present.py'), 'x = 1\n');
    // git reports a deleted file as modified; mypy cannot open it and exits
    // non-zero on a file the session legitimately removed.
    const targets = mypyTargets(['present.py', 'deleted.py'], root);
    assert.deepStrictEqual(targets, ['present.py']);
  })],

  ['mypy targets are scoped, never a bare directory', () => withTempDir(root => {
    fs.writeFileSync(path.join(root, 'a.py'), 'x = 1\n');
    fs.writeFileSync(path.join(root, 'b.py'), 'y = 2\n');
    const targets = mypyTargets(['a.py', 'b.py'], root);
    assert.deepStrictEqual(targets, ['a.py', 'b.py']);
    assert(!targets.includes('.'), 'a bare `.` target is the duplicate-module failure');
  })],
];

let passed = 0;
let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    failed += 1;
  }
}
console.log(`\nstop-verify: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
