#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TESTS_DIR = path.join(__dirname);

function discoverTests() {
  return fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith(".test.js"))
    .map((f) => path.join(TESTS_DIR, f));
}

function runTest(filePath) {
  const name = path.basename(filePath);
  try {
    execSync(`node "${filePath}"`, { stdio: "pipe", encoding: "utf8" });
    console.log(`  PASS  ${name}`);
    return true;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    const output = (err.stdout || "") + (err.stderr || "");
    if (output.trim()) {
      output
        .trim()
        .split("\n")
        .forEach((line) => console.log(`        ${line}`));
    }
    return false;
  }
}

function main() {
  const testFiles = discoverTests();

  if (testFiles.length === 0) {
    console.log("No test files found (*.test.js)");
    process.exit(1);
  }

  console.log(`Running ${testFiles.length} test file(s)...\n`);

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    if (runTest(file)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${testFiles.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
