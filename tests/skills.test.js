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

assert(fs.existsSync(SKILLS_DIR), "skills/ directory should exist");

if (fs.existsSync(SKILLS_DIR)) {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory());

  // v4 asserts a ceiling. Claude Code scans every skill's description on every session,
  // so an unused skill is a permanent tax — growth is the regression to catch.
  const MAX_SKILLS = 8;
  assert(skillDirs.length > 0, "skills/ should contain at least one skill");
  assert(
    skillDirs.length <= MAX_SKILLS,
    `skills/ should ship at most ${MAX_SKILLS} skills (found ${skillDirs.length}) — see skills/TIER.md admission criteria`
  );

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
