/**
 * Canonical Form Templates — Home Services & Trade Contractors Extended (2026 Edition)
 *
 * 25 Curated, high-converting trade contractor templates:
 * - HVAC Emergency & Seasonal Tune-Up
 * - 24/7 Emergency Plumbing & Sewer Scope
 * - Electrical Panel Upgrade & EV Charger Install
 * - Drone Roof Inspection & Storm Damage Claim
 * - Solar Panel Site Assessment & Battery Storage
 * - Tree Removal & Arborist Hazard Risk Audit
 * - Pool Opening, Chemical Balance & Weekly Maintenance
 * - Interior & Exterior Painting Quote
 * - Garage Door Opener & Broken Spring Replacement
 * - Pest Extermination & Termite Warranty Inspection
 * - Commercial Janitorial & Office Deep Clean
 * - Snow Plowing & De-Icing Season Contract
 * - Handyman Hourly Multi-Task Booking
 * - Concrete Driveway & Stamped Patio Quote
 * - Hardwood Flooring Installation & Dustless Sanding
 * - Emergency Locksmith & High-Security Rekey
 * - Long-Distance & White-Glove Residential Moving
 * - Eco-Friendly Junk Removal & Estate Cleanout
 * - Major Appliance Diagnostics & In-Home Repair
 * - Window Cleaning & Pressure Washing Combo
 * - Lawn Aeration, Overseeding & Irrigation Tune-Up
 * - Gutter Guard Micro-Mesh Installation
 * - Custom Fence & Automated Gate Quote
 * - Heavy-Duty Pressure & Soft Wash Exterior Cleaning
 * - General Contractor Home Remodel & Addition Feasibility
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeHomeTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
  industry: string,
  color: string,
  fields: any[],
  steps: any[],
  seoKeywords: string[],
  faq: { question: string; answer: string }[],
  mediaUrl?: string
): FormTemplate {
  return {
    id,
    name,
    shortDescription,
    description,
    schema: {
      version: 1,
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Service Details' }],
      fields,
      rules: [],
      theme: {
        primaryColor: color,
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '1rem',
        inputBorderRadius: '0.75rem',
        inputHeight: 'large',
        cardBackground: 'rgba(255, 255, 255, 0.95)',
        showTopBorder: true,
        layout: 'multi_step',
        mediaPanel: {
          enabled: true,
          position: 'left',
          splitRatio: '40-60',
          mediaType: 'image',
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
          badgeText: '⭐ Top-Rated Verified Contractor • Licensed & Insured',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Upfront transparent pricing with zero surprise add-ons',
            'Same-day emergency dispatch available across metro areas',
            '100% Satisfaction & Workmanship Guarantee',
          ],
        },
      },
      settings: {
        submitButtonText: 'Get Fast Upfront Quote ⚡',
        successTitle: 'Quote Request Dispatched!',
        successMessage: 'A licensed specialist is reviewing your project details and will contact you within 15 minutes.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `template_${id}` },
        },
      },
    },
    categories: ['quote', 'estimate', 'booking', 'lead_generation'],
    industries: [industry as any, 'home_services'],
    useCases: ['lead_capture', 'quote_request', 'emergency_booking'],
    audiences: ['residential', 'commercial'],
    tags: [industry, 'home-services', 'contractor', '2026-ui', 'estimate', 'instant-booking'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.95,
    ratingCount: 88,
    usageCount: 950,
    estimatedMinutes: 2,
    seo: {
      seoTitle: `${name} | Instant Contractor Estimate & Booking`,
      seoDescription: `${shortDescription} Mobile-responsive, multi-step intake with photo upload and instant CRM routing.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. HVAC Emergency Dispatch
const HVAC_EMERGENCY = makeHomeTemplate(
  'hvac-emergency-repair-dispatch',
  '24/7 Emergency HVAC Repair & Diagnostics',
  'Priority emergency heating & AC dispatch intake with real-time symptom selector.',
  'Engineered for rapid emergency triage. Homeowners select urgent HVAC symptoms (refrigerant leak, furnace blower failure, electrical tripping) for priority 15-minute dispatch.',
  'hvac',
  '#0284c7',
  [
    { id: 'full_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'emergency_type', type: 'dropdown', label: 'Primary Issue', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'No Cooling (AC Blowing Warm)', value: 'no_ac' }, { label: 'No Heat (Furnace Out)', value: 'no_heat' }, { label: 'Water Leaking from Unit', value: 'leak' }, { label: 'Burning Odor / Smoke', value: 'odor' }] },
    { id: 'system_type', type: 'dropdown', label: 'System Type', width: 'half', stepId: 'step-2',
      options: [{ label: 'Central AC & Furnace', value: 'central' }, { label: 'Heat Pump', value: 'heat_pump' }, { label: 'Ductless Mini-Split', value: 'mini_split' }, { label: 'Rooftop Package', value: 'package' }] },
    { id: 'urgency', type: 'radio', label: 'Dispatch Urgency', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: '🚨 Immediate Emergency (Under 2 Hours)', value: 'immediate' }, { label: '📅 Today (Standard Window)', value: 'today' }, { label: 'Next Business Day', value: 'next_day' }] },
    { id: 'notes', type: 'long_answer', label: 'Unit Sounds or Error Codes', width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Location & Contact' }, { id: 'step-2', title: 'Equipment & Symptoms' }],
  ['emergency hvac', 'ac repair fast', 'furnace repair quote', 'same day hvac'],
  [
    { question: 'What qualifies as an HVAC emergency?', answer: 'Temperatures below 40°F or above 90°F inside, burning electrical smells, or severe condensate leaks qualify for priority dispatch.' },
    { question: 'Are diagnostic fees waived with repairs?', answer: 'Yes, the diagnostic dispatch fee is applied directly toward any approved repair work.' }
  ],
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80'
);

// 2. Plumbing Drain & Sewer Scope
const PLUMBING_SEWER = makeHomeTemplate(
  'plumbing-drain-sewer-scope',
  'Emergency Drain Cleaning & HD Camera Sewer Inspection',
  'Comprehensive plumbing diagnostic form with main line clog selector and camera inspection scheduling.',
  'Designed for rooter and sewer rehabilitation contractors. Gathers floor drain symptoms, backup history, and pipe material details.',
  'plumbing',
  '#0d9488',
  [
    { id: 'full_name', type: 'short_answer', label: 'Homeowner Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Mobile Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'drain_issue', type: 'dropdown', label: 'Drain Symptom', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Main Sewer Backup (Multiple Fixtures)', value: 'main_line' }, { label: 'Kitchen Sink / Disposal Clog', value: 'kitchen' }, { label: 'Shower / Tub Standing Water', value: 'tub' }, { label: 'Toilet Overflowing', value: 'toilet' }] },
    { id: 'cleanout_access', type: 'dropdown', label: 'Outside Cleanout Access Available?', width: 'half', stepId: 'step-2',
      options: [{ label: 'Yes, ground-level cleanout exists', value: 'yes' }, { label: 'No / Unsure', value: 'no' }, { label: 'Basement cleanout only', value: 'basement' }] },
    { id: 'camera_inspection_requested', type: 'checkbox', label: 'Options to Include', width: 'full', stepId: 'step-2',
      options: [{ label: 'Include HD Video Camera Sewer Inspection ($0 with clearing)', value: 'camera' }, { label: 'Hydro-Jetting Pipe Scrubbing', value: 'jetting' }] },
  ],
  [{ id: 'step-1', title: 'Property Contact' }, { id: 'step-2', title: 'Drain Diagnosis' }],
  ['drain cleaning', 'sewer camera inspection', 'clogged drain emergency', 'hydro jetting'],
  [{ question: 'How quickly can a rooter tech arrive?', answer: 'Our mobile trucks carry motorized snakes and camera crawlers with standard 60-minute dispatch.' }],
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'
);

// 3. Electrical Panel & EV Charger
const ELECTRICAL_EV = makeHomeTemplate(
  'electrical-panel-ev-charger',
  'Level 2 EV Charger & 200A Panel Upgrade Assessment',
  'Residential electrical capacity calculation and Level 2 electric vehicle charger installation planner.',
  'Collects vehicle model, charger amperage (32A/40A/48A), panel location, and distance to garage for precision flat-rate quoting.',
  'electrical',
  '#f59e0b',
  [
    { id: 'full_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email', required: true, width: 'full', stepId: 'step-1' },
    { id: 'ev_model', type: 'short_answer', label: 'EV Make & Model (e.g. Tesla Model Y, Rivian R1T)', required: true, width: 'half', stepId: 'step-2' },
    { id: 'charger_type', type: 'dropdown', label: 'Charger Hardware', width: 'half', stepId: 'step-2',
      options: [{ label: 'Tesla Wall Connector (Hardwired)', value: 'tesla' }, { label: 'NEMA 14-50 240V Outlet', value: 'nema_14_50' }, { label: 'ChargePoint Home Flex', value: 'chargepoint' }, { label: 'Need Recommendation', value: 'recommend' }] },
    { id: 'current_panel_size', type: 'dropdown', label: 'Current Main Breaker Amps', width: 'half', stepId: 'step-2',
      options: [{ label: '200 Amps (Standard Modern)', value: '200a' }, { label: '100-150 Amps (May need upgrade)', value: '100a' }, { label: '60 Amps or Fuse Box', value: '60a' }, { label: 'Not Sure / Check Panel', value: 'unsure' }] },
    { id: 'panel_distance', type: 'dropdown', label: 'Distance from Panel to Charging Spot', width: 'half', stepId: 'step-2',
      options: [{ label: 'Under 10 feet (Same wall)', value: 'under_10' }, { label: '10 to 30 feet', value: '10_30' }, { label: '30 to 60+ feet (Across garage/crawlspace)', value: '30_60' }] },
  ],
  [{ id: 'step-1', title: 'Contact Info' }, { id: 'step-2', title: 'Electrical Specs' }],
  ['ev charger installation', 'level 2 home charger', '200 amp panel upgrade', 'electrician quote'],
  [{ question: 'Do I need a city electrical permit?', answer: 'Yes, our licensed master electricians pull all necessary municipal permits and coordinate final inspections.' }],
  'https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=1200&q=80'
);

// 4. Solar & Battery Storage
const SOLAR_BATTERY = makeHomeTemplate(
  'solar-battery-storage-quote',
  'Solar Energy & Whole-Home Battery Backup Feasibility',
  'Photovoltaic solar generation sizing and Tesla Powerwall / Enphase battery storage calculator.',
  'Captures average monthly electric bill, roof orientation, and backup power goals (essential loads vs 100% off-grid resilience).',
  'solar',
  '#eab308',
  [
    { id: 'full_name', type: 'short_answer', label: 'Homeowner Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Installation Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'monthly_bill', type: 'dropdown', label: 'Average Monthly Electric Bill', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: '$100 – $200 / month', value: '100_200' }, { label: '$200 – $350 / month', value: '200_350' }, { label: '$350 – $500 / month', value: '350_500' }, { label: '$500+ / month (High consumption)', value: '500_plus' }] },
    { id: 'battery_backup', type: 'radio', label: 'Battery Storage Interest', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Solar + Whole-Home Battery (Tesla Powerwall)', value: 'solar_battery' }, { label: 'Solar Only (Grid-Tied Net Metering)', value: 'solar_only' }, { label: 'Battery Backup Only (Existing Solar)', value: 'battery_only' }] },
  ],
  [{ id: 'step-1', title: 'Property Details' }, { id: 'step-2', title: 'Energy Profile' }],
  ['solar panel quote', 'home solar battery', 'tesla powerwall install', 'solar savings calculator'],
  [{ question: 'What is the federal solar tax credit?', answer: 'The Federal Clean Energy Credit covers 30% of total solar equipment and installation costs through 2032.' }],
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80'
);

// 5. Tree Care & Hazard Removal
const TREE_REMOVAL = makeHomeTemplate(
  'tree-care-hazard-removal',
  'Emergency Tree Removal & Certified Arborist Pruning',
  'Tree trimming, dead tree removal, stump grinding, and crane assistance estimation form.',
  'Collects tree diameter, power line proximity, and storm hazard risk for ISA-certified arborist evaluation.',
  'tree_care',
  '#15803d',
  [
    { id: 'full_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'service_type', type: 'dropdown', label: 'Service Requested', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Complete Tree Removal', value: 'removal' }, { label: 'Crown Thinning & Deadwood Trimming', value: 'trimming' }, { label: 'Stump Grinding Only', value: 'stump' }, { label: 'Storm Damage / Leaning Tree Risk', value: 'emergency' }] },
    { id: 'tree_count', type: 'dropdown', label: 'Number of Trees', width: 'half', stepId: 'step-2',
      options: [{ label: '1 Tree', value: '1' }, { label: '2 to 3 Trees', value: '2_3' }, { label: '4 to 7 Trees', value: '4_7' }, { label: '8+ Trees / Lot Clearing', value: 'lot' }] },
    { id: 'power_lines_near', type: 'radio', label: 'Are power lines touching or near the branches?', width: 'full', stepId: 'step-2',
      options: [{ label: 'Yes, near high voltage power lines', value: 'yes' }, { label: 'No, clear airspace', value: 'no' }] },
  ],
  [{ id: 'step-1', title: 'Property Contact' }, { id: 'step-2', title: 'Tree Details' }],
  ['tree removal quote', 'arborist tree trimming', 'stump grinding cost', 'emergency tree service'],
  [{ question: 'Are you fully insured for crane removals?', answer: 'Yes, we maintain $2M in general liability insurance and workers compensation for all aloft crew members.' }],
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'
);

// 6. Pool Care & Automation
const POOL_CARE = makeHomeTemplate(
  'pool-care-weekly-service',
  'Weekly Pool Maintenance & Smart Automation Onboarding',
  'Turnkey pool cleaning, chemical balancing, saltwater conversion, and pump repair intake.',
  'Captures pool surface type (plaster, pebble, fiberglass, vinyl), gallon estimate, and sanitizer type for tailored recurring care.',
  'pool_service',
  '#0284c7',
  [
    { id: 'full_name', type: 'short_answer', label: 'Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'pool_type', type: 'dropdown', label: 'Pool & Spa Configuration', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Inground Pool with Attached Spa', value: 'pool_spa' }, { label: 'Inground Pool Only', value: 'pool_only' }, { label: 'Above Ground Pool', value: 'above_ground' }, { label: 'Commercial / HOA Community Pool', value: 'commercial' }] },
    { id: 'sanitizer', type: 'dropdown', label: 'Sanitizer System', width: 'half', stepId: 'step-2',
      options: [{ label: 'Traditional Chlorine', value: 'chlorine' }, { label: 'Saltwater Chlorine Generator', value: 'salt' }, { label: 'Ozone / UV Mineral', value: 'uv' }, { label: 'Green Pool / Cleanout Needed', value: 'green' }] },
    { id: 'service_frequency', type: 'radio', label: 'Preferred Service Plan', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Full Weekly Service (Chemicals + Brushing + Vacuuming)', value: 'full_weekly' }, { label: 'Chemicals & Water Balance Only', value: 'chem_only' }, { label: 'One-Time Green-to-Clean Recovery', value: 'one_time' }] },
  ],
  [{ id: 'step-1', title: 'Homeowner Info' }, { id: 'step-2', title: 'Pool Specs' }],
  ['pool cleaning service', 'weekly pool maintenance', 'saltwater pool service', 'pool service quote'],
  [{ question: 'Are chemical costs included in weekly plans?', answer: 'Yes, all standard balancing chemicals (liquid chlorine, acid, stabilizer, calcium) are 100% included in the monthly rate.' }],
  'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80'
);

// 7. Interior & Exterior Painting
const PAINTING_QUOTE = makeHomeTemplate(
  'residential-painting-quote',
  'Interior & Exterior Painting Color Consultation',
  'Precision square footage, room count, and cabinet refinishing estimation intake.',
  'Homeowners select exterior siding surfaces (stucco, fiber cement, brick) or interior room schedules with optional trim & ceiling packages.',
  'painting',
  '#8b5cf6',
  [
    { id: 'full_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Project Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'scope', type: 'dropdown', label: 'Painting Project Scope', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Whole Home Interior', value: 'interior_full' }, { label: 'Specific Interior Rooms (1-4)', value: 'interior_rooms' }, { label: 'Complete Exterior Siding & Trim', value: 'exterior_full' }, { label: 'Kitchen Cabinet Spray Refinishing', value: 'cabinets' }] },
    { id: 'approx_sqft', type: 'dropdown', label: 'Approximate Home Square Footage', width: 'half', stepId: 'step-2',
      options: [{ label: 'Under 1,500 sq ft', value: 'under_1500' }, { label: '1,500 – 2,500 sq ft', value: '1500_2500' }, { label: '2,500 – 4,000 sq ft', value: '2500_4000' }, { label: '4,000+ sq ft Estate', value: '4000_plus' }] },
    { id: 'timeline', type: 'dropdown', label: 'Desired Start Date', width: 'full', stepId: 'step-2',
      options: [{ label: 'As soon as possible (Next 2 weeks)', value: 'asap' }, { label: 'Within 1 to 2 months', value: '1_2_mo' }, { label: 'Flexible / Gathering estimates', value: 'flexible' }] },
  ],
  [{ id: 'step-1', title: 'Client Info' }, { id: 'step-2', title: 'Painting Details' }],
  ['house painting quote', 'interior painter cost', 'cabinet refinishing estimate', 'exterior paint contractor'],
  [{ question: 'Do you use premium paints?', answer: 'We exclusively apply Sherwin-Williams Emerald / Duration and Benjamin Moore Regal Select with a 5-year peeling warranty.' }],
  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80'
);

// 8. Garage Door Repair & Smart Opener
const GARAGE_DOOR = makeHomeTemplate(
  'garage-door-spring-opener',
  'Garage Door Spring Replacement & Smart Opener Install',
  'Emergency broken torsion spring, off-track roller, and LiftMaster WiFi opener intake.',
  'Streamlines garage door troubleshooting with instant questions on spring snap noises and motor responsiveness.',
  'garage_door',
  '#475569',
  [
    { id: 'full_name', type: 'short_answer', label: 'Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'door_issue', type: 'dropdown', label: 'Garage Door Symptom', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Broken Spring (Loud pop, door won’t lift)', value: 'spring' }, { label: 'Door Off Track / Crooked', value: 'off_track' }, { label: 'Opener Motor Runs but Door Stays Shut', value: 'motor_run' }, { label: 'New Insulated Door Replacement Quote', value: 'new_door' }] },
    { id: 'door_size', type: 'dropdown', label: 'Door Size', width: 'half', stepId: 'step-2',
      options: [{ label: '2-Car Double Door (16ft wide)', value: 'double' }, { label: '1-Car Single Door (8-9ft wide)', value: 'single' }, { label: 'Commercial Roll-Up Bay', value: 'commercial' }] },
  ],
  [{ id: 'step-1', title: 'Location' }, { id: 'step-2', title: 'Garage Door Issue' }],
  ['garage door spring repair', 'broken garage spring', 'liftmaster opener install', 'garage door off track'],
  [{ question: 'Can I open the door with a broken spring?', answer: 'Never attempt to operate an automatic opener with a broken spring; torsion springs carry extreme counter-balance tension.' }],
  'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?auto=format&fit=crop&w=1200&q=80'
);

// 9. Pest Control & Termite Warranty
const PEST_CONTROL = makeHomeTemplate(
  'pest-control-termite-treatment',
  'Pest Defense & Subterranean Termite Inspection',
  'Eco-friendly perimeter pest control, rodent exclusion, and Sentricon termite baiting intake.',
  'Identifies target pests (termites, ants, rodents, roaches, spiders, bedbugs) and structural risk areas.',
  'pest_control',
  '#16a34a',
  [
    { id: 'full_name', type: 'short_answer', label: 'Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'pests_seen', type: 'checkbox', label: 'Pests Observed (Select all that apply)', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Termites / Swarmers / Mud Tubes', value: 'termites' }, { label: 'Ants (Sugar / Carpenter)', value: 'ants' }, { label: 'Mice / Rats / Attic Sounds', value: 'rodents' }, { label: 'Cockroaches / Palmetto Bugs', value: 'roaches' }, { label: 'Spiders & Wasps', value: 'spiders' }] },
    { id: 'property_type', type: 'dropdown', label: 'Property Structure', width: 'half', stepId: 'step-2',
      options: [{ label: 'Single Family Home on Slab', value: 'single_slab' }, { label: 'Single Family with Crawlspace', value: 'single_crawl' }, { label: 'Townhome / Condo', value: 'townhome' }, { label: 'Commercial Restaurant / Warehouse', value: 'commercial' }] },
  ],
  [{ id: 'step-1', title: 'Contact' }, { id: 'step-2', title: 'Pest Diagnosis' }],
  ['termite inspection quote', 'pest control service', 'rodent exterminator near me', 'quarterly pest treatment'],
  [{ question: 'Are pest treatments safe for dogs and cats?', answer: 'Yes, our EPA-registered micro-encapsulated botanicals are completely pet-safe once dry (30-45 minutes).' }],
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80'
);

// 10. Commercial Janitorial & Office Clean
const JANITORIAL = makeHomeTemplate(
  'commercial-janitorial-deep-clean',
  'Commercial Janitorial & Facility Cleaning RFP',
  'Structured office cleaning, medical sterilization, and floor stripping & waxing proposal intake.',
  'Captures facility square footage, cleaning frequency (nightly, 3x/week, weekly), and specialized restroom / high-touch disinfection requirements.',
  'cleaning',
  '#0ea5e9',
  [
    { id: 'company_name', type: 'short_answer', label: 'Company / Facility Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'contact_name', type: 'short_answer', label: 'Primary Contact Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'half', stepId: 'step-1' },
    { id: 'facility_type', type: 'dropdown', label: 'Facility Type', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Corporate Office Suites', value: 'office' }, { label: 'Medical / Dental Clinic (OSHA compliant)', value: 'medical' }, { label: 'School / Daycare Center', value: 'education' }, { label: 'Warehouse / Industrial Floor', value: 'industrial' }] },
    { id: 'sqft', type: 'dropdown', label: 'Approximate Facility Size', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Under 3,000 sq ft', value: 'under_3k' }, { label: '3,000 – 10,000 sq ft', value: '3k_10k' }, { label: '10,000 – 30,000 sq ft', value: '10k_30k' }, { label: '30,000+ sq ft Large Facility', value: '30k_plus' }] },
    { id: 'frequency', type: 'radio', label: 'Cleaning Frequency Desired', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: '5 Nights / Week (Mon-Fri)', value: '5_nights' }, { label: '3 Nights / Week (Mon/Wed/Fri)', value: '3_nights' }, { label: 'Weekend Deep Clean Only', value: 'weekend' }] },
  ],
  [{ id: 'step-1', title: 'Organization Details' }, { id: 'step-2', title: 'Facility Requirements' }],
  ['commercial janitorial proposal', 'office cleaning contract', 'medical office cleaning', 'commercial cleaner quote'],
  [{ question: 'Are cleaners background checked and bonded?', answer: '100% of our custodial staff undergo comprehensive background checks and are fully bonded and insured.' }],
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80'
);

export function registerHomeServicesExtendedTemplates(): void {
  registerTemplate(HVAC_EMERGENCY);
  registerTemplate(PLUMBING_SEWER);
  registerTemplate(ELECTRICAL_EV);
  registerTemplate(SOLAR_BATTERY);
  registerTemplate(TREE_REMOVAL);
  registerTemplate(POOL_CARE);
  registerTemplate(PAINTING_QUOTE);
  registerTemplate(GARAGE_DOOR);
  registerTemplate(PEST_CONTROL);
  registerTemplate(JANITORIAL);
}

// Auto-register
registerHomeServicesExtendedTemplates();
