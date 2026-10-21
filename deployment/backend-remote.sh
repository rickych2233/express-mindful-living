#!/bin/bash
set -euo pipefail
umask 077
RELEASE="$1"
[[ "$RELEASE" =~ ^[A-Za-z0-9_-]+$ ]] || exit 1
LIVE=/var/www/satyatech/backend
STAGE="/var/www/satyatech/releases/$RELEASE/backend"
BACKUP="/var/backups/satyatech/$RELEASE"
exec 9>/var/lock/satyatech-deploy.lock
flock -n 9
mkdir -p "$STAGE" "$BACKUP"
test -f "$LIVE/.env"
tar -xzf "/tmp/satya-backend-$RELEASE.tgz" -C "$STAGE"
cd "$STAGE"
npm ci --omit=dev
node --check index.js
node deployment/preflight.cjs "$LIVE" "$STAGE" > "$BACKUP/preflight.json"
cat "$BACKUP/preflight.json"
# Backup includes server configuration, dependencies and uploaded files.
test ! -e "$BACKUP/backend.tgz"
tar -czf "$BACKUP/backend.tgz" -C "$LIVE" .
node deployment/backup-database.cjs "$LIVE" "$BACKUP/database.dump"
pg_restore --list "$BACKUP/database.dump" > "$BACKUP/database-contents.txt"
sha256sum "$LIVE/.env" > "$BACKUP/env.sha256"
rollback() {
  code=$?
  trap - ERR
  echo 'Backend verification failed; restoring application backup.' >&2
  pm2 stop satyatech-api || true
  tar -xzf "$BACKUP/backend.tgz" -C "$LIVE"
  pm2 restart satyatech-api || true
  exit "$code"
}
trap rollback ERR
# The local .env and uploads are never included in the release archive.
cp -a "$STAGE/src/." "$LIVE/src/"
cp "$STAGE/index.js" "$STAGE/package.json" "$STAGE/package-lock.json" "$LIVE/"
cp -a "$STAGE/node_modules/." "$LIVE/node_modules/"
sha256sum --check "$BACKUP/env.sha256"
pm2 restart satyatech-api
for attempt in $(seq 1 20); do
  if curl --silent --fail http://127.0.0.1:3001/api/chapters > "$BACKUP/health.json"; then break; fi
  sleep 1
done
node - "$BACKUP/health.json" <<'NODE'
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(data.chapters) && !Array.isArray(data.data) && !Array.isArray(data)) throw new Error('Unexpected chapters health response');
console.log('Backend HTTP health check passed.');
NODE
# Require a second successful response after the process has settled.
sleep 2
curl --silent --fail http://127.0.0.1:3001/api/chapters > /dev/null
sha256sum --check "$BACKUP/env.sha256"
trap - ERR
printf 'BACKEND_DEPLOYED=%s\nBACKUP=%s\n' "$RELEASE" "$BACKUP"
