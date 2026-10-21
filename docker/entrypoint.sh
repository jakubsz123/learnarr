#!/bin/sh
# Run as PUID:PGID, the *arr convention, so files in /config belong to the
# user who mounted it. Started as root only to hand /config over.
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R "$PUID:$PGID" "$DATA_DIR"
  exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups "$@"
fi

exec "$@"
