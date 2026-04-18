#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const VERSION = "1.0.0";
const MANIFEST_NAME = ".ftitos-cc-manifest.json";

const COPY_MAP = [
  { src: "agents", dest: ".claude/agents" },
  { src: "skills", dest: ".claude/skills" },
  { src: "rules/common", dest: ".claude/rules" },
  { src: "rules/python", dest: ".claude/rules/python" },
  { src: "commands", dest: ".claude/commands" },
  { src: "hooks/scripts", dest: ".claude/hooks/scripts" },
];

const HOOKS_SRC = "hooks/hooks.json";
const SETTINGS_DEST = ".claude/settings.json";

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Usage: install.sh [options]

Options:
  --dry-run   Show what would be installed without making changes
  --force     Overwrite existing files (backs up originals first)
  -h, --help  Show this help message
`);
}

function repoRoot() {
  return path.dirname(__dirname);
}

function homeDir() {
  return os.homedir();
}

function getAllFiles(dir, base) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? path.join(base, entry.name) : entry.name;
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function backupFile(filePath) {
  const backupPath = filePath + ".bak." + Date.now();
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function copyDirectory(srcDir, destDir, opts) {
  const files = getAllFiles(srcDir, "");
  const installed = [];

  for (const relFile of files) {
    const srcFile = path.join(srcDir, relFile);
    const destFile = path.join(destDir, relFile);

    if (fs.existsSync(destFile) && !opts.force) {
      console.log(`  SKIP (exists): ${destFile}`);
      continue;
    }

    if (opts.dryRun) {
      console.log(`  WOULD COPY: ${relFile} -> ${destFile}`);
      installed.push(destFile);
      continue;
    }

    if (fs.existsSync(destFile) && opts.force) {
      const backup = backupFile(destFile);
      console.log(`  BACKUP: ${destFile} -> ${backup}`);
    }

    ensureDir(path.dirname(destFile));
    fs.copyFileSync(srcFile, destFile);
    console.log(`  INSTALLED: ${destFile}`);
    installed.push(destFile);
  }

  return installed;
}

function hookKey(eventType, matcher, command) {
  return `${eventType}::${matcher}::${command}`;
}

function mergeHooks(srcPath, destPath, opts) {
  if (!fs.existsSync(srcPath)) {
    console.log(`  SKIP (no hooks.json found): ${srcPath}`);
    return [];
  }

  const srcData = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const newHooks = srcData.hooks || {};

  let existingSettings = {};
  if (fs.existsSync(destPath)) {
    existingSettings = JSON.parse(fs.readFileSync(destPath, "utf8"));
  }
  const existingHooks = existingSettings.hooks || {};

  const existingKeys = new Set();
  for (const [eventType, matchers] of Object.entries(existingHooks)) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks || []) {
        existingKeys.add(hookKey(eventType, matcher.matcher, hook.command || ""));
      }
    }
  }

  let addedCount = 0;
  const mergedHooks = { ...existingHooks };

  for (const [eventType, matchers] of Object.entries(newHooks)) {
    if (!mergedHooks[eventType]) mergedHooks[eventType] = [];

    for (const matcherEntry of matchers) {
      for (const hook of matcherEntry.hooks || []) {
        const key = hookKey(eventType, matcherEntry.matcher, hook.command || "");
        if (!existingKeys.has(key)) {
          mergedHooks[eventType].push(matcherEntry);
          existingKeys.add(key);
          addedCount++;
          break; // add the whole matcher entry once
        }
      }
    }
  }

  if (addedCount === 0) {
    console.log("  HOOKS: All hooks already present in settings.json");
    return [];
  }

  const merged = { ...existingSettings, hooks: mergedHooks };

  if (opts.dryRun) {
    console.log(`  WOULD MERGE: ${addedCount} hook entries into ${destPath}`);
    return [destPath];
  }

  if (fs.existsSync(destPath)) {
    const backup = backupFile(destPath);
    console.log(`  BACKUP: ${destPath} -> ${backup}`);
  }

  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, JSON.stringify(merged, null, 2) + "\n");
  console.log(`  MERGED: ${addedCount} new hook entries into ${destPath}`);
  return [destPath];
}

function writeManifest(home, installedFiles) {
  const manifestPath = path.join(home, ".claude", MANIFEST_NAME);
  const manifest = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    files: installedFiles,
  };
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nManifest written to ${manifestPath}`);
}

function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const root = repoRoot();
  const home = homeDir();

  console.log(`Source:  ${root}`);
  console.log(`Target:  ${home}/.claude/`);
  if (opts.dryRun) console.log("Mode:    DRY RUN");
  if (opts.force) console.log("Mode:    FORCE (will overwrite + backup)");
  console.log("");

  const claudeDir = path.join(home, ".claude");
  if (!fs.existsSync(claudeDir)) {
    console.log("Creating ~/.claude/ directory...");
    if (!opts.dryRun) ensureDir(claudeDir);
  }

  const allInstalled = [];

  for (const mapping of COPY_MAP) {
    const srcDir = path.join(root, mapping.src);
    const destDir = path.join(home, mapping.dest);

    if (!fs.existsSync(srcDir)) {
      console.log(`\nSKIP (source missing): ${mapping.src}/`);
      continue;
    }

    console.log(`\n${mapping.src}/ -> ${mapping.dest}/`);
    const installed = copyDirectory(srcDir, destDir, opts);
    allInstalled.push(...installed);
  }

  console.log("\nMerging hooks...");
  const hooksSrc = path.join(root, HOOKS_SRC);
  const hooksDest = path.join(home, SETTINGS_DEST);
  const hookFiles = mergeHooks(hooksSrc, hooksDest, opts);
  allInstalled.push(...hookFiles);

  if (!opts.dryRun) {
    writeManifest(home, allInstalled);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Files installed: ${allInstalled.length}`);
  if (opts.dryRun) console.log("(dry run - no changes made)");
  console.log("Done.");
}

main();
