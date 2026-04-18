#!/usr/bin/env node
/**
 * SessionStart Learnings Hook - Load cross-session learnings on startup
 *
 * Searches for project-specific learnings from continuous-learning
 * and injects the top 5 most relevant into the session context.
 * Includes prompt-injection protection.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log } = require('./lib/utils');

const HOMUNCULUS_DIR = path.join(
  process.env.HOME || '/tmp',
  '.claude', 'homunculus', 'projects'
);
const MAX_LEARNINGS = 5;
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions/i,
  /you\s+are\s+now/i,
  /always\s+output\s+no\s+findings/i,
  /override:/i,
  /system\s*prompt/i,
  /\bact\s+as\b/i,
];

function getProjectSlug() {
  try {
    const remote = execSync('git remote get-url origin 2>/dev/null', {
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    return remote
      .replace(/.*[/:]([\w.-]+\/[\w.-]+?)(\.git)?$/, '$1')
      .replace(/\//g, '-');
  } catch {
    return path.basename(process.cwd());
  }
}

function isPromptInjection(text) {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

function loadInstincts(projectDir) {
  const instinctsDir = path.join(projectDir, 'instincts');
  if (!fs.existsSync(instinctsDir)) return [];

  const entries = [];
  for (const file of fs.readdirSync(instinctsDir)) {
    if (!file.endsWith('.md') && !file.endsWith('.yaml')) continue;
    try {
      const content = fs.readFileSync(path.join(instinctsDir, file), 'utf8');
      if (isPromptInjection(content)) {
        log(`[Learnings] BLOCKED injection attempt in ${file}`);
        continue;
      }
      const confMatch = content.match(/confidence:\s*([\d.]+)/i);
      const confidence = confMatch ? parseFloat(confMatch[1]) : 0.5;
      entries.push({ file, content: content.slice(0, 500), confidence });
    } catch {
      /* skip unreadable files */
    }
  }

  return entries
    .filter((e) => e.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_LEARNINGS);
}

function loadObservations(projectDir) {
  const obsFile = path.join(projectDir, 'observations.jsonl');
  if (!fs.existsSync(obsFile)) return [];

  try {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const recent = lines.slice(-20);
    const patterns = [];
    for (const line of recent) {
      try {
        const obj = JSON.parse(line);
        if (obj.pattern && !isPromptInjection(obj.pattern)) {
          patterns.push(obj.pattern);
        }
      } catch {
        /* skip malformed lines */
      }
    }
    return [...new Set(patterns)].slice(0, 3);
  } catch {
    return [];
  }
}

async function main() {
  const slug = getProjectSlug();
  const contextParts = [];

  if (fs.existsSync(HOMUNCULUS_DIR)) {
    for (const dir of fs.readdirSync(HOMUNCULUS_DIR)) {
      const projectDir = path.join(HOMUNCULUS_DIR, dir);
      if (!fs.statSync(projectDir).isDirectory()) continue;
      if (!dir.includes(slug) && dir !== slug) continue;

      const instincts = loadInstincts(projectDir);
      const observations = loadObservations(projectDir);

      if (instincts.length > 0) {
        const formatted = instincts
          .map((i) => `- [${i.confidence.toFixed(1)}] ${i.content.split('\n').slice(0, 3).join(' ').trim()}`)
          .join('\n');
        contextParts.push(
          `Cross-session learnings for ${slug} (${instincts.length} instincts):\n${formatted}`
        );
        log(`[Learnings] Loaded ${instincts.length} instincts for ${slug}`);
      }

      if (observations.length > 0) {
        contextParts.push(
          `Recent patterns observed:\n${observations.map((o) => `- ${o}`).join('\n')}`
        );
      }
      break;
    }
  }

  // Check global learnings
  const globalDir = path.join(
    process.env.HOME || '/tmp',
    '.claude', 'homunculus', 'global', 'instincts'
  );
  if (fs.existsSync(globalDir)) {
    try {
      const globalFiles = fs.readdirSync(globalDir).filter((f) => f.endsWith('.md'));
      if (globalFiles.length > 0) {
        log(`[Learnings] ${globalFiles.length} global instinct(s) available`);
      }
    } catch {
      /* ignore */
    }
  }

  if (contextParts.length > 0) {
    const payload = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: contextParts.join('\n\n'),
      },
    });
    process.stdout.write(payload);
  }
}

main().catch((err) => {
  log(`[Learnings] Error: ${err.message}`);
  process.exitCode = 0;
});
