#!/usr/bin/env node
/**
 * SessionStart Hook - Load previous context on new session
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs when a new Claude session starts. Loads the most recent session
 * summary into Claude's context via stdout, and reports available
 * sessions and learned skills.
 */

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  getProjectName,
  findFiles,
  ensureDir,
  readFile,
  stripAnsi,
  log
} = require('./lib/utils');

function normalizePath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

function dedupeRecentSessions(searchDirs) {
  const recentSessionsByName = new Map();

  for (const [dirIndex, dir] of searchDirs.entries()) {
    const matches = findFiles(dir, '*-session.tmp', { maxAge: 7 });

    for (const match of matches) {
      const basename = path.basename(match.path);
      const current = { ...match, basename, dirIndex };
      const existing = recentSessionsByName.get(basename);

      if (
        !existing
        || current.mtime > existing.mtime
        || (current.mtime === existing.mtime && current.dirIndex < existing.dirIndex)
      ) {
        recentSessionsByName.set(basename, current);
      }
    }
  }

  return Array.from(recentSessionsByName.values())
    .sort((left, right) => right.mtime - left.mtime || left.dirIndex - right.dirIndex);
}

function selectMatchingSession(sessions, cwd, currentProject) {
  if (sessions.length === 0) return null;

  const normalizedCwd = normalizePath(cwd);
  let projectMatch = null;
  let projectMatchContent = null;
  let fallbackSession = null;
  let fallbackContent = null;

  for (const session of sessions) {
    const content = readFile(session.path);
    if (!content) continue;

    if (!fallbackSession) {
      fallbackSession = session;
      fallbackContent = content;
    }

    const worktreeMatch = content.match(/\*\*Worktree:\*\*\s*(.+)$/m);
    const sessionWorktree = worktreeMatch ? worktreeMatch[1].trim() : '';

    if (sessionWorktree && normalizePath(sessionWorktree) === normalizedCwd) {
      return { session, content, matchReason: 'worktree' };
    }

    if (!projectMatch && currentProject) {
      const projectFieldMatch = content.match(/\*\*Project:\*\*\s*(.+)$/m);
      const sessionProject = projectFieldMatch ? projectFieldMatch[1].trim() : '';
      if (sessionProject && sessionProject === currentProject) {
        projectMatch = session;
        projectMatchContent = content;
      }
    }
  }

  if (projectMatch) {
    return { session: projectMatch, content: projectMatchContent, matchReason: 'project' };
  }

  if (fallbackSession) {
    return { session: fallbackSession, content: fallbackContent, matchReason: 'recency-fallback' };
  }

  log('[SessionStart] All session files were unreadable');
  return null;
}

function loadRecentCheckpoint() {
  try {
    const slug = getCheckpointSlug();
    const checkpointDir = path.join(
      process.env.HOME || '/tmp',
      '.claude', 'checkpoints', slug
    );
    if (!fs.existsSync(checkpointDir)) return null;

    const files = fs.readdirSync(checkpointDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestPath = path.join(checkpointDir, files[0]);
    const stat = fs.statSync(latestPath);
    const ageMs = Date.now() - stat.mtimeMs;
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    if (ageMs > TWO_HOURS) return null;

    const content = fs.readFileSync(latestPath, 'utf8');
    return `Context recovery (checkpoint from ${Math.round(ageMs / 60000)} minutes ago):\n${content}`;
  } catch {
    return null;
  }
}

function getCheckpointSlug() {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git remote get-url origin 2>/dev/null', {
      encoding: 'utf8', timeout: 3000
    }).trim();
    if (remote) {
      return remote
        .replace(/.*[/:]([\w.-]+\/[\w.-]+?)(\.git)?$/, '$1')
        .replace(/\//g, '-');
    }
  } catch { /* fallback */ }
  return path.basename(process.cwd());
}

async function main() {
  const sessionsDir = getSessionsDir();
  const learnedDir = getLearnedSkillsDir();
  const additionalContextParts = [];

  ensureDir(sessionsDir);
  ensureDir(learnedDir);

  const recentSessions = dedupeRecentSessions(getSessionSearchDirs());

  if (recentSessions.length > 0) {
    log(`[SessionStart] Found ${recentSessions.length} recent session(s)`);

    const cwd = process.cwd();
    const currentProject = getProjectName() || '';
    const result = selectMatchingSession(recentSessions, cwd, currentProject);

    if (result) {
      log(`[SessionStart] Selected: ${result.session.path} (match: ${result.matchReason})`);
      const content = stripAnsi(result.content);
      if (content && !content.includes('[Session context goes here]')) {
        additionalContextParts.push(`Previous session summary:\n${content}`);
      }
    } else {
      log('[SessionStart] No matching session found');
    }
  }

  const learnedSkills = findFiles(learnedDir, '*.md');
  if (learnedSkills.length > 0) {
    log(`[SessionStart] ${learnedSkills.length} learned skill(s) available in ${learnedDir}`);
  }

  const checkpointContext = loadRecentCheckpoint();
  if (checkpointContext) {
    additionalContextParts.push(checkpointContext);
    log('[SessionStart] Checkpoint recovery context loaded');
  }

  await writeSessionStartPayload(additionalContextParts.join('\n\n'));
}

function writeSessionStartPayload(additionalContext) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const payload = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext
      }
    });

    const handleError = (err) => {
      if (settled) return;
      settled = true;
      if (err) log(`[SessionStart] stdout write error: ${err.message}`);
      reject(err || new Error('stdout stream error'));
    };

    process.stdout.once('error', handleError);
    process.stdout.write(payload, (err) => {
      process.stdout.removeListener('error', handleError);
      if (settled) return;
      settled = true;
      if (err) {
        log(`[SessionStart] stdout write error: ${err.message}`);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

main().catch(err => {
  console.error('[SessionStart] Error:', err.message);
  process.exitCode = 0;
});
