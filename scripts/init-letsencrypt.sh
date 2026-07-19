#!/bin/bash
# ──────────────────────────────────────────────
# EthioBanksHub — Let's Encrypt SSL Setup
# ──────────────────────────────────────────────
# Initializes SSL certificates for production domains
# Must be run on the production server as root
#
# Prerequisites:
#   - Domain DNS pointing to server IP
#   - Port 80 and 443 open
#   - Nginx installed
#
# Usage:
#   chmod +x scripts/init-letsencrypt.sh
#   sudo ./scripts/init-letsencrypt.sh

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────
DOMAIN="${DOMAIN:-ethiobankshub.com}"
WWW_DOMAIN="www.${DOMAIN}"
EMAIL="${EMAIL:-admin@ethiobankshub.com}"

# Paths
NGINX_CONFIG="/etc/nginx/sites-available/ethiobankshub"
NGINX_WWW="/var/www/ethiobankshub"
SSL_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=============================================="
echo " EthioBanksHub — Let's Encrypt SSL Setup"
echo "=============================================="
echo ""
echo "Domain:       ${DOMAIN}"
echo "WWW Domain:   ${WWW_DOMAIN}"
echo "Email:        ${EMAIL}"
echo ""

# ── Check prerequisites ───────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root (sudo)" >&2
  exit 1
fi

if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# ── Create web root ───────────────────────────────────────────
echo "Creating web root..."
mkdir -p "${NGINX_WWW}/.well-known/acme-challenge"

# ── Obtain certificates ───────────────────────────────────────
echo ""
echo "Obtaining SSL certificates for ${DOMAIN} and ${WWW_DOMAIN}..."
echo ""

certbot certonly \
  --nginx \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  --domains "${DOMAIN}" \
  --domains "${WWW_DOMAIN}" \
  --expand

# ── Verify certificates ───────────────────────────────────────
echo ""
echo "Verifying certificates..."
if [ -f "${SSL_DIR}/fullchain.pem" ]; then
  echo "Certificate: ${SSL_DIR}/fullchain.pem"
  openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -text | grep -E "Subject:|Not Before|Not After"
else
  echo "ERROR: Certificate not found at ${SSL_DIR}" >&2
  exit 1
fi

echo ""
echo "Testing auto-renewal..."
certbot renew --dry-run

# ── Setup auto-renewal cron ───────────────────────────────────
echo ""
echo "Setting up auto-renewal (runs daily at 3 AM)..."
cat > /etc/cron.d/certbot-renew <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
chmod 644 /etc/cron.d/certbot-renew

# ── Copy Nginx cert paths ─────────────────────────────────────
echo ""
echo "SSL certificates ready at:"
echo "  Certificate: ${SSL_DIR}/fullchain.pem"
echo "  Private Key: ${SSL_DIR}/privkey.pem"
echo ""

echo "=============================================="
echo " SSL setup complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Ensure your nginx config points to:"
echo "     ssl_certificate     ${SSL_DIR}/fullchain.pem;"
echo "     ssl_certificate_key ${SSL_DIR}/privkey.pem;"
echo ""
echo "  2. Restart nginx: sudo systemctl reload nginx"
echo "  3. Verify: https://${DOMAIN}"

exit 0
