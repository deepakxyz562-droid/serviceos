export type AgentChannelType =
  | 'chatbot'
  | 'standalone'
  | 'instagram'
  | 'whatsapp'
  | 'phone'
  | 'gmail'
  | 'presentation'
  | 'voice'
  | 'messenger'
  | 'sms'
  | 'crm';

export interface QuickActionButton {
  id: string;
  label: string;
  icon?: string;
  actionType: 'message' | 'open_form' | 'booking' | 'link';
  targetFormId?: string;
  payload?: string;
}

export interface FaqPair {
  id: string;
  question: string;
  answer: string;
}

export interface TrainingDocument {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'url' | 'text' | 'faq';
  status: 'indexed' | 'indexing' | 'failed';
  snippet?: string;
  indexedAt: string;
}

export interface ConnectedFormRef {
  id: string;
  name: string;
  description?: string | null;
  submissionCount?: number;
  schema?: any;
}

export interface FormAgentData {
  id: string;
  tenantId?: string;
  slug: string;
  name: string;
  roleTitle: string; // e.g. "Dental Appointment Assistant"
  avatarUrl: string;
  statusText: string; // e.g. "Online & Active"
  brandColor: string;
  voiceTone: 'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic';
  
  // Greeting & Welcome
  welcomeGreeting: string;
  greetingSubtitle?: string;
  quickActions: QuickActionButton[];

  // Navigation Tabs in Agent Interface
  navigation: {
    chatEnabled: boolean;
    voiceEnabled: boolean;
    formsEnabled: boolean;
    historyEnabled: boolean;
    presentationEnabled: boolean;
    whatsappEnabled: boolean;
  };

  // Connected AI Forms
  connectedForms: ConnectedFormRef[];

  // Knowledge & Training
  knowledge: {
    crawledUrls: string[];
    documents: TrainingDocument[];
    faqPairs: FaqPair[];
    systemPrompt: string;
    guardrails: string[];
  };

  // Publish & Channels
  channels: {
    activeChannel: AgentChannelType;
    chatbot: {
      enabled: boolean;
      position: 'bottom-right' | 'bottom-left' | 'fullscreen' | 'drawer';
      primaryColor: string;
      greetingBubble: string;
    };
    standalone: {
      enabled: boolean;
      slug: string;
      customDomain?: string;
    };
    whatsapp: {
      enabled: boolean;
      phoneNumber?: string;
      paired: boolean;
    };
    phone: {
      enabled: boolean;
      phoneNumber?: string;
      voiceId: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber?: string;
    };
    instagram: {
      enabled: boolean;
      accountHandle?: string;
    };
    gmail: {
      enabled: boolean;
      autoReply: boolean;
    };
    crm: {
      enabled: boolean;
      provider: 'fieseros' | 'salesforce' | 'hubspot';
      autoCreateLead: boolean;
    };
  };

  metrics: {
    totalConversations: number;
    totalFormSubmissions: number;
    avgSatisfactionRating: number;
  };

  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_FORM_AGENT: FormAgentData = {
  id: 'agent_alex',
  slug: 'alex-assistant',
  name: 'Alex',
  roleTitle: 'Customer Support & Intake Specialist',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  statusText: 'Online & Active',
  brandColor: '#059669',
  voiceTone: 'friendly',
  welcomeGreeting: "Hi, I'm **Alex**, an AI Assistant ready to help you. How may I assist you today?",
  greetingSubtitle: 'Ask questions, get estimates, schedule bookings, or fill out connected forms.',
  quickActions: [
    { id: 'qa_1', label: 'Book an Appointment', actionType: 'message', payload: 'I would like to schedule an appointment.' },
    { id: 'qa_2', label: 'Complete Request Form', actionType: 'open_form', payload: 'form_1' },
    { id: 'qa_3', label: 'Services & Pricing', actionType: 'message', payload: 'What services do you offer and what are your rates?' },
    { id: 'qa_4', label: 'Business Hours & Contact', actionType: 'message', payload: 'What are your operating hours and office location?' },
  ],
  navigation: {
    chatEnabled: true,
    voiceEnabled: true,
    formsEnabled: true,
    historyEnabled: true,
    presentationEnabled: false,
    whatsappEnabled: true,
  },
  connectedForms: [
    {
      id: 'form_1',
      name: 'General Customer Request & Intake Form',
      description: 'Customer contact information and service request details.',
      submissionCount: 24,
    },
  ],
  knowledge: {
    crawledUrls: ['https://example.com/about', 'https://example.com/services'],
    documents: [
      {
        id: 'doc_1',
        name: 'Company_Services_and_FAQ_Guide.pdf',
        size: 195000,
        type: 'pdf',
        status: 'indexed',
        indexedAt: new Date().toISOString(),
      },
    ],
    faqPairs: [
      { id: 'faq_1', question: 'How quickly can I get a quote?', answer: 'We typically provide instant online estimates or respond within 15 minutes during business hours.' },
      { id: 'faq_2', question: 'What payment methods do you accept?', answer: 'We accept all major credit/debit cards, Apple Pay, Google Pay, PayPal, ACH, and Net-30 purchase orders.' },
    ],
    systemPrompt: 'You are Alex, an intelligent, courteous, and efficient AI assistant. Answer customer inquiries clearly, provide service details, help schedule appointments, and guide customers to complete the connected intake form.',
    guardrails: [
      'Always maintain a polite, professional, and helpful tone.',
      'If unsure of specific pricing not covered in knowledge docs, offer to collect customer details for a manager follow-up.',
      'Guide users to complete the attached form for accurate processing.',
    ],
  },
  channels: {
    activeChannel: 'chatbot',
    chatbot: {
      enabled: true,
      position: 'bottom-right',
      primaryColor: '#059669',
      greetingBubble: '👋 Have a question or need a quote? Chat with Alex!',
    },
    standalone: {
      enabled: true,
      slug: 'alex-assistant',
    },
    whatsapp: {
      enabled: true,
      phoneNumber: '+1 (555) 234-5678',
      paired: true,
    },
    phone: {
      enabled: true,
      phoneNumber: '+1 (800) 555-SERV',
      voiceId: 'Josh',
    },
    sms: {
      enabled: true,
      phoneNumber: '+1 (555) 234-5678',
    },
    instagram: {
      enabled: false,
      accountHandle: '@business_official',
    },
    gmail: {
      enabled: true,
      autoReply: true,
    },
    crm: {
      enabled: true,
      provider: 'fieseros',
      autoCreateLead: true,
    },
  },
  metrics: {
    totalConversations: 256,
    totalFormSubmissions: 112,
    avgSatisfactionRating: 4.9,
  },
};

export interface IndustryAgentPreset {
  id: string;
  industryName: string;
  agentName: string;
  roleTitle: string;
  avatarUrl: string;
  brandColor: string;
  voiceTone: FormAgentData['voiceTone'];
  description: string;
  badge?: string;
  welcomeGreeting: string;
  greetingSubtitle: string;
  quickActions: QuickActionButton[];
  systemPrompt: string;
  sampleFaqs: FaqPair[];
  guardrails: string[];
}

export const INDUSTRY_AGENT_PRESETS: IndustryAgentPreset[] = [
  {
    id: 'generic_business',
    industryName: 'General Business & Support',
    agentName: 'Alex',
    roleTitle: 'Customer Support & Intake Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    brandColor: '#059669',
    voiceTone: 'friendly',
    description: 'Universal AI assistant for inquiries, quotes, and lead qualification for any company.',
    badge: 'POPULAR',
    welcomeGreeting: "Hi, I'm **Alex**, an AI Assistant ready to help you. How may I assist you today?",
    greetingSubtitle: 'Ask questions, get estimates, schedule bookings, or fill out connected forms.',
    quickActions: [
      { id: 'qa_1', label: 'Book an Appointment', actionType: 'message', payload: 'I would like to schedule an appointment.' },
      { id: 'qa_2', label: 'Complete Request Form', actionType: 'open_form', payload: 'form_1' },
      { id: 'qa_3', label: 'Services & Pricing', actionType: 'message', payload: 'What services do you offer and what are your rates?' },
      { id: 'qa_4', label: 'Hours & Location', actionType: 'message', payload: 'What are your operating hours and office location?' },
    ],
    systemPrompt: 'You are Alex, an intelligent and courteous AI assistant for our business. Answer inquiries, help schedule visits, and guide customers to fill out our intake form.',
    sampleFaqs: [
      { id: 'faq_1', question: 'What are your business hours?', answer: 'We are open Monday through Friday from 8:00 AM to 6:00 PM.' },
      { id: 'faq_2', question: 'How do I request a quote?', answer: 'Simply complete our attached intake form or tell me your project details for an estimate.' },
    ],
    guardrails: ['Be courteous, concise, and helpful.', 'Guide users to complete the form for official quote processing.'],
  },
  {
    id: 'hvac_services',
    industryName: 'HVAC & Climate Control',
    agentName: 'Sam',
    roleTitle: 'HVAC Service & Dispatch Coordinator',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    brandColor: '#0284c7',
    voiceTone: 'professional',
    description: 'Diagnose AC/heating issues, dispatch technicians, and schedule seasonal tune-ups.',
    badge: 'FIELD SERVICE',
    welcomeGreeting: "Hello! I'm **Sam**, your **HVAC & Climate Service Assistant**. Are you experiencing a heating or cooling issue?",
    greetingSubtitle: 'Book a service call, request a system replacement quote, or report an emergency.',
    quickActions: [
      { id: 'qa_1', label: 'AC / Heating Not Working', actionType: 'message', payload: 'My AC unit is not cooling and needs repair.' },
      { id: 'qa_2', label: 'Schedule Seasonal Tune-up', actionType: 'open_form', payload: 'form_hvac' },
      { id: 'qa_3', label: 'New System Estimate', actionType: 'message', payload: 'I would like an estimate for a new heat pump or HVAC unit.' },
      { id: 'qa_4', label: 'Emergency Dispatch', actionType: 'message', payload: 'I have an urgent heating/cooling emergency.' },
    ],
    systemPrompt: 'You are Sam, an experienced HVAC service dispatcher. Triage customer heating and AC problems, identify system type (furnace, heat pump, central AC), and book service appointments.',
    sampleFaqs: [
      { id: 'faq_1', question: 'Do you offer same-day service?', answer: 'Yes! We offer same-day emergency repairs for heating and cooling outages.' },
      { id: 'faq_2', question: 'What brands do you service?', answer: 'We service all major brands including Carrier, Trane, Lennox, Rheem, and Daikin.' },
    ],
    guardrails: ['Advise turning off the system if smoke or burning smell is reported.', 'Collect unit brand and square footage when possible.'],
  },
  {
    id: 'plumbing_emergency',
    industryName: 'Plumbing & Drain Services',
    agentName: 'Max',
    roleTitle: '24/7 Plumbing Dispatch Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    brandColor: '#2563eb',
    voiceTone: 'empathetic',
    description: 'Triage leaks, pipe bursts, clogged drains, and water heater replacements with rapid response.',
    welcomeGreeting: "Hi there! I'm **Max** with **24/7 Plumbing Services**. Do you have a plumbing leak or emergency?",
    greetingSubtitle: 'Get immediate emergency dispatch, schedule drain cleaning, or request a water heater quote.',
    quickActions: [
      { id: 'qa_1', label: 'Water Leak / Burst Pipe', actionType: 'message', payload: 'I have an active water leak that needs urgent attention.' },
      { id: 'qa_2', label: 'Clogged Drain / Toilet', actionType: 'message', payload: 'My drain or main sewer line is backed up.' },
      { id: 'qa_3', label: 'Water Heater Replacement', actionType: 'open_form', payload: 'form_plumb' },
      { id: 'qa_4', label: 'Request Video Inspection', actionType: 'message', payload: 'I need a sewer camera inspection.' },
    ],
    systemPrompt: 'You are Max, a rapid-response plumbing dispatcher. Ask where the shutoff valve is located for active leaks, and dispatch emergency plumbers quickly.',
    sampleFaqs: [
      { id: 'faq_1', question: 'What should I do if a pipe bursts?', answer: 'First, shut off your main water valve immediately, then our on-call plumber will be dispatched.' },
    ],
    guardrails: ['Always instruct the customer to locate the main water shut-off for active flooding.'],
  },
  {
    id: 'dental_medical',
    industryName: 'Dental & Medical Clinic',
    agentName: 'Clara',
    roleTitle: 'Dental Appointment Assistant',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=150&auto=format&fit=crop&q=80',
    brandColor: '#0d9488',
    voiceTone: 'friendly',
    description: 'Patient intake, insurance verification, cleaning visits, and emergency dental scheduling.',
    badge: 'HEALTHCARE',
    welcomeGreeting: "Hi, I'm **Clara**, an AI Agent and **Dental Appointment Assistant**. How may I help you today?",
    greetingSubtitle: 'Ask questions, schedule visits, or complete patient registration forms.',
    quickActions: [
      { id: 'qa_1', label: 'Schedule Cleaning / Exam', actionType: 'message', payload: 'I would like to schedule a dental checkup and cleaning.' },
      { id: 'qa_2', label: 'Complete Patient Intake Form', actionType: 'open_form', payload: 'form_dental' },
      { id: 'qa_3', label: 'Tooth Pain / Emergency', actionType: 'message', payload: 'I have severe tooth pain and need an urgent appointment.' },
      { id: 'qa_4', label: 'Accepted Insurance Plans', actionType: 'message', payload: 'What dental insurance plans do you accept?' },
    ],
    systemPrompt: 'You are Clara, a friendly and knowledgeable dental assistant. Help patients book appointments, answer insurance questions, and complete intake forms.',
    sampleFaqs: [
      { id: 'faq_1', question: 'Do you accept walk-ins?', answer: 'Yes, we accept emergency walk-in patients from 9 AM to 5 PM.' },
    ],
    guardrails: ['Never prescribe medication or give clinical medical diagnoses.', 'Invite patients for an in-person dental exam.'],
  },
  {
    id: 'legal_intake',
    industryName: 'Legal & Law Practice',
    agentName: 'Morgan',
    roleTitle: 'Legal Intake & Case Evaluation Assistant',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    brandColor: '#475569',
    voiceTone: 'professional',
    description: 'Confidential case screening, initial consultation booking, and legal intake questionnaires.',
    badge: 'LEGAL',
    welcomeGreeting: "Welcome. I'm **Morgan**, the **Legal Intake Assistant** for our firm. How may we assist with your legal matter?",
    greetingSubtitle: 'Confidential case evaluation, consultation booking, and practice area information.',
    quickActions: [
      { id: 'qa_1', label: 'Free Case Evaluation', actionType: 'open_form', payload: 'form_legal' },
      { id: 'qa_2', label: 'Schedule Attorney Consultation', actionType: 'message', payload: 'I would like to schedule a consultation with an attorney.' },
      { id: 'qa_3', label: 'Practice Areas & Fees', actionType: 'message', payload: 'What types of cases do you handle?' },
      { id: 'qa_4', label: 'Existing Client Support', actionType: 'message', payload: 'I am an existing client looking for a case update.' },
    ],
    systemPrompt: 'You are Morgan, a confidential legal intake specialist. Gather case facts objectively, check practice area suitability, and schedule attorney consultations.',
    sampleFaqs: [
      { id: 'faq_1', question: 'Is this conversation confidential?', answer: 'Yes, our intake process is kept strictly confidential.' },
    ],
    guardrails: ['State clearly that communication does not establish an attorney-client relationship until a retainer is signed.'],
  },
  {
    id: 'auto_repair',
    industryName: 'Auto Repair & Detailing',
    agentName: 'Jake',
    roleTitle: 'Auto Service & Estimate Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    brandColor: '#ea580c',
    voiceTone: 'friendly',
    description: 'Brakes, oil change, engine diagnostics, body shop collision quotes, and drop-off times.',
    welcomeGreeting: "Hey! I'm **Jake**, your **Auto Service Assistant**. What vehicle maintenance or repair do you need?",
    greetingSubtitle: 'Book oil changes, brake inspections, tire replacements, or get a repair estimate.',
    quickActions: [
      { id: 'qa_1', label: 'Brakes / Oil Change Booking', actionType: 'message', payload: 'I need to book a brake service and synthetic oil change.' },
      { id: 'qa_2', label: 'Check Engine Light Diagnostic', actionType: 'message', payload: 'My check engine light is on and I need a diagnostic scan.' },
      { id: 'qa_3', label: 'Collision & Bodywork Quote', actionType: 'open_form', payload: 'form_auto' },
      { id: 'qa_4', label: 'Towing & Drop-off Hours', actionType: 'message', payload: 'Can I drop off my car after hours?' },
    ],
    systemPrompt: 'You are Jake, an automotive service writer. Ask for vehicle Year, Make, Model, and Mileage to prepare accurate service estimates.',
    sampleFaqs: [
      { id: 'faq_1', question: 'Do you offer warranty on repairs?', answer: 'Yes, all our repairs come with a 24-month / 24,000-mile nationwide warranty.' },
    ],
    guardrails: ['Always ask for vehicle Year, Make, Model, and Mileage.'],
  },
  {
    id: 'real_estate',
    industryName: 'Real Estate & Property',
    agentName: 'Olivia',
    roleTitle: 'Property Inquiry & Tour Coordinator',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    brandColor: '#7c3aed',
    voiceTone: 'friendly',
    description: 'Property showing appointments, buyer qualification, home valuation requests, and listings.',
    welcomeGreeting: "Hello! I'm **Olivia**, your **Real Estate & Property Guide**. Are you looking to buy, sell, or rent?",
    greetingSubtitle: 'Schedule property showings, request a home valuation, or browse available listings.',
    quickActions: [
      { id: 'qa_1', label: 'Schedule a Private Showing', actionType: 'message', payload: 'I would like to schedule a private tour of a property.' },
      { id: 'qa_2', label: 'Home Valuation Request', actionType: 'open_form', payload: 'form_property' },
      { id: 'qa_3', label: 'Pre-Approval & Financing FAQ', actionType: 'message', payload: 'How do I get pre-approved for a home mortgage?' },
      { id: 'qa_4', label: 'View Available Listings', actionType: 'message', payload: 'Show me your newest featured listings.' },
    ],
    systemPrompt: 'You are Olivia, a licensed real estate assistant. Qualify buyer timelines, budget, target neighborhoods, and book private property tours.',
    sampleFaqs: [
      { id: 'faq_1', question: 'How much is my home worth?', answer: 'Fill out our quick valuation form and our broker will prepare a complimentary Comparative Market Analysis (CMA).' },
    ],
    guardrails: ['Comply with all Fair Housing regulations.'],
  },
  {
    id: 'salon_spa',
    industryName: 'Salon, Spa & Beauty',
    agentName: 'Bella',
    roleTitle: 'Salon & Spa Booking Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    brandColor: '#db2777',
    voiceTone: 'friendly',
    description: 'Stylist bookings, massage & facial packages, bridal consultation, and treatment menus.',
    welcomeGreeting: "Welcome to our Salon & Spa! I'm **Bella**. Looking to pamper yourself or book a fresh look?",
    greetingSubtitle: 'Book haircuts, color sessions, massages, facials, or view our service menu.',
    quickActions: [
      { id: 'qa_1', label: 'Book Haircut & Color', actionType: 'message', payload: 'I want to book a haircut and color with a master stylist.' },
      { id: 'qa_2', label: 'Spa & Massage Packages', actionType: 'open_form', payload: 'form_spa' },
      { id: 'qa_3', label: 'Bridal & Event Styling', actionType: 'message', payload: 'Do you offer on-site bridal party hair and makeup?' },
      { id: 'qa_4', label: 'Gift Cards & Memberships', actionType: 'message', payload: 'How can I purchase a spa gift card?' },
    ],
    systemPrompt: 'You are Bella, a warm and welcoming salon & spa concierge. Help clients choose treatments, stylists, and convenient appointment slots.',
    sampleFaqs: [
      { id: 'faq_1', question: 'What is your cancellation policy?', answer: 'We kindly request at least 24 hours notice for appointment rescheduling.' },
    ],
    guardrails: ['Recommend patch tests for first-time chemical color treatments.'],
  },
];

export function createAgentFromPreset(presetId: string, customOverrides?: Partial<FormAgentData>): FormAgentData {
  const preset = INDUSTRY_AGENT_PRESETS.find((p) => p.id === presetId) || INDUSTRY_AGENT_PRESETS[0];
  const uniqueId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const slug = `${preset.agentName.toLowerCase()}-${preset.id.replace(/_/g, '-')}-${Math.random().toString(36).substring(2, 5)}`;

  return {
    id: uniqueId,
    slug,
    name: preset.agentName,
    roleTitle: preset.roleTitle,
    avatarUrl: preset.avatarUrl,
    statusText: 'Online & Active',
    brandColor: preset.brandColor,
    voiceTone: preset.voiceTone,
    welcomeGreeting: preset.welcomeGreeting,
    greetingSubtitle: preset.greetingSubtitle,
    quickActions: [...preset.quickActions],
    navigation: {
      chatEnabled: true,
      voiceEnabled: true,
      formsEnabled: true,
      historyEnabled: true,
      presentationEnabled: false,
      whatsappEnabled: true,
    },
    connectedForms: [
      {
        id: `form_${uniqueId}`,
        name: `${preset.industryName} Intake Form`,
        description: `Customer intake form for ${preset.industryName}.`,
        submissionCount: 0,
      },
    ],
    knowledge: {
      crawledUrls: [],
      documents: [],
      faqPairs: [...preset.sampleFaqs],
      systemPrompt: preset.systemPrompt,
      guardrails: [...preset.guardrails],
    },
    channels: {
      activeChannel: 'chatbot',
      chatbot: {
        enabled: true,
        position: 'bottom-right',
        primaryColor: preset.brandColor,
        greetingBubble: `👋 Need assistance? Chat with ${preset.agentName}!`,
      },
      standalone: {
        enabled: true,
        slug,
      },
      whatsapp: {
        enabled: true,
        paired: false,
      },
      phone: {
        enabled: true,
        voiceId: 'Rachel',
      },
      sms: {
        enabled: true,
      },
      instagram: {
        enabled: false,
      },
      gmail: {
        enabled: true,
        autoReply: true,
      },
      crm: {
        enabled: true,
        provider: 'fieseros',
        autoCreateLead: true,
      },
    },
    metrics: {
      totalConversations: 0,
      totalFormSubmissions: 0,
      avgSatisfactionRating: 5.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...customOverrides,
  };
}

