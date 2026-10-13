'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send, Search, Settings,
  CheckCheck, Loader2,
  ExternalLink, Sparkles, X, Filter,
  BarChart3, Inbox, UserCheck, UserPlus,
  StickyNote, Clock, Radio, Ticket,
  Phone, Mail, Instagram, MessageCircle,
  Globe, Star, CheckCircle2, ChevronRight,
  Paperclip, Smile, Image as ImageIcon,
  Calendar, Zap, RotateCcw, User,
  Plus, ChevronDown, Check, MoreHorizontal,
  Tag, ArrowRight, ArrowLeft, ShieldCheck, FileText,
  TrendingUp, Flame, Timer, Monitor, Smartphone,
  Laptop, MapPin, Keyboard, Eye, RefreshCw, AlertCircle, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import {
  ALL_CHANNELS,
  ChannelBadge,
  ChannelIcon,
  formatTime,
  getChannelMeta,
  getInitials,
} from '@/features/omnichannel/utils/omnichannel-helpers';
import type {
  ChannelType,
  Conversation,
  ConversationMessage,
  LeadInfo,
  OmnichannelStats,
  CustomerContext,
  InteractivePackageCard,
} from '@/features/omnichannel/types';
import { ConversationDetailPanel } from '@/features/omnichannel/components/conversation-detail-panel';

const API_BASE = '/api/omnichannel';

// Canonical fallback conversations matching reference screenshots
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_priya_sharma',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'priya.sharma@gmail.com',
    channel: 'whatsapp',
    lastMessage: 'Can someone visit tomorrow morning?',
    lastMessageTime: new Date().toISOString(),
    displayTime: '10:24 AM',
    unreadCount: 2,
    status: 'active',
    leadStatusBadge: 'New Lead',
    vipStatus: true,
    totalSpent: 12450,
    bookingsCount: 3,
    rating: 4.8,
    tags: ['AC Service', 'Residential', 'Delhi', 'New Lead'],
    address: 'Delhi, India',
    customFields: {
      source: 'WhatsApp',
      interestedIn: 'AC Service',
      preferredDate: 'Tomorrow morning',
      address: '123 Green Park, Delhi',
      notes: 'Looking for annual maintenance after service.',
    },
    aiSummary:
      'Customer saw Google ad and requested AC servicing for 2 split ACs in a 2BHK in Delhi (one bedroom unit not cooling). Proposed tomorrow 10:00 AM visit.',
    messages: [
      {
        id: 'msg_ps1',
        conversationId: 'conv_priya_sharma',
        content:
          'Hi, I saw your ad on Google. I need AC servicing for my 2BHK in Delhi. What are your charges?',
        sender: 'customer',
        timestamp: '10:18 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_ps2',
        conversationId: 'conv_priya_sharma',
        content:
          'Hi Priya! 👋 Thank you for reaching out. Our standard AC servicing starts at ₹499 per unit. How many AC units do you have?',
        sender: 'agent',
        senderName: 'Support Team',
        timestamp: '10:19 AM',
        channel: 'whatsapp',
        readReceipt: true,
      },
      {
        id: 'msg_ps3',
        conversationId: 'conv_priya_sharma',
        content: "I have 2 split ACs. One in the bedroom isn't cooling properly.",
        sender: 'customer',
        timestamp: '10:21 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_ps4',
        conversationId: 'conv_priya_sharma',
        content: 'This is the AC unit.',
        sender: 'customer',
        timestamp: '10:22 AM',
        channel: 'whatsapp',
        imageAttachment: {
          caption: 'This is the AC unit.',
          label: 'Split AC Indoor Unit • Bedroom',
        },
      },
      {
        id: 'msg_ps5',
        conversationId: 'conv_priya_sharma',
        content: 'Can someone visit tomorrow morning?',
        sender: 'customer',
        timestamp: '10:24 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_ps6',
        conversationId: 'conv_priya_sharma',
        content:
          "Sure! We have a slot available tomorrow at 10:00 AM. For the AC that's not cooling, our technician will inspect it—if gas refilling is needed, we'll let you know the estimate beforehand. Shall I book it for you?",
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: '10:25 AM',
        channel: 'whatsapp',
        readReceipt: true,
        packageCards: [
          {
            id: 'pkg_std',
            name: 'Standard',
            price: '₹ 2,999',
            duration: '4-5 hours',
          },
          {
            id: 'pkg_deep',
            name: 'Deep Clean',
            price: '₹ 3,999',
            duration: '6-7 hours',
            isPopular: true,
          },
          {
            id: 'pkg_prem',
            name: 'Premium',
            price: '₹ 5,499',
            duration: '+ Sofa & Mattress',
          },
        ],
        confirmationCard: {
          scheduledDate: 'Tomorrow at 10:00 AM',
          actions: ['Yes, confirm', 'Change time', 'Add special instructions'],
        },
      },
    ],
  },
  {
    id: 'conv_rahul',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98111 22334',
    customerEmail: 'rahul.verma@gmail.com',
    channel: 'sms',
    lastMessage: 'Thanks for the quote, I will confirm by evening.',
    lastMessageTime: new Date(Date.now() - 15 * 60000).toISOString(),
    displayTime: '9:18 AM',
    unreadCount: 1,
    status: 'active',
    leadStatusBadge: 'New Lead',
    vipStatus: false,
    totalSpent: 4800,
    bookingsCount: 2,
    rating: 4.9,
    tags: ['Quote', 'Residential'],
    address: 'Noida, UP',
    messages: [
      {
        id: 'msg_r1',
        conversationId: 'conv_rahul',
        content: 'Thanks for the quote, I will confirm by evening.',
        sender: 'customer',
        timestamp: '9:18 AM',
        channel: 'sms',
      },
    ],
  },
  {
    id: 'conv_sneha',
    customerName: 'Sneha Kapoor',
    customerEmail: 'sneha.kapoor@gmail.com',
    channel: 'email',
    lastMessage: 'Invoice for Pest Control Service',
    lastMessageTime: new Date(Date.now() - 35 * 60000).toISOString(),
    displayTime: '8:42 AM',
    unreadCount: 1,
    status: 'active',
    leadStatusBadge: 'Customer',
    tags: ['Invoice', 'Pest Control'],
    address: 'South Delhi, India',
    messages: [
      {
        id: 'msg_sk1',
        conversationId: 'conv_sneha',
        content: 'Hi team, please share the GST invoice for the Pest Control Service completed yesterday.',
        sender: 'customer',
        timestamp: '8:42 AM',
        channel: 'email',
      },
    ],
  },
  {
    id: 'conv_visitor',
    customerName: 'Website Visitor #4821',
    customerPhone: '+1 520 555 0192',
    channel: 'livechat',
    lastMessage: 'I need pricing details for deep cleaning a commercial kitchen.',
    lastMessageTime: new Date(Date.now() - 40 * 60000).toISOString(),
    displayTime: '8:15 AM',
    unreadCount: 1,
    status: 'active',
    leadStatusBadge: 'New Lead',
    tags: ['New Lead', 'AI Chat'],
    address: 'Tucson, Arizona',
    messages: [
      {
        id: 'msg_v1',
        conversationId: 'conv_visitor',
        content: 'I need pricing details for deep cleaning a commercial kitchen.',
        sender: 'customer',
        timestamp: '10:18 AM',
        channel: 'livechat',
      },
    ],
  },
  {
    id: 'conv_amit',
    customerName: 'Amit Singh',
    customerPhone: '+91 98220 11445',
    channel: 'livechat',
    lastMessage: 'Do you provide deep cleaning in Gurgaon?',
    lastMessageTime: new Date(Date.now() - 20 * 3600000).toISOString(),
    displayTime: 'Yesterday',
    unreadCount: 0,
    status: 'active',
    leadStatusBadge: 'New Lead',
    tags: ['Deep Cleaning', 'Gurgaon'],
    address: 'DLF Phase 4, Gurgaon',
    messages: [
      {
        id: 'msg_as1',
        conversationId: 'conv_amit',
        content: 'Do you provide deep cleaning in Gurgaon?',
        sender: 'customer',
        timestamp: 'Yesterday',
        channel: 'livechat',
      },
    ],
  },
  {
    id: 'conv_neha',
    customerName: 'Neha Gupta',
    customerEmail: 'neha.gupta@instagram.com',
    channel: 'instagram',
    lastMessage: 'Loved your recent post! How much for sofa cleaning?',
    lastMessageTime: new Date(Date.now() - 22 * 3600000).toISOString(),
    displayTime: 'Yesterday',
    unreadCount: 0,
    status: 'active',
    leadStatusBadge: 'New Lead',
    tags: ['Sofa Cleaning', 'Instagram'],
    address: 'Saket, Delhi',
    messages: [
      {
        id: 'msg_ng1',
        conversationId: 'conv_neha',
        content: 'Loved your recent post! How much for sofa cleaning?',
        sender: 'customer',
        timestamp: 'Yesterday',
        channel: 'instagram',
      },
    ],
  },
  {
    id: 'conv_karan',
    customerName: 'Karan Malhotra',
    customerPhone: '+91 99100 77889',
    channel: 'whatsapp',
    lastMessage: 'Technician arrived on time. Great service!',
    lastMessageTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    displayTime: 'Yesterday',
    unreadCount: 0,
    status: 'active',
    leadStatusBadge: 'Customer',
    tags: ['Customer', 'Completed'],
    address: 'Vasant Kunj, Delhi',
    messages: [
      {
        id: 'msg_km1',
        conversationId: 'conv_karan',
        content: 'Technician arrived on time. Great service!',
        sender: 'customer',
        timestamp: 'Yesterday',
        channel: 'whatsapp',
      },
    ],
  },
  {
    id: 'conv_vikram',
    customerName: 'Vikram Patel',
    customerEmail: 'vikram.patel@facebook.com',
    channel: 'messenger',
    lastMessage: 'Can I reschedule my appointment to Sunday?',
    lastMessageTime: new Date(Date.now() - 48 * 3600000).toISOString(),
    displayTime: 'Jan 28',
    unreadCount: 0,
    status: 'active',
    leadStatusBadge: 'Customer',
    tags: ['Reschedule'],
    address: 'Dwarka, Delhi',
    messages: [
      {
        id: 'msg_vp1',
        conversationId: 'conv_vikram',
        content: 'Can I reschedule my appointment to Sunday?',
        sender: 'customer',
        timestamp: 'Jan 28',
        channel: 'messenger',
      },
    ],
  },
  {
    id: 'conv_ananya',
    customerName: 'Ananya Rao',
    customerPhone: '+91 97112 33445',
    channel: 'whatsapp',
    lastMessage: 'Please share the payment link.',
    lastMessageTime: new Date(Date.now() - 52 * 3600000).toISOString(),
    displayTime: 'Jan 28',
    unreadCount: 0,
    status: 'active',
    leadStatusBadge: 'Customer',
    tags: ['Payment'],
    address: 'Hauz Khas, Delhi',
    messages: [
      {
        id: 'msg_ar1',
        conversationId: 'conv_ananya',
        content: 'Please share the payment link.',
        sender: 'customer',
        timestamp: 'Jan 28',
        channel: 'whatsapp',
      },
    ],
  },
];

export interface LiveVisitorTelemetry {
  id: string;
  name: string;
  shortId: string;
  location: string;
  page: string;
  duration: string;
  intent: string;
  intentScore: number;
  device: string;
  deviceCategory: 'desktop' | 'mobile';
  referral: string;
  referralCategory: 'maps' | 'organic' | 'instagram' | 'direct';
  ip: string;
  provider: string;
  status: 'stalled' | 'high_intent' | 'chatting' | 'browsing' | 'idle';
  statusLabel: string;
  quoteEstimate: number;
  timeline: { time: string; title: string; desc: string; isCurrent?: boolean }[];
  currentKeystroke?: string;
  suggestedReplies?: string[];
  aiNudge: { rule: string; message: string };
}

export const LIVE_VISITORS_DATA: LiveVisitorTelemetry[] = [
  {
    id: 'vis_8487',
    name: 'Visitor #8487',
    shortId: '87',
    location: 'Catalina Foothills (85718)',
    page: '/book-appointment',
    duration: '5m 20s',
    intent: 'Intent 96%',
    intentScore: 96,
    device: 'Desktop Chrome',
    deviceCategory: 'desktop',
    referral: 'Tucson Maps (GBP)',
    referralCategory: 'maps',
    ip: '73.189.44.xx',
    provider: 'Comcast Cable',
    status: 'stalled',
    statusLabel: 'Stalled at Booking (45s)',
    quoteEstimate: 285,
    timeline: [
      { time: '14:02:11', title: 'Landed via Google Maps', desc: "Listing: 'Google Business Profile - Local Maps'" },
      { time: '14:04:05', title: 'Navigated to /deep-cleaning', desc: 'Viewed: Eco-friendly package details & customer reviews' },
      { time: '14:05:40', title: 'Configured Instant Calculator', desc: "Home size: 2,400 sq ft • 3 Bed / 2.5 Bath • Selected 'Deep Sanitization'" },
      { time: '14:07:30', title: 'Stalled on /book-appointment', desc: 'Cursor paused on Saturday 10:00 AM slot for 45s without confirming.', isCurrent: true },
    ],
    currentKeystroke: 'do you guys bring your own organic supplies for hardwood fl',
    suggestedReplies: [
      'Yes! We bring 100% plant-based Eco-Cert supplies safe for hardwood & pets.',
      'All equipment and gentle organic solutions are fully included at no extra fee.',
    ],
    aiNudge: {
      rule: 'Hesitant-Booking-v2',
      message: "Hi there! We noticed you're looking at Saturday deep cleaning in Catalina Foothills. We only have 2 weekend crews left in 85718—would you like me to reserve the 10:00 AM slot for you right now?",
    },
  },
  {
    id: 'vis_4821',
    name: 'Visitor #4821',
    shortId: '21',
    location: 'Tucson, Arizona',
    page: '/pricing',
    duration: '2m 45s on pricing table',
    intent: 'High Intent',
    intentScore: 92,
    device: 'Desktop Chrome',
    deviceCategory: 'desktop',
    referral: 'Google Organic',
    referralCategory: 'organic',
    ip: '198.51.100.14',
    provider: 'CenturyLink Fiber',
    status: 'high_intent',
    statusLabel: 'High Intent',
    quoteEstimate: 195,
    timeline: [
      { time: '14:06:12', title: 'Landed via Google Organic', desc: "Query: 'best house cleaning services tucson'" },
      { time: '14:08:45', title: 'Scrolled to Commercial Kitchen Tier', desc: 'Active on commercial pricing toggle', isCurrent: true },
    ],
    currentKeystroke: 'what is the hourly rate for weekend commercial kitchen clean?',
    suggestedReplies: [
      'Our commercial kitchen rate starts at $149 with certified health-code sanitizer.',
      'Would you like an instant quote sent directly to your WhatsApp or email?',
    ],
    aiNudge: {
      rule: 'Commercial-Pricing-Intent',
      message: 'Need pricing for commercial kitchens? We offer customized after-hours sanitization with free estimates.',
    },
  },
  {
    id: 'vis_5019',
    name: 'Visitor #5019',
    shortId: '19',
    location: 'San Jose, California',
    page: '/services/deep-cleaning',
    duration: '1m 20s on deep cleaning',
    intent: 'Exploring Services',
    intentScore: 78,
    device: 'Mobile Safari',
    deviceCategory: 'mobile',
    referral: 'Instagram Ads',
    referralCategory: 'instagram',
    ip: '67.180.21.88',
    provider: 'AT&T Mobility',
    status: 'browsing',
    statusLabel: 'Exploring Services',
    quoteEstimate: 220,
    timeline: [
      { time: '14:09:20', title: 'Landed from Instagram Ad', desc: 'Campaign: Spring Deep Cleaning Promo' },
      { time: '14:10:40', title: 'Viewing Deep Cleaning FAQs', desc: 'Expanded: Are supplies pet safe?', isCurrent: true },
    ],
    currentKeystroke: 'do you travel to silicon valley?',
    suggestedReplies: [
      'Yes, we cover the entire South Bay area including San Jose and Santa Clara!',
    ],
    aiNudge: {
      rule: 'Service-Area-Verification',
      message: 'Looking for cleaning in San Jose? Enter your zip code to see today’s open appointment windows!',
    },
  },
  {
    id: 'vis_6284',
    name: 'Visitor #6284',
    shortId: '84',
    location: 'Phoenix, Arizona',
    page: '/booking-estimate',
    duration: '3m 10s on booking form',
    intent: 'High Intent',
    intentScore: 94,
    device: 'Desktop Edge',
    deviceCategory: 'desktop',
    referral: 'Direct URL',
    referralCategory: 'direct',
    ip: '72.204.12.9',
    provider: 'Cox Communications',
    status: 'stalled',
    statusLabel: 'High Intent',
    quoteEstimate: 310,
    timeline: [
      { time: '14:05:01', title: 'Direct Visit to Estimate Page', desc: 'Saved bookmark' },
      { time: '14:08:11', title: 'Configured 3,200 sq ft Home', desc: 'Selected Deep Clean + Window Washing', isCurrent: true },
    ],
    currentKeystroke: 'can we add exterior windows to the quote?',
    suggestedReplies: [
      'Exterior windows can be added for just $45! Shall I add that to your estimate?',
    ],
    aiNudge: {
      rule: 'Bundle-Upsell-Nudge',
      message: 'Get $25 off when you bundle deep cleaning with window washing this month!',
    },
  },
  {
    id: 'vis_8490',
    name: 'Visitor #8490',
    shortId: '90',
    location: 'Oro Valley (85737)',
    page: '/pricing-plans',
    duration: '1m 18s active',
    intent: 'Nudge Ready',
    intentScore: 88,
    device: 'Mobile iOS',
    deviceCategory: 'mobile',
    referral: 'Instagram Ads',
    referralCategory: 'instagram',
    ip: '70.160.91.4',
    provider: 'Verizon Wireless',
    status: 'high_intent',
    statusLabel: 'Nudge Ready',
    quoteEstimate: 175,
    timeline: [
      { time: '14:08:15', title: 'Ad Click from Instagram', desc: 'Carousel ad 3' },
      { time: '14:09:33', title: 'Scrolled to Bi-weekly plan', desc: 'Hovered on save 20% badge', isCurrent: true },
    ],
    currentKeystroke: 'is there a contract for bi-weekly?',
    suggestedReplies: [
      'No contracts at all! You can cancel or pause anytime with 24 hours notice.',
    ],
    aiNudge: {
      rule: 'Recurring-Discount-Nudge',
      message: 'Enjoy 20% off all bi-weekly cleanings with no commitments or contracts.',
    },
  },
  {
    id: 'vis_8488',
    name: 'Visitor #8488',
    shortId: '88',
    location: 'University Area (85719)',
    page: '/home-cleaning',
    duration: '48s active',
    intent: 'Casual Browsing',
    intentScore: 45,
    device: 'Mobile Android',
    deviceCategory: 'mobile',
    referral: 'Google Organic',
    referralCategory: 'organic',
    ip: '128.196.4.12',
    provider: 'Univ of Arizona Wi-Fi',
    status: 'browsing',
    statusLabel: 'Casual Browsing',
    quoteEstimate: 120,
    timeline: [
      { time: '14:10:02', title: 'Landed on Home Cleaning Overview', desc: 'Referral link', isCurrent: true },
    ],
    currentKeystroke: '',
    suggestedReplies: [],
    aiNudge: {
      rule: 'Student-Welcome',
      message: 'Welcome! Need a move-out or dorm turnaround clean? Check out our quick turnaround specials.',
    },
  },
];

export function OmnichannelView({ initialTab }: { initialTab?: 'conversations' | 'visitors' | 'tickets' } = {}) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const auth = useAppStore((state) => state.auth);
  const businessName = auth.tenant?.name || auth.workspace?.name || 'our team';

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('conv_priya_sharma');
  const [activeChannelPill, setActiveChannelPill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [composerMode, setComposerMode] = useState<'reply' | 'internal' | 'ai' | 'template'>('reply');
  const [showTemplates, setShowTemplates] = useState(false);
  const [centerNoteInput, setCenterNoteInput] = useState('');
  const [conversationNotes, setConversationNotes] = useState<Record<string, { id: string; text: string; author: string; date: string }[]>>({});
  const [inboxTab, setInboxTab] = useState<'conversations' | 'visitors' | 'tickets'>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get('tab');
      if (tab === 'visitors' || tab === 'tickets') return tab;
      if (p.get('view') === 'liveChat') return 'visitors';
    }
    return 'conversations';
  });
  const [filterPill, setFilterPill] = useState<'all' | 'unread' | 'leads' | 'customers' | 'assigned' | 'ai' | 'starred'>('all');
  const [centerSubTab, setCenterSubTab] = useState<'chat' | 'details' | 'notes' | 'orders' | 'appointments' | 'tickets'>('chat');
  const [assignBusy, setAssignBusy] = useState<string | null>(null);
  const [customerContext, setCustomerContext] = useState<CustomerContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Live Visitor Radar state
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('vis_8487');
  const [visitorSubTab, setVisitorSubTab] = useState<'all' | 'high_intent' | 'chatting' | 'idle'>('all');
  const [visitorDeviceFilter, setVisitorDeviceFilter] = useState<'all' | 'desktop' | 'mobile'>('all');
  const [visitorReferralFilter, setVisitorReferralFilter] = useState<'all' | 'organic' | 'maps' | 'instagram' | 'direct'>('all');
  const [nudgeSent, setNudgeSent] = useState<Record<string, boolean>>({});

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Load real API data defensively, merging with initial records
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (Array.isArray(data?.conversations) ? data.conversations : []);
        if (rawList.length > 0) {
          setConversations(rawList);
          if (!selectedConversationId || !rawList.some((c: any) => c.id === selectedConversationId)) {
            setSelectedConversationId(rawList[0].id);
          }
        } else if (auth.isAuthenticated && (Array.isArray(data) || Array.isArray(data?.conversations))) {
          // Explicit empty conversation set from authenticated backend
          setConversations([]);
          setSelectedConversationId('');
        }
      }
    } catch {
      // Keep rich fallback dataset
    }
  }, [selectedConversationId, auth.isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-scroll chat
  useEffect(() => {
    if (typeof messageEndRef.current?.scrollIntoView === 'function') {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversationId, conversations]);

  // Selected conversation
  const selectedConversation =
    conversations.find((c) => c.id === selectedConversationId) || conversations[0] || null;

  // Selected live visitor
  const selectedVisitor =
    LIVE_VISITORS_DATA.find((v) => v.id === selectedVisitorId) || LIVE_VISITORS_DATA[0];

  // Dynamic channel & filter counts
  const totalConversationsCount = conversations.length;
  const unreadConversationsCount = conversations.filter((c) => c.unreadCount > 0).length;
  const leadsConversationsCount = conversations.filter((c) => c.leadStatusBadge === 'New Lead').length;
  const channelCounts: Record<string, number> = {
    all: 24,
    whatsapp: 8,
    sms: 4,
    email: 5,
    livechat: 3,
    instagram: 2,
    facebook: 2,
    phone: 1,
  };

  // Filtering
  const filteredConversations = conversations.filter((c) => {
    // Channel filter
    if (activeChannelPill !== 'all') {
      if (activeChannelPill === 'whatsapp' && c.channel !== 'whatsapp') return false;
      if (activeChannelPill === 'livechat' && c.channel !== 'livechat' && c.channel !== 'website') return false;
      if (activeChannelPill === 'instagram' && c.channel !== 'instagram') return false;
      if (activeChannelPill === 'facebook' && c.channel !== 'messenger' && c.channel !== 'facebook') return false;
      if (activeChannelPill === 'email' && c.channel !== 'email') return false;
      if (activeChannelPill === 'sms' && c.channel !== 'sms') return false;
      if (activeChannelPill === 'phone' && c.channel !== 'phone') return false;
    }

    // Filter pill
    if (filterPill === 'unread' && c.unreadCount === 0) return false;
    if (filterPill === 'leads' && c.leadStatusBadge !== 'New Lead') return false;
    if (filterPill === 'customers' && c.leadStatusBadge !== 'Customer') return false;
    if (filterPill === 'assigned' && !c.assigneeId) return false;
    if (filterPill === 'ai' && c.aiPaused) return false;
    if (filterPill === 'starred' && !c.vipStatus) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchPhone = c.customerPhone?.toLowerCase().includes(q);
      const matchMsg = c.lastMessage.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchMsg) return false;
    }

    return true;
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    const content = messageInput.trim();
    const isInternal = composerMode === 'internal';
    setMessageInput('');

    const newMsg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      sender: isInternal ? 'system' : 'agent',
      senderName: isInternal ? 'Internal Note' : (auth.user?.name || 'You'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
      readReceipt: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: isInternal ? `[Note] ${content}` : content,
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0,
            }
          : c
      )
    );

    try {
      if (isInternal) {
        // Send to isolated internal notes endpoint — NEVER delivered to customer
        const res = await fetch(`${API_BASE}/conversations/${selectedConversation.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          toast.error('Failed to save internal note to server.');
        } else {
          toast.success('Internal note saved privately');
        }
      } else {
        // Customer delivery endpoint
        const res = await fetch(`${API_BASE}/conversations/${selectedConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'Failed to deliver message to customer.');
        }
      }
    } catch {
      toast.error('Network error occurred while sending.');
    }
  };

  const handleConvertToCustomer = async (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              leadStatusBadge: 'Customer',
              tags: Array.from(new Set([...(c.tags || []).filter((t) => t !== 'New Lead'), 'Customer'])),
            }
          : c
      )
    );
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: conv.customerName,
          phone: conv.customerPhone,
          notes: `Converted from omnichannel inbox (${conv.channel})`,
        }),
      });
      if (!res.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  leadStatusBadge: conv.leadStatusBadge,
                  tags: conv.tags,
                }
              : c
          )
        );
        toast.error('Failed to convert customer in CRM on server.');
        return;
      }
      toast.success(`${conv.customerName} converted to Customer in CRM!`);
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                leadStatusBadge: conv.leadStatusBadge,
                tags: conv.tags,
              }
            : c
        )
      );
      toast.error('Network error converting customer in CRM.');
    }
  };

  const handleToggleCloseConversation = (conv: Conversation) => {
    const nextStatus = conv.status === 'closed' ? 'active' : 'closed';
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, status: nextStatus, unreadCount: nextStatus === 'closed' ? 0 : c.unreadCount }
          : c
      )
    );
    fetch(`/api/conversations/${conv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => {});
    toast.success(nextStatus === 'closed' ? 'Conversation marked as closed' : 'Conversation reopened');
  };

  const handleGenerateAiReply = async () => {
    if (!selectedConversation) return;
    const lastMsg = selectedConversation.lastMessage || '';
    const firstName = selectedConversation.customerName ? selectedConversation.customerName.split(' ')[0] : 'there';
    let draft = `Hi ${firstName}! Thank you for reaching out to ${businessName}. How can we assist you with your request today?`;

    try {
      const res = await fetch('/api/ai/suggested-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastMsg || `Inquiry from ${selectedConversation.customerName}`,
          conversationId: selectedConversation.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.replies) && data.replies.length > 0 && data.replies[0]?.text) {
          draft = data.replies[0].text;
        }
      }
    } catch {
      // Dynamic fallback based on customer inquiry context
      const lastText = lastMsg.toLowerCase();
      if (lastText.includes('tomorrow') || lastText.includes('time') || lastText.includes('slot')) {
        draft = `Hi ${firstName}! I have reserved tomorrow at 10:00 AM for you. Our specialist will confirm with you 30 minutes before arrival.`;
      } else if (lastText.includes('quote') || lastText.includes('pricing') || lastText.includes('cost')) {
        draft = `Hi ${firstName}! Here is a tailored estimate from ${businessName} based on your requirements. Let me know if you would like to proceed!`;
      }
    }

    setCenterSubTab('chat');
    setComposerMode('reply');
    setMessageInput(draft);
    toast.success('AI draft generated in composer');
  };

  const handleToggleAssign = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAssigned = !!conv.assigneeId;
    const assigneeName = auth.user?.name || 'You';
    const nextAssigneeId = isAssigned ? undefined : (auth.user?.id || 'me');
    const nextAssigneeName = isAssigned ? undefined : assigneeName;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              assigneeId: nextAssigneeId,
              assigneeName: nextAssigneeName,
            }
          : c
      )
    );

    try {
      const res = await fetch(`${API_BASE}/conversations/${conv.id}/assign`, {
        method: isAssigned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isAssigned ? undefined : JSON.stringify({ agentId: auth.user?.id }),
      });
      if (!res.ok) {
        // Rollback
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, assigneeId: conv.assigneeId, assigneeName: conv.assigneeName } : c))
        );
        toast.error('Failed to update assignment on server');
        return;
      }
      toast.success(isAssigned ? 'Unassigned' : `Assigned to ${assigneeName}`);
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, assigneeId: conv.assigneeId, assigneeName: conv.assigneeName } : c))
      );
      toast.error('Network error updating assignment');
    }
  };

  const handleToggleAiHandled = async (convId: string, aiPaused: boolean) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, aiPaused } : c))
    );
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}/takeover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPaused }),
      });
      if (!res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, aiPaused: !aiPaused } : c))
        );
        toast.error('Failed to update AI handoff on server');
      } else {
        toast.success(aiPaused ? 'AI paused — Human takeover active' : 'AI automated responses resumed');
      }
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, aiPaused: !aiPaused } : c))
      );
      toast.error('Network error updating AI takeover');
    }
  };

  const handleSelectPackage = (pkg: InteractivePackageCard) => {
    const userMsg: ConversationMessage = {
      id: `usr_${Date.now()}`,
      conversationId: selectedConversation.id,
      content: `I would like to select the ${pkg.name} package (${pkg.price}).`,
      sender: 'customer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
    };

    const confirmMsg: ConversationMessage = {
      id: `ai_${Date.now() + 1}`,
      conversationId: selectedConversation.id,
      content: `Excellent choice! The **${pkg.name}** package (${pkg.price}) has been selected. Would you like to schedule it for **Saturday, Apr 26 at 10:00 AM**?`,
      sender: 'ai',
      senderName: 'AI Assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
      readReceipt: true,
      confirmationCard: {
        scheduledDate: 'Saturday, Apr 26 at 10:00 AM',
        actions: ['Yes, confirm', 'Change time', 'Add special instructions'],
      },
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? {
              ...c,
              messages: [...c.messages, userMsg, confirmMsg],
              lastMessage: confirmMsg.content,
            }
          : c
      )
    );
    toast.success(`${pkg.name} package selected`);
  };

  const handleConfirmChip = (chip: string) => {
    const userMsg: ConversationMessage = {
      id: `usr_${Date.now()}`,
      conversationId: selectedConversation.id,
      content: chip,
      sender: 'customer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
    };

    let reply = `Thank you! Your request for "${chip}" has been recorded.`;
    if (chip === 'Yes, confirm') {
      reply = `🎉 Booking confirmed! Your service appointment is confirmed for **Tomorrow at 10:00 AM**. You will receive an SMS and WhatsApp reminder shortly.`;
    }

    const aiMsg: ConversationMessage = {
      id: `ai_${Date.now() + 1}`,
      conversationId: selectedConversation.id,
      content: reply,
      sender: 'ai',
      senderName: 'AI Assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
      readReceipt: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? {
              ...c,
              messages: [...c.messages, userMsg, aiMsg],
              lastMessage: aiMsg.content,
            }
          : c
      )
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-[#F4F6F5] dark:bg-slate-950 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP INBOX HEADER & LABELED CHANNEL FILTER PILLS (Screenshot Parity)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="px-4 sm:px-6 pt-3.5 pb-2.5 flex flex-col gap-3 shrink-0 z-30">
        {/* Row 1: Title + Subtitle on Left, All channels & + New on Right */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Inbox
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All your customer conversations in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <span>
                    {activeChannelPill === 'all'
                      ? 'All channels'
                      : activeChannelPill === 'livechat'
                      ? 'Web Chat'
                      : activeChannelPill.charAt(0).toUpperCase() + activeChannelPill.slice(1)}
                  </span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem onClick={() => setActiveChannelPill('all')}>
                  All channels
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('whatsapp')}>
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('sms')}>
                  SMS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('email')}>
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('livechat')}>
                  Web Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('instagram')}>
                  Instagram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveChannelPill('facebook')}>
                  Facebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-9 px-3.5 rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>New</span>
                  <ChevronDown className="size-3.5 opacity-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setInboxTab('conversations');
                    setCenterSubTab('chat');
                    toast.success('Ready to compose new message');
                  }}
                >
                  <MessageCircle className="size-3.5 mr-2 text-[#009F50]" /> New WhatsApp Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('scheduling')}>
                  <Calendar className="size-3.5 mr-2 text-[#009F50]" /> Book Appointment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('helpCenter')}>
                  <Ticket className="size-3.5 mr-2 text-[#009F50]" /> Create Support Ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Horizontal Labeled Channel Filter Pills with Counts */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {[
              {
                id: 'all',
                label: 'All',
                title: 'All',
                badge: channelCounts.all,
                icon: null,
                iconColor: '',
              },
              {
                id: 'whatsapp',
                label: 'WhatsApp',
                title: 'WhatsApp',
                badge: channelCounts.whatsapp,
                icon: MessageCircle,
                iconColor: 'text-[#25D366]',
              },
              {
                id: 'sms',
                label: 'SMS',
                title: 'SMS',
                badge: channelCounts.sms,
                icon: MessageSquare,
                iconColor: 'text-blue-500',
              },
              {
                id: 'email',
                label: 'Email',
                title: 'Email',
                badge: channelCounts.email,
                icon: Mail,
                iconColor: 'text-rose-500',
              },
              {
                id: 'livechat',
                label: 'Web Chat',
                title: 'Live Chat',
                badge: channelCounts.livechat,
                icon: MessageSquare,
                iconColor: 'text-[#009F50]',
              },
              {
                id: 'instagram',
                label: 'Instagram',
                title: 'Instagram',
                badge: channelCounts.instagram,
                icon: Instagram,
                iconColor: 'text-pink-600',
              },
              {
                id: 'facebook',
                label: 'Facebook',
                title: 'Facebook',
                badge: channelCounts.facebook,
                icon: MessageSquare,
                iconColor: 'text-blue-600',
              },
            ].map((ch) => {
              const Icon = ch.icon;
              const isSelected = activeChannelPill === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  title={ch.title}
                  onClick={() => setActiveChannelPill(ch.id)}
                  className={cn(
                    'h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 border',
                    isSelected
                      ? 'bg-[#009F50] text-white border-[#009F50] shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        'size-3.5 shrink-0',
                        isSelected ? 'text-white' : ch.iconColor
                      )}
                    />
                  )}
                  <span>{ch.label}</span>
                  <span
                    className={cn(
                      'text-[11px] font-bold px-1.5 py-0 rounded-md',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {ch.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3 Segment Switchers: Conversations | Live Visitors | Tickets */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInboxTab('conversations')}
              className={cn(
                'py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all',
                inboxTab === 'conversations'
                  ? 'bg-[#E8F8EF] text-[#009F50]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Conversations
            </button>
            <button
              type="button"
              onClick={() => setInboxTab('visitors')}
              className={cn(
                'py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1',
                inboxTab === 'visitors'
                  ? 'bg-[#E8F8EF] text-[#009F50]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Live Visitors
              <span className="size-4 bg-[#009F50] text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {LIVE_VISITORS_DATA.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInboxTab('tickets')}
              className={cn(
                'py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1',
                inboxTab === 'tickets'
                  ? 'bg-[#E8F8EF] text-[#009F50]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Tickets
              <span className="size-4 bg-[#E8F8EF] text-[#009F50] rounded-full text-[9px] flex items-center justify-center font-bold">
                5
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. WORKSTATION MAIN: 3 ROUNDED CARDS (LIST | THREAD | CONTACT 360)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 pb-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 overflow-hidden">
        {/* ── LEFT COLUMN CARD: CONVERSATION LIST (3 Cols) ── */}
        <div className="md:col-span-4 lg:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 pb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#009F50]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterPill('all');
                setActiveChannelPill('all');
                setSearchQuery('');
              }}
              title="Reset filters"
              className="size-8 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 flex items-center justify-center text-slate-500"
            >
              <Filter className="size-3.5" />
            </button>
          </div>

          {/* Filter Tabs: All | Unread | Leads | Customers */}
          <div className="px-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: `All ${totalConversationsCount}`, display: 'All' },
              { id: 'unread', label: `Unread ${unreadConversationsCount}`, badge: unreadConversationsCount },
              { id: 'leads', label: 'Leads', badge: leadsConversationsCount },
              { id: 'customers', label: 'Customers' },
            ].map((pill) => {
              const isActive = filterPill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilterPill(pill.id as any)}
                  className={cn(
                    'py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1',
                    isActive
                      ? 'border-[#009F50] text-[#009F50] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  )}
                >
                  <span>{pill.label}</span>
                  {pill.id === 'leads' && pill.badge !== undefined && (
                    <span className="text-[10px] px-1.5 py-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {pill.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable Conversation Thread Rows */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No conversations match this view
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setInboxTab('conversations');
                    }}
                    className={cn(
                      'px-3.5 py-3 transition-all cursor-pointer relative group flex items-start gap-3 border-l-[3px]',
                      isSelected
                        ? 'bg-[#E8F8EF]/65 dark:bg-emerald-950/30 border-l-[#009F50]'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-l-transparent'
                    )}
                  >
                    {/* Customer Avatar */}
                    <div className="relative size-10 shrink-0">
                      <Avatar className="size-10 border border-slate-200/70 dark:border-slate-700">
                        <AvatarFallback
                          className={cn(
                            'text-xs font-bold',
                            isSelected
                              ? 'bg-[#009F50] text-white'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          )}
                        >
                          {getInitials(conv.customerName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Customer Name + Inline Channel Icon + Timestamp + Snippet + Unread Count */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {conv.customerName}
                          </span>
                          <ChannelIcon channel={conv.channel} className="size-3.5 shrink-0" />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {conv.displayTime || formatTime(conv.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="size-4.5 min-w-[18px] px-1 rounded-full bg-[#009F50] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER COLUMN CARD: ACTIVE CONVERSATION / LIVE RADAR (6 Cols) ── */}
        <div className="md:col-span-8 lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {inboxTab === 'conversations' ? (
            !selectedConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900">
                <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <MessageSquare className="size-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No conversations yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  When customers reach out via WhatsApp, Website Live Chat, SMS, or Email, their messages and inquiries will appear here in real time.
                </p>
              </div>
            ) : (
            <>
              {/* Center Thread Header (Screenshot Parity) */}
              <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 border border-slate-200/80 dark:border-slate-700">
                    <AvatarFallback className="text-xs font-bold bg-[#E8F8EF] text-[#009F50]">
                      {getInitials(selectedConversation.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedConversation.customerName}
                      </h3>
                      <Badge className="text-[10px] bg-[#E8F8EF] text-[#009F50] hover:bg-[#E8F8EF] border-none font-semibold py-0 h-4.5 px-2 rounded-md">
                        {selectedConversation.leadStatusBadge || 'New Lead'}
                      </Badge>
                      {selectedConversation.status === 'closed' && (
                        <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold py-0 h-4">
                          Closed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-slate-400" />
                        {selectedConversation.customerPhone || '+91 98765 43210'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        {selectedConversation.address || 'Delhi, India'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Thread Actions: Call | Schedule | Mark Closed | Convert to Customer */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(
                        `Calling ${selectedConversation.customerName} (${
                          selectedConversation.customerPhone || '+91 98765 43210'
                        })`
                      )
                    }
                    title="Call customer"
                    className="size-8 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <Phone className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCloseConversation(selectedConversation)}
                    title={selectedConversation.status === 'closed' ? 'Reopen' : 'Mark closed'}
                    className="h-8 px-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {selectedConversation.status === 'closed' ? (
                      <>
                        <RotateCcw className="size-3" /> Reopen
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3" /> Mark closed
                      </>
                    )}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleConvertToCustomer(selectedConversation)}
                    className="h-8 px-3 text-xs font-bold rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white shadow-xs"
                  >
                    {selectedConversation.leadStatusBadge === 'Customer'
                      ? 'Customer ✓'
                      : 'Convert to Customer'}
                  </Button>
                </div>
              </div>

              {/* Sub-Navigation Tabs (Chat | Customer Details | Notes | Orders | Appointments | Tickets) */}
              <div className="bg-slate-50/60 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-4">
                  {[
                    { id: 'chat', label: 'Chat' },
                    { id: 'details', label: 'Customer Details' },
                    { id: 'notes', label: `Notes (${(conversationNotes[selectedConversation.id]?.length || 0) + 2})` },
                    { id: 'orders', label: 'Orders (1)' },
                    { id: 'appointments', label: 'Appointments (1)' },
                    { id: 'tickets', label: 'Tickets (1)' },
                  ].map((tab) => {
                    const active = centerSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCenterSubTab(tab.id as any)}
                        className={cn(
                          'py-2 border-b-2 transition-all whitespace-nowrap text-[11px]',
                          active
                            ? 'border-[#009F50] text-[#009F50] font-bold'
                            : 'border-transparent hover:text-slate-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiReply}
                  className="text-[11px] font-bold text-[#009F50] hover:underline flex items-center gap-1 py-1 shrink-0"
                >
                  <Sparkles className="size-3" /> AI Reply
                </button>
              </div>

              {/* Center Sub-Tab Content */}
              {centerSubTab === 'chat' ? (
                <ScrollArea className="flex-1 min-h-0 px-4 py-3 bg-white dark:bg-slate-900">
                  <div className="w-full space-y-3.5">
                    {/* Centered Today Pill Divider */}
                    <div className="flex items-center justify-center my-1">
                      <span className="px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500">
                        Today
                      </span>
                    </div>

                    {selectedConversation.messages.map((msg) => {
                      const isCustomer = msg.sender === 'customer';
                      const isAi = msg.sender === 'ai';
                      const isInternal = msg.sender === 'system' || (msg as any).isInternal;

                      if (isInternal) {
                        return (
                          <div key={msg.id} className="flex flex-col items-center my-1.5 w-full">
                            <div className="w-full max-w-[88%] p-3 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 shadow-2xs">
                              <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] text-amber-800 dark:text-amber-300">
                                <StickyNote className="size-3.5" />
                                <span>Internal Team Note</span>
                                <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 ml-auto">
                                  {msg.timestamp || 'Today'} • Visible to team only
                                </span>
                              </div>
                              <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={cn('flex flex-col', isCustomer ? 'items-start' : 'items-end')}
                        >
                          <div
                            className={cn(
                              'p-3 rounded-2xl text-xs max-w-[82%] leading-relaxed shadow-2xs whitespace-pre-line',
                              isCustomer
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                                : 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100 border border-[#009F50]/15 rounded-tr-xs'
                            )}
                          >
                            {/* Rich Photo Attachment Card (Screenshot Parity: Split AC Unit Photo) */}
                            {msg.imageAttachment && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <div className="h-28 w-56 sm:w-64 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-3 relative">
                                  {/* Stylized Split AC Unit Illustration */}
                                  <div className="w-44 h-14 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs flex flex-col justify-between p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">
                                        INVERTER SPLIT AC
                                      </span>
                                      <span className="px-1 py-0.2 rounded bg-emerald-50 text-[#009F50] font-mono text-[9px] font-bold">
                                        24°C
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-600" />
                                  </div>
                                  <span className="text-[10px] text-slate-500 mt-1.5 font-medium">
                                    {msg.imageAttachment.label || 'Attached Photo'}
                                  </span>
                                </div>
                              </div>
                            )}

                            <p>{msg.content}</p>

                            {/* ── IN-CHAT INTERACTIVE PACKAGE CARDS ── */}
                            {msg.packageCards && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2 border-t border-[#009F50]/20">
                                {msg.packageCards.map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className={cn(
                                      'p-2.5 rounded-xl border text-center transition-all bg-white dark:bg-slate-900 relative shadow-2xs flex flex-col justify-between',
                                      pkg.isPopular
                                        ? 'border-[#009F50] ring-1 ring-[#009F50]'
                                        : 'border-slate-200 dark:border-slate-800'
                                    )}
                                  >
                                    {pkg.isPopular && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#009F50] text-white absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        Most Popular
                                      </span>
                                    )}
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                                        {pkg.name}
                                      </div>
                                      <div className="text-sm font-extrabold text-[#009F50] mt-0.5">
                                        {pkg.price}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {pkg.duration}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleSelectPackage(pkg)}
                                      className="mt-2 w-full py-1 text-[11px] font-bold rounded-lg border border-[#009F50] text-[#009F50] hover:bg-[#009F50] hover:text-white transition-colors"
                                    >
                                      Select
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ── IN-CHAT SCHEDULE CONFIRMATION CHIPS ── */}
                            {msg.confirmationCard && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-[#009F50]/20">
                                {msg.confirmationCard.actions.map((chip) => (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() => handleConfirmChip(chip)}
                                    className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-[#009F50]/40 text-[#009F50] hover:bg-[#009F50] hover:text-white transition-all shadow-2xs"
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                            <span>{msg.timestamp}</span>
                            {!isCustomer && (
                              <CheckCheck className="size-3 text-[#009F50] inline" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messageEndRef} />
                  </div>
                </ScrollArea>
              ) : centerSubTab === 'details' ? (
                <ScrollArea className="flex-1 min-h-0 p-5">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Contact Record</h4>
                        <Button size="sm" variant="outline" onClick={() => setCurrentView('leads')} className="h-7 text-xs rounded-xl">
                          Open in Leads &amp; CRM
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{selectedConversation.customerName}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{selectedConversation.customerPhone || '+91 98765 43210'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {selectedConversation.customerEmail || `${selectedConversation.customerName.toLowerCase().replace(/\s+/g, '.')}@email.com`}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Address</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{selectedConversation.address || 'Primary Service Area'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : centerSubTab === 'notes' ? (
                <ScrollArea className="flex-1 min-h-0 p-5">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Internal Team Notes</h4>
                      <div className="flex gap-2">
                        <Input
                          value={centerNoteInput}
                          onChange={(e) => setCenterNoteInput(e.target.value)}
                          placeholder="Add an internal note for this customer..."
                          className="h-9 text-xs rounded-xl"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!centerNoteInput.trim()) return;
                            const next = {
                              id: `note_${Date.now()}`,
                              text: centerNoteInput.trim(),
                              author: auth.user?.name || 'You',
                              date: 'Just now',
                            };
                            setConversationNotes((prev) => ({
                              ...prev,
                              [selectedConversation.id]: [next, ...(prev[selectedConversation.id] || [])],
                            }));
                            setCenterNoteInput('');
                            toast.success('Internal note added');
                          }}
                          className="h-9 rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold"
                        >
                          Save Note
                        </Button>
                      </div>
                      <div className="space-y-2 pt-2">
                        {[
                          ...(conversationNotes[selectedConversation.id] || []),
                          { id: 'n1', text: 'Customer prefers morning appointment slots (9 AM – 11 AM).', author: 'Team', date: 'Apr 15, 2025' },
                          { id: 'n2', text: 'Looking for annual maintenance after service.', author: 'Team', date: 'Apr 12, 2025' },
                        ].map((n) => (
                          <div key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{n.text}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">{n.date} • {n.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : centerSubTab === 'orders' ? (
                <ScrollArea className="flex-1 min-h-0 p-5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Orders &amp; Estimates</h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCenterSubTab('chat');
                          setMessageInput(`Hi ${selectedConversation.customerName.split(' ')[0]}, here is your service estimate for the requested package. Let me know to confirm!`);
                        }}
                        className="h-8 text-xs font-bold rounded-xl bg-[#009F50] text-white"
                      >
                        Send Estimate in Chat
                      </Button>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">Order #ORD-1042 — AC Servicing &amp; Deep Clean</div>
                        <div className="text-slate-500 mt-0.5">Total: ₹{(selectedConversation.totalSpent || 3999).toLocaleString()}</div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px]">Completed</Badge>
                    </div>
                  </div>
                </ScrollArea>
              ) : centerSubTab === 'appointments' ? (
                <ScrollArea className="flex-1 min-h-0 p-5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Appointments</h4>
                      <Button
                        size="sm"
                        onClick={() => setCurrentView('scheduling')}
                        className="h-8 text-xs font-bold rounded-xl bg-[#009F50] text-white"
                      >
                        Schedule in Appointments
                      </Button>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">Tomorrow at 10:00 AM</div>
                        <div className="text-slate-500 mt-0.5">Service Visit • {selectedConversation.customerName}</div>
                      </div>
                      <Badge className="bg-[#E8F8EF] text-[#009F50] border-none text-[10px]">Scheduled</Badge>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="flex-1 min-h-0 p-5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Linked Support Tickets</h4>
                      <Button
                        size="sm"
                        onClick={() => setCurrentView('helpCenter')}
                        className="h-8 text-xs font-bold rounded-xl bg-[#009F50] text-white"
                      >
                        Open Tickets &amp; Support
                      </Button>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">Support Inquiry — {selectedConversation.customerName}</div>
                        <div className="text-slate-500 mt-0.5">Channel: {selectedConversation.channel}</div>
                      </div>
                      <Badge className="bg-[#E8F8EF] text-[#009F50] border-none text-[10px]">Active</Badge>
                    </div>
                  </div>
                </ScrollArea>
              )}

              {/* Bottom Composer Toolbar & Input (Screenshot Parity: Reply | Internal Note + Send) */}
              <div className="px-4 pt-2 pb-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
                <div className="w-full space-y-2">
                  {/* Top Composer Mode Tabs: Reply | Internal Note */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setComposerMode('reply')}
                        className={cn(
                          'pb-2 text-xs font-semibold border-b-2 transition-colors',
                          composerMode === 'reply'
                            ? 'border-[#009F50] text-[#009F50] font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode('internal')}
                        className={cn(
                          'pb-2 text-xs font-semibold border-b-2 transition-colors',
                          composerMode === 'internal'
                            ? 'border-amber-500 text-amber-600 font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                      >
                        Internal Note
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTemplates((prev) => !prev)}
                      className="pb-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <FileText className="size-3.5" /> Templates
                    </button>
                  </div>

                  {showTemplates && (
                    <div className="flex items-center gap-1.5 flex-wrap pb-1">
                      {[
                        { label: 'Booking Confirmed', text: `Hi ${selectedConversation.customerName.split(' ')[0]}! Your appointment with ${businessName} is confirmed for tomorrow at 10:00 AM.` },
                        { label: 'Share Quote', text: `Hi ${selectedConversation.customerName.split(' ')[0]}! Here is your customized AC service estimate from ${businessName}.` },
                        { label: 'Reschedule Options', text: `No problem! We have open slots tomorrow at 10:00 AM or 2:00 PM. Which time works best for you?` },
                        { label: 'Review Request', text: `Thank you for choosing ${businessName}! If you loved your service today, we'd really appreciate a quick Google review.` },
                      ].map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => {
                            setMessageInput(tpl.text);
                            setShowTemplates(false);
                          }}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#E8F8EF] text-[#009F50] hover:bg-[#009F50] hover:text-white transition-colors"
                        >
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Input + Bottom Action Row */}
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        composerMode === 'internal'
                          ? 'Add internal note for team...'
                          : 'Type a message...'
                      }
                      className="w-full text-xs bg-transparent focus:outline-none resize-none py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <button
                          type="button"
                          onClick={() => setMessageInput((prev) => `${prev} 😊`)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          title="Insert emoji"
                        >
                          <Smile className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info('Attachment picker opened')}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          title="Attach file"
                        >
                          <Paperclip className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info('Image gallery opened')}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          title="Attach image"
                        >
                          <ImageIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTemplates((prev) => !prev)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          title="Quick replies"
                        >
                          <Zap className="size-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="h-8 px-4 rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Send className="size-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
            )
          ) : inboxTab === 'visitors' ? (
            /* ── LIVE ENGAGE VISITOR RADAR (Integrated in Inbox) ── */
            <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
              {/* Header Strip */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Radio className="size-5 text-emerald-500 animate-pulse" /> Live Website Visitor Radar
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Active visitors browsing your digital presence in real time. Engage them before they leave.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    3 Online Now
                  </Badge>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Real-Time Telemetry Active • 28 Active Visitors
                  </span>
                </div>
              </div>

              {/* Telemetry 5-Card Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    Active Live Visitors
                    <User className="size-3.5 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    28
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center"><TrendingUp className="size-3 inline" />+14%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">vs yesterday peak</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    In Active Chat
                    <MessageSquare className="size-3.5 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    6
                    <span className="text-[10px] text-teal-600 font-bold">5 AI / 1 Human</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">21.4% engagement</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    High Intent Lurkers
                    <Flame className="size-3.5 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    9
                    <span className="text-[10px] text-rose-600 font-bold">Cart/Booking</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Requires nudge</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    Avg Session Time
                    <Timer className="size-3.5 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    3m 42s
                    <span className="text-[10px] text-emerald-600 font-bold">+22s</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Benchmark 2m 15s</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    Trigger Conversion
                    <Zap className="size-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    34.2%
                    <span className="text-[10px] text-teal-600 font-bold">18 booked</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Past 7 days</div>
                </div>
              </div>

              {/* Sub-Tabs & Filters Strip */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVisitorSubTab('all')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                        visitorSubTab === 'all'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                      )}
                    >
                      Live Stream <span className="text-[10px] opacity-80">28</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorSubTab('high_intent')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                        visitorSubTab === 'high_intent'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                      )}
                    >
                      <Flame className="size-3 text-rose-500" /> High Intent <span className="text-[10px] opacity-80">9</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorSubTab('chatting')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                        visitorSubTab === 'chatting'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                      )}
                    >
                      <MessageSquare className="size-3 text-teal-500" /> Chatting <span className="text-[10px] opacity-80">6</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorSubTab('idle')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                        visitorSubTab === 'idle'
                          ? 'bg-teal-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                      )}
                    >
                      Idle / Bounced <span className="text-[10px] opacity-80">13</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live Sync 1s
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="size-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search active visitors by IP, city, or page..."
                      className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl"
                    />
                  </div>
                  <select
                    value={visitorDeviceFilter}
                    onChange={(e) => setVisitorDeviceFilter(e.target.value as any)}
                    className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Devices</option>
                    <option value="desktop">Desktop Only</option>
                    <option value="mobile">Mobile iOS / Android</option>
                  </select>
                  <select
                    value={visitorReferralFilter}
                    onChange={(e) => setVisitorReferralFilter(e.target.value as any)}
                    className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Referrals</option>
                    <option value="maps">Tucson Maps (GBP)</option>
                    <option value="organic">Google Organic</option>
                    <option value="instagram">Instagram Ads</option>
                    <option value="direct">Direct URL</option>
                  </select>
                </div>
              </div>

              {/* Visitor Stream Feed Cards */}
              <div className="space-y-2.5">
                {LIVE_VISITORS_DATA.filter((vis) => {
                  if (visitorSubTab === 'high_intent' && vis.status !== 'high_intent' && vis.status !== 'stalled') return false;
                  if (visitorSubTab === 'chatting' && vis.status !== 'chatting') return false;
                  if (visitorSubTab === 'idle' && vis.status !== 'idle' && vis.status !== 'browsing') return false;
                  if (visitorDeviceFilter !== 'all' && vis.deviceCategory !== visitorDeviceFilter) return false;
                  if (visitorReferralFilter !== 'all' && vis.referralCategory !== visitorReferralFilter) return false;
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return vis.name.toLowerCase().includes(q) || vis.location.toLowerCase().includes(q) || vis.page.toLowerCase().includes(q);
                  }
                  return true;
                }).map((vis) => {
                  const isSelected = selectedVisitorId === vis.id;
                  return (
                    <div
                      key={vis.id}
                      onClick={() => setSelectedVisitorId(vis.id)}
                      className={cn(
                        'p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4',
                        isSelected
                          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 flex items-center justify-center font-bold text-xs">
                            {vis.shortId}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{vis.name}</span>
                            <Badge
                              className={cn(
                                'text-[10px] font-bold border-none',
                                vis.status === 'stalled'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50'
                                  : vis.status === 'high_intent'
                                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50'
                              )}
                            >
                              {vis.statusLabel}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              {vis.intent}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            Viewing <span className="font-semibold text-slate-800 dark:text-slate-200">{vis.page}</span> • {vis.duration}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{vis.location}</span>
                            <span>•</span>
                            <span>{vis.device}</span>
                            <span>•</span>
                            <span className="text-teal-600 font-medium">{vis.referral}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConversationId('conv_visitor');
                          setInboxTab('conversations');
                          toast.success(`Engaged with ${vis.name}`);
                        }}
                        className="h-8 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0"
                      >
                        Engage with Chat
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Real-Time Keystroke Telemetry Preview */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Keyboard className="size-4 text-teal-600" /> Real-Time Keystroke Telemetry Preview
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live Keystroke Mirror
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>"{selectedVisitor.currentKeystroke || 'Listening for live visitor keystrokes on page...'}"</span>
                  <span className="w-1.5 h-3.5 bg-teal-600 animate-pulse inline-block" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Suggested 1-Click Instant Replies:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(selectedVisitor.suggestedReplies || [
                      'Yes! We bring 100% plant-based Eco-Cert supplies safe for hardwood & pets.',
                      'All equipment and gentle organic solutions are fully included at no extra fee.'
                    ]).map((reply, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedConversationId('conv_visitor');
                          setInboxTab('conversations');
                          setMessageInput(reply);
                          toast.success('Inserted reply into chat composer');
                        }}
                        className="text-left p-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 text-xs transition-colors truncate"
                      >
                        • "{reply}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Proactive Trigger Rules Engine */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Proactive Radar Trigger Rules</h4>
                    <p className="text-[11px] text-slate-500">Automated conversion triggers executed by BGOS AI Receptionist</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold text-teal-600">3 Rules Active</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Cart/Booking Hesitation</span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-500">Dwell &gt; 40s on booking → Urgency availability nudge</p>
                    <span className="text-[10px] text-teal-600 font-semibold">14 conversions today</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">High-Value Calculator</span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-500">Quote &gt; $250 → Audio chime alert to live agent</p>
                    <span className="text-[10px] text-teal-600 font-semibold">9 alerts dispatched</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Repeat Visitor Welcome</span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-500">Visits &gt; 2 without booking → 10% welcome coupon</p>
                    <span className="text-[10px] text-teal-600 font-semibold">22 offers delivered</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── TICKETS TRIAGE (Integrated in Inbox) ── */
            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Ticket className="size-5 text-teal-600" /> Customer Support Tickets
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Actionable tickets generated from conversations and forms.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-teal-50 text-teal-700 font-bold">
                  5 Open Tickets
                </Badge>
              </div>

              <div className="space-y-3">
                {[
                  { id: 't_1', title: 'Booking Request #104', customer: 'Sarah Johnson', priority: 'High', status: 'Open' },
                  { id: 't_2', title: 'Quote Request #103', customer: 'John Miller', priority: 'Normal', status: 'Open' },
                  { id: 't_3', title: 'Reschedule Request #102', customer: 'David Wilson', priority: 'Normal', status: 'In Progress' },
                  { id: 't_4', title: 'General Inquiry #101', customer: 'Priya Singh', priority: 'Normal', status: 'Solved' },
                  { id: 't_5', title: 'Billing Question #100', customer: 'Neha Patel', priority: 'Low', status: 'Solved' },
                ].map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{ticket.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Customer: <span className="font-semibold text-slate-700 dark:text-slate-300">{ticket.customer}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {ticket.priority}
                      </Badge>
                      <Badge className="text-[10px] bg-teal-50 text-teal-700">
                        {ticket.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN CARD: CONTACT 360 & QUICK ACTIONS (3 Cols) ── */}
        <div className="hidden lg:flex lg:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex-col min-h-0 overflow-hidden">
          {inboxTab === 'visitors' ? (
            /* ── VISITOR DOSSIER & PROACTIVE CO-PILOT TAKEOVER PANEL ── */
            <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-y-auto p-4 space-y-4">
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-[#E8F8EF] text-[#009F50] flex items-center justify-center font-black text-sm">
                    #{selectedVisitor.shortId}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedVisitor.name}</h3>
                      <Badge className="text-[9px] bg-[#E8F8EF] text-[#009F50] font-semibold border-none">
                        Returning Lead
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">{selectedVisitor.provider} • IP: {selectedVisitor.ip}</p>
                  </div>
                </div>
              </div>

              {/* 3 Quick Meta Stat Badges */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-center border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Duration</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedVisitor.duration.split(' ')[0]}</span>
                </div>
                <div className="flex flex-col border-x border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">Lead Score</span>
                  <span className="text-xs font-bold text-[#009F50]">{selectedVisitor.intentScore} / 100</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Est. Value</span>
                  <span className="text-xs font-bold text-[#009F50]">${selectedVisitor.quoteEstimate}.00</span>
                </div>
              </div>

              {/* Real-Time Journey Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Journey Timeline</span>
                  <span className="text-[10px] font-semibold text-[#009F50]">Active Stream</span>
                </div>
                <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {selectedVisitor.timeline.map((step, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span
                        className={cn(
                          'absolute -left-4 top-1 size-2 rounded-full border-2 border-white dark:border-slate-900',
                          step.isCurrent ? 'bg-rose-500 animate-ping' : 'bg-[#009F50]'
                        )}
                      />
                      <span
                        className={cn(
                          'absolute -left-4 top-1 size-2 rounded-full border-2 border-white dark:border-slate-900',
                          step.isCurrent ? 'bg-rose-500' : 'bg-[#009F50]'
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <span className={cn('font-bold text-[11px]', step.isCurrent ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                          {step.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{step.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Proactive Nudge Box */}
              <div className="p-3 rounded-2xl bg-[#E8F8EF]/70 dark:bg-emerald-950/40 border border-[#009F50]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#009F50]" /> AI Nudge Recommended
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[#009F50]">
                    {selectedVisitor.aiNudge.rule}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs italic text-slate-700 dark:text-slate-300 shadow-2xs border border-[#009F50]/15">
                  "{selectedVisitor.aiNudge.message}"
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setNudgeSent((prev) => ({ ...prev, [selectedVisitor.id]: true }));
                      toast.success(`AI Nudge dispatched to ${selectedVisitor.name}!`);
                    }}
                    className="flex-1 h-8 text-xs font-bold rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white"
                  >
                    {nudgeSent[selectedVisitor.id] ? 'Nudge Dispatched ✓' : 'Dispatch AI Nudge'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info('Opened nudge template editor')}
                    className="h-8 text-xs font-semibold rounded-xl"
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {/* Instant Human Takeover */}
              <Button
                onClick={() => {
                  setSelectedConversationId('conv_visitor');
                  setInboxTab('conversations');
                  toast.success(`Instant human takeover initiated with ${selectedVisitor.name}`);
                }}
                className="w-full h-10 rounded-xl font-bold bg-[#009F50] hover:bg-[#008A45] text-white flex items-center justify-center gap-2 shadow-sm"
              >
                <Radio className="size-4 animate-pulse" /> Instant Human Takeover (Join As Agent)
              </Button>
            </div>
          ) : !selectedConversation ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
              Select a conversation to inspect customer dossier and history
            </div>
          ) : (
            <ConversationDetailPanel
              conversation={selectedConversation}
              customerContext={customerContext}
              contextLoading={contextLoading}
              onToggleAssign={handleToggleAssign}
              assignBusy={assignBusy}
              onToggleAiHandled={handleToggleAiHandled}
              onCreateBooking={() => {
                toast.success(`Opening Appointments for ${selectedConversation.customerName}`);
                setCurrentView('scheduling');
              }}
              onCreateQuote={() => {
                setCenterSubTab('chat');
                setComposerMode('reply');
                setMessageInput(`Hi ${selectedConversation.customerName.split(' ')[0]}, here is your personalized service estimate from ${businessName}. Please reply to confirm your preferred slot!`);
                toast.success(`Estimate drafted for ${selectedConversation.customerName}`);
              }}
              onCreateForm={() => {
                toast.success(`Opening Form Builder for ${selectedConversation.customerName}`);
                setCurrentView('formBuilder');
              }}
              onCreateTicket={() => {
                toast.success(`Opening Tickets & Support for ${selectedConversation.customerName}`);
                setCurrentView('helpCenter');
              }}
              onViewInCrm={() => {
                setCurrentView('leads');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { OmnichannelView as BgosOmnichannelInbox };
export default OmnichannelView;
