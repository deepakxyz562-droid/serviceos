export type ChannelType = 'all' | 'ai' | 'live_chat' | 'whatsapp' | 'sms';

export interface SubscriberUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

export interface SubscriberTenant {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  plan?: string;
}

export interface ChatSession {
  id: string;
  visitorName: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  status: 'active' | 'claimed' | 'waiting_for_agent' | 'closed';
  channel: 'ai' | 'live_chat' | 'whatsapp' | 'sms';
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: {
    body: string;
    senderType: 'visitor' | 'agent' | 'ai' | 'system';
    createdAt: string;
  } | null;
  formName?: string | null;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'visitor' | 'agent' | 'ai' | 'system';
  senderName: string | null;
  body: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: 'ai_agent' | 'form' | 'live_chat' | 'whatsapp' | 'manual';
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  estimatedValue?: number | null;
  currency?: string;
  serviceRequested?: string | null;
  formName?: string | null;
  summary?: string | null;
  createdAt: string;
  answers?: Record<string, any>;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  amount?: number | null;
  paidDeposit?: boolean;
}

export interface FormMetric {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'paused';
  views: number;
  starts: number;
  submissions: number;
  conversionRate: number;
  shareUrl: string;
  lastSubmissionAt?: string | null;
}

export interface AiKnowledgeGap {
  id: string;
  question: string;
  askedAt: string;
  visitorContext?: string;
}
