#!/usr/bin/env bash
set -euo pipefail
echo "ftitos-claude-code installer v2.0.0"
node "$(dirname "$0")/scripts/install-apply.js" "$@"
