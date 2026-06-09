import site from "@/content/settings/site.json";
import ads from "@/content/settings/ads.json";
import disclosures from "@/content/settings/disclosures.json";
import navigation from "@/content/settings/navigation.json";
import offers from "@/content/settings/offers.json";
import placementsData from "@/content/settings/placements.json";
import partners from "@/content/settings/partners.json";
import seo from "@/content/settings/seo.json";
import type {
  AdSlotData,
  ComparisonContent,
  DisclosureSettings,
  GuideContent,
  InstallerContent,
  NavigationSettings,
  OfferData,
  PartnerData,
  PlacementData,
  QuestionContent,
  ResolvedPlacement,
  SeoSettings,
  SiteSettings,
} from "@/lib/types";

function fromGlob<T>(modules: Record<string, unknown>) {
  return Object.values(modules).map((module) => {
    const value = module as { default?: T };
    return (value.default ?? module) as T;
  });
}

export const siteSettings = site as SiteSettings;
export const seoSettings = seo as SeoSettings;
export const navigationSettings = navigation as NavigationSettings;
export const disclosureSettings = disclosures as DisclosureSettings;
export const adSlots = (ads.slots as AdSlotData[]).sort((a, b) => b.priority - a.priority);
export const affiliateOffers = (offers.offers as OfferData[]).sort((a, b) => b.priority - a.priority);
export const placements = (placementsData.placements as PlacementData[]).sort((a, b) => b.priority - a.priority);
export const partnerList = (partners.partners as PartnerData[]).filter((partner) => partner.enabled);

export const questions = fromGlob<QuestionContent>(
  import.meta.glob("../content/questions/*.json", { eager: true })
).sort((a, b) => a.title.localeCompare(b.title));

export const comparisons = fromGlob<ComparisonContent>(
  import.meta.glob("../content/comparisons/*.json", { eager: true })
).sort((a, b) => a.title.localeCompare(b.title));

export const guides = fromGlob<GuideContent>(
  import.meta.glob("../content/guides/*.json", { eager: true })
).sort((a, b) => a.title.localeCompare(b.title));

const installerPages = fromGlob<InstallerContent>(
  import.meta.glob("../content/installers/*.json", { eager: true })
);
const providerPages = fromGlob<InstallerContent>(
  import.meta.glob("../content/providers/*.json", { eager: true })
);

export const installers = [...installerPages, ...providerPages].sort((a, b) => a.stateName.localeCompare(b.stateName));

function isCurrentlyEligible(item: { enabled: boolean; startDate?: string; endDate?: string }) {
  const now = new Date();
  if (!item.enabled) return false;
  if (item.startDate && new Date(item.startDate) > now) return false;
  if (item.endDate && new Date(item.endDate) < now) return false;
  return true;
}

function normalizeAd(slot: AdSlotData, placement: PlacementData): ResolvedPlacement {
  return {
    ...slot,
    id: slot.placementId,
    type: "ad",
    placement,
    priority: slot.priority + placement.priority,
  };
}

function normalizeOffer(offer: OfferData, placement: PlacementData): ResolvedPlacement {
  return {
    ...offer,
    type: "offer",
    placement,
    placementId: placement.placementId,
    priority: offer.priority + placement.priority,
  };
}

export function getPlacement(placementId: string) {
  return placements.find((placement) => placement.enabled && placement.placementId === placementId);
}

export function resolvePlacement(placementId: string, allowedTypes?: Array<"ad" | "offer">) {
  const placement = getPlacement(placementId);
  if (!placement) return undefined;

  // Placements are template-level switches. The resolver keeps page templates simple:
  // pass a placementId, then let settings JSON choose the best active ad or offer.
  const allowed = new Set(allowedTypes ?? placement.allowedTypes.filter((type) => type !== "promo"));
  const candidates: ResolvedPlacement[] = [];

  if (allowed.has("ad")) {
    const adPlacementIds = placement.adPlacementIds?.length ? placement.adPlacementIds : [placement.placementId];
    candidates.push(
      ...adSlots
        .filter((slot) => adPlacementIds.includes(slot.placementId) && isCurrentlyEligible(slot))
        .map((slot) => normalizeAd(slot, placement))
    );
  }

  if (allowed.has("offer")) {
    candidates.push(
      ...affiliateOffers
        .filter((offer) => {
          if (!isCurrentlyEligible(offer)) return false;
          if (placement.offerIds?.length) return placement.offerIds.includes(offer.id);
          return offer.placementIds.includes(placement.placementId);
        })
        .map((offer) => normalizeOffer(offer, placement))
    );
  }

  return candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.type === b.type) return a.id.localeCompare(b.id);
    return a.type === "offer" ? -1 : 1;
  })[0];
}

export function getAdSlot(placementId: string) {
  return resolvePlacement(placementId, ["ad"]);
}

export function getOfferForPlacement(placementId: string) {
  return resolvePlacement(placementId, ["offer"]);
}

export function isPublished(item: { enabled?: boolean; draft?: boolean }) {
  return item.enabled !== false && item.draft !== true;
}

export function bySlug<T extends { path?: string; id: string }>(items: T[], slug: string) {
  return items.find((item) => item.path === slug || item.id === slug);
}
