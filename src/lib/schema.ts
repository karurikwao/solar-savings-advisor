import type { InstallerContent } from "@/lib/types";

export function absoluteUrl(siteUrl: string, path = "/") {
  return new URL(path, siteUrl).toString();
}

export function websiteSchema(site: { siteName: string; siteUrl: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.siteName,
    url: site.siteUrl,
    description: site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site.siteUrl}/questions/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationSchema(site: { siteName: string; siteUrl: string; ogImage: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.siteName,
    url: site.siteUrl,
    logo: absoluteUrl(site.siteUrl, site.ogImage),
  };
}

export function articleSchema(args: {
  siteName: string;
  siteUrl: string;
  path: string;
  title: string;
  description: string;
  type?: "Article" | "Guide";
  lastUpdated?: string;
  reviewedBy?: string;
  sources?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": args.type ?? "Article",
    headline: args.title,
    description: args.description,
    mainEntityOfPage: absoluteUrl(args.siteUrl, args.path),
    dateModified: args.lastUpdated,
    author: { "@type": "Organization", name: args.siteName },
    publisher: { "@type": "Organization", name: args.siteName },
    reviewedBy: args.reviewedBy ? { "@type": "Organization", name: args.reviewedBy } : undefined,
    citation: args.sources,
  };
}

export function installerDirectorySchema(siteUrl: string, page: InstallerContent, path = `/installers/${page.id}/`) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Solar installer listings in ${page.stateName}`,
    description: page.stateDescription,
    itemListElement: page.sampleInstallers.map((installer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Organization",
        name: installer.name,
        description: installer.description,
        areaServed: page.stateName,
      },
    })),
    url: absoluteUrl(siteUrl, path),
  };
}
