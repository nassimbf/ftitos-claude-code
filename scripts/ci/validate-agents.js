#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const AGENTS_DIR = path.resolve(__dirname, "..", "..", "agents");

function main() {
  console.log("Validating agents...\n");

  if (!fs.existsSync(AGENTS_DIR)) {
    console.error("FAIL: agents/ directory does not exist");
    process.exit(1);
  }

  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.error("FAIL: no .md files found in agents/");
    process.exit(1);
  }

  let failures = 0;

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    const stat = fs.statSync(filePath);

    if (stat.size === 0) {
      console.log(`  FAIL: ${file} is empty`);
      failures++;
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8").trim();
    if (content.length < 10) {
      console.log(`  FAIL: ${file} has insufficient content (${content.length} chars)`);
      failures++;
      continue;
    }

    console.log(`  OK: ${file} (${stat.size} bytes)`);
  }

  console.log(`\nAgents validated: ${files.length}, Failures: ${failures}`);

  if (failures > 0) process.exit(1);
}

main();
