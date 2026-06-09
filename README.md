# Solar Savings Advisor / Advisor Site Template

Solar Savings Advisor is the default example for a reusable Astro advisor-site template. It includes calculators, educational pages, comparison pages, provider listings, affiliate/CTA placements, database-backed submission capture, an authenticated admin dashboard, and runtime ad snippet controls.

The public website reads JSON at build time and is served by a small Node.js runtime that also exposes submission and admin export APIs.

## Tech Stack

- **Astro 6.4** static site generation
- **TypeScript** strict mode
- **Tailwind CSS v4** through PostCSS
- **JSON-driven content**
- **Authenticated admin dashboard** at `/admin/`
- **PostgreSQL-backed lead/report/calculator submissions**
- **Database-backed custom ad snippets**
- **Coolify-ready Dockerfile runtime**

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

Runtime preview after building:

```bash
npm run build
$env:PORT="4178"; npm run start
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
- `/admin/leads/`
- `/robots.txt`
- `/sitemap.xml`

### Admin Dashboard

The production admin entrypoint is:

```text
/admin/
```

It redirects to:

```text
/admin/leads/
```

The dashboard supports email/password sign-in, password reset, lead review/export, and ad placement snippet overrides.

The admin dashboard requires:

```text
DATABASE_URL=postgres://...
ADMIN_TOKEN=<long random token>
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=<temporary first password>
```

Password reset email requires:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Solar Savings Advisor <onboarding@resend.dev>"
APP_BASE_URL=https://your-domain.example
```

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

Profile cards, calculator runs, solar reports, and quote follow-up forms also post structured records to `/api/submissions` when the database is configured.

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

Runtime ad snippets can be managed in the admin dashboard. When a placement has an enabled custom snippet, the public `AdSlot` component fetches it from `/api/ads/:placementId` and uses it instead of the build-time fallback card.

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

## Submission Capture

`src/components/LeadCaptureForm.astro`, `src/components/ProfileCapture.astro`, `src/components/SolarReportForm.astro`, and calculator runs submit structured records through:

```text
/api/submissions
```

Records are stored in PostgreSQL table `app_submissions` and grouped by category: `quote_follow_up`, `profile`, `solar_report`, `calculator`, `contact`, and `other`.

Admin review, CSV export, account login, password reset, and ad snippet controls are available at `/admin/leads/`.

## Deployment

Coolify Docker deployment:

```text
Dockerfile
Port: 80
DATABASE_URL=postgres://...
ADMIN_TOKEN=<long random token>
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=<temporary first password>
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Solar Savings Advisor <onboarding@resend.dev>"
APP_BASE_URL=https://your-domain.example
```

Create a PostgreSQL database resource in the same Coolify project and connect its internal `DATABASE_URL` to the app.

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
