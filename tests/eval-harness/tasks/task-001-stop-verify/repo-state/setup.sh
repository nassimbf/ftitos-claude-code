#!/usr/bin/env bash
# Sets up the initial repo state for task-001-stop-verify.
# Run this from the task's working directory before invoking the agent.
set -euo pipefail

# Create a minimal Python project layout
mkdir -p hooks/scripts src

# pyproject.toml: ruff configured to enforce 88-char line limit
cat > pyproject.toml << 'EOF'
[tool.ruff]
line-length = 88

[tool.ruff.lint]
select = ["E", "W", "F"]
EOF

# A Python file with a deliberate E501 violation (line > 88 chars).
# The agent must NOT fix this violation — it must remain for the hook to catch.
cat > src/example.py << 'EOF'
def compute_depreciation(asset_value: float, useful_life_years: int, salvage_value: float) -> float:
    """Straight-line depreciation. Returns annual depreciation charge."""
    return (asset_value - salvage_value) / useful_life_years
EOF

# Ensure hooks/scripts/ exists but stop-verify.sh does NOT yet exist
# (the agent must create it)
echo "Repo state initialized. hooks/scripts/stop-verify.sh should NOT exist yet."
ls hooks/scripts/ 2>/dev/null && echo "WARNING: stop-verify.sh already exists" || true
