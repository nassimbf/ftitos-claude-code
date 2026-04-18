#!/usr/bin/env bash
set -euo pipefail

# diff-scope.sh — Detect scope of git changes for Review Army specialist dispatch
# Outputs shell variables: SCOPE_AUTH, SCOPE_BACKEND, SCOPE_FRONTEND, SCOPE_MIGRATIONS, SCOPE_API, changed_lines

DIFF_TARGET="${1:-HEAD}"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "ERROR: Not inside a git repository" >&2
  exit 1
fi

DIFF_OUTPUT=$(git diff --cached --name-only 2>/dev/null || git diff "$DIFF_TARGET" --name-only 2>/dev/null || echo "")

if [ -z "$DIFF_OUTPUT" ]; then
  DIFF_OUTPUT=$(git diff --name-only 2>/dev/null || echo "")
fi

changed_lines=$(git diff --cached --stat 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
deleted_lines=$(git diff --cached --stat 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
changed_lines=$((changed_lines + deleted_lines))

if [ "$changed_lines" -eq 0 ]; then
  changed_lines=$(git diff --stat 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
  deleted_lines=$(git diff --stat 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
  changed_lines=$((changed_lines + deleted_lines))
fi

SCOPE_AUTH=false
SCOPE_BACKEND=false
SCOPE_FRONTEND=false
SCOPE_MIGRATIONS=false
SCOPE_API=false

while IFS= read -r file; do
  [ -z "$file" ] && continue

  case "$file" in
    *auth*|*login*|*session*|*jwt*|*oauth*|*permission*|*rbac*|*password*|*credential*)
      SCOPE_AUTH=true
      ;;
  esac

  case "$file" in
    *migration*|*migrate*|*alembic*|*schema*|*flyway*|*liquibase*)
      SCOPE_MIGRATIONS=true
      ;;
  esac

  case "$file" in
    *api/*|*/routes/*|*/endpoints/*|*/views/*|*openapi*|*swagger*|*.graphql)
      SCOPE_API=true
      ;;
  esac

  case "$file" in
    *.py|*.go|*.rs|*.java|*.rb|*/server/*|*/backend/*|*/services/*|*/models/*|*/controllers/*)
      SCOPE_BACKEND=true
      ;;
  esac

  case "$file" in
    *.tsx|*.jsx|*.vue|*.svelte|*/components/*|*/pages/*|*/app/*|*.css|*.scss|*.html)
      SCOPE_FRONTEND=true
      ;;
  esac

done <<< "$DIFF_OUTPUT"

echo "SCOPE_AUTH=$SCOPE_AUTH"
echo "SCOPE_BACKEND=$SCOPE_BACKEND"
echo "SCOPE_FRONTEND=$SCOPE_FRONTEND"
echo "SCOPE_MIGRATIONS=$SCOPE_MIGRATIONS"
echo "SCOPE_API=$SCOPE_API"
echo "changed_lines=$changed_lines"
