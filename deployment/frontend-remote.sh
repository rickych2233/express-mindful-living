#!/bin/bash
set -euo pipefail
umask 022
RELEASE="$1"
[[ "$RELEASE" =~ ^[A-Za-z0-9_-]+$ ]] || exit 1
LIVE=/var/www/satyatech/frontend
STAGE="/var/www/satyatech/releases/$RELEASE/frontend"
BACKUP="/var/backups/satyatech/$RELEASE"
exec 9>/var/lock/satyatech-deploy.lock
flock -n 9
mkdir -p "$STAGE" "$BACKUP"
chmod 700 "$BACKUP"
tar -xzf "/tmp/satya-frontend-$RELEASE.tgz" -C "$STAGE"
test -s "$STAGE/index.html"
nginx -t
test ! -e "$BACKUP/frontend.tgz"
tar -czf "$BACKUP/frontend.tgz" -C "$LIVE" .
rollback() {
  code=$?
  trap - ERR
  echo 'Frontend verification failed; restoring previous entry point.' >&2
  tar -xzf "$BACKUP/frontend.tgz" -C "$LIVE"
  nginx -s reload || true
  exit "$code"
}
trap rollback ERR
# Assets are uploaded first; the entry point is switched atomically last.
cp -a "$STAGE/assets/." "$LIVE/assets/"
find "$STAGE" -maxdepth 1 -type f ! -name index.html -exec cp {} "$LIVE/" \;
cp "$STAGE/index.html" "$LIVE/.index.$RELEASE.html"
mv "$LIVE/.index.$RELEASE.html" "$LIVE/index.html"
nginx -s reload
curl --silent --fail https://admin.satyatech.org/dashboard/chapter > "$BACKUP/frontend-health.html"
cmp "$STAGE/index.html" "$BACKUP/frontend-health.html"
trap - ERR
printf 'FRONTEND_DEPLOYED=%s\nBACKUP=%s\n' "$RELEASE" "$BACKUP"
