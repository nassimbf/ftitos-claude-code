#!/usr/bin/env node
/**
 * PostToolUse Hook: Veto Rate Logger — track Review Army/Council veto events.
 * Fires after Agent tool calls. Scans the tool response for review council
 * signals (VETOED, DISMISS, CONFIRM, etc.) and appends a JSONL record to
 * ~/.claude/veto-log.jsonl for KPI tracking (target: ~50% self-correction rate).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readStdinJson } = require('./lib/utils');

const VETO_KEYWORDS = ['VETOED', 'DISMISS', 'blocks ship', 'CRITICAL', 'Council:'];

const VERDICT_PATTERNS = [
  { pattern: /\bDISMISS\b/, verdict: 'approved' },
  { pattern: /\bVETOED\b/,  verdict: 'vetoed'   },
  { pattern: /(?:Council.*\bCONFIRM\b|\bCONFIRM\b\s*(?:—|:|\n|$))/, verdict: 'vetoed' },
  { pattern: /council\s+split/i, verdict: 'split' },
  { pattern: /blocks\s+ship/i,   verdict: 'vetoed' },
];

function detectVerdict(content) {
  for (const { pattern, verdict } of VERDICT_PATTERNS) {
    if (pattern.test(content)) return verdict;
  }
  return 'unknown';
}

function detectSignal(content) {
  return VETO_KEYWORDS.find(kw => content.includes(kw)) || 'unknown';
}

function getVetoLogPath() {
  return path.join(os.homedir(), '.claude', 'veto-log.jsonl');
}

async function main() {
  const input = await readStdinJson();

  if (input?.tool_name !== 'Agent') {
    process.exit(0);
  }

  const responseContent = input?.tool_response?.content ?? '';
  const hasVetoSignal = VETO_KEYWORDS.some(kw => responseContent.includes(kw));

  if (!hasVetoSignal) {
    process.exit(0);
  }

  const record = {
    ts: new Date().toISOString(),
    session: process.env.CLAUDE_SESSION_ID || 'unknown',
    verdict: detectVerdict(responseContent),
    signal: detectSignal(responseContent),
    agent_desc: (input?.tool_input?.description ?? '').slice(0, 80),
  };

  try {
    fs.appendFileSync(getVetoLogPath(), JSON.stringify(record) + '\n', 'utf8');
  } catch {
    // Passive logger — never block on write failure
  }

  process.exit(0);
}

main();
