# Monetization System

The monetization system is JSON-driven and static-host safe.

## Files

```text
src/content/settings/placements.json
src/content/settings/ads.json
src/content/settings/offers.json
src/content/settings/partners.json
```

## How Resolution Works

Templates render components such as:

```astro
<AdSlot placementId="calculator-results" />
```

The resolver:

1. Finds the matching placement in `placements.json`.
2. Checks allowed content types.
3. Selects enabled ads/offers.
4. Applies optional `startDate` and `endDate`.
5. Sorts by combined placement and item priority.
6. Uses deterministic tie-breaking.

This keeps templates simple and lets the admin change monetization without code edits.

## Supported Placement Areas

Common `templateArea` values include:

- `homepage.hero`
- `homepage.inline`
- `homepage.bottom`
- `tools.index.hero`
- `tools.detail.results`
- `tools.detail.sidebar`
- `questions.index.hero`
- `questions.detail.inline`
- `questions.detail.sidebar`
- `questions.detail.bottom`
- `compare.index.hero`
- `compare.detail.table`
- `compare.detail.sidebar`
- `compare.detail.bottom`
- `guides.index.hero`
- `guides.detail.inline`
- `guides.detail.bottom`
- `providers.index.hero`
- `providers.detail.card`
- `providers.detail.bottom`
- `report.hero`
- `report.results`
- `global.footer`

## Tracking Parameters

CTA links add tracking parameters when present:

- `placementId`
- `pageSlug`
- `offerId`
- `partnerId`

External monetized links open in a new tab with:

```text
rel="sponsored nofollow noopener"
```

## Disclosures

Disclosure copy is managed in:

```text
src/content/settings/disclosures.json
```

Calculator result panels always show educational-estimate disclaimers.
