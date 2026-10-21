# Production deployment — 21 October 2026

Status: completed. Backend and frontend release: `20261021-chapter-media-02`.

## Verification

- 20 tests passed against an isolated PostgreSQL database, including chapter/section save and rollback after failed media insertion.
- Frontend production build passed; deployed JavaScript hash matches local build and public HTTPS response.
- Production API: all 42 chapters, 18 sections, and 20 media attachments readable.
- Real auto translation succeeded for Indonesian, French, Russian, Spanish; HTML formatting and media positions preserved.
- Existing uploaded video returned HTTP 206 with video content type.
- Existing nginx configuration lacked `/uploads/`; a backed-up, syntax-checked proxy route was added.
- PM2 process `satyatech-api` online; original production `.env` hash unchanged.
- No application records were created or edited during production verification. Production save testing was replaced with non-mutating checks after automatic review rejected adding a draft and sample image.
- Summary: `verification-production.json`.

## Server backups

Original application including uploads and original database:
`/var/backups/satyatech/20261021-chapter-media-01/backend.tgz`
`/var/backups/satyatech/20261021-chapter-media-01/database.dump`

Final deployment backup, frontend backup, nginx configuration backup, verification:
`/var/backups/satyatech/20261021-chapter-media-02/`

Database changes only add nullable `duration` and `instructions` columns on `section_contents`. Existing application content is preserved.

## Application rollback

If rollback is needed, restore frontend and original application archives on the server, then restart PM2:

```sh
tar -xzf /var/backups/satyatech/20261021-chapter-media-02/frontend.tgz -C /var/www/satyatech/frontend
pm2 stop satyatech-api
tar -xzf /var/backups/satyatech/20261021-chapter-media-01/backend.tgz -C /var/www/satyatech/backend
pm2 restart satyatech-api
nginx -t && nginx -s reload
```

Keep the corrected `/uploads/` route. The two additive database columns can remain when rolling application code back. Do not restore the database dump merely to roll back code: restoring the database would replace changes made after the backup.
