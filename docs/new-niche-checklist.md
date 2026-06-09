# New Niche Checklist

Use this checklist when turning Solar Savings Advisor into a new static advisor site.

## 1. Create Or Copy A Content Pack

Run:

```bash
npm run create:niche -- "Business Phone Advisor" business-phone
```

This creates:

```text
src/content-packs/business-phone/
```

You can also copy the included examples:

```text
src/content-packs/solar/
src/content-packs/example-business-phone/
```

## 2. Activate The Pack

The live public site reads from:

```text
src/content/
```

To activate a content pack, copy its folders into `src/content/`:

```text
settings -> src/content/settings
questions -> src/content/questions
comparisons -> src/content/comparisons
guides -> src/content/guides
tools -> src/content/tools
providers -> src/content/providers
```

Solar can keep using `src/content/installers/`. Generic packs can use `src/content/providers/`; the public provider routes read both folders.

## 3. Update Branding

Edit:

```text
src/content/settings/site.json
src/content/settings/navigation.json
src/content/settings/disclosures.json
```

Check:

- `siteId` for localStorage keys
- `siteName`, `siteShortName`, `domain`, `siteUrl`
- `colors`
- `logo`
- `primaryCTA` and `secondaryCTA`
- `routes` labels
- `providerDirectory` labels

## 4. Update Monetization

Edit:

```text
src/content/settings/placements.json
src/content/settings/ads.json
src/content/settings/offers.json
src/content/settings/partners.json
```

Each template passes a `placementId`. The resolver picks an enabled, date-valid ad or offer using priority.

## 5. Update Tools

Edit JSON tools in:

```text
src/content/tools/
```

Each tool needs a `calculatorType` registered in:

```text
src/lib/calculators/index.ts
```

Reusable generic calculators already exist:

- `generic-savings`
- `generic-cost-comparison`

## 6. Verify

Run:

```bash
npm run check
npm run build
npm audit --omit=dev
```

Then preview the static output:

```bash
node scripts/serve-dist.mjs --port 4178
```
