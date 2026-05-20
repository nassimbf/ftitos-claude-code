#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const VERSION = "2.0.0";
const MANIFEST_NAME = ".ftitos-cc-manifest.json";

const COPY_MAP = [
  { src: "agents", dest: ".claude/agents" },
  { src: "agents-ccg", dest: ".claude/agents/ccg" },
  { src: "rules", dest: ".claude/rules", exclude: ["python", "typescript"] },
  { src: "rules/python", dest: ".claude/rules/python" },
  { src: "rules/typescript", dest: ".claude/rules/typescript" },
  { src: "commands", dest: ".claude/commands", exclude: ["project"] },
  { src: "commands/project", dest: ".claude/commands/project" },
  { src: "hooks/scripts", dest: ".claude/scripts/hooks" },
];

const CORE_ONLY_MAP = [
  { src: "agents", dest: ".claude/agents" },
  { src: "rules", dest: ".claude/rules", exclude: ["python", "typescript"] },
  { src: "commands", dest: ".claude/commands", exclude: ["project"] },
  { src: "commands/project", dest: ".claude/commands/project" },
  { src: "hooks/scripts", dest: ".claude/scripts/hooks" },
];

const HOOKS_SRC = "hooks/hooks.json";
const SETTINGS_DEST = ".claude/settings.json";

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    coreOnly: args.includes("--core-only"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Usage: install.sh [options]

Options:
  --dry-run     Show what would be installed without making changes
  --force       Overwrite existing files (backs up originals first)
  --core-only   Install agents, rules, commands, hooks only (skip skills, CCG agents)
  -h, --help    Show this help message
`);
}

function repoRoot() {
  return path.dirname(__dirname);
}

function homeDir() {
  return os.homedir();
}

function getAllFiles(dir, base, exclude) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude && exclude.includes(entry.name)) continue;
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

function copyDirectory(srcDir, destDir, opts, exclude) {
  const files = getAllFiles(srcDir, "", exclude);
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
          break;
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
  const copyMap = opts.coreOnly ? CORE_ONLY_MAP : COPY_MAP;

  console.log(`ftitos-claude-code v${VERSION}`);
  console.log(`Source:  ${root}`);
  console.log(`Target:  ${home}/.claude/`);
  if (opts.dryRun) console.log("Mode:    DRY RUN");
  if (opts.force) console.log("Mode:    FORCE (will overwrite + backup)");
  if (opts.coreOnly) console.log("Mode:    CORE ONLY (skip skills, CCG agents)");
  console.log("");

  const claudeDir = path.join(home, ".claude");
  if (!fs.existsSync(claudeDir)) {
    console.log("Creating ~/.claude/ directory...");
    if (!opts.dryRun) ensureDir(claudeDir);
  }

  const allInstalled = [];

  for (const mapping of copyMap) {
    const srcDir = path.join(root, mapping.src);
    const destDir = path.join(home, mapping.dest);

    if (!fs.existsSync(srcDir)) {
      console.log(`\nSKIP (source missing): ${mapping.src}/`);
      continue;
    }

    console.log(`\n${mapping.src}/ -> ${mapping.dest}/`);
    const installed = copyDirectory(srcDir, destDir, opts, mapping.exclude);
    allInstalled.push(...installed);
  }

  // Skills: copy directories (each skill is a dir with SKILL.md)
  if (!opts.coreOnly) {
    const skillsSrc = path.join(root, "skills");
    const skillsDest = path.join(home, ".claude", "skills");
    if (fs.existsSync(skillsSrc)) {
      console.log(`\nskills/ -> .claude/skills/`);
      const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const srcSkill = path.join(skillsSrc, entry.name);
          const destSkill = path.join(skillsDest, entry.name);
          const installed = copyDirectory(srcSkill, destSkill, opts);
          allInstalled.push(...installed);
        } else if (entry.name === "TIER.md") {
          const srcFile = path.join(skillsSrc, "TIER.md");
          const destFile = path.join(skillsDest, "TIER.md");
          if (!fs.existsSync(destFile) || opts.force) {
            if (!opts.dryRun) {
              ensureDir(skillsDest);
              fs.copyFileSync(srcFile, destFile);
              console.log(`  INSTALLED: ${destFile}`);
            } else {
              console.log(`  WOULD COPY: TIER.md -> ${destFile}`);
            }
            allInstalled.push(destFile);
          }
        }
      }
    }
  }

  console.log("\nMerging hooks...");
  const hooksSrc = path.join(root, HOOKS_SRC);
  const hooksDest = path.join(home, SETTINGS_DEST);
  const hookFiles = mergeHooks(hooksSrc, hooksDest, opts);
  allInstalled.push(...hookFiles);

  if (!opts.dryRun) {
    writeManifest(home, allInstalled);

    // Auto-run doctor
    console.log("\nRunning health check...\n");
    try {
      require("child_process").execSync(
        `node "${path.join(root, "scripts", "doctor.js")}"`,
        { stdio: "inherit" }
      );
    } catch {
      console.log("\nDoctor found issues. Review warnings above.");
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Files installed: ${allInstalled.length}`);
  if (opts.dryRun) console.log("(dry run - no changes made)");
  console.log("Done.");
}

main();
