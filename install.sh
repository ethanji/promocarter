#!/usr/bin/env bash
# PromoCarter installer: checks Node, installs dependencies, builds.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js is not installed. Install Node 22.13+ (https://nodejs.org) and re-run."; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' \
  || { echo "Node $(node -v) is too old. PromoCarter needs Node 22.13 or newer (it uses the built-in node:sqlite)."; exit 1; }
echo "Node $(node -v) OK"
npm install
npm run build
echo
echo "Installed. Start it with:  ./start.sh prod     (then open http://localhost:3100)"
echo "AI/MCP setup:             see docs/MCP.md"
