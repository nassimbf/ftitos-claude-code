#!/usr/bin/env node
/**
 * Strategic Compact Suggester
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on PreToolUse to suggest manual compaction at logical intervals.
 *
 * Why manual over auto-compact:
 * - Auto-compact happens at arbitrary points, often mid-task
 * - Strategic compacting preserves context through logical phases
 * - Compact after exploration, before execution
 * - Compact after completing a milestone, before starting next
 */

const fs = require('fs');
const path = require('path');
const { getTempDir, writeFile, log } = require('./lib/utils');

async function main() {
  const sessionId = (process.env.CLAUDE_SESSION_ID || 'default').replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const rawThreshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  const threshold = Number.isFinite(rawThreshold) && rawThreshold > 0 && rawThreshold <= 10000
    ? rawThreshold
    : 50;

  let count = 1;

  try {
    const fd = fs.openSync(counterFile, 'a+');
    try {
      const buf = Buffer.alloc(64);
      const bytesRead = fs.readSync(fd, buf, 0, 64, 0);
      if (bytesRead > 0) {
        const parsed = parseInt(buf.toString('utf8', 0, bytesRead).trim(), 10);
        count = (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000000)
          ? parsed + 1
          : 1;
      }
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, String(count), 0);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    writeFile(counterFile, String(count));
  }

  if (count === threshold) {
    log(`[StrategicCompact] ${threshold} tool calls reached - consider /compact if transitioning phases`);
  }

  if (count > threshold && (count - threshold) % 25 === 0) {
    log(`[StrategicCompact] ${count} tool calls - good checkpoint for /compact if context is stale`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[StrategicCompact] Error:', err.message);
  process.exit(0);
});
