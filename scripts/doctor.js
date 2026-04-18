#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const STATUS = { GREEN: "GREEN", YELLOW: "YELLOW", RED: "RED" };
const LABELS = { GREEN: "[OK]", YELLOW: "[WARN]", RED: "[FAIL]" };

function check(name, fn) {
  try {
    const result = fn();
    console.log(`  ${LABELS[result.status]}  ${name}: ${result.message}`);
    return result.status;
  } catch (err) {
    console.log(`  ${LABELS[STATUS.RED]}  ${name}: ${err.message}`);
    return STATUS.RED;
  }
}

function countFiles(dir, filter) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (filter === "dirs") return entries.filter((e) => e.isDirectory()).length;
  return entries.filter((e) => e.isFile()).length;
}

function countFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) count++;
    else if (entry.isDirectory()) count += countFilesRecursive(path.join(dir, entry.name));
  }
  return count;
}

function main() {
  const home = os.homedir();
  const claudeDir = path.join(home, ".claude");

  console.log("ftitos-claude-code doctor\n");

  const results = [];

  // Node.js version
  results.push(
    check("Node.js version", () => {
      const version = process.versions.node;
      const major = parseInt(version.split(".")[0], 10);
      if (major >= 18) return { status: STATUS.GREEN, message: `v${version}` };
      return { status: STATUS.RED, message: `v${version} (requires >= 18)` };
    })
  );

  // Claude Code CLI
  results.push(
    check("Claude Code CLI", () => {
      try {
        const version = execSync("claude --version 2>/dev/null", { encoding: "utf8" }).trim();
        return { status: STATUS.GREEN, message: version || "installed" };
      } catch {
        return { status: STATUS.RED, message: "not found in PATH" };
      }
    })
  );

  // .claude directory
  results.push(
    check("~/.claude directory", () => {
      if (fs.existsSync(claudeDir)) return { status: STATUS.GREEN, message: "exists" };
      return { status: STATUS.RED, message: "missing" };
    })
  );

  // Agents
  results.push(
    check("Agents", () => {
      const dir = path.join(claudeDir, "agents");
      const count = countFiles(dir, "files");
      if (count >= 15) return { status: STATUS.GREEN, message: `${count} agents found` };
      if (count > 0) return { status: STATUS.YELLOW, message: `${count} agents (expected 15+)` };
      return { status: STATUS.RED, message: "no agents found" };
    })
  );

  // Skills
  results.push(
    check("Skills", () => {
      const dir = path.join(claudeDir, "skills");
      const count = countFiles(dir, "dirs");
      if (count >= 30) return { status: STATUS.GREEN, message: `${count} skill directories` };
      if (count > 0) return { status: STATUS.YELLOW, message: `${count} skills (expected 30+)` };
      return { status: STATUS.RED, message: "no skills found" };
    })
  );

  // Rules
  results.push(
    check("Rules", () => {
      const dir = path.join(claudeDir, "rules");
      const count = countFilesRecursive(dir);
      if (count >= 10) return { status: STATUS.GREEN, message: `${count} rule files` };
      if (count > 0) return { status: STATUS.YELLOW, message: `${count} rules (expected 10+)` };
      return { status: STATUS.RED, message: "no rules found" };
    })
  );

  // Hooks
  results.push(
    check("Hooks configured", () => {
      const candidates = ["settings.json", "settings.local.json"];
      let settings = null;
      let settingsFile = null;
      for (const name of candidates) {
        const p = path.join(claudeDir, name);
        if (fs.existsSync(p)) {
          const data = JSON.parse(fs.readFileSync(p, "utf8"));
          if (data.hooks && data.hooks.length > 0) {
            settings = data;
            settingsFile = name;
            break;
          }
          if (!settings) { settings = data; settingsFile = name; }
        }
      }
      if (!settings) return { status: STATUS.RED, message: "no settings file found" };
      const hooks = settings.hooks || [];
      if (hooks.length >= 15) return { status: STATUS.GREEN, message: `${hooks.length} hooks` };
      if (hooks.length > 0) return { status: STATUS.YELLOW, message: `${hooks.length} hooks (expected 15+)` };
      return { status: STATUS.RED, message: "no hooks in settings.json" };
    })
  );

  // MCP servers
  results.push(
    check("MCP servers", () => {
      const mcpPaths = [
        path.join(home, ".claude.json"),
        path.join(claudeDir, ".mcp.json"),
      ];
      for (const mcpPath of mcpPaths) {
        if (fs.existsSync(mcpPath)) {
          const data = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
          const servers = data.mcpServers || {};
          const count = Object.keys(servers).length;
          if (count >= 5) return { status: STATUS.GREEN, message: `${count} servers configured in ${path.basename(mcpPath)}` };
          if (count > 0) return { status: STATUS.YELLOW, message: `${count} servers (expected 5+)` };
        }
      }
      return { status: STATUS.YELLOW, message: "no MCP config found (.claude.json or .mcp.json)" };
    })
  );

  // Install manifest
  results.push(
    check("Install manifest", () => {
      const manifestPath = path.join(claudeDir, ".ftitos-cc-manifest.json");
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        return { status: STATUS.GREEN, message: `installed ${manifest.installedAt}` };
      }
      return { status: STATUS.YELLOW, message: "not installed via installer" };
    })
  );

  console.log("");

  const reds = results.filter((r) => r === STATUS.RED).length;
  const yellows = results.filter((r) => r === STATUS.YELLOW).length;

  if (reds > 0) {
    console.log(`Result: ${reds} critical issue(s) found. Fix RED items before using.`);
    process.exit(1);
  } else if (yellows > 0) {
    console.log(`Result: All critical checks pass. ${yellows} warning(s) to review.`);
    process.exit(0);
  } else {
    console.log("Result: All checks pass. System is healthy.");
    process.exit(0);
  }
}

main();
