#!/usr/bin/env node
/**
 * PreCompact Hook - Save state before context compaction
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs before Claude compacts context, giving you a chance to
 * preserve important state that might get lost in summarization.
 */

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getDateTimeString,
  getTimeString,
  findFiles,
  ensureDir,
  appendFile,
  log
} = require('./lib/utils');

function safeExec(cmd) {
  try {
    return require('child_process')
      .execSync(cmd, { encoding: 'utf8', timeout: 3000 })
      .trim();
  } catch {
    return '';
  }
}

function getProjectSlug() {
  try {
    const remote = safeExec('git remote get-url origin 2>/dev/null');
    if (remote) {
      return remote
        .replace(/.*[/:]([\w.-]+\/[\w.-]+?)(\.git)?$/, '$1')
        .replace(/\//g, '-');
    }
  } catch { /* fallback */ }
  return path.basename(process.cwd());
}

function readManifestPhase() {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), '.project', 'manifest.json'), 'utf8')
    );
    const sprint = manifest.sprint || {};
    const phases = ['validate', 'plan', 'build', 'review', 'test', 'ship', 'monitor'];
    for (const p of phases.reverse()) {
      if (sprint[p] === 'in_progress') return `${p.toUpperCase()} (in progress)`;
      if (sprint[p] === 'done') return `${p.toUpperCase()} (done)`;
    }
    return 'not started';
  } catch {
    return 'no manifest';
  }
}

function saveCheckpoint(timestamp) {
  try {
    const slug = getProjectSlug();
    const checkpointDir = path.join(
      process.env.HOME || '/tmp',
      '.claude', 'checkpoints', slug
    );
    ensureDir(checkpointDir);

    const branch = safeExec('git branch --show-current 2>/dev/null') || 'unknown';
    const recentCommits = safeExec('git log --oneline -5 2>/dev/null') || 'no git';
    const modifiedFiles = safeExec('git diff --name-only HEAD 2>/dev/null') || 'none';
    const manifestState = readManifestPhase();

    const content = [
      `# Checkpoint — ${timestamp}`,
      ``,
      `**Branch:** ${branch}`,
      `**Sprint Phase:** ${manifestState}`,
      ``,
      `## Recent Commits`,
      '```',
      recentCommits,
      '```',
      ``,
      `## Modified Files (uncommitted)`,
      '```',
      modifiedFiles,
      '```',
      ``,
      `## Recovery Instructions`,
      `This checkpoint was auto-saved before context compaction.`,
      `If you lost context, read this file to recover your working state.`,
    ].join('\n');

    const filename = timestamp.replace(/[^0-9T-]/g, '') + '.md';
    const filepath = path.join(checkpointDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');

    // Keep only last 10 checkpoints per project
    const existing = fs.readdirSync(checkpointDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    for (const old of existing.slice(10)) {
      try { fs.unlinkSync(path.join(checkpointDir, old)); } catch { /* ignore */ }
    }

    log(`[PreCompact] Checkpoint saved: ${filepath}`);
  } catch (err) {
    log(`[PreCompact] Checkpoint save failed: ${err.message}`);
  }
}

async function main() {
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');

  ensureDir(sessionsDir);

  const timestamp = getDateTimeString();
  appendFile(compactionLog, `[${timestamp}] Context compaction triggered\n`);

  const sessions = findFiles(sessionsDir, '*-session.tmp');
  if (sessions.length > 0) {
    const activeSession = sessions[0].path;
    const timeStr = getTimeString();
    appendFile(activeSession, `\n---\n**[Compaction occurred at ${timeStr}]** - Context was summarized\n`);
  }

  saveCheckpoint(timestamp);

  log('[PreCompact] State saved before compaction');
  process.exit(0);
}

main().catch(err => {
  console.error('[PreCompact] Error:', err.message);
  process.exit(0);
});
