# Monitoring & Observability

The backend exposes a Prometheus `/metrics` endpoint and three operational
probes. This guide explains how to scrape, visualize, and alert on them.

## Endpoints

| Endpoint       | Type                    | Description                                   |
| -------------- | ----------------------- | --------------------------------------------- |
| `GET /metrics` | Prometheus text (0.0.4) | Application + process metrics                 |
| `GET /live`    | Liveness                | 200 while the process is alive; no DB call    |
| `GET /ready`   | Readiness               | 200 only when the database is reachable       |
| `GET /health`  | Health                  | Server + DB status with a human-readable body |

## Metrics exposed

Custom metrics (labelled with `method`, `route`, `status_code`):

| Metric                          | Type      | Meaning                                 |
| ------------------------------- | --------- | --------------------------------------- |
| `http_requests_total`           | Counter   | Total requests, per method/route/status |
| `http_request_duration_seconds` | Histogram | Request latency distribution            |

Default Node.js process metrics (via prom-client `collectDefaultMetrics`):

| Metric (examples)                                              | Meaning                           |
| -------------------------------------------------------------- | --------------------------------- |
| `process_cpu_seconds_total`                                    | Total CPU time consumed           |
| `process_resident_memory_bytes`                                | RSS memory                        |
| `nodejs_heap_size_used_bytes` / `nodejs_heap_size_total_bytes` | V8 heap usage                     |
| `nodejs_eventloop_lag_seconds`                                 | Event-loop delay (blocked = slow) |
| `nodejs_gc_*`                                                  | Garbage collection counters       |
| `process_start_time_seconds`                                   | Process uptime anchor             |
| `nodejs_active_handles` / `nodejs_active_requests`             | Open handles / requests           |

The `/metrics` endpoint excludes itself from request counting so scraping never
feeds back into the metrics.

## Prometheus scrape config

```yaml
scrape_configs:
  - job_name: ethio-exchange-backend
    metrics_path: /metrics
    static_configs:
      - targets: ["api.example.com:443"] # or container IP:5000
    scheme: https
    # If metrics are behind auth, use basic_auth or authorization headers.
```

## Useful PromQL queries

```promql
# Request rate (per second)
rate(http_requests_total[5m])

# Error rate (5xx as % of traffic)
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# p95 latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Memory headroom
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes

# Event-loop health (should stay near 0)
nodejs_eventloop_lag_seconds
```

## Alerting rules (example)

```yaml
groups:
  - name: ethio-exchange-backend
    rules:
      - alert: BackendDown
        expr: up{job="ethio-exchange-backend"} == 0
        for: 2m
        annotations:
          summary: "Backend is unreachable"

      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        annotations:
          summary: "More than 5% of requests are failing"

      - alert: HighLatency
        expr: histogram_quantile(0.95,
          sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 2
        for: 10m
        annotations:
          summary: "p95 latency above 2s"

      - alert: DatabaseUnreachable
        expr: probe_success{job="readiness"}
        for: 5m
        annotations:
          summary: "Readiness probe failing — database likely unreachable"
```

To alert on readiness directly, scrape `/ready` with a blackbox exporter and
alert on `probe_success == 0`.

## Grafana

Import a dashboard with the `prometheus` datasource and add panels for:

- Request rate & error rate (lines)
- Latency histogram (p50/p95/p99)
- Heap used vs total (gauge / time series)
- Event-loop lag
- Process uptime (`time() - process_start_time_seconds`)

## Logs

The structured logger writes to stdout/stderr with:

```
[ISO-timestamp] LEVEL [requestId=...] message {"meta": ...}
```

- **requestId** — every request tag; correlate with `X-Request-ID` response headers.
- **Access lines** — method, path, status, duration (via morgan).
- **Startup / shutdown / uncaught exception / unhandled rejection** — lifecycle events.
- Secrets are never logged.

Recommended: ship stdout to a log aggregator (Loki, CloudWatch, ELK) with the
requestId as a field for correlation.
