#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HOOKS_JSON = path.join(REPO_ROOT, "hooks", "hooks.json");
const HOOKS_SCRIPTS_DIR = path.join(REPO_ROOT, "hooks", "scripts");

function main() {
  console.log("Validating hooks...\n");

  let failures = 0;

  // Validate hooks.json
  if (!fs.existsSync(HOOKS_JSON)) {
    console.log("  SKIP: hooks/hooks.json does not exist yet");
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(HOOKS_JSON, "utf8"));
      const hooks = data.hooks;

      if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) {
        console.log("  FAIL: hooks.json should have a 'hooks' object");
        failures++;
      } else {
        let totalEntries = 0;
        for (const [eventType, matchers] of Object.entries(hooks)) {
          if (!Array.isArray(matchers)) {
            console.log(`  FAIL: hooks.${eventType} should be an array`);
            failures++;
            continue;
          }
          for (let i = 0; i < matchers.length; i++) {
            if (!matchers[i].matcher) {
              console.log(`  FAIL: hooks.${eventType}[${i}] missing 'matcher'`);
              failures++;
            }
            totalEntries++;
          }
        }
        console.log(`  OK: hooks.json (${Object.keys(hooks).length} event types, ${totalEntries} entries)`);
      }
    } catch (err) {
      console.log(`  FAIL: hooks.json invalid JSON: ${err.message}`);
      failures++;
    }
  }

  // Validate script files
  if (fs.existsSync(HOOKS_SCRIPTS_DIR)) {
    const validateDir = (dir, prefix) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          validateDir(fullPath, `${prefix}${entry.name}/`);
        } else if (entry.name.endsWith(".js")) {
          const code = fs.readFileSync(fullPath, "utf8");
          try {
            new vm.Script(code, { filename: fullPath });
            console.log(`  OK: ${prefix}${entry.name}`);
          } catch (err) {
            console.log(`  FAIL: ${prefix}${entry.name} -- ${err.message}`);
            failures++;
          }
        }
      }
    };
    validateDir(HOOKS_SCRIPTS_DIR, "hooks/scripts/");
  } else {
    console.log("  SKIP: hooks/scripts/ does not exist yet");
  }

  console.log(`\nHook validation complete. Failures: ${failures}`);
  if (failures > 0) process.exit(1);
}

main();
