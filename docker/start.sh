#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Error: neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

echo "Stopping existing containers (if running)..."
sh -c "$COMPOSE_CMD -f \"$COMPOSE_FILE\" down"

echo "Starting containers..."
sh -c "$COMPOSE_CMD -f \"$COMPOSE_FILE\" up -d"

echo "Done."
