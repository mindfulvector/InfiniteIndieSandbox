#!/usr/bin/env bash
# Convenience runner for the Infinite Indie Sandbox test harness on Linux.
#
#   ./test/run.sh                 # run the building-feature test (headless)
#   IIS_HEADLESS=0 ./test/run.sh  # run with a visible browser window (needs a display)
#
# Requires: php (dev server) and a Playwright Chromium build. In this repo's
# container both are pre-installed; elsewhere run `npm i -g playwright` and
# `npx playwright install chromium`.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v php >/dev/null 2>&1; then
  echo "error: php is required (the game is served by 'php -S')." >&2
  exit 1
fi

NODE_BIN="${NODE_BIN:-node}"
exec "$NODE_BIN" test/test-building.js "$@"
