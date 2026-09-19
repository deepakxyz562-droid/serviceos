/**
 * Canonical Form Templates — 2-Part Split Media (Elementor-Style).
 *
 * This file registers curated, high-converting 2-part split forms:
 *   • Left Column: Video/Image Hero with trust badges, headlines, and value propositions.
 *   • Right Column: 5-6 streamlined form fields with inline styling.
 *
 * Importing this module (via index.ts) populates the registry.
 */
import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

// ─── 1. Elementor HVAC Service & Fast Estimate Split Form ───────────────────
const HVAC_SPLIT_ESTIMATE_TEMPLATE: FormTemplate = {
  id: 'elementor-hvac-split-estimate',
  name: 'HVAC 2-Part Split Hero Consultation',
  shortDescription:
    'Elementor-style 2-part split layout with technician video hero and instant quote request form.',
  description:
    'High-converting 2-part split form featuring a professional HVAC hero video/image on the left with trust badges, and a 6-field priority quote request on the right. Perfect for emergency heating/cooling inquiries and equipment upgrades.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Service Details' }],
    fields: [
      {
        id: 'full_name',
        type: 'short_answer',
        label: 'Full Name',
        placeholder: 'John Doe',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Mobile Phone',
        placeholder: '(555) 000-0000',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'service_type',
        type: 'dropdown',
        label: 'Service Needed',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'AC Repair / Emergency', value: 'ac_repair' },
          { label: 'Heating / Furnace Repair', value: 'heating_repair' },
          { label: 'Complete System Replacement', value: 'system_replacement' },
          { label: 'Seasonal Maintenance Tune-Up', value: 'maintenance' },
          { label: 'Duct Cleaning & Air Quality', value: 'duct_cleaning' },
        ],
      },
      {
        id: 'urgency',
        type: 'radio',
        label: 'Urgency Level',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'Emergency (Today)', value: 'emergency' },
          { label: 'Within 48 Hours', value: 'within_48h' },
          { label: 'Flexible / Next Week', value: 'flexible' },
        ],
      },
      {
        id: 'property_address',
        type: 'address',
        label: 'Service Address',
        placeholder: '123 Main St, City, State, ZIP',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'notes',
        type: 'long_answer',
        label: 'Describe your issue or current unit model',
        placeholder: 'Any specific noises, leaking, or error codes...',
        width: 'full',
        stepId: 'step-1',
      },
    ],
    rules: [],
    theme: {
      primaryColor: '#0284c7',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'split_media',
      mediaPanel: {
        enabled: true,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
        ratio: '50_50',
        aspectRatio: '16_9',
        badge: '⭐ 4.9/5 Certified Pro • 24/7 Response',
        headline: 'Fast, Reliable Heating & Cooling When You Need It Most',
        subtitle:
          'Licensed technicians dispatched with fully stocked trucks. Upfront flat-rate pricing with zero hidden surprises.',
        bullets: [
          'Same-Day Emergency Dispatch Available',
          '100% Satisfaction & Money-Back Guarantee',
          'Upfront Transparent Pricing Before Work Starts',
          'Fully Licensed, Bonded & Insured Master Techs',
        ],
        mobileBehavior: 'stack-top',
      },
    },
    settings: {
      formLayout: 'split_media',
      submitButtonText: 'Get Free Fast Estimate ⚡',
      successTitle: 'Quote Request Received!',
      successMessage:
        'A certified HVAC specialist is reviewing your request and will call you within 15 minutes to confirm.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'split_hvac_estimate' },
      },
    },
  },
  categories: ['quote', 'estimate', 'lead_generation', 'booking'],
  industries: ['hvac', 'home_services'],
  useCases: ['lead_capture', 'quote_request', 'emergency_booking'],
  audiences: ['residential', 'commercial'],
  tags: ['split-screen', 'elementor', 'hvac', 'instant-quote', 'video-hero', 'lead-capture'],
  fieldTypes: ['short_answer', 'phone', 'email', 'dropdown', 'radio', 'address', 'long_answer'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  rating: 4.96,
  ratingCount: 142,
  usageCount: 1850,
  estimatedMinutes: 2,
  seo: {
    seoTitle: 'Elementor-Style HVAC 2-Part Split Quote & Consultation Form',
    seoDescription: 'High-converting 2-part split form with video hero, trust badges, and rapid quote intake for HVAC contractors.',
    seoKeywords: ['hvac split form', 'elementor form', '2 part split form', 'hvac quote request'],
    faq: [
      {
        question: 'Can I customize the video or image in the left hero panel?',
        answer: 'Yes! Click directly on the left hero panel in the AI Form Builder Studio to change the media type (video/image), YouTube/Vimeo URL, aspect ratio, trust badge, headline, and bullet points.',
      },
      {
        question: 'How does the split form look on mobile devices?',
        answer: 'On mobile screens, the form automatically stacks gracefully with options to display a top hero banner, compact badge, or prioritize the form fields for fast loading.',
      },
    ],
  },
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
};

// ─── 2. Elementor Roofing & Siding Consultation Split Form ──────────────────
const ROOFING_SPLIT_ESTIMATE_TEMPLATE: FormTemplate = {
  id: 'elementor-roofing-split-consultation',
  name: 'Roofing & Solar Inspection Split Form',
  shortDescription:
    'Split-screen Elementor form featuring roof inspection hero video and drone estimate booking.',
  description:
    'Designed for roofing and exterior contractors. Displays high-impact visual media on the left highlighting warranty and craftsmanship, with an easy 6-field booking form on the right.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Inspection Request' }],
    fields: [
      {
        id: 'full_name',
        type: 'short_answer',
        label: 'Homeowner Name',
        placeholder: 'Sarah Jenkins',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: '(555) 234-5678',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'sarah@example.com',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'service_needed',
        type: 'dropdown',
        label: 'Service Interested In',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'Free Drone Roof Inspection', value: 'drone_inspection' },
          { label: 'Storm Damage & Leak Repair', value: 'storm_damage' },
          { label: 'Full Roof Replacement', value: 'roof_replacement' },
          { label: 'Gutters & Siding Upgrade', value: 'gutters_siding' },
          { label: 'Solar Roofing Integration', value: 'solar' },
        ],
      },
      {
        id: 'roof_age',
        type: 'dropdown',
        label: 'Approximate Roof Age',
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: 'Under 5 years', value: 'under_5' },
          { label: '5 to 15 years', value: '5_15' },
          { label: '15 to 25+ years', value: '15_plus' },
          { label: 'Not sure', value: 'unknown' },
        ],
      },
      {
        id: 'address',
        type: 'address',
        label: 'Property Address',
        placeholder: 'Street, City, State, ZIP',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'damage_photos',
        type: 'file_upload',
        label: 'Upload Photos of Leaks / Damage (Optional)',
        width: 'full',
        stepId: 'step-1',
      },
    ],
    rules: [],
    theme: {
      primaryColor: '#e11d48',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'split_media',
      mediaPanel: {
        enabled: true,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        ratio: '50_50',
        aspectRatio: '16_9',
        badge: '🛡️ 50-Year Non-Prorated Warranty',
        headline: 'Protect Your Home with Premium Roofing Solutions',
        subtitle:
          'Get a comprehensive 21-point drone inspection report and exact estimate with zero obligation.',
        bullets: [
          'Certified Master Elite Roof Installers',
          'Assistance with Insurance Storm Claims',
          'Flexible 0% APR Financing Plans Available',
          'Lifetime Craftsmanship & Material Warranty',
        ],
        mobileBehavior: 'stack-top',
      },
    },
    settings: {
      formLayout: 'split_media',
      submitButtonText: 'Book Free Inspection 🏡',
      successTitle: 'Inspection Requested!',
      successMessage: 'Our roofing coordinator will contact you shortly to confirm your drone inspection slot.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'split_roofing_consultation' },
      },
    },
  },
  categories: ['quote', 'estimate', 'lead_generation', 'inspection'],
  industries: ['construction', 'home_services', 'real_estate'],
  useCases: ['lead_capture', 'quote_request'],
  audiences: ['residential', 'commercial'],
  tags: ['split-screen', 'elementor', 'roofing', 'drone-inspection', 'hero-media'],
  fieldTypes: ['short_answer', 'phone', 'email', 'dropdown', 'address', 'file_upload'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  rating: 4.94,
  ratingCount: 98,
  usageCount: 1240,
  estimatedMinutes: 2,
  seo: {
    seoTitle: 'Elementor-Style Roofing & Drone Inspection Split Form',
    seoDescription: 'Split-screen Elementor form featuring roof inspection hero video and drone estimate booking.',
    seoKeywords: ['roofing split form', 'drone roof estimate', 'roof replacement form'],
    faq: [
      {
        question: 'Can homeowners upload photos of roof leaks?',
        answer: 'Yes, the built-in file upload field lets homeowners upload photos and videos of roof leaks and storm damage directly.',
      },
      {
        question: 'Does this template support self-hosted videos?',
        answer: 'Yes, you can paste any direct MP4 link, YouTube URL, or Vimeo URL into the left media panel.',
      },
    ],
  },
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
};

// ─── 3. Elementor Luxury Auto Detailing & Ceramic Coating Split Form ────────
const AUTO_DETAIL_SPLIT_TEMPLATE: FormTemplate = {
  id: 'elementor-auto-detail-split',
  name: 'Luxury Auto Detailing & Ceramic Booking',
  shortDescription:
    'Split-screen Elementor form featuring studio auto detailing video hero and package selector.',
  description:
    'Modern high-end automotive service booking form. Left column highlights ceramic coating protection benefits and video showcase, while the right provides quick package selection and scheduling.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Package & Booking' }],
    fields: [
      {
        id: 'client_name',
        type: 'short_answer',
        label: 'Your Name',
        placeholder: 'Alex Rivera',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: '(555) 345-6789',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'alex@example.com',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'vehicle_info',
        type: 'short_answer',
        label: 'Vehicle Year, Make & Model',
        placeholder: 'e.g. 2024 Porsche 911 GT3',
        required: true,
        width: 'full',
        stepId: 'step-1',
      },
      {
        id: 'package_type',
        type: 'dropdown',
        label: 'Select Service Package',
        required: true,
        width: 'half',
        stepId: 'step-1',
        options: [
          { label: '5-Year Ceramic Coating Package', value: 'ceramic_5yr' },
          { label: 'Paint Protection Film (PPF) Front Track', value: 'ppf_track' },
          { label: 'Full Interior Deep Steam Detail', value: 'interior_steam' },
          { label: 'Signature Exterior Paint Correction', value: 'paint_correction' },
        ],
      },
      {
        id: 'preferred_date',
        type: 'date',
        label: 'Preferred Appointment Date',
        required: true,
        width: 'half',
        stepId: 'step-1',
      },
    ],
    rules: [],
    theme: {
      primaryColor: '#6366f1',
      backgroundColor: '#09090b',
      textColor: '#f8fafc',
      borderRadius: '0.75rem',
      layout: 'split_media',
      mediaPanel: {
        enabled: true,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
        ratio: '50_50',
        aspectRatio: '16_9',
        badge: '✨ Gtechniq & XPEL Certified Studio',
        headline: 'Showroom Shine & Permanent Surface Protection',
        subtitle:
          'State-of-the-art climate controlled detailing studio specializing in exotic, luxury, and daily vehicles.',
        bullets: [
          'Multi-Stage Paint Correction & Swirl Removal',
          'Hydrophobic 9H Ceramic & Graphene Coating',
          'Self-Healing XPEL Paint Protection Film',
          'Complimentary Enclosed Concierge Pickup',
        ],
        mobileBehavior: 'stack-top',
      },
    },
    settings: {
      formLayout: 'split_media',
      submitButtonText: 'Reserve My Studio Spot 🚀',
      successTitle: 'Reservation Requested!',
      successMessage: 'We have reserved your appointment slot. Our studio concierge will contact you to finalize details.',
      actions: {
        sendEmailNotification: { enabled: true, toEmails: [] },
        createCrmLead: { enabled: true, source: 'split_auto_detail' },
      },
    },
  },
  categories: ['booking', 'appointment', 'lead_generation', 'order'],
  industries: ['automotive', 'hospitality'],
  useCases: ['lead_capture', 'booking'],
  audiences: ['b2c', 'residential'],
  tags: ['split-screen', 'elementor', 'automotive', 'luxury', 'detailing', 'ceramic-coating'],
  fieldTypes: ['short_answer', 'phone', 'email', 'dropdown', 'date'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  rating: 4.98,
  ratingCount: 165,
  usageCount: 2120,
  estimatedMinutes: 2,
  seo: {
    seoTitle: 'Luxury Auto Detailing & Ceramic Coating Split Booking Form',
    seoDescription: 'Elementor 2-part split form for auto detailing studios, ceramic coating reservations, and paint protection booking.',
    seoKeywords: ['auto detailing split form', 'ceramic coating booking', 'car detail form'],
    faq: [
      {
        question: 'Can I add custom add-on options to the package dropdown?',
        answer: 'Yes, edit the package field in the studio to add custom packages, tint options, or tiered pricing.',
      },
      {
        question: 'Does this form work on dark mode websites?',
        answer: 'Yes, the theme includes dark background styling with high-contrast text presets.',
      },
    ],
  },
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
};

// Register all split-media templates
export function registerSplitMediaTemplates(): void {
  registerTemplate(HVAC_SPLIT_ESTIMATE_TEMPLATE);
  registerTemplate(ROOFING_SPLIT_ESTIMATE_TEMPLATE);
  registerTemplate(AUTO_DETAIL_SPLIT_TEMPLATE);
}

// Auto-register on import
registerSplitMediaTemplates();
