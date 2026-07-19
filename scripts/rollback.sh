#!/bin/bash
# ──────────────────────────────────────────────
# EthioBanksHub — Quick Rollback Script
# ──────────────────────────────────────────────
# Convenience wrapper for rolling back a deployment
#
# Usage:
#   ./scripts/rollback.sh production
#   ./scripts/rollback.sh staging

set -euo pipefail

ENV="${1:-production}"

echo "⚠️  Initiating rollback for environment: ${ENV}"
echo ""

# Delegate to deploy.sh with --rollback flag
exec "$(dirname "$0")/deploy.sh" "${ENV}" --rollback
