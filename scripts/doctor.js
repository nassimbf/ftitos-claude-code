#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const STATUS = { GREEN: "GREEN", YELLOW: "YELLOW", RED: "RED" };
const LABELS = { GREEN: "[OK]", YELLOW: "[WARN]", RED: "[FAIL]" };

const TIER_1_SKILLS = [
  "tdd-workflow", "writing-plans", "executing-plans",
  "subagent-driven-development", "security-review", "incremental-implementation",
  "product-lens", "continuous-learning-v2", "context-engineering",
];

const TIER_2_SKILLS = [
  "code-review", "verification-loop", "safety-guard",
  "dispatching-parallel-agents", "spec-driven-development", "git-workflow",
  "python-testing", "codebase-onboarding", "api-design", "backend-patterns",
  "docker-patterns", "browser-qa", "e2e-testing", "canary-watch", "database-migrations",
];

const PIPELINE_PHASES = [
  "validate", "specify", "plan", "analyze", "build", "review", "test", "ship", "monitor",
];

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

  console.log("ftitos-claude-code v2.0 doctor\n");

  const results = [];

  // 1. Node.js version
  results.push(
    check("Node.js version", () => {
      const version = process.versions.node;
      const major = parseInt(version.split(".")[0], 10);
      if (major >= 18) return { status: STATUS.GREEN, message: `v${version}` };
      return { status: STATUS.RED, message: `v${version} (requires >= 18)` };
    })
  );

  // 2. Claude Code CLI
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

  // 3. .claude directory
  results.push(
    check("~/.claude directory", () => {
      if (fs.existsSync(claudeDir)) return { status: STATUS.GREEN, message: "exists" };
      return { status: STATUS.RED, message: "missing" };
    })
  );

  // 4. Agents (18 base + 5 CCG = 23)
  results.push(
    check("Agents", () => {
      const baseDir = path.join(claudeDir, "agents");
      const ccgDir = path.join(claudeDir, "agents", "ccg");
      const baseCount = countFiles(baseDir, "files");
      const ccgCount = fs.existsSync(ccgDir) ? countFiles(ccgDir, "files") : 0;
      const total = baseCount + ccgCount;
      if (total >= 23) return { status: STATUS.GREEN, message: `${total} agents (${baseCount} base + ${ccgCount} CCG)` };
      if (total > 0) return { status: STATUS.YELLOW, message: `${total} agents (expected 23+)` };
      return { status: STATUS.RED, message: "no agents found" };
    })
  );

  // 5. TIER 1 Skills
  results.push(
    check("TIER 1 Skills", () => {
      const skillsDir = path.join(claudeDir, "skills");
      const missing = TIER_1_SKILLS.filter(
        (s) => !fs.existsSync(path.join(skillsDir, s, "SKILL.md"))
      );
      if (missing.length === 0) return { status: STATUS.GREEN, message: `${TIER_1_SKILLS.length}/9 present` };
      return { status: STATUS.RED, message: `missing: ${missing.join(", ")}` };
    })
  );

  // 6. TIER 2 Skills
  results.push(
    check("TIER 2 Skills", () => {
      const skillsDir = path.join(claudeDir, "skills");
      const missing = TIER_2_SKILLS.filter(
        (s) => !fs.existsSync(path.join(skillsDir, s, "SKILL.md"))
      );
      if (missing.length === 0) return { status: STATUS.GREEN, message: `${TIER_2_SKILLS.length}/15 present` };
      if (missing.length <= 3) return { status: STATUS.YELLOW, message: `missing ${missing.length}: ${missing.join(", ")}` };
      return { status: STATUS.RED, message: `missing ${missing.length}: ${missing.join(", ")}` };
    })
  );

  // 7. Rules
  results.push(
    check("Rules", () => {
      const dir = path.join(claudeDir, "rules");
      const count = countFilesRecursive(dir);
      if (count >= 14) return { status: STATUS.GREEN, message: `${count} rule files` };
      if (count > 0) return { status: STATUS.YELLOW, message: `${count} rules (expected 14+)` };
      return { status: STATUS.RED, message: "no rules found" };
    })
  );

  // 8. GateGuard pair
  results.push(
    check("GateGuard hooks", () => {
      const scriptsDir = path.join(claudeDir, "scripts", "hooks");
      const preEdit = fs.existsSync(path.join(scriptsDir, "gateguard-pre-edit.js"));
      const trackRead = fs.existsSync(path.join(scriptsDir, "gateguard-track-read.js"));
      if (preEdit && trackRead) return { status: STATUS.GREEN, message: "both scripts present" };
      if (preEdit || trackRead) return { status: STATUS.YELLOW, message: "only one GateGuard script found" };
      return { status: STATUS.RED, message: "GateGuard scripts missing" };
    })
  );

  // 9. Pipeline phases
  results.push(
    check("Pipeline phases", () => {
      const repoRoot = path.dirname(__dirname);
      const phasesDir = path.join(repoRoot, "pipeline", "phases");
      if (!fs.existsSync(phasesDir)) return { status: STATUS.YELLOW, message: "pipeline/phases/ not found in repo" };
      const missing = PIPELINE_PHASES.filter(
        (p) => !fs.existsSync(path.join(phasesDir, `${p}.md`))
      );
      if (missing.length === 0) return { status: STATUS.GREEN, message: `${PIPELINE_PHASES.length}/9 phases` };
      return { status: STATUS.RED, message: `missing: ${missing.join(", ")}` };
    })
  );

  // 10. Hooks configured
  results.push(
    check("Hooks configured", () => {
      const candidates = ["settings.json", "settings.local.json"];
      for (const name of candidates) {
        const p = path.join(claudeDir, name);
        if (fs.existsSync(p)) {
          const data = JSON.parse(fs.readFileSync(p, "utf8"));
          const hooks = data.hooks || {};
          let count = 0;
          if (typeof hooks === "object" && !Array.isArray(hooks)) {
            for (const entries of Object.values(hooks)) {
              if (Array.isArray(entries)) count += entries.length;
            }
          }
          if (count >= 6) return { status: STATUS.GREEN, message: `${count} hooks in ${name}` };
          if (count > 0) return { status: STATUS.YELLOW, message: `${count} hooks (expected 6+)` };
        }
      }
      return { status: STATUS.RED, message: "no hooks in settings" };
    })
  );

  // 11. MCP servers
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
          if (count >= 3) return { status: STATUS.GREEN, message: `${count} servers in ${path.basename(mcpPath)}` };
          if (count > 0) return { status: STATUS.YELLOW, message: `${count} servers (expected 3+)` };
        }
      }
      return { status: STATUS.YELLOW, message: "no MCP config found" };
    })
  );

  // 12. Install manifest
  results.push(
    check("Install manifest", () => {
      const manifestPath = path.join(claudeDir, ".ftitos-cc-manifest.json");
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        return { status: STATUS.GREEN, message: `v${manifest.version} installed ${manifest.installedAt}` };
      }
      return { status: STATUS.YELLOW, message: "not installed via installer" };
    })
  );

  console.log("");

  const reds = results.filter((r) => r === STATUS.RED).length;
  const yellows = results.filter((r) => r === STATUS.YELLOW).length;
  const greens = results.filter((r) => r === STATUS.GREEN).length;

  console.log(`Result: ${greens} OK, ${yellows} warnings, ${reds} failures`);

  if (reds > 0) {
    console.log("Fix RED items before using.");
    process.exit(1);
  } else if (yellows > 0) {
    console.log("All critical checks pass. Review warnings above.");
    process.exit(0);
  } else {
    console.log("All 12 checks pass. System is healthy.");
    process.exit(0);
  }
}

main();
