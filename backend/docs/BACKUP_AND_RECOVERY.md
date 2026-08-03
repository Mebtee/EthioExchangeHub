# Backup & Disaster Recovery

This document covers data protection for the Ethio Exchange Hub backend.

## What must be backed up

| Asset                                         | Where                                 | Backup method                     |
| --------------------------------------------- | ------------------------------------- | --------------------------------- |
| Application data (banks, rates, logs, health) | Supabase (PostgreSQL)                 | Supabase backups + `pg_dump`      |
| Environment / secrets                         | `backend/.env`, deploy env            | Secrets manager / encrypted vault |
| Image & config                                | Docker registry, `docker-compose.yml` | Registry retention + Git          |

## Supabase backup strategy

### 1. Managed backups (recommended)

Supabase provides **daily backups** and **Point-in-Time Recovery (PITR)** on
paid plans:

- Enable **PITR** (continuous WAL archiving) for the production project.
- Retention: keep at least **7 days** of daily backups, more for audit needs.
- Test restoration to a staging project regularly (quarterly).

### 2. Scheduled `pg_dump` (defense in depth)

Run a scheduled job (cron / GitHub Actions / scheduled task) that dumps the
schema + data to object storage:

```sh
pg_dump \
  "postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres" \
  --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

- Store dumps in a **different region/account** than the database.
- Encrypt at rest; rotate credentials via the vault.
- Retention: keep **30 daily + 12 monthly** dumps.

> Note: the service-role key authenticates to the Supabase REST API, not the
> Postgres connection string. Use the database password (from the Supabase
> dashboard) for `pg_dump`.

### 3. Environment backup

The `.env` (or equivalent deploy environment) contains:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (+ token lifetimes)
- `FRONTEND_URL`

Store it in a **secrets manager** (Vault, AWS Secrets Manager, Doppler,
GitHub Secrets, 1Password). Never commit it. Back up the vault itself.

## Disaster recovery checklist

Use this ordered checklist when recovering:

1. **Assess**: identify the failure (region outage, data loss, accidental
   delete, corrupted schema).
2. **Confirm backup freshness**: latest PITR point / dump timestamp.
3. **Restore to a staging project first** and validate data integrity
   (row counts, latest exchange rates, no partial tables).
4. **Point the app at the restored DB**: update `SUPABASE_URL` (+ keys) in the
   environment.
5. **Verify health**: `GET /ready` returns 200 and `/health` reports the DB
   connected; spot-check a few endpoints.
6. **Fail over DNS / traffic** to the recovered stack.
7. **Record the incident** and review why the original failed (see RUNBOOK.md).

## Restore procedure (pg_dump)

```sh
# 1. Create a fresh Supabase project (or wipe the target schema).
# 2. Restore the dump:
pg_restore \
  --clean --if-exists --no-owner \
  -d "postgresql://postgres:[PASSWORD]@db.[new-ref].supabase.co:5432/postgres" \
  backup-20260803-120000.dump

# 3. Update env and redeploy.
# 4. Verify: SELECT COUNT(*) FROM banks; and GET /ready.
```

## Restore procedure (Supabase PITR / dashboard)

1. In the Supabase dashboard, open **Database → Backups**.
2. Choose a restore point (time-based for PITR, or a daily backup).
3. Restore **to a new project** (never in place for production).
4. Point the app at the restored project URL, update keys, deploy.

## Recovery objectives (targets)

| Metric                         | Target                                       |
| ------------------------------ | -------------------------------------------- |
| RPO (Recovery Point Objective) | ≤ 24 h with daily backups; ≤ 1 min with PITR |
| RTO (Recovery Time Objective)  | ≤ 2 h for full restore                       |

Tune these to business needs; document actuals after each drill.
