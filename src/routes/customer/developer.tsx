import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CodeBlock } from "@/components/customer/code-block";
import { CopyButton } from "@/components/customer/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { config } from "@/lib/config";

/**
 * Developer quick-reference (Phase 6) — a convenient in-portal summary of the
 * content maintained under docs/api/. The OpenAPI document served at /docs on
 * the backend remains the authoritative technical reference; nothing here
 * contradicts it. All examples use placeholder keys only.
 */

// Same base URL the portal itself talks to (VITE_API_BASE_URL) so examples
// never drift from the deployment they are rendered in.
const BASE_URL = config.apiBaseUrl;

export default function CustomerDeveloperPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("customer.developer.title")}
        description={t("customer.developer.subtitle")}
      />

      {/* Base URL + auth */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.baseUrlTitle")}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface-low px-3 py-2 font-mono text-xs">
              {BASE_URL}
            </code>
            <CopyButton value={BASE_URL} />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.authTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("customer.developer.authBody")}</p>
          <CodeBlock className="mt-3" code={`Authorization: Bearer eeh_live_YOUR_API_KEY`} />
        </SurfaceCard>
      </div>

      {/* Quick start */}
      <SurfaceCard className="p-6">
        <h3 className="font-semibold">{t("customer.developer.quickstartTitle")}</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {t("customer.developer.quickstartSteps")
            .split("\n")
            .map((step, i) => (
              <li key={i}>{step}</li>
            ))}
        </ol>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              cURL
            </p>
            <CodeBlock
              code={`curl \\
  -H "Authorization: Bearer eeh_live_YOUR_API_KEY" \\
  "${BASE_URL}/public/rates/latest"`}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              JavaScript
            </p>
            <CodeBlock
              code={`const res = await fetch(
  "${BASE_URL}/public/rates/latest",
  { headers: { Authorization: "Bearer eeh_live_YOUR_API_KEY" } },
);
const body = await res.json();
console.log(body.success, body.data);`}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Python
            </p>
            <CodeBlock
              code={`import requests

res = requests.get(
    "${BASE_URL}/public/rates/latest",
    headers={"Authorization": "Bearer eeh_live_YOUR_API_KEY"},
)
res.raise_for_status()
print(res.json()["data"])`}
            />
          </div>
        </div>
      </SurfaceCard>

      {/* Example responses */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.successTitle")}</h3>
          <CodeBlock
            className="mt-3"
            code={`{
  "success": true,
  "message": "Latest exchange rates retrieved.",
  "data": [
    {
      "id": "c8f21ffd-9c80-46fa-828d-69bf5d89eb78",
      "bank_code": "ABY",
      "currency_code": "USD",
      "buying_rate": 123.45,
      "selling_rate": 124.55,
      "transactional_buying": null,
      "transactional_selling": null,
      "weighted_avg_buying": null,
      "weighted_avg_selling": null,
      "rate_date": "2026-08-02",
      "source": "SCRAPER",
      "scraped_at": "2026-08-02T08:00:00.000Z",
      "stale": false,
      "change": 0.42
    }
  ]
}`}
          />
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.errorsTitle")}</h3>
          <CodeBlock
            className="mt-3"
            code={`// 401 — missing/invalid key
{ "success": false, "message": "Missing or invalid API key.", "data": null }

// 403 — no active subscription
{ "success": false, "message": "No active subscription. Purchase a plan to use the commercial API.", "data": null }

// 429 — per-minute limit
{ "success": false, "message": "Rate limit exceeded: your plan allows 30 requests per minute. Retry shortly.", "data": null }

// 429 — monthly quota exhausted
{ "success": false, "message": "Monthly quota exceeded: your plan includes 2000 requests per billing period. Upgrade your plan or wait for renewal.", "data": null }`}
          />
        </SurfaceCard>
      </div>

      {/* Limits & freshness */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.limitsTitle")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {t("customer.developer.limitsBullets")
              .split("\n")
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
          <CodeBlock
            className="mt-4"
            code={`X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-Quota-Limit: 2000
X-Quota-Remaining: 1975
X-Quota-Reset: 2026-08-01T00:00:00.000Z`}
          />
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.developer.freshnessTitle")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("customer.developer.freshnessBody")}
          </p>
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {t("customer.developer.fullDocsLink")}
            <ExternalLink className="size-3.5" />
          </a>
        </SurfaceCard>
      </div>
    </div>
  );
}
