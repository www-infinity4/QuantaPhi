#!/usr/bin/env bash
set -euo pipefail
echo "Bubbles Coder Linux shell is available"
printf 'GitHub revision: %s\n' "${GITHUB_SHA:-unknown}"
printf 'Workspace: %s\n' "${GITHUB_WORKSPACE:-unknown}"
