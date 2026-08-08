/**
 * Industry config for SEO cornerstone pages.
 * -------------------------------------------
 * Per-industry metadata used by:
 *   - Industry software landing pages (src/app/[industry]-software/page.tsx)
 *   - Industry contractor city directory pages (src/app/[industry]-contractors/[city]/page.tsx)
 *
 * VERIFIED FEATURES ONLY: The feature matrix, workflow steps, and value-prop
 * cards in the shared SEO components only reference CRM capabilities that
 * have been verified against the Prisma schema + view components. See
 * src/components/seo/feature-matrix.tsx for the audit notes.
 *
 * DO NOT add industry-specific feature claims (e.g. "refrigerant logging")
 * to this config — that was the Task C bug. The config only controls
 * framing/copy, not feature existence.
 */

export interface IndustryConfig {
  industryId: string;
  softwareSlug: string;
  contractorsBasePath: string;
  name: string;
  nameLower: string;
  contractorNoun: string;
  emergencyExample: string;
  demandLabel: string;
  h1: string;
  subtitle: string;
  titleTag: string;
  metaDescription: string;
  primaryCta: string;
  audiences: string[];
  relatedIndustries: { slug: string; name: string; icon: string }[];
}

// ── Factory: generates standard fields from minimal input ───────────────────
// Most fields follow a predictable pattern per industry. The factory generates
// them from (industryId, name, softwareSlug, contractorNoun, emergencyExample,
// demandLabel, audiences). Per-industry overrides can be added after creation.
function makeConfig(args: {
  industryId: string;
  name: string;
  softwareSlug: string;
  contractorNoun: string;
  emergencyExample: string;
  demandLabel: string;
  audiences: string[];
  relatedIndustries: { slug: string; name: string; icon: string }[];
}): IndustryConfig {
  const { industryId, name, softwareSlug, contractorNoun, emergencyExample, demandLabel, audiences, relatedIndustries } = args;
  const nameLower = name.toLowerCase();
  const contractorsBasePath = `/${industryId.replace(/-/g, '-')}-contractors`;
  const titleTag = `${name} Service Software | Scheduling, Dispatch & Invoicing | Fieseros`;
  const metaDescription = `${name} service software for scheduling, dispatch, equipment history, maintenance contracts, invoicing and customer communication. Start your free Fieseros trial today.`;
  const h1 = `${name} Software for Scheduling, Dispatch & Invoicing`;
  const subtitle = `Run your ${nameLower} business from one place. Schedule technicians, dispatch jobs, track equipment and service history, automate customer reminders, and send invoices with Fieseros.`;
  const primaryCta = `Start Your Free ${name} Trial`;
  return {
    industryId,
    softwareSlug,
    contractorsBasePath,
    name,
    nameLower,
    contractorNoun,
    emergencyExample,
    demandLabel,
    h1,
    subtitle,
    titleTag,
    metaDescription,
    primaryCta,
    audiences,
    relatedIndustries,
  };
}

const DEFAULT_RELATED = [
  { slug: "best-field-service-software", name: "Best Field Service Software", icon: "Award" },
  { slug: "field-service-software", name: "Field Service Software", icon: "Briefcase" },
];

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  hvac: makeConfig({
    industryId: "hvac",
    name: "HVAC",
    softwareSlug: "hvac-software",
    contractorNoun: "HVAC contractors",
    emergencyExample: "My AC isn't working",
    demandLabel: "seasonal demand",
    audiences: ["HVAC contractors", "AC repair companies", "Heating companies", "Residential HVAC businesses", "Commercial HVAC companies", "Refrigeration contractors", "HVAC maintenance companies", "Multi-technician HVAC businesses", "New HVAC startups"],
    relatedIndustries: [
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  plumbing: makeConfig({
    industryId: "plumbing",
    name: "Plumbing",
    softwareSlug: "plumbing-software",
    contractorNoun: "plumbing contractors",
    emergencyExample: "I have a burst pipe",
    demandLabel: "emergency surges",
    audiences: ["Plumbing contractors", "Drain cleaning companies", "Water heater specialists", "Residential plumbers", "Commercial plumbing companies", "Emergency plumbers", "Plumbing maintenance businesses", "Multi-technician plumbing teams", "New plumbing startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  electrical: makeConfig({
    industryId: "electrical",
    name: "Electrical",
    softwareSlug: "electrical-contractor-software",
    contractorNoun: "electrical contractors",
    emergencyExample: "My power is out",
    demandLabel: "demand spikes",
    audiences: ["Electrical contractors", "Electricians", "Residential electricians", "Commercial electrical companies", "Industrial electricians", "Emergency electricians", "Electrical maintenance businesses", "Multi-technician electrical teams", "New electrical startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  roofing: makeConfig({
    industryId: "roofing",
    name: "Roofing",
    softwareSlug: "roofing-software",
    contractorNoun: "roofing contractors",
    emergencyExample: "My roof is leaking",
    demandLabel: "storm season",
    audiences: ["Roofing contractors", "Roof repair companies", "Roof installation companies", "Residential roofers", "Commercial roofing companies", "Storm damage specialists", "Roofing maintenance businesses", "Multi-crew roofing teams", "New roofing startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      ...DEFAULT_RELATED,
    ],
  }),
  landscaping: makeConfig({
    industryId: "landscaping",
    name: "Landscaping",
    softwareSlug: "landscaping-software",
    contractorNoun: "landscaping contractors",
    emergencyExample: "I need emergency tree removal",
    demandLabel: "spring and fall rush",
    audiences: ["Landscaping contractors", "Landscape design companies", "Hardscape contractors", "Residential landscapers", "Commercial landscaping companies", "Garden maintenance businesses", "Landscape installation teams", "Multi-crew landscaping businesses", "New landscaping startups"],
    relatedIndustries: [
      { slug: "lawn-care-software", name: "Lawn Care", icon: "Leaf" },
      { slug: "tree-care-software", name: "Tree Care", icon: "TreePine" },
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      ...DEFAULT_RELATED,
    ],
  }),
  "lawn-care": makeConfig({
    industryId: "lawn-care",
    name: "Lawn Care",
    softwareSlug: "lawn-care-software",
    contractorNoun: "lawn care companies",
    emergencyExample: "I need my lawn mowed before an event",
    demandLabel: "growing season",
    audiences: ["Lawn care companies", "Lawn maintenance businesses", "Residential lawn services", "Commercial lawn care", "Lawn treatment specialists", "Mowing services", "Multi-route lawn businesses", "New lawn care startups"],
    relatedIndustries: [
      { slug: "landscaping-software", name: "Landscaping", icon: "Leaf" },
      { slug: "tree-care-software", name: "Tree Care", icon: "TreePine" },
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      ...DEFAULT_RELATED,
    ],
  }),
  painting: makeConfig({
    industryId: "painting",
    name: "Painting",
    softwareSlug: "painting-software",
    contractorNoun: "painting contractors",
    emergencyExample: "I need an estimate for interior painting",
    demandLabel: "painting season",
    audiences: ["Painting contractors", "Interior painters", "Exterior painters", "Residential painting companies", "Commercial painting companies", "Cabinet refinishers", "Painting maintenance businesses", "Multi-crew painting teams", "New painting startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  "pest-control": makeConfig({
    industryId: "pest-control",
    name: "Pest Control",
    softwareSlug: "pest-control-software",
    contractorNoun: "pest control companies",
    emergencyExample: "I have a termite emergency",
    demandLabel: "pest season",
    audiences: ["Pest control companies", "Exterminators", "Termite control specialists", "Residential pest control", "Commercial pest control", "Mosquito control services", "Pest control maintenance businesses", "Multi-technician pest control teams", "New pest control startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "cleaning-business-software", name: "Cleaning", icon: "Sparkles" },
      ...DEFAULT_RELATED,
    ],
  }),
  "pool-spa": makeConfig({
    industryId: "pool-spa",
    name: "Pool Service",
    softwareSlug: "pool-service-software",
    contractorNoun: "pool service companies",
    emergencyExample: "My pool pump stopped working",
    demandLabel: "pool season",
    audiences: ["Pool service companies", "Pool maintenance businesses", "Pool cleaning services", "Residential pool service", "Commercial pool service", "Spa service companies", "Pool repair specialists", "Multi-route pool businesses", "New pool service startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "cleaning-business-software", name: "Cleaning", icon: "Sparkles" },
      ...DEFAULT_RELATED,
    ],
  }),
  cleaning: makeConfig({
    industryId: "cleaning",
    name: "Cleaning",
    softwareSlug: "cleaning-business-software",
    contractorNoun: "cleaning companies",
    emergencyExample: "I need an emergency deep clean",
    demandLabel: "demand peaks",
    audiences: ["Cleaning companies", "Residential cleaning services", "Commercial cleaning companies", "Maid services", "Janitorial services", "Move-in/move-out cleaners", "Post-construction cleaning", "Multi-team cleaning businesses", "New cleaning startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "pest-control-software", name: "Pest Control", icon: "Bug" },
      ...DEFAULT_RELATED,
    ],
  }),
  concrete: makeConfig({
    industryId: "concrete",
    name: "Concrete",
    softwareSlug: "concrete-software",
    contractorNoun: "concrete contractors",
    emergencyExample: "I need an estimate for a driveway",
    demandLabel: "construction season",
    audiences: ["Concrete contractors", "Concrete pouring companies", "Flatwork contractors", "Residential concrete companies", "Commercial concrete companies", "Concrete repair specialists", "Decorative concrete businesses", "Multi-crew concrete teams", "New concrete startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  "garage-door": makeConfig({
    industryId: "garage-door",
    name: "Garage Door",
    softwareSlug: "garage-door-software",
    contractorNoun: "garage door contractors",
    emergencyExample: "My garage door is stuck open",
    demandLabel: "demand spikes",
    audiences: ["Garage door contractors", "Garage door repair companies", "Garage door installation companies", "Residential garage door services", "Commercial garage door companies", "Garage door maintenance businesses", "Multi-technician garage door teams", "New garage door startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      ...DEFAULT_RELATED,
    ],
  }),
  handyman: makeConfig({
    industryId: "handyman",
    name: "Handyman",
    softwareSlug: "handyman-software",
    contractorNoun: "handyman businesses",
    emergencyExample: "I have a leaky faucet and a broken door",
    demandLabel: "demand peaks",
    audiences: ["Handyman businesses", "Handyman contractors", "Home repair services", "Residential handymen", "Commercial handymen", "General repair businesses", "Multi-technician handyman teams", "New handyman startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      ...DEFAULT_RELATED,
    ],
  }),
  "pet-services": makeConfig({
    industryId: "pet-services",
    name: "Pet Services",
    softwareSlug: "pet-services-software",
    contractorNoun: "pet service businesses",
    emergencyExample: "I need an emergency pet sitter",
    demandLabel: "holiday peaks",
    audiences: ["Pet service businesses", "Pet groomers", "Dog walkers", "Pet sitters", "Mobile pet groomers", "Pet boarding companies", "Multi-staff pet service teams", "New pet service startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "cleaning-business-software", name: "Cleaning", icon: "Sparkles" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      ...DEFAULT_RELATED,
    ],
  }),
  "snow-removal": makeConfig({
    industryId: "snow-removal",
    name: "Snow Removal",
    softwareSlug: "snow-removal-software",
    contractorNoun: "snow removal companies",
    emergencyExample: "I need my parking lot plowed urgently",
    demandLabel: "winter storms",
    audiences: ["Snow removal companies", "Plowing contractors", "De-icing services", "Residential snow removal", "Commercial snow removal", "Parking lot clearing services", "Multi-crew snow businesses", "New snow removal startups"],
    relatedIndustries: [
      { slug: "landscaping-software", name: "Landscaping", icon: "Leaf" },
      { slug: "lawn-care-software", name: "Lawn Care", icon: "Leaf" },
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      ...DEFAULT_RELATED,
    ],
  }),
  solar: makeConfig({
    industryId: "solar",
    name: "Solar",
    softwareSlug: "solar-software",
    contractorNoun: "solar contractors",
    emergencyExample: "My solar panels stopped producing",
    demandLabel: "installation season",
    audiences: ["Solar contractors", "Solar installation companies", "Solar panel cleaners", "Residential solar companies", "Commercial solar companies", "Solar maintenance businesses", "Multi-crew solar teams", "New solar startups"],
    relatedIndustries: [
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "electrical-contractor-software", name: "Electrical", icon: "Plug" },
      { slug: "roofing-software", name: "Roofing", icon: "Home" },
      ...DEFAULT_RELATED,
    ],
  }),
  "tree-care": makeConfig({
    industryId: "tree-care",
    name: "Tree Care",
    softwareSlug: "tree-care-software",
    contractorNoun: "tree care companies",
    emergencyExample: "A tree fell on my driveway",
    demandLabel: "storm season",
    audiences: ["Tree care companies", "Arborists", "Tree removal services", "Tree trimming companies", "Residential tree services", "Commercial tree services", "Stump grinding businesses", "Multi-crew tree care teams", "New tree care startups"],
    relatedIndustries: [
      { slug: "landscaping-software", name: "Landscaping", icon: "Leaf" },
      { slug: "lawn-care-software", name: "Lawn Care", icon: "Leaf" },
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      ...DEFAULT_RELATED,
    ],
  }),
  "window-cleaning": makeConfig({
    industryId: "window-cleaning",
    name: "Window Cleaning",
    softwareSlug: "window-cleaning-software",
    contractorNoun: "window cleaning companies",
    emergencyExample: "I need my storefront windows cleaned before an event",
    demandLabel: "seasonal peaks",
    audiences: ["Window cleaning companies", "Residential window cleaners", "Commercial window cleaners", "Pressure washing businesses", "Gutter cleaning services", "Multi-route window cleaning businesses", "New window cleaning startups"],
    relatedIndustries: [
      { slug: "cleaning-business-software", name: "Cleaning", icon: "Sparkles" },
      { slug: "hvac-software", name: "HVAC", icon: "ThermometerSun" },
      { slug: "plumbing-software", name: "Plumbing", icon: "Wrench" },
      ...DEFAULT_RELATED,
    ],
  }),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getIndustryBySoftwareSlug(slug: string): IndustryConfig | null {
  for (const config of Object.values(INDUSTRY_CONFIGS)) {
    if (config.softwareSlug === slug) return config;
  }
  return null;
}

export function getIndustryByContractorsPath(path: string): IndustryConfig | null {
  for (const config of Object.values(INDUSTRY_CONFIGS)) {
    if (config.contractorsBasePath === path) return config;
  }
  return null;
}

export function getAllIndustries(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS);
}
