/**
 * generate-seed-sql.ts
 *
 * Generates a Supabase SQL migration file (`prisma/seed-marketplace-mass.sql`)
 * containing ~10,000 marketplace providers across 14 countries.
 *
 * Each provider gets:
 *   - Tenant row (unclaimed, un-verified, no fake reviews)
 *   - 3-6 Services (name, price in local currency, duration, description)
 *   - 1-3 Certifications (name, issuer, isVerified=false)
 *   - 1 Portfolio (items, awards, projects, team — JSON)
 *
 * The generated SQL uses explicit IDs (seed-xxx-NNNNN) so FK relationships
 * work without needing INSERT ... RETURNING.
 *
 * Run:  bun run prisma/generate-seed-sql.ts
 * Output: prisma/seed-marketplace-mass.sql  (copy-paste into Supabase SQL Editor)
 *
 * NOTE: This script does NOT write to the database. It only generates a .sql
 * file. Safe to run in the sandbox.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  MARKETPLACE_COUNTRIES,
  type MarketplaceCity,
  type MarketplaceCountry,
} from '../src/lib/marketplace-cities';

// ─── Industry Catalogue (12 industries) ─────────────────────────────────────

interface IndustryDef {
  id: string;
  name: string;
  emoji: string;
  services: { name: string; description: string; basePrice: number; duration: number; category: string }[];
  certifications: { name: string; issuer: string }[];
  businessSuffixes: string[];
}

const INDUSTRIES: IndustryDef[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    emoji: '🔧',
    businessSuffixes: ['Plumbing', 'Plumbers', 'Plumbing & Drainage', 'Plumbing Services', 'Pipe & Drain Co', 'WaterWorks', 'Flow Plumbing'],
    services: [
      { name: 'Emergency Leak Repair', description: 'Fast response to burst pipes, leaking taps, and water heater failures. Available 24/7 for urgent callouts.', basePrice: 120, duration: 90, category: 'emergency' },
      { name: 'Drain Cleaning', description: 'Professional drain unblocking and cleaning using high-pressure water jetting equipment. Removes grease, tree roots, and debris.', basePrice: 85, duration: 60, category: 'maintenance' },
      { name: 'Hot Water System Installation', description: 'Supply and installation of gas, electric, and solar hot water systems from leading brands. Includes old unit removal.', basePrice: 850, duration: 240, category: 'installation' },
      { name: 'Bathroom Renovation Plumbing', description: 'Complete bathroom plumbing rough-in and fit-off including shower, toilet, vanity, and drainage connections.', basePrice: 1500, duration: 480, category: 'renovation' },
      { name: 'Gas Fitting', description: 'Licensed gas fitting for stoves, heaters, and BBQs. Includes safety inspection and compliance certificate.', basePrice: 150, duration: 90, category: 'gas' },
      { name: 'Pipe Relining', description: 'Trenchless pipe relining to repair cracked or broken underground pipes without excavating your yard.', basePrice: 2200, duration: 360, category: 'repair' },
    ],
    certifications: [
      { name: 'Licensed Plumber', issuer: 'State Licensing Board' },
      { name: 'Gas Fitting Certificate', issuer: 'Energy Safety Regulator' },
      { name: 'Backflow Prevention Accredited', issuer: 'Water Authority' },
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    emoji: '❄️',
    businessSuffixes: ['HVAC Solutions', 'Air Conditioning', 'Climate Control', 'Heating & Cooling', 'Air Con Services', 'Thermal Solutions', 'Comfort Systems'],
    services: [
      { name: 'AC Installation', description: 'Professional installation of split system, ducted, and multi-head air conditioning units. Includes commissioning and warranty.', basePrice: 1200, duration: 300, category: 'installation' },
      { name: 'Heating System Repair', description: 'Diagnosis and repair of gas heaters, heat pumps, and electric furnaces. Parts and labour included.', basePrice: 180, duration: 120, category: 'repair' },
      { name: 'Ducted System Service', description: 'Annual service for ducted heating and cooling systems. Includes filter replacement, duct inspection, and performance check.', basePrice: 220, duration: 90, category: 'maintenance' },
      { name: 'Refrigerant Recharge', description: 'Refrigerant top-up and leak detection for air conditioning systems. Environmentally compliant disposal.', basePrice: 250, duration: 90, category: 'maintenance' },
      { name: 'Evaporative Cooler Service', description: 'Pre-summer service for evaporative cooling units. Pad replacement, pump check, and water distribution cleaning.', basePrice: 165, duration: 75, category: 'maintenance' },
    ],
    certifications: [
      { name: 'ARCtick Licensed', issuer: 'Australian Refrigeration Council' },
      { name: 'Restricted Electrical License', issuer: 'Electrical Safety Office' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    emoji: '⚡',
    businessSuffixes: ['Electrical', 'Electricians', 'Electrical Services', 'Power Solutions', 'Spark Electric', 'Volt Electrical', 'Wire & Power Co'],
    services: [
      { name: 'Switchboard Upgrade', description: 'Upgrade old fuse boxes to modern circuit breaker switchboards with safety switches. Full compliance with current standards.', basePrice: 950, duration: 300, category: 'installation' },
      { name: 'Power Point Installation', description: 'Installation of additional power points, USB charging outlets, and weatherproof exterior sockets.', basePrice: 85, duration: 45, category: 'installation' },
      { name: 'Lighting Design & Install', description: 'LED downlight installation, pendant lighting, outdoor security lighting, and dimmer switch fitting.', basePrice: 180, duration: 90, category: 'installation' },
      { name: 'Electrical Safety Inspection', description: 'Comprehensive electrical safety audit with detailed report. Identifies hazards, non-compliant wiring, and fire risks.', basePrice: 150, duration: 60, category: 'inspection' },
      { name: 'Emergency Callout', description: '24/7 emergency electrician for power outages, sparking outlets, and switchboard failures. Rapid response.', basePrice: 200, duration: 90, category: 'emergency' },
      { name: 'Solar Panel Installation', description: 'Grid-connected solar PV system design and installation. Includes inverter, mounting, and electrical compliance.', basePrice: 3500, duration: 480, category: 'installation' },
    ],
    certifications: [
      { name: 'Licensed Electrician', issuer: 'State Licensing Authority' },
      { name: 'Clean Energy Council Accredited', issuer: 'Clean Energy Council' },
    ],
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    emoji: '🧽',
    businessSuffixes: ['Cleaning Services', 'Cleaners', 'Cleaning Co', 'Sparkle Cleaning', 'Fresh & Clean', 'DeepClean Pros', 'Pristine Cleaning'],
    services: [
      { name: 'Regular House Cleaning', description: 'Weekly or fortnightly house cleaning including kitchen, bathrooms, bedrooms, and living areas. Eco-friendly products.', basePrice: 90, duration: 120, category: 'regular' },
      { name: 'End of Lease Clean', description: 'Comprehensive bond cleaning service. Includes oven, carpets, windows, and blinds. Bond-back guarantee.', basePrice: 350, duration: 300, category: 'specialised' },
      { name: 'Carpet Steam Cleaning', description: 'Hot water extraction carpet cleaning with stain treatment and deodoriser. Suitable for wool and synthetic carpets.', basePrice: 120, duration: 90, category: 'specialised' },
      { name: 'Window Cleaning', description: 'Interior and exterior window cleaning including tracks, frames, and sills. Reach and wash pole system for upper floors.', basePrice: 85, duration: 60, category: 'regular' },
      { name: 'Office Cleaning', description: 'Daily, weekly, or monthly commercial office cleaning. Includes kitchens, bathrooms, desks, and common areas.', basePrice: 150, duration: 120, category: 'commercial' },
    ],
    certifications: [
      { name: 'Police Checked', issuer: 'National Police Service' },
      { name: 'Insured & Bonded', issuer: 'Insurance Provider' },
    ],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    emoji: '🌳',
    businessSuffixes: ['Landscaping', 'Garden Services', 'Lawn Care', 'Garden Design', 'GreenScape', 'Outdoor Living', 'Turf & Garden Co'],
    services: [
      { name: 'Lawn Mowing & Maintenance', description: 'Regular lawn mowing, edging, and blow-down. Includes fertilising and weed control as needed.', basePrice: 55, duration: 45, category: 'maintenance' },
      { name: 'Garden Design', description: 'Professional garden design including plant selection, layout, and 3D rendering. Drought-tolerant options available.', basePrice: 450, duration: 120, category: 'design' },
      { name: 'Retaining Wall Construction', description: 'Construction of timber, concrete, and stone retaining walls. Includes drainage and engineering for walls over 1m.', basePrice: 1200, duration: 300, category: 'construction' },
      { name: 'Paving & Decking', description: 'Installation of outdoor paving, decking, and pergola foundations. Includes site preparation and drainage.', basePrice: 1800, duration: 480, category: 'construction' },
      { name: 'Tree Lopping & Pruning', description: 'Safe tree removal, pruning, and stump grinding. Fully insured arborist team with crane access.', basePrice: 350, duration: 180, category: 'tree' },
    ],
    certifications: [
      { name: 'Qualified Arborist', issuer: 'Arboriculture Association' },
      { name: 'Pest Control License', issuer: 'State Authority' },
    ],
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    emoji: '🐛',
    businessSuffixes: ['Pest Control', 'Pest Management', 'BugStop', 'PestAway', 'Termite Solutions', 'PestEx', 'Guardian Pest Control'],
    services: [
      { name: 'General Pest Treatment', description: 'Treatment for cockroaches, ants, spiders, and silverfish. Interior and exterior spray with 12-month warranty.', basePrice: 180, duration: 60, category: 'general' },
      { name: 'Termite Inspection', description: 'Comprehensive termite inspection using thermal imaging and moisture detection. Includes detailed written report.', basePrice: 250, duration: 90, category: 'inspection' },
      { name: 'Termite Treatment', description: 'Chemical barrier treatment or baiting system installation for active termite infestations. 8-year warranty.', basePrice: 2500, duration: 300, category: 'treatment' },
      { name: 'Rodent Control', description: 'Bait station installation and trapping for rats and mice. Includes follow-up visit and exclusion advice.', basePrice: 150, duration: 60, category: 'general' },
      { name: 'Bed Bug Treatment', description: 'Heat treatment and chemical application for bed bug infestations. Discreet service with follow-up inspection.', basePrice: 400, duration: 180, category: 'treatment' },
    ],
    certifications: [
      { name: 'Licensed Pest Controller', issuer: 'State Health Department' },
      { name: 'Termite Management Accredited', issuer: 'Australian Environmental Pest Managers Association' },
    ],
  },
  {
    id: 'roofing',
    name: 'Roofing',
    emoji: '🏠',
    businessSuffixes: ['Roofing', 'Roofing Co', 'Roof Restoration', 'Roofing Services', 'TopRoof', 'Premier Roofing', 'Roof & Gutter Co'],
    services: [
      { name: 'Roof Inspection', description: 'Full roof inspection with drone photography. Identifies cracked tiles, rusted metal, and flashing failures.', basePrice: 200, duration: 60, category: 'inspection' },
      { name: 'Roof Repair', description: 'Tile replacement, metal sheet repair, and flashing restoration. Leaking roof diagnosis and fix.', basePrice: 450, duration: 180, category: 'repair' },
      { name: 'Roof Restoration', description: 'Complete roof restoration including cleaning, rebedding, repointing, and resealing. 10-year warranty.', basePrice: 2200, duration: 480, category: 'restoration' },
      { name: 'Gutter Cleaning', description: 'Gutter and downpipe clearing. Removes leaves, debris, and blockages. Includes minor repairs.', basePrice: 180, duration: 90, category: 'maintenance' },
      { name: 'Roof Replacement', description: 'Full roof replacement with new tiles or Colorbond metal. Includes removal, disposal, and installation.', basePrice: 8500, duration: 960, category: 'replacement' },
    ],
    certifications: [
      { name: 'Licensed Roof Plumber', issuer: 'State Licensing Board' },
      { name: 'Work at Heights Certified', issuer: 'Safety Authority' },
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    emoji: '🎨',
    businessSuffixes: ['Painting', 'Painters', 'Painting Services', 'ColourPro', 'Premier Painting', 'Brush & Roll', 'Perfect Finish Painting'],
    services: [
      { name: 'Interior House Painting', description: 'Interior painting of walls, ceilings, and trim. Includes surface preparation, filling, and two coats of premium paint.', basePrice: 1200, duration: 480, category: 'interior' },
      { name: 'Exterior House Painting', description: 'Exterior painting including weatherboards, render, and trim. Weather-resistant paints with 15-year warranty.', basePrice: 2500, duration: 600, category: 'exterior' },
      { name: 'Roof Painting', description: 'Roof tile or metal painting with heat-reflective coatings. Includes cleaning and priming.', basePrice: 1500, duration: 360, category: 'roof' },
      { name: 'Commercial Painting', description: 'Office, retail, and strata painting. After-hours and weekend work available to minimise disruption.', basePrice: 2000, duration: 480, category: 'commercial' },
      { name: 'Wallpaper Installation', description: 'Professional wallpaper hanging including pattern matching and seam sealing. Feature walls and full rooms.', basePrice: 350, duration: 180, category: 'specialised' },
    ],
    certifications: [
      { name: 'Licensed Painter', issuer: 'State Licensing Authority' },
      { name: 'Lead-Safe Certified', issuer: 'Environmental Protection Agency' },
    ],
  },
  {
    id: 'locksmith',
    name: 'Locksmith',
    emoji: '🔑',
    businessSuffixes: ['Locksmith', 'Lock Services', 'KeyMaster', 'Security Locksmith', 'Mobile Locksmith', 'Lock & Key Co', 'SecureLock'],
    services: [
      { name: 'Emergency Lockout', description: 'Rapid response lockout service for homes, businesses, and vehicles. Non-destructive entry techniques.', basePrice: 120, duration: 30, category: 'emergency' },
      { name: 'Lock Installation', description: 'Supply and installation of deadbolts, digital locks, and smart locks. Includes key cutting.', basePrice: 180, duration: 60, category: 'installation' },
      { name: 'Rekey Service', description: 'Rekeying of existing locks to new keys. Ideal after moving house or losing keys. Multiple locks to same key.', basePrice: 85, duration: 45, category: 'service' },
      { name: 'Master Key System', description: 'Design and implementation of master key systems for commercial premises. Restricted key profiles.', basePrice: 450, duration: 120, category: 'commercial' },
      { name: 'Safe Opening & Repair', description: 'Safe lockout, combination change, and lock repair. All safe types including digital and mechanical.', basePrice: 250, duration: 90, category: 'safe' },
    ],
    certifications: [
      { name: 'Licensed Locksmith', issuer: 'State Security Licensing' },
      { name: 'Security Installer Accredited', issuer: 'Security Industry Association' },
    ],
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    emoji: '🔌',
    businessSuffixes: ['Appliance Repair', 'Appliance Service', 'FixIt Appliances', 'Appliance Doctor', 'RepairPro', 'Home Appliance Services', 'TechRepair'],
    services: [
      { name: 'Washing Machine Repair', description: 'Diagnosis and repair of front loader, top loader, and washer-dryer combos. All major brands serviced.', basePrice: 150, duration: 75, category: 'repair' },
      { name: 'Fridge Repair', description: 'Refrigerator and freezer repair including compressor replacement, gas recharge, and thermostat fix.', basePrice: 200, duration: 90, category: 'repair' },
      { name: 'Oven & Stove Repair', description: 'Electric and gas oven repair including element replacement, thermostat, and door hinge fix.', basePrice: 180, duration: 75, category: 'repair' },
      { name: 'Dishwasher Repair', description: 'Dishwasher diagnosis and repair including pump, motor, and door seal replacement.', basePrice: 165, duration: 75, category: 'repair' },
      { name: 'Dryer Repair', description: 'Heat pump, condenser, and vented dryer repair. Belt, element, and sensor replacement.', basePrice: 140, duration: 60, category: 'repair' },
    ],
    certifications: [
      { name: 'Licensed Appliance Technician', issuer: 'State Authority' },
      { name: 'Manufacturer Certified', issuer: 'Brand Training Programs' },
    ],
  },
  {
    id: 'pool-spa',
    name: 'Pool & Spa',
    emoji: '🏊',
    businessSuffixes: ['Pool Services', 'Pool & Spa', 'AquaPool', 'Pool Care', 'Pool Maintenance', 'Blue Water Pools', 'Spa & Pool Co'],
    services: [
      { name: 'Weekly Pool Maintenance', description: 'Regular pool cleaning including vacuuming, brushing, skimming, and chemical balance testing.', basePrice: 65, duration: 45, category: 'maintenance' },
      { name: 'Pool Equipment Repair', description: 'Repair and replacement of pool pumps, filters, heaters, and chlorinators. All major brands.', basePrice: 250, duration: 90, category: 'repair' },
      { name: 'Green Pool Recovery', description: 'Treatment of algae-infested green pools. Includes shock treatment, flocculant, and filter clean.', basePrice: 350, duration: 120, category: 'treatment' },
      { name: 'Spa Service', description: 'Spa draining, cleaning, and refill. Filter replacement and chemical balance adjustment.', basePrice: 180, duration: 90, category: 'maintenance' },
      { name: 'Pool Resurfacing', description: 'Interior pool resurfacing including pebblecrete, tile, and fiberglass. Includes waterproofing.', basePrice: 4500, duration: 600, category: 'renovation' },
    ],
    certifications: [
      { name: 'Pool Operator Certified', issuer: 'Pool & Spa Association' },
      { name: 'Chemical Handling Accredited', issuer: 'Safety Authority' },
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    emoji: '🚗',
    businessSuffixes: ['Auto Repair', 'Mechanic', 'Auto Services', 'Car Care', 'AutoTech', 'Motor Works', 'ProMech'],
    services: [
      { name: 'Log Book Service', description: 'Manufacturer-specified log book servicing. Preserves new car warranty. All makes and models.', basePrice: 220, duration: 90, category: 'service' },
      { name: 'Brake Service', description: 'Brake pad and rotor replacement, brake fluid flush, and caliper service. Safety inspection included.', basePrice: 350, duration: 120, category: 'repair' },
      { name: 'Transmission Service', description: 'Automatic and manual transmission service including fluid change and filter replacement.', basePrice: 280, duration: 90, category: 'service' },
      { name: 'Air Con Regas', description: 'Car air conditioning regas and leak check. R134a and R1234yf refrigerant available.', basePrice: 150, duration: 60, category: 'service' },
      { name: 'Roadworthy Inspection', description: 'Pre-purchase or registration roadworthy inspection. Detailed report with safety item identification.', basePrice: 120, duration: 60, category: 'inspection' },
    ],
    certifications: [
      { name: 'Licensed Motor Vehicle Repairer', issuer: 'State Licensing Authority' },
      { name: 'Air Conditioning Accredited', issuer: 'Automotive Air Conditioning Council' },
    ],
  },
];

// ─── Name Generation ────────────────────────────────────────────────────────

const BUSINESS_PREFIXES = [
  'Premier', 'Elite', 'Pro', 'Expert', 'Reliable', 'Trusted', 'Local', 'City',
  'Metro', 'Rapid', 'Swift', 'Quality', 'Advanced', 'Complete', 'Total', 'Direct',
  'Family', 'Affordable', 'Top', 'First', 'Prime', 'Smart', 'Better', 'Right',
];

const FOUNDER_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
];

function generateBusinessName(industry: IndustryDef, city: MarketplaceCity): string {
  const patterns = [
    () => `${city.city} ${industry.businessSuffixes[Math.floor(Math.random() * industry.businessSuffixes.length)]}`,
    () => `${BUSINESS_PREFIXES[Math.floor(Math.random() * BUSINESS_PREFIXES.length)]} ${industry.businessSuffixes[Math.floor(Math.random() * industry.businessSuffixes.length)]} ${city.city}`,
    () => `${FOUNDER_NAMES[Math.floor(Math.random() * FOUNDER_NAMES.length)]} ${industry.name}`,
    () => `${city.city}'s ${industry.businessSuffixes[Math.floor(Math.random() * industry.businessSuffixes.length)]}`,
    () => `${BUSINESS_PREFIXES[Math.floor(Math.random() * BUSINESS_PREFIXES.length)]} ${industry.name} ${city.city}`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)]();
}

function slugify(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${suffix}`;
}

function generatePhone(country: MarketplaceCountry): string {
  const countryCode: Record<string, string> = {
    US: '+1', AU: '+61', CA: '+1', GB: '+44', DE: '+49', FR: '+33',
    ES: '+34', IT: '+39', NL: '+31', PL: '+48', SE: '+46', NO: '+47',
    DK: '+45', CH: '+41', NZ: '+64', IN: '+91', AE: '+971', SG: '+65',
  };
  const cc = countryCode[country.code] || '+1';
  const area = Math.floor(200 + Math.random() * 800);
  const prefix = Math.floor(200 + Math.random() * 800);
  const line = Math.floor(1000 + Math.random() * 9000);
  return `${cc} ${area} ${prefix} ${line}`;
}

// ─── SQL Helpers ────────────────────────────────────────────────────────────

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

function sqlVal(v: string | number | boolean | null): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${sqlEscape(v)}'`;
}

// ─── Provider Count Distribution ────────────────────────────────────────────

const COUNTRY_PROVIDER_COUNTS: Record<string, number> = {
  US: 1800,
  AU: 1000,
  GB: 1200,
  CA: 900,
  DE: 1100,
  FR: 700,
  ES: 650,
  IT: 650,
  NL: 400,
  PL: 400,
  SE: 300,
  NO: 200,
  DK: 200,
  CH: 250,
};

// ─── Main Generator ─────────────────────────────────────────────────────────

interface GeneratedTenant {
  id: string;
  slug: string;
  name: string;
  industry: string;
  tagline: string;
  description: string;
  city: string;
  state: string;
  country: string;
  currency: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  coverImage: string;
  businessHoursJson: string;
  serviceAreasJson: string;
  faqsJson: string;
  languagesJson: string;
  businessCategoriesJson: string;
  settingsJson: string;
  socialLinksJson: string;
  galleryJson: string;
}

interface GeneratedService {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  duration: number;
  category: string;
}

interface GeneratedCert {
  id: string;
  tenantId: string;
  name: string;
  issuer: string;
  isVerified: boolean;
}

interface GeneratedPortfolio {
  id: string;
  tenantId: string;
  itemsJson: string;
  awardsJson: string;
  projectsJson: string;
  teamJson: string;
}

function generate(): {
  tenants: GeneratedTenant[];
  services: GeneratedService[];
  certs: GeneratedCert[];
  portfolios: GeneratedPortfolio[];
  perCountry: Record<string, number>;
} {
  const tenants: GeneratedTenant[] = [];
  const services: GeneratedService[] = [];
  const certs: GeneratedCert[] = [];
  const portfolios: GeneratedPortfolio[] = [];
  const perCountry: Record<string, number> = {};

  const STD_HOURS = JSON.stringify({
    mon: { open: '08:00', close: '18:00' },
    tue: { open: '08:00', close: '18:00' },
    wed: { open: '08:00', close: '18:00' },
    thu: { open: '08:00', close: '18:00' },
    fri: { open: '08:00', close: '18:00' },
    sat: { open: '09:00', close: '14:00' },
    sun: null,
  });

  let tenantSeq = 0;
  let serviceSeq = 0;
  let certSeq = 0;
  let portfolioSeq = 0;

  for (const country of MARKETPLACE_COUNTRIES) {
    const targetCount = COUNTRY_PROVIDER_COUNTS[country.code] || 100;
    perCountry[country.code] = 0;

    for (let i = 0; i < targetCount; i++) {
      // Pick a city (weighted by population)
      const city = country.cities[Math.floor(Math.random() * country.cities.length)];

      // Pick an industry
      const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];

      // Generate name
      const name = generateBusinessName(industry, city);
      const slug = slugify(name, String(tenantSeq).padStart(5, '0'));

      // Lat/lng jitter (±0.5km ≈ ±0.005 degrees)
      const lat = +(city.lat + (Math.random() - 0.5) * 0.01).toFixed(6);
      const lng = +(city.lng + (Math.random() - 0.5) * 0.01).toFixed(6);

      const tenantId = `seed-${String(tenantSeq).padStart(5, '0')}`;
      tenantSeq++;

      const tagline = `${industry.emoji} ${industry.name} services in ${city.city}`;
      const description = `${name} is a trusted ${industry.name.toLowerCase()} business serving ${city.city} and surrounding areas. With experienced technicians and quality workmanship, we provide reliable ${industry.name.toLowerCase()} solutions for residential and commercial customers. Contact us today for a free quote.`;

      const serviceAreas = JSON.stringify(
        country.cities.slice(0, 5).map((c) => c.city),
      );

      const faqs = JSON.stringify([
        { question: 'Do you offer free quotes?', answer: 'Yes, we provide free no-obligation quotes for all services.' },
        { question: 'Are you licensed and insured?', answer: 'Yes, we are fully licensed and insured for all work we undertake.' },
        { question: 'What areas do you service?', answer: `We service ${city.city} and surrounding areas within a ${25 + Math.floor(Math.random() * 15)}km radius.` },
      ]);

      const tenant: GeneratedTenant = {
        id: tenantId,
        slug,
        name,
        industry: industry.id,
        tagline,
        description,
        city: city.city,
        state: city.region,
        country: country.code,
        currency: country.currency,
        phone: generatePhone(country),
        email: `info+${slug}@marketplace.demo`,
        latitude: lat,
        longitude: lng,
        serviceRadiusKm: 15 + Math.floor(Math.random() * 25),
        coverImage: `/images/industry/${industry.id}.webp`,
        businessHoursJson: STD_HOURS,
        serviceAreasJson: serviceAreas,
        faqsJson: faqs,
        languagesJson: JSON.stringify(['en']),
        businessCategoriesJson: JSON.stringify([industry.id]),
        settingsJson: JSON.stringify({ seedBatch: 'mass-2025', seedCountry: country.code }),
        socialLinksJson: '{}',
        galleryJson: '[]',
      };

      tenants.push(tenant);
      perCountry[country.code]++;

      // Services (3-6)
      const numServices = 3 + Math.floor(Math.random() * 4);
      const shuffledServices = [...industry.services].sort(() => Math.random() - 0.5).slice(0, numServices);
      for (const svc of shuffledServices) {
        const svcId = `seed-svc-${String(serviceSeq).padStart(6, '0')}`;
        serviceSeq++;
        services.push({
          id: svcId,
          tenantId,
          name: svc.name,
          slug: svc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: svc.description,
          basePrice: svc.basePrice,
          duration: svc.duration,
          category: svc.category,
        });
      }

      // Certifications (1-3)
      const numCerts = 1 + Math.floor(Math.random() * 3);
      const shuffledCerts = [...industry.certifications].sort(() => Math.random() - 0.5).slice(0, numCerts);
      for (const cert of shuffledCerts) {
        const certId = `seed-cert-${String(certSeq).padStart(6, '0')}`;
        certSeq++;
        certs.push({
          id: certId,
          tenantId,
          name: cert.name,
          issuer: cert.issuer,
          isVerified: false, // All un-verified
        });
      }

      // Portfolio (1 per tenant)
      const portId = `seed-port-${String(portfolioSeq).padStart(6, '0')}`;
      portfolioSeq++;
      portfolios.push({
        id: portId,
        tenantId,
        itemsJson: JSON.stringify([
          { title: `${industry.name} Project - ${city.city}`, description: `Recent ${industry.name.toLowerCase()} work completed in ${city.city}.`, date: '2024-01-15', category: industry.id },
        ]),
        awardsJson: '[]',
        projectsJson: JSON.stringify([
          { title: `${city.city} ${industry.name} Project`, description: `Completed ${industry.name.toLowerCase()} installation in ${city.city}.`, date: '2024-01-15', value: 1500, duration: '1 day' },
        ]),
        teamJson: JSON.stringify([
          { name: `${FOUNDER_NAMES[Math.floor(Math.random() * FOUNDER_NAMES.length)]} ${FOUNDER_NAMES[Math.floor(Math.random() * FOUNDER_NAMES.length)]}`, role: 'Owner / Lead Technician', bio: '15+ years experience in the industry.' },
        ]),
      });
    }
  }

  return { tenants, services, certs, portfolios, perCountry };
}

// ─── SQL Output ─────────────────────────────────────────────────────────────

function buildTenantInserts(tenants: GeneratedTenant[]): string {
  const lines: string[] = [];
  const columns = `("id", "name", "slug", "industry", "tagline", "description", "city", "state", "country", "currency", "phone", "email", "latitude", "longitude", "serviceRadiusKm", "coverImage", "galleryJson", "businessHoursJson", "serviceAreasJson", "faqsJson", "languagesJson", "socialLinksJson", "businessCategoriesJson", "settingsJson", "publicProfileEnabled", "marketplaceOptIn", "marketplaceTermsAcceptedAt", "identityVerified", "businessVerified", "insuranceVerified", "stripeConnected", "stripePayoutsEnabled", "stripeAccountId", "claimed", "claimedAt", "claimedById", "listingTier", "rating", "reviewCount", "plan", "planStatus", "onboardingCompleted", "profileCompletionPct", "seoTitle", "seoDescription", "createdAt", "updatedAt")`;

  // Batch 100 per INSERT
  for (let i = 0; i < tenants.length; i += 100) {
    const batch = tenants.slice(i, i + 100);
    const values = batch.map((t) => {
      const now = new Date().toISOString();
      return `(${sqlVal(t.id)}, ${sqlVal(t.name)}, ${sqlVal(t.slug)}, ${sqlVal(t.industry)}, ${sqlVal(t.tagline)}, ${sqlVal(t.description)}, ${sqlVal(t.city)}, ${sqlVal(t.state)}, ${sqlVal(t.country)}, ${sqlVal(t.currency)}, ${sqlVal(t.phone)}, ${sqlVal(t.email)}, ${sqlVal(t.latitude)}, ${sqlVal(t.longitude)}, ${sqlVal(t.serviceRadiusKm)}, ${sqlVal(t.coverImage)}, ${sqlVal(t.galleryJson)}, ${sqlVal(t.businessHoursJson)}, ${sqlVal(t.serviceAreasJson)}, ${sqlVal(t.faqsJson)}, ${sqlVal(t.languagesJson)}, ${sqlVal(t.socialLinksJson)}, ${sqlVal(t.businessCategoriesJson)}, ${sqlVal(t.settingsJson)}, true, true, ${sqlVal(now)}, false, false, false, false, false, NULL, false, NULL, NULL, 'free', 0, 0, 'starter', 'trial', true, 60, ${sqlVal(`${t.name} | ${t.tagline}`)}, ${sqlVal(t.description.slice(0, 155))}, ${sqlVal(now)}, ${sqlVal(now)})`;
    });
    lines.push(`INSERT INTO "Tenant" ${columns} VALUES\n  ${values.join(',\n  ')}\nON CONFLICT ("slug") DO NOTHING;`);
  }
  return lines.join('\n\n');
}

function buildServiceInserts(services: GeneratedService[]): string {
  const lines: string[] = [];
  const columns = `("id", "tenantId", "name", "slug", "description", "basePrice", "duration", "category", "isActive", "isPublic", "createdAt", "updatedAt")`;

  for (let i = 0; i < services.length; i += 100) {
    const batch = services.slice(i, i + 100);
    const values = batch.map((s) => {
      const now = new Date().toISOString();
      return `(${sqlVal(s.id)}, ${sqlVal(s.tenantId)}, ${sqlVal(s.name)}, ${sqlVal(s.slug)}, ${sqlVal(s.description)}, ${sqlVal(s.basePrice)}, ${sqlVal(s.duration)}, ${sqlVal(s.category)}, true, true, ${sqlVal(now)}, ${sqlVal(now)})`;
    });
    lines.push(`INSERT INTO "Service" ${columns} VALUES\n  ${values.join(',\n  ')}\nON CONFLICT DO NOTHING;`);
  }
  return lines.join('\n\n');
}

function buildCertInserts(certs: GeneratedCert[]): string {
  const lines: string[] = [];
  const columns = `("id", "tenantId", "name", "issuer", "isVerified", "verifiedAt", "createdAt", "updatedAt")`;

  for (let i = 0; i < certs.length; i += 100) {
    const batch = certs.slice(i, i + 100);
    const values = batch.map((c) => {
      const now = new Date().toISOString();
      return `(${sqlVal(c.id)}, ${sqlVal(c.tenantId)}, ${sqlVal(c.name)}, ${sqlVal(c.issuer)}, false, NULL, ${sqlVal(now)}, ${sqlVal(now)})`;
    });
    lines.push(`INSERT INTO "ProviderCertification" ${columns} VALUES\n  ${values.join(',\n  ')}\nON CONFLICT DO NOTHING;`);
  }
  return lines.join('\n\n');
}

function buildPortfolioInserts(portfolios: GeneratedPortfolio[]): string {
  const lines: string[] = [];
  const columns = `("id", "tenantId", "itemsJson", "videosJson", "awardsJson", "projectsJson", "teamJson", "isActive", "createdAt", "updatedAt")`;

  for (let i = 0; i < portfolios.length; i += 100) {
    const batch = portfolios.slice(i, i + 100);
    const values = batch.map((p) => {
      const now = new Date().toISOString();
      return `(${sqlVal(p.id)}, ${sqlVal(p.tenantId)}, ${sqlVal(p.itemsJson)}, '[]', ${sqlVal(p.awardsJson)}, ${sqlVal(p.projectsJson)}, ${sqlVal(p.teamJson)}, true, ${sqlVal(now)}, ${sqlVal(now)})`;
    });
    lines.push(`INSERT INTO "ProviderPortfolio" ${columns} VALUES\n  ${values.join(',\n  ')}\nON CONFLICT DO NOTHING;`);
  }
  return lines.join('\n\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────

function addConflictClauses(sql: string, table: string, conflictCol?: string): string {
  const conflict = conflictCol ? `ON CONFLICT ("${conflictCol}") DO NOTHING` : 'ON CONFLICT DO NOTHING';
  return sql.replace(
    new RegExp(`INSERT INTO "${table}"`, 'g'),
    `INSERT INTO "${table}"`,
  );
}

function buildCountrySql(
  countryCode: string,
  countryLabel: string,
  tenants: GeneratedTenant[],
  services: GeneratedService[],
  certs: GeneratedCert[],
  portfolios: GeneratedPortfolio[],
): string {
  const now = new Date().toISOString();
  return [
    `-- ════════════════════════════════════════════════════════════════════`,
    `-- ${countryCode} — ${countryLabel} (${tenants.length} providers)`,
    '-- ════════════════════════════════════════════════════════════════════',
    `-- Generated: ${now}`,
    '-- All providers: unclaimed, un-verified, rating=0, reviewCount=0',
    '-- Idempotent: ON CONFLICT DO NOTHING',
    '',
    'BEGIN;',
    '',
    '-- Tenants',
    buildTenantInserts(tenants),
    '',
    '-- Services',
    buildServiceInserts(services),
    '',
    '-- Certifications',
    buildCertInserts(certs),
    '',
    '-- Portfolios',
    buildPortfolioInserts(portfolios),
    '',
    'COMMIT;',
    '',
  ].join('\n');
}

function main() {
  console.log('=== Generating marketplace seed data ===\n');

  const { tenants, services, certs, portfolios, perCountry } = generate();

  console.log(`Generated:`);
  console.log(`  Tenants:       ${tenants.length}`);
  console.log(`  Services:      ${services.length}`);
  console.log(`  Certifications: ${certs.length}`);
  console.log(`  Portfolios:    ${portfolios.length}`);
  console.log(`\nPer country:`);
  Object.entries(perCountry).forEach(([code, n]) => {
    console.log(`  ${code}: ${n}`);
  });

  // ── Split by country ──────────────────────────────────────────────────
  // The full SQL is ~36 MB — too large for Supabase SQL Editor's paste limit.
  // Split into per-country files (~2 MB each) that can be pasted individually.
  const seedDir = join(process.cwd(), 'prisma', 'seed-sql');
  try { mkdirSync(seedDir, { recursive: true }); } catch { /* exists */ }

  let fileIdx = 0;
  const fileList: string[] = [];

  for (const country of MARKETPLACE_COUNTRIES) {
    fileIdx++;
    const countryTenants = tenants.filter((t) => t.country === country.code);
    if (countryTenants.length === 0) continue;

    const tenantIds = new Set(countryTenants.map((t) => t.id));
    const countryServices = services.filter((s) => tenantIds.has(s.tenantId));
    const countryCerts = certs.filter((c) => tenantIds.has(c.tenantId));
    const countryPortfolios = portfolios.filter((p) => tenantIds.has(p.tenantId));

    const sql = buildCountrySql(
      country.code,
      country.label,
      countryTenants,
      countryServices,
      countryCerts,
      countryPortfolios,
    );

    const prefix = String(fileIdx).padStart(2, '0');
    const fileName = `${prefix}-${country.code.toLowerCase()}.sql`;
    const filePath = join(seedDir, fileName);
    writeFileSync(filePath, sql, 'utf-8');

    const sizeMB = (sql.length / 1024 / 1024).toFixed(2);
    fileList.push(`  ${fileName} — ${country.code} (${countryTenants.length} providers, ${sizeMB} MB)`);
  }

  // ── Write index/readme ────────────────────────────────────────────────
  const indexSql = [
    '-- ════════════════════════════════════════════════════════════════════',
    '-- Marketplace Mass Seed — Index',
    '-- ════════════════════════════════════════════════════════════════════',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total providers: ${tenants.length}`,
    `-- Total services:  ${services.length}`,
    `-- Total certs:     ${certs.length}`,
    `-- Total portfolios: ${portfolios.length}`,
    '--',
    '-- The full seed is split into per-country files in this directory.',
    '-- Each file is self-contained with BEGIN/COMMIT and ON CONFLICT DO NOTHING.',
    '--',
    '-- Run order (paste each file into Supabase SQL Editor one at a time):',
    ...fileList,
    '',
    '-- After seeding, verify with:',
    `-- SELECT country, COUNT(*) FROM "Tenant" WHERE "marketplaceOptIn" = true GROUP BY country ORDER BY country;`,
    '',
  ].join('\n');
  writeFileSync(join(seedDir, '00-README.sql'), indexSql, 'utf-8');

  console.log(`\n✅ Per-country SQL files written to: ${seedDir}`);
  console.log(`   ${fileList.length} files + 1 README:`);
  fileList.forEach((f) => console.log(`   ${f}`));
  console.log(`\n📋 Paste each file into Supabase SQL Editor, one country at a time.`);
  console.log(`   Start with 00-README.sql for the run order.`);
}

main();
