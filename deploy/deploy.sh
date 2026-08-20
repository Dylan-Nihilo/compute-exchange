#!/bin/sh
set -eu

tag=${1:-}
case "$tag" in
  ""|*[!0-9a-f]*)
    echo "Invalid release tag: $tag" >&2
    exit 2
    ;;
esac

base=/opt/wanxiang/frontend
release_dir="$base/releases/$tag"
compose_file="$release_dir/compose.yml"
env_file="$base/.env"
candidate=wanxiang-frontend-candidate

for file in "$compose_file" "$release_dir/Caddyfile" "$env_file"; do
  test -s "$file" || { echo "Missing deployment file: $file" >&2; exit 1; }
done

previous=$(cat "$base/current-release")
case "$previous" in
  ""|*[!0-9a-f]*)
    echo "Invalid current release: $previous" >&2
    exit 1
    ;;
esac

previous_dir="$base/releases/$previous"
test -s "$previous_dir/compose.yml" || { echo "Missing rollback compose file" >&2; exit 1; }
test -s "$previous_dir/Caddyfile" || { echo "Missing rollback Caddyfile" >&2; exit 1; }
docker image inspect "wanxiang-frontend:$tag" >/dev/null
docker image inspect "wanxiang-frontend:$previous" >/dev/null
docker network inspect wanxiang-frontend_default >/dev/null

services=$(IMAGE_TAG="$tag" docker compose --env-file "$env_file" -f "$compose_file" config --services)
printf '%s\n' "$services" | grep -qx frontend
printf '%s\n' "$services" | grep -qx caddy
if printf '%s\n' "$services" | grep -qx backend; then
  echo "Frontend release must not manage a backend service" >&2
  exit 1
fi

docker run --rm \
  -v "$release_dir/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine \
  caddy validate --config /etc/caddy/Caddyfile >/dev/null

cleanup_candidate() {
  docker rm -f "$candidate" >/dev/null 2>&1 || true
}

wait_healthy() {
  container=$1
  attempts=0
  while [ "$attempts" -lt 60 ]; do
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)
    [ "$status" = healthy ] && return 0
    [ "$status" = exited ] && break
    [ "$status" = dead ] && break
    attempts=$((attempts + 1))
    sleep 2
  done
  docker logs --tail 100 "$container" >&2 || true
  return 1
}

check_auth_pages() {
  docker exec "$1" node -e '
    Promise.all(["/", "/auth/login", "/auth/register"].map(async (path) => {
      const response = await fetch(`http://127.0.0.1:3000${path}`);
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
    })).catch((error) => { console.error(error); process.exit(1); });
  '
}

rollback() {
  echo "Deployment failed; restoring $previous" >&2
  IMAGE_TAG="$previous" docker compose --env-file "$env_file" -f "$previous_dir/compose.yml" up -d --no-deps frontend || true
  wait_healthy wanxiang-frontend || true
  IMAGE_TAG="$previous" docker compose --env-file "$env_file" -f "$previous_dir/compose.yml" up -d --no-deps caddy || true
}

cleanup_candidate
trap cleanup_candidate 0 HUP INT TERM
docker run -d \
  --name "$candidate" \
  --network wanxiang-frontend_default \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -e AUTH_API_BASE_URL=http://wanxiang-backend:8080/api/v1 \
  -e HOSTNAME=0.0.0.0 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  "wanxiang-frontend:$tag" >/dev/null
wait_healthy "$candidate"
check_auth_pages "$candidate"
cleanup_candidate

if ! IMAGE_TAG="$tag" docker compose --env-file "$env_file" -f "$compose_file" up -d --no-deps frontend; then
  rollback
  exit 1
fi
if ! wait_healthy wanxiang-frontend || ! check_auth_pages wanxiang-frontend; then
  rollback
  exit 1
fi
if ! IMAGE_TAG="$tag" docker compose --env-file "$env_file" -f "$compose_file" up -d --no-deps caddy; then
  rollback
  exit 1
fi
if ! docker exec wanxiang-caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null; then
  rollback
  exit 1
fi
if ! curl -fsS https://omnisline.com/auth/login >/dev/null || \
   ! curl -fsS https://omnisline.com/auth/register >/dev/null; then
  rollback
  exit 1
fi

password_status=$(curl -sS -o /dev/null -w '%{http_code}' https://omnisline.com/api/v1/auth/login)
if [ "$password_status" != 404 ]; then
  echo "Legacy password endpoint returned $password_status, expected 404" >&2
  rollback
  exit 1
fi

printf '%s\n' "$tag" > "$base/current-release.tmp"
mv "$base/current-release.tmp" "$base/current-release"
echo "Frontend release $tag is healthy"
