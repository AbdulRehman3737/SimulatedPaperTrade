#!/usr/bin/env bash
# Run this on the Droplet (inside the project directory) to deploy an update.
# Usage: ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing backend dependencies"
(cd backend && npm install && npm run build)

echo "==> Installing frontend dependencies and building"
(cd frontend && npm install && npm run build)

echo "==> Restarting backend via PM2"
(cd backend && pm2 startOrReload ecosystem.config.js)

echo "==> Done. Backend (and the static frontend it now serves) is live."
