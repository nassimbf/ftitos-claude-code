#!/usr/bin/env node
/**
 * PostToolUse Hook: GateGuard — track Read tool calls.
 * Records each file path Claude reads into a session-specific tracking file.
 * The companion hook gateguard-pre-edit.js checks this list before allowing edits.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinJson, getClaudeDir, log } = require('./lib/utils');

const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

function getTrackingFilePath() {
  return path.join(getClaudeDir(), `.gateguard-reads-${process.ppid}`);
}

function isStale(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs > SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

async function main() {
  const input = await readStdinJson();
  const rawPath = input?.tool_input?.file_path;

  if (!rawPath) {
    process.exit(0);
  }

  const normalizedPath = path.resolve(rawPath);
  const trackingFile = getTrackingFilePath();

  if (fs.existsSync(trackingFile) && isStale(trackingFile)) {
    fs.unlinkSync(trackingFile);
  }

  try {
    fs.appendFileSync(trackingFile, normalizedPath + '\n', 'utf8');
  } catch (err) {
    log(`[GateGuard] Failed to record read for ${normalizedPath}: ${err.message}`);
  }

  process.exit(0);
}

main();
