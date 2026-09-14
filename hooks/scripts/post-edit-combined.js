#!/usr/bin/env node
/**
 * PostToolUse Hook: Combined edit checks (format + typecheck + console.log)
 * Consolidates post-edit-format.js, post-edit-typecheck.js, post-edit-console-warn.js
 * into a single Node process to reduce spawn overhead.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

    if (filePath && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
      const resolvedPath = path.resolve(filePath);

      // ── 1. AUTO-FORMAT (Biome or Prettier) ──────────────────
      try {
        const { findProjectRoot, detectFormatter, resolveFormatterBin } = require('./lib/resolve-formatter');
        const projectRoot = findProjectRoot(path.dirname(resolvedPath));
        const formatter = detectFormatter(projectRoot);
        if (formatter) {
          const resolved = resolveFormatterBin(projectRoot, formatter);
          if (resolved) {
            const args = formatter === 'biome'
              ? [...resolved.prefix, 'check', '--write', resolvedPath]
              : [...resolved.prefix, '--write', resolvedPath];
            execFileSync(resolved.bin, args, { cwd: projectRoot, stdio: 'pipe', timeout: 15000 });
          }
        }
      } catch { /* no formatter — silent */ }

      // ── 2. TYPESCRIPT CHECK (.ts/.tsx only) ─────────────────
      if (/\.(ts|tsx)$/.test(filePath) && fs.existsSync(resolvedPath)) {
        try {
          let dir = path.dirname(resolvedPath);
          const root = path.parse(dir).root;
          let depth = 0;
          while (dir !== root && depth < 20) {
            if (fs.existsSync(path.join(dir, 'tsconfig.json'))) break;
            dir = path.dirname(dir);
            depth++;
          }
          if (fs.existsSync(path.join(dir, 'tsconfig.json'))) {
            const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
            execFileSync(npxBin, ['tsc', '--noEmit', '--pretty', 'false'], {
              cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000,
            });
          }
        } catch (err) {
          const output = (err.stdout || '') + (err.stderr || '');
          const relPath = path.relative(path.dirname(resolvedPath), resolvedPath);
          const relevantLines = output.split('\n')
            .filter(line => [filePath, resolvedPath, relPath].some(c => line.includes(c)))
            .slice(0, 10);
          if (relevantLines.length > 0) {
            console.error('[Hook] TypeScript errors in ' + path.basename(filePath) + ':');
            relevantLines.forEach(line => console.error(line));
          }
        }
      }

      // ── 3. CONSOLE.LOG WARNING ───────────────────────────────
      try {
        const content = fs.readFileSync(resolvedPath, 'utf8');
        const matches = content.split('\n')
          .map((line, i) => /console\.log/.test(line) ? (i + 1) + ': ' + line.trim() : null)
          .filter(Boolean);
        if (matches.length > 0) {
          console.error('[Hook] WARNING: console.log found in ' + filePath);
          matches.slice(0, 5).forEach(m => console.error(m));
          console.error('[Hook] Remove console.log before committing');
        }
      } catch { /* file unreadable — silent */ }
    }
  } catch { /* invalid input — pass through */ }

  process.stdout.write(data);
  process.exit(0);
});
