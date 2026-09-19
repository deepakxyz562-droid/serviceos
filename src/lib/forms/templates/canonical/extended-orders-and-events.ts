/**
 * Canonical Form Templates — Extended Events, Hospitality, Luxury Rentals & Catering (2026 Pro Edition)
 *
 * Registers curated canonical templates across hospitality, catering, wedding venues, and reservations.
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

interface SimpleEventConfig {
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

const EVENT_DATA: SimpleEventConfig[] = [
  {
    id: 'luxury-wedding-venue-tour-booking',
    name: 'Luxury Estate Wedding Venue Tour & Booking',
    shortDescription: 'Private estate walkthrough, bridal suite preview, and weekend package inquiry.',
    description: 'Captures estimated wedding date, guest headcount, indoor/outdoor ceremony preferences, and catering style.',
    industry: 'events',
    category: 'booking',
    color: '#be185d',
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    badge: '💍 Top 10 Luxury Wedding Venue in 2026',
    fields: [
      { id: 'couple_names', type: 'short_answer', label: 'Couple Names (e.g., Sarah & Michael)', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Primary Contact Phone', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'guest_count', type: 'dropdown', label: 'Estimated Guest Count', required: true, width: 'half',
        options: [{ label: 'Intimate (50 – 100 guests)', value: '50_100' }, { label: 'Medium (100 – 200 guests)', value: '100_200' }, { label: 'Large (200 – 350 guests)', value: '200_350' }, { label: 'Grand Gala (350+ guests)', value: '350_plus' }] },
      { id: 'target_season', type: 'dropdown', label: 'Target Wedding Season / Year', required: true, width: 'half',
        options: [{ label: 'Spring 2026', value: 'spring_26' }, { label: 'Summer 2026', value: 'summer_26' }, { label: 'Fall 2026', value: 'fall_26' }, { label: 'Winter / 2027', value: '2027' }] },
      { id: 'budget_bracket', type: 'dropdown', label: 'Total Wedding Investment Budget', width: 'half',
        options: [{ label: '$40,000 – $75,000', value: '40k_75k' }, { label: '$75,000 – $150,000', value: '75k_150k' }, { label: '$150,000 – $300,000+', value: '150k_300k' }] },
      { id: 'special_requests', type: 'long_answer', label: 'Vision, Specific Dates, or Special Celebrations', width: 'full' },
    ],
    keywords: ['wedding venue tour booking', 'luxury estate wedding quote', 'bridal venue reservation'],
  },
  {
    id: 'artisan-catering-tasting-quote',
    name: 'Artisan Corporate Catering & Private Chef Tasting',
    shortDescription: 'Plated 5-course dinners, farm-to-table buffets, and cocktail bar staffing.',
    description: 'Culinary intake form detailing dietary restrictions (GF/Vegan), bar service options, tableware rentals, and service style.',
    industry: 'hospitality',
    category: 'quote',
    color: '#ca8a04',
    photo: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
    badge: '🍽️ Michelin-Trained Executive Culinary Team',
    fields: [
      { id: 'host_name', type: 'short_answer', label: 'Host / Organizer Name', required: true, width: 'half' },
      { id: 'company_name', type: 'short_answer', label: 'Company / Organization (if applicable)', width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'event_date', type: 'date', label: 'Event Date', required: true, width: 'half' },
      { id: 'event_type', type: 'dropdown', label: 'Event Style', required: true, width: 'half',
        options: [{ label: 'Plated Multi-Course Dinner', value: 'plated' }, { label: 'Interactive Chef Stations & Passed Canapés', value: 'stations' }, { label: 'Upscale Family-Style Buffet', value: 'buffet' }, { label: 'Corporate Lunch & All-Day Beverage Bar', value: 'corporate_lunch' }] },
      { id: 'guest_count', type: 'dropdown', label: 'Number of Guests', required: true, width: 'half',
        options: [{ label: '20 – 50 guests', value: '20_50' }, { label: '50 – 150 guests', value: '50_150' }, { label: '150 – 400 guests', value: '150_400' }, { label: '400+ guests', value: '400_plus' }] },
      { id: 'dietary_needs', type: 'short_answer', label: 'Dietary Restrictions (Gluten-Free, Vegan, Halal, Kosher, Nut Allergies)', width: 'full' },
    ],
    keywords: ['corporate catering quote', 'private chef tasting booking', 'wedding catering estimate'],
  },
  {
    id: 'luxury-yacht-boat-charter-booking',
    name: 'Private Yacht Charter & Sunset Cruise Reservation',
    shortDescription: 'Catamaran excursions, captained luxury yacht rentals, and coastal VIP charters.',
    description: 'Marine booking intake capturing cruise duration, departure marina, onboard champagne/catering, and water sports gear.',
    industry: 'hospitality',
    category: 'booking',
    color: '#0369a1',
    photo: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
    badge: '⚓ USCG Master Captained Luxury Fleet',
    fields: [
      { id: 'charter_guest', type: 'short_answer', label: 'Lead Charter Guest Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Mobile Phone', required: true, width: 'half' },
      { id: 'charter_date', type: 'date', label: 'Requested Charter Date', required: true, width: 'half' },
      { id: 'duration', type: 'dropdown', label: 'Charter Duration', required: true, width: 'half',
        options: [{ label: 'Half-Day Sunset Cruise (4 Hours)', value: '4_hours' }, { label: 'Full-Day Coastal Adventure (8 Hours)', value: '8_hours' }, { label: 'Multi-Day Island Hopping & Overnight', value: 'multi_day' }] },
      { id: 'vessel_type', type: 'dropdown', label: 'Preferred Yacht Class', required: true, width: 'half',
        options: [{ label: '50ft Luxury Motor Yacht (Up to 12 Guests)', value: '50ft_yacht' }, { label: '65ft Sailing Catamaran (Up to 25 Guests)', value: 'catamaran' }, { label: '100ft+ Superyacht with Tender & Seabobs', value: 'superyacht' }] },
      { id: 'party_size', type: 'dropdown', label: 'Total Guests in Party', required: true, width: 'half',
        options: [{ label: '1 – 6 Guests', value: '1_6' }, { label: '7 – 12 Guests', value: '7_12' }, { label: '13 – 25 Guests', value: '13_25' }] },
    ],
    keywords: ['private yacht charter booking', 'boat rental reservation', 'sunset cruise hire'],
  },
  {
    id: 'audiovisual-production-event-quote',
    name: 'Event AV, Stage Lighting & LED Wall Production',
    shortDescription: 'Concert sound systems, keynote projection, wireless mics, and live streaming setup.',
    description: 'Technical event production estimate covering venue dimensions, rigging, live switching, and audio engineers.',
    industry: 'events',
    category: 'estimate',
    color: '#7c3aed',
    photo: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    badge: '🔊 Broadcast-Grade 4K Audio Visual Production',
    fields: [
      { id: 'event_name', type: 'short_answer', label: 'Event Name / Title', required: true, width: 'half' },
      { id: 'producer_name', type: 'short_answer', label: 'Producer / Planner Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'av_services', type: 'dropdown', label: 'Primary AV Needs', required: true, width: 'full',
        options: [{ label: 'Full Conference Stage (Keynote PA, Wireless Mics, Big Screen)', value: 'conference_stage' }, { label: 'Concert Line Array Audio & Moving Intelligent Lighting', value: 'concert_lighting' }, { label: 'Giant LED Video Wall (Direct-View MicroLED)', value: 'led_wall' }, { label: 'Multi-Camera 4K Live Broadcast & Virtual Stream', value: 'livestream' }] },
      { id: 'venue_location', type: 'short_answer', label: 'Venue Name & City', required: true, width: 'full' },
    ],
    keywords: ['event av production quote', 'stage lighting rental', 'led wall hire estimate'],
  },
  {
    id: 'heavy-equipment-rental-reservation',
    name: 'Commercial Heavy Equipment & Machinery Rental',
    shortDescription: 'Mini-excavators, scissor lifts, skid steers, and generator drop-off reservation.',
    description: 'Contractor machinery rental intake with jobsite delivery address, operator requirements, and rental duration.',
    industry: 'construction',
    category: 'reservation',
    color: '#d97706',
    photo: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
    badge: '🚜 Late-Model Fleet with On-Site Jobsite Delivery',
    fields: [
      { id: 'contractor_name', type: 'short_answer', label: 'Company / Contractor Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Site Super Phone', required: true, width: 'half' },
      { id: 'jobsite_address', type: 'address', label: 'Jobsite Delivery Address', required: true, width: 'full' },
      { id: 'machine_type', type: 'dropdown', label: 'Equipment Requested', required: true, width: 'half',
        options: [{ label: 'Compact Mini-Excavator (8k-12k lbs)', value: 'mini_excavator' }, { label: 'Track Skid Steer / Bobcat', value: 'skid_steer' }, { label: '45ft Articulating Boom Lift', value: 'boom_lift' }, { label: '26ft Rough-Terrain Scissor Lift', value: 'scissor_lift' }, { label: 'Towable Commercial Diesel Generator (50kW+)', value: 'generator' }] },
      { id: 'duration', type: 'dropdown', label: 'Rental Duration', required: true, width: 'half',
        options: [{ label: 'Daily (24 Hours)', value: 'daily' }, { label: 'Weekly (7 Days - 40 Meter Hours)', value: 'weekly' }, { label: 'Monthly (4 Weeks - 160 Meter Hours)', value: 'monthly' }, { label: 'Long-Term Project (3+ Months)', value: 'long_term' }] },
    ],
    keywords: ['heavy equipment rental form', 'excavator rental reservation', 'skid steer hire quote'],
  },
];

export function registerExtendedEventsTemplates(): void {
  for (const item of EVENT_DATA) {
    const template: FormTemplate = {
      id: item.id,
      name: item.name,
      shortDescription: item.shortDescription,
      description: item.description,
      schema: {
        version: 1,
        steps: [{ id: 'step-1', title: 'Reservation Details' }],
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
            badgeText: item.badge || '⭐ Verified Premier Hospitality & Booking',
            headline: item.name,
            subtitle: item.shortDescription,
            benefitsList: [
              'Guaranteed date hold and real-time fleet availability',
              'Dedicated event coordinator & concierge on-site',
              'Flexible cancellation and weather protection guarantee',
            ],
            mobileBehavior: 'stack_top',
          },
        },
        settings: {
          submitButtonText: 'Check Availability & Reserve ⚡',
          successTitle: 'Reservation Request Received!',
          successMessage: 'Our concierge team will verify calendar availability and send your proposal within 1 hour.',
          actions: {
            sendEmailNotification: { enabled: true, toEmails: [] },
            createCrmLead: { enabled: true, source: `extended_events_${item.id}` },
          },
        },
      },
      categories: [item.category as any, 'booking', 'reservation', 'quote'],
      industries: [item.industry as any, 'hospitality', 'events'],
      useCases: ['appointment_booking', 'quote_request'],
      audiences: ['clients', 'b2b', 'residential'],
      tags: [item.industry, 'events', 'hospitality', 'booking', '2026-ui'],
      fieldTypes: item.fields.map((f) => f.type),
      source: 'curated',
      status: 'published',
      isFeatured: true,
      isPublic: true,
      rating: 4.97,
      ratingCount: 104,
      usageCount: 1650,
      estimatedMinutes: 2,
      seo: {
        seoTitle: `${item.name} | Instant Availability & Booking`,
        seoDescription: `${item.shortDescription} Mobile-responsive 2026 split screen reservation form.`,
        seoKeywords: item.keywords,
        faq: [
          {
            question: `How do deposit and date reservations work?`,
            answer: 'Once dates and package details are confirmed, a secure digital deposit link is issued to guarantee your reservation.',
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
registerExtendedEventsTemplates();
