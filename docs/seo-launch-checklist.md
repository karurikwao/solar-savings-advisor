# SEO Launch Checklist

Use this checklist before and after deploying a generated advisor site. The public site remains fully static; all of these settings are build-time JSON or static files.

## Before Deploy

- Set the production domain in `src/content/settings/seo.json` as `siteUrl`.
- Confirm `enableIndexing`, `enableSitemap`, `enableRobots`, `enableOpenGraph`, and `enableStructuredData` are `true`.
- Add Google Search Console verification to `googleSiteVerification` after Google provides the token.
- Add Bing Webmaster Tools verification to `bingSiteVerification` after Bing provides the `msvalidate.01` token.
- Review all public content files for `draft`, `enabled`, and `noindex` values.
- Confirm important pages have `lastUpdated`, `reviewedBy`, `factChecked`, and `sources`.
- Replace default OpenGraph images if the niche changes from solar.
- Keep `/admin/` unlinked from public navigation unless you intentionally expose it.

## Build Verification

Run:

```bash
npm run check
npm run build
npm audit --omit=dev
```

Then inspect:

- `dist/sitemap.xml`
- `dist/robots.txt`
- `dist/sitemap/index.html`
- Representative pages under `dist/questions/`, `dist/compare/`, `dist/guides/`, `dist/tools/`, and `dist/installers/`

The sitemap should include only indexable public pages and should not include `/admin/`.

## After Deploy

- Open the production URL and confirm canonical tags use the production domain.
- Submit `/sitemap.xml` in Google Search Console.
- Submit `/sitemap.xml` in Bing Webmaster Tools.
- Inspect a few rendered pages with the URL inspection tools in Google and Bing.
- Verify OpenGraph previews with the social platform preview tools you care about.
- Confirm `/robots.txt` allows public crawling and disallows `/admin/`.

## IndexNow

IndexNow is optional and is mainly useful for Bing and other participating engines. To enable it:

1. Generate a unique IndexNow key.
2. Put the key in `src/content/settings/seo.json` as `indexNowKey`.
3. Create `public/<indexNowKey>.txt` with the key as the file contents.
4. Run `npm run build`.
5. Run:

```bash
npm run submit:indexnow
```

The script reads `dist/sitemap.xml`, sends those URLs to IndexNow, and fails gracefully when the key or sitemap is missing.

## Google Indexing API

Do not use the Google Indexing API for ordinary advisor-site pages. Google limits that API to eligible job posting and livestream video structured data use cases. Use Search Console sitemap submission and normal crawling for this static site.

## Content Quality

- Avoid thin pages that only repeat calculator outputs or affiliate offers.
- Add unique quick answers, examples, FAQs, and decision factors to high-intent pages.
- Keep calculator and report results clearly labeled as educational estimates.
- Do not imply the site owns, operates, endorses, or legally represents listed third-party providers.
- Update sources and `lastUpdated` dates when incentive, pricing, or policy assumptions change.
