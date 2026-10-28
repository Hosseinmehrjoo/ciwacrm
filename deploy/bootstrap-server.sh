#!/usr/bin/env bash
# Bootstrap CIWA CRM on a Linux server after .env is configured.
# Usage (from repo root):  ./deploy/bootstrap-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy env.example and set passwords / URLs first."
  echo "  cp env.example .env && nano .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${CIWA_DB_PASSWORD:?set CIWA_DB_PASSWORD in .env}"
: "${MARIADB_ROOT_PASSWORD:?set MARIADB_ROOT_PASSWORD in .env}"
: "${CIWA_ADMIN_PASSWORD:?set CIWA_ADMIN_PASSWORD in .env}"
: "${CIWA_CLIENT_SECRET:?set CIWA_CLIENT_SECRET in .env}"
: "${CIWA_PUBLIC_URL:?set CIWA_PUBLIC_URL in .env}"

if grep -qE 'YOUR_SERVER_IP|change-me' .env; then
  echo "Replace placeholder values in .env (YOUR_SERVER_IP / change-me*) before deploying."
  exit 1
fi

if ! grep -q '^HOST_UID=' .env; then
  echo "HOST_UID=$(id -u)" >> .env
  echo "HOST_GID=$(id -g)" >> .env
  echo "Appended HOST_UID/HOST_GID to .env"
fi

echo "==> Starting MariaDB + CRM core"
docker compose up -d --build db crm

echo "==> Waiting for core HTTP on :8081"
for i in $(seq 1 90); do
  if curl -sf -o /dev/null "http://127.0.0.1:8081/" || curl -sf -o /dev/null -I "http://127.0.0.1:8081/"; then
    echo "Core is up."
    break
  fi
  if [[ "$i" -eq 90 ]]; then
    echo "Core did not become ready. Check: docker compose logs crm"
    exit 1
  fi
  sleep 2
done

echo "==> Building frontend"
(
  cd "$ROOT/frontend"
  corepack enable >/dev/null 2>&1 || true
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm build
)

UI_PORT="${CIWA_UI_PORT:-8443}"
BFF_PORT="${CIWA_BFF_PORT:-8787}"
mkdir -p "$ROOT/data/run"

echo "==> Installing systemd units (needs sudo)"
DEPLOY_USER="${SUDO_USER:-$USER}"
PROJECT_DIR="$ROOT"

sudo tee /etc/systemd/system/ciwa-integration.service >/dev/null <<EOF
[Unit]
Description=CIWA CRM Integration
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=${PROJECT_DIR}/.env
Environment=PORT=${BFF_PORT}
ExecStart=$(command -v node) integration/server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

PNPM_BIN="$(command -v pnpm)"
sudo tee /etc/systemd/system/ciwa-frontend.service >/dev/null <<EOF
[Unit]
Description=CIWA CRM Frontend
After=network.target ciwa-integration.service
Requires=ciwa-integration.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${PROJECT_DIR}/frontend
Environment=PORT=${UI_PORT}
Environment=CIWA_INTEGRATION_URL=http://127.0.0.1:${BFF_PORT}
ExecStart=${PNPM_BIN} preview --host 0.0.0.0 --port ${UI_PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ciwa-integration ciwa-frontend

echo
echo "Done."
echo "  UI:   ${CIWA_PUBLIC_URL}"
echo "  Admin user: admin"
echo "  Admin password: (CIWA_ADMIN_PASSWORD from .env)"
echo
echo "Status:"
docker compose ps
systemctl is-active ciwa-integration || true
systemctl is-active ciwa-frontend || true
echo
echo "Logs:"
echo "  journalctl -u ciwa-integration -f"
echo "  journalctl -u ciwa-frontend -f"
echo "  docker compose logs -f crm"
