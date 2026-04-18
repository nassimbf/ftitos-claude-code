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

function getTrackingFilePath() {
  return path.join(getClaudeDir(), `.gateguard-reads-${process.ppid}`);
}

function hasBeenRead(normalizedPath) {
  const trackingFile = getTrackingFilePath();
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

  if (!hasBeenRead(normalizedPath)) {
    log(`[GateGuard] Blocked edit to unread file: ${normalizedPath}`);
    output(BLOCK_DECISION);
    process.exit(0);
  }

  output({});
  process.exit(0);
}

main();
