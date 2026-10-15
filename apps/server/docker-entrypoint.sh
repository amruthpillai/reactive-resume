#!/bin/sh
set -eu

data="${LOCAL_STORAGE_PATH:-/app/data}"

if [ "${CLOUDRON:-}" = "1" ]; then
	# Cloudron supplies no app secrets: generate them once and keep them with the data, so restarts and restores reuse
	# them. The rename publishes the file only once both are written, so a failed start never leaves a partial one.
	secrets="$data/.secrets"
	if [ ! -f "$secrets" ]; then
		# A leftover temp file would keep its old mode; a fresh one gets 600 from the umask.
		rm -f "$secrets.tmp"
		(umask 077 && node -e 'for (const key of ["AUTH_SECRET", "ENCRYPTION_SECRET"]) console.log(`${key}=${crypto.randomBytes(32).toString("hex")}`)' >"$secrets.tmp")
		mv "$secrets.tmp" "$secrets"
	fi
	export AUTH_SECRET="${AUTH_SECRET:-$(sed -n 's/^AUTH_SECRET=//p' "$secrets")}"
	export ENCRYPTION_SECRET="${ENCRYPTION_SECRET:-$(sed -n 's/^ENCRYPTION_SECRET=//p' "$secrets")}"

	# Cloudron mounts the data directory root-owned and restores backups as root: give it to `node`. -h changes a
	# symlink itself, never the file it points to, so links planted in the data can't claim system files.
	if [ "$(id -u)" = "0" ]; then find "$data" ! -user node -exec chown -h node:node {} +; fi
fi

# The app never runs as root.
if [ "$(id -u)" = "0" ]; then exec setpriv --reuid=node --regid=node --init-groups "$@"; fi

exec "$@"
