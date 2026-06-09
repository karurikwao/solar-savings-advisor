export interface TrackingParams {
  placementId?: string;
  pageSlug?: string;
  offerId?: string;
  partnerId?: string;
}

export function normalizePageSlug(pathname: string) {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return trimmed || "home";
}

export function withTrackingParams(href: string, params: TrackingParams) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }

  const [withoutHash, hash = ""] = href.split("#");
  const [path, query = ""] = withoutHash.split("?");
  const search = new URLSearchParams(query);

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const queryString = search.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}

export function isExternalHref(href: string, siteOrigin: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  try {
    const url = new URL(href, siteOrigin);
    return url.origin !== siteOrigin;
  } catch {
    return false;
  }
}
