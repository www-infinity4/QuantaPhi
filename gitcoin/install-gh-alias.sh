#!/usr/bin/env bash
set -euo pipefail
# Local opt-in installation: does not touch wallet, GitHub, or existing aliases.
command -v gh >/dev/null || { echo 'GitHub CLI (gh) required' >&2; exit 1; }
command -v node >/dev/null || { echo 'Node.js required' >&2; exit 1; }
if gh alias list 2>/dev/null | grep -Eq '^gitcoin:'; then
  echo 'gh gitcoin alias already exists; leaving it untouched.' >&2
  exit 2
fi
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# gh --shell aliases forward the caller's arguments; no credentials are embedded.
gh alias set gitcoin --shell "node \"${here}/gh-gitcoin.mjs\" \"\$@\""
echo 'Installed: gh gitcoin help'
