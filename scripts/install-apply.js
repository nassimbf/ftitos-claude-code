#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// Read from the VERSION file rather than a literal. Hardcoding it meant the
// installer stamped every manifest "2.0.0" while the repo moved to 4.0.0, and
// doctor's version-match check then failed against an install that was current.
const VERSION = fs.readFileSync(path.join(__dirname, "..", "VERSION"), "utf8").trim();
const MANIFEST_NAME = ".ftitos-cc-manifest.json";

const COPY_MAP = [
  { src: "agents", dest: ".claude/agents" },
  { src: "agents-ccg", dest: ".claude/agents/ccg" },
  { src: "rules", dest: ".claude/rules", exclude: ["python", "typescript"] },
  { src: "rules/python", dest: ".claude/rules/python" },
  { src: "rules/typescript", dest: ".claude/rules/typescript" },
  { src: "hooks/scripts", dest: ".claude/scripts/hooks" },
];

const CORE_ONLY_MAP = [
  { src: "agents", dest: ".claude/agents" },
  { src: "rules", dest: ".claude/rules", exclude: ["python", "typescript"] },
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

// "Already present" and "present but out of date" are different facts, and
// conflating them is how a hook fixed HERE never reaches ~/.claude. On
// 2026-09-14 the live cc-safety-net.js was several fixes behind this repo and
// twice blocked legitimate work while the repo copy had been correct all along.
// --force overwrites everything including a user's own edits, which is too blunt
// to reach for routinely, so nobody did.
//
// Comparing content splits the cases: identical is genuinely nothing to do,
// different means the repo has something the install does not. Stale files are
// updated and backed up first, so a local edit is recoverable.
function sameContent(a, b) {
  try {
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false; // unreadable — treat as different and let the copy decide
  }
}

function copyDirectory(srcDir, destDir, opts, exclude) {
  const files = getAllFiles(srcDir, "", exclude);
  const installed = [];

  for (const relFile of files) {
    const srcFile = path.join(srcDir, relFile);
    const destFile = path.join(destDir, relFile);
    const exists = fs.existsSync(destFile);
    const stale = exists && !sameContent(srcFile, destFile);

    if (exists && !stale) {
      console.log(`  SKIP (identical): ${destFile}`);
      continue;
    }

    if (opts.dryRun) {
      console.log(`  ${stale ? "WOULD UPDATE (stale)" : "WOULD COPY"}: ${relFile} -> ${destFile}`);
      installed.push(destFile);
      continue;
    }

    if (exists) {
      const backup = backupFile(destFile);
      console.log(`  BACKUP: ${destFile} -> ${backup}`);
    }

    ensureDir(path.dirname(destFile));
    fs.copyFileSync(srcFile, destFile);
    console.log(`  ${stale ? "UPDATED (was stale)" : "INSTALLED"}: ${destFile}`);
    installed.push(destFile);
  }

  return installed;
}

// `node "$HOME/.claude/scripts/hooks/x.js"` and
// `node "/Users/me/.claude/scripts/hooks/x.js"` are the same registration, but
// as raw strings they are not equal, so dedup missed and every install added a
// second copy of a hook already present. That is the v4 duplicate-hooks bug
// (1f4fafc: "8 hooks registered twice, so every edit ran GateGuard and wrote a
// backup twice") returning by a different route — observed again 2026-09-14
// when an install produced 9 duplicates.
//
// Comparing the resolved path makes the two forms one key. Quotes are dropped
// too, since quoting is a shell detail and not part of the identity.
function normalizeHookCommand(command) {
  return String(command || "")
    .replace(/\$\{HOME\}|\$HOME\b/g, os.homedir())
    .replace(/(^|\s)~(?=\/)/g, `$1${os.homedir()}`)
    .replace(/["']/g, "")
    .trim();
}

function hookKey(eventType, matcher, command) {
  return `${eventType}::${matcher}::${normalizeHookCommand(command)}`;
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
