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

export interface AgentAvatarItem {
  id: string;
  name: string;
  url: string;
  gender: 'female' | 'male' | 'neutral';
  category: 'business' | 'healthcare' | 'support' | 'finance' | 'tech' | 'creative';
  isPopular?: boolean;
}

export const AVATAR_CATALOG: AgentAvatarItem[] = [
  { id: 'av_1', name: 'Nell (Financial Advisor)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'finance', isPopular: true },
  { id: 'av_2', name: 'Alex (Support Concierge)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'support', isPopular: true },
  { id: 'av_3', name: 'Clara (Clinical Specialist)', url: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'healthcare', isPopular: true },
  { id: 'av_4', name: 'Sam (Operations Lead)', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'business', isPopular: true },
  { id: 'av_5', name: 'Max (Field Dispatcher)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'support' },
  { id: 'av_6', name: 'Olivia (Real Estate Advisor)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'business', isPopular: true },
  { id: 'av_7', name: 'Jake (Auto Estimator)', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'business' },
  { id: 'av_8', name: 'Bella (Beauty Concierge)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'creative' },
  { id: 'av_9', name: 'David (Tech Architect)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'tech', isPopular: true },
  { id: 'av_10', name: 'Sophia (Executive Banker)', url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'finance' },
  { id: 'av_11', name: 'Lucas (Client Success)', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'support' },
  { id: 'av_12', name: 'Elena (Medical Intake)', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'healthcare', isPopular: true },
  { id: 'av_13', name: 'Marcus (Legal Counsel)', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'business' },
  { id: 'av_14', name: 'Mia (Creative Director)', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'creative' },
  { id: 'av_15', name: 'Ethan (Systems Engineer)', url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'tech' },
  { id: 'av_16', name: 'Aria (Insurance Broker)', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'finance' },
  { id: 'av_17', name: 'Noah (Helpdesk Specialist)', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'support' },
  { id: 'av_18', name: 'Chloe (Patient Navigator)', url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'healthcare' },
  { id: 'av_19', name: 'Leo (Mortgage Officer)', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'finance' },
  { id: 'av_20', name: 'Hannah (Product Consultant)', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'business' },
  { id: 'av_21', name: 'Ryan (Cybersecurity Advisor)', url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'tech' },
  { id: 'av_22', name: 'Zoe (Design Strategist)', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'creative' },
  { id: 'av_23', name: 'Adam (Account Executive)', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'business' },
  { id: 'av_24', name: 'Maya (Dentistry Specialist)', url: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'healthcare' },
  { id: 'av_25', name: 'Julian (Wealth Planner)', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'finance' },
  { id: 'av_26', name: 'Layla (Brand Advocate)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'support' },
  { id: 'av_27', name: 'Victor (DevOps Consultant)', url: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'tech' },
  { id: 'av_28', name: 'Isabella (Hospitality Lead)', url: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'creative' },
  { id: 'av_29', name: 'Mason (Compliance Officer)', url: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'business' },
  { id: 'av_30', name: 'Emma (Telehealth Nurse)', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'healthcare' },
  { id: 'av_31', name: 'Gabriel (Risk Assessor)', url: 'https://images.unsplash.com/photo-1507081323647-4d2504a4b919?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'finance' },
  { id: 'av_32', name: 'Nova (Virtual Host)', url: 'https://images.unsplash.com/photo-1534751516642-a171edd27151?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'tech' },
  { id: 'av_33', name: 'Oliver (Tax Consultant)', url: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'finance' },
  { id: 'av_34', name: 'Grace (Customer Experience)', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'support' },
  { id: 'av_35', name: 'Cole (AI Solutions Architect)', url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=200&auto=format&fit=crop&q=80', gender: 'male', category: 'tech' },
  { id: 'av_36', name: 'Scarlett (Commercial Escrow)', url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=200&auto=format&fit=crop&q=80', gender: 'female', category: 'business' },
];

export interface FormAgentData {
  id: string;
  tenantId?: string;
  slug: string;
  name: string;
  roleTitle: string; // e.g. "Loan Application Guide"
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

  // ── 2026 AI Agent Settings Suite ──
  settings?: {
    // 1. General & Identity
    language: string;
    autoDetectLanguage: boolean;
    status: 'active' | 'inactive' | 'maintenance';
    timezone: string;
    businessHours: {
      enabled: boolean;
      start: string;
      end: string;
      days: number[]; // 1=Mon .. 7=Sun
      afterHoursBehavior: 'self_serve' | 'offline_message' | 'collect_lead';
    };

    // 2. AI Model & Reasoning Engine
    llm: {
      provider: 'openai' | 'anthropic' | 'google' | 'meta';
      model: 'gpt-4o' | 'claude-3.5-sonnet' | 'gemini-1.5-pro' | 'llama-3.3-70b';
      temperature: number; // 0.0 - 1.0
      maxTokens: number;
      streamResponses: boolean;
      enableReasoningEffort: boolean;
    };

    // 3. Voice & Telephony Engine
    voice: {
      provider: 'elevenlabs' | 'openai' | 'cartesia';
      voiceId: string;
      voiceName: string;
      speed: number; // 0.75 - 1.5
      pitch: number; // -10 - 10
      stability: number; // 0.0 - 1.0
      ambientSound: 'none' | 'office' | 'chime' | 'callcenter';
      interruptionSensitivity: 'low' | 'balanced' | 'high';
    };

    // 4. Escalation & Human Handoff
    escalation: {
      enabled: boolean;
      triggers: ('user_request' | 'negative_sentiment' | 'low_confidence')[];
      confidenceThreshold: number; // e.g. 70 (%)
      destination: 'live_chat' | 'email' | 'zendesk' | 'whatsapp';
      targetEmail?: string;
      fallbackMessage: string;
    };

    // 5. Guardrails & Compliance
    guardrails: {
      piiRedaction: boolean;
      strictKnowledgeOnly: boolean;
      blockedTopics: string[];
      gdprConsentRequired: boolean;
      zeroDataRetention: boolean;
    };

    // 6. CRM & Webhooks
    crm: {
      autoCreateLead: boolean;
      provider: 'fieseros' | 'salesforce' | 'hubspot';
      autoSubmitForms: boolean;
      webhookUrl?: string;
      csatRatingEnabled: boolean;
    };

    // 7. Widget & Branding
    widget: {
      position: 'bottom-right' | 'bottom-left' | 'custom';
      autoOpenDelaySeconds: number; // 0 = disabled
      chimeSound: boolean;
      showPoweredBy: boolean;
    };
  };

  // ── Visual Designer & CSS Tokens ──
  style?: {
    themePreset: 'modern-blue' | 'emerald-serene' | 'midnight-dark' | 'sunset-purple' | 'pure-light';
    pageBackgroundStart: string;
    pageBackgroundEnd: string;
    chatBg: string;
    inputTextColor: string;
    agentBackgroundStart: string;
    fontFamily: 'Inter' | 'Plus Jakarta Sans' | 'Outfit' | 'Geist' | 'DM Sans';
    borderRadius: 'sm' | 'md' | 'lg' | 'full';
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
  name: 'Nell',
  roleTitle: 'Loan Application AI Guide',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  statusText: 'Online & Active',
  brandColor: '#0284c7',
  voiceTone: 'professional',
  welcomeGreeting: "Hi! I'm **Nell**, your AI Loan Application Guide. How can I help you today?",
  greetingSubtitle: 'Get immediate loan estimates, check eligibility, or complete your application.',
  quickActions: [
    { id: 'qa_1', label: 'Begin loan application', actionType: 'message', payload: 'I would like to begin my loan application.' },
    { id: 'qa_2', label: 'Learn more', actionType: 'message', payload: 'Tell me about available loan options and rates.' },
    { id: 'qa_3', label: 'Check application status', actionType: 'message', payload: 'I would like to check the status of my existing loan.' },
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
      id: 'form_loan',
      name: 'Residential Mortgage & Loan Application',
      description: 'Full borrower financial and property intake form.',
      submissionCount: 42,
    },
  ],
  knowledge: {
    crawledUrls: ['https://example.com/rates', 'https://example.com/requirements'],
    documents: [
      {
        id: 'doc_1',
        name: 'Loan_Application_Eligibility_Guide.pdf',
        size: 245000,
        type: 'pdf',
        status: 'indexed',
        indexedAt: new Date().toISOString(),
      },
    ],
    faqPairs: [
      { id: 'faq_1', question: 'What is the minimum credit score?', answer: 'Our standard loan programs typically require a minimum credit score of 620.' },
      { id: 'faq_2', question: 'How long does approval take?', answer: 'Pre-approval takes as little as 3 minutes online, with full underwriting in 3–5 business days.' },
    ],
    systemPrompt: 'You are Nell, an expert loan application assistant. Guide borrowers through eligibility, estimate monthly payments, answer mortgage FAQs, and help fill out the loan intake form accurately.',
    guardrails: [
      'Maintain an empathetic, reassuring, and professional financial tone.',
      'Explain that estimates are illustrative and subject to final underwriter review.',
      'Assist borrower step-by-step with completing the connected form.',
    ],
  },
  channels: {
    activeChannel: 'chatbot',
    chatbot: {
      enabled: true,
      position: 'bottom-right',
      primaryColor: '#0284c7',
      greetingBubble: '👋 Need help with your loan application? Chat with Nell!',
    },
    standalone: {
      enabled: true,
      slug: 'loan-application-guide',
    },
    whatsapp: {
      enabled: true,
      phoneNumber: '+1 (555) 345-6789',
      paired: true,
    },
    phone: {
      enabled: true,
      phoneNumber: '+1 (800) 555-LOAN',
      voiceId: 'Rachel',
    },
    sms: {
      enabled: true,
      phoneNumber: '+1 (555) 345-6789',
    },
    instagram: {
      enabled: false,
      accountHandle: '@loan_advisor_ai',
    },
    gmail: {
      enabled: true,
      autoReply: true,
    },
    crm: {
      enabled: true,
      provider: 'salesforce',
      autoCreateLead: true,
    },
  },
  settings: {
    language: 'English',
    autoDetectLanguage: true,
    status: 'active',
    timezone: 'America/New_York',
    businessHours: {
      enabled: true,
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5],
      afterHoursBehavior: 'self_serve',
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 1024,
      streamResponses: true,
      enableReasoningEffort: true,
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      voiceName: 'Rachel (Professional Female)',
      speed: 1.0,
      pitch: 0,
      stability: 0.75,
      ambientSound: 'none',
      interruptionSensitivity: 'balanced',
    },
    escalation: {
      enabled: true,
      triggers: ['user_request', 'negative_sentiment'],
      confidenceThreshold: 75,
      destination: 'live_chat',
      targetEmail: 'support@fieseros.com',
      fallbackMessage: 'Our senior loan officers are currently assisting other clients. Please leave your email and we will contact you in under 15 minutes.',
    },
    guardrails: {
      piiRedaction: true,
      strictKnowledgeOnly: false,
      blockedTopics: ['cryptocurrency speculative loans', 'unlicensed jurisdictions'],
      gdprConsentRequired: true,
      zeroDataRetention: false,
    },
    crm: {
      autoCreateLead: true,
      provider: 'salesforce',
      autoSubmitForms: true,
      webhookUrl: 'https://api.fieseros.com/webhooks/loan-leads',
      csatRatingEnabled: true,
    },
    widget: {
      position: 'bottom-right',
      autoOpenDelaySeconds: 4,
      chimeSound: true,
      showPoweredBy: true,
    },
  },
  style: {
    themePreset: 'modern-blue',
    pageBackgroundStart: '#0f172a',
    pageBackgroundEnd: '#1e293b',
    chatBg: '#ffffff',
    inputTextColor: '#0f172a',
    agentBackgroundStart: '#0284c7',
    fontFamily: 'Plus Jakarta Sans',
    borderRadius: 'lg',
  },
  metrics: {
    totalConversations: 312,
    totalFormSubmissions: 148,
    avgSatisfactionRating: 4.95,
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
    id: 'loan_finance',
    industryName: 'Mortgage & Loan Advisory',
    agentName: 'Nell',
    roleTitle: 'Loan Application AI Guide',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    brandColor: '#0284c7',
    voiceTone: 'professional',
    description: 'Guide borrowers through mortgage pre-approvals, rates, documents, and loan applications.',
    badge: 'FINANCE',
    welcomeGreeting: "Hi! I'm **Nell**, your AI Loan Application Guide. How can I help you today?",
    greetingSubtitle: 'Get immediate loan estimates, check eligibility, or complete your application.',
    quickActions: [
      { id: 'qa_1', label: 'Begin loan application', actionType: 'message', payload: 'I would like to begin my loan application.' },
      { id: 'qa_2', label: 'Learn more', actionType: 'message', payload: 'Tell me about available loan options and rates.' },
      { id: 'qa_3', label: 'Check application status', actionType: 'message', payload: 'I would like to check the status of my existing loan.' },
    ],
    systemPrompt: 'You are Nell, an expert loan application assistant. Guide borrowers through eligibility, estimate monthly payments, answer mortgage FAQs, and help fill out the loan intake form accurately.',
    sampleFaqs: [
      { id: 'faq_1', question: 'What is the minimum credit score?', answer: 'Our standard loan programs typically require a minimum credit score of 620.' },
      { id: 'faq_2', question: 'How long does approval take?', answer: 'Pre-approval takes as little as 3 minutes online, with full underwriting in 3–5 business days.' },
    ],
    guardrails: ['Be reassuring and professional.', 'Guide users to complete the form for official rate quotes.'],
  },
  {
    id: 'generic_business',
    industryName: 'General Business & Support',
    agentName: 'Alex',
    roleTitle: 'Customer Support & Intake Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
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
    id: 'dental_medical',
    industryName: 'Dental & Medical Clinic',
    agentName: 'Clara',
    roleTitle: 'Dental Appointment Assistant',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=200&auto=format&fit=crop&q=80',
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
    settings: {
      language: 'English',
      autoDetectLanguage: true,
      status: 'active',
      timezone: 'America/New_York',
      businessHours: {
        enabled: true,
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5],
        afterHoursBehavior: 'self_serve',
      },
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 1024,
        streamResponses: true,
        enableReasoningEffort: true,
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        voiceName: 'Rachel (Professional Female)',
        speed: 1.0,
        pitch: 0,
        stability: 0.75,
        ambientSound: 'none',
        interruptionSensitivity: 'balanced',
      },
      escalation: {
        enabled: true,
        triggers: ['user_request', 'negative_sentiment'],
        confidenceThreshold: 75,
        destination: 'live_chat',
        fallbackMessage: 'All of our specialists are currently busy. Please leave your contact information.',
      },
      guardrails: {
        piiRedaction: true,
        strictKnowledgeOnly: false,
        blockedTopics: [],
        gdprConsentRequired: false,
        zeroDataRetention: false,
      },
      crm: {
        autoCreateLead: true,
        provider: 'fieseros',
        autoSubmitForms: true,
        csatRatingEnabled: true,
      },
      widget: {
        position: 'bottom-right',
        autoOpenDelaySeconds: 3,
        chimeSound: true,
        showPoweredBy: true,
      },
    },
    style: {
      themePreset: 'modern-blue',
      pageBackgroundStart: '#0f172a',
      pageBackgroundEnd: '#1e293b',
      chatBg: '#ffffff',
      inputTextColor: '#0f172a',
      agentBackgroundStart: preset.brandColor,
      fontFamily: 'Inter',
      borderRadius: 'lg',
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
