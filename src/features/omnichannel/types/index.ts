/**
 * Omnichannel types — shared between omnichannel-view.tsx and the
 * conversation-detail-panel component extracted in Phase 6D.
 *
 * USAGE:
 *   import type {
 *     ChannelType, ConversationMessage, LeadInfo, Conversation,
 *     OmnichannelStats, CustomerContext, ContextReview, ContextJob,
 *   } from '@/features/omnichannel/types';
 *
 * Extracted from src/components/views/omnichannel-view.tsx in Phase 6D.
 */

export type ChannelType =
  | 'whatsapp'
  | 'messenger'
  | 'instagram'
  | 'sms'
  | 'email'
  | 'livechat'
  | 'webwidget'
  | 'googlebusiness'
  | 'teams'
  | 'slack'
  | 'website'
  | 'facebook'
  | 'google_ads'
  | 'justdial'
  | 'phone'
  | 'manual';

export interface InteractivePackageCard {
  id: string;
  name: string;
  price: string;
  duration?: string;
  features?: string[];
  isPopular?: boolean;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: 'customer' | 'agent' | 'system' | 'ai';
  senderName?: string;
  timestamp: string;
  channel: ChannelType;
  packageCards?: InteractivePackageCard[];
  confirmationCard?: {
    scheduledDate: string;
    actions: string[];
  };
}

export interface LeadInfo {
  id: string;
  name: string;
  status: string;
  value?: number;
  source: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  channel: ChannelType;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'closed' | 'pending';
  leadId?: string;
  lead?: LeadInfo;
  messages: ConversationMessage[];
  autoLeadCreated?: boolean;
  /** Active assignee — surfaced by the conversations API via the
   *  ConversationAssignment join. The conversation card shows a UserCheck
   *  icon (emerald) when assigned, UserPlus (muted) when unassigned. */
  assigneeId?: string;
  assigneeName?: string;
  aiPaused?: boolean;
  vipStatus?: boolean;
  totalSpent?: number;
  bookingsCount?: number;
  rating?: number;
  tags?: string[];
  aiSummary?: string;
  notes?: Array<{ id: string; text: string; date: string; author: string }>;
  address?: string;
}

export interface OmnichannelStats {
  totalConversations: number;
  leadsToday: number;
  activeChannels: number;
  unreadCount: number;
  byChannel: Record<ChannelType, { conversations: number; leads: number }>;
}

// ─── Customer Context (right panel) ─────────────────────────────────────────
// Fetched when a conversation is selected. Powers the reference-design stats
// grid (Reviews/Jobs/Contacts) + "Survey Results" (reviews) + "Case History"
// (jobs) accordions in the contact profile panel.

export interface ContextReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  source: string;
  createdAt: string;
}

export interface ContextJob {
  id: string;
  title: string;
  status: string;
  priority: string;
  scheduledAt: string | null;
  quotedAmount: number | null;
  jobNumber: string | null;
  createdAt: string;
}

export interface CustomerContext {
  stats: { reviews: number; jobs: number; contacts: number };
  reviews: ContextReview[];
  jobs: ContextJob[];
}
