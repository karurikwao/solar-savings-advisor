import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const seoPath = join(root, "src", "content", "settings", "seo.json");
const sitemapPath = join(root, "dist", "sitemap.xml");

function extractUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).filter(Boolean);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const seo = JSON.parse(await readFile(seoPath, "utf8"));
  const siteUrl = seo.siteUrl;
  const indexNowKey = seo.indexNowKey;

  if (!siteUrl) {
    console.log("IndexNow skipped: src/content/settings/seo.json is missing siteUrl.");
    return;
  }

  if (!indexNowKey) {
    console.log("IndexNow skipped: set indexNowKey in src/content/settings/seo.json when the site is ready.");
    return;
  }

  if (!(await exists(sitemapPath))) {
    console.log("IndexNow skipped: dist/sitemap.xml was not found. Run npm run build first.");
    return;
  }

  const keyFile = join(root, "public", `${indexNowKey}.txt`);
  if (!(await exists(keyFile))) {
    console.warn(`IndexNow warning: public/${indexNowKey}.txt is missing. Create it with the key as its file contents before submitting.`);
  }

  const sitemap = await readFile(sitemapPath, "utf8");
  const urlList = extractUrls(sitemap);

  if (!urlList.length) {
    console.log("IndexNow skipped: no URLs were found in dist/sitemap.xml.");
    return;
  }

  const host = new URL(siteUrl).host;
  const payload = {
    host,
    key: indexNowKey,
    keyLocation: new URL(`/${indexNowKey}.txt`, siteUrl).toString(),
    urlList,
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`IndexNow failed with HTTP ${response.status}: ${body}`);
      process.exitCode = 1;
      return;
    }

    console.log(`IndexNow submitted ${urlList.length} URL(s) for ${host}.`);
  } catch (error) {
    console.error(`IndexNow failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main();
