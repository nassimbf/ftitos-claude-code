#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

assert(fs.existsSync(SKILLS_DIR), "skills/ directory should exist");

if (fs.existsSync(SKILLS_DIR)) {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory());

  assert(skillDirs.length > 0, "skills/ should contain at least one skill");

  // v4 capped the COUNT at 8. That counts things instead of measuring the
  // resource: it blocked a 66-token skill while a description growing by 400
  // tokens passed unnoticed. What is scarce is always-on context, so v5 prices
  // it directly — scripts/ci/always-on-budget.js, against a recorded baseline.
  // The count is left unasserted on purpose; if eleven cheap skills fit the
  // budget, eleven skills is the right number.
  {
    const res = spawnSync(
      process.execPath,
      [path.join(__dirname, "..", "scripts", "ci", "always-on-budget.js")],
      { encoding: "utf8" }
    );
    assert(
      res.status === 0,
      `always-on budget exceeded:\n${res.stderr || res.stdout}`
    );
  }

  for (const dir of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, dir.name);
    const skillMdPath = path.join(skillPath, "SKILL.md");

    assert(fs.existsSync(skillMdPath), `skills/${dir.name}/ should have a SKILL.md`);

    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, "utf8");

      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      assert(frontmatterMatch, `skills/${dir.name}/SKILL.md should have YAML frontmatter`);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        assert(
          /^name:\s*.+/m.test(frontmatter),
          `skills/${dir.name}/SKILL.md should have a 'name' field`
        );
        assert(
          /^description:\s*.+/m.test(frontmatter),
          `skills/${dir.name}/SKILL.md should have a 'description' field`
        );
      }
    }
  }

  // Verify TIER.md exists
  assert(
    fs.existsSync(path.join(SKILLS_DIR, "TIER.md")),
    "skills/TIER.md should exist"
  );
}

if (failures > 0) {
  console.error(`\nskills.test.js: ${failures} failure(s)`);
  process.exit(1);
}
