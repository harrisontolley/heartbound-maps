#!/usr/bin/env bash
#
# Start the Heartbound Maps dev server (frontend :3000 + backend :8787 via `pnpm dev`),
# first freeing those ports by killing whatever is already listening on them.
#
# Usage: ./scripts/dev.sh

set -euo pipefail

# Resolve the repo root regardless of where the script is invoked from.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORTS=(3000 8787)

free_port() {
  local port="$1"
  local pids
  # lsof gives us the PIDs listening on the TCP port.
  pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Port ${port} in use by PID(s): ${pids//$'\n'/ } — killing"
    # Try a graceful term first, then force-kill anything still alive.
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      kill -9 $pids 2>/dev/null || true
    fi
  else
    echo "→ Port ${port} is free"
  fi
}

if ! command -v lsof >/dev/null 2>&1; then
  echo "Error: lsof is required to free dev ports. Install it (e.g. sudo apt install lsof)." >&2
  exit 1
fi

echo "Freeing dev ports..."
for port in "${PORTS[@]}"; do
  free_port "$port"
done

echo "Starting dev server (pnpm dev)..."
exec pnpm dev
