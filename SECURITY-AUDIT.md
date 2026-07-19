# ──────────────────────────────────────────────
# EthioBanksHub — Security Audit Checklist
# ──────────────────────────────────────────────
# Run this checklist before every production release.
# All items MUST be verified or have a documented exception.

---

## 🚀 TOP 5 — Before You Launch

Run these first. Everything else can follow.

- [ ] 1. Generate strong secrets: `openssl rand -base64 64` (JWT), `openssl rand -base64 32` (DB, Redis)
- [ ] 2. Configure HTTPS with a valid Let's Encrypt certificate
- [ ] 3. Run `pnpm audit` and fix all CRITICAL vulnerabilities
- [ ] 4. Verify `NODE_ENV=production` — Swagger disabled, errors hidden
- [ ] 5. Test rate limiting: `for i in {1..70}; do curl -s -o /dev/null http://localhost:4000/api/v1/health/live; done`

---

## 🔐 Authentication & Authorization

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | JWT secret is unique and >= 64 chars | ⬜ | Generate: `openssl rand -base64 64` |
| 2 | Refresh tokens are rotated | ⬜ | Implemented in auth.service.ts |
| 3 | Refresh tokens expire (7d or less) | ⬜ | Default: 7d |
| 4 | Access tokens expire (15m or less) | ⬜ | Default: 15m |
| 5 | Role-based access control enforced | ⬜ | `@Roles('ADMIN')` decorator in use |
| 6 | Public routes explicitly marked | ⬜ | `@Public()` decorator in use |
| 7 | No hardcoded credentials in code | ⬜ | All via ConfigService + env vars |
| 8 | Password hashing uses bcrypt (12+ rounds) | ⬜ | bcrypt.hash(password, 12) |
| 9 | Login rate limited (5 req/min) | ⬜ | ThrottlerGuard + Nginx rate limit |

## 🛡️ Network Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 10 | HTTPS enforced (HSTS preload) | ⬜ | Nginx redirects HTTP → HTTPS |
| 11 | TLS 1.2+ only | ⬜ | Nginx config: TLSv1.2 TLSv1.3 |
| 12 | Strong ciphers only | ⬜ | Modern cipher suite in nginx.conf |
| 13 | SSL stapling enabled | ⬜ | Nginx ssl_stapling on |
| 14 | Ports 80/443 only exposed externally | ⬜ | Other ports bound to 127.0.0.1 |
| 15 | SSH key-based auth only | ⬜ | No password auth |
| 16 | Fail2ban or similar configured | ⬜ | Recommended for production |
| 17 | DDoS protection (Cloudflare) | ⬜ | Cloudflare proxying recommended |

## 🧪 API Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 18 | Helmet middleware enabled | ✅ | Full CSP in main.ts |
| 19 | CORS origins restricted | ✅ | Whitelist in .env.production |
| 20 | CSRF protection enabled | ✅ | HMAC-based tokens |
| 21 | Rate limiting (60 req/min) | ✅ | ThrottlerGuard + Nginx |
| 22 | Request validation (whitelist) | ✅ | ValidationPipe whitelist: true |
| 23 | Error messages hidden in production | ✅ | disableErrorMessages: true |
| 24 | SQL injection protection | ✅ | Prisma parameterized queries |
| 25 | No sensitive data in logs | ⬜ | Verify log output |
| 26 | Swagger disabled in production | ✅ | Conditional on NODE_ENV |
| 27 | API versioning enforced | ✅ | URI versioning (v1) |

## 🗄️ Database Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 28 | Database password is strong (32+ chars) | ⬜ | Generate: `openssl rand -base64 32` |
| 29 | Database port bound to localhost only | ✅ | docker-compose.prod.yml |
| 30 | Least-privilege DB user | ⬜ | Prisma uses single user |
| 31 | Automated backups configured | ✅ | Daily at 3 AM via backup service |
| 32 | Backup retention policy (30 days) | ✅ | BACKUP_RETENTION_DAYS=30 |
| 33 | Encrypted backups at rest | ⬜ | S3 SSE-S3 or KMS recommended |
| 34 | Database connection string is secret | ✅ | Via docker-compose environment |

## 💾 Infrastructure Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 35 | Docker containers run as non-root | ✅ | UID 65532 (API), 1001 (Web) |
| 36 | Docker images are minimal (distroless) | ✅ | gcr.io/distroless API, Alpine Web |
| 37 | Docker security scanning enabled | ✅ | Trivy in CD pipeline |
| 38 | Container resource limits set | ✅ | Memory + CPU limits in compose |
| 39 | Secrets not in Docker layers | ✅ | Build args avoided; env at runtime |
| 40 | Health checks for all services | ✅ | PostgreSQL, Redis, API, Web, Nginx |
| 41 | Read-only root filesystem | ⬜ | Recommended enhancement |
| 42 | No privileged containers | ✅ | None used |
| 43 | Docker socket not mounted | ✅ | Not mounted in compose |

## 🔄 Dependencies & Supply Chain

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 44 | pnpm-lock.yaml is up to date | ⬜ | Run: `pnpm install --frozen-lockfile` |
| 45 | No known vulnerable dependencies | ⬜ | Run: `pnpm audit` |
| 46 | Dependencies are pinned (no ^ ranges) | ⬜ | Review package.json |
| 47 | Node.js version pinned to 20 LTS | ✅ | .nvmrc / Dockerfile |
| 48 | pnpm version pinned to 9 | ✅ | packageManager in package.json |

## 📝 Logging & Monitoring

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 49 | Structured logging (JSON) | ✅ | Nginx JSON log format |
| 50 | Request logging (morgan) | ✅ | API main.ts |
| 51 | Error tracking configured | ⬜ | Sentry DSN recommended |
| 52 | Health check endpoints exposed | ✅ | /health, /health/live, /health/ready |
| 53 | System metrics endpoint | ✅ | /metrics |
| 54 | Log rotation configured | ✅ | Docker json-file max-size 10m |
| 55 | Centralized logging | ⬜ | ELK/Datadog/Grafana recommended |

## 📦 Data Protection

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 56 | PII data minimization | ⬜ | Review User model fields |
| 57 | Password not logged anywhere | ⬜ | Verify morgan/validation output |
| 58 | Email addresses stored securely | ⬜ | Hashed if sensitive? |
| 59 | GDPR/DPA compliance considered | ⬜ | Consult legal team |
| 60 | Data export capability | ⬜ | User data export endpoint |

## 🚀 Deployment Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 61 | CI pipeline runs security scan | ✅ | Trivy in CD workflow |
| 62 | Production requires manual approval | ✅ | GitHub Environments |
| 63 | Rollback procedure documented | ✅ | ./scripts/rollback.sh |
| 64 | Blue-green or zero-downtime deploy | ✅ | Health checks + scaling |
| 65 | Pre-deploy database backup | ✅ | deploy.sh runs backup |
| 66 | Canary / staged rollout | ⬜ | Future enhancement |
| 67 | Feature flags for risky changes | ⬜ | Future enhancement |

---

## 🔴 Critical Items (MUST fix before production)

- [ ] Generate strong JWT_SECRET (`openssl rand -base64 64`)
- [ ] Generate strong POSTGRES_PASSWORD (`openssl rand -base64 32`)
- [ ] Generate strong REDIS_PASSWORD (`openssl rand -base64 32`)
- [ ] Run `pnpm audit` and fix any critical vulnerabilities
- [ ] Configure HTTPS with valid certificate (Let's Encrypt)
- [ ] Verify rate limiting is effective under load

## 🟡 High Priority Items

- [ ] Configure Sentry/error tracking
- [ ] Set up centralized logging (ELK/Datadog/Grafana)
- [ ] Configure firewall (UFW/iptables) — allow 22, 80, 443 only
- [ ] Set up monitoring alerts (downtime, high error rate)
- [ ] Run load test to verify performance under stress
- [ ] Review all environment variables are set correctly

## 🟢 Good Practices

- [ ] Review dependency licenses
- [ ] Set up automated dependency updates (Dependabot/Renovate)
- [ ] Create disaster recovery runbook
- [ ] Perform penetration testing
- [ ] Document incident response procedures

---

## 📋 Post-Deployment Verification

```bash
# 1. Health check
curl https://ethiobankshub.com/api/v1/health

# 2. SSL verification
curl -vI https://ethiobankshub.com 2>&1 | grep -E "SSL|TLS|certificate"

# 3. Security headers
curl -sI https://ethiobankshub.com | grep -E "^[a-zA-Z]"

# 4. Rate limiting test
for i in $(seq 1 70); do curl -s -o /dev/null -w "%{http_code} " http://localhost:4000/api/v1/health/live; done

# 5. Docker container status
docker compose -f docker-compose.prod.yml ps

# 6. Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=50 api | grep -i error

# 7. Test authentication flow
TOKEN=$(curl -s -X POST https://ethiobankshub.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}' | jq -r '.accessToken')
echo "Token: ${TOKEN:0:20}..."

# 8. Verify CSRF protection
curl -s -X POST https://ethiobankshub.com/api/v1/auth/logout -H "Content-Type: application/json"
# Should return 403 (missing CSRF token)
```

---

## 🚨 Incident Response Quick Reference

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| 🔴 Critical (outage, data breach) | 15 min | CTO + Security team |
| 🟡 High (degraded, partial outage) | 1 hour | Engineering lead |
| 🟢 Medium (non-critical bug) | Next business day | Team lead |
| 🔵 Low (cosmetic, enhancement) | Next sprint | Product owner |

**First steps for any incident:**
1. Confirm the incident and assess severity
2. Notify the team (Slack/Telegram/PagerDuty)
3. Rollback if needed: `./scripts/rollback.sh production`
4. Investigate root cause
5. Apply fix and deploy
6. Document post-mortem

---

> **Last updated:** 2026-07-19
> **Review frequency:** Before every production release
