#!/bin/sh
# INT-000018 – Helfer für den SYSTEM=TEST-Deployment-Gate.
#
# Schreibt die release-lokale .release.env ausschließlich aus der
# Aufruf-Umgebung: nur SYSTEM=TEST aktiviert den Testmodus. Bei `refresh`
# wird zusätzlich der Dienst neu gestartet, weil systemd die EnvironmentFile
# nur beim Start eines Prozesses liest – ein reines `systemctl start` wäre für
# einen bereits laufenden Dienst ein No-op und ließe einen veralteten
# SYSTEM-Wert im laufenden Node-Prozess (/api/config bliebe falsch).
#
# Usage:
#   mcc-release-env.sh write   <env_file> <commit_sha>
#   mcc-release-env.sh refresh <env_file> <commit_sha> <service>
set -eu

APP_GROUP=${APP_GROUP:-root}

if [ "$#" -lt 3 ]; then
  printf '%s\n' 'Usage: mcc-release-env.sh write|refresh <env_file> <commit_sha> [service]' >&2
  exit 2
fi

action=$1
env_file=$2
commit_sha=$3

write_env() {
  tmp_env_file="$env_file.$$"
  {
    printf 'APP_GIT_SHA=%s\n' "$commit_sha"
    if [ "${SYSTEM:-}" = "TEST" ]; then
      printf 'SYSTEM=TEST\n'
    fi
  } > "$tmp_env_file"
  chown "root:$APP_GROUP" "$tmp_env_file" 2>/dev/null || true
  chmod 0640 "$tmp_env_file"
  mv -f "$tmp_env_file" "$env_file"
}

case "$action" in
  write)
    write_env
    ;;
  refresh)
    write_env
    # systemd liest EnvironmentFile nur beim (Neu-)Start des Prozesses.
    # `restart` startet eine inaktive Unit ebenfalls und ist damit in beiden
    # Fällen korrekt; `start` würde bei einem aktiven Dienst nichts bewirken.
    systemctl restart "$4"
    ;;
  *)
    printf 'Unknown action: %s\n' "$action" >&2
    exit 2
    ;;
esac
