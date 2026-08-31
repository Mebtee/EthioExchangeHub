import { describe, expect, it } from "vitest";

import { buildHtml, esc, ld, renderStaticShell, str } from "../../scripts/prerender-public.mjs";

// Minimal head template matching the shape of dist/index.html (the built SPA
// entry) so the test exercises the real production template transformations.
const FIXTURE_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Ethio Exchange — Real-time Ethiopian Bank FX Rates</title>
    <meta
      name="description"
      content="Ethiopia's leading aggregator for real-time foreign exchange rates and banking insights."
    />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://ethioexchange.live/" />
    <meta property="og:title" content="Ethio Exchange — Real-time Ethiopian Bank FX Rates" />
    <meta property="og:url" content="https://ethioexchange.live/" />
    <meta
      property="og:description"
      content="Ethiopia's leading aggregator for real-time foreign exchange rates and banking insights."
    />
    <meta name="twitter:title" content="Ethio Exchange — Real-time Ethiopian Bank FX Rates" />
    <meta name="twitter:description" content="Ethiopia's leading aggregator for real-time foreign exchange rates and banking insights." />
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Ethio Exchange"},{"@type":"Organization","name":"Ethio Exchange"}]}</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-AbCdEf.js"></script>
  </body>
</html>
`;

describe("prerender esc()", () => {
  it("escapes HTML-significant characters", () => {
    expect(esc(`A <B> & "C"`)).toBe("A &lt;B&gt; &amp; &quot;C&quot;");
  });
});

describe("prerender str()", () => {
  it("interpolates {{variable}} placeholders", () => {
    const messages = { seo: { x: "Hello {{name}}!" } };
    expect(str(messages, "seo.x", { name: "World" })).toBe("Hello World!");
  });

  it("throws on an unknown key so a typo never silently ships", () => {
    expect(() => str({}, "does.not.exist")).toThrow();
  });
});

describe("buildHtml() per-route SEO head", () => {
  const html = buildHtml({
    template: FIXTURE_TEMPLATE,
    locale: "en",
    title: "Commercial Bank of Ethiopia Exchange Rate Today — Ethio Exchange",
    description:
      "Check the latest exchange rates for Commercial Bank of Ethiopia and compare buying and selling rates.",
    canonicalFull: "https://ethioexchange.live/en/banks/CBE",
    hreflang:
      '    <link rel="alternate" hreflang="am" href="https://ethioexchange.live/am/banks/CBE" />',
    body: "<h1>Commercial Bank of Ethiopia Exchange Rate</h1>",
  });

  it("sets the unique <title>", () => {
    expect(html).toContain(
      "<title>Commercial Bank of Ethiopia Exchange Rate Today — Ethio Exchange</title>",
    );
  });

  it("sets the unique meta description", () => {
    expect(html).toContain(
      'content="Check the latest exchange rates for Commercial Bank of Ethiopia and compare buying and selling rates."',
    );
  });

  it("sets the canonical URL", () => {
    expect(html).toContain('<link rel="canonical" href="https://ethioexchange.live/en/banks/CBE"');
  });

  it("injects hreflang alternates", () => {
    expect(html).toContain(
      '<link rel="alternate" hreflang="am" href="https://ethioexchange.live/am/banks/CBE" />',
    );
  });

  it("keeps the SPA module script so hydration still works", () => {
    expect(html).toContain('src="/assets/index-AbCdEf.js"');
  });

  it("places static body inside #root for no-JS crawlers", () => {
    expect(html).toContain(
      '<div id="root"><h1>Commercial Bank of Ethiopia Exchange Rate</h1></div>',
    );
  });

  it("never injects noindex (robots stay index,follow)", () => {
    expect(html).toContain('content="index, follow"');
  });

  it("mirrors title/description into social meta", () => {
    expect(html).toContain(
      `<meta property="og:title" content="Commercial Bank of Ethiopia Exchange Rate Today — Ethio Exchange"`,
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://ethioexchange.live/en/banks/CBE"',
    );
  });
});

describe("renderStaticShell() crawlable content", () => {
  const banks = [
    ["CBE", "Commercial Bank of Ethiopia"],
    ["AWB", "Awash Bank"],
    ["COOP", "Cooperative Bank of Oromia"],
  ];

  const body = renderStaticShell({
    messages: {
      common: {
        home: "Home",
        allEthiopianBanks: "All Ethiopian Banks",
        bankRankings: "Bank Rankings",
      },
      nav: { news: "News", about: "About", contact: "Contact" },
    },
    locale: "en",
    h1: "Ethiopian Bank Exchange Rates",
    introHtml: "<p>Compare live buying and selling rates.</p>",
    linkGroups: [],
    bankNav: banks,
    liveNote: "",
  });

  it("renders a meaningful <h1>", () => {
    expect(body).toContain("Ethiopian Bank Exchange Rates</h1>");
  });

  it("emits crawlable bank links (real bank names, no rate numbers)", () => {
    expect(body).toContain('href="/en/banks/CBE"');
    expect(body).toContain("Commercial Bank of Ethiopia");
    expect(body).toContain('href="/en/banks/AWB"');
  });

  it("localizes the bank section heading", () => {
    expect(body).toContain("<h2>All Ethiopian Banks</h2>");
  });
});

describe("prerender ld() structured data", () => {
  it("strings a JSON-LD script block with escaped closures", () => {
    const block = ld({ "@context": "https://schema.org", "@type": "FAQPage" });
    expect(block).toContain('<script type="application/ld+json">');
    expect(block).toContain('"@type":"FAQPage"');
    expect(block).toContain("</script>");
  });

  it("escapes </script> sequences so injected value cannot break the block", () => {
    const block = ld({ text: "</script><script>alert(1)</script>" });
    // The JSON value's closing-script sequences are escaped...
    expect(block).toContain("\\u003c/script");
    // ...so the block contains only the one real closing tag.
    expect(block.match(/<\/script>/g) ?? []).toHaveLength(1);
  });
});

describe("buildHtml() structured data blocks", () => {
  const html = buildHtml({
    template: FIXTURE_TEMPLATE,
    locale: "en",
    title: "US Dollar to ETB Exchange Rate Today",
    description: "Convert USD to ETB and compare Ethiopian bank rates.",
    canonicalFull: "https://ethioexchange.live/en/usd-to-etb",
    hreflang: "",
    headBlocks: [
      ld({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is USD to ETB?",
            acceptedAnswer: { "@type": "Answer", text: "Live rates." },
          },
        ],
      }),
    ],
    body: "<h1>USD to ETB</h1>",
  });

  it("injects child structured data blocks into <head>", () => {
    expect(html).toContain('"@type":"FAQPage"');
    expect(html.match(/application\/ld\+json/g) ?? []).toHaveLength(2); // global graph + FAQ
  });
});
