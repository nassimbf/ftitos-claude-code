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
    console.log("No install manifest found. Nothing to uninstall.");
    console.log("If you installed manually, remove files from ~/.claude/ yourself.");
    process.exit(0);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const files = manifest.files || [];

  console.log(`Uninstalling ftitos-claude-code v${manifest.version}...`);
  console.log(`Installed: ${manifest.installedAt}`);
  console.log(`Files to remove: ${files.length}\n`);

  let removed = 0;
  let skipped = 0;

  for (const filePath of files) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  REMOVED: ${filePath}`);
      removed++;
    } else {
      console.log(`  SKIP (already gone): ${filePath}`);
      skipped++;
    }
  }

  fs.unlinkSync(manifestPath);
  console.log(`  REMOVED: ${manifestPath}`);

  console.log(`\n--- Summary ---`);
  console.log(`Removed: ${removed}`);
  console.log(`Skipped: ${skipped}`);
  console.log("Done. Empty directories may remain — remove manually if desired.");
}

main();
