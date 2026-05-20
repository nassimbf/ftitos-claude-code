#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AGENTS_DIR = path.join(REPO_ROOT, "agents");
const AGENTS_CCG_DIR = path.join(REPO_ROOT, "agents-ccg");

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
  const ccg = validateDir(AGENTS_CCG_DIR, "agents-ccg");

  const total = base.count + ccg.count;
  const totalFailures = base.failures + ccg.failures;

  console.log(`\nAgents validated: ${total} (${base.count} base + ${ccg.count} CCG), Failures: ${totalFailures}`);

  if (total < 18) {
    console.error(`FAIL: Expected at least 18 base agents, found ${base.count}`);
    process.exit(1);
  }

  if (totalFailures > 0) process.exit(1);
}

main();
