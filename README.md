# Solar Savings Advisor / Advisor Site Template

Solar Savings Advisor is the default example for a reusable static Astro advisor-site template. It includes calculators, educational pages, comparison pages, provider listings, affiliate/CTA placements, lead-capture placeholders, and a Git-based Decap CMS admin dashboard.

The public website is fully static and reads JSON at build time. No Node.js server is required at runtime.

## Tech Stack

- **Astro 6.4** static site generation
- **TypeScript** strict mode
- **Tailwind CSS v4** through PostCSS
- **JSON-driven content**
- **Decap CMS** static admin dashboard at `/admin/`
- **Coolify-ready `dist/` output**

## A. Running Solar Savings Advisor

Install and run locally:

```bash
npm install
npm run dev
```

Build static output:

```bash
npm run build
```

Output:

```text
dist/
```

Optional static preview:

```bash
node scripts/serve-dist.mjs --port 4178
```

The default site keeps Solar Savings Advisor routes intact:

- `/`
- `/tools/` plus 5 calculator pages
- `/questions/` plus 10 question pages
- `/compare/` plus 6 comparison pages
- `/installers/` plus 5 state pages
- `/providers/` as a generic alias for directory listings
- `/guides/` plus 5 guide pages
- `/solar-report/`
- `/solar-batteries/`
- `/about/`, `/contact/`, `/privacy/`, `/affiliate-disclosure/`, `/disclaimer/`, `/terms/`
- `/admin/`
- `/robots.txt`
- `/sitemap.xml`

### Admin Dashboard

Decap CMS is available at:

```text
/admin/
```

For local Decap editing, run two terminals:

```bash
npm run dev
```

```bash
npx decap-server
```

Then open:

```text
http://localhost:4321/admin/
```

Production note: Coolify static hosting does not automatically provide Git Gateway authentication. Production CMS publishing requires Netlify Git Gateway, GitHub/GitLab/Bitbucket OAuth, or a compatible self-hosted Decap auth proxy.

## B. Creating A New Advisor Site

Create a starter content pack:

```bash
npm run create:niche -- "Business Phone Advisor" business-phone
```

Content packs live in:

```text
src/content-packs/
```

Included examples:

```text
src/content-packs/solar/
src/content-packs/example-business-phone/
```

The public site reads only:

```text
src/content/
```

To activate a pack, copy its folders into `src/content/`. Generic packs can use `src/content/providers/`; the default solar pack uses `src/content/installers/`. The public directory templates read both.

### What To Change

Branding and reusable template settings:

```text
src/content/settings/site.json
src/content/settings/navigation.json
src/content/settings/disclosures.json
src/content/settings/seo.json
```

Monetization:

```text
src/content/settings/placements.json
src/content/settings/ads.json
src/content/settings/offers.json
src/content/settings/partners.json
```

Content:

```text
src/content/questions/
src/content/comparisons/
src/content/guides/
src/content/installers/
src/content/providers/
src/content/tools/
```

Calculator behavior:

```text
src/lib/calculators/
```

Reusable generic calculator types:

- `generic-savings`
- `generic-cost-comparison`

Solar calculator types remain registered:

- `solar-savings`
- `solar-payback`
- `solar-loan`
- `battery-backup`
- `ev-charger`

## Shared User Inputs

Calculators and report forms use a settings-controlled localStorage key:

```text
src/content/settings/site.json -> profile.storageKey
```

Solar preserves:

```text
solarSavingsAdvisor.profile.v1
```

This lets users enter ZIP code, monthly power bill, electricity rate, sun exposure, and financing preference once and reuse those values across calculators and reports.

## Monetization Placements

Templates pass a `placementId` to reusable components such as:

```astro
<AdSlot placementId="calculator-results" />
```

The resolver chooses the highest-priority eligible ad or offer based on enabled status and optional start/end dates. CTA links can include:

- `placementId`
- `pageSlug`
- `offerId`
- `partnerId`

External monetized links use `rel="sponsored nofollow noopener"`.

## SEO And Indexing

Build-time SEO settings live in:

```text
src/content/settings/seo.json
```

This file controls the production site URL, default metadata, OpenGraph images, search verification tags, robots behavior, sitemap generation, structured data, and optional IndexNow submission.

Generated SEO routes:

- `/robots.txt`
- `/sitemap.xml`
- `/sitemap/`

The XML sitemap includes indexable public pages only. `/admin/` is excluded from public navigation, blocked in `robots.txt`, and marked `noindex,nofollow`.

For search verification:

- Add the Google Search Console token to `googleSiteVerification`.
- Add the Bing Webmaster Tools token to `bingSiteVerification`.
- Rebuild and redeploy so the meta tags appear in production HTML.

For optional IndexNow submission:

1. Set `indexNowKey` in `src/content/settings/seo.json`.
2. Create `public/<indexNowKey>.txt` with the key as its contents.
3. Run `npm run build`.
4. Run:

```bash
npm run submit:indexnow
```

Google's Indexing API is intentionally not used for normal advisor pages. Use Search Console sitemap submission for Google.

## Lead Capture Placeholder

`src/components/LeadCaptureForm.astro` is a frontend placeholder. Without an endpoint it stores mock data locally using:

```text
site.json -> leadCapture.mockStorageKey
```

To connect production lead capture later, pass a webhook, CRM, or static form provider endpoint and add consent, spam prevention, privacy coverage, and provider terms.

## Deployment

Coolify static deployment:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

The site is static and deployable on Coolify, Netlify, Vercel static output, Nginx, Caddy, or any static host.

## Documentation

- [New Niche Checklist](docs/new-niche-checklist.md)
- [SEO Launch Checklist](docs/seo-launch-checklist.md)
- [Content Model](docs/content-model.md)
- [Monetization System](docs/monetization-system.md)
- [Deployment](docs/deployment.md)

## Verification

Run before production:

```bash
npm run check
npm run build
npm audit --omit=dev
```

## Compliance

This is a lead-generation and affiliate platform. All calculators, reports, pages, and estimates are for educational purposes only.

**Disclosure:** Estimates are educational only. Actual savings, costs, payback periods, offers, provider availability, incentives, terms, and policies vary.

**Affiliate Disclosure:** The site may earn compensation when users request quotes or click partner links. This does not affect editorial guidance.
