#!/bin/sh
set -eu

APP_USER=maxcc
APP_GROUP=maxcc
APP_HOME=/var/lib/maxcc
REPO_URL=https://github.com/Doubrixel/max-character-creator.git
REPO_DIR=/var/lib/repo-sync/max-character-creator.git
APP_ROOT=/srv/max-character-creator
RELEASES=$APP_ROOT/releases
CURRENT=$APP_ROOT/current
DATA_DIR=/var/lib/max-character-creator
DATABASE=$DATA_DIR/sqlite.db
BACKUP_DIR=/var/backups/max-character-creator
STATE=$DATA_DIR/deployed-commit
IMPORT_MARKER=/etc/max-character-creator/data-import-verified
SERVICE=max-character-creator.service
NODE_BIN_DIR=/opt/node/bin
NODE=$NODE_BIN_DIR/node
NPM=$NODE_BIN_DIR/npm
PORT=3000
LOCK=/run/lock/max-character-creator-deploy.lock

log() {
  logger -t max-character-creator-deploy "$*" 2>/dev/null || true
}

fail() {
  log "ERROR: $*"
  printf '%s\n' "$*" >&2
  exit 1
}

if [ "$(id -u)" -ne 0 ]; then
  fail 'The deployment command must run as root.'
fi

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  fail 'Usage: deploy-commit.sh main | stable <full-commit-sha>'
fi

mode=$1
case "$mode" in
  main)
    [ "$#" -eq 1 ] || fail 'Main deployment does not accept a caller-selected SHA.'
    requested_sha=
    ;;
  stable)
    [ "$#" -eq 2 ] || fail 'Stable promotion requires one full commit SHA.'
    requested_sha=$(printf '%s' "$2" | tr 'A-F' 'a-f')
    case "$requested_sha" in
      *[!0-9a-f]*|'') fail 'Stable promotion requires a hexadecimal commit SHA.' ;;
    esac
    case "${#requested_sha}" in
      40|64) ;;
      *) fail 'Stable promotion requires a full 40- or 64-character commit SHA.' ;;
    esac
    ;;
  *)
    fail 'Only main deployment and explicit stable promotion are supported.'
    ;;
esac

if [ "$mode" = main ]; then
  exec 9>"$LOCK"
  flock -n 9 || exit 0
else
  exec 9>"$LOCK"
  flock -w 1800 9 || fail 'Timed out waiting for another deployment to finish.'
fi

[ -x "$NODE" ] || fail "Node.js runtime is missing at $NODE."
[ -x "$NPM" ] || fail "npm is missing at $NPM."
command -v runuser >/dev/null 2>&1 || fail 'runuser is required.'
command -v git >/dev/null 2>&1 || fail 'git is required.'
command -v flock >/dev/null 2>&1 || fail 'flock is required.'
command -v curl >/dev/null 2>&1 || fail 'curl is required.'
command -v sqlite3 >/dev/null 2>&1 || fail 'sqlite3 is required for rollback-safe deployment.'
systemctl cat "$SERVICE" >/dev/null 2>&1 || fail "$SERVICE is not installed."

install -d -o root -g "$APP_GROUP" -m 0750 "$APP_ROOT" "$RELEASES"
install -d -o root -g root -m 0700 "$BACKUP_DIR"
if [ ! -d "$DATA_DIR" ]; then
  install -d -o "$APP_USER" -g "$APP_GROUP" -m 0750 "$DATA_DIR"
fi

if [ "$mode" = stable ]; then
  [ -s "$IMPORT_MARKER" ] || fail 'Stable data import has not been explicitly verified.'
  marker_owner_mode=$(stat -c '%u:%a' "$IMPORT_MARKER") || fail 'Could not inspect the Stable import marker.'
  [ "$marker_owner_mode" = '0:600' ] || fail 'Stable import marker must be root-owned with mode 0600.'
  grep -Fxq 'verification=passed' "$IMPORT_MARKER" \
    || fail 'Stable data import verification marker is invalid.'
  grep -Eq '^source_sha256=[0-9a-f]{64}$' "$IMPORT_MARKER" \
    || fail 'Stable import marker must contain the source backup SHA-256.'
  grep -Eq '^characters=[0-9]+$' "$IMPORT_MARKER" \
    || fail 'Stable import marker must contain the verified character row count.'
  [ -s "$DATABASE" ] || fail 'Stable database has not been imported; refusing first promotion.'
  integrity=$(sqlite3 "$DATABASE" 'PRAGMA integrity_check;') \
    || fail 'Could not validate the imported Stable database.'
  [ "$integrity" = ok ] || fail "Stable database integrity check failed: $integrity"
  has_characters=$(sqlite3 "$DATABASE" \
    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='characters';") \
    || fail 'Could not inspect the imported Stable database schema.'
  [ "$has_characters" = 1 ] || fail 'Stable database does not contain the characters table.'
fi

if [ ! -d "$REPO_DIR" ]; then
  install -d -o repo-sync -g repo-sync -m 0750 /var/lib/repo-sync
  runuser -u repo-sync -- env HOME=/var/lib/repo-sync GIT_TERMINAL_PROMPT=0 \
    git clone --bare "$REPO_URL" "$REPO_DIR"
fi

repo_git() {
  runuser -u repo-sync -- env HOME=/var/lib/repo-sync GIT_TERMINAL_PROMPT=0 \
    git --git-dir="$REPO_DIR" "$@"
}

remote=$(repo_git remote get-url origin)
[ "$remote" = "$REPO_URL" ] || fail "Unexpected repository remote: $remote"
repo_git fetch --quiet --prune origin +refs/heads/main:refs/remotes/origin/main
main_sha=$(repo_git rev-parse --verify 'refs/remotes/origin/main^{commit}')

if [ "$mode" = main ]; then
  target=$main_sha
else
  target=$requested_sha
  resolved=$(repo_git rev-parse --verify "$target^{commit}" 2>/dev/null || true)
  [ "$resolved" = "$target" ] || fail "Commit $target is not available in the configured repository."
  if ! repo_git merge-base --is-ancestor "$target" refs/remotes/origin/main; then
    fail "Commit $target is not an ancestor of the current main branch."
  fi
fi

case "$target" in
  *[!0-9a-f]*|'') fail 'Resolved an invalid commit SHA.' ;;
esac
case "${#target}" in
  40|64) ;;
  *) fail 'Resolved a commit SHA with an unexpected length.' ;;
esac

if [ "$mode" = main ] && [ "$target" != "$main_sha" ]; then
  fail 'Main changed while the deployment target was being resolved.'
fi

release="$RELEASES/$target"
staging=
archive=
cleanup() {
  if [ -n "$archive" ]; then rm -f -- "$archive"; fi
  if [ -n "$staging" ] && [ -d "$staging" ]; then rm -rf -- "$staging"; fi
}
trap cleanup EXIT HUP INT TERM

run_app() {
  directory=$1
  shift
  runuser -u "$APP_USER" -- env \
    HOME="$APP_HOME" \
    PATH="$NODE_BIN_DIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    /bin/sh -c 'cd "$1" && shift && exec "$@"' sh "$directory" "$@"
}

if [ -d "$release" ]; then
  grep -Fxq "APP_GIT_SHA=$target" "$release/.release.env" \
    || fail "Existing release directory does not identify commit $target."
else
  staging=$(mktemp -d "$RELEASES/.staging-${target}.XXXXXX")
  archive=$(mktemp /tmp/max-character-creator-archive.XXXXXX)
  repo_git archive "$target" > "$archive"
  tar -xf "$archive" -C "$staging"
  rm -f -- "$archive"
  archive=
  printf 'APP_GIT_SHA=%s\n' "$target" > "$staging/.release.env"
  chown -R "$APP_USER:$APP_GROUP" "$staging"

  run_app "$staging" "$NPM" ci --omit=peer
  run_app "$staging" "$NPM" audit --omit=dev --omit=peer
  run_app "$staging" "$NPM" test
  run_app "$staging" "$NPM" run typecheck --workspace=backend
  run_app "$staging" "$NPM" run build --workspace=frontend
  run_app "$staging" "$NPM" ci --omit=dev --omit=peer
  run_app "$staging" "$NPM" audit --omit=dev --omit=peer

  [ -f "$staging/frontend/dist/index.html" ] || fail 'The frontend build did not produce index.html.'
  [ -f "$staging/backend/src/server.ts" ] || fail 'The backend entry point is missing.'
  chown -R root:"$APP_GROUP" "$staging"
  chmod -R u=rwX,g=rX,o= "$staging"
  mv "$staging" "$release"
  staging=
fi

old_link=$(readlink "$CURRENT" 2>/dev/null || true)
if [ -e "$CURRENT" ] && [ ! -L "$CURRENT" ]; then
  fail "$CURRENT exists but is not a symlink; refusing to replace it."
fi
old_sha=${old_link##*/}

wait_for_commit() {
  expected=$1
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    body=$(curl -fsS --max-time 2 "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)
    case "$body" in
      *"\"commitSha\":\"$expected\""*) return 0 ;;
    esac
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

table_count() {
  file=$1
  table=$2
  sqlite3 "$file" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$table';"
}

row_count() {
  file=$1
  table=$2
  sqlite3 "$file" "SELECT COUNT(*) FROM \"$table\";"
}

verify_data_counts() {
  [ "$had_database" -eq 1 ] || return 0
  for table in characters character_steps character_xp_log character_skills character_resources \
    character_items character_spells races cultures trainings masteries spells resources items \
    statblocks derived_values strengths weaknesses skills; do
    before_present=$(table_count "$backup" "$table") || return 1
    [ "$before_present" -eq 1 ] || continue
    after_present=$(table_count "$DATABASE" "$table") || return 1
    if [ "$after_present" -ne 1 ]; then
      log "Data verification failed: table $table disappeared after migration."
      return 1
    fi
    before=$(row_count "$backup" "$table") || return 1
    after=$(row_count "$DATABASE" "$table") || return 1
    if [ "$after" -lt "$before" ]; then
      log "Data verification failed: $table rows decreased from $before to $after."
      return 1
    fi
  done
}

if [ "$old_sha" = "$target" ]; then
  systemctl start "$SERVICE"
  if wait_for_commit "$target"; then
    printf '%s\n' "$target" > "$STATE.$$"
    chown root:"$APP_GROUP" "$STATE.$$"
    chmod 0640 "$STATE.$$"
    mv -f "$STATE.$$" "$STATE"
    systemctl enable "$SERVICE" >/dev/null
    if [ "$mode" = stable ]; then printf 'STABLE_DEPLOYMENT_SHA=%s\n' "$target"; fi
    exit 0
  fi
fi

was_active=0
if systemctl is-active --quiet "$SERVICE"; then was_active=1; fi
systemctl stop "$SERVICE"

had_database=0
backup=
if [ -f "$DATABASE" ]; then
  had_database=1
  backup=$(mktemp "$BACKUP_DIR/${mode}-${target}.XXXXXX")
  if ! sqlite3 "$DATABASE" ".backup '$backup'"; then
    if [ "$was_active" -eq 1 ]; then systemctl start "$SERVICE" || true; fi
    fail "SQLite backup failed; the previous release was not changed."
  fi
  if [ ! -s "$backup" ]; then
    if [ "$was_active" -eq 1 ]; then systemctl start "$SERVICE" || true; fi
    fail 'SQLite backup was empty; the previous release was not changed.'
  fi
  chown root:root "$backup"
  chmod 0600 "$backup"
fi

restore_previous() {
  systemctl stop "$SERVICE" >/dev/null 2>&1 || true
  if [ -n "$old_link" ]; then
    rollback_link="$APP_ROOT/.current.rollback.$$"
    ln -s "$old_link" "$rollback_link"
    mv -Tf "$rollback_link" "$CURRENT"
  else
    rm -f -- "$CURRENT"
  fi

  if [ "$had_database" -eq 1 ]; then
    restore_file="$DATA_DIR/.sqlite-rollback.$$"
    cp "$backup" "$restore_file"
    chown "$APP_USER:$APP_GROUP" "$restore_file"
    chmod 0640 "$restore_file"
    mv -f "$restore_file" "$DATABASE"
  else
    rm -f -- "$DATABASE"
  fi
  rm -f -- "$DATABASE-wal" "$DATABASE-shm"

  if [ "$was_active" -eq 1 ] && [ -n "$old_link" ]; then
    systemctl start "$SERVICE" || true
  fi
}

next_link="$APP_ROOT/.current.$target.$$"
ln -s "releases/$target" "$next_link"
mv -Tf "$next_link" "$CURRENT"
if ! systemctl start "$SERVICE"; then
  restore_previous
  fail "Service failed to start for $target; restored ${old_sha:-empty}."
fi
if ! wait_for_commit "$target"; then
  restore_previous
  fail "Health check did not report $target; restored ${old_sha:-empty}."
fi
if ! verify_data_counts; then
  restore_previous
  fail "SQLite row-count verification failed for $target; restored ${old_sha:-empty}."
fi

printf '%s\n' "$target" > "$STATE.$$"
chown root:"$APP_GROUP" "$STATE.$$"
chmod 0640 "$STATE.$$"
mv -f "$STATE.$$" "$STATE"
systemctl enable "$SERVICE" >/dev/null
log "Published $mode commit $target; previous=${old_sha:-empty}; backup=${backup:-none}"
if [ "$mode" = stable ]; then printf 'STABLE_DEPLOYMENT_SHA=%s\n' "$target"; fi
