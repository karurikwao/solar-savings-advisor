import { absoluteSiteUrl, getIndexableRoutes } from "@/lib/public-routes";

export const prerender = true;

export function GET() {
  const routes = getIndexableRoutes();

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((route) => {
      const lastmod = route.source?.lastUpdated ? `<lastmod>${route.source.lastUpdated}</lastmod>` : "";
      return `  <url><loc>${absoluteSiteUrl(route.path)}</loc>${lastmod}</url>`;
    })
    .join("\n")}\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
