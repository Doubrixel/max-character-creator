# Max Character Creator

## Documentation

- [`docs/technische-dokumentation.md`](docs/technische-dokumentation.md) – Technical
  guide: Entweder/Oder choice of culture alternatives in the character creation
  „Kultur" step (components, data flow, validation, persistence, tests).
- [`docs/anwenderhandbuch.md`](docs/anwenderhandbuch.md) – User manual (German):
  choosing culture alternatives during character creation.
- [`docs/KULTUREDITOR-REGELN.md`](docs/KULTUREDITOR-REGELN.md) – Technical rules and
  validation of the library culture editor (talent/strength limits, Entweder/Oder
  alternatives, all message texts).
- [`docs/ANWENDER-KULTUREDITOR.md`](docs/ANWENDER-KULTUREDITOR.md) – User manual
  (German): creating cultures with talents, one strength, and equal-value
  Entweder/Oder alternatives.

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

## Testmodus (`SYSTEM=TEST`)

Der Testmodus ergänzt auf jedem Schritt der Charaktererstellung den Button
„Zufällig ausfüllen". Er setzt ausschließlich die Felder des aktuellen Schritts
mit zufälligen, gültigen Werten (synthetische Daten); Validierung, Datenmodell,
Persistenz und der reguläre „Weiter"-Ablauf bleiben unverändert. Der Button ist
nur sichtbar, wenn die **serverseitig** gestartete Instanz mit `SYSTEM=TEST`
läuft. Es gibt bewusst keinen clientseitigen Schalter.

```bash
SYSTEM=TEST npm start                  # direkter Start des Servers
SYSTEM=TEST docker compose up --build  # Compose reicht SYSTEM in den Container
```

Der Gate lässt sich direkt prüfen:

```bash
curl -s http://localhost:3000/api/config   # {"testMode":true} mit SYSTEM=TEST
                                           # {"testMode":false} ohne die Variable
```

Ohne `SYSTEM=TEST` erscheint kein Button und das Verhalten entspricht exakt dem
Ist-Zustand. Für die native systemd-Installation (Main/QA) wird die Variable beim
Deployment aus der Aufruf-Umgebung in die release-lokale `.release.env`
übernommen, die der Dienst per `EnvironmentFile` liest, z. B.
`SYSTEM=TEST mcc-deploy-commit main`. Ein normaler Timer-Update ohne `SYSTEM`
setzt das Flag wieder zurück.

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
