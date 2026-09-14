#!/usr/bin/env node
/**
 * Health check for an installed ftitos-claude-code harness.
 *
 * v4 rewrite. The v2 doctor counted files and reported OK no matter what it found —
 * it passed a config with 8 duplicate hook registrations and 22k tokens of always-on
 * context. This one measures the things that actually go wrong:
 *   duplicate hooks, hooks pointing at missing scripts, version drift, context budget.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

const STATUS = { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' };
const LABELS = { GREEN: '[OK]  ', YELLOW: '[WARN]', RED: '[FAIL]' };

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const REPO_ROOT = path.dirname(__dirname);

// Above this, the harness is eating the context window it exists to protect.
const CONTEXT_BUDGET_TOKENS = 8000;
const REQUIRED_HOOKS = ['cc-safety-net.js', 'pre-secrets-block.js', 'stop-verify.js'];

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = p => fs.existsSync(p);

function settings() {
  const p = path.join(CLAUDE_DIR, 'settings.json');
  return exists(p) ? readJson(p) : {};
}

function hookEntries() {
  const hooks = settings().hooks || {};
  return Object.entries(hooks).flatMap(([event, matchers]) =>
    (matchers || []).flatMap(m => (m.hooks || []).map(h => ({ event, command: h.command || '' }))));
}

// Hook commands look like: node "$HOME/.claude/scripts/hooks/x.js" or python3 /abs/path/y.py
function scriptPath(command) {
  const token = command.split(/\s+/).find(t => /\.(js|py|sh)"?$/.test(t)) || '';
  return token.replace(/"/g, '').replace(/^\$HOME|^~/, HOME);
}

function scriptName(command) {
  return path.basename(scriptPath(command));
}

function walk(dir, onFile) {
  if (!exists(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

function descriptionBytes(globDir, filename) {
  let total = 0;
  walk(globDir, f => {
    if (filename && path.basename(f) !== filename) return;
    if (!f.endsWith('.md')) return;
    const head = fs.readFileSync(f, 'utf8').slice(0, 4000);
    const fm = head.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) return;
    const desc = fm[1].match(/^description:\s*(.*)$/m);
    const name = fm[1].match(/^name:\s*(.*)$/m);
    total += (desc ? desc[1].length : 0) + (name ? name[1].length : 0);
  });
  return total;
}

const CHECKS = [
  ['Node.js', () => {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    return major >= 18
      ? { status: STATUS.GREEN, message: `v${process.versions.node}` }
      : { status: STATUS.RED, message: `v${process.versions.node} (requires >= 18)` };
  }],

  ['Claude Code CLI', () => {
    try {
      const v = execSync('claude --version 2>/dev/null', { encoding: 'utf8' }).trim();
      return { status: STATUS.GREEN, message: v || 'installed' };
    } catch {
      return { status: STATUS.RED, message: 'not found in PATH' };
    }
  }],

  ['Duplicate hooks', () => {
    const seen = new Map();
    for (const { event, command } of hookEntries()) {
      const key = `${event}:${scriptName(command)}`;
      if (scriptName(command)) seen.set(key, (seen.get(key) || 0) + 1);
    }
    const dupes = [...seen].filter(([, n]) => n > 1);
    return dupes.length === 0
      ? { status: STATUS.GREEN, message: 'none' }
      : { status: STATUS.RED, message: `${dupes.length} hook(s) registered twice: ${dupes.map(([k]) => k).join(', ')}` };
  }],

  ['Hook scripts resolve', () => {
    const missing = hookEntries()
      .map(h => scriptPath(h.command))
      .filter(Boolean)
      .filter(p => !exists(p))
      .map(p => path.basename(p));
    return missing.length === 0
      ? { status: STATUS.GREEN, message: 'all wired scripts exist' }
      : { status: STATUS.RED, message: `missing: ${[...new Set(missing)].join(', ')}` };
  }],

  ['Enforcement hooks present', () => {
    const missing = REQUIRED_HOOKS.filter(h => !exists(path.join(CLAUDE_DIR, 'scripts', 'hooks', h)));
    return missing.length === 0
      ? { status: STATUS.GREEN, message: REQUIRED_HOOKS.join(', ') }
      : { status: STATUS.RED, message: `missing: ${missing.join(', ')}` };
  }],

  ['Context budget', () => {
    const bytes = descriptionBytes(path.join(CLAUDE_DIR, 'skills'), 'SKILL.md')
      + descriptionBytes(path.join(CLAUDE_DIR, 'agents'))
      + descriptionBytes(path.join(CLAUDE_DIR, 'commands'))
      + (exists(path.join(CLAUDE_DIR, 'rules'))
          ? fs.readdirSync(path.join(CLAUDE_DIR, 'rules'))
              .filter(f => f.endsWith('.md'))
              .reduce((n, f) => n + fs.statSync(path.join(CLAUDE_DIR, 'rules', f)).size, 0)
          : 0);
    const tokens = Math.round(bytes / 4);
    const msg = `~${tokens.toLocaleString()} tokens always-on (budget ${CONTEXT_BUDGET_TOKENS.toLocaleString()})`;
    if (tokens <= CONTEXT_BUDGET_TOKENS) return { status: STATUS.GREEN, message: msg };
    if (tokens <= CONTEXT_BUDGET_TOKENS * 2) return { status: STATUS.YELLOW, message: msg };
    return { status: STATUS.RED, message: msg };
  }],

  ['Skill references resolve', () => {
    // A skill telling the model to run a path that does not exist fails silently:
    // the model runs it, gets "no such file", and improvises. /go did this for
    // months; the vendored gstack skills did it on day one.
    const validator = path.join(__dirname, 'ci', 'validate-skill-refs.js');
    if (!exists(validator)) return { status: STATUS.YELLOW, message: 'validator missing' };
    const res = spawnSync(process.execPath, [validator, path.join(__dirname, '..')], { encoding: 'utf8' });
    if (res.status === 0) return { status: STATUS.GREEN, message: 'all fenced skill references resolve' };
    const count = (res.stderr.match(/(\d+) dangling/) || [, '?'])[1];
    return { status: STATUS.RED, message: `${count} dangling reference(s) — run scripts/ci/validate-skill-refs.js` };
  }],

  ['Backup cruft', () => {
    let count = 0;
    walk(CLAUDE_DIR, f => { if (/\.bak\.\d+$/.test(f)) count += 1; });
    return count === 0
      ? { status: STATUS.GREEN, message: 'none' }
      : { status: STATUS.YELLOW, message: `${count} .bak.* files — run: find ~/.claude -name '*.bak.*' -delete` };
  }],

  ['Version match', () => {
    const version = fs.readFileSync(path.join(REPO_ROOT, 'VERSION'), 'utf8').trim();
    const manifestPath = path.join(CLAUDE_DIR, '.ftitos-cc-manifest.json');
    if (!exists(manifestPath)) return { status: STATUS.YELLOW, message: `repo v${version}, never installed via installer` };
    const installed = readJson(manifestPath).version;
    return installed === version
      ? { status: STATUS.GREEN, message: `v${version} repo and install agree` }
      : { status: STATUS.RED, message: `repo v${version} but installed v${installed} — run ./install.sh` };
  }],

  ['MCP servers', () => {
    const p = path.join(HOME, '.claude.json');
    if (!exists(p)) return { status: STATUS.YELLOW, message: 'no MCP config found' };
    const count = Object.keys(readJson(p).mcpServers || {}).length;
    if (count === 0) return { status: STATUS.YELLOW, message: 'none configured' };
    if (count <= 6) return { status: STATUS.GREEN, message: `${count} servers` };
    return { status: STATUS.YELLOW, message: `${count} servers — each one costs context on every session` };
  }],
];

function main() {
  const version = fs.readFileSync(path.join(REPO_ROOT, 'VERSION'), 'utf8').trim();
  console.log(`ftitos-claude-code v${version} doctor\n`);

  const results = CHECKS.map(([name, fn]) => {
    try {
      const r = fn();
      console.log(`  ${LABELS[r.status]}  ${name}: ${r.message}`);
      return r.status;
    } catch (err) {
      console.log(`  ${LABELS[STATUS.RED]}  ${name}: ${err.message}`);
      return STATUS.RED;
    }
  });

  const tally = s => results.filter(r => r === s).length;
  console.log(`\nResult: ${tally(STATUS.GREEN)} OK, ${tally(STATUS.YELLOW)} warnings, ${tally(STATUS.RED)} failures`);

  if (tally(STATUS.RED) > 0) {
    console.log('Fix the FAIL items before relying on this harness.');
    process.exit(1);
  }
  console.log(tally(STATUS.YELLOW) > 0 ? 'Critical checks pass. Review warnings above.' : 'Healthy.');
  process.exit(0);
}

main();
