#!/usr/bin/env bash
set -euo pipefail

# Backup MongoDB + file arsip (filesystem) dari deployment docker compose.
# Bisa dijalankan manual atau via cron/systemd timer.

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.docker}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.yml}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-$PROJECT_DIR/backups}"
KEEP_LAST="${KEEP_LAST:-14}"
OFFSITE_REMOTE="${OFFSITE_REMOTE:-}" # contoh: "remote:arsipkpu-backup"

log() {
  printf '[backup] %s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Perintah wajib tidak ditemukan: $1" >&2
    exit 1
  }
}

require_cmd docker
require_cmd tar
require_cmd sha256sum

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ENV file tidak ditemukan: $ENV_FILE" >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  awk -F= -v k="$key" '$1==k {print substr($0, index($0, "=")+1); exit}' "$ENV_FILE"
}

MONGO_ROOT_USERNAME="$(read_env_value MONGO_ROOT_USERNAME)"
MONGO_ROOT_PASSWORD="$(read_env_value MONGO_ROOT_PASSWORD)"
MONGO_DB_NAME="$(read_env_value MONGO_DB_NAME)"
ARCHIVE_HOST_PATH="$(read_env_value ARCHIVE_HOST_PATH)"

MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-admin}"
MONGO_DB_NAME="${MONGO_DB_NAME:-kpuarchive}"
ARCHIVE_HOST_PATH="${ARCHIVE_HOST_PATH:-./storage}"

if [[ -z "$MONGO_ROOT_PASSWORD" ]]; then
  echo "MONGO_ROOT_PASSWORD kosong di $ENV_FILE" >&2
  exit 1
fi

if [[ "$ARCHIVE_HOST_PATH" = /* ]]; then
  ARCHIVE_PATH="$ARCHIVE_HOST_PATH"
else
  ARCHIVE_PATH="$PROJECT_DIR/$ARCHIVE_HOST_PATH"
fi

if [[ ! -d "$ARCHIVE_PATH" ]]; then
  echo "Folder arsip tidak ditemukan: $ARCHIVE_PATH" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$BACKUP_BASE_DIR/$TS"
mkdir -p "$RUN_DIR"

log "Mulai backup: $RUN_DIR"

log "Dump MongoDB..."
docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  exec -T mongo mongodump \
    --archive \
    --gzip \
    --username "$MONGO_ROOT_USERNAME" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db "$MONGO_DB_NAME" >"$RUN_DIR/mongo.archive.gz"

log "Backup file arsip..."
tar -C "$ARCHIVE_PATH" -czf "$RUN_DIR/storage.tar.gz" .

cp "$ENV_FILE" "$RUN_DIR/env.snapshot"

log "Hitung checksum..."
(
  cd "$RUN_DIR"
  sha256sum mongo.archive.gz storage.tar.gz env.snapshot >checksums.sha256
)

cat >"$RUN_DIR/backup.meta" <<EOF
timestamp=$TS
project_dir=$PROJECT_DIR
env_file=$ENV_FILE
archive_path=$ARCHIVE_PATH
mongo_db=$MONGO_DB_NAME
EOF

log "Cleanup backup lama (keep last $KEEP_LAST)..."
if [[ "$KEEP_LAST" =~ ^[0-9]+$ ]] && [[ "$KEEP_LAST" -ge 1 ]]; then
  mapfile -t OLD_DIRS < <(find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
  COUNT="${#OLD_DIRS[@]}"
  if [[ "$COUNT" -gt "$KEEP_LAST" ]]; then
    DELETE_COUNT=$((COUNT - KEEP_LAST))
    for ((i = 0; i < DELETE_COUNT; i++)); do
      log "Hapus backup lama: ${OLD_DIRS[$i]}"
      rm -rf "${OLD_DIRS[$i]}"
    done
  fi
fi

if [[ -n "$OFFSITE_REMOTE" ]]; then
  require_cmd rclone
  log "Upload offsite ke $OFFSITE_REMOTE ..."
  rclone copy "$RUN_DIR" "$OFFSITE_REMOTE/$TS" --create-empty-src-dirs
fi

log "Selesai. Backup tersedia di: $RUN_DIR"
