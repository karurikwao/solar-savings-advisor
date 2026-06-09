export interface LinkItem {
  label: string;
  href: string;
  highlight?: boolean;
}

export interface SiteSettings {
  siteId?: string;
  siteName: string;
  siteShortName?: string;
  nicheName?: string;
  audienceName?: string;
  domain: string;
  siteUrl: string;
  tagline: string;
  description: string;
  email: string;
  ogImage: string;
  logo?: {
    primaryText?: string;
    secondaryText?: string;
    icon?: string;
  };
  primaryCTA?: {
    label: string;
    href: string;
    placementId?: string;
    offerId?: string;
    partnerId?: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
    placementId?: string;
    offerId?: string;
    partnerId?: string;
  };
  colors: {
    solarYellow: string;
    deepNavy: string;
    brightOrange: string;
    softGreen: string;
    lightGray: string;
  };
  routes?: {
    toolsBase?: string;
    questionsBase?: string;
    comparisonsBase?: string;
    guidesBase?: string;
    providersBase?: string;
    providersAliasBase?: string;
    providerLabel?: string;
    providerSingularLabel?: string;
    reportPath?: string;
    reportLabel?: string;
    solutionsPath?: string;
    solutionsLabel?: string;
  };
  providerDirectory?: {
    indexTitle?: string;
    indexDescription?: string;
    metricOneLabel?: string;
    metricTwoLabel?: string;
    notesLabel?: string;
    listingsLabel?: string;
    servicesLabel?: string;
    financingLabel?: string;
  };
  profile?: {
    storageKey?: string;
    fields?: Array<{ id: string; label: string; type: string; placeholder?: string; options?: Array<[string, string]> }>;
  };
  leadCapture?: {
    enabled?: boolean;
    defaultEndpoint?: string;
    mockStorageKey?: string;
  };
  analytics?: {
    enabled?: boolean;
    provider?: string;
    measurementId?: string;
  };
  admin?: {
    showInNavigation?: boolean;
  };
  socialLinks?: LinkItem[];
  footerText?: string;
  nav: LinkItem[];
  footer: Record<string, LinkItem[]>;
  disclosureText: string;
  affiliateDisclosureText?: string;
  estimateDisclaimer: string;
  calculatorDisclaimerText?: string;
}

export interface SeoSettings {
  siteUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  indexNowKey?: string;
  enableIndexing: boolean;
  enableSitemap: boolean;
  enableRobots: boolean;
  enableOpenGraph: boolean;
  enableStructuredData: boolean;
  ogImages?: Record<string, string>;
}

export interface NavigationSettings {
  primary: LinkItem[];
  footer: Record<string, LinkItem[]>;
}

export interface DisclosureSettings {
  affiliateDisclosureText: string;
  estimateDisclaimer: string;
  calculatorDisclaimerText: string;
  leadCaptureDisclaimer: string;
  installerListingDisclaimer: string;
  adminDisclosureText: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface AdSlotData {
  placementId: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  destinationUrl: string;
  partnerId?: string;
  partnerName: string;
  disclosureLabel: string;
  priority: number;
  startDate?: string;
  endDate?: string;
}

export interface OfferData {
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  destinationUrl: string;
  partnerId?: string;
  partnerName: string;
  disclosureLabel: string;
  placementIds: string[];
  priority: number;
  startDate?: string;
  endDate?: string;
}

export type PlacementContentType = "ad" | "offer" | "promo";

export interface PlacementData {
  placementId: string;
  enabled: boolean;
  label: string;
  templateArea: string;
  allowedTypes: PlacementContentType[];
  adPlacementIds?: string[];
  offerIds?: string[];
  priority: number;
}

export interface ResolvedPlacement {
  placement: PlacementData;
  type: "ad" | "offer";
  id: string;
  placementId: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  destinationUrl: string;
  partnerId?: string;
  partnerName: string;
  disclosureLabel: string;
  priority: number;
  startDate?: string;
  endDate?: string;
}

export interface PartnerData {
  id: string;
  name: string;
  description: string;
  url: string;
  logoText: string;
  disclosureLabel: string;
  enabled: boolean;
}

export interface ToolContent {
  id: string;
  title: string;
  description: string;
  calculatorType: string;
  icon: string;
  path?: string;
  category?: string;
  resultPlacementId?: string;
  sidebarPlacementId?: string;
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
  reviewedBy?: string;
  factChecked?: boolean;
  sources?: string[];
}

export interface QuestionContent {
  id: string;
  title: string;
  description: string;
  category: string;
  path: string;
  quickAnswer: string;
  bestFor: string[];
  notBestFor: string[];
  scenario: { title: string; details: string[] };
  factors: string[];
  faqs: FAQItem[];
  relatedQuestions: string[];
  ctaPlacementId: string;
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
  reviewedBy?: string;
  factChecked?: boolean;
  sources?: string[];
}

export interface ComparisonContent {
  id: string;
  title: string;
  path: string;
  description: string;
  optionA: string;
  optionB: string;
  winnerSide: "A" | "B" | "tie";
  winnerSummary: string;
  prosA: string[];
  consA: string[];
  prosB: string[];
  consB: string[];
  bestForA: string;
  bestForB: string;
  costConsiderations: string;
  tableRows: { feature: string; optionA: string; optionB: string; winner: "A" | "B" | "tie" }[];
  faqs: FAQItem[];
  monetizationPlacementId: string;
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
  reviewedBy?: string;
  factChecked?: boolean;
  sources?: string[];
}

export interface GuideContent {
  id: string;
  title: string;
  description: string;
  path: string;
  keyTakeaways: string[];
  sections: { title: string; content: string }[];
  faqs: FAQItem[];
  bannerPlacementId: string;
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
  reviewedBy?: string;
  factChecked?: boolean;
  sources?: string[];
}

export interface InstallerContent {
  id: string;
  stateName: string;
  stateDescription: string;
  avgCostPerWatt: string;
  typicalPayback: string;
  keyIncentives: string[];
  sampleInstallers: {
    name: string;
    rating: number;
    services: string[];
    financing: string[];
    description: string;
  }[];
  faqs: FAQItem[];
  quotePlacementId: string;
  enabled?: boolean;
  draft?: boolean;
  noindex?: boolean;
  lastUpdated?: string;
  reviewedBy?: string;
  factChecked?: boolean;
  sources?: string[];
}
