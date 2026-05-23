# Local development recipes. `just <recipe>`. Needs Docker Desktop.
# On Windows, `bash` shadows to the WSL launcher — use `sh` (git-bash) instead.
set shell := ["sh", "-cu"]
set windows-shell := ["C:\\Program Files\\Git\\bin\\sh.exe", "-cu"]

# List available recipes.
default:
    @just --list

# Populate ./node_modules on the host for IDE type resolution.
install:
    # Hoisted layout + fix-junctions because pnpm-in-Docker's symlinks aren't lstat-able on Windows.
    MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/work" -w /work node:24-slim \
        sh -c "corepack enable && pnpm install --frozen-lockfile --node-linker=hoisted"
    just fix-junctions

# Replace workspace symlinks with Windows junctions. See scripts/fix-windows-junctions.mjs.
fix-junctions:
    @node scripts/fix-windows-junctions.mjs

# Rebuild the app image and recreate the container.
rebuild:
    # Container serves a prebuilt bundle; restart after editing under packages/ or apps/.
    docker compose build reactive_resume
    docker compose up -d --no-deps reactive_resume
    just wait-healthy

# Restart the running container without rebuilding.
restart:
    docker compose restart reactive_resume
    just wait-healthy

# Bring up the full stack (postgres, redis, seaweedfs, app).
up:
    docker compose up -d
    just wait-healthy

# Stop and remove all containers (data volumes are preserved).
down:
    docker compose down

# Tail logs from the app container.
logs:
    docker compose logs -f reactive_resume

# Block until /api/health returns 200.
wait-healthy:
    @until curl -fs http://localhost:3000/api/health >/dev/null 2>&1; do sleep 2; done
    @echo "✓ app healthy at http://localhost:3000"

# Open a psql shell against the dev database.
psql:
    docker compose exec -e PGPASSWORD=postgres postgres psql -U postgres -d postgres
