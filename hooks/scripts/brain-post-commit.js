#!/usr/bin/env node
/**
 * Brain PostToolUse Hook — Staleness Monitor
 *
 * After git commit/merge/rebase/pull, checks if GitNexus index
 * and Graphify graph are stale and warns if so.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  let input = '';
  try {
    input = fs.readFileSync('/dev/stdin', 'utf8');
  } catch {
    process.exit(0);
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = (parsed.tool_input || {}).command || '';
  const isGitMutation = /git\s+(commit|merge|rebase|cherry-pick|pull)\b/.test(command);
  if (!isGitMutation) {
    process.exit(0);
  }

  const exitCode = (parsed.tool_result || {}).exitCode;
  if (exitCode !== 0 && exitCode !== undefined) {
    process.exit(0);
  }

  const warnings = [];

  // Check GitNexus staleness
  const metaPath = path.join(process.cwd(), '.gitnexus', 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const head = execSync('git rev-parse HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
      if (meta.lastCommit && meta.lastCommit !== head) {
        const behind = execSync(
          `git rev-list --count ${meta.lastCommit}..HEAD 2>/dev/null`,
          { encoding: 'utf8' }
        ).trim();
        warnings.push(
          `[GitNexus] Index is ${behind} commit(s) behind HEAD. Run: gitnexus analyze`
        );
      }
    } catch { /* skip */ }
  }

  // Check Graphify staleness
  const manifestPath = path.join(process.cwd(), 'graphify-out', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const stat = fs.statSync(manifestPath);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      if (ageHours > 1) {
        warnings.push(
          `[Graphify] Graph is ${Math.round(ageHours)}h old. Run: graphify build --update`
        );
      }
    } catch { /* skip */ }
  }

  if (warnings.length > 0) {
    const payload = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `Brain staleness warning:\n${warnings.join('\n')}`,
      },
    });
    process.stdout.write(payload);
  }

  process.exit(0);
}

main();
