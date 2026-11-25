# Native deployment operations

## Layout and users

The systemd units expect these paths:

- Application releases: `/srv/max-character-creator/releases/<full-sha>`
- Active release symlink: `/srv/max-character-creator/current`
- SQLite database: `/var/lib/max-character-creator/sqlite.db`
- Pre-deployment backups: `/var/backups/max-character-creator/`
- Read-only bare Git mirror: `/var/lib/repo-sync/max-character-creator.git`
- Node.js 24: `/opt/node/bin/node` and `/opt/node/bin/npm`

Create the `maxcc` service user/group and `repo-sync` user before installing the units:

```sh
groupadd --system maxcc
useradd --system --gid maxcc --home-dir /var/lib/maxcc --create-home --shell /usr/sbin/nologin maxcc
useradd --system --user-group --home-dir /var/lib/repo-sync --create-home --shell /usr/sbin/nologin repo-sync
install -d -o maxcc -g maxcc -m 0750 /var/lib/max-character-creator
install -d -o root -g maxcc -m 0750 /srv/max-character-creator /srv/max-character-creator/releases
install -d -o root -g root -m 0700 /var/backups/max-character-creator
install -d -o root -g root -m 0700 /etc/max-character-creator
```

Release directories are changed to `root:maxcc` and read-only to the service after
tests/builds. The deployment scripts run as root only to switch the release symlink,
manage systemd, and take/restore SQLite backups; npm install/build/test run as `maxcc`.

## Main/QA

Install the shared `max-character-creator.service`,
`max-character-creator-main-update.service`, and
`max-character-creator-main-update.timer` under `/etc/systemd/system/`. Install
`deploy-commit.sh` as `/usr/local/sbin/mcc-deploy-commit`, `mcc-release-env.sh` as
`/usr/local/sbin/mcc-release-env`, and `update-main.sh` as
`/usr/local/sbin/update-max-character-creator-main`, all mode `0755`. Then run
`systemctl daemon-reload` and enable the update timer. Main/QA has no write access to the
Stable SQLite directory.

`deploy-commit.sh` uses `mcc-release-env` to write the release-local `.release.env`
and, when re-deploying an already running commit, to restart the service. This is required
because systemd reads `EnvironmentFile` only when a process starts: without the restart a
changed `SYSTEM=TEST` flag would never reach the running Node process (and `/api/config`
would keep reporting the stale value). The deployment health check therefore also verifies
`/api/config` against the expected test-mode flag.

The timer fetches only the public `main` branch. The updater runs `npm ci --omit=peer`,
the production dependency audit, backend tests and type-check, and frontend build in a
staging release. It then installs only production dependencies with
`npm ci --omit=dev --omit=peer`, backs up the current SQLite database, switches the
symlink, and requires `/api/health` to report the target `APP_GIT_SHA`. A failure restores
the previous symlink and database. Do not copy any Stable database to Main/QA.

## Stable

Install the shared `max-character-creator.service` and `deploy-commit.sh` as above, but
do **not** install or enable the Main update timer. Stable receives a release only through
`promote-commit <full-sha>`; the command verifies that the full SHA is an ancestor of
GitHub `main`, repeats tests/build/audit, requires an imported database that passes
`PRAGMA integrity_check` and contains the `characters` table, and makes a SQLite backup
before startup migrations. It checks the exact SHA from `/api/health`, verifies that no
existing application table lost rows, and rolls code and SQLite back together on failure.
A successful invocation prints a `STABLE_DEPLOYMENT_SHA=<full-sha>` receipt line (in
addition to command logs).

Before the first Stable promotion, the SQLite import must be independently verified and
the root-only file `/etc/max-character-creator/data-import-verified` must contain the
exact lines `verification=passed`, `source_sha256=<64-lowercase-hex>`, and
`characters=<verified-row-count>`. The marker must be owned by root with mode `0600`.
The promotion command refuses to start Stable without this marker, a valid SQLite
integrity check, and the expected application schema.

For SSH, install `mcc-ssh-command.sh` as `/usr/local/sbin/mcc-ssh-command` and the
sudoers rule from `sudoers/max-character-creator-deploy`. Create a dedicated
`mcc-deploy` account with a locked password. Its only authorized key must use the
OpenSSH `restrict,command="/usr/local/sbin/mcc-ssh-command"` options; do not allow an
interactive shell, forwarding, SFTP, or agent access. Configure sshd for public-key-only
authentication and bind it to the Stable container's Tailnet IPv4 address. Keep the
host-specific address, private key, and pinned host key out of this repository. Verify
the server host-key fingerprint out-of-band before adding it to the Factory's
`known_hosts` file. The SSH service must start after Tailscale is online.

Validate the sudoers file with `visudo -cf` and the sshd config with `sshd -t` before
restarting either service. Disable `ssh.socket` so the socket-activated listener cannot
override the Tailnet-bound `ssh.service` configuration.

The Factory `stablePromotion` profile must remain disabled until the Factory's
human-identity/PO authorization boundary is resolved. A role header alone is not a
strong human identity check; keeping the target command restricted does not fix that
API-level authorization issue.

## Network and data safeguards

- Bind application traffic to private IPv4 interfaces; the app's Node listener uses
  `0.0.0.0:3000` (IPv4 only). Keep the containers on the private Proxmox bridge and
  Tailnet; do not add router port-forwarding, Tailscale Funnel, or a public proxy.
- The service has no application login. Limit Main/QA and Stable to the trusted LAN and
  Tailnet. Restrict Stable SSH to Tailnet.
- Never start Stable against an imported database until a verified backup exists. Use
  SQLite's online backup API (`sqlite3 <db> ".backup <backup-file>"`) while the service
  is stopped; verify the backup with `sqlite3 <backup-file> 'PRAGMA integrity_check;'`
  and compare table/row counts before releasing the service.
- Keep the previous Stable release and its matching pre-migration database backup until
  the new Stable release passes health and data verification.
