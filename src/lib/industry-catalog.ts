/**
 * industry-catalog.ts — AUTHORITATIVE Industry & Sub-Service Catalog
 * -------------------------------------------------------------------
 * The single source of truth for the 25 industries ServiceOS supports,
 * each with its sub-services (150+ total), icons, descriptions, and
 * default seed data (job types, employee roles, sample services).
 *
 * Used by:
 *   - src/components/onboarding/saas-onboarding.tsx (industry + sub-service picker)
 *   - src/app/api/workspaces/industries/route.ts (industry list endpoint)
 *   - src/app/api/workspaces/[id]/seed/route.ts (seed workspace from industry)
 *   - src/app/api/workflows/[id]/seed/route.ts (workflow seed)
 *   - src/lib/public-business.ts (seed default services for tenant)
 *
 * Industry ID convention: kebab-case, lowercase. DO NOT rename existing IDs
 * (they are persisted on Tenant.industry, Workspace.industry, TemplatePack.industry).
 *
 * Adding a new industry:
 *   1. Add an entry to INDUSTRY_CATALOG below.
 *   2. Optionally add a matching IndustryKit in industry-kits.ts for full
 *      workflow/form/checklist/email-template seeding.
 *   3. Optionally create a dedicated SEO landing page at src/app/<slug>-software.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubService {
  /** URL-safe slug, unique within the industry */
  slug: string;
  /** Human-readable name (e.g. "AC Installation") */
  name: string;
  /** Short description shown in onboarding picker + service catalog */
  description: string;
  /** Default category for grouping in the service catalog UI */
  category: string;
  /** Suggested base price in USD (0 = quote-based) */
  defaultPrice: number;
  /** Suggested duration (human-readable: "1h 30m", "45m", "2h") */
  duration: string;
  /** Lucide icon name (NOT emoji) for the service catalog */
  icon?: string;
}

export interface IndustryCategory {
  /** Category label, e.g. "Residential", "Commercial", "Emergency" */
  label: string;
  /** Sub-services in this category */
  services: string[]; // references SubService.slug
}

export interface Industry {
  /** Unique kebab-case ID, persisted on Tenant.industry */
  id: string;
  /** Display name, e.g. "HVAC" */
  name: string;
  /** Lucide icon name (NOT emoji) */
  icon: string;
  /** Emoji fallback for places that can't render Lucide */
  emoji: string;
  /** One-line description for pickers */
  description: string;
  /** Vertical ID this industry belongs to (see VERTICALS) */
  vertical: string;
  /** Longer marketing description for SEO pages */
  longDescription?: string;
  /** Whether this industry has a full IndustryKit in industry-kits.ts */
  hasKit?: boolean;
  /** Whether this industry has a dedicated SEO landing page */
  hasSeoPage?: boolean;
  /** SEO page slug (without -software suffix), e.g. "plumbing" → /plumbing-software */
  seoSlug?: string;
  /** All sub-services for this industry */
  subServices: SubService[];
  /** Optional category groupings for the sub-services (for UI grouping) */
  categories?: IndustryCategory[];
  /** Default job types to seed for this industry */
  jobTypes: string[];
  /** Default employee roles to seed for this industry */
  employeeRoles: string[];
  /** Default workflow trigger templates (names only — full def in industry-kits.ts) */
  defaultWorkflows?: string[];
}

// ---------------------------------------------------------------------------
// Verticals — top-level grouping of the 25 industries into 9 verticals
// ---------------------------------------------------------------------------

export const VERTICALS = [
  { id: 'home-property', name: 'Home & Property Services', icon: '🏠', description: 'Cleaning, HVAC, plumbing, electrical, roofing, construction, painting, flooring, and home improvement.' },
  { id: 'security-tech', name: 'Security & Smart Technology', icon: '🔐', description: 'Security systems, CCTV, smart home, IT services.' },
  { id: 'maintenance-repair', name: 'Maintenance & Repair', icon: '🔧', description: 'Appliance repair, locksmith, handyman services.' },
  { id: 'outdoor-utility', name: 'Outdoor & Utility Services', icon: '🌳', description: 'Pest control, pool & spa, junk removal.' },
  { id: 'automotive', name: 'Automotive Services', icon: '🚗', description: 'Mobile mechanic, detailing, car wash, tire service.' },
  { id: 'logistics', name: 'Logistics', icon: '📦', description: 'Moving services, packing, storage.' },
  { id: 'health-personal', name: 'Health & Personal Services', icon: '💆', description: 'Massage, physiotherapy, personal trainer, beauty, spa.' },
  { id: 'professional', name: 'Professional Services', icon: '💼', description: 'Accounting, legal, consulting, marketing, photography, events.' },
  { id: 'custom', name: 'Custom Services', icon: '✨', description: 'Custom services, window cleaning, solar, and other specialized work.' },
] as const;

export const VERTICAL_MAP: Record<string, string> = {
  'cleaning': 'home-property',
  'landscaping': 'home-property',
  'hvac': 'home-property',
  'plumbing': 'home-property',
  'electrical': 'home-property',
  'roofing': 'home-property',
  'construction': 'home-property',
  'painting': 'home-property',
  'flooring': 'home-property',
  'home-services': 'home-property',
  'security': 'security-tech',
  'it-services': 'security-tech',
  'appliance-repair': 'maintenance-repair',
  'locksmith': 'maintenance-repair',
  'handyman': 'maintenance-repair',
  'pest-control': 'outdoor-utility',
  'pool-spa': 'outdoor-utility',
  'junk-removal': 'outdoor-utility',
  'automotive': 'automotive',
  'moving': 'logistics',
  'health-wellness': 'health-personal',
  'professional-services': 'professional',
  'others': 'custom',
  'window-cleaning': 'custom',
  'solar': 'custom',
};

// ---------------------------------------------------------------------------
// Helper exports
// ---------------------------------------------------------------------------

/** Find an industry by ID. Returns undefined if not found. */
export function getIndustry(id: string): Industry | undefined {
  return INDUSTRY_CATALOG.find((i) => i.id === id);
}

/** Get all sub-services for an industry (returns empty array if industry not found). */
export function getSubServices(industryId: string): SubService[] {
  return getIndustry(industryId)?.subServices ?? [];
}

/** Find a specific sub-service by industry + slug. */
export function getSubService(industryId: string, slug: string): SubService | undefined {
  return getIndustry(industryId)?.subServices.find((s) => s.slug === slug);
}

/** Lightweight list for picker UIs (no sub-services). */
export const INDUSTRY_LIST = () =>
  INDUSTRY_CATALOG.map((i) => ({
    id: i.id,
    label: i.name,
    icon: i.icon,
    emoji: i.emoji,
    description: i.description,
    subServiceCount: i.subServices.length,
  }));

/** Total number of industries + sub-services (for marketing copy). */
export const CATALOG_STATS = {
  industries: 0, // computed below
  subServices: 0, // computed below
};

// ---------------------------------------------------------------------------
// THE CATALOG — 25 industries, 150+ sub-services
// ---------------------------------------------------------------------------

export const INDUSTRY_CATALOG: Industry[] = [
  // =========================================================================
  // 1. CLEANING
  // =========================================================================
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'Sparkles',
    emoji: '🧹',
    description: 'Residential, commercial, and specialty cleaning services',
    vertical: 'home-property',
    longDescription: 'Residential, commercial, and specialty cleaning services including carpets, windows, pressure washing, and post-construction cleanup.',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'cleaning-business',
    subServices: [
      { slug: 'residential-cleaning', name: 'Residential Cleaning', description: 'Recurring or one-time home cleaning', category: 'Residential', defaultPrice: 120, duration: '2h 30m', icon: 'Home' },
      { slug: 'commercial-cleaning', name: 'Commercial Cleaning', description: 'Offices, retail, and commercial spaces', category: 'Commercial', defaultPrice: 250, duration: '3h', icon: 'Building2' },
      { slug: 'carpet-cleaning', name: 'Carpet Cleaning', description: 'Deep cleaning and stain removal for carpets', category: 'Specialty', defaultPrice: 180, duration: '2h', icon: 'Layers' },
      { slug: 'window-cleaning', name: 'Window Cleaning', description: 'Interior and exterior window cleaning', category: 'Specialty', defaultPrice: 150, duration: '2h', icon: 'RectangleVertical' },
      { slug: 'pressure-washing', name: 'Pressure Washing', description: 'Driveways, decks, siding, and walkways', category: 'Exterior', defaultPrice: 300, duration: '3h', icon: 'Droplets' },
      { slug: 'bin-cleaning', name: 'Bin Cleaning', description: 'Trash and recycling bin sanitization', category: 'Specialty', defaultPrice: 60, duration: '45m', icon: 'Trash2' },
      { slug: 'move-in-move-out-cleaning', name: 'Move In / Move Out Cleaning', description: 'Deep clean for property turnover', category: 'Residential', defaultPrice: 280, duration: '4h', icon: 'Truck' },
      { slug: 'post-construction-cleaning', name: 'Post Construction Cleaning', description: 'Construction site cleanup and detailing', category: 'Specialty', defaultPrice: 450, duration: '5h', icon: 'HardHat' },
      { slug: 'air-duct-cleaning', name: 'Air Duct Cleaning', description: 'HVAC duct and vent cleaning', category: 'Specialty', defaultPrice: 350, duration: '3h', icon: 'Wind' },
      { slug: 'solar-panel-cleaning', name: 'Solar Panel Cleaning', description: 'Solar panel wash and inspection', category: 'Exterior', defaultPrice: 200, duration: '2h', icon: 'Sun' },
    ],
    categories: [
      { label: 'Residential', services: ['residential-cleaning', 'move-in-move-out-cleaning'] },
      { label: 'Commercial', services: ['commercial-cleaning', 'post-construction-cleaning'] },
      { label: 'Specialty', services: ['carpet-cleaning', 'window-cleaning', 'bin-cleaning', 'air-duct-cleaning'] },
      { label: 'Exterior', services: ['pressure-washing', 'solar-panel-cleaning'] },
    ],
    jobTypes: ['Recurring Clean', 'One-Time Clean', 'Deep Clean', 'Move-Out Clean', 'Post-Construction', 'Emergency Clean'],
    employeeRoles: ['Lead Cleaner', 'Cleaning Technician', 'Crew Member', 'Supervisor'],
    defaultWorkflows: ['New Booking → Confirmation', 'Job Complete → Review Request', 'Recurring Clean → Reminder'],
  },

  // =========================================================================
  // 2. LANDSCAPING & LAWN
  // =========================================================================
  {
    id: 'landscaping',
    name: 'Landscaping & Lawn',
    icon: 'Trees',
    emoji: '🌿',
    description: 'Lawn care, landscaping, tree service, irrigation, and snow removal',
    vertical: 'home-property',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'landscaping',
    subServices: [
      { slug: 'lawn-care', name: 'Lawn Care', description: 'Mowing, edging, fertilization, weed control', category: 'Recurring', defaultPrice: 60, duration: '1h', icon: 'Scissors' },
      { slug: 'landscaping-design', name: 'Landscaping', description: 'Garden design, planting, hardscaping', category: 'Project', defaultPrice: 2500, duration: '8h', icon: 'Flower2' },
      { slug: 'tree-service', name: 'Tree Service / Arborist', description: 'Tree trimming, removal, and health assessment', category: 'Tree', defaultPrice: 750, duration: '4h', icon: 'TreePine' },
      { slug: 'irrigation', name: 'Irrigation', description: 'Sprinkler install, repair, and winterization', category: 'System', defaultPrice: 450, duration: '3h', icon: 'Droplets' },
      { slug: 'snow-removal', name: 'Snow Removal', description: 'Driveway, parking lot, and walkway plowing', category: 'Seasonal', defaultPrice: 120, duration: '1h 30m', icon: 'Snowflake' },
      { slug: 'garden-maintenance', name: 'Garden Maintenance', description: 'Weeding, pruning, mulching, seasonal cleanup', category: 'Recurring', defaultPrice: 90, duration: '2h', icon: 'Flower' },
      { slug: 'artificial-turf', name: 'Artificial Turf', description: 'Synthetic turf installation and repair', category: 'Project', defaultPrice: 3500, duration: '8h', icon: 'Grid3x3' },
    ],
    jobTypes: ['Lawn Maintenance', 'Landscape Install', 'Tree Removal', 'Snow Plow', 'Irrigation Repair', 'Seasonal Cleanup'],
    employeeRoles: ['Crew Lead', 'Landscaper', 'Arborist', 'Laborer', 'Equipment Operator'],
  },

  // =========================================================================
  // 3. HVAC
  // =========================================================================
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'Wind',
    emoji: '❄️',
    description: 'Heating, ventilation, air conditioning, and refrigeration',
    vertical: 'home-property',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'hvac',
    subServices: [
      { slug: 'ac-installation', name: 'AC Installation', description: 'New air conditioner installation and setup', category: 'Installation', defaultPrice: 4500, duration: '6h', icon: 'Wind' },
      { slug: 'ac-repair', name: 'AC Repair', description: 'Diagnosis and repair of AC systems', category: 'Repair', defaultPrice: 280, duration: '2h', icon: 'Wrench' },
      { slug: 'furnace', name: 'Furnace', description: 'Furnace install, repair, and maintenance', category: 'Heating', defaultPrice: 3200, duration: '5h', icon: 'Flame' },
      { slug: 'heat-pump', name: 'Heat Pump', description: 'Heat pump installation and service', category: 'Heating', defaultPrice: 5000, duration: '6h', icon: 'ThermometerSun' },
      { slug: 'ventilation', name: 'Ventilation', description: 'Ventilation system install and cleaning', category: 'System', defaultPrice: 800, duration: '4h', icon: 'Fan' },
      { slug: 'duct-cleaning', name: 'Duct Cleaning', description: 'Air duct cleaning and sanitization', category: 'Maintenance', defaultPrice: 350, duration: '3h', icon: 'Wind' },
      { slug: 'refrigeration', name: 'Refrigeration', description: 'Commercial refrigeration service and repair', category: 'Commercial', defaultPrice: 450, duration: '3h', icon: 'Snowflake' },
    ],
    jobTypes: ['AC Install', 'AC Repair', 'Furnace Service', 'Maintenance Visit', 'Emergency Call', 'Commercial Service'],
    employeeRoles: ['HVAC Technician', 'Lead Technician', 'Install Coordinator', 'Service Manager'],
  },

  // =========================================================================
  // 4. ELECTRICAL
  // =========================================================================
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'Zap',
    emoji: '⚡',
    description: 'Residential, commercial, EV charger, solar, and smart home electrical',
    vertical: 'home-property',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'electrical-contractor',
    subServices: [
      { slug: 'residential-electrician', name: 'Residential Electrician', description: 'Home wiring, outlets, panels, lighting', category: 'Residential', defaultPrice: 180, duration: '2h', icon: 'Home' },
      { slug: 'commercial-electrician', name: 'Commercial Electrician', description: 'Commercial wiring, three-phase, lighting', category: 'Commercial', defaultPrice: 280, duration: '3h', icon: 'Building2' },
      { slug: 'ev-charger-installation', name: 'EV Charger Installation', description: 'Home and commercial EV charger install', category: 'Installation', defaultPrice: 1200, duration: '4h', icon: 'PlugZap' },
      { slug: 'solar-electrical', name: 'Solar Electrical', description: 'Solar panel wiring and inverter install', category: 'Solar', defaultPrice: 2500, duration: '6h', icon: 'Sun' },
      { slug: 'generator-installation', name: 'Generator Installation', description: 'Standby generator install and wiring', category: 'Installation', defaultPrice: 3500, duration: '8h', icon: 'BatteryCharging' },
      { slug: 'smart-home', name: 'Smart Home', description: 'Smart switches, security, automation wiring', category: 'Smart', defaultPrice: 450, duration: '3h', icon: 'House' },
    ],
    jobTypes: ['Service Call', 'Install', 'Panel Upgrade', 'Inspection', 'Emergency Call', 'Estimate Visit'],
    employeeRoles: ['Master Electrician', 'Journeyman', 'Apprentice', 'Project Lead'],
  },

  // =========================================================================
  // 5. PLUMBING
  // =========================================================================
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'Wrench',
    emoji: '🔧',
    description: 'Plumbing repair, drain, water heater, gas, and sewer services',
    vertical: 'home-property',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'plumbing',
    subServices: [
      { slug: 'plumbing-repair', name: 'Plumbing Repair', description: 'Leaks, fixtures, faucets, toilets', category: 'Repair', defaultPrice: 180, duration: '2h', icon: 'Wrench' },
      { slug: 'drain-cleaning', name: 'Drain Cleaning', description: 'Clog removal, hydro-jetting, snaking', category: 'Drain', defaultPrice: 220, duration: '1h 30m', icon: 'Droplets' },
      { slug: 'water-heater', name: 'Water Heater', description: 'Tank and tankless water heater service', category: 'Installation', defaultPrice: 1500, duration: '4h', icon: 'Flame' },
      { slug: 'gas-fitting', name: 'Gas Fitting', description: 'Gas line install, repair, and leak detection', category: 'Gas', defaultPrice: 350, duration: '2h 30m', icon: 'Flame' },
      { slug: 'leak-detection', name: 'Leak Detection', description: 'Slab leaks, hidden leaks, thermal imaging', category: 'Diagnostic', defaultPrice: 280, duration: '2h', icon: 'Search' },
      { slug: 'sewer-services', name: 'Sewer Services', description: 'Sewer line repair, replacement, camera inspection', category: 'Sewer', defaultPrice: 1800, duration: '6h', icon: 'Pipes' },
    ],
    jobTypes: ['Service Call', 'Install', 'Emergency Call', 'Inspection', 'Estimate', 'Repair'],
    employeeRoles: ['Master Plumber', 'Journeyman', 'Apprentice', 'Drain Tech'],
  },

  // =========================================================================
  // 6. CONSTRUCTION
  // =========================================================================
  {
    id: 'construction',
    name: 'Construction',
    icon: 'HardHat',
    emoji: '🏗️',
    description: 'General contractor, remodeling, renovation, concrete, masonry, framing',
    vertical: 'home-property',
    hasSeoPage: false,
    subServices: [
      { slug: 'general-contractor', name: 'General Contractor', description: 'Project management and full builds', category: 'Project', defaultPrice: 0, duration: '8h', icon: 'HardHat' },
      { slug: 'remodeling', name: 'Remodeling', description: 'Kitchen, bathroom, and whole-home remodels', category: 'Project', defaultPrice: 15000, duration: '40h', icon: 'Hammer' },
      { slug: 'renovation', name: 'Renovation', description: 'Renovation of existing structures', category: 'Project', defaultPrice: 8000, duration: '24h', icon: 'Building2' },
      { slug: 'concrete', name: 'Concrete', description: 'Pouring, finishing, stamping, and repair', category: 'Concrete', defaultPrice: 1200, duration: '6h', icon: 'Layers' },
      { slug: 'masonry', name: 'Masonry', description: 'Brick, stone, block, and tuckpointing', category: 'Masonry', defaultPrice: 950, duration: '6h', icon: 'Box' },
      { slug: 'framing', name: 'Framing', description: 'Wood and metal framing for structures', category: 'Structural', defaultPrice: 2200, duration: '8h', icon: 'Grid3x3' },
      { slug: 'drywall', name: 'Drywall', description: 'Hang, tape, mud, and finish drywall', category: 'Finish', defaultPrice: 650, duration: '6h', icon: 'Square' },
      { slug: 'demolition', name: 'Demolition', description: 'Interior and exterior demolition', category: 'Site', defaultPrice: 1200, duration: '8h', icon: 'Hammer' },
      { slug: 'waterproofing', name: 'Waterproofing', description: 'Foundation and basement waterproofing', category: 'Specialty', defaultPrice: 2800, duration: '8h', icon: 'Droplets' },
    ],
    jobTypes: ['New Build', 'Remodel', 'Renovation', 'Repair', 'Inspection', 'Estimate'],
    employeeRoles: ['Project Manager', 'Foreman', 'Carpenter', 'Laborer', 'Subcontractor'],
  },

  // =========================================================================
  // 7. ROOFING
  // =========================================================================
  {
    id: 'roofing',
    name: 'Roofing',
    icon: 'Home',
    emoji: '🏠',
    description: 'Roof installation, repair, inspection, gutters, and skylights',
    vertical: 'home-property',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'roofing',
    subServices: [
      { slug: 'roof-installation', name: 'Roof Installation', description: 'New roof installation and tear-offs', category: 'Installation', defaultPrice: 8500, duration: '16h', icon: 'Home' },
      { slug: 'roof-repair', name: 'Roof Repair', description: 'Leak repair, shingle replacement, flashing', category: 'Repair', defaultPrice: 650, duration: '4h', icon: 'Wrench' },
      { slug: 'roof-inspection', name: 'Roof Inspection', description: 'Detailed inspection and condition report', category: 'Inspection', defaultPrice: 250, duration: '2h', icon: 'Search' },
      { slug: 'gutters', name: 'Gutters', description: 'Gutter install, repair, and cleaning', category: 'Gutter', defaultPrice: 850, duration: '4h', icon: 'AlignHorizontalDistribute' },
      { slug: 'skylights', name: 'Skylights', description: 'Skylight install, repair, and replacement', category: 'Installation', defaultPrice: 1200, duration: '5h', icon: 'Sun' },
    ],
    jobTypes: ['Roof Install', 'Roof Repair', 'Inspection', 'Gutter Service', 'Emergency Tarp', 'Estimate'],
    employeeRoles: ['Roofing Foreman', 'Roofer', 'Crew Member', 'Estimator'],
  },

  // =========================================================================
  // 8. PAINTING
  // =========================================================================
  {
    id: 'painting',
    name: 'Painting',
    icon: 'PaintRoller',
    emoji: '🎨',
    description: 'Interior, exterior, commercial, cabinet, and wallpaper',
    vertical: 'home-property',
    hasSeoPage: true,
    seoSlug: 'painting',
    subServices: [
      { slug: 'interior-painting', name: 'Interior Painting', description: 'Walls, ceilings, trim, and doors', category: 'Interior', defaultPrice: 1200, duration: '8h', icon: 'PaintRoller' },
      { slug: 'exterior-painting', name: 'Exterior Painting', description: 'Siding, stucco, trim, and fascia', category: 'Exterior', defaultPrice: 2500, duration: '16h', icon: 'Home' },
      { slug: 'commercial-painting', name: 'Commercial Painting', description: 'Offices, retail, and industrial', category: 'Commercial', defaultPrice: 3500, duration: '24h', icon: 'Building2' },
      { slug: 'cabinet-painting', name: 'Cabinet Painting', description: 'Kitchen and bath cabinet refinishing', category: 'Specialty', defaultPrice: 950, duration: '8h', icon: 'DoorClosed' },
      { slug: 'wallpaper', name: 'Wallpaper', description: 'Wallpaper install and removal', category: 'Specialty', defaultPrice: 480, duration: '4h', icon: 'Scroll' },
    ],
    jobTypes: ['Interior Paint', 'Exterior Paint', 'Commercial Paint', 'Cabinet Refinish', 'Wallpaper', 'Estimate'],
    employeeRoles: ['Lead Painter', 'Painter', 'Prep Technician', 'Crew Member'],
  },

  // =========================================================================
  // 9. FLOORING
  // =========================================================================
  {
    id: 'flooring',
    name: 'Flooring',
    icon: 'Grid2x2',
    emoji: '🟫',
    description: 'Hardwood, tile, vinyl, laminate, carpet, and epoxy flooring',
    vertical: 'home-property',
    hasSeoPage: false,
    subServices: [
      { slug: 'hardwood', name: 'Hardwood', description: 'Solid and engineered hardwood install + refinish', category: 'Wood', defaultPrice: 2800, duration: '12h', icon: 'Grid2x2' },
      { slug: 'tile', name: 'Tile', description: 'Ceramic, porcelain, and natural stone tile', category: 'Tile', defaultPrice: 1500, duration: '8h', icon: 'Grid3x3' },
      { slug: 'vinyl', name: 'Vinyl', description: 'LVP, LVT, and sheet vinyl install', category: 'Vinyl', defaultPrice: 1200, duration: '6h', icon: 'Square' },
      { slug: 'laminate', name: 'Laminate', description: 'Laminate plank install and repair', category: 'Laminate', defaultPrice: 950, duration: '6h', icon: 'Layers' },
      { slug: 'carpet', name: 'Carpet', description: 'Carpet install, stretch, and repair', category: 'Carpet', defaultPrice: 850, duration: '4h', icon: 'Square' },
      { slug: 'epoxy', name: 'Epoxy', description: 'Garage and industrial epoxy flooring', category: 'Epoxy', defaultPrice: 1400, duration: '8h', icon: 'Circle' },
    ],
    jobTypes: ['Install', 'Refinish', 'Repair', 'Estimate', 'Tear-Out'],
    employeeRoles: ['Lead Installer', 'Flooring Installer', 'Helper', 'Estimator'],
  },

  // =========================================================================
  // 10. SECURITY
  // =========================================================================
  {
    id: 'security',
    name: 'Security',
    icon: 'ShieldCheck',
    emoji: '🔒',
    description: 'CCTV, alarm, access control, smart lock, and home automation',
    vertical: 'security-tech',
    hasSeoPage: false,
    subServices: [
      { slug: 'cctv', name: 'CCTV', description: 'Camera install, DVR/NVR setup, monitoring', category: 'Surveillance', defaultPrice: 1200, duration: '4h', icon: 'Cctv' },
      { slug: 'alarm-system', name: 'Alarm System', description: 'Burglar alarm install and monitoring', category: 'Alarm', defaultPrice: 850, duration: '3h', icon: 'Bell' },
      { slug: 'access-control', name: 'Access Control', description: 'Keycards, fobs, and biometric systems', category: 'Access', defaultPrice: 1500, duration: '4h', icon: 'KeyRound' },
      { slug: 'smart-lock', name: 'Smart Lock', description: 'Smart lock install and programming', category: 'Smart', defaultPrice: 350, duration: '1h 30m', icon: 'Lock' },
      { slug: 'home-automation', name: 'Home Automation', description: 'Smart home hubs, scenes, and routines', category: 'Smart', defaultPrice: 950, duration: '4h', icon: 'House' },
    ],
    jobTypes: ['Install', 'Service Call', 'Upgrade', 'Monitoring Setup', 'Estimate'],
    employeeRoles: ['Security Tech', 'Install Tech', 'Low-Voltage Electrician', 'Service Tech'],
  },

  // =========================================================================
  // 11. IT SERVICES
  // =========================================================================
  {
    id: 'it-services',
    name: 'IT Services',
    icon: 'MonitorCog',
    emoji: '💻',
    description: 'Computer repair, network, WiFi, server, printer, and managed IT',
    vertical: 'security-tech',
    hasSeoPage: false,
    subServices: [
      { slug: 'computer-repair', name: 'Computer Repair', description: 'PC and Mac repair, virus removal, upgrades', category: 'Repair', defaultPrice: 120, duration: '2h', icon: 'MonitorCog' },
      { slug: 'network-setup', name: 'Network Setup', description: 'Wired and wireless network configuration', category: 'Network', defaultPrice: 280, duration: '3h', icon: 'Network' },
      { slug: 'wifi-installation', name: 'WiFi Installation', description: 'Mesh WiFi and access point install', category: 'Network', defaultPrice: 220, duration: '2h', icon: 'Wifi' },
      { slug: 'server-support', name: 'Server Support', description: 'Server install, migration, and maintenance', category: 'Server', defaultPrice: 450, duration: '4h', icon: 'Server' },
      { slug: 'printer-repair', name: 'Printer Repair', description: 'Printer install, repair, and network setup', category: 'Repair', defaultPrice: 150, duration: '1h 30m', icon: 'Printer' },
      { slug: 'managed-it', name: 'Managed IT', description: 'Monthly managed IT services and support', category: 'Managed', defaultPrice: 350, duration: '1h', icon: 'Settings' },
    ],
    jobTypes: ['Service Call', 'Install', 'Network Setup', 'Server Support', 'Onsite Support', 'Estimate'],
    employeeRoles: ['IT Technician', 'Network Engineer', 'Helpdesk', 'Field Tech'],
  },

  // =========================================================================
  // 12. APPLIANCE REPAIR
  // =========================================================================
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    icon: 'Plug',
    emoji: '🔌',
    description: 'Refrigerator, washing machine, dishwasher, dryer, microwave, oven',
    vertical: 'maintenance-repair',
    hasSeoPage: false,
    subServices: [
      { slug: 'refrigerator', name: 'Refrigerator', description: 'Fridge and freezer repair', category: 'Kitchen', defaultPrice: 220, duration: '1h 30m', icon: 'Refrigerator' },
      { slug: 'washing-machine', name: 'Washing Machine', description: 'Washer repair and drain issues', category: 'Laundry', defaultPrice: 180, duration: '1h 30m', icon: 'WashingMachine' },
      { slug: 'dishwasher', name: 'Dishwasher', description: 'Dishwasher repair and install', category: 'Kitchen', defaultPrice: 165, duration: '1h 30m', icon: 'Dishwasher' },
      { slug: 'dryer', name: 'Dryer', description: 'Dryer repair and vent cleaning', category: 'Laundry', defaultPrice: 180, duration: '1h 30m', icon: 'Wind' },
      { slug: 'microwave', name: 'Microwave', description: 'Microwave repair and install', category: 'Kitchen', defaultPrice: 140, duration: '1h', icon: 'Microwave' },
      { slug: 'oven', name: 'Oven', description: 'Oven and range repair', category: 'Kitchen', defaultPrice: 200, duration: '1h 30m', icon: 'Flame' },
    ],
    jobTypes: ['Service Call', 'Install', 'Diagnostic', 'Warranty Call', 'Estimate'],
    employeeRoles: ['Appliance Tech', 'Field Technician', 'Senior Tech'],
  },

  // =========================================================================
  // 13. PEST CONTROL
  // =========================================================================
  {
    id: 'pest-control',
    name: 'Pest Control',
    icon: 'Bug',
    emoji: '🐛',
    description: 'Termite, rodent, cockroach, mosquito, and wildlife removal',
    vertical: 'outdoor-utility',
    hasKit: true,
    hasSeoPage: true,
    seoSlug: 'pest-control',
    subServices: [
      { slug: 'termite', name: 'Termite', description: 'Termite inspection, treatment, and prevention', category: 'Wood', defaultPrice: 550, duration: '3h', icon: 'Bug' },
      { slug: 'rodent', name: 'Rodent', description: 'Rat and mouse control and exclusion', category: 'Wildlife', defaultPrice: 280, duration: '2h', icon: 'Rat' },
      { slug: 'cockroach', name: 'Cockroach', description: 'Roach treatment and prevention', category: 'Insect', defaultPrice: 180, duration: '1h 30m', icon: 'Bug' },
      { slug: 'mosquito', name: 'Mosquito', description: 'Mosquito fogging and barrier treatment', category: 'Insect', defaultPrice: 150, duration: '1h', icon: 'Waves' },
      { slug: 'wildlife-removal', name: 'Wildlife Removal', description: 'Raccoon, squirrel, and critter removal', category: 'Wildlife', defaultPrice: 380, duration: '3h', icon: 'PawPrint' },
    ],
    jobTypes: ['Treatment', 'Inspection', 'Follow-Up', 'Emergency', 'Estimate'],
    employeeRoles: ['Pest Tech', 'Senior Tech', 'Wildlife Specialist'],
  },

  // =========================================================================
  // 14. POOL & SPA
  // =========================================================================
  {
    id: 'pool-spa',
    name: 'Pool & Spa',
    icon: 'Waves',
    emoji: '🏊',
    description: 'Pool cleaning, repair, installation, and spa maintenance',
    vertical: 'outdoor-utility',
    hasSeoPage: true,
    seoSlug: 'pool-service',
    subServices: [
      { slug: 'pool-cleaning', name: 'Pool Cleaning', description: 'Weekly pool cleaning and chemical balance', category: 'Maintenance', defaultPrice: 120, duration: '1h', icon: 'Waves' },
      { slug: 'pool-repair', name: 'Pool Repair', description: 'Pump, filter, and equipment repair', category: 'Repair', defaultPrice: 280, duration: '2h', icon: 'Wrench' },
      { slug: 'pool-installation', name: 'Pool Installation', description: 'New pool and spa construction', category: 'Installation', defaultPrice: 35000, duration: '80h', icon: 'Hammer' },
      { slug: 'spa-maintenance', name: 'Spa Maintenance', description: 'Hot tub service and chemical balance', category: 'Maintenance', defaultPrice: 110, duration: '1h', icon: 'Droplets' },
    ],
    jobTypes: ['Weekly Service', 'Repair', 'Open/Close', 'Installation', 'Estimate'],
    employeeRoles: ['Pool Tech', 'Service Tech', 'Construction Lead'],
  },

  // =========================================================================
  // 15. LOCKSMITH
  // =========================================================================
  {
    id: 'locksmith',
    name: 'Locksmith',
    icon: 'KeyRound',
    emoji: '🔑',
    description: 'Residential, commercial, automotive, and emergency lockout',
    vertical: 'maintenance-repair',
    hasSeoPage: false,
    subServices: [
      { slug: 'residential-locksmith', name: 'Residential', description: 'Home lockout, rekey, and lock install', category: 'Residential', defaultPrice: 120, duration: '1h', icon: 'Home' },
      { slug: 'commercial-locksmith', name: 'Commercial', description: 'Business locks, master key, access systems', category: 'Commercial', defaultPrice: 220, duration: '2h', icon: 'Building2' },
      { slug: 'automotive-locksmith', name: 'Automotive', description: 'Car key replacement and programming', category: 'Automotive', defaultPrice: 280, duration: '1h 30m', icon: 'Car' },
      { slug: 'emergency-lockout', name: 'Emergency Lockout', description: '24/7 emergency lockout service', category: 'Emergency', defaultPrice: 150, duration: '45m', icon: 'Siren' },
    ],
    jobTypes: ['Lockout', 'Rekey', 'Install', 'Repair', 'Key Replacement', 'Estimate'],
    employeeRoles: ['Locksmith', 'Mobile Locksmith', 'Master Locksmith'],
  },

  // =========================================================================
  // 16. HANDYMAN
  // =========================================================================
  {
    id: 'handyman',
    name: 'Handyman',
    icon: 'Hammer',
    emoji: '🔨',
    description: 'Furniture assembly, TV mounting, door repair, minor plumbing/electrical',
    vertical: 'maintenance-repair',
    hasSeoPage: true,
    seoSlug: 'handyman',
    subServices: [
      { slug: 'furniture-assembly', name: 'Furniture Assembly', description: 'IKEA and other furniture assembly', category: 'Assembly', defaultPrice: 90, duration: '1h 30m', icon: 'Box' },
      { slug: 'tv-mounting', name: 'TV Mounting', description: 'TV mount install and wire hiding', category: 'Mounting', defaultPrice: 120, duration: '1h 30m', icon: 'Tv' },
      { slug: 'door-repair', name: 'Door Repair', description: 'Door install, repair, and adjustment', category: 'Repair', defaultPrice: 110, duration: '1h', icon: 'DoorClosed' },
      { slug: 'minor-plumbing', name: 'Minor Plumbing', description: 'Faucet, toilet, and drain repairs', category: 'Plumbing', defaultPrice: 130, duration: '1h 30m', icon: 'Wrench' },
      { slug: 'minor-electrical', name: 'Minor Electrical', description: 'Outlet, switch, and light fixture install', category: 'Electrical', defaultPrice: 130, duration: '1h 30m', icon: 'Zap' },
      { slug: 'general-repairs', name: 'General Repairs', description: 'Drywall patch, caulking, misc home repairs', category: 'Repair', defaultPrice: 100, duration: '1h 30m', icon: 'Hammer' },
    ],
    jobTypes: ['Service Call', 'Assembly', 'Mounting', 'Repair', 'Estimate'],
    employeeRoles: ['Handyman', 'Lead Handyman', 'Crew Member'],
  },

  // =========================================================================
  // 17. JUNK REMOVAL
  // =========================================================================
  {
    id: 'junk-removal',
    name: 'Junk Removal',
    icon: 'Trash2',
    emoji: '🗑️',
    description: 'Residential, commercial, construction, yard waste, and recycling',
    vertical: 'outdoor-utility',
    hasSeoPage: false,
    subServices: [
      { slug: 'residential-junk', name: 'Residential', description: 'Household junk and furniture removal', category: 'Residential', defaultPrice: 250, duration: '2h', icon: 'Home' },
      { slug: 'commercial-junk', name: 'Commercial', description: 'Office cleanouts and equipment removal', category: 'Commercial', defaultPrice: 450, duration: '3h', icon: 'Building2' },
      { slug: 'construction-waste', name: 'Construction Waste', description: 'Construction debris and material haul', category: 'Construction', defaultPrice: 550, duration: '3h', icon: 'HardHat' },
      { slug: 'yard-waste', name: 'Yard Waste', description: 'Branches, leaves, and landscaping debris', category: 'Yard', defaultPrice: 180, duration: '1h 30m', icon: 'Trees' },
      { slug: 'recycling', name: 'Recycling', description: 'E-waste and recyclable material pickup', category: 'Recycling', defaultPrice: 120, duration: '1h', icon: 'Recycle' },
    ],
    jobTypes: ['Pickup', 'Cleanout', 'Haul Away', 'Estimate'],
    employeeRoles: ['Driver', 'Crew Member', 'Crew Lead'],
  },

  // =========================================================================
  // 18. AUTOMOTIVE
  // =========================================================================
  {
    id: 'automotive',
    name: 'Automotive',
    icon: 'Car',
    emoji: '🚗',
    description: 'Mobile mechanic, detailing, car wash, windshield, and tire',
    vertical: 'automotive',
    hasSeoPage: false,
    subServices: [
      { slug: 'mobile-mechanic', name: 'Mobile Mechanic', description: 'On-site auto repair and diagnostics', category: 'Mechanic', defaultPrice: 180, duration: '2h', icon: 'Wrench' },
      { slug: 'car-detailing', name: 'Car Detailing', description: 'Interior and exterior detailing', category: 'Detailing', defaultPrice: 220, duration: '3h', icon: 'Sparkles' },
      { slug: 'car-wash', name: 'Car Wash', description: 'Mobile car wash and wax', category: 'Wash', defaultPrice: 60, duration: '1h', icon: 'Droplets' },
      { slug: 'windshield-repair', name: 'Windshield Repair', description: 'Chip repair and windshield replacement', category: 'Glass', defaultPrice: 280, duration: '2h', icon: 'RectangleVertical' },
      { slug: 'tire-service', name: 'Tire Service', description: 'Mobile tire install, rotation, and repair', category: 'Tire', defaultPrice: 120, duration: '1h', icon: 'Circle' },
    ],
    jobTypes: ['Service Call', 'Detail', 'Wash', 'Repair', 'Install', 'Estimate'],
    employeeRoles: ['Mechanic', 'Detailer', 'Mobile Tech', 'Driver'],
  },

  // =========================================================================
  // 19. HOME SERVICES
  // =========================================================================
  {
    id: 'home-services',
    name: 'Home Services',
    icon: 'House',
    emoji: '🏡',
    description: 'Chimney, garage door, insulation, fencing, deck, windows, doors, glass',
    vertical: 'home-property',
    hasSeoPage: false,
    subServices: [
      { slug: 'chimney', name: 'Chimney', description: 'Chimney sweep, inspection, and repair', category: 'Chimney', defaultPrice: 220, duration: '2h', icon: 'Flame' },
      { slug: 'garage-door', name: 'Garage Door', description: 'Garage door install, repair, and opener service', category: 'Garage', defaultPrice: 280, duration: '2h', icon: 'DoorOpen' },
      { slug: 'insulation', name: 'Insulation', description: 'Attic, wall, and crawlspace insulation', category: 'Insulation', defaultPrice: 1500, duration: '6h', icon: 'Layers' },
      { slug: 'fencing', name: 'Fencing', description: 'Wood, vinyl, chain-link, and wrought iron', category: 'Fence', defaultPrice: 1800, duration: '8h', icon: 'Grid3x3' },
      { slug: 'deck-patio', name: 'Deck & Patio', description: 'Deck and patio build, repair, and stain', category: 'Outdoor', defaultPrice: 2500, duration: '12h', icon: 'Grid2x2' },
      { slug: 'window-installation', name: 'Window Installation', description: 'Window install and replacement', category: 'Window', defaultPrice: 850, duration: '4h', icon: 'RectangleVertical' },
      { slug: 'door-installation', name: 'Door Installation', description: 'Interior and exterior door install', category: 'Door', defaultPrice: 480, duration: '3h', icon: 'DoorClosed' },
      { slug: 'glass-repair', name: 'Glass Repair', description: 'Glass pane repair and replacement', category: 'Glass', defaultPrice: 320, duration: '2h', icon: 'Square' },
    ],
    jobTypes: ['Install', 'Repair', 'Inspection', 'Service Call', 'Estimate'],
    employeeRoles: ['Technician', 'Installer', 'Crew Lead', 'Carpenter'],
  },

  // =========================================================================
  // 20. MOVING
  // =========================================================================
  {
    id: 'moving',
    name: 'Moving',
    icon: 'Truck',
    emoji: '📦',
    description: 'Local, long distance, packing, storage, and office relocation',
    vertical: 'logistics',
    hasSeoPage: false,
    subServices: [
      { slug: 'local-moving', name: 'Local Moving', description: 'Same-city residential moves', category: 'Residential', defaultPrice: 450, duration: '4h', icon: 'Truck' },
      { slug: 'long-distance', name: 'Long Distance', description: 'Interstate and long-haul moves', category: 'Residential', defaultPrice: 2500, duration: '12h', icon: 'Truck' },
      { slug: 'packing', name: 'Packing', description: 'Professional packing and unpacking', category: 'Service', defaultPrice: 280, duration: '3h', icon: 'Box' },
      { slug: 'storage', name: 'Storage', description: 'Short and long-term storage', category: 'Storage', defaultPrice: 150, duration: '1h', icon: 'Warehouse' },
      { slug: 'office-relocation', name: 'Office Relocation', description: 'Commercial and office moves', category: 'Commercial', defaultPrice: 1800, duration: '8h', icon: 'Building2' },
    ],
    jobTypes: ['Local Move', 'Long Distance', 'Packing Job', 'Office Move', 'Storage', 'Estimate'],
    employeeRoles: ['Driver', 'Mover', 'Crew Lead', 'Packer'],
  },

  // =========================================================================
  // 21. HEALTH & WELLNESS
  // =========================================================================
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    icon: 'HeartPulse',
    emoji: '💆',
    description: 'Massage, physiotherapy, personal trainer, beauty salon, and spa',
    vertical: 'health-personal',
    hasSeoPage: false,
    subServices: [
      { slug: 'massage', name: 'Massage', description: 'In-home and studio massage therapy', category: 'Therapy', defaultPrice: 110, duration: '1h', icon: 'Heart' },
      { slug: 'physiotherapy', name: 'Physiotherapy', description: 'Physical therapy and rehab', category: 'Medical', defaultPrice: 130, duration: '1h', icon: 'HeartPulse' },
      { slug: 'personal-trainer', name: 'Personal Trainer', description: 'In-home and gym personal training', category: 'Fitness', defaultPrice: 80, duration: '1h', icon: 'Dumbbell' },
      { slug: 'beauty-salon', name: 'Beauty Salon', description: 'Hair, nails, and beauty services', category: 'Beauty', defaultPrice: 70, duration: '1h 30m', icon: 'Scissors' },
      { slug: 'spa', name: 'Spa', description: 'Mobile spa and wellness services', category: 'Spa', defaultPrice: 150, duration: '1h 30m', icon: 'Flower2' },
    ],
    jobTypes: ['Session', 'Consultation', 'Treatment', 'Class', 'Package'],
    employeeRoles: ['Therapist', 'Trainer', 'Stylist', 'Practitioner'],
  },

  // =========================================================================
  // 22. PROFESSIONAL SERVICES
  // =========================================================================
  {
    id: 'professional-services',
    name: 'Professional Services',
    icon: 'Briefcase',
    emoji: '💼',
    description: 'Accounting, legal, consulting, marketing, photography, event planning',
    vertical: 'professional',
    hasSeoPage: false,
    subServices: [
      { slug: 'accounting', name: 'Accounting', description: 'Bookkeeping, taxes, and payroll', category: 'Finance', defaultPrice: 150, duration: '1h', icon: 'Calculator' },
      { slug: 'legal', name: 'Legal', description: 'Legal consultation and document services', category: 'Legal', defaultPrice: 280, duration: '1h', icon: 'Scale' },
      { slug: 'consulting', name: 'Consulting', description: 'Business and strategy consulting', category: 'Consulting', defaultPrice: 200, duration: '1h', icon: 'Lightbulb' },
      { slug: 'marketing', name: 'Marketing', description: 'Digital marketing, SEO, and branding', category: 'Marketing', defaultPrice: 250, duration: '1h 30m', icon: 'Megaphone' },
      { slug: 'photography', name: 'Photography', description: 'Event, portrait, and product photography', category: 'Creative', defaultPrice: 350, duration: '3h', icon: 'Camera' },
      { slug: 'event-planning', name: 'Event Planning', description: 'Event coordination and management', category: 'Events', defaultPrice: 1200, duration: '8h', icon: 'Calendar' },
    ],
    jobTypes: ['Consultation', 'Project', 'Retainer', 'Session', 'Event'],
    employeeRoles: ['Consultant', 'Specialist', 'Manager', 'Coordinator'],
  },

  // =========================================================================
  // 23. PEST CONTROL (covered above as #13)
  // ---- (skipped — already added above)
  // =========================================================================

  // =========================================================================
  // 23. WINDOW CLEANING (already a sub-service of Cleaning, but listed as
  //     its own industry too for businesses that specialize).
  // =========================================================================
  {
    id: 'window-cleaning',
    name: 'Window Cleaning',
    icon: 'RectangleVertical',
    emoji: '🪟',
    description: 'Specialized residential and commercial window cleaning',
    vertical: 'custom',
    hasSeoPage: true,
    seoSlug: 'window-cleaning',
    subServices: [
      { slug: 'residential-windows', name: 'Residential Windows', description: 'Single and two-story home windows', category: 'Residential', defaultPrice: 180, duration: '2h', icon: 'Home' },
      { slug: 'commercial-windows', name: 'Commercial Windows', description: 'Storefront and office building windows', category: 'Commercial', defaultPrice: 380, duration: '4h', icon: 'Building2' },
      { slug: 'high-rise-windows', name: 'High-Rise Windows', description: 'High-rise and rope-access window cleaning', category: 'High-Rise', defaultPrice: 850, duration: '6h', icon: 'Building' },
      { slug: 'gutter-brightening', name: 'Gutter Brightening', description: 'Gutter exterior cleaning and brightening', category: 'Add-on', defaultPrice: 120, duration: '1h', icon: 'AlignHorizontalDistribute' },
      { slug: 'screen-repair', name: 'Screen Repair', description: 'Window screen repair and replacement', category: 'Add-on', defaultPrice: 65, duration: '45m', icon: 'Grid3x3' },
    ],
    jobTypes: ['Residential', 'Commercial', 'High-Rise', 'Add-on', 'Estimate'],
    employeeRoles: ['Window Tech', 'Crew Lead', 'High-Rise Tech'],
  },

  // =========================================================================
  // 24. SOLAR
  // =========================================================================
  {
    id: 'solar',
    name: 'Solar',
    icon: 'Sun',
    emoji: '☀️',
    description: 'Solar panel installation, repair, cleaning, and battery storage',
    vertical: 'custom',
    hasSeoPage: true,
    seoSlug: 'solar',
    subServices: [
      { slug: 'solar-installation', name: 'Solar Installation', description: 'Residential and commercial solar install', category: 'Installation', defaultPrice: 18000, duration: '16h', icon: 'Sun' },
      { slug: 'solar-repair', name: 'Solar Repair', description: 'Inverter, panel, and wiring repair', category: 'Repair', defaultPrice: 380, duration: '3h', icon: 'Wrench' },
      { slug: 'solar-cleaning', name: 'Solar Cleaning', description: 'Panel cleaning for max efficiency', category: 'Maintenance', defaultPrice: 200, duration: '2h', icon: 'Droplets' },
      { slug: 'battery-storage', name: 'Battery Storage', description: 'Solar battery install and service', category: 'Battery', defaultPrice: 8000, duration: '6h', icon: 'BatteryCharging' },
      { slug: 'solar-inspection', name: 'Solar Inspection', description: 'System inspection and performance audit', category: 'Inspection', defaultPrice: 220, duration: '2h', icon: 'Search' },
    ],
    jobTypes: ['Install', 'Repair', 'Maintenance', 'Inspection', 'Estimate'],
    employeeRoles: ['Solar Installer', 'Lead Installer', 'Electrician', 'Service Tech'],
  },

  // =========================================================================
  // 25. OTHERS
  // =========================================================================
  {
    id: 'others',
    name: 'Others',
    icon: 'LayoutGrid',
    emoji: '⚙️',
    description: 'Custom services and other industries not listed',
    vertical: 'custom',
    hasSeoPage: false,
    subServices: [
      { slug: 'custom-service', name: 'Custom Service', description: 'Define your own custom service', category: 'Custom', defaultPrice: 100, duration: '1h', icon: 'Settings' },
      { slug: 'other', name: 'Other', description: 'Other service not categorized', category: 'Other', defaultPrice: 100, duration: '1h', icon: 'CircleDashed' },
    ],
    jobTypes: ['Service Call', 'Project', 'Consultation', 'Other'],
    employeeRoles: ['Technician', 'Specialist', 'Owner'],
  },
];

// ---------------------------------------------------------------------------
// Compute stats (industries count, total sub-services)
// ---------------------------------------------------------------------------

CATALOG_STATS.industries = INDUSTRY_CATALOG.length;
CATALOG_STATS.subServices = INDUSTRY_CATALOG.reduce(
  (sum, ind) => sum + ind.subServices.length,
  0,
);

// ---------------------------------------------------------------------------
// Additional exports for back-compat with the old industry-kits.ts API
// ---------------------------------------------------------------------------

/**
 * Back-compat: return the industry list in the OLD shape expected by
 * /api/workspaces/industries/route.ts and saas-onboarding.tsx.
 *
 * Old shape: { id, label, icon (emoji), description }
 * New shape: { id, label, icon (lucide name), emoji, description, subServiceCount }
 *
 * Use `icon` for the Lucide name, `emoji` for emoji. The old code used emoji
 * directly as `icon`, so we keep that behavior in the `legacyList` export.
 */
export const legacyIndustryList = INDUSTRY_CATALOG.map((i) => ({
  id: i.id,
  label: i.name,
  icon: i.emoji, // legacy: emoji string
  description: i.description,
}));

/** Map old industry IDs → new IDs (for back-compat with persisted data). */
export const INDUSTRY_ID_ALIASES: Record<string, string> = {
  // 'packers-movers' → 'moving' (consolidated)
  'packers-movers': 'moving',
  // 'home-repair' → 'handyman' (consolidated)
  'home-repair': 'handyman',
  // 'salon-beauty' → 'health-wellness' (consolidated)
  'salon-beauty': 'health-wellness',
  'salon': 'health-wellness',
  // 'courier' → 'moving' (closest fit)
  'courier': 'moving',
  // 'car-wash' → 'automotive' (consolidated)
  'car-wash': 'automotive',
  // 'laundry' → 'cleaning' (consolidated)
  'laundry': 'cleaning',
  // 'delivery' → 'others' (no direct match)
  'delivery': 'others',
  // 'restaurant' → 'others'
  'restaurant': 'others',
  // 'retail' → 'others'
  'retail': 'others',
  // 'healthcare' → 'health-wellness'
  'healthcare': 'health-wellness',
  // 'electricians' → 'electrical' (old slug)
  'electricians': 'electrical',
  // 'general-contractor' → 'construction' (consolidated)
  'general-contractor': 'construction',
  // 'lawn-care' → 'landscaping' (consolidated)
  'lawn-care': 'landscaping',
};

/**
 * Resolve an industry ID, following aliases. Use this when reading
 * Tenant.industry / Workspace.industry from the DB to handle legacy values.
 */
export function resolveIndustryId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (INDUSTRY_CATALOG.some((i) => i.id === id)) return id;
  const aliased = INDUSTRY_ID_ALIASES[id];
  if (aliased && INDUSTRY_CATALOG.some((i) => i.id === aliased)) return aliased;
  return null;
}

// ---------------------------------------------------------------------------
// Vertical helpers
// ---------------------------------------------------------------------------

/** Return all 9 verticals. */
export function getVerticals() {
  return VERTICALS;
}

/** Return all industries that belong to a given vertical ID. */
export function getIndustriesByVertical(verticalId: string) {
  return INDUSTRY_CATALOG.filter((i) => VERTICAL_MAP[i.id] === verticalId);
}

/** Return the vertical ID for a given industry ID (undefined if unknown). */
export function getVerticalForIndustry(industryId: string): string | undefined {
  return VERTICAL_MAP[industryId];
}
