#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(REPO_ROOT, "agents");
const AGENTS_CCG_DIR = path.join(REPO_ROOT, "agents-ccg");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

// v4 asserts a ceiling, not a floor. Every shipped agent costs context on every session,
// so growth is the failure mode worth catching — not scarcity.
const MAX_AGENTS = 8;

function validateAgentDir(dir, label, maxCount) {
  assert(fs.existsSync(dir), `${label}/ directory should exist`);

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    assert(files.length > 0, `${label}/ should have at least one agent`);
    assert(
      files.length <= maxCount,
      `${label}/ should ship at most ${maxCount} agents (found ${files.length}) — see skills/TIER.md admission criteria`
    );

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8").trim();
      assert(content.length >= 10, `${label}/${file} should have meaningful content`);
    }
  }
}

validateAgentDir(AGENTS_DIR, "agents", MAX_AGENTS);
assert(!fs.existsSync(AGENTS_CCG_DIR), "agents-ccg/ was removed in v4 and should not return");

if (failures > 0) {
  console.error(`\nagents.test.js: ${failures} failure(s)`);
  process.exit(1);
}
