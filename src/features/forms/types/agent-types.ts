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
  id: 'agent_alex',
  slug: 'alex-assistant',
  name: 'Nell',
  roleTitle: 'Loan Application Guide',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  statusText: 'Online & Active',
  brandColor: '#0284c7',
  voiceTone: 'professional',
  welcomeGreeting: "Hi! I'm **Nell**, your **AI Agent** and **Loan Application Guide**. How can I help you?",
  greetingSubtitle: 'Get immediate loan estimates, check eligibility, or complete your application.',
  quickActions: [
    { id: 'qa_1', label: 'Begin loan application', actionType: 'message', payload: 'I would like to begin my loan application.' },
    { id: 'qa_2', label: 'Learn more', actionType: 'message', payload: 'Tell me about available loan options and rates.' },
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
      greetingBubble: '👋 Have a question? Chat with Nell!',
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
      fallbackMessage: 'Our specialists are currently busy. We will contact you shortly.',
    },
    guardrails: {
      piiRedaction: true,
      strictKnowledgeOnly: false,
      blockedTopics: [],
      gdprConsentRequired: true,
      zeroDataRetention: false,
    },
    crm: {
      autoCreateLead: true,
      provider: 'salesforce',
      autoSubmitForms: true,
      webhookUrl: '',
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
