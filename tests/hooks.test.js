#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..");
const HOOKS_JSON = path.join(REPO_ROOT, "hooks", "hooks.json");
const HOOKS_SCRIPTS_DIR = path.join(REPO_ROOT, "hooks", "scripts");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

// Test: hooks.json exists
assert(fs.existsSync(HOOKS_JSON), "hooks/hooks.json should exist");

if (fs.existsSync(HOOKS_JSON)) {
  // Test: hooks.json is valid JSON
  let data;
  try {
    data = JSON.parse(fs.readFileSync(HOOKS_JSON, "utf8"));
  } catch (err) {
    assert(false, `hooks.json is not valid JSON: ${err.message}`);
  }

  if (data) {
    // Test: hooks.json has a 'hooks' object
    const hooks = data.hooks;
    assert(hooks && typeof hooks === "object" && !Array.isArray(hooks), "hooks.json should have a 'hooks' object");

    if (hooks && typeof hooks === "object") {
      const validEventTypes = [
        "PreToolUse", "PostToolUse", "PreCompact", "PostCompact",
        "SessionStart", "SessionEnd", "Stop", "UserPromptSubmit",
      ];

      for (const [eventType, matchers] of Object.entries(hooks)) {
        // Test: event type is valid
        assert(validEventTypes.includes(eventType), `'${eventType}' should be a valid hook event type`);

        // Test: matchers is an array
        assert(Array.isArray(matchers), `hooks.${eventType} should be an array`);

        if (Array.isArray(matchers)) {
          for (let i = 0; i < matchers.length; i++) {
            const entry = matchers[i];
            assert(entry.matcher, `hooks.${eventType}[${i}] should have a 'matcher' field`);
            assert(Array.isArray(entry.hooks), `hooks.${eventType}[${i}] should have a 'hooks' array`);
          }
        }
      }
    }
  }
}

// Test: hooks/scripts/ directory validation (JS syntax)
if (fs.existsSync(HOOKS_SCRIPTS_DIR)) {
  const validateDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        validateDir(fullPath);
      } else if (entry.name.endsWith(".js")) {
        const code = fs.readFileSync(fullPath, "utf8");
        try {
          new vm.Script(code, { filename: fullPath });
        } catch (err) {
          const rel = path.relative(REPO_ROOT, fullPath);
          assert(false, `${rel} has invalid JS syntax: ${err.message}`);
        }
      }
    }
  };
  validateDir(HOOKS_SCRIPTS_DIR);
}

if (failures > 0) {
  console.error(`\nhooks.test.js: ${failures} failure(s)`);
  process.exit(1);
}
