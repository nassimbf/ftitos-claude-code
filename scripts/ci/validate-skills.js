#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.resolve(__dirname, "..", "..", "skills");

function main() {
  console.log("Validating skills...\n");

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error("FAIL: skills/ directory does not exist");
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  if (dirs.length === 0) {
    console.error("FAIL: no skill directories found in skills/");
    process.exit(1);
  }

  let failures = 0;

  for (const dir of dirs) {
    const skillMd = path.join(SKILLS_DIR, dir.name, "SKILL.md");

    if (!fs.existsSync(skillMd)) {
      console.log(`  FAIL: skills/${dir.name}/ missing SKILL.md`);
      failures++;
      continue;
    }

    const content = fs.readFileSync(skillMd, "utf8");
    const hasFrontmatter = /^---\s*\n[\s\S]*?\n---/.test(content);

    if (!hasFrontmatter) {
      console.log(`  FAIL: skills/${dir.name}/SKILL.md missing frontmatter`);
      failures++;
      continue;
    }

    console.log(`  OK: skills/${dir.name}/`);
  }

  console.log(`\nSkills validated: ${dirs.length}, Failures: ${failures}`);

  if (failures > 0) process.exit(1);
}

main();
