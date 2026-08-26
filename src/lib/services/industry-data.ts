/**
 * Industry-specific data for /services/website-development/[industry] pages.
 *
 * Each industry has:
 *   - slug (URL segment, matches the existing industry-software slugs)
 *   - name (display name, e.g. "Plumbing")
 *   - singularNoun (e.g. "plumber")
 *   - emoji (industry icon)
 *   - painPoints (what problems these businesses face without a website)
 *   - features (what their Fieseros website includes)
 *   - keywords (SEO keywords for the page)
 *
 * This is the single source of truth — the dynamic route + sitemap both
 * read from this list, so adding a new industry is a one-line change here.
 */

export interface IndustryServiceData {
  slug: string
  name: string
  singularNoun: string
  emoji: string
  tagline: string
  painPoints: string[]
  features: string[]
  keywords: string[]
  metaDescription: string
}

export const INDUSTRY_SERVICES: IndustryServiceData[] = [
  {
    slug: 'plumbing', name: 'Plumbing', singularNoun: 'plumber', emoji: '🔧',
    tagline: 'Websites for Plumbers That Turn Emergency Searches Into Booked Jobs',
    painPoints: ['Customers search "emergency plumber near me" — but your competition shows up first', 'You rely on word-of-mouth and repeat customers, with no steady stream of new leads', 'Answering calls while on jobs means missed opportunities', 'No way to show customer reviews or past work'],
    features: ['Emergency service landing page (rank for "emergency plumber [city]")', 'Online booking form with emergency priority flag', 'Google Business Profile optimization for "plumber near me" searches', 'Service pages: drain cleaning, water heater, leak repair, etc.', 'Review collection automation via Fieseros CRM (SMS after job completion)', 'Click-to-call + WhatsApp integration for mobile users'],
    keywords: ['plumber website', 'plumbing website design', 'plumber SEO', 'plumbing marketing', 'emergency plumber website'],
    metaDescription: 'Professional websites for plumbers. Rank for "emergency plumber near me", capture online bookings, and turn Google searches into booked jobs. Starting at $999.',
  },
  {
    slug: 'hvac', name: 'HVAC', singularNoun: 'HVAC contractor', emoji: '❄️',
    tagline: 'Websites for HVAC Companies That Capture Seasonal Demand',
    painPoints: ['Summer AC repair rush — but customers can\'t find you on Google', 'Seasonal demand means you need leads NOW, not in 6 months', 'No way to showcase maintenance plans or financing options', 'Competing with national chains that dominate search results'],
    features: ['Seasonal landing pages (AC repair in summer, furnace repair in winter)', 'Maintenance plan subscription integration via Fieseros CRM', 'Financing options display + application form', 'Service pages: installation, repair, maintenance, indoor air quality', 'Google Ads integration for peak-season lead generation', 'Before/after photo gallery for installations'],
    keywords: ['HVAC website', 'HVAC website design', 'HVAC SEO', 'air conditioning website', 'furnace repair marketing'],
    metaDescription: 'Websites for HVAC companies. Capture seasonal demand, showcase maintenance plans, and rank for "AC repair near me". Starting at $999.',
  },
  {
    slug: 'electrical', name: 'Electrical', singularNoun: 'electrician', emoji: '⚡',
    tagline: 'Websites for Electricians That Build Trust + Generate Leads',
    painPoints: ['Customers need to trust your electrical work — but your website doesn\'t show credentials', 'No way to display licenses, insurance, or certifications', 'Competing with handymen who undercut on price', 'Commercial vs residential — you need separate service pages'],
    features: ['License + insurance + certification display (trust signals)', 'Commercial vs residential service pages', 'Online quote request form with project type classification', 'Safety inspection booking form', 'Google Business Profile optimization for "electrician near me"', 'Review collection + display (Google reviews embedded)'],
    keywords: ['electrician website', 'electrical contractor website', 'electrician SEO', 'electrical marketing'],
    metaDescription: 'Websites for electricians. Display licenses, showcase commercial/residential services, and rank for "electrician near me". Starting at $999.',
  },
  {
    slug: 'cleaning-business', name: 'Cleaning', singularNoun: 'cleaning business', emoji: '🧽',
    tagline: 'Websites for Cleaning Businesses That Book Recurring Jobs',
    painPoints: ['One-time cleans don\'t pay the bills — you need recurring contracts', 'Customers want to book online, not call during business hours', 'No way to show before/after photos or customer testimonials', 'Competing with franchise cleaning services'],
    features: ['Recurring booking form (weekly, bi-weekly, monthly)', 'Before/after photo gallery', 'Pricing transparency (per sq ft or flat rate)', 'Service pages: residential, commercial, deep clean, move-in/out', 'Online payment integration via Fieseros CRM', 'Customer portal for rescheduling + paying invoices'],
    keywords: ['cleaning business website', 'cleaning service website', 'maid service website', 'cleaning SEO'],
    metaDescription: 'Websites for cleaning businesses. Book recurring jobs, show before/after photos, and let customers book online 24/7. Starting at $999.',
  },
  {
    slug: 'landscaping', name: 'Landscaping', singularNoun: 'landscaper', emoji: '🌿',
    tagline: 'Websites for Landscapers That Showcase Your Work + Capture Leads',
    painPoints: ['Landscaping is visual — but you have no portfolio gallery', 'Seasonal business means you need leads in spring, not winter', 'No way to show the range of services (design, installation, maintenance)', 'Competing with "guy with a truck" who doesn\'t have insurance'],
    features: ['Portfolio gallery with project categories (hardscaping, softscaping, etc.)', 'Seasonal service pages (spring cleanup, fall leaf removal, snow removal)', 'Online quote request form with project type + budget', 'Design + installation + maintenance service pages', 'Before/after slider for transformations', 'Google Business Profile with project photos'],
    keywords: ['landscaping website', 'landscaper website', 'landscaping SEO', 'landscape design website'],
    metaDescription: 'Websites for landscapers. Showcase your portfolio, capture seasonal leads, and rank for "landscaper near me". Starting at $999.',
  },
  {
    slug: 'lawn-care', name: 'Lawn Care', singularNoun: 'lawn care business', emoji: '🌱',
    tagline: 'Websites for Lawn Care Businesses That Fill Your Route',
    painPoints: ['You need full routes, not one-time jobs', 'Customers want to see pricing before calling', 'No way to accept online payments for recurring service', 'Competing with TruGreen and other national brands'],
    features: ['Recurring service booking (weekly, bi-weekly)', 'Transparent pricing display (per visit or per month)', 'Online payment + autopay integration via Fieseros CRM', 'Service area map showing neighborhoods you cover', 'Seasonal add-on services (aeration, overseeding, leaf removal)', 'Customer portal for route management'],
    keywords: ['lawn care website', 'lawn service website', 'lawn care SEO', 'lawn care marketing'],
    metaDescription: 'Websites for lawn care businesses. Fill your route with recurring bookings, accept online payments, and compete with national brands. Starting at $999.',
  },
  {
    slug: 'painting', name: 'Painting', singularNoun: 'painting contractor', emoji: '🎨',
    tagline: 'Websites for Painting Contractors That Showcase Quality + Win Bids',
    painPoints: ['Customers want to see your work before requesting a quote', 'No way to differentiate interior vs exterior services', 'Competing on price alone — no portfolio to justify premium pricing', 'No system for sending quotes + collecting deposits'],
    features: ['Portfolio gallery (interior, exterior, commercial)', 'Online quote request form with room/sqft details', 'Quote + deposit collection via Fieseros CRM', 'Service pages: interior, exterior, cabinet refinishing, commercial', 'Color consultation booking form', 'Review collection + display'],
    keywords: ['painting website', 'painter website', 'painting contractor website', 'painting SEO'],
    metaDescription: 'Websites for painting contractors. Showcase your portfolio, send quotes online, and collect deposits via Fieseros CRM. Starting at $999.',
  },
  {
    slug: 'handyman', name: 'Handyman', singularNoun: 'handyman', emoji: '🔨',
    tagline: 'Websites for Handymen That Fill Your Schedule',
    painPoints: ['Customers don\'t know the range of jobs you can handle', 'No way to book online — everything is phone tag', 'Competing with TaskRabbit and Angi for visibility', 'No system for tracking jobs, invoices, and payments'],
    features: ['Service category pages (drywall, plumbing, electrical, carpentry, etc.)', 'Online booking form with job type + photo upload', 'Hourly rate + project quote transparency', 'Job tracking + invoicing via Fieseros CRM', 'Google Business Profile optimization for "handyman near me"', 'Review collection automation'],
    keywords: ['handyman website', 'handyman service website', 'handyman SEO', 'handyman marketing'],
    metaDescription: 'Websites for handymen. Fill your schedule with online bookings, showcase your services, and compete with TaskRabbit. Starting at $999.',
  },
  {
    slug: 'tree-care', name: 'Tree Care', singularNoun: 'tree care service', emoji: '🌳',
    tagline: 'Websites for Tree Care Services That Win Big Jobs',
    painPoints: ['Tree removal is high-ticket but customers need trust before hiring', 'No way to show insurance + certifications', 'Emergency storm damage — customers need to find you FAST', 'No system for quoting large jobs with photos'],
    features: ['Insurance + certification display (ISA certified, licensed, insured)', 'Emergency storm damage landing page', 'Photo upload quote request form', 'Service pages: removal, trimming, stump grinding, emergency', 'Before/after gallery for large removals', 'Google Business Profile with project photos'],
    keywords: ['tree care website', 'tree service website', 'arborist website', 'tree care SEO'],
    metaDescription: 'Websites for tree care services. Display insurance, win emergency storm damage jobs, and quote large projects with photo uploads. Starting at $999.',
  },
  {
    slug: 'snow-removal', name: 'Snow Removal', singularNoun: 'snow removal service', emoji: '❄️',
    tagline: 'Websites for Snow Removal Services That Fill Seasonal Contracts',
    painPoints: ['Short season — you need contracts signed BEFORE the first snowfall', 'No way to accept seasonal contracts online', 'Competing with large commercial services for residential accounts', 'No system for dispatching + tracking during storms'],
    features: ['Seasonal contract signup form (residential + commercial)', 'Per-event vs seasonal pricing display', 'Service area map with route density', 'Storm dispatch + tracking via Fieseros CRM', 'SMS notifications to customers during storms', 'Automatic invoicing after each snow event'],
    keywords: ['snow removal website', 'snow plowing website', 'snow removal SEO', 'snow removal marketing'],
    metaDescription: 'Websites for snow removal services. Sign seasonal contracts online, dispatch during storms, and auto-invoice after each event. Starting at $999.',
  },
  {
    slug: 'pest-control', name: 'Pest Control', singularNoun: 'pest control service', emoji: '🐛',
    tagline: 'Websites for Pest Control Services That Book Treatments',
    painPoints: ['Customers search "pest control near me" when they have an active problem', 'No way to showcase treatment plans + recurring service', 'Competing with Terminix + Orkin for local searches', 'No system for scheduling + sending treatment reminders'],
    features: ['Emergency pest control landing page', 'Treatment plan display (one-time, quarterly, monthly)', 'Online booking with pest type selection', 'Treatment reminder automation via Fieseros CRM (SMS + email)', 'Service pages: termites, bed bugs, rodents, mosquitoes, etc.', 'Review collection + reputation management'],
    keywords: ['pest control website', 'exterminator website', 'pest control SEO', 'pest control marketing'],
    metaDescription: 'Websites for pest control services. Book treatments online, send automated reminders, and rank for "pest control near me". Starting at $999.',
  },
  {
    slug: 'roofing', name: 'Roofing', singularNoun: 'roofing contractor', emoji: '🏠',
    tagline: 'Websites for Roofers That Win Insurance + Replacement Jobs',
    painPoints: ['Roof replacement is high-ticket — customers need trust + proof of work', 'Insurance claims require documentation + photos', 'No way to show manufacturer certifications (GAF, Owens Corning, etc.)', 'Competing with storm-chasers who undercut on price'],
    features: ['Manufacturer certification display (GAF Master Elite, etc.)', 'Insurance claim documentation portal', 'Photo upload quote request form', 'Service pages: replacement, repair, inspection, gutters', 'Before/after gallery for roof replacements', 'Financing options display + application'],
    keywords: ['roofing website', 'roofer website', 'roofing contractor website', 'roofing SEO'],
    metaDescription: 'Websites for roofing contractors. Display certifications, handle insurance claims, and win high-ticket replacement jobs. Starting at $999.',
  },
  {
    slug: 'pool-service', name: 'Pool Service', singularNoun: 'pool service', emoji: '🏊',
    tagline: 'Websites for Pool Services That Book Weekly Routes',
    painPoints: ['Pool service is recurring — you need full weekly routes', 'Customers want to see chemical service + cleaning details', 'Seasonal startup + closing — no system for scheduling', 'No way to accept autopay for recurring service'],
    features: ['Weekly service route booking form', 'Chemical service + cleaning plan display', 'Seasonal startup + closing scheduling', 'Autopay integration via Fieseros CRM', 'Service area map for route density', 'Chemical level reporting + customer portal'],
    keywords: ['pool service website', 'pool cleaning website', 'pool service SEO', 'pool maintenance website'],
    metaDescription: 'Websites for pool services. Book weekly routes, accept autopay, and manage seasonal start/close scheduling. Starting at $999.',
  },
  {
    slug: 'window-cleaning', name: 'Window Cleaning', singularNoun: 'window cleaning service', emoji: '🪟',
    tagline: 'Websites for Window Cleaners That Book Residential + Commercial',
    painPoints: ['One-time jobs don\'t build revenue — you need recurring contracts', 'No way to show before/after results', 'Competing with "guy with a squeegee" on price', 'No system for quoting commercial buildings'],
    features: ['Recurring service booking (monthly, quarterly)', 'Before/after photo gallery', 'Residential vs commercial service pages', 'Online quote request form with building size', 'Google Business Profile optimization', 'Review collection automation'],
    keywords: ['window cleaning website', 'window cleaner website', 'window cleaning SEO'],
    metaDescription: 'Websites for window cleaning services. Book recurring contracts, showcase before/after results, and quote commercial jobs. Starting at $999.',
  },
  {
    slug: 'concrete', name: 'Concrete', singularNoun: 'concrete contractor', emoji: '🧱',
    tagline: 'Websites for Concrete Contractors That Win Big Projects',
    painPoints: ['Concrete work is high-ticket — customers need to see your portfolio', 'No way to differentiate residential vs commercial vs decorative', 'Competing on price without showcasing quality', 'No system for quoting + collecting deposits'],
    features: ['Portfolio gallery (driveways, patios, foundations, decorative)', 'Project type quote request form', 'Deposit collection via Fieseros CRM', 'Service pages: stamped, stained, polished, repair', 'Before/after gallery for transformations', 'Google Business Profile with project photos'],
    keywords: ['concrete contractor website', 'concrete website', 'concrete SEO', 'concrete marketing'],
    metaDescription: 'Websites for concrete contractors. Showcase your portfolio, collect deposits online, and win high-ticket projects. Starting at $999.',
  },
  {
    slug: 'garage-door', name: 'Garage Door', singularNoun: 'garage door service', emoji: '🚪',
    tagline: 'Websites for Garage Door Services That Capture Emergency Repairs',
    painPoints: ['Broken garage door = emergency — customers need to find you NOW', 'No way to showcase installation vs repair services', 'Competing with national chains for local searches', 'No system for emergency dispatch + invoicing'],
    features: ['Emergency repair landing page (24/7 service)', 'Installation vs repair service pages', 'Brand showcase (Clopay, Amarr, Chamberlain, etc.)', 'Online booking with urgency flag', 'Emergency dispatch + invoicing via Fieseros CRM', 'Google Business Profile for "garage door repair near me"'],
    keywords: ['garage door website', 'garage door repair website', 'garage door SEO'],
    metaDescription: 'Websites for garage door services. Capture emergency repairs, showcase installations, and dispatch via Fieseros CRM. Starting at $999.',
  },
  {
    slug: 'solar', name: 'Solar', singularNoun: 'solar installer', emoji: '☀️',
    tagline: 'Websites for Solar Installers That Educate + Convert',
    painPoints: ['Solar is complex — customers need education before requesting a quote', 'No way to show savings calculator + financing options', 'Competing with national solar companies (Sunrun, Tesla, etc.)', 'No system for managing long sales cycles + follow-ups'],
    features: ['Solar savings calculator integration', 'Financing + tax credit information display', 'Educational content pages (how solar works, ROI, etc.)', 'Quote request form with roof details + energy usage', 'Long sales cycle management via Fieseros CRM', 'Installation portfolio + customer testimonials'],
    keywords: ['solar website', 'solar installer website', 'solar SEO', 'solar marketing'],
    metaDescription: 'Websites for solar installers. Educate customers, show savings, and manage long sales cycles via Fieseros CRM. Starting at $999.',
  },
  {
    slug: 'pet-services', name: 'Pet Services', singularNoun: 'pet service', emoji: '🐾',
    tagline: 'Websites for Pet Services That Book Grooming + Walking + Sitting',
    painPoints: ['Pet owners want to book online — not call during business hours', 'No way to showcase services (grooming, walking, sitting, training)', 'Competing with Rover + Wag for local searches', 'No system for recurring bookings + pet records'],
    features: ['Online booking form with pet details + service type', 'Service pages: grooming, walking, sitting, training, boarding', 'Recurring booking management', 'Pet records + vaccination tracking via Fieseros CRM', 'Photo gallery of happy pets (social proof)', 'Customer portal for rescheduling + payments'],
    keywords: ['pet services website', 'pet grooming website', 'dog walking website', 'pet sitting website'],
    metaDescription: 'Websites for pet services. Book grooming, walking, and sitting online. Track pet records and manage recurring bookings. Starting at $999.',
  },
]

export function getIndustryBySlug(slug: string): IndustryServiceData | undefined {
  return INDUSTRY_SERVICES.find((i) => i.slug === slug)
}

export function getAllIndustrySlugs(): string[] {
  return INDUSTRY_SERVICES.map((i) => i.slug)
}
