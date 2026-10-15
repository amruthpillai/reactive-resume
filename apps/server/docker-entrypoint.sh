#!/bin/sh
set -eu

data="${LOCAL_STORAGE_PATH:-/app/data}"

# Cloudron supplies no app secrets: generate them once and keep them with the data, so restarts and restores reuse them.
if [ "${CLOUDRON:-}" = "1" ]; then
	secrets="$data/.secrets"
	if [ ! -f "$secrets" ]; then
		(umask 077 && node -e 'for (const key of ["AUTH_SECRET", "ENCRYPTION_SECRET"]) console.log(`${key}=${crypto.randomBytes(32).toString("hex")}`)' >"$secrets")
	fi
	export AUTH_SECRET="${AUTH_SECRET:-$(sed -n 's/^AUTH_SECRET=//p' "$secrets")}"
	export ENCRYPTION_SECRET="${ENCRYPTION_SECRET:-$(sed -n 's/^ENCRYPTION_SECRET=//p' "$secrets")}"
fi

# Started as root: give the data directory to `node` (volumes are often created root-owned), then drop privileges.
if [ "$(id -u)" = "0" ]; then
	# -h: change a symlink itself, never the file it points to, so links planted in the data can't claim system files.
	find "$data" ! -user node -exec chown -h node:node {} +
	exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
