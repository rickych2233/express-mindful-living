# Deployment

The scripts in this directory are the versioned equivalents of the workspace deployment helpers.
Keep the frontend repository in the sibling directory `../admin-mindful-living`.

From the backend repository:

```sh
bash deployment/deploy-backend.sh
bash deployment/deploy-frontend.sh
```

Backend deployment runs tests, installs production dependencies in a staging directory, checks existing section data, backs up the application and database, preserves the server `.env` and uploads, restarts PM2, and checks API health. Frontend deployment backs up the current frontend, installs assets before switching `index.html`, and verifies the public response. Both scripts restore the application backup if post-install verification fails.

Requirements: authorized SSH access to `root@satyatech.org`, Node/npm locally and remotely, remote PostgreSQL backup tools, nginx and PM2. Credentials are never included in the release archive.

`DEPLOY_RELEASE` can specify a unique release name shared by sequential backend and frontend deploys. Existing backup names cannot be overwritten.

`DEPLOYMENT-20261021.md` records the chapter/media release. `verification-production.json` contains only verification counts and translated example text. `fix-media-route.sh` documents the one-time nginx repair for that release; it is not run by the normal deploy scripts. The nginx template is a reference and must be adapted to the actual server directories and TLS configuration before use.
