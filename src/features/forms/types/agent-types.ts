export type AgentChannelType =
  | 'chatbot'
  | 'standalone'
  | 'instagram'
  | 'whatsapp'
  | 'phone'
  | 'gmail'
  | 'wordpress'
  | 'presentation'
  | 'voice'
  | 'messenger'
  | 'shopify'
  | 'agent_app'
  | 'sms'
  | 'crm'
  | 'canva'
  | 'platforms';

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
  roleTitle: string;
  avatarUrl: string;
  statusText: string;
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

  // 11 Multichannel Configurations
  channels: {
    activeChannel: AgentChannelType;
    chatbot: {
      enabled: boolean;
      layoutMode: 'floating' | 'sidebar';
      position: 'left' | 'right';
      layoutButtonToggle: boolean;
      sidebarBehavior: 'overlay' | 'push';
      welcomeStyle: 'avatar' | 'quick_input';
      greetingToggle: boolean;
      placeholderMessage: string;
      aiGeneratedGreeting: boolean;
      showButtons: boolean;
      primaryColor: string;
      greetingBubble: string;
      proactiveTrigger?: 'none' | 'delay' | 'scroll' | 'exit_intent';
      triggerDelaySeconds?: number;
      triggerScrollPercent?: number;
      layoutButton?: {
        greetingText: string;
        action1: string;
        action2: string;
        showTalk: boolean;
      };
    };
    standalone: {
      enabled: boolean;
      slug: string;
      customDomain?: string;
      seoTitle?: string;
      seoDescription?: string;
    };
    instagram: {
      enabled: boolean;
      accountHandle?: string;
      autoReply: boolean;
      paired: boolean;
    };
    whatsapp: {
      enabled: boolean;
      phoneNumber?: string;
      paired: boolean;
      welcomeTemplate?: string;
    };
    phone: {
      enabled: boolean;
      phoneNumber?: string;
      voiceId: string;
      recordCalls: boolean;
      forwardingNumber?: string;
    };
    gmail: {
      enabled: boolean;
      autoReply: boolean;
      replyDelaySeconds: number;
      signature?: string;
    };
    presentation: {
      enabled: boolean;
      slideDeckUrl?: string;
      autoPresentVoice: boolean;
    };
    voice: {
      enabled: boolean;
      realtimeStreaming: boolean;
      voiceProvider: 'elevenlabs' | 'openai' | 'cartesia';
    };
    messenger: {
      enabled: boolean;
      facebookPageId?: string;
      greetingMessage?: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber?: string;
      optOutKeyword?: string;
    };
    crm: {
      enabled: boolean;
      provider: 'fieseros' | 'salesforce' | 'hubspot';
      autoCreateLead: boolean;
      syncNotes: boolean;
    };
  };

  // ── 2026 AI Agent Settings Suite (Jotform Parity) ──
  settings?: {
    // 1. General & Properties (8 Exact Controls from Screenshot 2)
    agentPermission: 'public' | 'private';
    conversationHistoryAccess: boolean;
    userFeedbackEnabled: boolean;
    siteSearchAssist: boolean;
    allowScreenSharing: boolean;
    memoryEnabled: boolean;
    fileUploadEnabled: boolean;
    agentStatus: 'active' | 'disabled' | 'maintenance';
    language: string;
    autoDetectLanguage: boolean;
    timezone: string;
    businessHours: {
      enabled: boolean;
      start: string;
      end: string;
      days: number[];
      afterHoursBehavior: 'self_serve' | 'offline_message' | 'collect_lead';
    };

    // 2. Notifications Tab (3 Exact Controls from Screenshot 1)
    notifications: {
      sendConversationEmails: boolean;
      notificationEmails: string;
      sendAutoresponderEmails: boolean;
      unansweredQuestionAlerts: boolean;
      unansweredAlertFrequency: 'each' | 'daily' | 'weekly';
    };

    // 3. AI Model & Reasoning Engine
    llm: {
      provider: 'openai' | 'anthropic' | 'google' | 'meta';
      model: 'gpt-4o' | 'claude-3.5-sonnet' | 'gemini-1.5-pro' | 'llama-3.3-70b';
      temperature: number;
      maxTokens: number;
      streamResponses: boolean;
      enableReasoningEffort: boolean;
    };

    // 4. Voice & Telephony Engine
    voice: {
      provider: 'elevenlabs' | 'openai' | 'cartesia';
      voiceId: string;
      voiceName: string;
      speed: number;
      pitch: number;
      stability: number;
      ambientSound: 'none' | 'office' | 'chime' | 'callcenter';
      interruptionSensitivity: 'low' | 'balanced' | 'high';
    };

    // 5. Escalation & Human Handoff
    escalation: {
      enabled: boolean;
      triggers: ('user_request' | 'negative_sentiment' | 'low_confidence')[];
      confidenceThreshold: number;
      destination: 'live_chat' | 'email' | 'zendesk' | 'whatsapp';
      targetEmail?: string;
      fallbackMessage: string;
    };

    // 6. Guardrails & Compliance
    guardrails: {
      piiRedaction: boolean;
      strictKnowledgeOnly: boolean;
      blockedTopics: string[];
      gdprConsentRequired: boolean;
      zeroDataRetention: boolean;
    };

    // 7. CRM & Webhooks
    crm: {
      autoCreateLead: boolean;
      provider: 'fieseros' | 'salesforce' | 'hubspot';
      autoSubmitForms: boolean;
      webhookUrl?: string;
      csatRatingEnabled: boolean;
    };

    // 8. Widget Behavior & Branding
    widget: {
      position: 'bottom-right' | 'bottom-left' | 'custom';
      autoOpenDelaySeconds: number;
      chimeSound: boolean;
      showPoweredBy: boolean;
    };
  };

  // ── Visual Designer & CSS Tokens (Screenshot 2) ──
  style?: {
    colorSchemeId: string;
    themePreset: 'modern-blue' | 'emerald-serene' | 'midnight-dark' | 'sunset-purple' | 'pure-light';
    pageBackgroundStart: string;
    pageBackgroundEnd: string;
    agentBackgroundStart: string;
    agentBackgroundEnd: string;
    titleColor: string;
    chatBg: string;
    inputTextColor: string;
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
  id: 'agent_default',
  slug: 'ai-assistant',
  name: 'AI Assistant',
  roleTitle: 'Virtual Assistant',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  statusText: 'Online & Active',
  brandColor: '#059669',
  voiceTone: 'friendly',
  welcomeGreeting: "Hi! I'm your **AI Assistant**. I can answer questions or help you fill out a form. How can I help you today?",
  greetingSubtitle: 'Ask me anything, or tap a quick action below to get started.',
  quickActions: [
    { id: 'qa_1', label: 'Ask a question', actionType: 'message', payload: 'I have a question.' },
    { id: 'qa_2', label: 'Fill out the form', actionType: 'open_form', payload: '' },
  ],
  navigation: {
    chatEnabled: true,
    voiceEnabled: true,
    formsEnabled: true,
    historyEnabled: true,
    presentationEnabled: false,
    whatsappEnabled: false,
  },
  connectedForms: [
    {
      id: 'form_loan',
      name: 'Loan Application Form',
      description: 'Borrower financial and property intake form.',
      submissionCount: 42,
    },
  ],
  knowledge: {
    crawledUrls: ['https://example.com/rates'],
    documents: [],
    faqPairs: [
      { id: 'faq_1', question: 'What is the minimum credit score?', answer: 'Our standard loan programs typically require a minimum credit score of 620.' },
    ],
    systemPrompt: 'You are Nell, an expert loan application assistant. Guide borrowers through eligibility and loan applications.',
    guardrails: ['Be reassuring and professional.'],
  },
  channels: {
    activeChannel: 'chatbot',
    chatbot: {
      enabled: true,
      layoutMode: 'floating',
      position: 'right',
      layoutButtonToggle: true,
      sidebarBehavior: 'overlay',
      welcomeStyle: 'quick_input',
      greetingToggle: true,
      placeholderMessage: 'Ask AI',
      aiGeneratedGreeting: true,
      showButtons: true,
      primaryColor: '#0284c7',
      greetingBubble: '👋 Need help with your loan application? Chat with Nell!',
      proactiveTrigger: 'none',
      triggerDelaySeconds: 5,
      triggerScrollPercent: 50,
      layoutButton: {
        greetingText: "Hi! I'm Nell, your AI Agent and Loan Application Guide. How can I help you?",
        action1: 'Begin loan application',
        action2: 'Learn more',
        showTalk: true,
      },
    },
    standalone: {
      enabled: true,
      slug: 'loan-application-guide',
    },
    instagram: {
      enabled: false,
      accountHandle: '@loan_advisor_ai',
      autoReply: true,
      paired: false,
    },
    whatsapp: {
      enabled: false,
      phoneNumber: '+1 (555) 345-6789',
      paired: false,
    },
    phone: {
      enabled: true,
      phoneNumber: '+1 (800) 555-LOAN',
      voiceId: 'Rachel',
      recordCalls: true,
    },
    gmail: {
      enabled: true,
      autoReply: true,
      replyDelaySeconds: 15,
    },
    presentation: {
      enabled: false,
      autoPresentVoice: true,
    },
    voice: {
      enabled: true,
      realtimeStreaming: true,
      voiceProvider: 'elevenlabs',
    },
    messenger: {
      enabled: false,
    },
    sms: {
      enabled: true,
      phoneNumber: '+1 (555) 345-6789',
    },
    crm: {
      enabled: true,
      provider: 'salesforce',
      autoCreateLead: true,
      syncNotes: true,
    },
  },
  settings: {
    agentPermission: 'public',
    conversationHistoryAccess: true,
    userFeedbackEnabled: true,
    siteSearchAssist: true,
    allowScreenSharing: false,
    memoryEnabled: true,
    fileUploadEnabled: true,
    agentStatus: 'active',
    language: 'English',
    autoDetectLanguage: true,
    timezone: 'America/New_York',
    businessHours: {
      enabled: true,
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5],
      afterHoursBehavior: 'self_serve',
    },
    notifications: {
      sendConversationEmails: true,
      notificationEmails: 'admin@mybusiness.com',
      sendAutoresponderEmails: true,
      unansweredQuestionAlerts: true,
      unansweredAlertFrequency: 'each',
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
    colorSchemeId: 'scheme_1',
    themePreset: 'modern-blue',
    pageBackgroundStart: '#C5E3FA',
    pageBackgroundEnd: '#D6E1E7',
    agentBackgroundStart: '#C5E3FA',
    agentBackgroundEnd: '#D6E1E7',
    titleColor: '#0A1551',
    chatBg: '#ffffff',
    inputTextColor: '#0f172a',
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
    roleTitle: 'Loan Application Guide',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    brandColor: '#0284c7',
    voiceTone: 'professional',
    description: 'Guide borrowers through mortgage pre-approvals, rates, documents, and loan applications.',
    badge: 'FINANCE',
    welcomeGreeting: "Hi! I'm **Nell**, your **AI Agent** and **Loan Application Guide**. How can I help you?",
    greetingSubtitle: 'Get immediate loan estimates, check eligibility, or complete your application.',
    quickActions: [
      { id: 'qa_1', label: 'Begin loan application', actionType: 'message', payload: 'I would like to begin my loan application.' },
      { id: 'qa_2', label: 'Learn more', actionType: 'message', payload: 'Tell me about available loan options and rates.' },
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
    id: 'plumbing_emergency',
    industryName: 'Plumbing & Drain Services',
    agentName: 'Max',
    roleTitle: '24/7 Plumbing Dispatch Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
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
  {
    id: 'legal_intake',
    industryName: 'Legal & Law Practice',
    agentName: 'Morgan',
    roleTitle: 'Legal Intake & Case Evaluation Assistant',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
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
      whatsappEnabled: false,
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
        layoutMode: 'floating',
        position: 'right',
        layoutButtonToggle: true,
        sidebarBehavior: 'overlay',
        welcomeStyle: 'quick_input',
        greetingToggle: true,
        placeholderMessage: 'Ask AI',
        aiGeneratedGreeting: true,
        showButtons: true,
        primaryColor: preset.brandColor,
        greetingBubble: `👋 Need assistance? Chat with ${preset.agentName}!`,
        layoutButton: {
          greetingText: `Hi! I'm ${preset.agentName}, your AI Agent and ${preset.roleTitle}. How can I help you?`,
          action1: preset.quickActions[0]?.label || 'Begin inquiry',
          action2: preset.quickActions[1]?.label || 'Learn more',
          showTalk: true,
        },
      },
      standalone: {
        enabled: true,
        slug,
      },
      instagram: {
        enabled: false,
        autoReply: true,
        paired: false,
      },
      whatsapp: {
        enabled: false,
        paired: false,
      },
      phone: {
        enabled: true,
        voiceId: 'Rachel',
        recordCalls: true,
      },
      gmail: {
        enabled: true,
        autoReply: true,
        replyDelaySeconds: 15,
      },
      presentation: {
        enabled: false,
        autoPresentVoice: true,
      },
      voice: {
        enabled: true,
        realtimeStreaming: true,
        voiceProvider: 'elevenlabs',
      },
      messenger: {
        enabled: false,
      },
      sms: {
        enabled: true,
      },
      crm: {
        enabled: true,
        provider: 'fieseros',
        autoCreateLead: true,
        syncNotes: true,
      },
    },
    settings: {
      agentPermission: 'public',
      conversationHistoryAccess: true,
      userFeedbackEnabled: true,
      siteSearchAssist: true,
      allowScreenSharing: false,
      memoryEnabled: true,
      fileUploadEnabled: true,
      agentStatus: 'active',
      language: 'English',
      autoDetectLanguage: true,
      timezone: 'America/New_York',
      businessHours: {
        enabled: true,
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5],
        afterHoursBehavior: 'self_serve',
      },
      notifications: {
        sendConversationEmails: true,
        notificationEmails: 'admin@mybusiness.com',
        sendAutoresponderEmails: true,
        unansweredQuestionAlerts: true,
        unansweredAlertFrequency: 'each',
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
      colorSchemeId: 'scheme_1',
      themePreset: 'modern-blue',
      pageBackgroundStart: '#C5E3FA',
      pageBackgroundEnd: '#D6E1E7',
      agentBackgroundStart: preset.brandColor,
      agentBackgroundEnd: '#D6E1E7',
      titleColor: '#0A1551',
      chatBg: '#ffffff',
      inputTextColor: '#0f172a',
      fontFamily: 'Plus Jakarta Sans',
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
