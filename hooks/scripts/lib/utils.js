/**
 * Cross-platform utility functions for Claude Code hooks and scripts
 * Works on Windows, macOS, and Linux — zero external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const SESSION_DATA_DIR_NAME = 'session-data';
const LEGACY_SESSIONS_DIR_NAME = 'sessions';
const WINDOWS_RESERVED_SESSION_IDS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

function getHomeDir() {
  return os.homedir();
}

function getClaudeDir() {
  return path.join(getHomeDir(), '.claude');
}

function getSessionsDir() {
  return path.join(getClaudeDir(), SESSION_DATA_DIR_NAME);
}

function getLegacySessionsDir() {
  return path.join(getClaudeDir(), LEGACY_SESSIONS_DIR_NAME);
}

function getSessionSearchDirs() {
  return Array.from(new Set([getSessionsDir(), getLegacySessionsDir()]));
}

function getLearnedSkillsDir() {
  return path.join(getClaudeDir(), 'skills', 'learned');
}

function getTempDir() {
  return os.tmpdir();
}

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw new Error(`Failed to create directory '${dirPath}': ${err.message}`);
    }
  }
  return dirPath;
}

function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getGitRepoName() {
  const result = runCommand('git rev-parse --show-toplevel');
  if (!result.success) return null;
  return path.basename(result.output);
}

function getProjectName() {
  const repoName = getGitRepoName();
  if (repoName) return repoName;
  return path.basename(process.cwd()) || null;
}

function sanitizeSessionId(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const hasNonAscii = Array.from(raw).some(char => char.codePointAt(0) > 0x7f);
  const normalized = raw.replace(/^\.+/, '');
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sanitized.length > 0) {
    const suffix = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 6);
    if (WINDOWS_RESERVED_SESSION_IDS.has(sanitized.toUpperCase())) {
      return `${sanitized}-${suffix}`;
    }
    if (!hasNonAscii) return sanitized;
    return `${sanitized}-${suffix}`;
  }

  const meaningful = normalized.replace(/[\s\p{P}]/gu, '');
  if (meaningful.length === 0) return null;

  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
}

function getSessionIdShort(fallback = 'default') {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId && sessionId.length > 0) {
    const sanitized = sanitizeSessionId(sessionId.slice(-8));
    if (sanitized) return sanitized;
  }
  return sanitizeSessionId(getProjectName()) || sanitizeSessionId(fallback) || 'default';
}

function findFiles(dir, pattern, options = {}) {
  if (!dir || typeof dir !== 'string') return [];
  if (!pattern || typeof pattern !== 'string') return [];

  const { maxAge = null, recursive = false } = options;
  const results = [];

  if (!fs.existsSync(dir)) return results;

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);

  function searchDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isFile() && regex.test(entry.name)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue;
          }
          if (maxAge !== null) {
            const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageInDays <= maxAge) {
              results.push({ path: fullPath, mtime: stats.mtimeMs });
            }
          } else {
            results.push({ path: fullPath, mtime: stats.mtimeMs });
          }
        } else if (entry.isDirectory() && recursive) {
          searchDir(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  searchDir(dir);
  results.sort((a, b) => b.mtime - a.mtime);
  return results;
}

async function readStdinJson(options = {}) {
  const { timeoutMs = 5000, maxSize = 1024 * 1024 } = options;

  return new Promise((resolve) => {
    let data = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners('data');
        process.stdin.removeAllListeners('end');
        process.stdin.removeAllListeners('error');
        if (process.stdin.unref) process.stdin.unref();
        try {
          resolve(data.trim() ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      }
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < maxSize) data += chunk;
    });

    process.stdin.on('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });

    process.stdin.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({});
    });
  });
}

function log(message) {
  console.error(message);
}

function output(data) {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data));
  } else {
    console.log(data);
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, 'utf8');
}

function commandExists(cmd) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(cmd)) return false;

  try {
    if (isWindows) {
      const result = spawnSync('where', [cmd], { stdio: 'pipe' });
      return result.status === 0;
    }
    const result = spawnSync('which', [cmd], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function runCommand(cmd, options = {}) {
  const allowedPrefixes = ['git ', 'node ', 'npx ', 'which ', 'where '];
  if (!allowedPrefixes.some(prefix => cmd.startsWith(prefix))) {
    return { success: false, output: 'runCommand blocked: unrecognized command prefix' };
  }

  const unquoted = cmd.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
  if (/[;|&\n]/.test(unquoted) || /[`$]/.test(cmd)) {
    return { success: false, output: 'runCommand blocked: shell metacharacters not allowed' };
  }

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

function isGitRepo() {
  return runCommand('git rev-parse --git-dir').success;
}

function getGitModifiedFiles(patterns = []) {
  if (!isGitRepo()) return [];

  const result = runCommand('git diff --name-only HEAD');
  if (!result.success) return [];

  let files = result.output.split('\n').filter(Boolean);

  if (patterns.length > 0) {
    const compiled = [];
    for (const pattern of patterns) {
      if (typeof pattern !== 'string' || pattern.length === 0) continue;
      try {
        compiled.push(new RegExp(pattern));
      } catch {
        // Skip invalid regex
      }
    }
    if (compiled.length > 0) {
      files = files.filter(file => compiled.some(regex => regex.test(file)));
    }
  }

  return files;
}

function replaceInFile(filePath, search, replace, options = {}) {
  const content = readFile(filePath);
  if (content === null) return false;

  try {
    let newContent;
    if (options.all && typeof search === 'string') {
      newContent = content.replaceAll(search, replace);
    } else {
      newContent = content.replace(search, replace);
    }
    writeFile(filePath, newContent);
    return true;
  } catch (err) {
    log(`[Utils] replaceInFile failed for ${filePath}: ${err.message}`);
    return false;
  }
}

function countInFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return 0;

  let regex;
  try {
    if (pattern instanceof RegExp) {
      regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    } else if (typeof pattern === 'string') {
      regex = new RegExp(pattern, 'g');
    } else {
      return 0;
    }
  } catch {
    return 0;
  }
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\([A-Z]|[A-Z])/g, '');
}

function grepFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return [];

  let regex;
  try {
    if (pattern instanceof RegExp) {
      const flags = pattern.flags.replace('g', '');
      regex = new RegExp(pattern.source, flags);
    } else {
      regex = new RegExp(pattern);
    }
  } catch {
    return [];
  }
  const lines = content.split('\n');
  const results = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      results.push({ lineNumber: index + 1, content: line });
    }
  });

  return results;
}

module.exports = {
  isWindows,
  isMacOS,
  isLinux,
  getHomeDir,
  getClaudeDir,
  getSessionsDir,
  getLegacySessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  getTempDir,
  ensureDir,
  getDateString,
  getTimeString,
  getDateTimeString,
  sanitizeSessionId,
  getSessionIdShort,
  getGitRepoName,
  getProjectName,
  findFiles,
  readFile,
  writeFile,
  appendFile,
  replaceInFile,
  countInFile,
  grepFile,
  stripAnsi,
  readStdinJson,
  log,
  output,
  commandExists,
  runCommand,
  isGitRepo,
  getGitModifiedFiles
};
