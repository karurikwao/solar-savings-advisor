import { seoSettings } from "@/lib/content";
import { absoluteSiteUrl } from "@/lib/public-routes";

export const prerender = true;

export function GET() {
  const lines = ["User-agent: *"];

  if (!seoSettings.enableRobots) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
    lines.push("Disallow: /admin/");
  }

  if (seoSettings.enableSitemap) {
    lines.push(`Sitemap: ${absoluteSiteUrl("/sitemap.xml")}`);
  }

  lines.push("");

  return new Response(
    lines.join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
