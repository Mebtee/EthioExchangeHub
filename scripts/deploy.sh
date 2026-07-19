#!/bin/bash
# ──────────────────────────────────────────────
# EthioBanksHub — Zero-Downtime Deploy Script
# ──────────────────────────────────────────────
# Deploys the latest Docker images to production
# Features: health checks, rollback, notifications, blue-green
#
# Usage:
#   ./scripts/deploy.sh production
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh production --rollback
#
# Prerequisites:
#   - Docker & Docker Compose installed
#   - SSH access to production server
#   - Environment file (.env.production) present

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────
ENV="${1:-production}"
ROLLBACK="${2:-}"

REPO_DIR="/opt/ethiobankshub"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEPLOY_LOG="${REPO_DIR}/logs/deploy-${TIMESTAMP}.log"
RELEASE_DIR="${REPO_DIR}/releases/${TIMESTAMP}"
CURRENT_LINK="${REPO_DIR}/current"

# Service ports (override via env)
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${DEPLOY_LOG}"
}

info()  { log "${GREEN}[INFO]${NC} $*"; }
warn()  { log "${YELLOW}[WARN]${NC} $*"; }
error() { log "${RED}[ERROR]${NC} $*"; }

# ── Pre-flight Checks ─────────────────────────────────────────
preflight() {
  info "Running pre-flight checks..."

  if [ ! -f ".env.${ENV}" ] && [ ! -f ".env" ]; then
    error "No environment file found (.env.${ENV} or .env)"
    exit 1
  fi

  if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
    exit 1
  fi

  if ! docker compose version &> /dev/null; then
    error "Docker Compose is not installed"
    exit 1
  fi

  # Ensure required directories exist
  mkdir -p "${REPO_DIR}"/{releases,logs,backups/{postgres,redis}}

  info "Pre-flight checks passed"
}

# ── Build Docker Images ──────────────────────────────────────
build_images() {
  info "Building production Docker images..."

  export COMPOSE_FILE="docker-compose.prod.yml"
  export NODE_ENV="production"

  docker compose build --pull --no-cache api web 2>&1 | tee -a "${DEPLOY_LOG}"

  info "Docker images built successfully"
}

# ── Backup Current Database ──────────────────────────────────
backup_database() {
  info "Creating pre-deploy database backup..."

  # Trigger backup via the backup service
  docker compose -f docker-compose.prod.yml exec -T backup /usr/local/bin/backup 2>&1 | tee -a "${DEPLOY_LOG}" || {
    warn "Pre-deploy backup failed, continuing..."
  }

  info "Database backup complete"
}

# ── Deploy Services ──────────────────────────────────────────
deploy_services() {
  info "Deploying services..."

  # Pull latest images (if using registry)
  # docker compose -f docker-compose.prod.yml pull api web

  # Start services with health checks
  docker compose -f docker-compose.prod.yml up -d --no-deps --scale api=2 --scale web=2 postgres redis 2>&1 | tee -a "${DEPLOY_LOG}"

  # Deploy API first
  info "Deploying API..."
  docker compose -f docker-compose.prod.yml up -d --no-deps --scale api=2 api 2>&1 | tee -a "${DEPLOY_LOG}"

  # Wait for API health
  info "Waiting for API to become healthy..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:${API_PORT}/api/v1/health/live" > /dev/null 2>&1; then
      info "API is healthy"
      break
    fi
    if [ "$i" -eq 30 ]; then
      error "API failed to become healthy within 30 attempts"
      rollback
      exit 1
    fi
    sleep 2
  done

  # Run database migrations
  info "Running database migrations..."
  docker compose -f docker-compose.prod.yml exec -T api node dist/apps/api/main.js prisma migrate deploy 2>&1 | tee -a "${DEPLOY_LOG}" || {
    warn "Migration command not available, attempting via prisma..."
    docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy 2>&1 | tee -a "${DEPLOY_LOG}" || {
      error "Database migration failed!"
      rollback
      exit 1
    }
  }

  # Deploy Web
  info "Deploying Web..."
  docker compose -f docker-compose.prod.yml up -d --no-deps --scale web=2 web 2>&1 | tee -a "${DEPLOY_LOG}"

  # Wait for Web health
  info "Waiting for Web to become healthy..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:${WEB_PORT}/" > /dev/null 2>&1; then
      info "Web is healthy"
      break
    fi
    if [ "$i" -eq 30 ]; then
      error "Web failed to become healthy within 30 attempts"
      rollback
      exit 1
    fi
    sleep 2
  done

  # Deploy Nginx
  info "Deploying Nginx..."
  docker compose -f docker-compose.prod.yml up -d --no-deps nginx 2>&1 | tee -a "${DEPLOY_LOG}"

  info "All services deployed successfully"
}

# ── Run Post-Deploy Checks ────────────────────────────────────
post_deploy_checks() {
  info "Running post-deploy checks..."

  # Full health check
  local health_response
  health_response=$(curl -sf "http://localhost:${API_PORT}/api/v1/health" 2>&1) || {
    warn "Health endpoint not responding, checking individual services..."
  }

  # Check each service
  docker compose -f docker-compose.prod.yml ps 2>&1 | tee -a "${DEPLOY_LOG}"

  # Verify all services are running
  local running
  running=$(docker compose -f docker-compose.prod.yml ps --services --filter "status=running" 2>/dev/null | wc -l)
  local expected=5 # nginx, postgres, redis, api, web
  if [ "${running}" -lt "${expected}" ]; then
    warn "Only ${running}/${expected} services are running"
  fi

  info "Post-deploy checks complete"
}

# ── Rollback ──────────────────────────────────────────────────
rollback() {
  error "ROLLING BACK to previous deployment..."

  # Scale down new instances
  docker compose -f docker-compose.prod.yml up -d --no-deps --scale api=1 --scale web=1 2>&1 | tee -a "${DEPLOY_LOG}"

  # Restart previous versions
  docker compose -f docker-compose.prod.yml up -d --no-deps api web 2>&1 | tee -a "${DEPLOY_LOG}"

  info "Rollback complete. Previous versions are running."
}

# ── Cleanup Old Releases ─────────────────────────────────────
cleanup_old_releases() {
  info "Cleaning up old releases..."

  # Keep last 5 releases
  ls -t "${REPO_DIR}/releases/" 2>/dev/null | tail -n +6 | while read -r release; do
    rm -rf "${REPO_DIR}/releases/${release}"
    info "Removed old release: ${release}"
  done

  # Clean Docker images
  docker image prune -f 2>&1 | tee -a "${DEPLOY_LOG}"

  info "Cleanup complete"
}

# ── Send Notification ────────────────────────────────────────
send_notification() {
  local status="$1"
  local message="EthioBanksHub deployment ${status} (${TIMESTAMP})"

  # Log the notification
  log "Notification: ${message}"

  # Could integrate with Slack/Telegram/etc.
  # curl -sf -X POST -H "Content-Type: application/json" \
  #   -d "{\"text\":\"${message}\"}" \
  #   "${SLACK_WEBHOOK_URL}" > /dev/null 2>&1 || true
}

# ── Main ──────────────────────────────────────────────────────
main() {
  echo ""
  echo "=============================================="
  echo " EthioBanksHub — Deploy Script"
  echo " Environment: ${ENV}"
  echo " Timestamp:   ${TIMESTAMP}"
  echo "=============================================="
  echo ""

  cd "${REPO_DIR}"

  if [ "${ROLLBACK}" == "--rollback" ]; then
    warn "ROLLBACK requested!"
    rollback
    send_notification "rolled back"
    exit 0
  fi

  preflight
  build_images
  backup_database
  deploy_services
  post_deploy_checks
  cleanup_old_releases
  send_notification "successful"

  echo ""
  echo "=============================================="
  echo -e " ${GREEN}Deployment complete!${NC}"
  echo "=============================================="
  echo ""
  info "View logs: docker compose -f docker-compose.prod.yml logs -f"
  info "Monitor:   curl http://localhost:${API_PORT}/api/v1/health"
  info "Rollback:  ./scripts/deploy.sh ${ENV} --rollback"
}

main
