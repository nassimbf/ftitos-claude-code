#!/usr/bin/env node
/**
 * PreToolUse Hook: Backup files before Edit/Write if outside a git repo.
 * Backups saved to ~/.claude/backups/<YYYY-MM-DD>/<HH-MM-SS>_<filename>
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKUP_ROOT = path.join(os.homedir(), '.claude', 'backups');
const MAX_STDIN = 1024 * 1024;

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && fs.existsSync(filePath)) {
      const resolvedPath = path.resolve(filePath);

      let inGit = false;
      try {
        execFileSync('git', ['-C', path.dirname(resolvedPath), 'rev-parse', '--git-dir'], {
          stdio: 'pipe'
        });
        inGit = true;
      } catch { /* not in git repo */ }

      if (!inGit) {
        const now = new Date();
        const dateDir = now.toISOString().slice(0, 10);
        const timePrefix = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        const backupDir = path.join(BACKUP_ROOT, dateDir);

        fs.mkdirSync(backupDir, { recursive: true });

        const backupName = `${timePrefix}_${path.basename(resolvedPath)}`;
        const backupPath = path.join(backupDir, backupName);

        fs.copyFileSync(resolvedPath, backupPath);
        console.error(`[Backup] ${path.basename(resolvedPath)} -> .claude/backups/${dateDir}/${backupName}`);
      }
    }
  } catch { /* silent — never block the edit */ }

  process.stdout.write(data);
  process.exit(0);
});
