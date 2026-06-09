import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const [, , rawName, rawSlug] = process.argv;

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

if (!rawName) {
  console.log("Usage: npm run create:niche -- \"Business Phone Advisor\" [business-phone]");
  process.exit(1);
}

const siteName = rawName.trim();
const slug = slugify(rawSlug || siteName);
const siteId = slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const root = process.cwd();
const packRoot = path.join(root, "src", "content-packs", slug);

if (existsSync(packRoot)) {
  console.error(`Content pack already exists: ${path.relative(root, packRoot)}`);
  console.error("Choose a different slug or remove the existing pack deliberately.");
  process.exit(1);
}

const folders = ["settings", "questions", "comparisons", "guides", "providers", "tools"];
await Promise.all(folders.map((folder) => mkdir(path.join(packRoot, folder), { recursive: true })));

const nicheName = titleCase(slug);
const primaryOfferId = "primary-offer";
const partnerId = "advisor-site";

await writeJson(path.join(packRoot, "settings", "site.json"), {
  siteId,
  siteName,
  siteShortName: siteName,
  nicheName,
  audienceName: `People comparing ${nicheName.toLowerCase()} options`,
  domain: `${slug}.example`,
  siteUrl: `https://${slug}.example`,
  tagline: `Compare ${nicheName.toLowerCase()} options before you buy.`,
  description: `A static advisor site for ${nicheName.toLowerCase()} calculators, comparisons, guides, offers, and lead capture.`,
  email: `hello@${slug}.example`,
  ogImage: "/og-image.svg",
  logo: { primaryText: siteName, secondaryText: "", icon: "help" },
  primaryCTA: { label: "Start Calculator", href: "/tools/savings-calculator/", placementId: "home-hero", offerId: primaryOfferId, partnerId },
  colors: { solarYellow: "#FACC15", deepNavy: "#111827", brightOrange: "#2563EB", softGreen: "#10B981", lightGray: "#F3F4F6" },
  routes: {
    toolsBase: "/tools/",
    questionsBase: "/questions/",
    comparisonsBase: "/compare/",
    guidesBase: "/guides/",
    providersBase: "/providers/",
    providerLabel: "Providers",
    providerSingularLabel: "Provider",
    reportPath: "/solar-report/",
    reportLabel: "Advisor Report",
  },
  providerDirectory: {
    indexTitle: `${nicheName} Providers`,
    indexDescription: `Directory-style listings for ${nicheName.toLowerCase()} providers.`,
    metricOneLabel: "Typical price",
    metricTwoLabel: "Setup timeline",
    notesLabel: "Selection Notes",
    listingsLabel: "Sample Provider Listings",
    servicesLabel: "Capabilities",
    financingLabel: "Contract Options",
  },
  profile: { storageKey: `${siteId}.profile.v1`, fields: [] },
  leadCapture: { enabled: true, defaultEndpoint: "", mockStorageKey: `${siteId}.mockLead.v1` },
  analytics: { enabled: false, provider: "", measurementId: "" },
  admin: { showInNavigation: false },
  socialLinks: [],
  footerText: `Static advisor-site template content for ${nicheName.toLowerCase()}.`,
  nav: [
    { label: "Home", href: "/" },
    { label: "Tools", href: "/tools/" },
    { label: "Questions", href: "/questions/" },
    { label: "Compare", href: "/compare/" },
    { label: "Providers", href: "/providers/" },
    { label: "Guides", href: "/guides/" },
  ],
  footer: {
    resources: [{ href: "/tools/", label: "Tools" }],
    explore: [{ href: "/questions/", label: "Questions" }, { href: "/compare/", label: "Comparisons" }, { href: "/guides/", label: "Guides" }],
    company: [{ href: "/privacy/", label: "Privacy Policy" }, { href: "/affiliate-disclosure/", label: "Affiliate Disclosure" }],
  },
  disclosureText: `${siteName} may earn compensation from partner links or quote requests.`,
  affiliateDisclosureText: `${siteName} may earn compensation from partner links or quote requests.`,
  estimateDisclaimer: `${nicheName} estimates are educational only. Verify current pricing, terms, and availability with providers.`,
  calculatorDisclaimerText: "Calculator results are educational estimates only and are not quotes or purchasing recommendations.",
});

await writeJson(path.join(packRoot, "settings", "navigation.json"), {
  primary: [
    { label: "Home", href: "/" },
    { label: "Tools", href: "/tools/" },
    { label: "Questions", href: "/questions/" },
    { label: "Compare", href: "/compare/" },
    { label: "Providers", href: "/providers/" },
    { label: "Guides", href: "/guides/" },
  ],
  footer: {
    resources: [{ href: "/tools/", label: "Tools" }],
    explore: [{ href: "/questions/", label: "Questions" }, { href: "/compare/", label: "Comparisons" }, { href: "/guides/", label: "Guides" }],
    company: [{ href: "/privacy/", label: "Privacy Policy" }, { href: "/affiliate-disclosure/", label: "Affiliate Disclosure" }],
  },
});

await writeJson(path.join(packRoot, "settings", "disclosures.json"), {
  affiliateDisclosureText: `${siteName} may earn compensation from partner links or quote requests.`,
  estimateDisclaimer: `${nicheName} content and estimates are educational only.`,
  calculatorDisclaimerText: "Calculator results are educational estimates only and are not quotes or purchasing recommendations.",
  leadCaptureDisclaimer: "This static placeholder does not send personal information anywhere unless a production endpoint is configured.",
  installerListingDisclaimer: "Provider listings are informational directory examples. The site does not claim to own, operate, endorse, or legally represent listed companies.",
  adminDisclosureText: "Use the admin dashboard to edit content and monetization files through a Git-backed workflow.",
});

await writeJson(path.join(packRoot, "settings", "seo.json"), {
  siteUrl: `https://${slug}.example`,
  defaultTitle: `${siteName} - Compare ${nicheName} Options`,
  defaultDescription: `Compare ${nicheName.toLowerCase()} calculators, guides, provider options, and educational buying questions.`,
  defaultOgImage: "/og-image.svg",
  googleSiteVerification: "",
  bingSiteVerification: "",
  indexNowKey: "",
  enableIndexing: true,
  enableSitemap: true,
  enableRobots: true,
  enableOpenGraph: true,
  enableStructuredData: true,
  ogImages: {
    home: "/og-image.svg",
    tools: "/og-image.svg",
    questions: "/og-image.svg",
    comparisons: "/og-image.svg",
    guides: "/og-image.svg",
    providers: "/og-image.svg",
    default: "/og-image.svg",
  },
});

await writeJson(path.join(packRoot, "settings", "partners.json"), {
  partners: [{ id: partnerId, name: siteName, description: "In-house educational tools and guides.", url: "/tools/", logoText: siteName.slice(0, 3).toUpperCase(), disclosureLabel: "Educational tools", enabled: true }],
});

await writeJson(path.join(packRoot, "settings", "offers.json"), {
  offers: [{
    id: primaryOfferId,
    enabled: true,
    title: `${nicheName} Starter Checklist`,
    subtitle: "Use this static offer as the first monetization placeholder.",
    buttonText: "Start Here",
    destinationUrl: "/tools/savings-calculator/",
    partnerId,
    partnerName: siteName,
    disclosureLabel: "Educational resource",
    placementIds: ["home-hero", "calculator-results", "bottom-lead", "global-footer"],
    priority: 100,
    startDate: "2026-01-01",
    endDate: "2030-12-31",
  }],
});

await writeJson(path.join(packRoot, "settings", "ads.json"), {
  slots: [{
    placementId: "home-hero",
    enabled: true,
    title: `${nicheName} comparison starter`,
    subtitle: "Replace this with a real ad, offer, or CTA.",
    buttonText: "Open Calculator",
    destinationUrl: "/tools/savings-calculator/",
    partnerId,
    partnerName: siteName,
    disclosureLabel: "Educational estimate",
    priority: 80,
    startDate: "2026-01-01",
    endDate: "2030-12-31",
  }],
});

await writeJson(path.join(packRoot, "settings", "placements.json"), {
  placements: [
    { placementId: "home-hero", enabled: true, label: "Homepage hero CTA", templateArea: "homepage.hero", allowedTypes: ["offer", "ad"], adPlacementIds: ["home-hero"], offerIds: [primaryOfferId], priority: 100 },
    { placementId: "calculator-results", enabled: true, label: "Calculator results CTA", templateArea: "tools.detail.results", allowedTypes: ["offer", "ad"], adPlacementIds: ["home-hero"], offerIds: [primaryOfferId], priority: 90 },
    { placementId: "bottom-lead", enabled: true, label: "Bottom CTA", templateArea: "global.bottom", allowedTypes: ["offer", "ad"], adPlacementIds: ["home-hero"], offerIds: [primaryOfferId], priority: 60 },
    { placementId: "global-footer", enabled: true, label: "Footer CTA", templateArea: "global.footer", allowedTypes: ["offer", "ad"], adPlacementIds: ["home-hero"], offerIds: [primaryOfferId], priority: 50 },
  ],
});

await writeJson(path.join(packRoot, "questions", "starter-question.json"), {
  id: "starter-question",
  title: `Is ${nicheName} Worth It?`,
  description: `A starter question page for ${nicheName.toLowerCase()}.`,
  category: "General",
  path: "starter-question",
  quickAnswer: "Replace this quick answer with niche-specific guidance.",
  bestFor: ["Replace with best-fit criteria"],
  notBestFor: ["Replace with watch-outs"],
  scenario: { title: "Example Scenario", details: ["Replace with scenario details"] },
  factors: ["Pricing", "Terms", "Provider fit"],
  faqs: [{ question: "What should I verify?", answer: "Verify current pricing, terms, and availability with providers." }],
  relatedQuestions: [],
  ctaPlacementId: "bottom-lead",
});

await writeJson(path.join(packRoot, "tools", "savings-calculator.json"), {
  id: "savings-calculator",
  title: `${nicheName} Savings Calculator`,
  description: `Estimate potential savings for ${nicheName.toLowerCase()} options.`,
  calculatorType: "generic-savings",
  icon: "chart",
  path: "savings-calculator",
  category: nicheName,
  resultPlacementId: "calculator-results",
  sidebarPlacementId: "bottom-lead",
});

console.log(`Created content pack: ${path.relative(root, packRoot)}`);
console.log("Next steps:");
console.log("1. Edit the generated JSON files.");
console.log("2. Copy pack folders into src/content/ when you are ready to activate it.");
console.log("3. Run npm run check and npm run build.");
