#!/bin/sh
# Run the std-kflow server: the native orb binary serves the program resolved at build time (dist/app.orb).
set -eu
cd "$(dirname "$0")/.."
ORB="$(node scripts/orb-binary.mjs)"
exec "$ORB" serve dist/app.orb --no-mock
