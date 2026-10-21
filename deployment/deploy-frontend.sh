#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$BACKEND_SRC/.." && pwd)"
SERVER="root@satyatech.org"
DEPLOY_RELEASE="${DEPLOY_RELEASE:-$(date -u +%Y%m%dT%H%M%SZ)}"
[[ "$DEPLOY_RELEASE" =~ ^[A-Za-z0-9_-]+$ ]] || exit 1
ARCHIVE="$(mktemp /private/tmp/satya-frontend.XXXXXX.tgz)"
trap 'rm -f "$ARCHIVE"' EXIT
cd "$WORKSPACE_DIR/admin-mindful-living"
npm run build
test -s dist/index.html
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$ARCHIVE" -C dist .
scp "$ARCHIVE" "$SERVER:/tmp/satya-frontend-$DEPLOY_RELEASE.tgz"
ssh "$SERVER" "bash -s -- '$DEPLOY_RELEASE'" < "$SCRIPT_DIR/frontend-remote.sh"
