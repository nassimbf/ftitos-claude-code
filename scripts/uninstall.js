#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const MANIFEST_NAME = ".ftitos-cc-manifest.json";

function main() {
  const home = os.homedir();
  const manifestPath = path.join(home, ".claude", MANIFEST_NAME);

  if (!fs.existsSync(manifestPath)) {
    console.error("No install manifest found at", manifestPath);
    console.error("Cannot uninstall without a manifest. Was ftitos-claude-code installed?");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const files = manifest.files || [];

  console.log(`ftitos-claude-code uninstaller`);
  console.log(`Installed at: ${manifest.installedAt}`);
  console.log(`Files to remove: ${files.length}`);
  console.log("");

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("Mode: DRY RUN\n");

  let removed = 0;
  let skipped = 0;
  const emptyDirs = new Set();

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP (already gone): ${filePath}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  WOULD REMOVE: ${filePath}`);
    } else {
      fs.unlinkSync(filePath);
      console.log(`  REMOVED: ${filePath}`);
      emptyDirs.add(path.dirname(filePath));
    }
    removed++;
  }

  if (!dryRun) {
    const sortedDirs = Array.from(emptyDirs).sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
      try {
        const entries = fs.readdirSync(dir);
        if (entries.length === 0) {
          fs.rmdirSync(dir);
          console.log(`  RMDIR: ${dir}`);
        }
      } catch {
        // directory may already be removed
      }
    }

    fs.unlinkSync(manifestPath);
    console.log(`  REMOVED: ${manifestPath}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Removed: ${removed}`);
  console.log(`Skipped: ${skipped}`);
  if (dryRun) console.log("(dry run - no changes made)");
  console.log("Done.");
}

main();
