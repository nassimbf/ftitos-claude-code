#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

// Test: skills directory exists
assert(fs.existsSync(SKILLS_DIR), "skills/ directory should exist");

if (fs.existsSync(SKILLS_DIR)) {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory());

  // Test: at least some skills exist
  assert(skillDirs.length > 0, "skills/ should contain at least one skill directory");

  for (const dir of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, dir.name);
    const skillMdPath = path.join(skillPath, "SKILL.md");

    // Test: each skill directory has SKILL.md
    assert(fs.existsSync(skillMdPath), `skills/${dir.name}/ should have a SKILL.md`);

    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, "utf8");

      // Test: SKILL.md has frontmatter with name
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      assert(frontmatterMatch, `skills/${dir.name}/SKILL.md should have YAML frontmatter (--- ... ---)`);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        assert(
          /^name:\s*.+/m.test(frontmatter),
          `skills/${dir.name}/SKILL.md frontmatter should have a 'name' field`
        );
        assert(
          /^description:\s*.+/m.test(frontmatter),
          `skills/${dir.name}/SKILL.md frontmatter should have a 'description' field`
        );
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nskills.test.js: ${failures} failure(s)`);
  process.exit(1);
}
