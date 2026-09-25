#!/bin/sh
# Starts as root only long enough to give the data dir to UID:GID (from .env, default 1000),
# then runs the server as that user. Docker creates a missing ./data bind mount as root,
# so without this the api couldn't write its profile or uploads.
set -e

# Started as a non-root user (e.g. an older compose file with `user:`): nothing to fix, just run.
[ "$(id -u)" = 0 ] || exec "$@"

uid="${UID:-1000}"
gid="${GID:-1000}"
mkdir -p "$DATA_DIR/uploads"
chown -R "$uid:$gid" "$DATA_DIR"
exec su-exec "$uid:$gid" "$@"
