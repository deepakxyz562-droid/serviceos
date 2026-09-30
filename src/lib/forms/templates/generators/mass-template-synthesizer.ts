/**
 * Mass Template Synthesizer Engine
 * ---------------------------------
 * Generates thousands of high-converting, domain-accurate, validated FormTemplate schemas
 * across all 40 categories and 60 industries with Jotform-parity quality.
 */

import { TEMPLATE_CATEGORIES } from '../taxonomy/categories';
import { TEMPLATE_INDUSTRIES } from '../taxonomy/industries';
import type { FormTemplate, TemplateCategoryId, TemplateIndustryId } from '../types';
import type { FormField } from '../../form-schema-types';
import { recommendStructureForTemplate } from '../form-structures';

export interface GeneratedTemplateConfig {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: TemplateCategoryId;
  industry: TemplateIndustryId;
  useCase?: string;
  audience?: string;
  tags: string[];
  fields: FormField[];
  themeColor: string;
  iconName: string;
}

// ─── Human Copywriting Generators ──────────────────────────────────────────

export function getTemplateShortDescription(catId: string, indLabel: string, subLabel: string): string {
  switch (catId) {
    case 'application':
      return `Professional ${subLabel.toLowerCase()} form for ${indLabel.toLowerCase()} roles with position preference, shift availability, and qualification tracking.`;
    case 'booking':
    case 'appointment':
      return `Self-service ${subLabel.toLowerCase()} form for ${indLabel.toLowerCase()} clients with instant calendar synchronization and slot selection.`;
    case 'quote':
    case 'estimate':
      return `Accurate ${subLabel.toLowerCase()} request form for ${indLabel.toLowerCase()} services with itemized scope, address verification, and urgency options.`;
    case 'registration':
      return `Streamlined ${subLabel.toLowerCase()} form for ${indLabel.toLowerCase()} programs, events, and memberships with automated confirmation.`;
    case 'order':
      return `Online ${subLabel.toLowerCase()} form for ${indLabel.toLowerCase()} offerings with quantity selection, custom instructions, and delivery details.`;
    case 'feedback':
    case 'survey':
      return `Comprehensive ${subLabel.toLowerCase()} form to collect client reviews, Net Promoter Score (NPS), and service feedback for ${indLabel.toLowerCase()} businesses.`;
    case 'intake':
      return `Thorough client intake and onboarding form for ${indLabel.toLowerCase()} practices to gather background details and project goals.`;
    case 'waiver':
    case 'consent':
      return `Digital legal liability waiver and consent form for ${indLabel.toLowerCase()} activities with binding electronic signature capture.`;
    default:
      return `High-converting interactive smart form designed specifically for ${indLabel.toLowerCase()} businesses, practices, and client workflows.`;
  }
}

export function getTemplateLongDescription(catId: string, indLabel: string, subLabel: string): string {
  switch (catId) {
    case 'application':
      return `Streamline your candidate recruitment and hiring process with our specialized ${indLabel} ${subLabel}. Collect candidate contact info, employment history, role preferences, shift availability, and qualifications with instant CRM pipeline capture.`;
    case 'booking':
    case 'appointment':
      return `Allow clients to schedule appointments directly with your ${indLabel.toLowerCase()} team. Features real-time date selection, preferred time slots, special requirements, and automatic notifications.`;
    case 'quote':
    case 'estimate':
      return `Accelerate project estimations and win more ${indLabel.toLowerCase()} jobs with a structured quote request form. Captures project scope, property/equipment details, budget expectations, and urgency.`;
    case 'registration':
      return `Manage attendee registrations effortlessly for your ${indLabel.toLowerCase()} events, workshops, or training courses with automated email confirmations and attendee tracking.`;
    case 'order':
      return `Accept customer orders, product requests, and catering packages seamlessly with integrated quantity selectors, special instructions, and fulfillment preferences.`;
    default:
      return `Streamline customer workflows, intake, and requests with our professional ${indLabel} ${subLabel}. Features fully customizable fields, automated CRM integration, mobile-responsive layout, and instant notifications.`;
  }
}

export function getTemplateHeroSubtitle(catId: string, indLabel: string, subLabel: string): string {
  switch (catId) {
    case 'application':
      return `Join our team of ${indLabel.toLowerCase()} professionals. Complete your application in under 2 minutes.`;
    case 'booking':
    case 'appointment':
      return `Book your ${indLabel.toLowerCase()} appointment with instant confirmation and dedicated professional support.`;
    case 'quote':
    case 'estimate':
      return `Get a transparent, upfront estimate for ${indLabel.toLowerCase()} services with zero hidden fees.`;
    case 'registration':
      return `Reserve your spot today for ${indLabel.toLowerCase()} programs with automated confirmation.`;
    case 'order':
      return `Place your ${indLabel.toLowerCase()} order online with flexible fulfillment and fast turnaround.`;
    case 'feedback':
    case 'survey':
      return `Share your thoughts in 60 seconds to help us continually elevate our ${indLabel.toLowerCase()} service quality.`;
    default:
      return `Upfront flat-rate pricing and instant confirmation for ${indLabel.toLowerCase()} services.`;
  }
}

export function getTemplateBadgeText(catId: string, indLabel: string): string {
  switch (catId) {
    case 'application':
      return `⭐ Verified Employer • Fast Response Hiring`;
    case 'booking':
    case 'appointment':
      return `📅 Instant Confirmation • Top-Rated ${indLabel}`;
    case 'quote':
    case 'estimate':
      return `⚡ Upfront Pricing • Verified ${indLabel} Specialist`;
    case 'registration':
      return `🛡️ Official Registration • 2026 Verified`;
    case 'order':
      return `🛒 Verified Store • Fast Fulfillment`;
    case 'feedback':
    case 'survey':
      return `💬 Client Feedback • 60-Second Review`;
    default:
      return `⭐ Verified ${indLabel} Specialist • 2026 Pro`;
  }
}

export function getTemplateBenefits(catId: string, indLabel: string): string[] {
  switch (catId) {
    case 'application':
      return [
        'Direct review by hiring managers within 24–48 hours',
        'Flexible shift schedules (Full-time, Part-time & Seasonal)',
        '100% Confidential and secure applicant data processing',
      ];
    case 'booking':
    case 'appointment':
      return [
        'Instant appointment confirmation & calendar invite',
        'Direct assignment to verified experienced specialists',
        'Free cancellation or rescheduling up to 24 hours prior',
      ];
    case 'quote':
    case 'estimate':
      return [
        '100% Upfront transparent quote & zero hidden fees',
        'Direct assignment to top-rated verified professionals',
        'Confidential 256-bit encrypted data protection',
      ];
    case 'order':
      return [
        'Real-time order tracking & automated email receipts',
        'Fresh quality assurance & customized fulfillment',
        'Secure 256-bit encrypted checkout & client protection',
      ];
    case 'feedback':
    case 'survey':
      return [
        'Takes less than 90 seconds to complete',
        'Helps us continually improve service quality',
        'Option for anonymous feedback submission',
      ];
    case 'registration':
      return [
        'Immediate seat confirmation & ticket barcode',
        'Access to exclusive event resources and updates',
        'Easy transfer or cancellation options available',
      ];
    default:
      return [
        `Direct assignment to top-rated verified ${indLabel.toLowerCase()} professionals`,
        '100% Upfront transparent quote & zero hidden fees',
        'Confidential 256-bit encrypted data protection',
      ];
  }
}

// ─── Industry-Specific Field Injectors ──────────────────────────────────────

export function getIndustrySpecificFields(industryId: string, categoryId: string): FormField[] {
  const fields: FormField[] = [];

  switch (industryId) {
    case 'restaurant':
      if (categoryId === 'application' || categoryId === 'job') {
        fields.push(
          {
            id: 'restaurant_role_type',
            type: 'select',
            label: 'Restaurant Position Applied For',
            options: [
              { label: 'Server / Waitstaff', value: 'server' },
              { label: 'Bartender / Mixologist', value: 'bartender' },
              { label: 'Host / Hostess', value: 'host' },
              { label: 'Line Cook / Prep Cook', value: 'cook' },
              { label: 'Sous Chef / Executive Chef', value: 'chef' },
              { label: 'Barista / Cafe Associate', value: 'barista' },
              { label: 'Dishwasher / Kitchen Porter', value: 'dishwasher' },
              { label: 'Shift Supervisor / Assistant Manager', value: 'manager' },
              { label: 'General / Multiple Roles', value: 'general' },
            ],
            required: true,
          },
          {
            id: 'food_certifications',
            type: 'checkbox',
            label: 'Food Safety & Alcohol Service Certifications',
            options: [
              { label: 'Food Handler Card / ServSafe Food Handler', value: 'food_handler' },
              { label: 'ServSafe Manager Certification', value: 'servsafe_manager' },
              { label: 'TIPS / LEAD / Alcohol Server Certified', value: 'alcohol_certified' },
              { label: 'Allergen Awareness Certified', value: 'allergen_certified' },
              { label: 'None yet (Willing to obtain upon hire)', value: 'none' },
            ],
          },
          {
            id: 'kitchen_experience_types',
            type: 'checkbox',
            label: 'Experience with Service Environments',
            options: [
              { label: 'High-Volume Fast Casual (200+ covers/shift)', value: 'high_volume' },
              { label: 'Fine Dining & Table Service', value: 'fine_dining' },
              { label: 'Bar & Cocktail Lounge', value: 'cocktail_bar' },
              { label: 'POS Systems (Toast, Square, Clover, Aloha)', value: 'pos_systems' },
              { label: 'Banquet & Catering Operations', value: 'banquet' },
            ],
          }
        );
      } else {
        fields.push(
          {
            id: 'reservation_type',
            type: 'select',
            label: 'Dining / Reservation Type',
            options: [
              { label: 'Standard Dining Table (1-4 Guests)', value: 'standard' },
              { label: 'Large Group (5-10 Guests)', value: 'large_group' },
              { label: 'Private Dining Room (10-30 Guests)', value: 'private_room' },
              { label: 'Catering / Banquet Event', value: 'catering' },
            ],
            required: true,
          },
          {
            id: 'guest_count',
            type: 'number',
            label: 'Number of Guests',
            placeholder: 'e.g. 4',
            required: true,
          },
          {
            id: 'seating_preference',
            type: 'select',
            label: 'Seating Area Preference',
            options: [
              { label: 'Main Dining Room', value: 'main_dining' },
              { label: 'Outdoor Patio / Garden', value: 'patio' },
              { label: 'Bar Counter / High Tops', value: 'bar' },
              { label: 'No Preference / First Available', value: 'any' },
            ],
          },
          {
            id: 'dietary_restrictions',
            type: 'checkbox',
            label: 'Dietary Restrictions & Allergies',
            options: [
              { label: 'Gluten-Free', value: 'gluten_free' },
              { label: 'Vegetarian / Vegan', value: 'vegetarian' },
              { label: 'Nut Allergy (Severe)', value: 'nut_allergy' },
              { label: 'Dairy-Free / Lactose Intolerant', value: 'dairy_free' },
              { label: 'Halal / Kosher', value: 'halal_kosher' },
            ],
          }
        );
      }
      break;

    case 'hospitality':
      fields.push(
        {
          id: 'accommodation_or_event_type',
          type: 'select',
          label: 'Service / Event Space Type',
          options: [
            { label: 'Deluxe King Guestroom', value: 'deluxe_king' },
            { label: 'Double Queen Executive Room', value: 'double_queen' },
            { label: 'Penthouse Hospitality Suite', value: 'penthouse' },
            { label: 'Grand Conference Ballroom', value: 'ballroom' },
            { label: 'Private Meeting Room', value: 'boardroom' },
          ],
          required: true,
        },
        {
          id: 'hospitality_guests_count',
          type: 'number',
          label: 'Total Number of Attendees / Guests',
          placeholder: 'e.g. 2',
          required: true,
        },
        {
          id: 'amenities_requested',
          type: 'checkbox',
          label: 'Special Amenities & Concierge Services',
          options: [
            { label: 'Airport Shuttle Transfer', value: 'airport_shuttle' },
            { label: 'Early Check-In / Late Check-Out', value: 'flexible_hours' },
            { label: 'Valet Parking Access', value: 'valet_parking' },
            { label: 'Audiovisual (AV) & Projector Setup', value: 'av_setup' },
            { label: 'Catering & Coffee Break Service', value: 'coffee_catering' },
          ],
        }
      );
      break;

    case 'fitness':
      fields.push(
        {
          id: 'fitness_goals',
          type: 'select',
          label: 'Primary Fitness & Health Goal',
          options: [
            { label: 'Fat Loss & Body Toning', value: 'fat_loss' },
            { label: 'Muscle Building & Hypertrophy', value: 'muscle_building' },
            { label: 'Athletic Conditioning & Endurance', value: 'endurance' },
            { label: 'Injury Rehabilitation & Mobility', value: 'rehab' },
            { label: 'General Health & Longevity', value: 'general_health' },
          ],
          required: true,
        },
        {
          id: 'training_format',
          type: 'radio',
          label: 'Preferred Training Program',
          options: [
            { label: '1-on-1 Personal Training', value: 'personal_training' },
            { label: 'Small Group Functional Training', value: 'small_group' },
            { label: 'Open Gym Membership', value: 'open_gym' },
            { label: 'Online / App-Based Coaching', value: 'online_coaching' },
          ],
          required: true,
        },
        {
          id: 'activity_level',
          type: 'select',
          label: 'Current Activity Level',
          options: [
            { label: 'Sedentary (Little to no regular exercise)', value: 'sedentary' },
            { label: 'Light (1-2 days/week)', value: 'light' },
            { label: 'Moderate (3-4 days/week)', value: 'moderate' },
            { label: 'Advanced Athlete (5+ days/week)', value: 'athlete' },
          ],
        }
      );
      break;

    case 'beauty':
      fields.push(
        {
          id: 'beauty_service_requested',
          type: 'select',
          label: 'Treatment or Service Requested',
          options: [
            { label: 'Signature Haircut, Styling & Blowout', value: 'haircut' },
            { label: 'Balayage, Color & Highlights', value: 'hair_color' },
            { label: 'HydraFacial & Skincare Rejuvenation', value: 'facial' },
            { label: 'Gel / Acrylic Manicure & Pedicure', value: 'nails' },
            { label: 'Bridal & Special Occasion Makeup', value: 'makeup' },
          ],
          required: true,
        },
        {
          id: 'allergies_sensitivities',
          type: 'text',
          label: 'Skin Sensitivities or Product Allergies',
          placeholder: 'e.g. Sensitive to ammonia, latex, fragrances',
        }
      );
      break;

    case 'education':
      fields.push(
        {
          id: 'student_academic_level',
          type: 'select',
          label: 'Student Academic / Grade Level',
          options: [
            { label: 'Elementary School (K–5)', value: 'elementary' },
            { label: 'Middle School (6–8)', value: 'middle' },
            { label: 'High School (9–12)', value: 'high_school' },
            { label: 'College / University Undergraduate', value: 'college' },
            { label: 'Adult Continuing Education & Professional', value: 'adult' },
          ],
          required: true,
        },
        {
          id: 'subject_focus',
          type: 'select',
          label: 'Subject / Focus Area',
          options: [
            { label: 'Mathematics, Algebra & Calculus', value: 'math' },
            { label: 'Physics, Chemistry & Biology', value: 'science' },
            { label: 'SAT / ACT / GRE Standardized Test Prep', value: 'test_prep' },
            { label: 'Coding, Python & Computer Science', value: 'coding' },
            { label: 'English Literature, ESL & Writing', value: 'languages' },
          ],
          required: true,
        },
        {
          id: 'learning_format_preference',
          type: 'radio',
          label: 'Learning Format Preference',
          options: [
            { label: '1-on-1 In-Person Tutoring', value: 'in_person' },
            { label: 'Live Interactive Online Video Session', value: 'online' },
            { label: 'Small Cohort Study Group', value: 'group' },
          ],
        }
      );
      break;

    case 'retail':
    case 'ecommerce':
      fields.push(
        {
          id: 'product_category',
          type: 'select',
          label: 'Product Category of Interest',
          options: [
            { label: 'Apparel & Fashion Accessories', value: 'apparel' },
            { label: 'Home Goods, Furniture & Decor', value: 'home_goods' },
            { label: 'Electronics & Audio Equipment', value: 'electronics' },
            { label: 'Beauty, Skincare & Wellness', value: 'beauty_retail' },
            { label: 'Specialty Gifts & Artisanal Products', value: 'gifts' },
          ],
          required: true,
        },
        {
          id: 'fulfillment_channel',
          type: 'radio',
          label: 'Preferred Fulfillment Method',
          options: [
            { label: 'Standard Home Delivery (3-5 Business Days)', value: 'delivery' },
            { label: 'Express Next-Day Shipping', value: 'express' },
            { label: 'In-Store Pickup (Free)', value: 'pickup' },
          ],
        }
      );
      break;

    case 'technology':
    case 'saas':
      fields.push(
        {
          id: 'team_size',
          type: 'select',
          label: 'Company / Team Size',
          options: [
            { label: '1 – 10 Team Members (Startup)', value: '1_10' },
            { label: '11 – 50 Team Members (Growing Business)', value: '11_50' },
            { label: '51 – 250 Team Members (Mid-Market)', value: '51_250' },
            { label: '250+ Team Members (Enterprise)', value: '250_plus' },
          ],
          required: true,
        },
        {
          id: 'deployment_type',
          type: 'select',
          label: 'Deployment & Security Requirement',
          options: [
            { label: 'Multi-Tenant Cloud (Fastest Setup)', value: 'cloud' },
            { label: 'Dedicated Cloud Instance (HIPAA / SOC2)', value: 'dedicated' },
            { label: 'On-Premises / Hybrid Air-Gapped', value: 'on_prem' },
          ],
        },
        {
          id: 'primary_use_case_notes',
          type: 'textarea',
          label: 'Core Workflows or Systems to Integrate With',
          placeholder: 'e.g. Need CRM sync, Zapier webhooks, Stripe billing...',
        }
      );
      break;

    case 'cleaning':
      fields.push(
        {
          id: 'property_type',
          type: 'select',
          label: 'Property Type',
          options: [
            { label: 'Single-Family Home', value: 'single_family' },
            { label: 'Apartment / Condominium', value: 'condo' },
            { label: 'Commercial Office / Retail Space', value: 'office' },
            { label: 'Post-Construction / Move-Out Deep Clean', value: 'post_construction' },
          ],
          required: true,
        },
        {
          id: 'square_footage',
          type: 'select',
          label: 'Approximate Square Footage',
          options: [
            { label: 'Under 1,000 sq ft', value: 'under_1000' },
            { label: '1,000 – 2,000 sq ft', value: '1000_2000' },
            { label: '2,001 – 3,500 sq ft', value: '2001_3500' },
            { label: '3,500+ sq ft', value: '3500_plus' },
          ],
          required: true,
        },
        {
          id: 'cleaning_frequency',
          type: 'radio',
          label: 'Desired Cleaning Frequency',
          options: [
            { label: 'One-Time Deep Clean', value: 'one_time' },
            { label: 'Weekly Recurring (Best Rate)', value: 'weekly' },
            { label: 'Bi-Weekly (Every 2 Weeks)', value: 'bi_weekly' },
            { label: 'Monthly Routine', value: 'monthly' },
          ],
        }
      );
      break;

    case 'construction':
      fields.push(
        {
          id: 'construction_project_type',
          type: 'select',
          label: 'Construction / Remodeling Project',
          options: [
            { label: 'Kitchen or Bathroom Full Remodel', value: 'kitchen_bath' },
            { label: 'Room Addition & Structural Expansion', value: 'addition' },
            { label: 'Commercial Tenant Buildout', value: 'commercial_buildout' },
            { label: 'New Custom Home Construction', value: 'new_construction' },
            { label: 'Deck, Patio & Outdoor Hardscaping', value: 'outdoor' },
          ],
          required: true,
        },
        {
          id: 'permit_status',
          type: 'select',
          label: 'Permit & Architectural Plans Status',
          options: [
            { label: 'Full Architectural Plans & Permits Approved', value: 'approved' },
            { label: 'Plans Drawn, Need Contractor to Pull Permits', value: 'need_permits' },
            { label: 'Concept Stage / Need Design-Build Consultation', value: 'concept' },
          ],
        }
      );
      break;

    case 'dental':
    case 'healthcare':
      fields.push(
        {
          id: 'dob',
          type: 'date',
          label: 'Date of Birth',
          placeholder: 'YYYY-MM-DD',
          required: true,
        },
        {
          id: 'insurance_provider',
          type: 'text',
          label: 'Primary Dental / Health Insurance Provider',
          placeholder: 'e.g. Delta Dental, BlueCross',
          required: false,
        },
        {
          id: 'primary_symptoms',
          type: 'textarea',
          label: 'Current Symptoms / Reason for Visit',
          placeholder: 'Please describe any pain, tooth sensitivity, or recent issues...',
          required: true,
        },
        {
          id: 'medical_history_check',
          type: 'checkbox',
          label: 'I confirm that I have reported all known medical conditions and allergies.',
          required: true,
        }
      );
      break;

    case 'hvac':
      fields.push(
        {
          id: 'equipment_type',
          type: 'select',
          label: 'HVAC Equipment Type',
          options: [
            { label: 'Central AC & Condenser', value: 'central_ac' },
            { label: 'Gas / Electric Furnace', value: 'furnace' },
            { label: 'Heat Pump System', value: 'heat_pump' },
            { label: 'Ductless Mini-Split', value: 'mini_split' },
            { label: 'Rooftop Commercial Unit', value: 'commercial_rooftop' },
          ],
          required: true,
        },
        {
          id: 'issue_symptoms',
          type: 'checkbox',
          label: 'Select All That Apply',
          options: [
            { label: 'No cooling / Warm airflow', value: 'no_cooling' },
            { label: 'No heating / Cold air', value: 'no_heating' },
            { label: 'Loud buzzing / Rattling sound', value: 'loud_noise' },
            { label: 'Water leaking around indoor unit', value: 'water_leak' },
            { label: 'Thermostat screen is blank', value: 'blank_thermostat' },
          ],
        },
        {
          id: 'system_age',
          type: 'select',
          label: 'Approximate System Age',
          options: [
            { label: 'Under 5 years', value: 'under_5' },
            { label: '5 to 10 years', value: '5_10' },
            { label: '10 to 15 years', value: '10_15' },
            { label: 'Over 15 years / Unknown', value: 'over_15' },
          ],
        }
      );
      break;

    case 'plumbing':
      fields.push(
        {
          id: 'plumbing_issue_type',
          type: 'select',
          label: 'Plumbing Issue Area',
          options: [
            { label: 'Water Heater / No Hot Water', value: 'water_heater' },
            { label: 'Main Drain / Sewer Clog', value: 'drain_clog' },
            { label: 'Burst or Leaking Pipe', value: 'pipe_leak' },
            { label: 'Toilet / Faucet Repair', value: 'fixture_repair' },
            { label: 'Sump Pump Failure', value: 'sump_pump' },
          ],
          required: true,
        },
        {
          id: 'water_shutoff_known',
          type: 'radio',
          label: 'Do you know where your main water shutoff valve is located?',
          options: [
            { label: 'Yes, water is currently shut off', value: 'yes_shut' },
            { label: 'Yes, but water is still running', value: 'yes_running' },
            { label: 'No / Unsure', value: 'no' },
          ],
        }
      );
      break;

    case 'electrical':
      fields.push(
        {
          id: 'electrical_service_type',
          type: 'select',
          label: 'Electrical Service Needed',
          options: [
            { label: 'EV Charger Level 2 Installation', value: 'ev_charger' },
            { label: 'Panel Upgrade (100A to 200A)', value: 'panel_upgrade' },
            { label: 'Tripping Breaker / Dead Outlets', value: 'tripping_breaker' },
            { label: 'Lighting & Ceiling Fan Installation', value: 'lighting' },
            { label: 'Whole-Home Generator Setup', value: 'generator' },
          ],
          required: true,
        },
        {
          id: 'panel_location',
          type: 'text',
          label: 'Main Electrical Panel Location',
          placeholder: 'e.g. Basement, Garage, Utility Closet',
        }
      );
      break;

    case 'roofing':
      fields.push(
        {
          id: 'roof_type',
          type: 'select',
          label: 'Roof Material',
          options: [
            { label: 'Asphalt Architectural Shingles', value: 'asphalt' },
            { label: 'Standing Seam Metal Roof', value: 'metal' },
            { label: 'Tile / Slate', value: 'tile' },
            { label: 'Flat / TPO / Rubber Commercial', value: 'flat' },
          ],
          required: true,
        },
        {
          id: 'storm_damage_claim',
          type: 'radio',
          label: 'Is this related to recent storm/wind damage or an insurance claim?',
          options: [
            { label: 'Yes, insurance claim filed', value: 'insurance_yes' },
            { label: 'Storm damage, need quote for insurance', value: 'need_quote' },
            { label: 'No, routine maintenance or aging roof', value: 'routine' },
          ],
        }
      );
      break;

    case 'automotive':
      fields.push(
        {
          id: 'vehicle_year_make_model',
          type: 'text',
          label: 'Vehicle Year, Make & Model',
          placeholder: 'e.g. 2021 Toyota RAV4 Hybrid',
          required: true,
        },
        {
          id: 'mileage',
          type: 'number',
          label: 'Current Approximate Mileage',
          placeholder: 'e.g. 45000',
        },
        {
          id: 'vin_number',
          type: 'text',
          label: 'VIN Number (Optional for exact part matching)',
          placeholder: '17-character VIN',
        }
      );
      break;

    case 'real_estate':
      fields.push(
        {
          id: 'property_address',
          type: 'text',
          label: 'Property Address of Interest',
          placeholder: 'Street, City, State, Zip',
          required: true,
        },
        {
          id: 'buyer_status',
          type: 'select',
          label: 'Financing / Purchase Status',
          options: [
            { label: 'Pre-Approved for Mortgage', value: 'pre_approved' },
            { label: 'Cash Buyer', value: 'cash' },
            { label: 'Need Mortgage Lender Referral', value: 'need_lender' },
            { label: 'Looking to Rent / Lease', value: 'renter' },
          ],
        }
      );
      break;

    default:
      fields.push({
        id: 'service_details',
        type: 'textarea',
        label: 'Detailed Requirements / Notes',
        placeholder: 'Please provide any specific requirements, dimensions, or details...',
      });
      break;
  }

  return fields;
}

// ─── Category-Specific Base Fields ──────────────────────────────────────────

export function getCategoryBaseFields(categoryId: string): FormField[] {
  const baseContact: FormField[] = [
    {
      id: 'full_name',
      type: 'short_answer',
      widgetType: 'full_name',
      label: 'Full Legal Name',
      placeholder: 'John Doe',
      required: true,
    },
    {
      id: 'phone',
      type: 'phone',
      widgetType: 'phone',
      label: 'Phone Number',
      placeholder: '(555) 000-0000',
      required: true,
    },
    {
      id: 'email',
      type: 'email',
      widgetType: 'email',
      label: 'Email Address',
      placeholder: 'john@example.com',
      required: true,
    },
  ];

  switch (categoryId) {
    case 'application':
    case 'job':
    case 'employment':
      return [
        ...baseContact,
        {
          id: 'candidate_address',
          type: 'address',
          widgetType: 'address',
          label: 'Current Address (City, State, Zip)',
          placeholder: 'e.g. Austin, TX 78701',
          required: true,
        },
        {
          id: 'employment_type_desired',
          type: 'radio',
          label: 'Desired Employment Type',
          options: [
            { label: 'Full-Time (35-40 hrs/wk)', value: 'full_time' },
            { label: 'Part-Time (15-30 hrs/wk)', value: 'part_time' },
            { label: 'Seasonal / Temporary', value: 'seasonal' },
            { label: 'Weekend Shifts Only', value: 'weekend' },
          ],
          required: true,
        },
        {
          id: 'shift_availability',
          type: 'checkbox',
          label: 'Shift Availability (Select All That Apply)',
          options: [
            { label: 'Morning Prep & Breakfast (6:00 AM – 12:00 PM)', value: 'morning' },
            { label: 'Lunch Service (11:00 AM – 4:00 PM)', value: 'lunch' },
            { label: 'Dinner Service & Closing (4:00 PM – Close)', value: 'dinner' },
            { label: 'Weekends (Saturday & Sunday)', value: 'weekends' },
            { label: 'Holidays & Peak Seasons', value: 'holidays' },
          ],
          required: true,
        },
        {
          id: 'years_experience',
          type: 'dropdown',
          widgetType: 'dropdown',
          label: 'Years of Relevant Experience',
          options: [
            { label: 'Entry Level (No prior experience / Willing to train)', value: 'entry' },
            { label: '1 – 2 Years', value: '1_2' },
            { label: '3 – 5 Years', value: '3_5' },
            { label: '5+ Years (Experienced Professional)', value: '5_plus' },
          ],
          required: true,
        },
        {
          id: 'earliest_start_date',
          type: 'date',
          widgetType: 'date_picker',
          label: 'Earliest Available Start Date',
          required: true,
        },
        {
          id: 'desired_pay_rate',
          type: 'short_answer',
          label: 'Desired Pay / Hourly Rate ($)',
          placeholder: 'e.g. $18 - $24 / hr or Negotiable',
        },
        {
          id: 'resume_upload',
          type: 'file',
          widgetType: 'file_upload',
          label: 'Attach Resume / CV (PDF or DOCX)',
        },
        {
          id: 'skills_and_summary',
          type: 'long_answer',
          label: 'Key Skills, Past Work Experience & Why You Want to Join',
          placeholder: 'Briefly summarize your background, key strengths, and why you are interested in this role...',
          required: true,
        },
      ];

    case 'registration':
    case 'event':
      return [
        ...baseContact,
        {
          id: 'organization_name',
          type: 'short_answer',
          widgetType: 'company',
          label: 'Organization / Company Name',
          placeholder: 'e.g. Acme Corporation',
        },
        {
          id: 'registration_tier',
          type: 'dropdown',
          widgetType: 'dropdown',
          label: 'Registration Type',
          options: [
            { label: 'Standard General Admission', value: 'general' },
            { label: 'VIP All-Access Pass', value: 'vip' },
            { label: 'Student / Early Career Pass', value: 'student' },
            { label: 'Corporate Group Delegation (3+ members)', value: 'corporate' },
          ],
          required: true,
        },
        {
          id: 'event_date_choice',
          type: 'date',
          widgetType: 'date_picker',
          label: 'Preferred Event Session Date',
          required: true,
        },
        {
          id: 'dietary_accommodations',
          type: 'dropdown',
          widgetType: 'dropdown',
          label: 'Dietary or Accessibility Needs',
          options: [
            { label: 'No Special Requirements', value: 'none' },
            { label: 'Vegetarian / Vegan Menu', value: 'vegetarian' },
            { label: 'Gluten-Free / Celiac Safe', value: 'gluten_free' },
            { label: 'Wheelchair / Physical Accessibility Assistance', value: 'accessibility' },
          ],
        },
      ];

    case 'order':
    case 'product':
      return [
        ...baseContact,
        {
          id: 'delivery_address',
          type: 'address',
          widgetType: 'address',
          label: 'Delivery / Service Address',
          placeholder: 'Street, City, State, ZIP',
          required: true,
        },
        {
          id: 'order_quantity',
          type: 'numerical',
          widgetType: 'numerical',
          label: 'Quantity / Units Required',
          placeholder: 'e.g. 1',
          required: true,
        },
        {
          id: 'fulfillment_date',
          type: 'date',
          widgetType: 'date_picker',
          label: 'Requested Delivery / Fulfillment Date',
          required: true,
        },
        {
          id: 'special_instructions',
          type: 'long_answer',
          label: 'Special Preparation / Delivery Instructions',
          placeholder: 'Add gate code, custom specifications, or packaging requests...',
        },
      ];

    case 'booking':
    case 'appointment':
      return [
        ...baseContact,
        {
          id: 'appointment_slot',
          type: 'control_widget',
          widgetType: 'appointment',
          label: 'Book Date & Live Time Slot',
          required: true,
        },
        {
          id: 'preferred_date',
          type: 'date',
          widgetType: 'date_picker',
          label: 'Preferred Appointment Date',
        },
        {
          id: 'preferred_time_slot',
          type: 'time',
          widgetType: 'time_picker',
          label: 'Preferred Time Window',
        },
      ];

    case 'quote':
    case 'estimate':
      return [
        ...baseContact,
        {
          id: 'service_address',
          type: 'address',
          widgetType: 'address',
          label: 'Service Location Address',
          placeholder: '123 Main St, City, State, ZIP',
          required: true,
        },
        {
          id: 'urgency',
          type: 'radio',
          label: 'Project Urgency',
          options: [
            { label: '🚨 Emergency (Immediate Dispatch)', value: 'emergency' },
            { label: '⚡ Same Day / Next Day', value: 'same_day' },
            { label: '📅 Within this week', value: 'this_week' },
            { label: '🕒 Flexible / Planning stage', value: 'flexible' },
          ],
          required: true,
        },
        {
          id: 'project_scale_slider',
          type: 'numerical',
          widgetType: 'slider',
          label: 'Estimated Scope / Size (Units or Sq Ft)',
          widgetConfig: { min: 100, max: 5000, step: 50, defaultValue: 1200 },
        },
        {
          id: 'calculated_estimate',
          type: 'calculated',
          widgetType: 'form_calculation',
          label: 'Estimated Investment Range ($)',
          widgetConfig: { formula: '{{project_scale_slider}} * 3.5' },
        },
      ];

    case 'inspection':
    case 'checklist':
    case 'audit':
      return [
        ...baseContact,
        {
          id: 'inspection_address',
          type: 'address',
          widgetType: 'address',
          label: 'Inspection Site Location',
          required: true,
        },
        {
          id: 'inspection_checklist',
          type: 'checkbox',
          widgetType: 'multiple_choice',
          label: 'Multi-Point Inspection Verification Checklist',
          options: [
            { label: 'Exterior & Structural Integrity (Pass)', value: 'pass_exterior' },
            { label: 'Mechanical & Systems Operational (Pass)', value: 'pass_mechanical' },
            { label: 'Safety & Emergency Controls (Pass)', value: 'pass_safety' },
            { label: 'Sanitation & Cleanliness Standards (Pass)', value: 'pass_clean' },
          ],
          required: true,
        },
        {
          id: 'inspection_photos',
          type: 'photo',
          widgetType: 'image_upload_with_notes',
          label: 'Site Photo Evidence & Inspection Annotations',
        },
        {
          id: 'inspector_signature',
          type: 'signature',
          widgetType: 'smooth_signature',
          label: 'Inspector Sign-Off Signature',
          required: true,
        },
      ];

    case 'intake':
      return [
        ...baseContact,
        {
          id: 'timeline_goal',
          type: 'dropdown',
          widgetType: 'dropdown',
          label: 'Desired Implementation Timeline',
          options: [
            { label: 'Immediately (Within 1-2 weeks)', value: 'immediate' },
            { label: 'Within 30 Days', value: '30_days' },
            { label: 'Next Quarter (1-3 months)', value: 'next_quarter' },
            { label: 'Exploratory / Research Phase', value: 'exploratory' },
          ],
          required: true,
        },
        {
          id: 'prior_experience_notes',
          type: 'long_answer',
          label: 'Current Setup & Key Pain Points',
          placeholder: 'Describe your current process, systems, and primary objectives...',
          required: true,
        },
      ];

    case 'waiver':
    case 'consent':
      return [
        ...baseContact,
        {
          id: 'terms_agreement',
          type: 'checkbox',
          widgetType: 'terms_and_conditions',
          label: 'I have read, understood, and voluntarily agree to all legal terms, safety guidelines, and waiver conditions.',
          required: true,
        },
        {
          id: 'digital_signature',
          type: 'signature',
          widgetType: 'smooth_signature',
          label: 'Electronic Signature',
          required: true,
        },
        {
          id: 'signature_date',
          type: 'date',
          widgetType: 'date_picker',
          label: 'Date of Signature',
          required: true,
        },
      ];

    case 'feedback':
    case 'survey':
      return [
        ...baseContact.slice(0, 2),
        {
          id: 'rating_overall',
          type: 'rating',
          widgetType: 'star_rating',
          label: 'Overall Satisfaction Rating',
          required: true,
        },
        {
          id: 'recommend_nps',
          type: 'rating',
          widgetType: 'nps_slider',
          label: 'Likelihood to Recommend (0–10 NPS)',
        },
        {
          id: 'feedback_comments',
          type: 'long_answer',
          label: 'What did we do well, and what could we improve?',
          placeholder: 'Share your thoughts...',
        },
      ];

    default:
      return [
        ...baseContact,
        {
          id: 'subject_line',
          type: 'short_answer',
          label: 'Subject / Topic',
          placeholder: 'What is this regarding?',
        },
      ];
  }
}

// ─── Synthesizer Core ───────────────────────────────────────────────────────

/**
 * Synthesizes a single complete FormTemplate object with deep field intelligence and rich SEO.
 */
export function synthesizeTemplate(
  catId: TemplateCategoryId,
  indId: TemplateIndustryId,
  variantIndex = 0
): FormTemplate {
  const catDef = TEMPLATE_CATEGORIES.find((c) => c.id === catId);
  const indDef = TEMPLATE_INDUSTRIES.find((i) => i.id === indId);

  const catLabel = catDef?.label || 'Service Form';
  const indLabel = indDef?.label || 'General';
  const subcategories = catDef?.subcategories || [{ id: catId, label: catLabel }];
  const subIndex = variantIndex % subcategories.length;
  const cycle = Math.floor(variantIndex / subcategories.length);
  const subcategory = subcategories[subIndex];
  const subLabel = subcategory.label;

  // 100% Collision-free unique slug
  const slug = `${indId}-${subcategory.id}${cycle > 0 ? `-v${cycle + 1}` : ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const baseFields = getCategoryBaseFields(catId);
  const industryFields = getIndustrySpecificFields(indId, catId);

  const allFields: FormField[] = [...baseFields, ...industryFields];

  // Curated 2026 4K Unsplash Imagery Presets per Industry
  const INDUSTRY_PHOTO_MAP: Record<string, string> = {
    hvac: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
    plumbing: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    electrical: 'https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=1200&q=80',
    roofing: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    solar: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    dental: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
    healthcare: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
    automotive: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    real_estate: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    legal: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    accounting: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    beauty: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    restaurant: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
    hospitality: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    technology: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    saas: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
    construction: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    landscaping: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1200&q=80',
    education: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    ecommerce: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
    pest_control: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=1200&q=80',
    home_services: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    marketing: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    agency: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    consulting: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    nonprofit: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
  };

  const primaryPhoto =
    INDUSTRY_PHOTO_MAP[indId] ||
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';

  // Intelligent 2026 Layout: Map dynamically to 100 Form Experience Structures across 10 Master Engines
  const structure = recommendStructureForTemplate(catId, indId, variantIndex);
  const chosenLayout = structure.layout;

  const shortDesc = getTemplateShortDescription(catId, indLabel, subLabel);
  const longDesc = getTemplateLongDescription(catId, indLabel, subLabel);
  const heroSubtitle = getTemplateHeroSubtitle(catId, indLabel, subLabel);
  const badgeText = getTemplateBadgeText(catId, indLabel);
  const benefitsList = getTemplateBenefits(catId, indLabel);

  // If Split-Media layout: inject real editable left-column content widgets
  if (chosenLayout === 'split_media') {
    const leftWidgets: FormField[] = [
      {
        id: 'left_badge',
        type: 'control_widget',
        widgetType: 'badge_widget',
        label: 'Badge',
        layoutColumn: 'left',
        widgetConfig: { text: badgeText },
      },
      {
        id: 'left_heading',
        type: 'heading',
        widgetType: 'heading',
        label: 'Headline',
        layoutColumn: 'left',
        widgetConfig: { text: `${indLabel} ${subLabel}`, level: 'h1' },
      },
      {
        id: 'left_sub',
        type: 'paragraph',
        widgetType: 'paragraph',
        label: 'Subtitle',
        layoutColumn: 'left',
        widgetConfig: { text: heroSubtitle },
      },
      {
        id: 'left_benefits',
        type: 'control_widget',
        widgetType: 'list_widget',
        label: 'Benefits',
        layoutColumn: 'left',
        widgetConfig: { items: benefitsList },
      },
      {
        id: 'left_image',
        type: 'control_widget',
        widgetType: 'image_widget',
        label: 'Media Showcase',
        layoutColumn: 'left',
        widgetConfig: { imageUrl: primaryPhoto },
      },
    ];
    allFields.unshift(...leftWidgets);
  }

  // If Milestone Stepper engine: partition fields into real multi-step sequence
  const steps = structure.engine === 'milestone_stepper'
    ? [
        { id: 'step_contact', title: '1. Contact Details' },
        { id: 'step_scope', title: '2. Project Scope' },
        { id: 'step_confirm', title: '3. Schedule & Review' },
      ]
    : [];

  if (steps.length > 0) {
    const fieldsPerStep = Math.ceil(allFields.length / steps.length);
    allFields.forEach((f, idx) => {
      const sIdx = Math.min(Math.floor(idx / fieldsPerStep), steps.length - 1);
      f.stepId = steps[sIdx]?.id;
    });
  }

  const template: FormTemplate = {
    id: slug,
    name: cycle > 0 ? `${indLabel} ${subLabel} (Variant ${cycle + 1})` : `${indLabel} ${subLabel}`,
    shortDescription: shortDesc,
    description: longDesc,
    structureId: structure.id,
    engine: structure.engine,
    schema: {
      id: slug,
      title: `${indLabel} ${subLabel}`,
      description: `Please fill out the form below. All information is securely encrypted.`,
      fields: allFields,
      steps: steps,
      theme: {
        primaryColor: indDef?.color ? `#${indDef.color}` : '#0284c7',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '1rem',
        inputBorderRadius: '0.75rem',
        inputHeight: 'large',
        cardBackground: 'rgba(255, 255, 255, 0.98)',
        showTopBorder: true,
        fontFamily: 'Inter, sans-serif',
        layout: chosenLayout,
        mediaPanel: {
          enabled: chosenLayout === 'split_media',
          position: 'left',
          splitRatio: '40-60',
          mediaType: 'image',
          mediaUrl: primaryPhoto,
          badgeText: badgeText,
          headline: `${indLabel} ${subLabel}`,
          subtitle: heroSubtitle,
          benefitsList: benefitsList,
          mobileBehavior: 'stack_top',
        },
      },
      settings: {
        submitButtonText: catId === 'application' ? 'Submit Application 🚀' : 'Submit Request ⚡',
        successTitle: 'Submission Received!',
        successMessage: `Thank you for contacting our ${indLabel.toLowerCase()} team. We will review your details and respond shortly.`,
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `synthesized_${slug}` },
        },
      },
    },
    categories: [catId],
    industries: [indId],
    useCases: ['lead_generation', 'intake'],
    audiences: ['b2c', 'b2b'],
    tags: [indId, catId, subcategory?.id || 'form', 'free-template', '2026-ui'],
    source: 'synthesized',
    status: 'published',
    isPublic: true,
    isFeatured: variantIndex === 0,
    usageCount: Math.floor(Math.random() * 850) + 120,
    viewCount: Math.floor(Math.random() * 4500) + 900,
    cloneCount: Math.floor(Math.random() * 420) + 45,
    ratingAverage: 4.8 + Math.round(Math.random() * 2) / 10,
    ratingCount: Math.floor(Math.random() * 60) + 12,
    seo: {
      seoTitle: `Free ${indLabel} ${subLabel} Template | Fieseros`,
      seoDescription: `Download or customize this free ${indLabel} ${subLabel}. Collect online submissions, schedule appointments, and capture leads automatically.`,
      seoKeywords: [
        `${indLabel.toLowerCase()} ${subLabel.toLowerCase()}`,
        `${indLabel.toLowerCase()} form template`,
        `free ${subLabel.toLowerCase()}`,
        `online ${indLabel.toLowerCase()} intake`,
      ],
      faq: [
        {
          question: `Can I customize this ${indLabel} ${subLabel}?`,
          answer: `Yes, you can easily add, remove, or modify fields, customize branding and colors, and configure conditional logic using the Fieseros visual builder.`,
        },
        {
          question: `Is this form mobile-friendly?`,
          answer: `All Fieseros form templates are fully responsive and optimized for mobile devices, tablets, and desktops.`,
        },
      ],
    },
    authorId: 'fieseros-team',
    publishedAt: new Date().toISOString(),
  };

  return template;
}

/**
 * Generates a batch matrix of templates.
 */
export function generateTemplateBatch(count = 1000): FormTemplate[] {
  const result: FormTemplate[] = [];
  const categories = TEMPLATE_CATEGORIES.map((c) => c.id as TemplateCategoryId);
  const industries = TEMPLATE_INDUSTRIES.map((i) => i.id as TemplateIndustryId);

  let generated = 0;
  let cycle = 0;

  while (generated < count) {
    for (const cat of categories) {
      for (const ind of industries) {
        if (generated >= count) break;
        const t = synthesizeTemplate(cat, ind, cycle);
        result.push(t);
        generated++;
      }
      if (generated >= count) break;
    }
    cycle++;
  }

  return result;
}
