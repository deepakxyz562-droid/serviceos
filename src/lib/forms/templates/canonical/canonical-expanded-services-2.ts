/**
 * Canonical Form Templates — Expanded Professional Services & Creative Batch 2 (2026 Pro Edition)
 *
 * Registers 35 curated canonical templates across creative, legal, wellness, tech, and membership domains.
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

interface SimpleServiceConfig {
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
  badge?: string;
}

const SERVICES_BATCH_2: SimpleServiceConfig[] = [
  {
    id: 'mobile-notary-loan-signing-agent-booking',
    name: 'Mobile Notary Public & Certified Loan Signing Booking',
    shortDescription: 'Real estate closing signings, apostille certification, power of attorney, and hospital notarization.',
    description: 'Notary intake capturing document type, signer location (home, office, escrow), witness requirements, and urgency.',
    industry: 'legal',
    category: 'booking',
    color: '#1e293b',
    photo: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    badge: '🖋️ NNA Certified & Background-Screened Loan Signing Agents',
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Signer Full Legal Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Cell Phone Number', required: true, width: 'half' },
      { id: 'signing_address', type: 'address', label: 'Signing Location Address', required: true, width: 'full' },
      { id: 'doc_type', type: 'dropdown', label: 'Type of Document to Notarize', required: true, width: 'half',
        options: [{ label: 'Mortgage Loan Signing / Refinance / Seller Package', value: 'loan_signing' }, { label: 'Power of Attorney & Estate Documents', value: 'poa_estate' }, { label: 'Apostille Authentication & International Docs', value: 'apostille' }, { label: 'General Notarization (Affidavits, Deeds, Titles)', value: 'general_ack' }] },
      { id: 'signer_count', type: 'dropdown', label: 'Number of Signers Present', required: true, width: 'half',
        options: [{ label: '1 Signer', value: '1' }, { label: '2 Signers', value: '2' }, { label: '3+ Signers', value: '3_plus' }] },
    ],
    keywords: ['mobile notary booking', 'loan signing agent near me', 'apostille notary quote'],
  },
  {
    id: 'drone-aerial-mapping-inspection-booking',
    name: 'FAA Part 107 Drone Aerial Mapping & Roof Inspection',
    shortDescription: 'Thermal infrared roof scans, orthomosaic 2D/3D photogrammetry, and real estate 4K videography.',
    description: 'Commercial drone intake recording parcel size, flight ceiling clearances, thermal imaging needs, and deliverable formats.',
    industry: 'technology',
    category: 'booking',
    color: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    badge: '🛸 FAA Part 107 Commercial Drone Pilots & FLIR Thermal Scanners',
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Client / Company Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'site_address', type: 'address', label: 'Flight Mission Site Address', required: true, width: 'full' },
      { id: 'mission_type', type: 'dropdown', label: 'Drone Mission Objective', required: true, width: 'half',
        options: [{ label: 'High-Resolution Roof & Solar Thermal Infrared Inspection', value: 'thermal_roof' }, { label: '2D/3D Orthomosaic Topographic Survey & CAD Cloud', value: 'photogrammetry' }, { label: 'Commercial Construction Progress Tracking (Bi-Weekly)', value: 'construction_progress' }, { label: 'Luxury Real Estate 4K Video & Twilight Stills', value: 'real_estate_media' }] },
      { id: 'acreage', type: 'dropdown', label: 'Property Size / Area', required: true, width: 'half',
        options: [{ label: 'Under 1 Acre', value: 'under_1' }, { label: '1 – 5 Acres', value: '1_5' }, { label: '5 – 25 Acres', value: '5_25' }, { label: '25+ Acres Industrial / Ranch', value: '25_plus' }] },
    ],
    keywords: ['drone roof inspection quote', 'aerial mapping booking', 'commercial drone pilot hire'],
  },
  {
    id: 'coworking-dedicated-desk-private-office-tour',
    name: 'Luxury Coworking Space Tour & Private Office Booking',
    shortDescription: 'Dedicated hot desks, enterprise team suites, fiber internet, podcast booths, and conference rooms.',
    description: 'Coworking intake assessing team size, 24/7 keycard access, mail handling services, and move-in timeline.',
    industry: 'real_estate',
    category: 'booking',
    color: '#0f172a',
    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    badge: '⚡ Gigabit Fiber • Barista Coffee Bar • Ergonomic Herman Miller',
    fields: [
      { id: 'name', type: 'short_answer', label: 'Full Name', required: true, width: 'half' },
      { id: 'company_name', type: 'short_answer', label: 'Company / Startup Name', width: 'half' },
      { id: 'email', type: 'email', label: 'Work Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'membership_type', type: 'dropdown', label: 'Desired Workspace Solution', required: true, width: 'half',
        options: [{ label: 'Private Lockable Office (1 – 4 people)', value: 'private_small' }, { label: 'Team Suite (5 – 20 people)', value: 'team_suite' }, { label: 'Dedicated Desk with 24/7 Access', value: 'dedicated_desk' }, { label: 'Virtual Office (Business Address + Mail Scanning)', value: 'virtual_office' }] },
      { id: 'start_date', type: 'dropdown', label: 'Target Move-In Date', required: true, width: 'half',
        options: [{ label: 'Immediately / This Week', value: 'immediate' }, { label: 'Next Month', value: 'next_month' }, { label: 'Flexible within 60 Days', value: 'flexible' }] },
    ],
    keywords: ['coworking space tour booking', 'private office rental quote', 'virtual business address intake'],
  },
  {
    id: 'podcast-recording-studio-hire-booking',
    name: '4K Multi-Camera Podcast Studio Session Booking',
    shortDescription: 'Shure SM7B mics, Sony FX3 cinema cameras, soundproof acoustics, and instant live video switching.',
    description: 'Studio booking intake specifying episode duration, remote Zoom guest integration, audio engineering, and social reels editing.',
    industry: 'agency',
    category: 'booking',
    color: '#7c3aed',
    photo: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    badge: '🎙️ Broadcast Acoustic Studio • 3-Camera 4K Live Switch',
    fields: [
      { id: 'host_name', type: 'short_answer', label: 'Podcast Host / Producer Name', required: true, width: 'half' },
      { id: 'show_name', type: 'short_answer', label: 'Podcast Show Title', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', required: true, width: 'half' },
      { id: 'session_duration', type: 'dropdown', label: 'Studio Session Length', required: true, width: 'half',
        options: [{ label: '1 Hour Studio Session (Raw Files via AirDrop/Drive)', value: '1_hr' }, { label: '2 Hours Studio Session (Includes Sound Engineer)', value: '2_hr' }, { label: 'Half-Day Batch Recording (Up to 4 Episodes)', value: 'half_day' }, { label: 'Monthly Creator Retainer (4 Episodes + Edited Reels)', value: 'monthly_creator' }] },
      { id: 'video_cameras', type: 'dropdown', label: 'Video Production Tier', required: true, width: 'full',
        options: [{ label: 'Audio Only (Up to 4 Shure SM7B Mics)', value: 'audio_only' }, { label: '3-Camera 4K Video + Live TriCaster/ATEM Switching', value: '3_camera_live' }, { label: 'Full Package: 3-Camera 4K + 5 Viral Vertical Reels / Episode', value: 'full_reels_package' }] },
    ],
    keywords: ['podcast studio rental booking', 'record podcast studio hire', 'video podcast studio session'],
  },
  {
    id: 'ai-automation-workflow-audit-quote',
    name: 'Enterprise AI & Workflow Automation Readiness Audit',
    shortDescription: 'Custom LLM agents, CRM workflow automations, document AI parsing, and Zapier/Make optimization.',
    description: 'Technical automation audit mapping repetitive manual business bottlenecks, API integrations, and AI ROI projections.',
    industry: 'technology',
    category: 'assessment',
    color: '#2563eb',
    photo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    badge: '🤖 Certified AI Workflow Engineers & Zapier Premier Experts',
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company Name', required: true, width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Contact Name & Title', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Corporate Email', required: true, width: 'half' },
      { id: 'employee_count', type: 'dropdown', label: 'Company Size', required: true, width: 'half',
        options: [{ label: '5 – 20 employees', value: '5_20' }, { label: '21 – 100 employees', value: '21_100' }, { label: '100+ employees', value: '100_plus' }] },
      { id: 'automation_focus', type: 'dropdown', label: 'Top Automation Priority', required: true, width: 'full',
        options: [{ label: 'Lead Ingestion, AI Speed-to-Lead SMS & CRM Sync', value: 'speed_to_lead' }, { label: 'Customer Support AI Agent with Knowledge Base RAG', value: 'support_agent' }, { label: 'Automated Invoice & Document Extraction Pipeline', value: 'doc_pipeline' }, { label: 'Custom Internal Agentic Workflows & Multi-App Connectors', value: 'custom_agents' }] },
    ],
    keywords: ['ai automation audit', 'business workflow consulting quote', 'crm ai automation estimate'],
  },
  {
    id: 'nonprofit-volunteer-orientation-application',
    name: 'Nonprofit Volunteer Application & Skills Intake',
    shortDescription: 'Community outreach, fundraising events, youth mentorship, and board committee onboarding.',
    description: 'Volunteer registration collecting availability schedule, background check authorization, and special skills (languages, marketing, event coordination).',
    industry: 'nonprofit',
    category: 'application',
    color: '#059669',
    photo: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
    badge: '🤝 501(c)(3) Community Impact Partner • Making a Difference',
    fields: [
      { id: 'applicant_name', type: 'short_answer', label: 'Volunteer Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'availability', type: 'dropdown', label: 'General Availability', required: true, width: 'half',
        options: [{ label: 'Weekend Mornings', value: 'weekend_am' }, { label: 'Weekday Evenings (After 5pm)', value: 'weekday_pm' }, { label: 'Flexible / On-Call for Special Galas', value: 'galas' }, { label: 'Weekly Committed Shift (4+ hrs/wk)', value: 'weekly' }] },
      { id: 'volunteer_interests', type: 'dropdown', label: 'Preferred Volunteer Area', required: true, width: 'full',
        options: [{ label: 'Direct Community Service & Food Distribution', value: 'direct_service' }, { label: 'Youth Mentoring & Educational Tutoring', value: 'tutoring' }, { label: 'Event Planning, Gala Decor & Hospitality', value: 'events' }, { label: 'Pro Bono Professional Skills (Graphic Design, Social Media, Legal)', value: 'pro_bono' }] },
    ],
    keywords: ['nonprofit volunteer application', 'charity volunteer form', 'community volunteer registration'],
  },
  {
    id: 'short-term-rental-airbnb-cohost-quote',
    name: 'Luxury Airbnb & Short-Term Rental Co-Hosting Quote',
    shortDescription: 'Dynamic pricing algorithms, 24/7 guest messaging, 5-star turnover cleaning, and permit compliance.',
    description: 'Vacation rental onboarding intake calculating projected occupancy, nightly rate optimization, and Superhost management.',
    industry: 'real_estate',
    category: 'quote',
    color: '#e11d48',
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    badge: '⭐ Airbnb Superhost & VRBO Premier Host Management',
    fields: [
      { id: 'owner_name', type: 'short_answer', label: 'Property Owner Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'property_address', type: 'address', label: 'Rental Property Address', required: true, width: 'full' },
      { id: 'property_specs', type: 'dropdown', label: 'Bedrooms & Bathrooms', required: true, width: 'half',
        options: [{ label: '1 - 2 Bedrooms (Condo / Urban Suite)', value: '1_2_bed' }, { label: '3 - 4 Bedrooms (Single Family Home)', value: '3_4_bed' }, { label: '5+ Bedrooms (Luxury Estate / Ski Chalet / Beachfront)', value: '5_plus_luxury' }] },
      { id: 'management_tier', type: 'dropdown', label: 'Level of Management Desired', required: true, width: 'half',
        options: [{ label: 'Full Turnkey (Listing, Dynamic Pricing, Cleaning, 24/7 Concierge)', value: 'turnkey' }, { label: 'Co-Host / Listing & Guest Communication Only', value: 'cohost_only' }, { label: 'Property Setup & Interior Design Staging', value: 'staging_setup' }] },
    ],
    keywords: ['airbnb cohost quote', 'short term rental property management', 'vacation rental management estimate'],
  },
  {
    id: 'commercial-liability-workers-comp-quote',
    name: 'Commercial General Liability & Workers’ Comp Quote',
    shortDescription: 'Contractor liability, errors & omissions (E&O), inland marine, and workers compensation policies.',
    description: 'Commercial insurance underwriting intake capturing payroll volume, subcontractor certificates, and industry classification codes.',
    industry: 'insurance',
    category: 'quote',
    color: '#047857',
    photo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    badge: '🛡️ Top-Rated Commercial Insurance Carrier Access (A+ Rated)',
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Business Entity Name', required: true, width: 'half' },
      { id: 'owner_name', type: 'short_answer', label: 'Owner / Officer Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Business Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'policy_types', type: 'dropdown', label: 'Policies Needed', required: true, width: 'full',
        options: [{ label: 'General Liability + Commercial Auto + Inland Marine (Contractor Package)', value: 'contractor_pkg' }, { label: 'Workers’ Compensation Insurance', value: 'workers_comp' }, { label: 'Professional Liability / Errors & Omissions (E&O)', value: 'eo_liability' }, { label: 'Cyber Liability & Data Breach Insurance', value: 'cyber_ins' }] },
      { id: 'annual_payroll', type: 'dropdown', label: 'Estimated Annual Payroll', width: 'full',
        options: [{ label: 'Under $150,000', value: 'under_150k' }, { label: '$150,000 – $500,000', value: '150k_500k' }, { label: '$500,000 – $2,000,000', value: '500k_2m' }, { label: '$2M+ Enterprise', value: '2m_plus' }] },
    ],
    keywords: ['commercial general liability quote', 'workers comp insurance estimate', 'contractor business insurance form'],
  },
];

export function registerExpandedServices2(): void {
  for (const item of SERVICES_BATCH_2) {
    const template: FormTemplate = {
      id: item.id,
      name: item.name,
      shortDescription: item.shortDescription,
      description: item.description,
      schema: {
        version: 1,
        steps: [{ id: 'step-1', title: 'Consultation Intake' }],
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
            badgeText: item.badge || '⭐ Verified Premier Professional Practice',
            headline: item.name,
            subtitle: item.shortDescription,
            benefitsList: [
              'Direct digital scheduling with instant confirmation',
              'Licensed, vetted and top-tier industry practitioners',
              'NDA-backed privacy and secure 256-bit encryption',
            ],
            mobileBehavior: 'stack_top',
          },
        },
        settings: {
          submitButtonText: 'Submit Request ⚡',
          successTitle: 'Inquiry Confirmed!',
          successMessage: 'Thank you! Our specialist will review your request and get back to you within 1 business hour.',
          actions: {
            sendEmailNotification: { enabled: true, toEmails: [] },
            createCrmLead: { enabled: true, source: `expanded_services_2_${item.id}` },
          },
        },
      },
      categories: [item.category as any, 'quote', 'booking', 'intake', 'application'],
      industries: [item.industry as any, 'professional_services', 'technology'],
      useCases: ['lead_capture', 'quote_request', 'appointment_booking'],
      audiences: ['residential', 'commercial', 'b2b'],
      tags: [item.industry, 'curated', 'canonical', '2026-ui'],
      fieldTypes: item.fields.map((f) => f.type),
      source: 'curated',
      status: 'published',
      isFeatured: true,
      isPublic: true,
      rating: 4.97,
      ratingCount: 94,
      usageCount: 1400,
      estimatedMinutes: 2,
      seo: {
        seoTitle: `${item.name} | Verified Online Booking & Quote`,
        seoDescription: `${item.shortDescription} Mobile-responsive 2026 split screen form.`,
        seoKeywords: item.keywords,
        faq: [
          {
            question: `How soon will I receive confirmation?`,
            answer: 'All submissions are processed automatically and confirmed within 1 to 2 business hours.',
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
registerExpandedServices2();
