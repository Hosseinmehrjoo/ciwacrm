#!/usr/bin/env bash
# Local/public helper: start BFF + frontend preview (and optional Cloudflare tunnel).
# For a fresh Ubuntu server, prefer: ./deploy/bootstrap-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

export PORT="${CIWA_BFF_PORT:-8787}"
export CIWA_COOKIE_SECURE="${CIWA_COOKIE_SECURE:-0}"
export CIWA_PUBLIC_URL="${CIWA_PUBLIC_URL:?set CIWA_PUBLIC_URL in .env}"
UI_PORT="${CIWA_UI_PORT:-8443}"

mkdir -p "$ROOT/data/run"

if ! ss -ltn | awk '{print $4}' | grep -qE "[:.]${PORT}$"; then
  echo "Starting BFF on :${PORT}"
  nohup node "$ROOT/integration/server.mjs" >"$ROOT/data/run/bff.log" 2>&1 &
  echo $! >"$ROOT/data/run/bff.pid"
else
  echo "BFF already listening on :${PORT}"
fi

if ! ss -ltn | awk '{print $4}' | grep -qE "[:.]${UI_PORT}$"; then
  echo "Starting frontend preview on :${UI_PORT}"
  (
    cd "$ROOT/frontend"
    if [[ ! -d dist ]]; then
      pnpm install
      pnpm build
    fi
    nohup pnpm preview --host 127.0.0.1 --port "$UI_PORT" >"$ROOT/data/run/frontend.log" 2>&1 &
    echo $! >"$ROOT/data/run/frontend.pid"
  )
else
  echo "Frontend already listening on :${UI_PORT}"
fi

for i in $(seq 1 40); do
  if curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${UI_PORT}/" | grep -qE '200|304' \
    && curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/session" | grep -qE '200|401'; then
    break
  fi
  sleep 0.4
done

if [[ "${CIWA_START_CLOUDFLARED:-0}" == "1" ]]; then
  if pgrep -f 'cloudflared tunnel --config' >/dev/null 2>&1 || pgrep -f 'cloudflared tunnel run' >/dev/null 2>&1; then
    echo "cloudflared already running"
  else
    TUNNEL_NAME="${CIWA_CLOUDFLARE_TUNNEL:-ciwa-crm}"
    echo "Starting Cloudflare tunnel ${TUNNEL_NAME}"
    nohup cloudflared tunnel --config "$HOME/.cloudflared/config.yml" run "$TUNNEL_NAME" \
      >"$ROOT/data/run/cloudflared.log" 2>&1 &
    echo $! >"$ROOT/data/run/cloudflared.pid"
  fi
fi

echo
echo "Public URL: ${CIWA_PUBLIC_URL}"
echo "Logs: $ROOT/data/run/"
