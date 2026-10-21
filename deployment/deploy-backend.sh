#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$BACKEND_SRC/.." && pwd)"
SERVER="root@satyatech.org"
DEPLOY_RELEASE="${DEPLOY_RELEASE:-$(date -u +%Y%m%dT%H%M%SZ)}"
[[ "$DEPLOY_RELEASE" =~ ^[A-Za-z0-9_-]+$ ]] || exit 1
ARCHIVE="$(mktemp /private/tmp/satya-backend.XXXXXX.tgz)"
trap 'rm -f "$ARCHIVE"' EXIT
cd "$BACKEND_SRC"
npm test
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$ARCHIVE" index.js src package.json package-lock.json ecosystem.config.js \
  deployment/preflight.cjs deployment/backup-database.cjs
scp "$ARCHIVE" "$SERVER:/tmp/satya-backend-$DEPLOY_RELEASE.tgz"
ssh "$SERVER" "bash -s -- '$DEPLOY_RELEASE'" < "$SCRIPT_DIR/backend-remote.sh"
