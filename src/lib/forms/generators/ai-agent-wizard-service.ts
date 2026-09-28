/**
 * AI Agent & Form Setup Wizard Generator Service
 *
 * Takes natural language business description, selected capabilities,
 * and generates a unified AI Agent, Form Schema, and Workflow triggers.
 */

import { FormAgentData, DEFAULT_FORM_AGENT, AVATAR_CATALOG } from '@/features/forms/types/agent-types';
import { FormField } from '@/lib/forms/form-schema-types';

export interface WizardGenerationInput {
  businessDescription: string;
  industry?: string;
  capabilities?: string[]; // e.g. 'answer_questions', 'capture_leads', 'generate_quotes', 'book_appointments', 'collect_files', 'take_payments'
  audience?: 'new_customers' | 'existing_customers' | 'both';
  knowledgeUrl?: string;
  tone?: 'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic';
}

export interface WizardGenerationResult {
  business: {
    name: string;
    industry: string;
    location: string;
    services: string[];
    summary: string;
  };
  agent: FormAgentData;
  form: {
    name: string;
    description: string;
    fields: FormField[];
    submitButtonText: string;
    theme: {
      primaryColor: string;
      layout: 'classic';
      borderRadius: string;
    };
  };
  workflow: {
    createLead: boolean;
    bookAppointment: boolean;
    sendConfirmationEmail: boolean;
    notifyPhone: boolean;
  };
}

/**
 * Parses freeform natural language text to infer business details.
 */
export function parseBusinessText(text: string): {
  businessName: string;
  industry: string;
  location: string;
  services: string[];
} {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Extract location heuristics
  let location = '';
  const locMatch = clean.match(/(?:in|serving|based in|located in|area of)\s+([A-Z][a-zA-Z\s,]+?)(?:\.|\n|offer|provide|specializ|$)/i);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim().replace(/,$/, '');
  }

  // Detect Industry & Services
  let industry = 'Home & Commercial Services';
  let businessName = 'Service Pro';
  let services: string[] = [];

  if (lower.includes('clean') || lower.includes('maid') || lower.includes('janitor')) {
    industry = 'Residential & Commercial Cleaning';
    businessName = location ? `${location} Premier Cleaning` : 'Sparkle Clean Pro';
    services = ['Regular Recurring Cleaning', 'Deep Clean & Sanitation', 'End-of-Tenancy Clean', 'Carpet & Upholstery Care'];
  } else if (lower.includes('plumb') || lower.includes('drain') || lower.includes('pipe') || lower.includes('water heater')) {
    industry = 'Plumbing & Emergency Drainage';
    businessName = location ? `${location} Rapid Plumbing` : 'Apex Plumbing & Drains';
    services = ['Emergency Leak Repair', 'Drain Unclogging & Jetting', 'Water Heater Replacement', 'Bathroom Plumbing'];
  } else if (lower.includes('hvac') || lower.includes('ac') || lower.includes('air condition') || lower.includes('furnace') || lower.includes('heat')) {
    industry = 'HVAC & Climate Control';
    businessName = location ? `${location} Climate Pros` : 'AirCare Heating & AC';
    services = ['Emergency AC Repair', 'Heating & Furnace Maintenance', 'Heat Pump Installation', 'Annual System Tune-Up'];
  } else if (lower.includes('roof') || lower.includes('gutter') || lower.includes('shingle')) {
    industry = 'Roofing & Exterior Construction';
    businessName = location ? `${location} Apex Roofing` : 'Precision Roofing Solutions';
    services = ['Roof Damage Inspection', 'Full Roof Replacement', 'Leak & Shingle Repair', 'Gutter Installation'];
  } else if (lower.includes('dental') || lower.includes('dentist') || lower.includes('teeth')) {
    industry = 'Dental & Oral Health Care';
    businessName = location ? `${location} Family Dental` : 'Clara Dental Studio';
    services = ['Routine Checkup & Cleaning', 'Emergency Toothache Relief', 'Teeth Whitening', 'Cosmetic Veneers & Implants'];
  } else if (lower.includes('doctor') || lower.includes('clinic') || lower.includes('patient') || lower.includes('health') || lower.includes('therapy')) {
    industry = 'Healthcare & Medical Clinic';
    businessName = location ? `${location} Wellness Medical` : 'Vitality Clinic';
    services = ['Initial Consultation', 'Specialist Assessment', 'Follow-up Treatment', 'Telehealth Review'];
  } else if (lower.includes('auto') || lower.includes('car') || lower.includes('mechanic') || lower.includes('towing') || lower.includes('brake')) {
    industry = 'Automotive Repair & Fleet Care';
    businessName = location ? `${location} Auto Works` : 'Apex Motor Care';
    services = ['Diagnostics & Engine Check', 'Brake Repair & Replacement', 'Oil & Filter Maintenance', 'Roadside Assistance & Towing'];
  } else if (lower.includes('law') || lower.includes('legal') || lower.includes('attorney') || lower.includes('lawyer')) {
    industry = 'Legal & Advisory Practice';
    businessName = location ? `${location} Legal Partners` : 'Apex Law Group';
    services = ['Free Case Evaluation', 'Contract Review & Drafting', 'Litigation Advice', 'Business Compliance'];
  } else {
    // General Service Fallback
    industry = 'Professional Services';
    businessName = location ? `${location} Service Specialists` : 'Premier Business Solutions';
    services = ['Standard Service Request', 'Custom Project Consultation', 'Urgent Support', 'Maintenance Program'];
  }

  // If text mentions explicit services, extract them
  const servicesMatch = clean.match(/(?:offer|services(?: include)?|provide)\s*[:]?\s*([^.]+)/i);
  if (servicesMatch && servicesMatch[1]) {
    const parsed = servicesMatch[1]
      .split(/,|and|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 40);
    if (parsed.length > 0) {
      services = parsed.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    }
  }

  // Extract explicit company name if mentioned e.g. "We are London Clean Co." or "I'm Sarah from Clean Co."
  const nameMatch = clean.match(/(?:we are|company is called|business name is|i am from|i'm from|welcome to)\s+([A-Z][a-zA-Z0-9\s&'-]+?)(?:,|\.|\n|serving|based|specializ|offer|$)/i);
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (candidate.length >= 3 && candidate.length <= 40) {
      businessName = candidate;
    }
  }

  return {
    businessName,
    industry,
    location,
    services,
  };
}

/**
 * Main Generation function: generates full FormAgentData, FormSchema, and workflow.
 */
export function generateAgentAndFormFromWizard(input: WizardGenerationInput): WizardGenerationResult {
  const { businessName, industry, location, services } = parseBusinessText(input.businessDescription || '');
  const capabilities = input.capabilities && input.capabilities.length > 0
    ? input.capabilities
    : ['answer_questions', 'capture_leads', 'generate_quotes', 'book_appointments'];

  const tone = input.tone || (industry.includes('Medical') || industry.includes('Legal') ? 'professional' : 'friendly');

  // Brand palette by industry
  let primaryColor = '#059669'; // Emerald default
  let avatarId = 'av_2'; // Alex default

  if (industry.includes('Cleaning')) {
    primaryColor = '#059669'; // Emerald
    avatarId = 'av_2'; // Alex
  } else if (industry.includes('Plumbing') || industry.includes('HVAC')) {
    primaryColor = '#0284c7'; // Sky / Blue
    avatarId = 'av_4'; // Sam
  } else if (industry.includes('Roofing')) {
    primaryColor = '#d97706'; // Amber / Construction
    avatarId = 'av_5'; // Max
  } else if (industry.includes('Dental') || industry.includes('Medical')) {
    primaryColor = '#0d9488'; // Teal
    avatarId = 'av_3'; // Clara
  } else if (industry.includes('Auto')) {
    primaryColor = '#e11d48'; // Rose / Red
    avatarId = 'av_7'; // Jake
  } else if (industry.includes('Legal') || industry.includes('Financial')) {
    primaryColor = '#4f46e5'; // Indigo
    avatarId = 'av_1'; // Nell
  }

  const selectedAvatar = AVATAR_CATALOG.find((a) => a.id === avatarId) || AVATAR_CATALOG[0];

  const agentRole = industry.includes('Cleaning')
    ? 'Cleaning Concierge & Booking Assistant'
    : industry.includes('Plumbing') || industry.includes('HVAC')
    ? 'Dispatch Coordinator & Service AI'
    : industry.includes('Roofing')
    ? 'Estimate & Inspection Specialist'
    : industry.includes('Medical') || industry.includes('Dental')
    ? 'Patient Intake & Care Navigator'
    : industry.includes('Auto')
    ? 'Service Advisor & Diagnostics Assistant'
    : 'Client Concierge & Intake Assistant';

  const agentFirstName = selectedAvatar.name.split(' ')[0] || 'Sarah';

  // 1. Quick Action Buttons
  const quickActions = [];
  if (capabilities.includes('generate_quotes') || capabilities.includes('capture_leads')) {
    quickActions.push({
      id: 'qa_quote',
      label: 'Get Instant Estimate',
      icon: 'FileText',
      actionType: 'open_form' as const,
      payload: 'form_intake',
    });
  }
  if (capabilities.includes('book_appointments')) {
    quickActions.push({
      id: 'qa_book',
      label: 'Book Appointment',
      icon: 'Calendar',
      actionType: 'booking' as const,
      payload: 'booking',
    });
  }
  quickActions.push({
    id: 'qa_services',
    label: 'Our Services & Rates',
    icon: 'Sparkles',
    actionType: 'message' as const,
    payload: 'What services do you offer and what are your rates?',
  });
  if (location) {
    quickActions.push({
      id: 'qa_location',
      label: `Service Area (${location})`,
      icon: 'MapPin',
      actionType: 'message' as const,
      payload: `Do you service my area around ${location}?`,
    });
  }

  // 2. FAQs
  const faqPairs = [
    {
      id: 'faq_1',
      question: 'How quickly can I get an estimate?',
      answer: `You can get an estimate in less than 2 minutes right here! Simply click "Get Instant Estimate" or tell me about your project details.`,
    },
    {
      id: 'faq_2',
      question: `What areas do you cover?`,
      answer: location
        ? `We proudly serve all of ${location} and surrounding areas.`
        : `We cover the entire metro service area with prompt dispatch.`,
    },
    {
      id: 'faq_3',
      question: 'Are your technicians licensed and insured?',
      answer: `Yes, 100%. All our technicians and staff are fully licensed, vetted, and covered with full liability insurance.`,
    },
  ];

  // 3. System Prompt
  const servicesListStr = services.map((s) => `• ${s}`).join('\n');
  const systemPrompt = `You are ${agentFirstName}, the official AI assistant for ${businessName}.
Your Role: ${agentRole}
Location: ${location || 'our service area'}

Our Services:
${servicesListStr}

Your Goals:
1. Answer customer questions politely, concisely, and accurately with a ${tone} tone.
2. When customers want an estimate, price, or booking, proactively guide them to click "Get Instant Estimate" or fill out our intake form.
3. Be transparent: explain that quotes are based on property specifications and verified by our team.
4. If an urgent or emergency request is made, reassure the customer and prioritize collecting their name, phone number, and address immediately.`;

  // 4. Form Fields Construction
  const formFields: FormField[] = [
    {
      id: 'f_name',
      type: 'short_answer',
      label: 'Full Name',
      placeholder: 'e.g. John Doe',
      required: true,
      layoutWidth: 'half',
    },
    {
      id: 'f_phone',
      type: 'phone',
      label: 'Phone Number',
      placeholder: 'e.g. +44 7123 456789',
      required: true,
      layoutWidth: 'half',
    },
    {
      id: 'f_email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'e.g. john@example.com',
      required: true,
      layoutWidth: 'full',
    },
  ];

  // Industry-specific service selector
  if (services.length > 0) {
    formFields.push({
      id: 'f_service',
      type: 'dropdown',
      label: 'Service Required',
      placeholder: 'Select a service...',
      required: true,
      layoutWidth: 'full',
      options: services.map((s, idx) => ({
        label: s,
        value: `service_${idx + 1}`,
      })),
    });
  }

  // Industry-specific property/issue fields
  if (industry.includes('Cleaning')) {
    formFields.push(
      {
        id: 'f_property_type',
        type: 'dropdown',
        label: 'Property Type',
        placeholder: 'Select property type',
        required: true,
        layoutWidth: 'half',
        options: [
          { label: 'Apartment / Flat', value: 'apartment' },
          { label: 'House / Detached', value: 'house' },
          { label: 'Office / Commercial', value: 'office' },
        ],
      },
      {
        id: 'f_bedrooms',
        type: 'dropdown',
        label: 'Bedrooms',
        placeholder: 'Number of bedrooms',
        required: true,
        layoutWidth: 'half',
        options: [
          { label: 'Studio / 1 Bedroom', value: '1' },
          { label: '2 Bedrooms', value: '2' },
          { label: '3 Bedrooms', value: '3' },
          { label: '4+ Bedrooms', value: '4_plus' },
        ],
      }
    );
  } else if (industry.includes('Plumbing') || industry.includes('HVAC')) {
    formFields.push(
      {
        id: 'f_urgency',
        type: 'radio',
        label: 'Urgency Level',
        required: true,
        layoutWidth: 'full',
        options: [
          { label: '🚨 Emergency — Immediate Response Needed', value: 'emergency' },
          { label: '📅 Routine — Within Next 24-48 Hours', value: 'routine' },
          { label: '💬 Consultation / Future Project', value: 'consultation' },
        ],
      }
    );
  }

  // Address
  formFields.push({
    id: 'f_address',
    type: 'address',
    label: 'Service Location / Address',
    placeholder: location ? `Street address in ${location}...` : 'Enter service address and postal code',
    required: true,
    layoutWidth: 'full',
  });

  // Date & Time
  if (capabilities.includes('book_appointments')) {
    formFields.push({
      id: 'f_preferred_date',
      type: 'date',
      label: 'Preferred Appointment Date',
      required: false,
      layoutWidth: 'half',
    });
    formFields.push({
      id: 'f_preferred_time',
      type: 'time',
      label: 'Preferred Time Window',
      required: false,
      layoutWidth: 'half',
    });
  }

  // Photo / File upload
  if (capabilities.includes('collect_files') || industry.includes('Cleaning') || industry.includes('Roofing') || industry.includes('Plumbing')) {
    formFields.push({
      id: 'f_photos',
      type: 'photo',
      label: 'Upload Photos of Property / Area (Optional)',
      helpText: 'Helps us calculate a faster, more accurate estimate.',
      required: false,
      layoutWidth: 'full',
    });
  }

  // Notes
  formFields.push({
    id: 'f_notes',
    type: 'long_answer',
    label: 'Additional Project Details or Special Requests',
    placeholder: 'Tell us anything specific we should know before dispatch...',
    required: false,
    layoutWidth: 'full',
  });

  // Assemble Agent Data
  const generatedAgent: FormAgentData = {
    ...DEFAULT_FORM_AGENT,
    id: `agent_${Date.now()}`,
    slug: `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ai`,
    name: `${businessName} Assistant`,
    roleTitle: agentRole,
    avatarUrl: selectedAvatar.url,
    brandColor: primaryColor,
    voiceTone: tone,
    welcomeGreeting: `Hi! 👋 I'm **${agentFirstName}**, your AI assistant for **${businessName}**. How can I help you today?`,
    greetingSubtitle: `Instant estimates, service booking, and 24/7 answers in seconds.`,
    quickActions,
    knowledge: {
      crawledUrls: input.knowledgeUrl ? [input.knowledgeUrl] : [],
      documents: [],
      faqPairs,
      systemPrompt,
      guardrails: [
        'Be polite, reassuring, and concise.',
        'Never invent pricing not verified by the company.',
        'Always guide ready customers to complete the intake form or booking.',
      ],
    },
    navigation: {
      chatEnabled: true,
      voiceEnabled: true,
      formsEnabled: true,
      historyEnabled: true,
      presentationEnabled: false,
      whatsappEnabled: false,
    },
    channels: {
      ...DEFAULT_FORM_AGENT.channels,
      activeChannel: 'chatbot',
      chatbot: {
        ...DEFAULT_FORM_AGENT.channels.chatbot,
        primaryColor,
        greetingBubble: `👋 Need a quote or have questions for ${businessName}? I'm here to help 24/7!`,
        placeholderMessage: `Ask anything about our services, pricing, or bookings...`,
      },
    },
  };

  // Assemble Form Schema
  const generatedForm = {
    name: `${businessName} Intake & Quote Form`,
    description: `Complete this brief form to receive an instant estimate and book your service with ${businessName}.`,
    fields: formFields,
    submitButtonText: capabilities.includes('book_appointments') ? 'Submit & Confirm Booking' : 'Request Free Quote',
    theme: {
      primaryColor,
      layout: 'classic' as const,
      borderRadius: '16px',
    },
  };

  return {
    business: {
      name: businessName,
      industry,
      location: location || 'All Service Areas',
      services,
      summary: `${businessName} is a leading ${industry} provider${location ? ` in ${location}` : ''}.`,
    },
    agent: generatedAgent,
    form: generatedForm,
    workflow: {
      createLead: true,
      bookAppointment: capabilities.includes('book_appointments'),
      sendConfirmationEmail: true,
      notifyPhone: true,
    },
  };
}
