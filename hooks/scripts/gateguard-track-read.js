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

function getSessionKey(input) {
  const raw =
    (input && typeof input.session_id === 'string' && input.session_id) ||
    process.env.CLAUDE_SESSION_ID ||
    'shared';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'shared';
}

function getTrackingFilePath(sessionKey) {
  return path.join(getClaudeDir(), `.gateguard-reads-${sessionKey}`);
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
  const trackingFile = getTrackingFilePath(getSessionKey(input));

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
