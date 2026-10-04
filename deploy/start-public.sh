#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

export PORT="${CIWA_BFF_PORT:-8787}"
export CIWA_COOKIE_SECURE="${CIWA_COOKIE_SECURE:-1}"
export CIWA_PUBLIC_URL="${CIWA_PUBLIC_URL:-https://kojaberamm.ir}"

mkdir -p "$ROOT/data/run"

if ! ss -ltn | awk '{print $4}' | grep -qE '[:.]8787$'; then
  echo "Starting BFF on :8787"
  nohup node "$ROOT/integration/server.mjs" >"$ROOT/data/run/bff.log" 2>&1 &
  echo $! >"$ROOT/data/run/bff.pid"
else
  echo "BFF already listening on :8787"
fi

if ! ss -ltn | awk '{print $4}' | grep -qE '[:.]8443$'; then
  echo "Starting frontend preview on :8443"
  (
    cd "$ROOT/frontend"
    nohup pnpm preview --host 127.0.0.1 --port 8443 >"$ROOT/data/run/frontend.log" 2>&1 &
    echo $! >"$ROOT/data/run/frontend.pid"
  )
else
  echo "Frontend already listening on :8443"
fi

for i in $(seq 1 40); do
  if curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:8443/" | grep -qE '200|304' \
    && curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:8787/api/session" | grep -qE '200|401'; then
    break
  fi
  sleep 0.4
done

if pgrep -f 'cloudflared tunnel --config' >/dev/null 2>&1 || pgrep -f 'cloudflared tunnel run' >/dev/null 2>&1; then
  echo "cloudflared already running"
else
  echo "Starting Cloudflare tunnel ciwa-crm"
  nohup cloudflared tunnel --config "$HOME/.cloudflared/config.yml" run ciwa-crm \
    >"$ROOT/data/run/cloudflared.log" 2>&1 &
  echo $! >"$ROOT/data/run/cloudflared.pid"
fi

echo
echo "Public URLs:"
echo "  https://kojaberamm.ir"
echo "  https://crm.kojaberamm.ir"
echo "  https://www.kojaberamm.ir"
echo
echo "Logs: $ROOT/data/run/"
