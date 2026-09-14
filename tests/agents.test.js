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

// v4 asserted a ceiling of 8. The count was a proxy for context cost and wrong
// in both directions — it would reject a 30-token agent while an unbounded
// description rewrite on an existing one passed untouched. v5 removed the same
// cap on skills (c388e3f) in favour of pricing the surface; the agent cap was
// missed there. always-on-budget.js prices each file against a baseline and
// doctor.js enforces the 8,000-token ceiling, so the cost is measured rather
// than guessed at from a file count.
//
// What still has to hold: every agent must carry name + description frontmatter,
// because that is exactly what gets charged to the always-on budget. An agent
// missing it is invisible to the pricing tool and to the model.
function validateAgentDir(dir, label) {
  assert(fs.existsSync(dir), `${label}/ directory should exist`);

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    assert(files.length > 0, `${label}/ should have at least one agent`);

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8").trim();
      assert(content.length >= 10, `${label}/${file} should have meaningful content`);
      assert(
        /^---\r?\n[\s\S]*?\bname:\s*\S/.test(content),
        `${label}/${file} needs a name: in frontmatter`
      );
      assert(
        /^---\r?\n[\s\S]*?\bdescription:\s*\S/.test(content),
        `${label}/${file} needs a description: in frontmatter — it is what costs always-on budget`
      );
    }
  }
}

validateAgentDir(AGENTS_DIR, "agents");
assert(!fs.existsSync(AGENTS_CCG_DIR), "agents-ccg/ was removed in v4 and should not return");

if (failures > 0) {
  console.error(`\nagents.test.js: ${failures} failure(s)`);
  process.exit(1);
}
