import { comparisons, guides, installers, questions, seoSettings, siteSettings } from "@/lib/content";
import { getToolPath, tools } from "@/lib/tools";

interface RouteSource {
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
}

export interface PublicRoute {
  path: string;
  title: string;
  description?: string;
  group: string;
  source?: RouteSource;
}

function isEnabled(source?: RouteSource) {
  if (!source) return true;
  return source.enabled !== false && source.draft !== true && source.noindex !== true;
}

export function isRouteIndexable(route: PublicRoute) {
  return seoSettings.enableIndexing && isEnabled(route.source);
}

export function absoluteSiteUrl(path: string) {
  return new URL(path, seoSettings.siteUrl || siteSettings.siteUrl).toString();
}

export function getPublicRouteGroups() {
  const staticRoutes: Record<string, PublicRoute[]> = {
    Core: [
      { path: "/", title: "Home", description: seoSettings.defaultDescription, group: "Core" },
      { path: "/solar-report/", title: siteSettings.routes?.reportLabel ?? "Solar Report", description: "Generate a personalized advisor report from saved inputs.", group: "Core" },
      { path: "/solar-batteries/", title: siteSettings.routes?.solutionsLabel ?? "Solar Batteries", description: "Compare battery backup options and cost considerations.", group: "Core" },
    ],
    Tools: [
      { path: "/tools/", title: `${siteSettings.nicheName ?? "Advisor"} Calculators`, description: "Calculator and planning tool index.", group: "Tools" },
      ...tools.filter(isEnabled).map((tool) => ({
        path: `/tools/${getToolPath(tool)}/`,
        title: tool.title,
        description: tool.description,
        group: "Tools",
        source: tool,
      })),
    ],
    Questions: [
      { path: "/questions/", title: `${siteSettings.nicheName ?? "Advisor"} Questions`, description: "Question page index.", group: "Questions" },
      ...questions.filter(isEnabled).map((page) => ({
        path: `/questions/${page.path}/`,
        title: page.title,
        description: page.description,
        group: "Questions",
        source: page,
      })),
    ],
    Comparisons: [
      { path: "/compare/", title: `${siteSettings.nicheName ?? "Advisor"} Comparisons`, description: "Comparison page index.", group: "Comparisons" },
      ...comparisons.filter(isEnabled).map((page) => ({
        path: `/compare/${page.path}/`,
        title: page.title,
        description: page.description,
        group: "Comparisons",
        source: page,
      })),
    ],
    Guides: [
      { path: "/guides/", title: `${siteSettings.nicheName ?? "Advisor"} Guides`, description: "Guide page index.", group: "Guides" },
      ...guides.filter(isEnabled).map((page) => ({
        path: `/guides/${page.path}/`,
        title: page.title,
        description: page.description,
        group: "Guides",
        source: page,
      })),
    ],
    "Providers and Installers": [
      { path: "/installers/", title: siteSettings.providerDirectory?.indexTitle ?? "Provider Directory", description: siteSettings.providerDirectory?.indexDescription, group: "Providers and Installers" },
      { path: "/providers/", title: `${siteSettings.routes?.providerLabel ?? "Providers"} Directory`, description: siteSettings.providerDirectory?.indexDescription, group: "Providers and Installers" },
      ...installers.filter(isEnabled).flatMap((page) => [
        {
          path: `/installers/${page.id}/`,
          title: `${siteSettings.routes?.providerLabel ?? "Installers"} in ${page.stateName}`,
          description: page.stateDescription,
          group: "Providers and Installers",
          source: page,
        },
        {
          path: `/providers/${page.id}/`,
          title: `${siteSettings.routes?.providerLabel ?? "Providers"} in ${page.stateName}`,
          description: page.stateDescription,
          group: "Providers and Installers",
          source: page,
        },
      ]),
    ],
    Utility: [
      { path: "/sitemap/", title: "HTML Sitemap", description: "Crawlable page index.", group: "Utility" },
      { path: "/about/", title: "About", description: "About this site.", group: "Utility" },
      { path: "/contact/", title: "Contact", description: "Contact page.", group: "Utility" },
      { path: "/privacy/", title: "Privacy Policy", description: "Privacy policy.", group: "Utility" },
      { path: "/affiliate-disclosure/", title: "Affiliate Disclosure", description: "Affiliate disclosure.", group: "Utility" },
      { path: "/disclaimer/", title: "Disclaimer", description: "Educational estimate disclaimer.", group: "Utility" },
      { path: "/terms/", title: "Terms of Service", description: "Terms of service.", group: "Utility" },
    ],
  };

  return staticRoutes;
}

export function getPublicRoutes() {
  return Object.values(getPublicRouteGroups()).flat();
}

export function getIndexableRoutes() {
  if (!seoSettings.enableSitemap) return [];
  return getPublicRoutes().filter(isRouteIndexable);
}
