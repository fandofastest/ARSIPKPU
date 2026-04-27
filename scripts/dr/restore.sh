#!/usr/bin/env bash
set -euo pipefail

# Restore MongoDB + file arsip dari hasil backup scripts/dr/backup.sh
# Gunakan dengan hati-hati di production.

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.docker}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.yml}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") --backup-dir <path> [--db-only] [--files-only] [--yes]

Contoh:
  $(basename "$0") --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --yes
  $(basename "$0") --backup-dir /home/fando/arsipkpu/backups/20260417-120000 --db-only --yes
EOF
}

BACKUP_DIR=""
RESTORE_DB=1
RESTORE_FILES=1
AUTO_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir)
      BACKUP_DIR="${2:-}"
      shift 2
      ;;
    --db-only)
      RESTORE_DB=1
      RESTORE_FILES=0
      shift
      ;;
    --files-only)
      RESTORE_DB=0
      RESTORE_FILES=1
      shift
      ;;
    --yes)
      AUTO_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumen tidak dikenal: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BACKUP_DIR" ]]; then
  echo "--backup-dir wajib diisi." >&2
  usage
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "Backup directory tidak ditemukan: $BACKUP_DIR" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ENV file tidak ditemukan: $ENV_FILE" >&2
  exit 1
fi

if [[ "$RESTORE_DB" -eq 1 ]] && [[ ! -f "$BACKUP_DIR/mongo.archive.gz" ]]; then
  echo "File backup Mongo tidak ditemukan: $BACKUP_DIR/mongo.archive.gz" >&2
  exit 1
fi

if [[ "$RESTORE_FILES" -eq 1 ]] && [[ ! -f "$BACKUP_DIR/storage.tar.gz" ]]; then
  echo "File backup storage tidak ditemukan: $BACKUP_DIR/storage.tar.gz" >&2
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

if [[ "$AUTO_YES" -ne 1 ]]; then
  echo "PERINGATAN: restore akan menimpa data saat ini."
  echo "Backup source : $BACKUP_DIR"
  echo "Restore DB    : $RESTORE_DB"
  echo "Restore Files : $RESTORE_FILES"
  read -r -p "Lanjut restore? ketik 'yes' untuk konfirmasi: " CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    echo "Dibatalkan."
    exit 1
  fi
fi

echo "[restore] Stop app + worker..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop app ocr-worker >/dev/null

if [[ "$RESTORE_DB" -eq 1 ]]; then
  echo "[restore] Restore MongoDB..."
  cat "$BACKUP_DIR/mongo.archive.gz" | docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T mongo mongorestore \
      --archive \
      --gzip \
      --drop \
      --username "$MONGO_ROOT_USERNAME" \
      --password "$MONGO_ROOT_PASSWORD" \
      --authenticationDatabase admin \
      --db "$MONGO_DB_NAME"
fi

if [[ "$RESTORE_FILES" -eq 1 ]]; then
  echo "[restore] Restore file arsip ke: $ARCHIVE_PATH"
  mkdir -p "$ARCHIVE_PATH"
  find "$ARCHIVE_PATH" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -xzf "$BACKUP_DIR/storage.tar.gz" -C "$ARCHIVE_PATH"
fi

echo "[restore] Start app + worker..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d app ocr-worker >/dev/null

echo "[restore] Selesai."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
