#!/bin/sh
# ──────────────────────────────────────────────
# EthioBanksHub — Database Backup Script
# ──────────────────────────────────────────────
# Runs inside the backup container via cron (daily at 3 AM)
# Backups: PostgreSQL full dump + Redis RDB snapshot
# Retention: Configurable via BACKUP_RETENTION_DAYS (default 30)
# Optional: Sync to S3 if AWS credentials are configured

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DATE_STAMP="$(date +%Y-%m-%d)"
LOG_FILE="${BACKUP_DIR}/backup-${DATE_STAMP}.log"

# DB config
PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${POSTGRES_USER:-ethiobanks}"
PG_PASSWORD="${POSTGRES_PASSWORD}"
PG_DB="${POSTGRES_DB:-ethiobankshub}"

# Redis config
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# S3 config (optional)
S3_BUCKET="${AWS_S3_BUCKET:-}"

mkdir -p "${BACKUP_DIR}/{postgres,redis,logs}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Backup started: ${TIMESTAMP} ==="

# ── PostgreSQL Dump ───────────────────────────────────────────
backup_postgres() {
  local filename="postgres-${PG_DB}-${TIMESTAMP}.sql.gz"
  local filepath="${BACKUP_DIR}/postgres/${filename}"

  log "PostgreSQL: Starting backup of ${PG_DB}..."

  export PGPASSWORD="${PG_PASSWORD}"
  if pg_dump \
    -h "${PG_HOST}" \
    -p "${PG_PORT}" \
    -U "${PG_USER}" \
    -d "${PG_DB}" \
    --no-owner \
    --no-acl \
    --compress=9 \
    --format=plain \
    --verbose \
    2>>"$LOG_FILE" \
    | gzip > "${filepath}"; then

    local size
    size="$(du -h "${filepath}" | cut -f1)"
    log "PostgreSQL: Backup complete (${size}) — ${filename}"

    # Create latest symlink
    ln -sf "${filename}" "${BACKUP_DIR}/postgres/latest.sql.gz"
  else
    log "PostgreSQL: BACKUP FAILED!"
    return 1
  fi

  unset PGPASSWORD
}

# ── Redis RDB Copy ────────────────────────────────────────────
backup_redis() {
  local filename="redis-${TIMESTAMP}.rdb"
  local filepath="${BACKUP_DIR}/redis/${filename}"

  log "Redis: Starting backup..."

  if redis-cli \
    -h "${REDIS_HOST}" \
    -p "${REDIS_PORT}" \
    -a "${REDIS_PASSWORD}" \
    --no-auth-warning \
    SAVE > /dev/null 2>&1; then

    # Use redis-cli --rdb to download snapshot (works across containers)
    if redis-cli \
      -h "${REDIS_HOST}" \
      -p "${REDIS_PORT}" \
      -a "${REDIS_PASSWORD}" \
      --no-auth-warning \
      --rdb "${filepath}" > /dev/null 2>&1; then

      local size
      size="$(du -h "${filepath}" | cut -f1)"
      log "Redis: Backup complete (${size}) — ${filename}"

      # Create latest symlink
      ln -sf "${filename}" "${BACKUP_DIR}/redis/latest.rdb"
    else
      log "Redis: BACKUP FAILED!"
      return 1
    fi
  else
    log "Redis: SAVE command failed!"
    return 1
  fi
}

# ── Cleanup Old Backups ───────────────────────────────────────
cleanup_old_backups() {
  log "Cleanup: Removing backups older than ${RETENTION_DAYS} days..."

  local removed_pg=0
  local removed_redis=0

  removed_pg=$(find "${BACKUP_DIR}/postgres" -name "*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
  removed_redis=$(find "${BACKUP_DIR}/redis" -name "*.rdb" -type f -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
  find "${BACKUP_DIR}/logs" -name "*.log" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

  log "Cleanup: Removed ${removed_pg} PostgreSQL backups, ${removed_redis} Redis backups"
}

# ── Sync to S3 (Optional) ────────────────────────────────────
sync_to_s3() {
  if [ -z "${S3_BUCKET}" ]; then
    log "S3: No bucket configured, skipping sync"
    return 0
  fi

  log "S3: Syncing to s3://${S3_BUCKET}/backups/..."

  if aws s3 sync \
    "${BACKUP_DIR}" \
    "s3://${S3_BUCKET}/backups/" \
    --exclude "*.log" \
    --storage-class STANDARD_IA \
    --no-progress \
    2>>"$LOG_FILE"; then
    log "S3: Sync complete"
  else
    log "S3: SYNC FAILED!"
    return 1
  fi
}

# ── Verify Latest Backup ──────────────────────────────────────
verify_latest() {
  log "Verification: Checking latest backups..."

  local pg_latest="${BACKUP_DIR}/postgres/latest.sql.gz"
  if [ -f "$pg_latest" ] && [ -s "$pg_latest" ]; then
    local pg_size
    pg_size="$(zcat "${pg_latest}" | wc -c)"
    log "Verification: PostgreSQL backup is valid (${pg_size} bytes uncompressed)"
  else
    log "Verification: PostgreSQL latest backup is MISSING or EMPTY!"
    return 1
  fi

  local redis_latest="${BACKUP_DIR}/redis/latest.rdb"
  if [ -f "$redis_latest" ] && [ -s "$redis_latest" ]; then
    log "Verification: Redis backup exists"
  else
    log "Verification: Redis latest backup is MISSING or EMPTY!"
    return 1
  fi
}

# ── Main ──────────────────────────────────────────────────────
ERRORS=0

backup_postgres || ERRORS=$((ERRORS + 1))
backup_redis || ERRORS=$((ERRORS + 1))
cleanup_old_backups
sync_to_s3 || ERRORS=$((ERRORS + 1))
verify_latest || ERRORS=$((ERRORS + 1))

log "=== Backup finished: ${TIMESTAMP} (errors: ${ERRORS}) ==="

if [ "${ERRORS}" -gt 0 ]; then
  log "WARNING: ${ERRORS} error(s) occurred during backup"
  exit 1
fi

exit 0
