#!/bin/bash
set -euo pipefail
BACKUP=/var/backups/satyatech/20261021-chapter-media-02
mkdir -p "$BACKUP/nginx"
cp -an /etc/nginx/conf.d/satyatech.conf /etc/nginx/conf.d/mindful-ip.conf "$BACKUP/nginx/"
rollback() {
  code=$?
  trap - ERR
  cp "$BACKUP/nginx/satyatech.conf" "$BACKUP/nginx/mindful-ip.conf" /etc/nginx/conf.d/
  nginx -t && nginx -s reload
  exit "$code"
}
trap rollback ERR
python3 - <<'PY'
from pathlib import Path
route='''    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

'''
for filename in ['satyatech.conf','mindful-ip.conf']:
 p=Path('/etc/nginx/conf.d')/filename
 content=p.read_text()
 if 'location /uploads/' not in content:
  assert content.count('    location /api/ {')==1
  content=content.replace('    location /api/ {',route+'    location /api/ {')
  p.write_text(content)
PY
nginx -t
nginx -s reload
trap - ERR
echo MEDIA_ROUTE_UPDATED
