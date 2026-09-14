#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AGENTS_DIR = path.join(REPO_ROOT, "agents");
const AGENTS_CCG_DIR = path.join(REPO_ROOT, "agents-ccg");

// v4 caps the roster: each shipped agent costs context on every session.
const MAX_AGENTS = 8;

function validateDir(dir, label) {
  if (!fs.existsSync(dir)) {
    console.error(`FAIL: ${label}/ directory does not exist`);
    return { count: 0, failures: 1 };
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  let failures = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf8").trim();

    if (content.length < 10) {
      console.log(`  FAIL: ${label}/${file} has insufficient content (${content.length} chars)`);
      failures++;
      continue;
    }

    console.log(`  OK: ${label}/${file} (${fs.statSync(filePath).size} bytes)`);
  }

  return { count: files.length, failures };
}

function main() {
  console.log("Validating agents...\n");

  const base = validateDir(AGENTS_DIR, "agents");

  console.log(`\nAgents validated: ${base.count}, Failures: ${base.failures}`);

  if (fs.existsSync(AGENTS_CCG_DIR)) {
    console.error("FAIL: agents-ccg/ was removed in v4 and should not return");
    process.exit(1);
  }

  if (base.count === 0 || base.count > MAX_AGENTS) {
    console.error(`FAIL: expected 1-${MAX_AGENTS} agents, found ${base.count}`);
    process.exit(1);
  }

  if (base.failures > 0) process.exit(1);
}

main();
