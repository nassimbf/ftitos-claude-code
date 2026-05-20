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

function validateAgentDir(dir, label, minCount) {
  assert(fs.existsSync(dir), `${label}/ directory should exist`);

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    assert(files.length >= minCount, `${label}/ should have at least ${minCount} agents (found ${files.length})`);

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8").trim();
      assert(content.length >= 10, `${label}/${file} should have meaningful content`);
    }
  }
}

validateAgentDir(AGENTS_DIR, "agents", 18);
validateAgentDir(AGENTS_CCG_DIR, "agents-ccg", 5);

if (failures > 0) {
  console.error(`\nagents.test.js: ${failures} failure(s)`);
  process.exit(1);
}
