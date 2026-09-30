/**
 * Form Experience Structures — 50 Professional Form Archetypes
 *
 * Solves template fatigue by providing 50 distinct architectural skeletons
 * across 10 Master Experience Engines, ensuring every template on Fieseros
 * feels like a purpose-built, high-converting application rather than a duplicate form.
 */

import type { FormLayout } from '../resolve-form-layout';

export type ExperienceEngineType =
  | 'split_hero'           // 1. Two-Column Hero Split
  | 'quote_calculator'     // 2. Interactive Price Estimator / Quote Calculator
  | 'card_swipe'           // 3. Conversational Card-by-Card Swipe
  | 'milestone_stepper'    // 4. Multi-Step Milestone Stepper
  | 'visual_choice_grid'   // 5. Visual Choice Card Grid
  | 'booking_scheduler'    // 6. Booking & Appointment Scheduler Flow
  | 'diagnostic_quiz'      // 7. Diagnostic / Triage Branching Quiz Funnel
  | 'compact_drawer'       // 8. Compact Floating / Slide-Over Drawer
  | 'field_inspection'     // 9. Inspection / Checklist Form
  | 'contract_signature';  // 10. E-Signature Contract & Waiver

export interface FormExperienceStructure {
  id: string;
  name: string;
  engine: ExperienceEngineType;
  layout: FormLayout;
  description: string;
  recommendedStepCount: number;
  highlightedFeatures: string[];
  keyWidgets: string[];
  bestForIndustries: string[];
  conversionRationale: string;
}

export const FORM_EXPERIENCE_ENGINES: Record<
  ExperienceEngineType,
  { title: string; subtitle: string; defaultLayout: FormLayout; count: number }
> = {
  split_hero: {
    title: 'Two-Column Hero Split',
    subtitle: '50/50 or 40/60 hero with persistent social proof, imagery, or video on one side and streamlined inputs on the other.',
    defaultLayout: 'split_media',
    count: 5,
  },
  quote_calculator: {
    title: 'Interactive Price Estimator & Quote Engine',
    subtitle: 'Real-time dynamic cost calculation with slider/tier selectors, itemized breakdown, and instant deposit checkout.',
    defaultLayout: 'classic',
    count: 5,
  },
  card_swipe: {
    title: 'Card-by-Card Conversational Flow',
    subtitle: 'Single question per viewport with smooth keyboard navigation, high immersion, and minimal cognitive load.',
    defaultLayout: 'card',
    count: 5,
  },
  milestone_stepper: {
    title: 'Multi-Step Milestone Stepper',
    subtitle: 'Segmented chapters with clear progress indicators, conditional skip-logic, and persistent breadcrumbs.',
    defaultLayout: 'classic',
    count: 5,
  },
  visual_choice_grid: {
    title: 'Visual Choice Card Grid',
    subtitle: 'Rich card selections with photography, icons, badges, and pricing pills instead of plain radio lists.',
    defaultLayout: 'classic',
    count: 5,
  },
  booking_scheduler: {
    title: 'Appointment & Booking Engine',
    subtitle: 'Integrated live availability calendar, timezone intelligence, technician dispatch, and instant confirmation.',
    defaultLayout: 'classic',
    count: 5,
  },
  diagnostic_quiz: {
    title: 'Diagnostic & Triage Funnel',
    subtitle: 'Symptom checker, recommendation quiz, qualification scoring, and tailored outcome routing.',
    defaultLayout: 'card',
    count: 5,
  },
  compact_drawer: {
    title: 'Compact Lead Capture & Drawer',
    subtitle: 'Ultra-low friction 2-to-4 field micro-forms designed for rapid submission, click-to-call, and mobile conversion.',
    defaultLayout: 'classic',
    count: 5,
  },
  field_inspection: {
    title: 'Field Inspection & Audit Checklist',
    subtitle: 'Multi-point verification with pass/fail toggles, photo evidence upload, geolocation tagging, and inspector notes.',
    defaultLayout: 'classic',
    count: 5,
  },
  contract_signature: {
    title: 'E-Signature Contract & Legal Waiver',
    subtitle: 'Document layout with formal terms, scroll-to-agree clauses, secure canvas drawing signature, and PDF export.',
    defaultLayout: 'classic',
    count: 5,
  },
};

export const FORM_STRUCTURES_50: FormExperienceStructure[] = [
  // ─── Engine 1: Two-Column Hero Split (5 structures) ───────────────────────
  {
    id: 'split_hero_editorial',
    name: 'Editorial Magazine Hero Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'High-aesthetic split with bold photography, brand story statement, and minimalist typography.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Sticky left photography', 'Minimal border styling', 'Editorial headline font'],
    keyWidgets: ['static_image', 'heading', 'paragraph', 'short_answer', 'email', 'submit_button'],
    bestForIndustries: ['Interior Design', 'Architecture', 'Luxury Real Estate', 'Photography'],
    conversionRationale: 'Builds immediate emotional value and prestige before requesting contact details.',
  },
  {
    id: 'split_hero_video_explainer',
    name: 'Video Explainer Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Video hero on left (demo / case study) with concise inquiry form on right.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Autoplay muted video embed', 'Customer testimonial pill', 'Instant callback input'],
    keyWidgets: ['video_embed', 'short_answer', 'phone', 'dropdown', 'submit_button'],
    bestForIndustries: ['SaaS', 'Consulting', 'Solar Installation', 'Dental Implants'],
    conversionRationale: 'Video answers top objections passively while the customer fills in their details.',
  },
  {
    id: 'split_hero_trust_proof',
    name: 'Trust & Badges Pro Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Left column dedicated to Google 5-star ratings, license verification, warranty badges, and guarantee bullets.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Verified license badge', 'Review ticker', 'Guaranteed response timer'],
    keyWidgets: ['rating', 'alert_widget', 'short_answer', 'phone', 'address', 'submit_button'],
    bestForIndustries: ['Roofing', 'HVAC Repair', 'Emergency Plumbing', 'Locksmith'],
    conversionRationale: 'Eliminates distrust for emergency high-ticket home repairs.',
  },
  {
    id: 'split_hero_case_study',
    name: 'Before/After Case Study Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Features interactive before/after transformation imagery alongside project quote request.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Split comparison view', 'Project budget range', 'Timeline selector'],
    keyWidgets: ['static_image', 'radio', 'dropdown', 'file_upload', 'submit_button'],
    bestForIndustries: ['Landscaping', 'Kitchen Remodeling', 'Plastic Surgery', 'Auto Detailing'],
    conversionRationale: 'Visual transformation provides concrete proof of outcome.',
  },
  {
    id: 'split_hero_map_dispatch',
    name: 'Service Territory Map Split',
    engine: 'split_hero',
    layout: 'split_media',
    description: 'Live interactive service radius map on left with instant address lookup & dispatch check on right.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Map radius embed', 'Zip code auto-validator', 'ETA arrival indicator'],
    keyWidgets: ['map_embed', 'address', 'phone', 'dropdown', 'submit_button'],
    bestForIndustries: ['Towing & Recovery', 'Courier & Logistics', 'Mobile Vet', 'Pest Control'],
    conversionRationale: 'Confirms immediate service availability to lock in the lead.',
  },

  // ─── Engine 2: Interactive Quote Calculator (5 structures) ────────────────
  {
    id: 'quote_slider_matrix',
    name: 'Square Footage & Dimension Calculator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Calculates instant price estimates based on square footage sliders, room counts, and material grade.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Dynamic live formula total', 'Square footage slider', 'Material tier selectors'],
    keyWidgets: ['calculation_widget', 'number', 'dropdown', 'single_choice', 'submit_button'],
    bestForIndustries: ['Flooring', 'Painting', 'Roofing', 'Pressure Washing'],
    conversionRationale: 'Gives customers instant price transparency while capturing contact info to lock in the quote.',
  },
  {
    id: 'quote_tiered_package',
    name: 'Tiered Package Customizer',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Side-by-side Silver / Gold / Platinum tiers with optional add-on checkboxes and real-time total.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Package comparison matrix', 'Add-on checkboxes', 'Deposit checkout toggle'],
    keyWidgets: ['multiple_choice', 'single_choice', 'payment_gateway', 'submit_button'],
    bestForIndustries: ['Car Detailing', 'Wedding Photography', 'Web Design', 'Accounting'],
    conversionRationale: 'Anchoring and tier choices encourage upsells and increase average order value.',
  },
  {
    id: 'quote_equipment_lease',
    name: 'Equipment Rental & Duration Estimator',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Computes multi-day or monthly rental costs based on date ranges, machine type, and insurance add-ons.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Date-range duration math', 'Security deposit line item', 'Delivery fee calculator'],
    keyWidgets: ['date_picker', 'dropdown', 'calculation_widget', 'checkbox', 'submit_button'],
    bestForIndustries: ['Heavy Machinery Rental', 'Event Party Rentals', 'Audio/Visual Gear'],
    conversionRationale: 'Removes back-and-forth quoting cycles for fixed rental assets.',
  },
  {
    id: 'quote_recurring_retainer',
    name: 'Subscription & Retainer Builder',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Configures weekly/monthly recurring cleaning, maintenance, or advisory service retainers.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Frequency discount toggles (Weekly -15%, Monthly -5%)', 'Recurring billing preview'],
    keyWidgets: ['single_choice', 'number', 'payment_gateway', 'submit_button'],
    bestForIndustries: ['Commercial Cleaning', 'Pool Maintenance', 'Managed IT Support', 'Social Media Agencies'],
    conversionRationale: 'Incentivizes recurring contracts through visible frequency savings.',
  },
  {
    id: 'quote_itemized_cart',
    name: 'Menu & Parts Order Requisition',
    engine: 'quote_calculator',
    layout: 'classic',
    description: 'Itemized catalog with quantity steppers, subtotal breakdown, tax calculation, and instant payment.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Quantity counters', 'Live tax/fee calculation', 'Card & UPI gateway integration'],
    keyWidgets: ['number', 'calculation_widget', 'payment_gateway', 'address', 'submit_button'],
    bestForIndustries: ['Catering Menus', 'Appliance Parts', 'Uniform Orders', 'Bakeries'],
    conversionRationale: 'Acts like a complete lightweight eCommerce checkout without requiring an online store.',
  },

  // ─── Engine 3: Card-by-Card Conversational Flow (5 structures) ────────────
  {
    id: 'card_one_question_typeform',
    name: 'Zen Minimalist One-At-A-Time',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Clean single question card with large typography, keyboard shortcuts (A/B/C/Enter), and progress dot indicators.',
    recommendedStepCount: 5,
    highlightedFeatures: ['Enter to continue prompt', 'Smooth animated transitions', 'Keybinding hints'],
    keyWidgets: ['short_answer', 'single_choice', 'email', 'phone', 'submit_button'],
    bestForIndustries: ['Executive Coaching', 'Talent Recruitment', 'Private Wealth Advisory', 'Venture Capital'],
    conversionRationale: 'Zero cognitive overload; each screen requires a single frictionless micro-decision.',
  },
  {
    id: 'card_visual_story',
    name: 'Narrative Storyboarding Experience',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Cards pair a full-bleed themed illustration or background with each query to tell a journey.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Themed card illustrations', 'Tone-matching microcopy', 'Interactive feedback'],
    keyWidgets: ['single_choice', 'multiple_choice', 'rating', 'submit_button'],
    bestForIndustries: ['Travel Planning', 'Event Design', 'Brand Strategy', 'Fitness Transformation'],
    conversionRationale: 'Engages emotional imagination so questions feel like a consultation rather than an interrogation.',
  },
  {
    id: 'card_micro_survey',
    name: 'CSAT & Micro-Pulse Swipe',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Speedy 3-card customer satisfaction pulse with emoji rating, tag selection, and optional voice/text note.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Emoji CSAT scale', 'One-tap feedback pills', 'Optional textarea'],
    keyWidgets: ['rating', 'multiple_choice', 'long_answer', 'submit_button'],
    bestForIndustries: ['Hospitality & Hotels', 'Post-Service Feedback', 'Restaurants', 'Retail'],
    conversionRationale: 'Takes under 20 seconds to finish, boosting survey completion rates from 12% to 65%.',
  },
  {
    id: 'card_qualification_screener',
    name: 'High-Ticket Client Screener',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Disqualifies unvetted leads before booking by filtering revenue, urgency, and project scope.',
    recommendedStepCount: 5,
    highlightedFeatures: ['Knockout question routing', 'Calendar reveal on qualification', 'Budget threshold filters'],
    keyWidgets: ['single_choice', 'dropdown', 'appointment_booking', 'submit_button'],
    bestForIndustries: ['Legal Defense', 'Custom Home Builders', 'B2B Sales Consulting', 'M&A Advisory'],
    conversionRationale: 'Protects team time by ensuring only qualified prospects reach the booking calendar.',
  },
  {
    id: 'card_interactive_poll',
    name: 'Community & Event Poll Flow',
    engine: 'card_swipe',
    layout: 'card',
    description: 'Gamified voting card flow that reveals live crowd percentages after each vote.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Live percentage feedback', 'Social share CTA', 'Instant registration'],
    keyWidgets: ['single_choice', 'email', 'submit_button'],
    bestForIndustries: ['Conferences', 'Webinars', 'Media Publications', 'Non-Profits'],
    conversionRationale: 'Instant curiosity payoff keeps respondent hooked till the end.',
  },

  // ─── Engine 4: Multi-Step Milestone Stepper (5 structures) ────────────────
  {
    id: 'stepper_numbered_timeline',
    name: 'Progressive Milestone Roadmap',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Top horizontal roadmap showing numbered circles (1: Property, 2: Scope, 3: Schedule, 4: Confirm).',
    recommendedStepCount: 4,
    highlightedFeatures: ['Numbered milestone circles', 'Step validation locking', 'Saved draft indicator'],
    keyWidgets: ['address', 'multiple_choice', 'date_picker', 'short_answer', 'submit_button'],
    bestForIndustries: ['General Contracting', 'Mortgage Pre-Approval', 'Commercial Lease Applications'],
    conversionRationale: 'Explicit step clarity reduces form abandonment for complex, multi-stage data gathering.',
  },
  {
    id: 'stepper_tabbed_sections',
    name: 'Tabbed Folder Inspector Stepper',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Tabs styled like architectural folder sections allowing non-linear navigation between verified steps.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Clickable tab headers', 'Per-tab error badges', 'All-tab review summary'],
    keyWidgets: ['short_answer', 'dropdown', 'file_upload', 'checkbox', 'submit_button'],
    bestForIndustries: ['Franchise Inquiries', 'Clinical Trials', 'Vendor Registration'],
    conversionRationale: 'Gives power users freedom to fill sections out of order without losing place.',
  },
  {
    id: 'stepper_accordion_flow',
    name: 'Collapsing Accordion Stepper',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Steps expand and collapse vertically; completed steps show a green checkmark and condensed summary.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Auto-advancing accordion', 'Inline edit pencil icon', 'Green completion checkmarks'],
    keyWidgets: ['short_answer', 'phone', 'address', 'payment_gateway', 'submit_button'],
    bestForIndustries: ['Moving & Storage', 'Auto Insurance Quotes', 'Solar Consultation'],
    conversionRationale: 'Keeps entire context visible on one page without overwhelming vertical height.',
  },
  {
    id: 'stepper_percentage_bar',
    name: 'Gamified Progress Bar Journey',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Header features a live percentage meter ("You are 68% done!") with celebratory milestone tooltips.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Live percentage text', 'Smooth animated gradient bar', 'Micro-rewards on step advance'],
    keyWidgets: ['dropdown', 'single_choice', 'short_answer', 'email', 'submit_button'],
    bestForIndustries: ['Education & College Admissions', 'Bootcamp Applications', 'Personal Loan Intakes'],
    conversionRationale: 'Endowment effect: users refuse to quit once they see they are already past 50%.',
  },
  {
    id: 'stepper_split_preview',
    name: 'Stepper with Live Preview Receipt',
    engine: 'milestone_stepper',
    layout: 'classic',
    description: 'Right sidebar renders a live updating "Application Summary / Order Receipt" as the user fills steps.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Real-time summary sticky sidebar', 'Itemized selections', 'Print receipt option'],
    keyWidgets: ['single_choice', 'multiple_choice', 'calculation_widget', 'short_answer', 'submit_button'],
    bestForIndustries: ['Custom Framing', 'Custom PC Builders', 'Jewelry Engraving', 'Tailored Suits'],
    conversionRationale: 'Eliminates anxiety by showing exactly what will be submitted before clicking finish.',
  },

  // ─── Engine 5: Visual Choice Card Grid (5 structures) ────────────────────
  {
    id: 'grid_photo_selector',
    name: 'Visual Photography Portfolio Grid',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Grid of cards with high-resolution imagery and hover zoom for selecting service styles or problems.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Photo aspect ratio cards', 'Selected checkmark badge', 'Hover elevation shadow'],
    keyWidgets: ['single_choice', 'multiple_choice', 'short_answer', 'phone', 'submit_button'],
    bestForIndustries: ['Roof Damage Identification', 'Hair Styling Consultation', 'Tattoo Inquiries', 'Interior Flooring'],
    conversionRationale: 'Customers often know what they want by sight even if they lack technical terminology.',
  },
  {
    id: 'grid_icon_feature_tiles',
    name: 'Minimalist Icon Feature Tiles',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Crisp 3-column grid with custom line icons and bold titles for rapid category classification.',
    recommendedStepCount: 1,
    highlightedFeatures: ['SVG line icons', 'Subtle border highlight', 'Keyboard arrow navigation'],
    keyWidgets: ['single_choice', 'short_answer', 'email', 'submit_button'],
    bestForIndustries: ['SaaS Feature Requests', 'IT Trouble Ticket', 'Clinic Appointment Reason'],
    conversionRationale: 'Fast visual recognition speeds up intake by 3x over dropdown lists.',
  },
  {
    id: 'grid_price_tier_cards',
    name: 'Pricing Tier Comparison Cards',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: '3 featured pricing cards with "Most Popular" ribbon, feature bullet lists, and instant "Select" action.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Most Popular badge', 'Monthly/Annual billing toggle', 'Direct checkout binding'],
    keyWidgets: ['single_choice', 'payment_gateway', 'submit_button'],
    bestForIndustries: ['Gym Memberships', 'Coworking Desk Plans', 'Software Subscriptions', 'Lawn Care Packages'],
    conversionRationale: 'Proven standard SaaS layout applied directly to local service and subscription businesses.',
  },
  {
    id: 'grid_multi_select_tags',
    name: 'Interactive Tag & Symptom Cloud',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Modern selectable chips and pills for choosing issues, symptoms, or requested features in bulk.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Pill-shaped toggle chips', 'Color-coded severity tags', 'Quick select-all button'],
    keyWidgets: ['multiple_choice', 'long_answer', 'submit_button'],
    bestForIndustries: ['Medical Intake', 'Car Mechanic Diagnosis', 'App Bug Reports', 'Pet Care Symptoms'],
    conversionRationale: 'Feels effortless on mobile touchscreens without tedious checkbox clicking.',
  },
  {
    id: 'grid_vehicle_property_type',
    name: 'Property & Vehicle Blueprint Selector',
    engine: 'visual_choice_grid',
    layout: 'classic',
    description: 'Silhouette diagrams of residential home types (Ranch, Two-Story, Condo) or vehicles (Sedan, SUV, Truck).',
    recommendedStepCount: 2,
    highlightedFeatures: ['Architectural silhouette graphics', 'Dimension presets', 'Automatic complexity scoring'],
    keyWidgets: ['single_choice', 'address', 'phone', 'submit_button'],
    bestForIndustries: ['Solar Panel Sizing', 'Window Tinting', 'House Washing', 'Auto Glass Repair'],
    conversionRationale: 'Immediate visual association ensures accurate quote classification on first touch.',
  },

  // ─── Engine 6: Appointment & Booking Engine (5 structures) ────────────────
  {
    id: 'booking_calendar_inline',
    name: 'Full Calendar & Time Slot Picker',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Embedded calendar view with available day highlights and morning/afternoon time chip selector.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Live calendar date grid', '30/60 min time slot chips', 'Timezone auto-detector'],
    keyWidgets: ['appointment_booking', 'short_answer', 'email', 'phone', 'submit_button'],
    bestForIndustries: ['Hair Salons', 'Dental Clinics', 'Legal Consultations', 'Therapy Practices'],
    conversionRationale: 'Locks in appointments immediately rather than leaving leads floating in "we will call you" limbo.',
  },
  {
    id: 'booking_dispatch_window',
    name: 'Emergency Dispatch Arrival Window',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Optimized for same-day home services with 2-hour arrival windows and emergency dispatch alert.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Today / Tomorrow arrival blocks', 'Emergency priority fee toggle', 'SMS tracking opt-in'],
    keyWidgets: ['single_choice', 'address', 'phone', 'checkbox', 'submit_button'],
    bestForIndustries: ['Emergency Plumbing', 'HVAC Breakdown', 'Garage Door Repair', 'Locksmith'],
    conversionRationale: 'Emergency callers want to know WHEN someone can arrive, not just submit an email.',
  },
  {
    id: 'booking_provider_select',
    name: 'Staff / Stylist Selection Scheduler',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Choose your preferred specialist with profile photo, specialties, and bio before selecting a time.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Staff profile cards with photos', 'Individual staff calendars', '"Any Available" fast track'],
    keyWidgets: ['single_choice', 'appointment_booking', 'short_answer', 'submit_button'],
    bestForIndustries: ['Barbershops', 'Physical Therapy', 'Personal Training', 'Tattoo Artists'],
    conversionRationale: 'Customers are loyal to individual providers; choosing their pro increases attendance by 40%.',
  },
  {
    id: 'booking_deposit_lock',
    name: 'Booking with Deposit Pre-Authorization',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Reserves time slot only upon successful small reservation fee or card pre-authorization to prevent no-shows.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Stripe/PayPal deposit hold', 'No-show cancellation policy check', 'Calendar invite confirmation'],
    keyWidgets: ['appointment_booking', 'payment_gateway', 'checkbox', 'submit_button'],
    bestForIndustries: ['High-End Spas', 'Photography Studios', 'Private Tutoring', 'Home Inspection'],
    conversionRationale: 'Slashing no-show rates from 25% down to under 3% by attaching skin in the game.',
  },
  {
    id: 'booking_group_event',
    name: 'Group Workshop & Class RSVP',
    engine: 'booking_scheduler',
    layout: 'classic',
    description: 'Class dates with remaining seat counter ("Only 4 spots left!"), multi-ticket counter, and attendee names.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Live remaining capacity counter', 'Additional attendee name inputs', 'Add to Google/Apple Calendar'],
    keyWidgets: ['dropdown', 'number', 'short_answer', 'email', 'submit_button'],
    bestForIndustries: ['Cooking Classes', 'Fitness Bootcamps', 'First Aid Certification', 'Art Workshops'],
    conversionRationale: 'Scarcity indicators ("3 spots left") prompt immediate reservation.',
  },

  // ─── Engine 7: Diagnostic & Triage Funnel (5 structures) ───────────────────
  {
    id: 'diagnostic_symptom_triage',
    name: 'Home Appliance & System Triage',
    engine: 'diagnostic_quiz',
    layout: 'card',
    description: 'Troubleshooting tree: "Is it making a noise? Leaking? Not turning on?" routes to exact repair package.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Visual trouble icons', 'Conditional symptom routing', 'Estimated repair range verdict'],
    keyWidgets: ['single_choice', 'file_upload', 'short_answer', 'submit_button'],
    bestForIndustries: ['Appliance Repair', 'HVAC Diagnostics', 'Car Mechanic', 'Plumbing'],
    conversionRationale: 'Diagnosing the problem gives the user confidence that the technician knows what is wrong.',
  },
  {
    id: 'diagnostic_product_finder',
    name: 'Personalized Recommendation Quiz',
    engine: 'diagnostic_quiz',
    layout: 'card',
    description: 'Asks 4 lifestyle questions and recommends the exact product, plan, or service package matching answers.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Weighted scoring logic', 'Match percentage calculation', 'Instant tailored recommendation'],
    keyWidgets: ['single_choice', 'rating', 'email', 'submit_button'],
    bestForIndustries: ['Skincare & Cosmetics', 'Mattress Brands', 'Supplement Customizers', 'Life Insurance'],
    conversionRationale: 'Personalization shifts the mindset from browsing generic options to receiving a prescription.',
  },
  {
    id: 'diagnostic_cost_roi',
    name: 'Savings & ROI Benefit Calculator',
    engine: 'diagnostic_quiz',
    layout: 'classic',
    description: 'Input current utility or software bill to display projected annual savings graph with solar or modern upgrades.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Current vs Projected cost graph', 'Payback period indicator', 'Incentive rebate check'],
    keyWidgets: ['number', 'calculation_widget', 'short_answer', 'phone', 'submit_button'],
    bestForIndustries: ['Solar Installations', 'Energy Audits', 'B2B Automation Software', 'LED Retrofitting'],
    conversionRationale: 'Hard monetary numbers turn abstract investments into no-brainer financial decisions.',
  },
  {
    id: 'diagnostic_risk_assessment',
    name: 'Compliance & Risk Scorecard',
    engine: 'diagnostic_quiz',
    layout: 'classic',
    description: 'Multi-category audit that scores risk level (Low, Medium, Critical) and outputs a downloadable PDF report.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Category score meter', 'Red flag alert callouts', 'Executive summary gatekeeper'],
    keyWidgets: ['single_choice', 'checkbox', 'email', 'submit_button'],
    bestForIndustries: ['Cybersecurity Audits', 'OSHA Safety Inspections', 'Financial Wealth Health Check', 'HR Compliance'],
    conversionRationale: 'Revealing hidden risk creates urgency for professional remediation.',
  },
  {
    id: 'diagnostic_eligibility_screener',
    name: 'Legal Claim & Grant Eligibility Checker',
    engine: 'diagnostic_quiz',
    layout: 'card',
    description: 'Instant verification for class-action lawsuits, government tax credits, or small business funding.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Instant "You May Qualify!" verdict', 'Encrypted sensitive data entry', 'Next legal step lock-in'],
    keyWidgets: ['single_choice', 'dropdown', 'date_picker', 'submit_button'],
    bestForIndustries: ['Personal Injury Law', 'Tax Relief Programs', 'Government Grants', 'Disability Claims'],
    conversionRationale: 'Clear qualification verdict turns anxious seekers into committed clients.',
  },

  // ─── Engine 8: Compact Lead Capture & Drawer (5 structures) ───────────────
  {
    id: 'drawer_floating_callback',
    name: '30-Second Instant Callback Pill',
    engine: 'compact_drawer',
    layout: 'classic',
    description: 'Ultra-lean 2-field form ("Phone Number" + "Preferred Time") for immediate phone dispatch.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Two-field ultra high conversion', 'Pulsing telephone icon', 'Immediate response guarantee'],
    keyWidgets: ['phone', 'dropdown', 'submit_button'],
    bestForIndustries: ['Locksmiths', 'Bail Bonds', 'Emergency Towing', 'Roof Leak Emergencies'],
    conversionRationale: 'When an emergency happens, users bounce on anything longer than 2 fields.',
  },
  {
    id: 'drawer_zip_coverage_check',
    name: 'Zip Code Service Availability Gate',
    engine: 'compact_drawer',
    layout: 'classic',
    description: 'Single zip code input that validates if user is in coverage before opening secondary contact prompt.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Instant zip validation', 'Positive territory animation', 'Frictionless progression'],
    keyWidgets: ['short_answer', 'email', 'phone', 'submit_button'],
    bestForIndustries: ['Fiber Internet Providers', 'Food Delivery', 'Mobile Doctors', 'Junk Removal'],
    conversionRationale: 'Micro-commitment: typing a 5-digit zip code has a 94% initial completion rate.',
  },
  {
    id: 'drawer_lead_magnet_gate',
    name: 'Pricing Sheet / Guide Download Gate',
    engine: 'compact_drawer',
    layout: 'classic',
    description: 'Clean single-screen form offering instant access to "2026 Price List PDF" or "Contractor Checklist".',
    recommendedStepCount: 1,
    highlightedFeatures: ['PDF cover mockup badge', 'Instant download redirection', 'Minimal 3-field layout'],
    keyWidgets: ['short_answer', 'email', 'phone', 'submit_button'],
    bestForIndustries: ['Architects', 'Wedding Venues', 'Pool Builders', 'Financial Planners'],
    conversionRationale: 'High-intent prospects willingly exchange contact info for transparent pricing lists.',
  },
  {
    id: 'drawer_slide_in_tab',
    name: 'Corner Slide-Over Feedback & Inquiry',
    engine: 'compact_drawer',
    layout: 'classic',
    description: 'Persistent docked tab on bottom-right of website that expands cleanly without taking user off-page.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Compact overlay profile', 'Quick question dropdown', 'Dark/light backdrop blur'],
    keyWidgets: ['dropdown', 'short_answer', 'email', 'long_answer', 'submit_button'],
    bestForIndustries: ['eCommerce Inquiries', 'B2B Software Demo Request', 'Real Estate Listings'],
    conversionRationale: 'Never interrupts reading flow while remaining permanently available.',
  },
  {
    id: 'drawer_newsletter_vip_pass',
    name: 'VIP Club & Secret Discount Pass',
    engine: 'compact_drawer',
    layout: 'classic',
    description: 'Minimal email + SMS opt-in unlocking $50 off initial project or seasonal service coupon.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Instant discount coupon code display', 'TCPA compliant SMS opt-in', '1-click copy code'],
    keyWidgets: ['short_answer', 'email', 'phone', 'checkbox', 'submit_button'],
    bestForIndustries: ['Home Cleaning', 'Car Detailing', 'Carpet Cleaning', 'Lawn Care'],
    conversionRationale: 'Tangible immediate savings overcome hesitation on first-time bookings.',
  },

  // ─── Engine 9: Field Inspection & Audit Checklist (5 structures) ──────────
  {
    id: 'inspection_multipoint_vehicle',
    name: '100-Point Vehicle Condition Report',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Structured sections (Brakes, Tires, Engine, Interior) with Pass / Attention / Fail radio states.',
    recommendedStepCount: 4,
    highlightedFeatures: ['Pass/Fail/Caution colored buttons', 'Damage location tap map', 'Mechanic signature pad'],
    keyWidgets: ['single_choice', 'file_upload', 'signature_pad', 'short_answer', 'submit_button'],
    bestForIndustries: ['Auto Repair Shops', 'Used Car Inspections', 'Fleet Maintenance', 'Motorcycle Servicing'],
    conversionRationale: 'Builds massive client trust by visually proving why a repair is needed.',
  },
  {
    id: 'inspection_rental_move_in',
    name: 'Tenant Move-In / Move-Out Condition Audit',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Room-by-room inventory (Walls, Flooring, Appliances) with photo upload for existing scuffs and damage.',
    recommendedStepCount: 5,
    highlightedFeatures: ['Room-by-room subsections', 'Multiple photo upload attachments', 'Tenant & landlord signatures'],
    keyWidgets: ['dropdown', 'file_upload', 'signature_pad', 'checkbox', 'submit_button'],
    bestForIndustries: ['Property Management', 'Vacation Rental Turnover', 'Commercial Leasing', 'Storage Facilities'],
    conversionRationale: 'Protects both landlord and tenant with timestamped photo records.',
  },
  {
    id: 'inspection_hvac_tuneup',
    name: 'HVAC Seasonal Maintenance Checklist',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Technical reading inputs (Refrigerant PSI, Amperage, Temperature split) with automated status thresholds.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Numeric tolerance alerts', 'Filter size recording', 'Customer recommendation checkboxes'],
    keyWidgets: ['number', 'single_choice', 'signature_pad', 'short_answer', 'submit_button'],
    bestForIndustries: ['HVAC Contractors', 'Refrigeration Services', 'Boiler Maintenance', 'Solar Audits'],
    conversionRationale: 'Standardizes technician field workflow and produces instant customer-facing service sheets.',
  },
  {
    id: 'inspection_roof_damage_claim',
    name: 'Storm & Hail Damage Insurance Audit',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Hail strike test square counts, shingle condition, gutter dents, and insurance adjuster notes.',
    recommendedStepCount: 3,
    highlightedFeatures: ['GPS geolocation tagging', 'Photo grid with photo captions', 'Insurance claim policy input'],
    keyWidgets: ['file_upload', 'number', 'address', 'signature_pad', 'submit_button'],
    bestForIndustries: ['Roofing Contractors', 'Public Insurance Adjusters', 'Siding & Gutter Repair'],
    conversionRationale: 'Delivers insurance-grade documentation that speeds up claim approval.',
  },
  {
    id: 'inspection_food_safety_audit',
    name: 'Commercial Kitchen & Health Safety Log',
    engine: 'field_inspection',
    layout: 'classic',
    description: 'Daily HACCP log with walk-in cooler temperature logs, sanitization check, and supervisor sign-off.',
    recommendedStepCount: 3,
    highlightedFeatures: ['Critical control point warnings', 'Timestamped log entries', 'Digital manager sign-off'],
    keyWidgets: ['number', 'single_choice', 'signature_pad', 'date_picker', 'submit_button'],
    bestForIndustries: ['Restaurants', 'Food Processing', 'Hotel Banquets', 'Catering Facilities'],
    conversionRationale: 'Guarantees compliance and audit-readiness for city health department inspections.',
  },

  // ─── Engine 10: E-Signature Contract & Legal Waiver (5 structures) ─────────
  {
    id: 'contract_subcontractor_agreement',
    name: 'Trade Subcontractor Master Agreement',
    engine: 'contract_signature',
    layout: 'classic',
    description: 'Formal legal contract with scope of work schedule, payment milestones, indemnity clauses, and dual signatures.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Scroll-to-agree legal text box', 'Dual party signature blocks', 'W-9 & Insurance upload slots'],
    keyWidgets: ['long_answer', 'file_upload', 'signature_pad', 'checkbox', 'submit_button'],
    bestForIndustries: ['General Contractors', 'Electricians', 'Plumbers', 'Drywall Installers'],
    conversionRationale: 'Binds agreements legally in under 2 minutes right on a phone or tablet at the jobsite.',
  },
  {
    id: 'contract_sports_adventure_waiver',
    name: 'Adventure Sports & Activity Liability Waiver',
    engine: 'contract_signature',
    layout: 'classic',
    description: 'Parental consent, assumption of risk, medical emergency release, and quick touch signature for fast check-in.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Minor dependent sub-records', 'Emergency contact fields', 'Fast-tap finger signature'],
    keyWidgets: ['short_answer', 'phone', 'date_picker', 'checkbox', 'signature_pad', 'submit_button'],
    bestForIndustries: ['Trampoline Parks', 'Scuba Diving', 'Gun Ranges', 'Horseback Riding', 'Escape Rooms'],
    conversionRationale: 'Fast paperless waivers prevent lobby bottlenecks on busy weekend mornings.',
  },
  {
    id: 'contract_media_photo_release',
    name: 'Model & Commercial Video Release',
    engine: 'contract_signature',
    layout: 'classic',
    description: 'Perpetual media rights grant, shoot date verification, compensation acknowledgment, and digital signature.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Immediate photo capture verification', 'Jurisdiction selection', 'Instant signed copy email'],
    keyWidgets: ['short_answer', 'email', 'date_picker', 'checkbox', 'signature_pad', 'submit_button'],
    bestForIndustries: ['Film Production', 'Commercial Photography', 'Podcasts', 'Marketing Agencies'],
    conversionRationale: 'Secures legal clearances immediately before subjects leave the set.',
  },
  {
    id: 'contract_home_renovation_proposal',
    name: 'Change Order & Proposal Authorization',
    engine: 'contract_signature',
    layout: 'classic',
    description: 'Contractor change order stating unforeseen conditions, cost adjustments, schedule impact, and homeowner approval.',
    recommendedStepCount: 2,
    highlightedFeatures: ['Price adjustment calculation', 'Scope change narrative', 'Binding acceptance signature'],
    keyWidgets: ['calculation_widget', 'long_answer', 'signature_pad', 'submit_button'],
    bestForIndustries: ['Remodeling Contractors', 'Custom Builders', 'Pool Installers', 'Landscapers'],
    conversionRationale: 'Prevents billing disputes by requiring written sign-off before extra work begins.',
  },
  {
    id: 'contract_nda_confidentiality',
    name: 'Mutual Non-Disclosure Agreement (NDA)',
    engine: 'contract_signature',
    layout: 'classic',
    description: 'Standard 2-way proprietary data protection agreement with company details, governing law, and authorized signature.',
    recommendedStepCount: 1,
    highlightedFeatures: ['Standard bilateral confidentiality clauses', 'Corporate entity title input', 'PDF export binding'],
    keyWidgets: ['short_answer', 'email', 'dropdown', 'signature_pad', 'submit_button'],
    bestForIndustries: ['Tech Startups', 'Legal Practices', 'Product Inventors', 'Consulting Firms'],
    conversionRationale: 'Closes the legal loop instantly before taking exploratory partnership calls.',
  },
];

export function getFormStructureById(id: string): FormExperienceStructure | undefined {
  return FORM_STRUCTURES_50.find((s) => s.id === id);
}

export function getStructuresByEngine(engine: ExperienceEngineType): FormExperienceStructure[] {
  return FORM_STRUCTURES_50.filter((s) => s.engine === engine);
}

export function recommendStructureForTemplate(category?: string, industry?: string): FormExperienceStructure {
  const c = (category || '').toLowerCase();
  const i = (industry || '').toLowerCase();

  if (c.includes('estimate') || c.includes('quote') || c.includes('calculator') || i.includes('roof') || i.includes('floor')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'quote_slider_matrix') || FORM_STRUCTURES_50[5]!;
  }
  if (c.includes('booking') || c.includes('appointment') || c.includes('schedule') || i.includes('salon') || i.includes('clinic')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'booking_calendar_inline') || FORM_STRUCTURES_50[25]!;
  }
  if (c.includes('inspection') || c.includes('checklist') || c.includes('audit')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'inspection_multipoint_vehicle') || FORM_STRUCTURES_50[40]!;
  }
  if (c.includes('waiver') || c.includes('contract') || c.includes('agreement') || c.includes('signature')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'contract_subcontractor_agreement') || FORM_STRUCTURES_50[45]!;
  }
  if (c.includes('quiz') || c.includes('diagnostic') || c.includes('triage')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'diagnostic_symptom_triage') || FORM_STRUCTURES_50[30]!;
  }
  if (c.includes('lead') && (i.includes('emergency') || i.includes('locksmith') || i.includes('towing'))) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'drawer_floating_callback') || FORM_STRUCTURES_50[35]!;
  }
  if (c.includes('split') || i.includes('interior') || i.includes('architect') || i.includes('solar')) {
    return FORM_STRUCTURES_50.find((s) => s.id === 'split_hero_trust_proof') || FORM_STRUCTURES_50[2]!;
  }

  // Default to balanced visual split or progressive stepper
  return FORM_STRUCTURES_50[0]!;
}
