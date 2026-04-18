#!/usr/bin/env node
/**
 * Unified Brain PreToolUse Hook
 *
 * Fires before Grep/Glob to inject knowledge from brain systems:
 * - GitNexus: code structure (callers, callees, processes)
 * - Graphify: graph report reminder
 *
 * Fast path: only GitNexus augment runs (BM25, <200ms warm).
 * Graphify injects static reminders only (zero latency).
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

  let toolInput;
  try {
    const parsed = JSON.parse(input);
    toolInput = parsed.tool_input || {};
  } catch {
    process.exit(0);
  }

  const pattern = toolInput.pattern || toolInput.command || '';
  if (!pattern || pattern.length < 2) {
    process.exit(0);
  }

  const contextParts = [];

  // GitNexus augment (fast BM25 search)
  try {
    const result = execSync(
      `gitnexus augment "${pattern.replace(/"/g, '\\"')}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 3000 }
    ).trim();
    if (result && result.length > 10) {
      contextParts.push(`[GitNexus] Code structure context:\n${result.slice(0, 1500)}`);
    }
  } catch {
    // GitNexus not indexed for this repo — skip
  }

  // Graphify graph report reminder (zero latency)
  const graphReport = path.join(process.cwd(), 'graphify-out', 'GRAPH_REPORT.md');
  if (fs.existsSync(graphReport)) {
    contextParts.push(
      '[Graphify] Knowledge graph exists. Read graphify-out/GRAPH_REPORT.md for community structure before searching raw files.'
    );
  }

  if (contextParts.length > 0) {
    const payload = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: contextParts.join('\n\n'),
      },
    });
    process.stdout.write(payload);
  }

  process.exit(0);
}

main();
