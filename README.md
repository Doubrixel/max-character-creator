# Max Character Creator

## Local development

Requires Node.js 24 and npm.

```bash
npm ci --omit=peer
npm run dev
```

Useful checks:

```bash
npm test
npm run typecheck --workspace=backend
npm run build --workspace=frontend
npm audit --omit=dev --omit=peer
```

The test suite creates and removes an isolated temporary SQLite database. The production
runtime uses `tsx` to start the TypeScript backend, so `tsx` is intentionally a production
dependency. Optional peer drivers are omitted; this application uses `@libsql/client`.

## Docker Compose

```bash
docker compose up --build
docker compose down
```

`docker compose down -v` deletes the persistent SQLite volume and should only be used when
you intentionally want to remove all local data.

## Native Node/systemd deployment

Production deployment targets use Node.js 24 and systemd in unprivileged Debian LXC
containers; Docker-in-LXC is not required. Main/QA follows the latest `main` commit only
after local install, production audit, backend tests/typecheck, frontend build, and the
health endpoint's commit-SHA check pass. Stable has no polling timer: it accepts only the
explicit `promote-commit <full-sha>` command, verifies that SHA is reachable from GitHub
`main`, repeats the checks, backs up SQLite before startup migrations, and rolls back the
release and database on a failed health check.

The systemd units, update/promotion commands, and installation notes are in [`ops/`](ops/README.md).
The CI workflow verifies changes but does not deploy to the former SSH/Docker host.
The `/api/health` response includes `commitSha` and the `X-Commit-SHA` header when
`APP_GIT_SHA` is set by the selected release.
