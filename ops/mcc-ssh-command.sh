#!/bin/sh
set -eu

original_command=${SSH_ORIGINAL_COMMAND:-}
case "$original_command" in
  'promote-commit '*) requested_sha=${original_command#promote-commit } ;;
  *)
    printf '%s\n' 'Only promote-commit <full-sha> is allowed.' >&2
    exit 64
    ;;
esac

requested_sha=$(printf '%s' "$requested_sha" | tr 'A-F' 'a-f')
case "$requested_sha" in
  *[!0-9a-f]*|'')
    printf '%s\n' 'Stable promotion requires a hexadecimal commit SHA.' >&2
    exit 64
    ;;
esac
case "${#requested_sha}" in
  40|64) ;;
  *)
    printf '%s\n' 'Stable promotion requires a full 40- or 64-character commit SHA.' >&2
    exit 64
    ;;
esac

exec /usr/bin/sudo -n /usr/local/sbin/mcc-deploy-commit stable "$requested_sha"
