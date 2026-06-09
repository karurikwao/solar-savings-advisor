# Content Model

The public site is static. Astro reads JSON at build time from:

```text
src/content/
```

Decap CMS edits those same files through Git-backed commits.

## Settings

```text
src/content/settings/site.json
src/content/settings/navigation.json
src/content/settings/disclosures.json
src/content/settings/ads.json
src/content/settings/offers.json
src/content/settings/placements.json
src/content/settings/partners.json
```

`site.json` controls branding, route labels, shared localStorage keys, lead-capture defaults, provider-directory labels, and default CTAs.

`navigation.json` controls primary navigation and footer columns.

`disclosures.json` controls affiliate, estimate, calculator, provider-listing, lead-capture, and admin disclosure text.

## Pages

```text
src/content/questions/
src/content/comparisons/
src/content/guides/
src/content/installers/
src/content/providers/
src/content/tools/
```

Solar uses `installers`. Generic packs may use `providers`. The public directory pages combine both folders.

## Tools

Tool JSON selects calculator behavior by `calculatorType`.

```json
{
  "id": "business-phone-savings-calculator",
  "title": "Business Phone Savings Calculator",
  "calculatorType": "generic-savings",
  "resultPlacementId": "calculator-results"
}
```

Registered calculator modules live in:

```text
src/lib/calculators/
```

## Content Packs

Reusable packs live outside the active site content:

```text
src/content-packs/solar/
src/content-packs/example-business-phone/
```

The build does not read content packs directly. Copy a pack into `src/content/` when you want it to become active.
