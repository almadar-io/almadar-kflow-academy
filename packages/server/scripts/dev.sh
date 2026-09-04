#!/usr/bin/env bash
# Dev server: esbuild watch (~50ms rebuild) + node --watch (instant restart).
# Mirrors apps/builder/packages/server/scripts/dev.sh — replaces `tsx watch`,
# which runs esbuild over every ESM module it loads, including
# @almadar-io/behaviors' 58 MB dist (imported by @almadar-io/rabit at load
# time) and dies of heap exhaustion before the first log line.
set -euo pipefail

cd "$(dirname "$0")/.."

ESBUILD="node_modules/.bin/esbuild"
NODE_BIN="node"

echo "[dev] Bundling..."
$ESBUILD src/server.ts \
  --bundle --platform=node --target=node20 --format=esm \
  --outfile=dist/server.js --packages=external --sourcemap

echo "[dev] Starting esbuild watch + node --watch..."

$ESBUILD src/server.ts \
  --bundle --platform=node --target=node20 --format=esm \
  --outfile=dist/server.js --packages=external --sourcemap \
  --watch=forever &

ESBUILD_PID=$!

sleep 0.2

# src/config/env.ts also loads .env via dotenv; --env-file-if-exists keeps
# the two in agreement when the file is present and is a no-op when it is not.
$NODE_BIN --env-file-if-exists=.env --watch dist/server.js &
NODE_PID=$!

trap "kill $ESBUILD_PID $NODE_PID 2>/dev/null; exit" INT TERM EXIT

wait $NODE_PID
