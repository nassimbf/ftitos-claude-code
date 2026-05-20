#!/usr/bin/env node
/**
 * PreToolUse Hook: GateGuard — block edits to files that have not been Read first.
 * New file creation (Write to a non-existent path) is always allowed.
 * Only edits/writes to existing files require a prior Read in this session.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readStdinJson, getClaudeDir, output, log } = require('./lib/utils');

const BLOCK_DECISION = {
  decision: 'block',
  reason: 'GateGuard: You must Read this file before editing it. This prevents blind edits based on assumptions.',
};

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

function hasBeenRead(trackingFile, normalizedPath) {
  if (!fs.existsSync(trackingFile)) return false;
  try {
    const contents = fs.readFileSync(trackingFile, 'utf8');
    return contents.split('\n').includes(normalizedPath);
  } catch {
    return false;
  }
}

async function main() {
  const input = await readStdinJson();
  const rawPath = input?.tool_input?.file_path;

  if (!rawPath) {
    output({});
    process.exit(0);
  }

  const normalizedPath = path.resolve(rawPath);

  if (!fs.existsSync(normalizedPath)) {
    output({});
    process.exit(0);
  }

  const trackingFile = getTrackingFilePath(getSessionKey(input));
  if (!hasBeenRead(trackingFile, normalizedPath)) {
    log(`[GateGuard] Blocked edit to unread file: ${normalizedPath}`);
    output(BLOCK_DECISION);
    process.exit(0);
  }

  output({});
  process.exit(0);
}

main();
