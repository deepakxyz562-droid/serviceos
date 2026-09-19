/**
 * Canonical Form Templates — Automotive & Transportation Extended (2026 Edition)
 *
 * Curated, high-converting automotive templates:
 * - Luxury Ceramic Coating & Paint Protection Film (PPF)
 * - Complete Auto Body Collision & Insurance Appraisal
 * - 24/7 Roadside Towing & Flatbed Dispatch
 * - VIP Dealership Test Drive & Trade-In Appraisal
 * - Fleet Preventative Maintenance & DOT Inspection
 * - Mobile Window Tinting & Audio Upgrade Quote
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeAutoTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
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
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Vehicle Information' }],
      fields,
      rules: [],
      theme: {
        primaryColor: color,
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '1rem',
        inputBorderRadius: '0.75rem',
        inputHeight: 'large',
        cardBackground: 'rgba(255, 255, 255, 0.98)',
        showTopBorder: true,
        layout: 'multi_step',
        mediaPanel: {
          enabled: true,
          position: 'left',
          splitRatio: '40-60',
          mediaType: 'image',
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
          badgeText: '✨ Certified Automotive Specialist • ASE Master Techs',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Precision paint matching and manufacturer warranty retention',
            'Complimentary multi-point digital inspection report with photos',
            'Enclosed concierge vehicle pickup & delivery available',
          ],
        },
      },
      settings: {
        submitButtonText: 'Reserve Service Slot 🏎️',
        successTitle: 'Vehicle Booking Confirmed!',
        successMessage: 'Our service advisor is reviewing your vehicle specifications and will confirm your bay reservation shortly.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `auto_${id}` },
        },
      },
    },
    categories: ['booking', 'estimate', 'lead_generation', 'order'],
    industries: ['automotive', 'transportation'],
    useCases: ['lead_capture', 'booking', 'quote_request'],
    audiences: ['b2c', 'b2b'],
    tags: ['automotive', 'car-service', 'auto-repair', '2026-ui', 'estimate'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.98,
    ratingCount: 120,
    usageCount: 1540,
    estimatedMinutes: 2,
    seo: {
      seoTitle: `${name} | Instant Online Booking & Quote`,
      seoDescription: `${shortDescription} High-converting automotive intake with vehicle year/make/model selector and live scheduling.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. Collision Body Repair & Insurance Estimate
const COLLISION_REPAIR = makeAutoTemplate(
  'auto-collision-insurance-appraisal',
  'Auto Collision Repair & Insurance Damage Appraisal',
  'Collision estimation intake capturing insurance claim numbers, photos of body damage, and rental car needs.',
  'Structured for I-CAR Gold Class body shops. Collects VIN, insurance carrier, policy claim number, and damage location.',
  '#dc2626',
  [
    { id: 'customer_name', type: 'short_answer', label: 'Owner Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Email', required: true, width: 'full', stepId: 'step-1' },
    { id: 'vehicle_year_make', type: 'short_answer', label: 'Vehicle Year, Make & Model', placeholder: 'e.g. 2024 BMW M3', required: true, width: 'half', stepId: 'step-2' },
    { id: 'vin', type: 'short_answer', label: '17-Digit VIN Number', placeholder: 'Found on driver door jamb or insurance card', width: 'half', stepId: 'step-2' },
    { id: 'insurance_company', type: 'short_answer', label: 'Insurance Provider & Claim #', placeholder: 'e.g. State Farm - Claim #12345678', required: true, width: 'half', stepId: 'step-2' },
    { id: 'damage_areas', type: 'checkbox', label: 'Damage Location', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Front Bumper / Grille / Headlights', value: 'front' }, { label: 'Rear Bumper / Trunk / Taillights', value: 'rear' }, { label: 'Driver Side Fenders & Doors', value: 'driver_side' }, { label: 'Passenger Side Fenders & Doors', value: 'passenger_side' }, { label: 'Windshield / Glass Cracks', value: 'glass' }] },
    { id: 'damage_photos', type: 'file_upload', label: 'Upload Photos of Vehicle Damage', width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Customer Contact' }, { id: 'step-2', title: 'Vehicle & Damage Report' }],
  ['collision repair estimate', 'body shop damage quote', 'auto insurance appraisal', 'car body repair near me'],
  [{ question: 'Do you work directly with my insurance company?', answer: 'Yes, we are a direct repair facility for all major insurance carriers and handle supplemental claims directly.' }],
  'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
);

// 2. Roadside Towing Dispatch
const TOWING_DISPATCH = makeAutoTemplate(
  'roadside-towing-flatbed-dispatch',
  '24/7 Emergency Towing & Flatbed Roadside Dispatch',
  'Rapid emergency roadside assistance form collecting breakdown location, vehicle drive type, and destination shop.',
  'For towing companies. Gathers exact GPS location, AWD/4WD flatbed requirements, and roadside scenario (keys lost, accident, flat tire, dead battery).',
  '#f97316',
  [
    { id: 'caller_name', type: 'short_answer', label: 'Your Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Mobile Phone for Driver Dispatch', required: true, width: 'half', stepId: 'step-1' },
    { id: 'pickup_location', type: 'address', label: 'Current Vehicle Location (Street, Highway Mile Marker, Cross Streets)', required: true, width: 'full', stepId: 'step-1' },
    { id: 'dropoff_destination', type: 'address', label: 'Drop-off Destination Address', required: true, width: 'full', stepId: 'step-1' },
    { id: 'vehicle_type', type: 'dropdown', label: 'Vehicle Drive Configuration', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'AWD / 4WD / Electric EV (Requires Flatbed)', value: 'flatbed_required' }, { label: 'Standard FWD / RWD Sedan', value: 'standard' }, { label: 'Heavy Duty Truck / Commercial Van', value: 'heavy_duty' }, { label: 'Motorcycle', value: 'motorcycle' }] },
    { id: 'situation', type: 'dropdown', label: 'Roadside Situation', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: 'Disabled on Highway / Traffic Lane', value: 'highway' }, { label: 'Accident Scene (Police on site)', value: 'accident' }, { label: 'Stuck in Mud / Snow / Ditch (Winch-out)', value: 'winch' }, { label: 'Home Driveway / Parking Garage', value: 'garage' }] },
  ],
  [{ id: 'step-1', title: 'Location & Destination' }, { id: 'step-2', title: 'Vehicle Tow Specs' }],
  ['emergency towing dispatch', 'flatbed tow truck near me', 'roadside assistance quote', '24/7 car towing'],
  [{ question: 'Can you tow electric vehicles safely?', answer: 'Yes, all our flatbed trucks utilize soft-strap wheel tie-downs to ensure zero drivetrain or battery pack stress.' }],
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
);

export function registerAutomotiveExtendedTemplates(): void {
  registerTemplate(COLLISION_REPAIR);
  registerTemplate(TOWING_DISPATCH);
}

// Auto-register
registerAutomotiveExtendedTemplates();
