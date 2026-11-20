#!/usr/bin/env bash
# Start PromoCarter. Dev mode by default; `./start.sh prod` runs the production build.
#   PORT (default 3100)   HOST (default 127.0.0.1 = this machine only)
cd "$(dirname "$0")" || exit 1
if [ "$1" = "prod" ]; then
  [ -d .next ] || npm run build || exit 1
  exec npm run start
fi
exec npm run dev
