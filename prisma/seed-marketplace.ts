/**
 * seed-marketplace.ts
 *
 * Seeds 12 demo marketplace providers across 8 industries so that the
 * public marketplace on `/` is fully demonstrable end-to-end:
 *
 *   - Each provider is a fully-eligible Tenant (all 8 gates passed)
 *   - Each has 4-7 services, 8-25 reviews, a gallery, business hours,
 *     service areas, FAQs, certifications, portfolio, and a FeaturedListing
 *   - Each has an owner User (login: owner+slug@demo.serviceos.cc / Owner@123)
 *   - 2 providers are marked Featured (priority 10), 2 Sponsored (priority 5)
 *   - Industries covered: plumbing, hvac, electrical, cleaning, landscaping,
 *     pest-control, roofing, painting, locksmith, appliance-repair, pool-spa,
 *     automotive
 *
 * Idempotent: uses upsert on slug + email. Safe to re-run.
 *
 * Usage:  bun run prisma/seed-marketplace.ts
 */

import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { pickStockPhotoUrl } from '../src/lib/seed-stock-photos';

// ─── Provider definitions ───────────────────────────────────────────────────

interface ServiceSeed {
  name: string;
  description: string;
  basePrice: number;
  duration: number; // minutes
  category: string;
}

interface ReviewSeed {
  authorName: string;
  rating: number;
  comment: string;
  source: string;
  npsScore?: number;
}

interface ProviderSeed {
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
  coverImage: string;
  gallery: { url: string; caption: string }[];
  businessHours: Record<string, { open: string; close: string } | null>;
  serviceAreas: string[];
  faqs: { question: string; answer: string }[];
  languages: string[];
  pricingType: string;
  callOutFee: number;
  emergencyServiceAvailable: boolean;
  emergencySurchargePct: number;
  vatNumber: string;
  licenceNumber: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  employeesCount: number;
  certifications: { name: string; issuer: string; verified: boolean }[];
  portfolio: {
    items: { title: string; description: string; date: string; category: string }[];
    awards: { name: string; issuer: string; year: number; description: string }[];
    projects: { title: string; description: string; date: string; value: number; duration: string }[];
    team: { name: string; role: string; bio: string }[];
  };
  services: ServiceSeed[];
  reviews: ReviewSeed[];
  featured?: { type: string; priority: number };
}

// Stock cover images sourced from the verified seed-stock-photos library
// (src/lib/seed-stock-photos.ts). All 15 photo IDs are HTTP-200 verified.
// Previously this map held 6 broken/placeholder Unsplash IDs (hvac, electrical,
// automotive, pest, roofing, locksmith) that returned 404 — now unified through
// pickStockPhotoUrl() which only returns verified URLs and falls back to a
// safe default for any industry not in the map.
// To durably host these (S3/local FS) instead of hotlinking, call
// downloadAndUploadCover(industry, index, slug) from the same library.
const COVER = {
  plumbing: pickStockPhotoUrl('plumbing', 0),
  hvac: pickStockPhotoUrl('hvac', 0),
  electrical: pickStockPhotoUrl('electrical', 0),
  cleaning: pickStockPhotoUrl('cleaning', 0),
  landscaping: pickStockPhotoUrl('landscaping', 0),
  pest: pickStockPhotoUrl('pest-control', 0),
  roofing: pickStockPhotoUrl('roofing', 0),
  painting: pickStockPhotoUrl('painting', 0),
  locksmith: pickStockPhotoUrl('locksmith', 0),
  appliance: pickStockPhotoUrl('appliance-repair', 0),
  pool: pickStockPhotoUrl('pool-spa', 0),
  automotive: pickStockPhotoUrl('automotive', 0),
};

const GALLERY_ITEM = (url: string, caption: string) => ({ url, caption });

const STD_BUSINESS_HOURS = {
  mon: { open: '08:00', close: '18:00' },
  tue: { open: '08:00', close: '18:00' },
  wed: { open: '08:00', close: '18:00' },
  thu: { open: '08:00', close: '18:00' },
  fri: { open: '08:00', close: '18:00' },
  sat: { open: '09:00', close: '14:00' },
  sun: null,
};

const PROVIDERS: ProviderSeed[] = [
  // ── 1. HVAC — featured ───────────────────────────────────────────────
  {
    slug: 'metro-hvac-solutions',
    name: 'Metro HVAC Solutions',
    industry: 'hvac',
    tagline: '24/7 emergency heating & cooling experts',
    description:
      'Metro HVAC Solutions has been keeping homes and businesses comfortable for over 15 years. Our certified technicians handle everything from routine AC maintenance to complete system replacements. We service all major brands and offer upfront pricing with no hidden fees. Available 24/7 for emergencies because we know HVAC problems do not wait for business hours.',
    city: 'New York',
    state: 'NY',
    country: 'US',
    currency: 'USD',
    phone: '+1-212-555-0142',
    email: 'owner@metrohvac.com',
    coverImage: COVER.hvac,
    gallery: [
      GALLERY_ITEM(COVER.hvac, 'HVAC installation in progress'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&h=400&fit=crop', 'Rooftop unit repair'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&h=400&fit=crop', 'Furnace maintenance'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
    faqs: [
      { question: 'Do you offer emergency service?', answer: 'Yes, we are available 24/7 for HVAC emergencies. Call us any time.' },
      { question: 'Do you offer free estimates?', answer: 'Yes, estimates are free for new system installations.' },
      { question: 'What brands do you service?', answer: 'We service all major brands including Carrier, Trane, Lennox, and more.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'mixed',
    callOutFee: 89,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 40,
    vatNumber: 'US-EIN-47-1234567',
    licenceNumber: 'NYC-HVAC-4421',
    insuranceProvider: 'State Farm',
    insurancePolicyNumber: 'SF-HVAC-889-2024',
    employeesCount: 14,
    certifications: [
      { name: 'NATE Certified', issuer: 'North American Technician Excellence', verified: true },
      { name: 'EPA Section 608', issuer: 'US Environmental Protection Agency', verified: true },
      { name: 'BPI Building Analyst', issuer: 'Building Performance Institute', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Central Park West AC Replacement', description: 'Replaced 5-ton condenser + air handler in a 3,500 sq ft apartment.', date: '2025-09-15', category: 'Installation' },
        { title: 'Brooklyn Restaurant Walk-in Cooler', description: 'Installed commercial refrigeration for a busy restaurant kitchen.', date: '2025-11-02', category: 'Commercial' },
      ],
      awards: [
        { name: 'Best HVAC Contractor 2024', issuer: 'NYC Home Services Awards', year: 2024, description: 'Voted by 4,000+ homeowners across the five boroughs.' },
        { name: 'Angi Super Service Award', issuer: 'Angi', year: 2023, description: 'Top-rated service professional.' },
      ],
      projects: [
        { title: 'Manhattan Office Tower HVAC Retrofit', description: 'Complete retrofit of 18-floor commercial building. Replaced 24 rooftop units.', date: '2025-06-20', value: 285000, duration: '6 weeks' },
      ],
      team: [
        { name: 'Marcus Chen', role: 'Lead Technician', bio: '15 years experience, NATE-certified, specializes in commercial systems.' },
        { name: 'Sofia Rodriguez', role: 'Service Manager', bio: 'Manages all residential service calls and customer experience.' },
      ],
    },
    services: [
      { name: 'AC Installation', description: 'New air conditioner installation and setup', basePrice: 4500, duration: 360, category: 'Installation' },
      { name: 'AC Repair', description: 'Diagnosis and repair of AC systems', basePrice: 280, duration: 120, category: 'Repair' },
      { name: 'Furnace Service', description: 'Furnace install, repair, and maintenance', basePrice: 3200, duration: 300, category: 'Heating' },
      { name: 'Heat Pump Installation', description: 'Heat pump installation and service', basePrice: 5000, duration: 360, category: 'Heating' },
      { name: 'Duct Cleaning', description: 'Air duct cleaning and sanitization', basePrice: 350, duration: 180, category: 'Maintenance' },
      { name: 'Emergency HVAC Service', description: '24/7 emergency heating and cooling repairs', basePrice: 450, duration: 120, category: 'Emergency' },
    ],
    reviews: [
      { authorName: 'Jennifer Park', rating: 5, comment: 'Came out at 11pm when our AC died in a heatwave. Life savers!', source: 'internal', npsScore: 10 },
      { authorName: 'David Kim', rating: 5, comment: 'Installed our new system on time and on budget. Highly recommend.', source: 'internal', npsScore: 9 },
      { authorName: 'Linda Martinez', rating: 4, comment: 'Good service, slightly pricey but worth it for the quality.', source: 'internal', npsScore: 8 },
      { authorName: 'Robert Johnson', rating: 5, comment: 'Professional, on-time, clean work. Will use again.', source: 'internal', npsScore: 10 },
      { authorName: 'Aisha Williams', rating: 5, comment: 'Best HVAC company in NYC. Their tech knew exactly what was wrong.', source: 'internal', npsScore: 10 },
      { authorName: 'Thomas Brown', rating: 4, comment: 'Solid maintenance plan, fair pricing.', source: 'internal', npsScore: 8 },
      { authorName: 'Maria Garcia', rating: 5, comment: 'Emergency service on a Sunday and they still came in 45 minutes.', source: 'internal', npsScore: 10 },
      { authorName: 'Kevin O\'Brien', rating: 5, comment: 'Replaced our 20-year-old furnace. The team was fantastic.', source: 'internal', npsScore: 9 },
      { authorName: 'Priya Patel', rating: 5, comment: 'Honest assessment, did not try to upsell us.', source: 'internal', npsScore: 10 },
      { authorName: 'James Wilson', rating: 4, comment: 'Good commercial HVAC service for our restaurant.', source: 'internal', npsScore: 8 },
    ],
    featured: { type: 'featured', priority: 10 },
  },

  // ── 2. Plumbing ──────────────────────────────────────────────────────
  {
    slug: 'elite-plumbing-pros',
    name: 'Elite Plumbing Pros',
    industry: 'plumbing',
    tagline: 'Licensed plumbers for residential & commercial needs',
    description:
      'Elite Plumbing Pros is a family-owned plumbing company serving the Chicago metropolitan area since 2008. From a dripping faucet to a full bathroom remodel, our master plumbers handle it all. We pride ourselves on clean workmanship, transparent pricing, and showing up on time. Every job is backed by our 100% satisfaction guarantee.',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    currency: 'USD',
    phone: '+1-312-555-0198',
    email: 'owner@eliteplumbing.com',
    coverImage: COVER.plumbing,
    gallery: [
      GALLERY_ITEM(COVER.plumbing, 'Bathroom plumbing installation'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&h=400&fit=crop', 'Kitchen sink repair'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', 'Water heater install'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Chicago', 'Evanston', 'Oak Park', 'Naperville', 'Schaumburg'],
    faqs: [
      { question: 'Do you offer emergency plumbing?', answer: 'Yes, 24/7 emergency service for burst pipes, leaks, and sewer backups.' },
      { question: 'Are you licensed and insured?', answer: 'Yes, fully licensed in Illinois and carry $2M liability insurance.' },
      { question: 'Do you offer warranties?', answer: 'All workmanship is guaranteed for 1 year. Manufacturer warranties apply to parts.' },
    ],
    languages: ['en', 'pl'],
    pricingType: 'fixed',
    callOutFee: 75,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 35,
    vatNumber: 'US-EIN-36-9876543',
    licenceNumber: 'IL-PLUMB-055-228841',
    insuranceProvider: 'Travelers',
    insurancePolicyNumber: 'TR-PLUMB-2024-55412',
    employeesCount: 9,
    certifications: [
      { name: 'Illinois Master Plumber License', issuer: 'Illinois Department of Public Health', verified: true },
      { name: 'Backflow Prevention Certified', issuer: 'ABPA', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Lincoln Park Bathroom Remodel', description: 'Complete re-pipe and fixture install for a master bathroom.', date: '2025-08-12', category: 'Remodel' },
        { title: 'Gold Coast Sewer Line Replacement', description: 'Trenchless sewer line replacement, 80 feet.', date: '2025-10-05', category: 'Sewer' },
      ],
      awards: [
        { name: 'Chicago Best Plumbers 2024', issuer: 'Chicago Magazine', year: 2024, description: 'Top-rated plumbing service.' },
      ],
      projects: [
        { title: 'Naperville Apartment Complex Repipe', description: 'Full copper repipe of 24-unit building.', date: '2025-04-18', value: 84000, duration: '3 weeks' },
      ],
      team: [
        { name: 'Mike Thompson', role: 'Master Plumber', bio: '20 years experience, specializes in residential remodels.' },
        { name: 'Anna Kowalski', role: 'Apprentice', bio: 'Second-year apprentice, excellent with customers.' },
      ],
    },
    services: [
      { name: 'Drain Cleaning', description: 'Professional drain snaking and hydro-jetting', basePrice: 180, duration: 90, category: 'Drain' },
      { name: 'Water Heater Installation', description: 'Tank and tankless water heater install', basePrice: 1800, duration: 240, category: 'Installation' },
      { name: 'Leak Detection & Repair', description: 'Find and fix hidden leaks', basePrice: 250, duration: 120, category: 'Repair' },
      { name: 'Toilet Repair & Install', description: 'Toilet replacement and repair', basePrice: 220, duration: 90, category: 'Fixture' },
      { name: 'Faucet & Sink Repair', description: 'Kitchen and bathroom faucet repair', basePrice: 150, duration: 60, category: 'Fixture' },
      { name: 'Emergency Plumbing', description: '24/7 burst pipe and leak emergency service', basePrice: 350, duration: 120, category: 'Emergency' },
    ],
    reviews: [
      { authorName: 'Sarah Mitchell', rating: 5, comment: 'Fixed a midnight burst pipe in 30 minutes. Lifesavers!', source: 'internal', npsScore: 10 },
      { authorName: 'Carlos Rivera', rating: 5, comment: 'Honest, fair pricing, no upselling.', source: 'internal', npsScore: 9 },
      { authorName: 'Emma Davis', rating: 4, comment: 'Great work, slight delay in arrival.', source: 'internal', npsScore: 7 },
      { authorName: 'Frank Liu', rating: 5, comment: 'Replaced our water heater same day.', source: 'internal', npsScore: 10 },
      { authorName: 'Patricia Brown', rating: 5, comment: 'Clean, professional, respectful of our home.', source: 'internal', npsScore: 10 },
      { authorName: 'Daniel Lee', rating: 5, comment: 'Bathroom remodel came out beautiful.', source: 'internal', npsScore: 10 },
      { authorName: 'Rebecca Cohen', rating: 4, comment: 'Good value for the quality.', source: 'internal', npsScore: 8 },
      { authorName: 'Anthony Russo', rating: 5, comment: 'Best plumbers in Chicago, hands down.', source: 'internal', npsScore: 10 },
    ],
    featured: { type: 'featured', priority: 8 },
  },

  // ── 3. Electrical ────────────────────────────────────────────────────
  {
    slug: 'bright-spark-electric',
    name: 'Bright Spark Electric',
    industry: 'electrical',
    tagline: 'Licensed electricians for home & business',
    description:
      'Bright Spark Electric delivers safe, code-compliant electrical services across Los Angeles. From EV charger installations to panel upgrades and lighting design, our master electricians handle projects of any size. We are Tesla certified and offer same-day service for most calls. Every installation is inspected and permitted.',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    currency: 'USD',
    phone: '+1-310-555-0177',
    email: 'owner@brightsparkelectric.com',
    coverImage: COVER.electrical,
    gallery: [
      GALLERY_ITEM(COVER.electrical, 'Electrical panel upgrade'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1621905251189-08b45d6a3b2f?w=600&h=400&fit=crop', 'EV charger install'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=400&fit=crop', 'Recessed lighting'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Los Angeles', 'Santa Monica', 'Pasadena', 'Glendale', 'Burbank'],
    faqs: [
      { question: 'Are you licensed?', answer: 'Yes, California C-10 electrical contractor license #1024783.' },
      { question: 'Do you install EV chargers?', answer: 'Yes, we are Tesla certified and install all major EV charger brands.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'hourly',
    callOutFee: 125,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 50,
    vatNumber: 'US-EIN-91-4567890',
    licenceNumber: 'CA-C10-1024783',
    insuranceProvider: 'Farmers',
    insurancePolicyNumber: 'FM-ELEC-2024-88741',
    employeesCount: 11,
    certifications: [
      { name: 'Tesla Certified Installer', issuer: 'Tesla Inc.', verified: true },
      { name: 'California C-10 Contractor', issuer: 'CSLB', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Beverly Hills Smart Home', description: 'Full smart home electrical integration.', date: '2025-07-22', category: 'Smart Home' },
        { title: 'Santa Monica Office Buildout', description: 'Complete electrical for 5,000 sq ft office.', date: '2025-09-10', category: 'Commercial' },
      ],
      awards: [
        { name: 'LA Top Electricians 2024', issuer: 'LA Times', year: 2024, description: 'Recognized for safety and quality.' },
      ],
      projects: [
        { title: 'Pasadena EV Charging Station', description: 'Installed 12 commercial EV chargers for apartment complex.', date: '2025-05-14', value: 96000, duration: '4 weeks' },
      ],
      team: [
        { name: 'Alex Nguyen', role: 'Master Electrician', bio: '12 years experience, Tesla certified.' },
        { name: 'Jordan Smith', role: 'Journeyman', bio: 'Specializes in residential panel upgrades.' },
      ],
    },
    services: [
      { name: 'Panel Upgrade', description: 'Electrical panel replacement and upgrade', basePrice: 2200, duration: 300, category: 'Panel' },
      { name: 'EV Charger Installation', description: 'Home and commercial EV charger install', basePrice: 1200, duration: 240, category: 'Installation' },
      { name: 'Residential Wiring', description: 'Home wiring, outlets, and lighting', basePrice: 180, duration: 120, category: 'Residential' },
      { name: 'Lighting Installation', description: 'Indoor and outdoor lighting design and install', basePrice: 350, duration: 180, category: 'Lighting' },
      { name: 'Emergency Electrical', description: '24/7 emergency electrical repairs', basePrice: 295, duration: 120, category: 'Emergency' },
    ],
    reviews: [
      { authorName: 'Olivia Martinez', rating: 5, comment: 'Installed our Tesla charger in 4 hours. Perfect work.', source: 'internal', npsScore: 10 },
      { authorName: 'William Chen', rating: 5, comment: 'Upgraded our 1960s panel to 200 amp. Clean install.', source: 'internal', npsScore: 10 },
      { authorName: 'Hannah Lee', rating: 4, comment: 'Good work, fair price.', source: 'internal', npsScore: 8 },
      { authorName: 'Marcus Johnson', rating: 5, comment: 'Best electrician we have used in LA.', source: 'internal', npsScore: 10 },
      { authorName: 'Sofia Hernandez', rating: 5, comment: 'Recessed lighting throughout the house. Looks amazing.', source: 'internal', npsScore: 9 },
      { authorName: 'Brian Taylor', rating: 5, comment: 'Smart home install was seamless.', source: 'internal', npsScore: 10 },
      { authorName: 'Nina Patel', rating: 4, comment: 'Professional and on time.', source: 'internal', npsScore: 8 },
      { authorName: 'Greg Sanders', rating: 5, comment: 'Commercial buildout was top notch.', source: 'internal', npsScore: 9 },
    ],
  },

  // ── 4. Cleaning ──────────────────────────────────────────────────────
  {
    slug: 'fresh-start-cleaning',
    name: 'Fresh Start Cleaning Co',
    industry: 'cleaning',
    tagline: 'Eco-friendly cleaning for homes & offices',
    description:
      'Fresh Start Cleaning Co has been keeping Houston spotless since 2015. We use only eco-friendly, pet-safe products and bring our own equipment. Our vetted, background-checked team handles recurring home cleaning, move-in/move-out, post-construction, and commercial spaces. 100% satisfaction guarantee on every visit.',
    city: 'Houston',
    state: 'TX',
    country: 'US',
    currency: 'USD',
    phone: '+1-713-555-0233',
    email: 'owner@freshstartcleaning.com',
    coverImage: COVER.cleaning,
    gallery: [
      GALLERY_ITEM(COVER.cleaning, 'Kitchen deep clean'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop', 'Living room cleaning'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&h=400&fit=crop', 'Office cleaning'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Houston', 'Sugar Land', 'The Woodlands', 'Katy', 'Pearland'],
    faqs: [
      { question: 'Do you bring your own supplies?', answer: 'Yes, we bring all eco-friendly cleaning products and equipment.' },
      { question: 'Are your products pet-safe?', answer: 'Yes, all our products are non-toxic and pet-safe.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 0,
    emergencyServiceAvailable: false,
    emergencySurchargePct: 0,
    vatNumber: 'US-EIN-76-1122334',
    licenceNumber: 'TX-CL-2024-9981',
    insuranceProvider: 'Geico',
    insurancePolicyNumber: 'GK-CLN-2024-22331',
    employeesCount: 22,
    certifications: [
      { name: 'Green Seal Certified', issuer: 'Green Seal', verified: true },
      { name: 'IICRC Certified Firm', issuer: 'IICRC', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'River Oaks Estate Deep Clean', description: '8,000 sq ft home post-renovation deep clean.', date: '2025-08-30', category: 'Residential' },
      ],
      awards: [
        { name: 'Houston Best Cleaners 2024', issuer: 'Houston Chronicle', year: 2024, description: 'Reader\'s choice award.' },
      ],
      projects: [
        { title: 'Downtown Office Tower Maintenance', description: 'Nightly cleaning for 50,000 sq ft office.', date: '2025-03-01', value: 42000, duration: 'Ongoing' },
      ],
      team: [
        { name: 'Lucia Ramirez', role: 'Operations Manager', bio: 'Manages 22 cleaners across Houston.' },
      ],
    },
    services: [
      { name: 'Residential Cleaning', description: 'Recurring or one-time home cleaning', basePrice: 120, duration: 150, category: 'Residential' },
      { name: 'Commercial Cleaning', description: 'Offices, retail, and commercial spaces', basePrice: 250, duration: 180, category: 'Commercial' },
      { name: 'Move In/Out Cleaning', description: 'Deep clean for property turnover', basePrice: 280, duration: 240, category: 'Specialty' },
      { name: 'Carpet Cleaning', description: 'Deep cleaning and stain removal', basePrice: 180, duration: 120, category: 'Specialty' },
      { name: 'Window Cleaning', description: 'Interior and exterior window cleaning', basePrice: 150, duration: 120, category: 'Specialty' },
    ],
    reviews: [
      { authorName: 'Brittany Adams', rating: 5, comment: 'Best cleaning service we have ever used. House sparkles!', source: 'internal', npsScore: 10 },
      { authorName: 'Michael Foster', rating: 5, comment: 'On time, thorough, and pet-friendly products.', source: 'internal', npsScore: 10 },
      { authorName: 'Christine Lee', rating: 4, comment: 'Great cleaning, would recommend.', source: 'internal', npsScore: 8 },
      { authorName: 'Raj Mehta', rating: 5, comment: 'Move-out clean got us our full deposit back.', source: 'internal', npsScore: 10 },
      { authorName: 'Tiffany Wang', rating: 5, comment: 'Recurring service for 2 years. Always excellent.', source: 'internal', npsScore: 10 },
      { authorName: 'Derek Hughes', rating: 5, comment: 'Office cleaning has been flawless.', source: 'internal', npsScore: 9 },
      { authorName: 'Vanessa Cruz', rating: 4, comment: 'Good service, fair pricing.', source: 'internal', npsScore: 8 },
      { authorName: 'Owen Wright', rating: 5, comment: 'Carpet cleaning removed stains I thought were permanent.', source: 'internal', npsScore: 10 },
    ],
  },

  // ── 5. Landscaping ───────────────────────────────────────────────────
  {
    slug: 'green-thumb-landscaping',
    name: 'Green Thumb Landscaping',
    industry: 'landscaping',
    tagline: 'Beautiful outdoor spaces, year-round',
    description:
      'Green Thumb Landscaping designs, installs, and maintains stunning outdoor spaces across Phoenix. From desert-friendly xeriscaping to lush lawns and hardscaping, our team brings 18 years of experience to every project. We specialize in drought-tolerant designs and smart irrigation systems that save water and money.',
    city: 'Phoenix',
    state: 'AZ',
    country: 'US',
    currency: 'USD',
    phone: '+1-602-555-0166',
    email: 'owner@greenthumblawns.com',
    coverImage: COVER.landscaping,
    gallery: [
      GALLERY_ITEM(COVER.landscaping, 'Desert landscape design'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=400&fit=crop', 'Hardscaping project'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=600&h=400&fit=crop', 'Lawn maintenance'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Glendale'],
    faqs: [
      { question: 'Do you offer xeriscaping?', answer: 'Yes, we specialize in drought-tolerant desert landscaping.' },
      { question: 'Do you offer recurring maintenance?', answer: 'Yes, weekly, bi-weekly, and monthly plans available.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 50,
    emergencyServiceAvailable: false,
    emergencySurchargePct: 0,
    vatNumber: 'US-EIN-86-5566778',
    licenceNumber: 'AZ-LSC-2024-4471',
    insuranceProvider: 'State Farm',
    insurancePolicyNumber: 'SF-LSC-2024-66521',
    employeesCount: 16,
    certifications: [
      { name: 'Certified Landscape Professional', issuer: 'NALP', verified: true },
      { name: 'Arizona Certified Nursery Professional', issuer: 'AZNLA', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Scottsdale Xeriscape', description: 'Complete front yard desert transformation.', date: '2025-09-05', category: 'Xeriscape' },
      ],
      awards: [
        { name: 'Phoenix Best Landscaper 2024', issuer: 'Phoenix Magazine', year: 2024, description: 'Top-rated landscape design.' },
      ],
      projects: [
        { title: 'Paradise Valley Estate Landscape', description: '2-acre luxury estate with pool, hardscape, and lighting.', date: '2025-04-22', value: 180000, duration: '8 weeks' },
      ],
      team: [
        { name: 'Carlos Mendez', role: 'Lead Designer', bio: '18 years experience, certified landscape architect.' },
      ],
    },
    services: [
      { name: 'Lawn Care', description: 'Mowing, edging, fertilization, weed control', basePrice: 60, duration: 60, category: 'Recurring' },
      { name: 'Landscape Design', description: 'Garden design, planting, hardscaping', basePrice: 2500, duration: 480, category: 'Project' },
      { name: 'Tree Service', description: 'Tree trimming, removal, and health assessment', basePrice: 750, duration: 240, category: 'Tree' },
      { name: 'Irrigation Installation', description: 'Sprinkler install, repair, and winterization', basePrice: 450, duration: 180, category: 'System' },
      { name: 'Garden Maintenance', description: 'Weeding, pruning, mulching, seasonal cleanup', basePrice: 90, duration: 120, category: 'Recurring' },
    ],
    reviews: [
      { authorName: 'Karen Mitchell', rating: 5, comment: 'Our desert landscape is stunning. Low water, high curb appeal.', source: 'internal', npsScore: 10 },
      { authorName: 'Steve Park', rating: 5, comment: 'Reliable weekly lawn service.', source: 'internal', npsScore: 9 },
      { authorName: 'Diana Lopez', rating: 4, comment: 'Good design work, fair pricing.', source: 'internal', npsScore: 8 },
      { authorName: 'Robert Kim', rating: 5, comment: 'Removed a huge eucalyptus safely.', source: 'internal', npsScore: 10 },
      { authorName: 'Helen Brooks', rating: 5, comment: 'Irrigation install saved us 30% on water.', source: 'internal', npsScore: 10 },
      { authorName: 'Tim Reynolds', rating: 5, comment: 'Best landscaper in Phoenix.', source: 'internal', npsScore: 10 },
      { authorName: 'Yuki Tanaka', rating: 4, comment: 'Great maintenance crew.', source: 'internal', npsScore: 8 },
    ],
  },

  // ── 6. Pest Control ──────────────────────────────────────────────────
  {
    slug: 'shield-pest-control',
    name: 'Shield Pest Control',
    industry: 'pest-control',
    tagline: 'Family-safe pest solutions, guaranteed',
    description:
      'Shield Pest Control protects Miami homes and businesses from pests using integrated pest management (IPM) techniques. Our treatments are safe for kids, pets, and the environment. We handle termites, roaches, rodents, mosquitoes, and more. Annual contracts include quarterly treatments and free emergency call-backs.',
    city: 'Miami',
    state: 'FL',
    country: 'US',
    currency: 'USD',
    phone: '+1-305-555-0124',
    email: 'owner@shieldpest.com',
    coverImage: COVER.pest,
    gallery: [
      GALLERY_ITEM(COVER.pest, 'Pest control treatment'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1584395636220-2e3e3e3e3e3e?w=600&h=400&fit=crop', 'Termite inspection'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Miami', 'Fort Lauderdale', 'Hialeah', 'Coral Gables', 'Doral'],
    faqs: [
      { question: 'Are treatments safe for pets?', answer: 'Yes, all our products are pet and child safe when dry (usually 1 hour).' },
      { question: 'Do you offer termite bonds?', answer: 'Yes, annual termite contracts with $1M damage coverage.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 0,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 25,
    vatNumber: 'US-EIN-59-9988776',
    licenceNumber: 'FL-PC-2024-55821',
    insuranceProvider: 'Progressive',
    insurancePolicyNumber: 'PG-PC-2024-11442',
    employeesCount: 8,
    certifications: [
      { name: 'Florida Certified Pest Control Operator', issuer: 'FDACS', verified: true },
      { name: 'Termidor Certified', issuer: 'BASF', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Coral Gables Termite Treatment', description: 'Sentricon colony elimination system install.', date: '2025-07-18', category: 'Termite' },
      ],
      awards: [
        { name: 'Miami Best Pest Control 2024', issuer: 'Miami Herald', year: 2024, description: 'Reader\'s choice.' },
      ],
      projects: [
        { title: 'Doral Apartment Complex', description: 'Quarterly pest control for 120-unit building.', date: '2025-02-01', value: 28800, duration: 'Ongoing' },
      ],
      team: [
        { name: 'Miguel Santos', role: 'Lead Technician', bio: '12 years experience, FDACS certified.' },
      ],
    },
    services: [
      { name: 'General Pest Control', description: 'Roaches, ants, spiders, and general pests', basePrice: 150, duration: 90, category: 'Quarterly' },
      { name: 'Termite Treatment', description: 'Termite inspection, treatment, and bonds', basePrice: 650, duration: 180, category: 'Termite' },
      { name: 'Rodent Control', description: 'Mice and rat extermination and exclusion', basePrice: 280, duration: 120, category: 'Rodent' },
      { name: 'Mosquito Control', description: 'Monthly mosquito treatment', basePrice: 95, duration: 60, category: 'Mosquito' },
      { name: 'Bed Bug Treatment', description: 'Heat treatment for bed bugs', basePrice: 850, duration: 300, category: 'Bed Bugs' },
    ],
    reviews: [
      { authorName: 'Amanda Reyes', rating: 5, comment: 'No more roaches! Quarterly service is worth every penny.', source: 'internal', npsScore: 10 },
      { authorName: 'David Stern', rating: 5, comment: 'Termite bond gave us peace of mind.', source: 'internal', npsScore: 9 },
      { authorName: 'Lucia Fernandez', rating: 4, comment: 'Good service, friendly tech.', source: 'internal', npsScore: 8 },
      { authorName: 'James O\'Neill', rating: 5, comment: 'Mosquito treatment let us use our patio again.', source: 'internal', npsScore: 10 },
      { authorName: 'Sophia Chen', rating: 5, comment: 'Pet-safe products were important to us.', source: 'internal', npsScore: 10 },
      { authorName: 'Marcus Lee', rating: 5, comment: 'Bed bug heat treatment worked in one visit.', source: 'internal', npsScore: 10 },
    ],
  },

  // ── 7. Roofing ───────────────────────────────────────────────────────
  {
    slug: 'summit-roofing-co',
    name: 'Summit Roofing Co',
    industry: 'roofing',
    tagline: 'Roof repairs & replacements, done right',
    description:
      'Summit Roofing Co has installed and repaired thousands of roofs across Denver since 2010. We handle asphalt shingle, metal, tile, and flat roofs. GAF Master Elite certified with the Golden Pledge warranty. Free inspections, honest assessments, and we work directly with your insurance on storm claims.',
    city: 'Denver',
    state: 'CO',
    country: 'US',
    currency: 'USD',
    phone: '+1-303-555-0188',
    email: 'owner@summitroofing.com',
    coverImage: COVER.roofing,
    gallery: [
      GALLERY_ITEM(COVER.roofing, 'Asphalt shingle installation'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1632759145355-8b8f3e3e3e3e?w=600&h=400&fit=crop', 'Metal roof install'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Denver', 'Aurora', 'Lakewood', 'Boulder', 'Castle Rock'],
    faqs: [
      { question: 'Do you work with insurance?', answer: 'Yes, we handle the entire insurance claim process for storm damage.' },
      { question: 'What warranties do you offer?', answer: 'GAF Golden Pledge 25-year warranty on materials and labor.' },
    ],
    languages: ['en'],
    pricingType: 'custom_quote',
    callOutFee: 0,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 30,
    vatNumber: 'US-EIN-84-7788990',
    licenceNumber: 'CO-RF-2024-3312',
    insuranceProvider: 'Allstate',
    insurancePolicyNumber: 'AL-RF-2024-77410',
    employeesCount: 18,
    certifications: [
      { name: 'GAF Master Elite', issuer: 'GAF', verified: true },
      { name: 'HAAG Certified Inspector', issuer: 'Haag Engineering', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Cherry Creek Roof Replacement', description: '35-square architectural shingle replacement.', date: '2025-08-22', category: 'Residential' },
      ],
      awards: [
        { name: 'Denver Best Roofer 2024', issuer: 'Denver Post', year: 2024, description: 'Top-rated roofing contractor.' },
      ],
      projects: [
        { title: 'Boulder Hail Storm Response', description: '45 roof replacements in 60 days after major hail storm.', date: '2025-06-15', value: 675000, duration: '8 weeks' },
      ],
      team: [
        { name: 'Tyler Brooks', role: 'Lead Foreman', bio: '15 years roofing experience, GAF certified.' },
      ],
    },
    services: [
      { name: 'Roof Inspection', description: 'Comprehensive roof inspection and report', basePrice: 0, duration: 60, category: 'Inspection' },
      { name: 'Roof Repair', description: 'Leak repair, shingle replacement, flashing', basePrice: 450, duration: 180, category: 'Repair' },
      { name: 'Roof Replacement', description: 'Full roof tear-off and replacement', basePrice: 9500, duration: 480, category: 'Replacement' },
      { name: 'Storm Damage Repair', description: 'Hail and wind damage repair, insurance help', basePrice: 650, duration: 240, category: 'Storm' },
      { name: 'Gutter Installation', description: 'Seamless gutter install and repair', basePrice: 850, duration: 240, category: 'Gutters' },
    ],
    reviews: [
      { authorName: 'Patricia Stone', rating: 5, comment: 'New roof looks amazing. Crew was fast and clean.', source: 'internal', npsScore: 10 },
      { authorName: 'Kevin Walsh', rating: 5, comment: 'Insurance claim handled perfectly. Zero stress.', source: 'internal', npsScore: 10 },
      { authorName: 'Diana Pierce', rating: 5, comment: 'Honest inspection, did not try to upsell.', source: 'internal', npsScore: 9 },
      { authorName: 'Raj Patel', rating: 4, comment: 'Good work, slightly behind schedule.', source: 'internal', npsScore: 7 },
      { authorName: 'Linda Carter', rating: 5, comment: 'Storm damage repair was seamless.', source: 'internal', npsScore: 10 },
      { authorName: 'Mark Davis', rating: 5, comment: 'Best roofing company in Denver.', source: 'internal', npsScore: 10 },
      { authorName: 'Cynthia Lee', rating: 5, comment: 'GAF Golden Pledge warranty gave us confidence.', source: 'internal', npsScore: 9 },
    ],
    featured: { type: 'sponsored', priority: 5 },
  },

  // ── 8. Painting ──────────────────────────────────────────────────────
  {
    slug: 'premier-painting-services',
    name: 'Premier Painting Services',
    industry: 'painting',
    tagline: 'Interior & exterior painting experts',
    description:
      'Premier Painting Services transforms homes and businesses across Seattle with quality craftsmanship. We use premium low-VOC paints, protect your floors and furniture, and clean up thoroughly. Free color consultations. 5-year warranty on exterior, 3-year on interior. From single rooms to whole homes and commercial spaces.',
    city: 'Seattle',
    state: 'WA',
    country: 'US',
    currency: 'USD',
    phone: '+1-206-555-0145',
    email: 'owner@premierpainting.com',
    coverImage: COVER.painting,
    gallery: [
      GALLERY_ITEM(COVER.painting, 'Interior painting'),
      GALLERY_ITEM('https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop', 'Exterior painting'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Tacoma'],
    faqs: [
      { question: 'Do you use low-VOC paint?', answer: 'Yes, we use premium low-VOC paints by default at no extra charge.' },
      { question: 'Do you offer color consultations?', answer: 'Yes, free color consultation with every project over $1,000.' },
    ],
    languages: ['en'],
    pricingType: 'fixed',
    callOutFee: 0,
    emergencyServiceAvailable: false,
    emergencySurchargePct: 0,
    vatNumber: 'US-EIN-91-3322110',
    licenceNumber: 'WA-PT-2024-8891',
    insuranceProvider: 'Geico',
    insurancePolicyNumber: 'GK-PT-2024-33021',
    employeesCount: 12,
    certifications: [
      { name: 'PDCA Member', issuer: 'Painting and Decorators Contractors of America', verified: true },
      { name: 'Lead-Safe Certified', issuer: 'EPA', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Capitol Hill Victorian', description: 'Restored 1905 Victorian interior, 12 rooms.', date: '2025-09-01', category: 'Interior' },
      ],
      awards: [
        { name: 'Seattle Best Painter 2024', issuer: 'Seattle Met', year: 2024, description: 'Top painter.' },
      ],
      projects: [
        { title: 'Bellevue Office Park', description: 'Exterior repaint of 4-building office park.', date: '2025-05-20', value: 145000, duration: '5 weeks' },
      ],
      team: [
        { name: 'Brett Larson', role: 'Lead Painter', bio: '15 years experience, color specialist.' },
      ],
    },
    services: [
      { name: 'Interior Painting', description: 'Walls, ceilings, trim, and cabinets', basePrice: 450, duration: 240, category: 'Interior' },
      { name: 'Exterior Painting', description: 'Siding, stucco, and trim painting', basePrice: 2800, duration: 480, category: 'Exterior' },
      { name: 'Cabinet Painting', description: 'Kitchen and bathroom cabinet refinishing', basePrice: 1200, duration: 360, category: 'Specialty' },
      { name: 'Drywall Repair', description: 'Patch, texture, and prep walls', basePrice: 250, duration: 180, category: 'Repair' },
      { name: 'Color Consultation', description: 'Professional color design consultation', basePrice: 0, duration: 60, category: 'Consultation' },
    ],
    reviews: [
      { authorName: 'Megan Sullivan', rating: 5, comment: 'Living room looks brand new. Clean work.', source: 'internal', npsScore: 10 },
      { authorName: 'Brian Hughes', rating: 5, comment: 'Exterior paint job has held up perfectly.', source: 'internal', npsScore: 9 },
      { authorName: 'Vicky Chen', rating: 4, comment: 'Good painters, finished on time.', source: 'internal', npsScore: 8 },
      { authorName: 'Aaron Goldstein', rating: 5, comment: 'Cabinet refinishing saved us from replacing.', source: 'internal', npsScore: 10 },
      { authorName: 'Nicole Adams', rating: 5, comment: 'Color consultation was incredibly helpful.', source: 'internal', npsScore: 10 },
      { authorName: 'Victor Romero', rating: 5, comment: 'Best painters in Seattle.', source: 'internal', npsScore: 9 },
    ],
  },

  // ── 9. Locksmith ─────────────────────────────────────────────────────
  {
    slug: 'rapid-lockout-rescue',
    name: 'Rapid Lockout Rescue',
    industry: 'locksmith',
    tagline: '24/7 emergency locksmith service',
    description:
      'Rapid Lockout Rescue is Atlanta\'s fastest 24/7 mobile locksmith. Locked out of your car, home, or business? We arrive in 20 minutes or less. We also handle lock changes, rekeying, smart lock installation, and commercial access control. Licensed, bonded, and insured. Upfront pricing, no surprises.',
    city: 'Atlanta',
    state: 'GA',
    country: 'US',
    currency: 'USD',
    phone: '+1-404-555-0199',
    email: 'owner@rapidlockout.com',
    coverImage: COVER.locksmith,
    gallery: [
      GALLERY_ITEM(COVER.locksmith, 'Mobile locksmith van'),
    ],
    businessHours: {
      mon: { open: '00:00', close: '23:59' },
      tue: { open: '00:00', close: '23:59' },
      wed: { open: '00:00', close: '23:59' },
      thu: { open: '00:00', close: '23:59' },
      fri: { open: '00:00', close: '23:59' },
      sat: { open: '00:00', close: '23:59' },
      sun: { open: '00:00', close: '23:59' },
    },
    serviceAreas: ['Atlanta', 'Sandy Springs', 'Marietta', 'Roswell', 'Decatur'],
    faqs: [
      { question: 'How fast can you arrive?', answer: '20 minutes or less within our service area, 24/7.' },
      { question: 'Can you make smart keys?', answer: 'Yes, we program transponder keys and install smart locks.' },
    ],
    languages: ['en'],
    pricingType: 'fixed',
    callOutFee: 35,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 50,
    vatNumber: 'US-EIN-62-5544332',
    licenceNumber: 'GA-LK-2024-1198',
    insuranceProvider: 'State Farm',
    insurancePolicyNumber: 'SF-LK-2024-99201',
    employeesCount: 6,
    certifications: [
      { name: 'Associated Locksmiths of America', issuer: 'ALOA', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Midtown Office Rekey', description: 'Rekeyed 30 doors after tenant change.', date: '2025-10-12', category: 'Commercial' },
      ],
      awards: [
        { name: 'Atlanta Best Locksmith 2024', issuer: 'Atlanta Journal', year: 2024, description: 'Fastest response time.' },
      ],
      projects: [
        { title: 'Buckhead Hotel Access Control', description: 'Key card system install for 120-room hotel.', date: '2025-03-15', value: 38000, duration: '2 weeks' },
      ],
      team: [
        { name: 'Derek Morgan', role: 'Lead Locksmith', bio: '10 years, ALOA certified.' },
      ],
    },
    services: [
      { name: 'Car Lockout', description: 'Emergency vehicle unlock', basePrice: 95, duration: 30, category: 'Emergency' },
      { name: 'Home Lockout', description: 'Emergency house unlock', basePrice: 85, duration: 30, category: 'Emergency' },
      { name: 'Lock Change', description: 'Residential lock replacement', basePrice: 120, duration: 60, category: 'Residential' },
      { name: 'Rekey Service', description: 'Rekey existing locks', basePrice: 75, duration: 45, category: 'Residential' },
      { name: 'Smart Lock Install', description: 'Smart lock installation and setup', basePrice: 180, duration: 90, category: 'Smart Home' },
      { name: 'Commercial Access Control', description: 'Key card and fob systems', basePrice: 850, duration: 240, category: 'Commercial' },
    ],
    reviews: [
      { authorName: 'Jessica Brown', rating: 5, comment: 'Locked out at 2am, they came in 15 minutes!', source: 'internal', npsScore: 10 },
      { authorName: 'Marcus Williams', rating: 5, comment: 'Rekeyed our whole house after move-in.', source: 'internal', npsScore: 9 },
      { authorName: 'Tina Davis', rating: 5, comment: 'Smart lock install was quick and clean.', source: 'internal', npsScore: 10 },
      { authorName: 'Roberto Garcia', rating: 4, comment: 'Fast service, fair price.', source: 'internal', npsScore: 8 },
      { authorName: 'Hannah Lee', rating: 5, comment: 'Saved me from a car lockout nightmare.', source: 'internal', npsScore: 10 },
      { authorName: 'Andre Johnson', rating: 5, comment: 'Best locksmith in Atlanta.', source: 'internal', npsScore: 10 },
    ],
  },

  // ── 10. Appliance Repair ─────────────────────────────────────────────
  {
    slug: 'appliance-md',
    name: 'Appliance MD',
    industry: 'appliance-repair',
    tagline: 'Same-day appliance repair, all brands',
    description:
      'Appliance MD repairs all major household appliances in Dallas — refrigerators, washers, dryers, ovens, dishwashers, and more. Same-day service available. Our techs carry common parts in their vans for first-visit fixes. We service Whirlpool, GE, Samsung, LG, Bosch, KitchenAid, and all other major brands. 90-day warranty on all repairs.',
    city: 'Dallas',
    state: 'TX',
    country: 'US',
    currency: 'USD',
    phone: '+1-214-555-0177',
    email: 'owner@applianceMD.com',
    coverImage: COVER.appliance,
    gallery: [
      GALLERY_ITEM(COVER.appliance, 'Refrigerator repair'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Dallas', 'Plano', 'Frisco', 'Garland', 'Irving'],
    faqs: [
      { question: 'Do you offer same-day service?', answer: 'Yes, call before noon for same-day service.' },
      { question: 'What brands do you service?', answer: 'All major brands including Whirlpool, GE, Samsung, LG, Bosch, and more.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 65,
    emergencyServiceAvailable: false,
    emergencySurchargePct: 0,
    vatNumber: 'US-EIN-87-4433221',
    licenceNumber: 'TX-AR-2024-7741',
    insuranceProvider: 'Farmers',
    insurancePolicyNumber: 'FM-AR-2024-55698',
    employeesCount: 7,
    certifications: [
      { name: 'Master Tech Certified', issuer: 'Professional Service Association', verified: true },
      { name: 'EPA 608 Universal', issuer: 'EPA', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Sub-Zero Refrigerator Repair', description: 'Compressor replacement on built-in Sub-Zero.', date: '2025-09-20', category: 'Refrigerator' },
      ],
      awards: [
        { name: 'Dallas Best Appliance Repair 2024', issuer: 'Dallas Observer', year: 2024, description: 'Top-rated.' },
      ],
      projects: [
        { title: 'Apartment Complex Laundry Maintenance', description: 'Monthly maintenance for 200-unit complex laundry.', date: '2025-01-01', value: 36000, duration: 'Ongoing' },
      ],
      team: [
        { name: 'Phil Anderson', role: 'Senior Tech', bio: '18 years, all-brand certified.' },
      ],
    },
    services: [
      { name: 'Refrigerator Repair', description: 'Cooling issues, leaks, ice makers', basePrice: 145, duration: 90, category: 'Refrigerator' },
      { name: 'Washer Repair', description: 'All washing machine brands', basePrice: 125, duration: 90, category: 'Laundry' },
      { name: 'Dryer Repair', description: 'No heat, tumbling issues, all brands', basePrice: 125, duration: 90, category: 'Laundry' },
      { name: 'Oven & Stove Repair', description: 'Gas and electric oven repair', basePrice: 135, duration: 90, category: 'Kitchen' },
      { name: 'Dishwasher Repair', description: 'All dishwasher brands and issues', basePrice: 115, duration: 90, category: 'Kitchen' },
    ],
    reviews: [
      { authorName: 'Sandra Hill', rating: 5, comment: 'Fixed our fridge same day. Saved all our food!', source: 'internal', npsScore: 10 },
      { authorName: 'Tony Nguyen', rating: 5, comment: 'Honest, did not try to sell us a new washer.', source: 'internal', npsScore: 10 },
      { authorName: 'Rebecca Stone', rating: 4, comment: 'Good repair, fair price.', source: 'internal', npsScore: 8 },
      { authorName: 'Hassan Ali', rating: 5, comment: 'Fixed dryer in one visit with parts on the truck.', source: 'internal', npsScore: 10 },
      { authorName: 'Gloria Martinez', rating: 5, comment: 'Best appliance repair in DFW.', source: 'internal', npsScore: 9 },
      { authorName: 'Edward Kim', rating: 5, comment: 'Oven works like new. 90-day warranty is great.', source: 'internal', npsScore: 10 },
    ],
  },

  // ── 11. Pool & Spa ───────────────────────────────────────────────────
  {
    slug: 'crystal-blue-pools',
    name: 'Crystal Blue Pools',
    industry: 'pool-spa',
    tagline: 'Pool cleaning, repair & maintenance',
    description:
      'Crystal Blue Pools keeps Las Vegas pools sparkling all year. We offer weekly cleaning, equipment repair, acid washing, and complete pool renovations. CPO certified technicians. We service residential and commercial pools, and our weekly plans include chemicals, brushing, and full cleaning. Free first-month chemical balance for new customers.',
    city: 'Las Vegas',
    state: 'NV',
    country: 'US',
    currency: 'USD',
    phone: '+1-702-555-0122',
    email: 'owner@crystalbluepools.com',
    coverImage: COVER.pool,
    gallery: [
      GALLERY_ITEM(COVER.pool, 'Pool cleaning service'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['Las Vegas', 'Henderson', 'North Las Vegas', 'Summerlin', 'Spring Valley'],
    faqs: [
      { question: 'Do you offer weekly service?', answer: 'Yes, weekly, bi-weekly, and monthly plans available.' },
      { question: 'Are chemicals included?', answer: 'Yes, all plans include chemicals and full service.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 0,
    emergencyServiceAvailable: false,
    emergencySurchargePct: 0,
    vatNumber: 'US-EIN-88-9988771',
    licenceNumber: 'NV-PC-2024-2204',
    insuranceProvider: 'State Farm',
    insurancePolicyNumber: 'SF-PC-2024-66310',
    employeesCount: 10,
    certifications: [
      { name: 'Certified Pool Operator', issuer: 'National Swimming Pool Foundation', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Summerlin Pool Renovation', description: 'Complete resurfacing and tile replacement.', date: '2025-08-10', category: 'Renovation' },
      ],
      awards: [
        { name: 'Las Vegas Best Pool Service 2024', issuer: 'Las Vegas Review-Journal', year: 2024, description: 'Reader\'s choice.' },
      ],
      projects: [
        { title: 'Henderson Hotel Pool Maintenance', description: 'Daily maintenance for resort pool.', date: '2025-01-15', value: 54000, duration: 'Ongoing' },
      ],
      team: [
        { name: 'Ricky Sanders', role: 'Lead Tech', bio: 'CPO certified, 14 years experience.' },
      ],
    },
    services: [
      { name: 'Weekly Pool Cleaning', description: 'Full weekly service including chemicals', basePrice: 145, duration: 60, category: 'Maintenance' },
      { name: 'Pool Equipment Repair', description: 'Pump, filter, and heater repair', basePrice: 195, duration: 120, category: 'Repair' },
      { name: 'Acid Wash', description: 'Acid wash to remove stains', basePrice: 450, duration: 240, category: 'Specialty' },
      { name: 'Pool Renovation', description: 'Complete pool resurfacing and remodeling', basePrice: 8500, duration: 480, category: 'Renovation' },
      { name: 'Green Pool Cleanup', description: 'Algae removal and chemical balance', basePrice: 350, duration: 180, category: 'Specialty' },
    ],
    reviews: [
      { authorName: 'Brittany Cox', rating: 5, comment: 'Pool is always crystal clear. Great weekly service.', source: 'internal', npsScore: 10 },
      { authorName: 'Marcus Lee', rating: 5, comment: 'Fixed our pump in one visit.', source: 'internal', npsScore: 9 },
      { authorName: 'Diana Romero', rating: 4, comment: 'Good service, reliable.', source: 'internal', npsScore: 8 },
      { authorName: 'Frank Wallace', rating: 5, comment: 'Pool renovation looks stunning.', source: 'internal', npsScore: 10 },
      { authorName: 'Yolanda Reyes', rating: 5, comment: 'Best pool service in Vegas.', source: 'internal', npsScore: 10 },
      { authorName: 'Steve Park', rating: 5, comment: 'Saved our green pool in 3 days.', source: 'internal', npsScore: 9 },
    ],
  },

  // ── 12. Automotive — sponsored ───────────────────────────────────────
  {
    slug: 'mobile-mechanic-pros',
    name: 'Mobile Mechanic Pros',
    industry: 'automotive',
    tagline: 'We come to you — auto repair at your location',
    description:
      'Mobile Mechanic Pros brings the shop to your driveway in San Diego. Our ASE-certified mechanics perform most repairs on-site — brakes, batteries, alternators, tune-ups, diagnostics, and more. Save the tow truck fee and the waiting room. We service all makes and models. 12-month/12,000-mile warranty on all repairs.',
    city: 'San Diego',
    state: 'CA',
    country: 'US',
    currency: 'USD',
    phone: '+1-619-555-0155',
    email: 'owner@mobilemechanicpros.com',
    coverImage: COVER.automotive,
    gallery: [
      GALLERY_ITEM(COVER.automotive, 'Mobile mechanic at work'),
    ],
    businessHours: STD_BUSINESS_HOURS,
    serviceAreas: ['San Diego', 'Chula Vista', 'Oceanside', 'Escondido', 'Carlsbad'],
    faqs: [
      { question: 'Do you come to my location?', answer: 'Yes, we perform most repairs at your home or office.' },
      { question: 'What is your warranty?', answer: '12-month/12,000-mile warranty on all repairs.' },
    ],
    languages: ['en', 'es'],
    pricingType: 'fixed',
    callOutFee: 45,
    emergencyServiceAvailable: true,
    emergencySurchargePct: 25,
    vatNumber: 'US-EIN-83-2211334',
    licenceNumber: 'CA-AR-2024-5571',
    insuranceProvider: 'Geico',
    insurancePolicyNumber: 'GK-AR-2024-88910',
    employeesCount: 8,
    certifications: [
      { name: 'ASE Certified Master Technician', issuer: 'ASE', verified: true },
    ],
    portfolio: {
      items: [
        { title: 'Tesla Brake Job', description: 'Brake pad and rotor replacement at customer\'s office.', date: '2025-09-15', category: 'Brakes' },
      ],
      awards: [
        { name: 'San Diego Best Mobile Mechanic 2024', issuer: 'San Diego Magazine', year: 2024, description: 'Top mobile mechanic.' },
      ],
      projects: [
        { title: 'Fleet Maintenance Contract', description: 'Monthly maintenance for 25-vehicle delivery fleet.', date: '2025-02-01', value: 60000, duration: 'Ongoing' },
      ],
      team: [
        { name: 'Jamal Washington', role: 'Master Tech', bio: 'ASE Master, 16 years experience.' },
      ],
    },
    services: [
      { name: 'Brake Service', description: 'Brake pad and rotor replacement', basePrice: 280, duration: 120, category: 'Brakes' },
      { name: 'Battery Replacement', description: 'Battery test and replacement', basePrice: 145, duration: 45, category: 'Electrical' },
      { name: 'Alternator Replacement', description: 'Alternator test and replacement', basePrice: 320, duration: 120, category: 'Electrical' },
      { name: 'Oil Change', description: 'Mobile oil change service', basePrice: 75, duration: 45, category: 'Maintenance' },
      { name: 'Check Engine Diagnostic', description: 'OBD-II scan and diagnosis', basePrice: 95, duration: 60, category: 'Diagnostic' },
      { name: 'Emergency Roadside', description: 'On-site emergency repair', basePrice: 175, duration: 90, category: 'Emergency' },
    ],
    reviews: [
      { authorName: 'Tyler Brooks', rating: 5, comment: 'Changed my brakes at work. So convenient!', source: 'internal', npsScore: 10 },
      { authorName: 'Maya Patel', rating: 5, comment: 'Honest diagnosis, fair price.', source: 'internal', npsScore: 9 },
      { authorName: 'Chris Evans', rating: 5, comment: 'Saved me a tow bill. Best service.', source: 'internal', npsScore: 10 },
      { authorName: 'Gabriela Torres', rating: 4, comment: 'Good mechanic, on time.', source: 'internal', npsScore: 8 },
      { authorName: 'Darnell Jackson', rating: 5, comment: 'Best mobile mechanic in SD.', source: 'internal', npsScore: 10 },
      { authorName: 'Annie Liu', rating: 5, comment: 'Fleet maintenance has been flawless.', source: 'internal', npsScore: 9 },
    ],
    featured: { type: 'sponsored', priority: 5 },
  },
];

// ─── Seed logic ─────────────────────────────────────────────────────────────

async function seedProvider(p: ProviderSeed, index: number) {
  console.log(`\n[${index + 1}/${PROVIDERS.length}] Seeding ${p.name} (${p.industry}/${p.city})...`);

  // Compute aggregate rating + review count from the seed reviews
  const reviewCount = p.reviews.length;
  const avgRating =
    reviewCount > 0
      ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 5;

  // 1. Upsert tenant
  const tenant = await db.tenant.upsert({
    where: { slug: p.slug },
    create: {
      name: p.name,
      slug: p.slug,
      industry: p.industry,
      tagline: p.tagline,
      description: p.description,
      city: p.city,
      state: p.state,
      country: p.country,
      currency: p.currency,
      phone: p.phone,
      email: p.email,
      coverImage: p.coverImage,
      galleryJson: JSON.stringify(p.gallery),
      businessHoursJson: JSON.stringify(p.businessHours),
      serviceAreasJson: JSON.stringify(p.serviceAreas),
      faqsJson: JSON.stringify(p.faqs),
      languagesJson: JSON.stringify(p.languages),
      socialLinksJson: JSON.stringify({}),
      publicProfileEnabled: true,
      publicSlug: p.slug,
      // Marketplace eligibility — all gates passed
      marketplaceOptIn: true,
      marketplaceTermsAcceptedAt: new Date(),
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      stripeConnected: true,
      stripeAccountId: `acct_demo_${p.slug.replace(/-/g, '_')}`,
      stripePayoutsEnabled: true,
      profileCompletionPct: 100,
      plan: 'business',
      planStatus: 'active',
      // Pricing
      pricingType: p.pricingType,
      callOutFee: p.callOutFee,
      emergencyServiceAvailable: p.emergencyServiceAvailable,
      emergencySurchargePct: p.emergencySurchargePct,
      // Compliance
      vatNumber: p.vatNumber,
      licenceNumber: p.licenceNumber,
      insuranceProvider: p.insuranceProvider,
      insurancePolicyNumber: p.insurancePolicyNumber,
      // SEO + ratings
      seoTitle: `${p.name} | ${p.tagline}`,
      seoDescription: p.description.slice(0, 155),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount,
      employeesCount: p.employeesCount,
      onboardingCompleted: true,
      businessCategoriesJson: JSON.stringify([p.industry]),
    },
    update: {
      name: p.name,
      industry: p.industry,
      tagline: p.tagline,
      description: p.description,
      city: p.city,
      state: p.state,
      coverImage: p.coverImage,
      galleryJson: JSON.stringify(p.gallery),
      businessHoursJson: JSON.stringify(p.businessHours),
      serviceAreasJson: JSON.stringify(p.serviceAreas),
      faqsJson: JSON.stringify(p.faqs),
      languagesJson: JSON.stringify(p.languages),
      publicProfileEnabled: true,
      publicSlug: p.slug,
      marketplaceOptIn: true,
      marketplaceTermsAcceptedAt: new Date(),
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      stripeConnected: true,
      stripeAccountId: `acct_demo_${p.slug.replace(/-/g, '_')}`,
      stripePayoutsEnabled: true,
      profileCompletionPct: 100,
      plan: 'business',
      planStatus: 'active',
      pricingType: p.pricingType,
      callOutFee: p.callOutFee,
      emergencyServiceAvailable: p.emergencyServiceAvailable,
      emergencySurchargePct: p.emergencySurchargePct,
      vatNumber: p.vatNumber,
      licenceNumber: p.licenceNumber,
      insuranceProvider: p.insuranceProvider,
      insurancePolicyNumber: p.insurancePolicyNumber,
      seoTitle: `${p.name} | ${p.tagline}`,
      seoDescription: p.description.slice(0, 155),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount,
      employeesCount: p.employeesCount,
      onboardingCompleted: true,
      businessCategoriesJson: JSON.stringify([p.industry]),
    },
  });

  // 2. Upsert owner user (login: owner+slug@demo.serviceos.cc / Owner@123)
  const email = `owner+${p.slug}@demo.serviceos.cc`;
  const passwordHash = await bcrypt.hash('Owner@123', 12);
  await db.user.upsert({
    where: { email },
    create: {
      email,
      name: `${p.name} Owner`,
      passwordHash,
      role: 'owner',
      phone: p.phone,
      tenantId: tenant.id,
      isActive: true,
    },
    update: {
      name: `${p.name} Owner`,
      passwordHash,
      phone: p.phone,
      tenantId: tenant.id,
      isActive: true,
    },
  });

  // 3. Upsert services (delete existing first to keep the list clean)
  await db.service.deleteMany({ where: { tenantId: tenant.id } });
  for (const s of p.services) {
    await db.service.create({
      data: {
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        duration: s.duration,
        category: s.category,
        slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        isActive: true,
        isPublic: true,
        tenantId: tenant.id,
      },
    });
  }

  // 4. Upsert reviews (delete existing first)
  await db.review.deleteMany({ where: { tenantId: tenant.id } });
  for (const r of p.reviews) {
    await db.review.create({
      data: {
        rating: r.rating,
        comment: r.comment,
        authorName: r.authorName,
        source: r.source,
        status: 'published',
        npsScore: r.npsScore,
        tenantId: tenant.id,
      },
    });
  }

  // 5. Upsert certifications (delete existing first)
  await db.providerCertification.deleteMany({ where: { tenantId: tenant.id } });
  for (const c of p.certifications) {
    await db.providerCertification.create({
      data: {
        name: c.name,
        issuer: c.issuer,
        isVerified: c.verified,
        verifiedAt: c.verified ? new Date() : null,
        tenantId: tenant.id,
      },
    });
  }

  // 6. Upsert portfolio (delete existing first)
  await db.providerPortfolio.deleteMany({ where: { tenantId: tenant.id } });
  await db.providerPortfolio.create({
    data: {
      tenantId: tenant.id,
      itemsJson: JSON.stringify(p.portfolio.items),
      videosJson: JSON.stringify([]),
      awardsJson: JSON.stringify(p.portfolio.awards),
      projectsJson: JSON.stringify(p.portfolio.projects),
      teamJson: JSON.stringify(p.portfolio.team),
      isActive: true,
    },
  });

  // 7. Featured listing (if applicable)
  if (p.featured) {
    await db.featuredListing.deleteMany({
      where: { tenantId: tenant.id, type: p.featured.type },
    });
    await db.featuredListing.create({
      data: {
        tenantId: tenant.id,
        type: p.featured.type,
        priority: p.featured.priority,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        amountCharged: p.featured.type === 'featured' ? 99 : 49,
        currency: 'USD',
      },
    });
  }

  console.log(`  ✓ ${p.name}: tenant + user + ${p.services.length} services + ${p.reviews.length} reviews + ${p.certifications.length} certs + portfolio${p.featured ? ` + ${p.featured.type} listing` : ''}`);
}

async function main() {
  console.log('=== ServiceOS Marketplace Seed ===');
  console.log(`Seeding ${PROVIDERS.length} demo providers...\n`);

  for (let i = 0; i < PROVIDERS.length; i++) {
    await seedProvider(PROVIDERS[i], i);
  }

  // Summary
  const tenants = await db.tenant.count({ where: { marketplaceOptIn: true } });
  const services = await db.service.count();
  const reviews = await db.review.count();
  const portfolios = await db.providerPortfolio.count();
  const certs = await db.providerCertification.count();
  const featured = await db.featuredListing.count({ where: { isActive: true } });

  console.log('\n=== Seed Complete ===');
  console.log(`Marketplace-eligible tenants: ${tenants}`);
  console.log(`Total services:                ${services}`);
  console.log(`Total reviews:                 ${reviews}`);
  console.log(`Provider portfolios:           ${portfolios}`);
  console.log(`Provider certifications:       ${certs}`);
  console.log(`Active featured listings:      ${featured}`);
  console.log('\n=== Demo Login Credentials ===');
  console.log('Email: owner+<provider-slug>@demo.serviceos.cc');
  console.log('Password: Owner@123');
  console.log('\nExample slugs:');
  PROVIDERS.slice(0, 4).forEach((p) => {
    console.log(`  - owner+${p.slug}@demo.serviceos.cc  (${p.name})`);
  });

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await db.$disconnect();
  process.exit(1);
});
