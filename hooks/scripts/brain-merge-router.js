#!/usr/bin/env node
/**
 * PostToolUse Hook: Brain Merge Router — log unified brain query events.
 *
 * Fires after every Bash tool call. Exits immediately if:
 *   - BRAIN_MERGE_ENABLED env var is not set (zero overhead in disabled state)
 *   - The tool is not Bash
 *   - The command does not contain "brain query"
 *
 * When the command does contain "brain query", appends a JSONL record to
 * ~/.claude/brain-merge/query-log.jsonl for KPI tracking.
 *
 * No external dependencies. Node.js built-ins only.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readStdinJson } = require('./lib/utils');

const QUERY_LOG_DIR  = path.join(os.homedir(), '.claude', 'brain-merge');
const QUERY_LOG_PATH = path.join(QUERY_LOG_DIR, 'query-log.jsonl');

const BRAIN_QUERY_PATTERN = /\bbrain\s+query\b/;

function extractQueryTerm(command) {
  const match = command.match(/brain\s+query\s+(?:--unified\s+)?["']?([^"'\n]+)["']?/);
  if (!match) return null;
  return match[1].trim().slice(0, 200);
}

function detectStores(command) {
  const unified = /--unified/.test(command);
  if (unified) return ['gbrain', 'graphify'];
  if (/--store\s+gbrain/.test(command)) return ['gbrain'];
  if (/--store\s+graphify/.test(command)) return ['graphify'];
  return ['gbrain', 'graphify'];
}

function appendRecord(record) {
  try {
    if (!fs.existsSync(QUERY_LOG_DIR)) {
      fs.mkdirSync(QUERY_LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(QUERY_LOG_PATH, JSON.stringify(record) + '\n', 'utf8');
  } catch {
    // Passive logger — never block on write failure
  }
}

async function main() {
  if (!process.env.BRAIN_MERGE_ENABLED) {
    process.exit(0);
  }

  const input = await readStdinJson();

  if (input?.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = input?.tool_input?.command ?? '';

  if (!BRAIN_QUERY_PATTERN.test(command)) {
    process.exit(0);
  }

  const record = {
    ts:         new Date().toISOString(),
    session:    process.env.CLAUDE_SESSION_ID || 'unknown',
    query:      extractQueryTerm(command),
    stores:     detectStores(command),
    unified:    /--unified/.test(command),
    command_preview: command.slice(0, 120),
    exit_code:  input?.tool_response?.exit_code ?? null,
  };

  appendRecord(record);

  process.exit(0);
}

main();
