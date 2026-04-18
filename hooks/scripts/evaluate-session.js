#!/usr/bin/env node
/**
 * Continuous Learning - Session Evaluator
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on SessionEnd hook to extract reusable patterns from Claude Code sessions.
 * Reads transcript_path from stdin JSON (Claude Code hook input).
 */

const path = require('path');
const fs = require('fs');
const {
  getLearnedSkillsDir,
  ensureDir,
  readFile,
  countInFile,
  log
} = require('./lib/utils');

const MAX_STDIN = 1024 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    const remaining = MAX_STDIN - stdinData.length;
    stdinData += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  main().catch(err => {
    console.error('[ContinuousLearning] Error:', err.message);
    process.exit(0);
  });
});

async function main() {
  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    transcriptPath = input.transcript_path;
  } catch {
    transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
  }

  const minSessionLength = 10;
  const learnedSkillsPath = getLearnedSkillsDir();

  ensureDir(learnedSkillsPath);

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    process.exit(0);
  }

  const messageCount = countInFile(transcriptPath, /"type"\s*:\s*"user"/g);

  if (messageCount < minSessionLength) {
    log(`[ContinuousLearning] Session too short (${messageCount} messages), skipping`);
    process.exit(0);
  }

  log(`[ContinuousLearning] Session has ${messageCount} messages - evaluate for extractable patterns`);
  log(`[ContinuousLearning] Save learned skills to: ${learnedSkillsPath}`);

  process.exit(0);
}
