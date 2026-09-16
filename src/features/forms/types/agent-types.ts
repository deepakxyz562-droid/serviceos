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
  id: 'agent_clara',
  slug: 'clara-dental',
  name: 'Clara',
  roleTitle: 'Dental Appointment Assistant',
  avatarUrl: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=150&auto=format&fit=crop&q=80',
  statusText: 'Online & Active',
  brandColor: '#2563eb',
  voiceTone: 'friendly',
  welcomeGreeting: "Hi, I'm **Clara**, an AI Agent and **Dental Appointment Assistant**. How may I help you today?",
  greetingSubtitle: 'Ask questions, schedule visits, or complete dental inquiry forms.',
  quickActions: [
    { id: 'qa_1', label: 'Schedule appointment', actionType: 'message', payload: 'I would like to schedule an appointment.' },
    { id: 'qa_2', label: 'Complete inquiry form', actionType: 'open_form', payload: 'form_1' },
    { id: 'qa_3', label: 'Pricing & Insurance', actionType: 'message', payload: 'What insurance plans do you accept?' },
    { id: 'qa_4', label: 'Our Location & Hours', actionType: 'message', payload: 'Where are you located and what are your hours?' },
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
      name: 'Dental Appointment & Inquiry Form',
      description: 'Quick patient registration and appointment request form.',
      submissionCount: 14,
    },
  ],
  knowledge: {
    crawledUrls: ['https://example-dental.com/services', 'https://example-dental.com/faq'],
    documents: [
      {
        id: 'doc_1',
        name: 'Dental_Services_and_Pricing_Guide_2026.pdf',
        size: 245000,
        type: 'pdf',
        status: 'indexed',
        indexedAt: new Date().toISOString(),
      },
    ],
    faqPairs: [
      { id: 'faq_1', question: 'Do you accept walk-ins?', answer: 'Yes, we accept emergency walk-in patients from 9 AM to 5 PM.' },
      { id: 'faq_2', question: 'What insurance is accepted?', answer: 'We accept Delta Dental, MetLife, Cigna, Aetna, and Guardian.' },
    ],
    systemPrompt: 'You are Clara, a warm, professional, and knowledgeable dental assistant AI for Fieseros Dental Care. Help patients schedule appointments, understand procedures, and guide them to complete our intake form.',
    guardrails: [
      'Never prescribe medications or provide official clinical diagnoses.',
      'Always invite patients to book an in-person dental examination.',
      'For severe dental emergencies (bleeding, trauma), advise calling emergency services or visiting immediately.',
    ],
  },
  channels: {
    activeChannel: 'chatbot',
    chatbot: {
      enabled: true,
      position: 'bottom-right',
      primaryColor: '#2563eb',
      greetingBubble: '👋 Need help booking an appointment? Chat with Clara!',
    },
    standalone: {
      enabled: true,
      slug: 'clara-dental',
    },
    whatsapp: {
      enabled: true,
      phoneNumber: '+1 (555) 345-6789',
      paired: true,
    },
    phone: {
      enabled: true,
      phoneNumber: '+1 (800) 555-DENT',
      voiceId: 'Rachel',
    },
    sms: {
      enabled: true,
      phoneNumber: '+1 (555) 345-6789',
    },
    instagram: {
      enabled: false,
      accountHandle: '@fieserosdental',
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
    totalConversations: 142,
    totalFormSubmissions: 68,
    avgSatisfactionRating: 4.9,
  },
};
