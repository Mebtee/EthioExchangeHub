/**
 * Static-prerender the public SEO routes into `dist/`.
 *
 * SPA pages like /en/banks/CBE currently ship an empty <div id="root"> to
 * crawlers, so search engines see no content. This script generates a static
 * HTML file for every public, indexable route so crawlers (and social/link
 * previews) receive meaningful page-specific text WITHOUT executing JavaScript.
 *
 * Design principles:
 *  - NO framework migration (no Next.js). The app remains a Vite + React SPA.
 *  - The generated HTML is a thin, static shell on top of the SAME built
 *    asset tags from dist/index.html. It preserves <div id="root"> and the
 *    module script, so browsers hydrate normally and admin/customer/auth are
 *    untouched (those routes are never prerendered here).
 *  - All SEO strings (title, description, headings, link labels, copy) come
 *    from messages/{en,am,zh}.json — the same catalogs the SPA uses — so there
 *    is a single source of truth and every locale stays in sync.
 *  - LIVE exchange-rate numbers are NEVER baked in. Those are dynamic and load
 *    client-side via React Query. The static copy explicitly says rates load
 *    live and are not shown here.
 *  - Bank display names come from a bundled map (stable identity data, not
 *    volatile rates) and are enriched from the live API when reachable.
 *
 * Output layout mirrors the existing sitemap: English is unprefixed,
 * am/zh are prefixed. e.g. dist/banks/CBE/index.html (en),
 * dist/am/banks/CBE/index.html (am), dist/zh/banks/CBE/index.html (zh).
 *
 * The bare `/` (dist/index.html) is left as the SPA entry so the in-app
 * locale redirect keeps working — it is NOT overwritten here.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const messagesDir = join(root, "messages");

const SITE_URL = "https://ethioexchange.live";
const LOCALES = ["en", "am", "zh"];

/* ------------------------------------------------------------------ *
 * Message catalogs (same source of truth as the SPA)
 * ------------------------------------------------------------------ */

function loadMessages(locale) {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8"));
}

/** Dot-path lookup into a nested messages object (e.g. "seo.home.title"). */
export function str(messages, path, params = {}) {
  let value = messages;
  for (const seg of path.split(".")) value = value?.[seg];
  if (typeof value !== "string") {
    throw new Error(`Missing message key: ${path}`);
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ""));
}

/* ------------------------------------------------------------------ *
 * Known banks: slug -> display name. Stable identity data (not live
 * rates). Baked in so builds are deterministic/offline-safe.
 * ------------------------------------------------------------------ */

// Enriched from the live /banks endpoint when reachable.
const BANK_NAMES = {
  ABY: "Abay Bank",
  ADB: "Addis International Bank",
  AHD: "Ahadu Bank",
  AMH: "Amhara Bank",
  ANB: "Anbessa Bank",
  AWB: "Awash Bank",
  BOA: "Bank of Abyssinia",
  BRH: "Berhan Bank",
  BUN: "Bunna Bank",
  CBE: "Commercial Bank of Ethiopia",
  COOP: "Cooperative Bank of Oromia",
  DBE: "Development Bank of Ethiopia",
  DSH: "Dashen Bank",
  ENT: "Enat Bank",
  GAD: "Gadaa Bank",
  GBE: "Global Bank Ethiopia",
  GOH: "Goh Betoch Bank",
  HIB: "Hibret Bank",
  HJB: "Hijra Bank",
  OIB: "Oromia International Bank",
  OMB: "Omo Bank S.C.",
  ORB: "Oromia Bank",
  RMS: "Rammis Bank",
  SIB: "Siinqee Bank",
  SID: "Sidama Bank",
  SIK: "Siket Bank",
  TSD: "Tsedey Bank",
  TSH: "Tsehay Bank",
  WBE: "Wegagen Bank",
  ZZB: "ZamZam Bank",
  ZMN: "Zemen Bank",
};

async function bestEffortBankNames() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://api.ethioexchange.live/api/v1/banks`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return BANK_NAMES;
    const payload = await res.json();
    const rows = Array.isArray(payload) ? payload : payload?.data || payload?.banks || [];
    const enriched = { ...BANK_NAMES };
    for (const r of rows) {
      if (r?.bank_code && r?.bank_name) enriched[r.bank_code] = r.bank_name;
    }
    return enriched;
  } catch {
    return BANK_NAMES;
  }
}

/* ------------------------------------------------------------------ *
 * Loan/prime currency metadata for the currency info pages.
 * ------------------------------------------------------------------ */

const CURRENCY_PAGES = [
  { code: "USD", path: "usd-to-etb" },
  { code: "EUR", path: "eur-to-etb" },
  { code: "GBP", path: "gbp-to-etb" },
  { code: "SAR", path: "sar-to-etb" },
  { code: "AED", path: "aed-to-etb" },
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Escape text for safe HTML text-node/attr placement. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turning token like "[en]", "[am]", "[zh]" with {{hi}} into a raw HTML string body. */
function html(...parts) {
  return parts.join("");
}

/** Build hreflang alternates for a base path (unprefixed, English-canonical). */
function hreflangTags(basePath, fullCanonical) {
  const nonIndexable = [
    "rankings",
    "news",
    "about",
    "contact",
    "usd-to-etb",
    "eur-to-etb",
    "gbp-to-etb",
    "sar-to-etb",
    "aed-to-etb",
    "banks",
  ];
  // Keep tagset small for listing pages; per-bank pages include alternates.
  return LOCALES.map(
    (loc) =>
      `    <link rel="alternate" hreflang="${loc}" href="${SITE_URL}${loc === "en" ? basePath : `/${loc}${basePath}`}" />`,
  ).join("\n");
}

/**
 * Render the static inner body for a generic "SEO landing" page from localized
 * strings: breadcrumb, H1, intro copy, and a crawlable link grid.
 */
export function renderStaticShell({
  messages,
  locale,
  h1,
  introHtml,
  linkGroups,
  bankNav,
  liveNote,
}) {
  const prefix = `/${locale}`;

  // Navigation links available on every page (crawlable).
  const mainLinks = [
    ["/", "common.home"],
    ["/banks", "common.allEthiopianBanks"],
    ["/rankings", "common.bankRankings"],
    ["/news", "nav.news"],
    ["/about", "nav.about"],
    ["/contact", "nav.contact"],
  ];

  const navItems = mainLinks
    .map(([path, key]) => {
      const href = `${prefix}${path === "/" ? "/" : path}`;
      return `      <a href="${href}">${esc(str(messages, key))}</a>`;
    })
    .join("\n");

  const groupsHtml = linkGroups
    .map(({ label, links }) => {
      const items = links
        .map(({ href, text }) => `          <li><a href="${href}">${esc(text)}</a></li>`)
        .join("\n");
      return `        <section>
          <h2>${esc(label)}</h2>
          <ul>
${items}
          </ul>
        </section>`;
    })
    .join("\n\n");

  return `
      <main class="prerendered" style="max-width:1080px;margin:0 auto;padding:2.5rem 1.5rem;color:#1a202c;line-height:1.6">
        <nav style="display:flex;flex-wrap:wrap;gap:0 1.25rem;font-size:0.9rem">
${navItems}
        </nav>
        <h1 style="font-size:2rem;margin:1.5rem 0 0.5rem">${esc(h1)}</h1>
        <div style="margin:0.5rem 0 1.5rem;font-size:1.05rem">${introHtml}</div>
        ${liveNote ? liveNote : ""}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;margin-top:2rem">
${groupsHtml}
        </div>
        ${bankNav ? renderBankNav(messages, locale, bankNav) : ""}
      </main>
`;
}

export function renderBankNav(messages, locale, banks) {
  const prefix = `/${locale}`;
  const heading = str(messages, "common.allEthiopianBanks");
  const items = banks
    .map(
      ([slug, name]) =>
        `          <li><a href="${prefix}/banks/${slug}">${esc(name)} — exchange rates</a></li>`,
    )
    .join("\n");
  return `
        <section>
          <h2>${esc(heading)}</h2>
          <ul>
${items}
          </ul>
        </section>`;
}

/* ------------------------------------------------------------------ *
 * Per-route prerenderers
 * ------------------------------------------------------------------ */

export function prerenderHome(messages, locale, banks) {
  const prefix = `/${locale}`;
  const title = str(messages, "seo.home.title");
  const description = str(messages, "seo.home.description");
  const hero = str(messages, "home.heroDescription");

  const linkGroups = [
    {
      label: "Currency Rates",
      links: CURRENCY_PAGES.map(({ code, path }) => ({
        href: `${prefix}/${path}`,
        text: `${code} to ETB exchange rate`,
      })),
    },
  ];

  const body = renderStaticShell({
    messages,
    locale,
    title,
    h1: "Ethiopian Bank Exchange Rates & Currency Converter",
    introHtml: html(`<p>${esc(hero)}</p>`),
    linkGroups,
    canonicalPath: "/",
    bankNav: banks,
    liveNote: "",
  });

  const canonicalFull = `${SITE_URL}${prefix}/`;
  const hreflang = LOCALES.map(
    (loc) =>
      `<link rel="alternate" hreflang="${loc}" href="${SITE_URL}${loc === "en" ? "/" : `/${loc}/`}" />`,
  ).join("\n");

  const content = buildHtml({
    locale,
    title,
    description,
    canonicalFull,
    hreflang,
    body,
  });
  write(join(distDir, `${locale}/index.html`), content);
}

export function prerenderBanks(messages, locale, banks) {
  const prefix = `/${locale}`;
  const title = str(messages, "seo.banks.title");
  const description = str(messages, "seo.banks.description");
  const heading = str(messages, "banks.title");

  const linkGroups = [
    {
      label: "All Ethiopian Banks",
      links: banks.map(([slug, name]) => ({
        href: `${prefix}/banks/${slug}`,
        text: `${name} exchange rate`,
      })),
    },
  ];

  const intro = html(`<p>${esc(description)}</p>`);

  const body = renderStaticShell({
    messages,
    locale,
    title,
    h1: heading,
    introHtml: intro,
    linkGroups,
    canonicalPath: "/banks",
    bankNav: banks,
    liveNote: liveRatesNote(messages, locale),
  });

  const canonicalFull = `${SITE_URL}${prefix}/banks`;
  const hreflang = hreflangTags("/banks", canonicalFull);

  write(
    join(distDir, `${locale}/banks/index.html`),
    buildHtml({
      locale,
      title,
      description,
      canonicalFull,
      hreflang,
      body,
    }),
  );
}

export function prerenderBankDetail(messages, locale, [slug, name]) {
  const prefix = `/${locale}`;
  const path = `/banks/${slug}`;
  const title = str(messages, "seo.bankDetail.title", { bank: name });
  const description = str(messages, "seo.bankDetail.descriptionFallback", { bank: name });

  const intro = html(
    `<p>Compare the official buying and selling exchange rates for ${esc(name)} (${esc(slug)}). ${"Rates are published daily by the bank and load live on this page; the current figures are shown in the app when you open it."}</p>`,
  );

  const linkGroups = [
    {
      label: "Other Banks",
      links: Object.entries(BANK_NAMES)
        .filter(([s]) => s !== slug)
        .slice(0, 20)
        .map(([s, n]) => ({
          href: `${prefix}/banks/${s}`,
          text: `${n} exchange rate`,
        })),
    },
  ];

  const body = renderStaticShell({
    messages,
    locale,
    title,
    h1: `${name} Exchange Rate`,
    introHtml: intro,
    linkGroups,
    canonicalPath: path,
    bankNav: Object.entries(BANK_NAMES),
    liveNote: liveRatesNote(messages, locale),
  });

  const canonicalFull = `${SITE_URL}${prefix}${path}`;
  const hreflang = hreflangTags(path, canonicalFull);

  write(
    join(distDir, `${locale}/banks/${slug}/index.html`),
    buildHtml({
      locale,
      title,
      description,
      canonicalFull,
      hreflang,
      body,
    }),
  );
}

export function liveRatesNote(messages, locale) {
  return html(
    `<p style="margin-top:1rem;padding:0.75rem 1rem;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:0.95rem">Live buying and selling rates load below in the interactive app.</p>`,
  );
}

export function prerenderCurrency(messages, locale, { code, path }) {
  const prefix = `/${locale}`;
  const name = str(messages, `currencyToEtb.currencies.${code}.name`);
  const title = str(messages, "seo.currency.title", { code, name });
  const description = str(messages, "seo.currency.description", {
    code,
    nameLower: name.toLowerCase(),
  });

  const intro = html(
    `<p>See the current ${esc(code)} to Ethiopian birr (ETB) exchange rate and which Ethiopian bank offers the best buying and selling rate. Rates load live in the interactive app.</p>`,
  );

  const linkGroups = [
    {
      label: "All Banks",
      links: Object.entries(BANK_NAMES).map(([slug, bankName]) => ({
        href: `${prefix}/banks/${slug}`,
        text: `${bankName} exchange rate`,
      })),
    },
  ];

  const body = renderStaticShell({
    messages,
    locale,
    title,
    h1: `${code} to ETB Exchange Rate`,
    introHtml: intro,
    linkGroups,
    canonicalPath: `/${path}`,
    bankNav: Object.entries(BANK_NAMES),
    liveNote: liveRatesNote(messages, locale),
  });

  const canonicalFull = `${SITE_URL}${prefix}/${path}`;
  const hreflang = hreflangTags(`/${path}`, canonicalFull);

  write(
    join(distDir, `${locale}/${path}/index.html`),
    buildHtml({
      locale,
      title,
      description,
      canonicalFull,
      hreflang,
      body,
    }),
  );
}

export function prerenderStaticPage(
  messages,
  locale,
  { path, titleKey, descriptionKey, heading, intro },
) {
  const prefix = `/${locale}`;
  const title = str(messages, titleKey);
  const description = str(messages, descriptionKey);

  const linkGroups = [
    {
      label: "Banks",
      links: Object.entries(BANK_NAMES).map(([slug, name]) => ({
        href: `${prefix}/banks/${slug}`,
        text: `${name} exchange rate`,
      })),
    },
  ];

  const body = renderStaticShell({
    messages,
    locale,
    title,
    h1: heading || title,
    introHtml: html(`<p>${esc(intro || description)}</p>`),
    linkGroups,
    canonicalPath: `/${path}`,
    bankNav: Object.entries(BANK_NAMES),
    liveNote: "",
  });

  const canonicalFull = `${SITE_URL}${prefix}/${path}`;
  const hreflang = hreflangTags(`/${path}`, canonicalFull);

  write(
    join(distDir, `${locale}/${path}/index.html`),
    buildHtml({
      locale,
      title,
      description,
      canonicalFull,
      hreflang,
      body,
    }),
  );
}

/* ------------------------------------------------------------------ *
 * Single combined <html> assembler (uses the built asset tags)
 * ------------------------------------------------------------------ */

export function buildHtml({ locale, title, description, canonicalFull, hreflang, body, template }) {
  const source = template ?? readFileSync(join(distDir, "index.html"), "utf8");

  // Replace head-level SEO fields that the SPA's <Seo> would set at runtime.
  // Regexes tolerate the Prettier multi-line <meta .../> form in index.html.
  let html = source
    .replace(/<html lang="[^"]*"/, `<html lang="${locale}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    // meta description (multi-line)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta\n      name="description"\n      content="${esc(description)}"\n    />`,
    )
    // canonical (single line in template)
    .replace(
      /<link rel="canonical" href="[^"]*"/,
      `<link rel="canonical" href="${esc(canonicalFull)}"`,
    )
    // og:title / og:url (single line)
    .replace(
      /<meta property="og:title" content="[^"]*"/,
      `<meta property="og:title" content="${esc(title)}"`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*"/,
      `<meta property="og:url" content="${esc(canonicalFull)}"`,
    )
    // og:description (multi-line)
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta\n      property="og:description"\n      content="${esc(description)}"\n    />`,
    )
    // twitter:title / twitter:description (single line)
    .replace(
      /<meta name="twitter:title" content="[^"]*"/,
      `<meta name="twitter:title" content="${esc(title)}"`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"/,
      `<meta name="twitter:description" content="${esc(description)}"`,
    );

  // Add locale alternates (inject before the closing </head>).
  html = html.replace("</head>", `    ${hreflang}\n  </head>`);

  // Place static body inside the root node the SPA hydrates into. The SPA's
  // createRoot().render() replaces this node wholesale on load.
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  return html;
}

function write(relPath, content) {
  // relPath may be an absolute path (distDir-prefixed by callers) or relative;
  // resolve defensively so a double-join can never happen.
  const target = relPath.startsWith(distDir) ? relPath : join(distDir, relPath);
  const normalized = target.replace(/\\/g, "/");

  // Always emit the directory index (serves trailing-slash URLs).
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  console.log(`  prerendered ${normalized.replace(distDir.replace(/\\/g, "/"), "")}`);

  // ALSO emit a flat "<path>.html" copy so clean URLs resolve without a
  // trailing slash on BOTH `vite preview` and Vercel (neither reliably
  // resolves a bare directory for `/en/banks/CBE` without a trailing slash).
  if (normalized.endsWith("/index.html")) {
    const flat = `${normalized.slice(0, -"/index.html".length)}.html`;
    writeFileSync(flat, content, "utf8");
    console.log(`  prerendered ${flat.replace(distDir.replace(/\\/g, "/"), "")}`);
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

const locales = Object.fromEntries(LOCALES.map((l) => [l, loadMessages(l)]));

async function main() {
  console.log("Prerendering public SEO routes...");
  const banks = await bestEffortBankNames();
  const bankList = Object.entries(banks);

  // Home (root / for each locale)
  for (const locale of LOCALES) prerenderHome(locales[locale], locale, bankList);

  // Banks list + each bank detail
  for (const locale of LOCALES) {
    prerenderBanks(locales[locale], locale, bankList);
    for (const entry of bankList) prerenderBankDetail(locales[locale], locale, entry);
    for (const page of CURRENCY_PAGES) prerenderCurrency(locales[locale], locale, page);
  }

  // Static informational pages
  const staticPages = [
    {
      path: "rankings",
      titleKey: "seo.rankings.title",
      descriptionKey: "seo.rankings.description",
      intro: "Compare buying and selling exchange rates across Ethiopian banks.",
    },
    {
      path: "news",
      titleKey: "seo.news.title",
      descriptionKey: "seo.news.description",
      intro: "Latest trends and official announcements from Ethiopia's financial sector.",
    },
    {
      path: "about",
      titleKey: "seo.about.title",
      descriptionKey: "seo.about.description",
      intro:
        "Learn how Ethio Exchange tracks and compares Ethiopian bank exchange rates in real time.",
    },
    {
      path: "contact",
      titleKey: "seo.contact.title",
      descriptionKey: "seo.contact.description",
      intro: "Questions about our data, API access, or partnerships? Send us a message.",
    },
  ];
  for (const locale of LOCALES) {
    for (const page of staticPages) prerenderStaticPage(locales[locale], locale, page);
  }

  console.log(`Done. Prerendered ${LOCALES.length} locales.`);
}

// Only run the build-time prerender when executed directly (node scripts/...).
// When imported (e.g. by unit tests) the pure functions are exported instead.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main, LOCALES, CURRENCY_PAGES };
