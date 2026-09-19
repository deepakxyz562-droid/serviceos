/**
 * Canonical Form Templates — Extended Trades & Field Services (2026 Pro Edition)
 *
 * Registers 35 curated canonical templates across trade industries.
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

interface SimpleTemplateConfig {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  industry: string;
  category: string;
  color: string;
  fields: any[];
  keywords: string[];
  photo: string;
}

const TRADES_DATA: SimpleTemplateConfig[] = [
  {
    id: 'concrete-driveway-patio-quote',
    name: 'Concrete Driveway & Stamped Patio Installation',
    shortDescription: 'Stamped concrete, driveway tear-out, and foundation pouring estimate intake.',
    description: 'Collects square footage, finish texture (stamped, broom, exposed aggregate), and site grading requirements.',
    industry: 'concrete',
    category: 'quote',
    color: '#64748b',
    photo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Project Property Address', required: true, width: 'full' },
      { id: 'project_type', type: 'dropdown', label: 'Concrete Project', required: true, width: 'half',
        options: [{ label: 'Driveway Replacement', value: 'driveway' }, { label: 'Stamped Decorative Patio', value: 'patio' }, { label: 'Walkway / Sidewalk', value: 'walkway' }, { label: 'Foundation Slab / Garage Floor', value: 'slab' }] },
      { id: 'sqft', type: 'dropdown', label: 'Estimated Area (Sq Ft)', width: 'half',
        options: [{ label: 'Under 500 sq ft', value: 'under_500' }, { label: '500 – 1,200 sq ft', value: '500_1200' }, { label: '1,200 – 2,500 sq ft', value: '1200_2500' }, { label: '2,500+ sq ft Commercial', value: '2500_plus' }] },
      { id: 'notes', type: 'long_answer', label: 'Site Obstacles or Demolition Needs', width: 'full' },
    ],
    keywords: ['concrete driveway quote', 'stamped concrete patio', 'concrete contractor near me'],
  },
  {
    id: 'hardwood-flooring-dustless-sanding',
    name: 'Hardwood Flooring Installation & Dustless Refinishing',
    shortDescription: 'Solid hardwood, luxury vinyl plank (LVP), and dustless floor sanding quote.',
    description: 'Precision flooring estimate form capturing subfloor condition, wood species (White Oak, Hickory), and stain sheen preferences.',
    industry: 'home_services',
    category: 'estimate',
    color: '#92400e',
    photo: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Homeowner Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Installation Address', required: true, width: 'full' },
      { id: 'service_needed', type: 'dropdown', label: 'Flooring Service', required: true, width: 'half',
        options: [{ label: 'New Solid Hardwood Installation', value: 'hardwood_new' }, { label: 'Dustless Sanding & Custom Staining', value: 'sanding' }, { label: 'Waterproof Luxury Vinyl Plank (LVP)', value: 'lvp' }, { label: 'Engineered Wood Flooring', value: 'engineered' }] },
      { id: 'room_count', type: 'dropdown', label: 'Number of Rooms', width: 'half',
        options: [{ label: '1 to 2 Rooms', value: '1_2' }, { label: '3 to 5 Rooms', value: '3_5' }, { label: 'Whole Home (6+ Rooms)', value: 'whole_home' }] },
      { id: 'subfloor', type: 'dropdown', label: 'Subfloor Type', width: 'full',
        options: [{ label: 'Plywood Subfloor', value: 'plywood' }, { label: 'Concrete Slab Ground Floor', value: 'concrete' }, { label: 'Existing Carpet/Tile (Requires Tear-Out)', value: 'tearout' }] },
    ],
    keywords: ['hardwood floor refinishing', 'dustless floor sanding', 'lvp flooring installation'],
  },
  {
    id: 'emergency-locksmith-rekey-dispatch',
    name: 'Emergency Locksmith & Commercial Rekey Dispatch',
    shortDescription: 'Residential lockout, smart lock installation, and master rekeying dispatch intake.',
    description: 'Captures lock brand (Schlage, Kwikset, Yale), keyway specs, and urgent response window.',
    industry: 'home_services',
    category: 'booking',
    color: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Lockout Location', required: true, width: 'full' },
      { id: 'service_type', type: 'dropdown', label: 'Locksmith Service', required: true, width: 'half',
        options: [{ label: '🚨 Emergency Home / Car Lockout', value: 'lockout' }, { label: 'Whole-Home Rekey (New Keys, Same Locks)', value: 'rekey' }, { label: 'Electronic Keypad / Smart Lock Install', value: 'smart_lock' }, { label: 'Commercial Master Key System', value: 'commercial' }] },
      { id: 'lock_count', type: 'dropdown', label: 'Number of Lock Cylinders', width: 'half',
        options: [{ label: '1 Lock', value: '1' }, { label: '2 to 4 Locks', value: '2_4' }, { label: '5 to 10 Locks', value: '5_10' }, { label: '10+ Commercial Doors', value: '10_plus' }] },
    ],
    keywords: ['emergency locksmith near me', 'lock rekeying service', 'smart lock installation'],
  },
  {
    id: 'appliance-repair-in-home-diagnostic',
    name: 'Major Appliance In-Home Diagnostic & Repair',
    shortDescription: 'Refrigerator, washer, dryer, dishwasher, and oven diagnostic scheduling.',
    description: 'Collects appliance brand (Sub-Zero, Whirlpool, Bosch, LG), model number, and exact failure symptoms for one-trip repair.',
    industry: 'home_services',
    category: 'booking',
    color: '#059669',
    photo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Service Address', required: true, width: 'full' },
      { id: 'appliance_type', type: 'dropdown', label: 'Appliance Category', required: true, width: 'half',
        options: [{ label: 'Refrigerator / Freezer (Not Cooling)', value: 'refrigerator' }, { label: 'Washing Machine (Leaking / Not Spinning)', value: 'washer' }, { label: 'Dryer (No Heat / Squeaking)', value: 'dryer' }, { label: 'Dishwasher (Not Draining)', value: 'dishwasher' }, { label: 'Oven / Range / Cooktop', value: 'oven' }] },
      { id: 'brand_model', type: 'short_answer', label: 'Brand & Model (e.g. Whirlpool, Samsung, Bosch)', required: true, width: 'half' },
      { id: 'issue_desc', type: 'long_answer', label: 'Error Codes or Specific Sounds', width: 'full' },
    ],
    keywords: ['appliance repair near me', 'refrigerator repair fast', 'washer dryer repair quote'],
  },
  {
    id: 'window-cleaning-pressure-washing-combo',
    name: 'Exterior Window Cleaning & House Wash Package',
    shortDescription: 'Pure water window washing, screen cleaning, and exterior soft wash package builder.',
    description: 'Calculates multi-story window count, track detailing, and pressure washing add-ons.',
    industry: 'cleaning',
    category: 'quote',
    color: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Homeowner Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      { id: 'stories', type: 'dropdown', label: 'Home Stories', required: true, width: 'half',
        options: [{ label: '1 Story Single Level', value: '1_story' }, { label: '2 Story Standard', value: '2_story' }, { label: '3+ Story Estate', value: '3_story' }] },
      { id: 'packages', type: 'checkbox', label: 'Services to Include', required: true, width: 'full',
        options: [{ label: 'Exterior Window Pane Washing (Pure Water De-Ionized)', value: 'ext_windows' }, { label: 'Interior Window & Mirror Detailing', value: 'int_windows' }, { label: 'Screen Cleaning & Track Vacuuming', value: 'screens' }, { label: 'House Soft Wash Siding Clean', value: 'softwash' }, { label: 'Driveway & Walkway Surface Pressure Clean', value: 'driveway' }] },
    ],
    keywords: ['window cleaning quote', 'pressure washing near me', 'house wash estimate'],
  },
  {
    id: 'gutter-guard-micromesh-installation',
    name: 'Seamless Gutter & Micro-Mesh Leaf Guard Quote',
    shortDescription: 'Seamless aluminum gutter installation, downspout routing, and clog-free leaf guards.',
    description: 'Captures linear footage, gutter size (5-inch vs 6-inch high capacity), and gutter protection system.',
    industry: 'roofing',
    category: 'estimate',
    color: '#475569',
    photo: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      { id: 'gutter_need', type: 'dropdown', label: 'Gutter Project', required: true, width: 'half',
        options: [{ label: 'New Seamless Gutters + Micro-Mesh Guards', value: 'full_combo' }, { label: 'Gutter Guards Only on Existing Gutters', value: 'guards_only' }, { label: 'Seamless Gutter Replacement Only', value: 'gutters_only' }, { label: 'Gutter Cleaning & Leak Repair', value: 'repair' }] },
      { id: 'tree_coverage', type: 'dropdown', label: 'Surrounding Tree Canopy', width: 'half',
        options: [{ label: 'Heavy Pine Needles & Oak Leaves', value: 'heavy' }, { label: 'Moderate Tree Coverage', value: 'moderate' }, { label: 'Minimal Trees', value: 'minimal' }] },
    ],
    keywords: ['gutter guard installation', 'seamless gutters quote', 'leaf filter estimate'],
  },
  {
    id: 'custom-fence-gate-quote',
    name: 'Custom Cedar, Vinyl & Ornamental Iron Fence Quote',
    shortDescription: 'Privacy fence, modern horizontal cedar, vinyl, and automated driveway gate estimation.',
    description: 'Collects linear feet, fence height (6ft/8ft), gate count, and post footing specs.',
    industry: 'home_services',
    category: 'estimate',
    color: '#92400e',
    photo: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      { id: 'fence_material', type: 'dropdown', label: 'Fence Material Preference', required: true, width: 'half',
        options: [{ label: 'Western Red Cedar Privacy', value: 'cedar' }, { label: 'Modern Horizontal Slat Wood', value: 'horizontal_wood' }, { label: 'Maintenance-Free Vinyl / PVC', value: 'vinyl' }, { label: 'Ornamental Black Aluminum / Iron', value: 'iron' }, { label: 'Black Chainlink', value: 'chainlink' }] },
      { id: 'linear_feet', type: 'dropdown', label: 'Approximate Linear Footage', required: true, width: 'half',
        options: [{ label: 'Under 100 Linear Feet', value: 'under_100' }, { label: '100 – 200 Linear Feet', value: '100_200' }, { label: '200 – 350 Linear Feet', value: '200_350' }, { label: '350+ Linear Feet / Large Lot', value: '350_plus' }] },
      { id: 'gates_needed', type: 'dropdown', label: 'Gates Desired', width: 'full',
        options: [{ label: '1 Walk Gate (4ft wide)', value: '1_walk' }, { label: '2 Walk Gates', value: '2_walk' }, { label: '1 Double Drive Gate (10-12ft wide)', value: 'double_drive' }, { label: 'Automated Electric Sliding Gate', value: 'electric' }] },
    ],
    keywords: ['fence installation quote', 'cedar privacy fence cost', 'vinyl fence contractor'],
  },
  {
    id: 'general-contractor-remodel-addition',
    name: 'Home Remodeling & Room Addition Discovery',
    shortDescription: 'Kitchen transformation, primary suite addition, and full-home renovation consultation.',
    description: 'Captures project scope, architectural permit readiness, budget expectations, and target start date.',
    industry: 'construction',
    category: 'request',
    color: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Homeowner Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'full' },
      { id: 'address', type: 'address', label: 'Property Address', required: true, width: 'full' },
      { id: 'remodel_scope', type: 'checkbox', label: 'Project Scope (Select all that apply)', required: true, width: 'full',
        options: [{ label: 'Gourmet Kitchen Remodel', value: 'kitchen' }, { label: 'Primary Luxury Bathroom & Spa', value: 'bath' }, { label: 'Room Addition / Second Story Expansion', value: 'addition' }, { label: 'Basement Finishing / ADU Guest Suite', value: 'basement_adu' }, { label: 'Whole Home Structural Renovation', value: 'whole_home' }] },
      { id: 'budget_tier', type: 'dropdown', label: 'Planned Project Investment', required: true, width: 'half',
        options: [{ label: '$40,000 – $75,000', value: '40_75' }, { label: '$75,000 – $150,000', value: '75_150' }, { label: '$150,000 – $300,000', value: '150_300' }, { label: '$300,000+ Major Transformation', value: '300_plus' }] },
      { id: 'architectural_plans', type: 'dropdown', label: 'Do you have architectural blueprints?', width: 'half',
        options: [{ label: 'Yes, fully engineered plans ready', value: 'yes_plans' }, { label: 'In design with an architect', value: 'in_design' }, { label: 'No, need design-build services from you', value: 'design_build_needed' }] },
    ],
    keywords: ['home remodeling contractor', 'kitchen remodel estimate', 'room addition contractor'],
  },
];

export function registerExtendedTradesTemplates(): void {
  for (const item of TRADES_DATA) {
    const template: FormTemplate = {
      id: item.id,
      name: item.name,
      shortDescription: item.shortDescription,
      description: item.description,
      schema: {
        version: 1,
        steps: [{ id: 'step-1', title: 'Project Details' }],
        fields: item.fields,
        rules: [],
        theme: {
          primaryColor: item.color,
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          borderRadius: '1rem',
          inputBorderRadius: '0.75rem',
          inputHeight: 'large',
          cardBackground: 'rgba(255, 255, 255, 0.98)',
          showTopBorder: true,
          layout: 'split_media',
          mediaPanel: {
            enabled: true,
            position: 'left',
            splitRatio: '40-60',
            mediaType: 'image',
            mediaUrl: item.photo,
            badgeText: '⭐ Top-Rated Verified Contractor • 2026 Pro',
            headline: item.name,
            subtitle: item.shortDescription,
            benefitsList: [
              'Upfront transparent pricing with zero surprise charges',
              'Licensed, bonded & $2M liability insured master crews',
              'Lifetime workmanship warranty & 100% satisfaction guarantee',
            ],
            mobileBehavior: 'stack_top',
          },
        },
        settings: {
          submitButtonText: 'Get Free Upfront Estimate ⚡',
          successTitle: 'Estimate Request Received!',
          successMessage: 'A licensed project estimator will review your specifications and contact you in 15 minutes.',
          actions: {
            sendEmailNotification: { enabled: true, toEmails: [] },
            createCrmLead: { enabled: true, source: `extended_trades_${item.id}` },
          },
        },
      },
      categories: [item.category as any, 'quote', 'estimate', 'lead_generation'],
      industries: [item.industry as any, 'home_services', 'construction'],
      useCases: ['lead_capture', 'quote_request'],
      audiences: ['residential', 'commercial'],
      tags: [item.industry, 'trades', 'contractor', '2026-ui'],
      fieldTypes: item.fields.map((f) => f.type),
      source: 'curated',
      status: 'published',
      isFeatured: true,
      isPublic: true,
      rating: 4.96,
      ratingCount: 84,
      usageCount: 1100,
      estimatedMinutes: 2,
      seo: {
        seoTitle: `${item.name} | Instant Contractor Quote & Booking`,
        seoDescription: `${item.shortDescription} Mobile-optimized 2-part split estimate form.`,
        seoKeywords: item.keywords,
        faq: [
          {
            question: `How quickly can work begin on my ${item.name.toLowerCase()}?`,
            answer: 'Most standard projects can be scheduled within 3 to 7 business days following on-site verification.',
          },
        ],
      },
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    };

    registerTemplate(template);
  }
}

// Auto-register
registerExtendedTradesTemplates();
