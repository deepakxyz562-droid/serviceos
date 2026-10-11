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
    id: 'conv_sarah',
    customerName: 'Sarah Johnson',
    customerPhone: '+91 98765 43210',
    customerEmail: 'sarah.johnson@email.com',
    channel: 'whatsapp',
    lastMessage: 'Great! I have checked the availability and we can schedule your 3BHK deep cleaning for Saturday, Apr 26, 2025 at 10:00 AM.',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 2,
    status: 'active',
    vipStatus: true,
    totalSpent: 12450,
    bookingsCount: 3,
    rating: 4.8,
    tags: ['Residential', 'Deep Cleaning', 'VIP'],
    address: 'Pune, Maharashtra',
    aiSummary: 'Customer is interested in booking a one-time deep cleaning service for a 3BHK apartment. Showing interest in the ₹3,999 package for Saturday morning. Ready to confirm.',
    messages: [
      {
        id: 'msg_s1',
        conversationId: 'conv_sarah',
        content: 'Hi, do you have house cleaning services?\nI am looking for a one-time deep cleaning for a 3BHK apartment.',
        sender: 'customer',
        timestamp: '10:14 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_s2',
        conversationId: 'conv_sarah',
        content: 'Yes, we provide professional house cleaning services! 🌸\n\nFor a 3BHK apartment, our deep cleaning includes:\n• Complete home cleaning\n• Kitchen & bathroom sanitization\n• Floor and surface cleaning\n• Optional extras (sofa, mattress, etc.)\n\nWould you like me to share our pricing and availability?',
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: '10:15 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_s3',
        conversationId: 'conv_sarah',
        content: 'Yes please share the pricing.',
        sender: 'customer',
        timestamp: '10:16 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_s4',
        conversationId: 'conv_sarah',
        content: 'Here are our 3BHK deep cleaning packages:',
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: '10:17 AM',
        channel: 'whatsapp',
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
      },
      {
        id: 'msg_s5',
        conversationId: 'conv_sarah',
        content: 'That looks good. I would like to book the deep clean package for this Saturday morning.',
        sender: 'customer',
        timestamp: '10:18 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_s6',
        conversationId: 'conv_sarah',
        content: 'Great! I have checked the availability and we can schedule your 3BHK deep cleaning for **Saturday, Apr 26, 2025 at 10:00 AM**.\n\nShall I confirm the booking for you?',
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: '10:19 AM',
        channel: 'whatsapp',
        confirmationCard: {
          scheduledDate: 'Saturday, Apr 26, 2025 at 10:00 AM',
          actions: ['Yes, confirm', 'Change time', 'Add special instructions'],
        },
      },
    ],
  },
  {
    id: 'conv_rahul',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul.sharma@gmail.com',
    channel: 'whatsapp',
    lastMessage: 'The total cost for a 2-hour home cleaning is $120. You will receive a confirmation email and WhatsApp reminder today in the evening.',
    lastMessageTime: new Date(Date.now() - 15 * 60000).toISOString(),
    unreadCount: 2,
    status: 'active',
    vipStatus: false,
    totalSpent: 4800,
    bookingsCount: 2,
    rating: 4.9,
    tags: ['Booking', 'Interested'],
    address: '123 Oak Street, Tucson, AZ',
    aiSummary: 'Customer inquired about booking confirmation for tomorrow 10 AM and confirmed total cost ($120). Assigned to Sarah Johnson.',
    messages: [
      {
        id: 'msg_r1',
        conversationId: 'conv_rahul',
        content: 'Hi, is my booking confirmed for tomorrow at 10 AM?',
        sender: 'customer',
        timestamp: '10:21 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_r2',
        conversationId: 'conv_rahul',
        content: 'Yes! Your appointment is confirmed for tomorrow at 10 AM.\n\nOur team member Sarah will be there at your address: 123 Oak Street, Tucson.\n\nIs there anything specific you would like us to focus on?',
        sender: 'agent',
        senderName: 'Sarah Johnson',
        timestamp: '10:22 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_r3',
        conversationId: 'conv_rahul',
        content: 'Great! Can you also confirm the total cost?',
        sender: 'customer',
        timestamp: '10:23 AM',
        channel: 'whatsapp',
      },
      {
        id: 'msg_r4',
        conversationId: 'conv_rahul',
        content: 'The total cost for a 2-hour home cleaning is $120. You will receive a confirmation email and WhatsApp reminder today in the evening.',
        sender: 'agent',
        senderName: 'Sarah Johnson',
        timestamp: '10:24 AM',
        channel: 'whatsapp',
      },
    ],
  },
  {
    id: 'conv_visitor',
    customerName: 'Website Visitor #4821',
    customerPhone: '+1 520 555 0192',
    channel: 'livechat',
    lastMessage: 'I need pricing details for deep cleaning a commercial kitchen.',
    lastMessageTime: new Date(Date.now() - 30 * 60000).toISOString(),
    unreadCount: 1,
    status: 'active',
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
    id: 'conv_priya',
    customerName: 'Priya Singh',
    customerEmail: 'priya.singh@instagram.com',
    channel: 'instagram',
    lastMessage: 'Do you offer home cleaning services in north area?',
    lastMessageTime: new Date(Date.now() - 45 * 60000).toISOString(),
    unreadCount: 3,
    status: 'active',
    tags: ['Enquiry'],
    messages: [
      {
        id: 'msg_p1',
        conversationId: 'conv_priya',
        content: 'Do you offer home cleaning services in north area?',
        sender: 'customer',
        timestamp: '09:56 AM',
        channel: 'instagram',
      },
    ],
  },
  {
    id: 'conv_john',
    customerName: 'John Miller',
    customerEmail: 'john.miller@corporate.com',
    channel: 'email',
    lastMessage: 'Can you send a quote for our office cleaning (weekly)?',
    lastMessageTime: new Date(Date.now() - 60 * 60000).toISOString(),
    unreadCount: 0,
    status: 'active',
    tags: ['Quote'],
    messages: [
      {
        id: 'msg_j1',
        conversationId: 'conv_john',
        content: 'Can you send a quote for our office cleaning (weekly)?',
        sender: 'customer',
        timestamp: '09:42 AM',
        channel: 'email',
      },
    ],
  },
  {
    id: 'conv_phone',
    customerName: '+1 555 123 4567',
    customerPhone: '+1 555 123 4567',
    channel: 'phone',
    lastMessage: 'AI Call summary available: Caller requested residential move-in clean quote for Friday.',
    lastMessageTime: new Date(Date.now() - 90 * 60000).toISOString(),
    unreadCount: 0,
    status: 'active',
    tags: ['Call'],
    messages: [
      {
        id: 'msg_ph1',
        conversationId: 'conv_phone',
        content: 'AI Call summary: Inbound call from customer requesting Friday move-in cleaning quote. Follow-up SMS estimate sent.',
        sender: 'system',
        timestamp: '09:15 AM',
        channel: 'phone',
      },
    ],
  },
  {
    id: 'conv_neha',
    customerName: 'Neha Patel',
    customerEmail: 'neha.patel@facebook.com',
    channel: 'messenger',
    lastMessage: 'Thank you! The service was great 👍',
    lastMessageTime: new Date(Date.now() - 120 * 60000).toISOString(),
    unreadCount: 0,
    status: 'closed',
    tags: ['Customer'],
    messages: [
      {
        id: 'msg_n1',
        conversationId: 'conv_neha',
        content: 'Thank you! The service was great 👍',
        sender: 'customer',
        timestamp: '08:50 AM',
        channel: 'messenger',
      },
    ],
  },
  {
    id: 'conv_michael',
    customerName: 'Michael Chen',
    customerPhone: '+1 415 889 2011',
    channel: 'sms',
    lastMessage: 'What are your weekend available slots?',
    lastMessageTime: new Date(Date.now() - 150 * 60000).toISOString(),
    unreadCount: 0,
    status: 'active',
    tags: ['SMS'],
    messages: [
      {
        id: 'msg_m1',
        conversationId: 'conv_michael',
        content: 'What are your weekend available slots?',
        sender: 'customer',
        timestamp: '08:32 AM',
        channel: 'sms',
      },
    ],
  },
  {
    id: 'conv_david',
    customerName: 'David Wilson',
    customerPhone: '+1 602 334 1120',
    channel: 'whatsapp',
    lastMessage: 'I’d like to reschedule my appointment to Monday.',
    lastMessageTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    unreadCount: 0,
    status: 'active',
    tags: ['Reschedule'],
    messages: [
      {
        id: 'msg_d1',
        conversationId: 'conv_david',
        content: 'I’d like to reschedule my appointment to Monday.',
        sender: 'customer',
        timestamp: 'Yesterday',
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
      { time: '14:02:11', title: 'Landed via Google Maps', desc: "Listing: 'Cinderella Cleaners - Catalina Foothills'" },
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
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('conv_sarah');
  const [activeChannelPill, setActiveChannelPill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [composerMode, setComposerMode] = useState<'reply' | 'internal' | 'ai' | 'template'>('reply');
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
  const [filterPill, setFilterPill] = useState<'all' | 'unread' | 'assigned' | 'ai' | 'starred'>('all');
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
        if (Array.isArray(data) && data.length > 0) {
          setConversations(data);
          if (!selectedConversationId) setSelectedConversationId(data[0].id);
        }
      }
    } catch {
      // Keep rich fallback dataset
    }
  }, [selectedConversationId]);

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
    conversations.find((c) => c.id === selectedConversationId) || conversations[0];

  // Selected live visitor
  const selectedVisitor =
    LIVE_VISITORS_DATA.find((v) => v.id === selectedVisitorId) || LIVE_VISITORS_DATA[0];

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
    if (filterPill === 'assigned' && !c.assigneeId) return false;
    if (filterPill === 'ai' && c.aiPaused) return false;

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

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    const content = messageInput.trim();
    setMessageInput('');

    const newMsg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      sender: composerMode === 'internal' ? 'system' : 'agent',
      senderName: composerMode === 'internal' ? 'Internal Note' : 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: content,
              lastMessageTime: new Date().toISOString(),
            }
          : c
      )
    );

    // Call API in background
    fetch(`${API_BASE}/conversations/${selectedConversation.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => {});
  };

  const handleToggleAssign = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAssigned = !!conv.assigneeId;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              assigneeId: isAssigned ? undefined : 'me',
              assigneeName: isAssigned ? undefined : 'You',
            }
          : c
      )
    );
    toast.success(isAssigned ? 'Unassigned' : 'Assigned to you');
  };

  const handleToggleAiHandled = (convId: string, aiPaused: boolean) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, aiPaused } : c))
    );
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
      reply = `🎉 Booking confirmed! Your 3BHK Deep Cleaning is confirmed for **Saturday, Apr 26 at 10:00 AM**. You will receive an SMS and WhatsApp reminder 24 hours prior.`;
    }

    const aiMsg: ConversationMessage = {
      id: `ai_${Date.now() + 1}`,
      conversationId: selectedConversation.id,
      content: reply,
      sender: 'ai',
      senderName: 'AI Assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedConversation.channel,
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
    <div className="flex-1 min-h-0 flex flex-col w-full bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP CHANNEL TRIAGE HEADER (Matching Reference Screenshot 2 & 3)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('dashboard')}
            className="h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 -ml-1 gap-1"
            title="Back to Dashboard"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline text-xs font-semibold">Back</span>
          </Button>
          <div className="size-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <Inbox className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Inbox</h1>
              <Badge className="text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 font-bold py-0 h-4">
                12
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden md:block">
              Manage all customer conversations from one place — Website, WhatsApp, Instagram, Facebook, Email, SMS and Phone.
            </p>
          </div>
        </div>

        {/* Circular Channel Triage Row (Matching Screenshot 2 & 3) */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto py-1">
          {[
            { id: 'all', label: 'All', badge: 12, icon: Inbox, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
            { id: 'whatsapp', label: 'WhatsApp', badge: 4, icon: MessageCircle, color: 'bg-emerald-500 text-white' },
            { id: 'livechat', label: 'Live Chat', badge: 3, icon: MessageSquare, color: 'bg-teal-600 text-white' },
            { id: 'instagram', label: 'Instagram', badge: 2, icon: Instagram, color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white' },
            { id: 'facebook', label: 'Facebook', badge: 1, icon: MessageSquare, color: 'bg-blue-600 text-white' },
            { id: 'email', label: 'Email', badge: 1, icon: Mail, color: 'bg-sky-500 text-white' },
            { id: 'sms', label: 'SMS', badge: 1, icon: MessageSquare, color: 'bg-teal-600 text-white' },
            { id: 'phone', label: 'Phone', badge: 1, icon: Phone, color: 'bg-indigo-600 text-white' },
          ].map((ch) => {
            const Icon = ch.icon;
            const isSelected = activeChannelPill === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannelPill(ch.id)}
                className={cn(
                  'relative size-9 rounded-full flex items-center justify-center transition-all hover:scale-108 shrink-0',
                  ch.color,
                  isSelected ? 'ring-2 ring-offset-2 ring-teal-600 shadow-sm' : 'opacity-85 hover:opacity-100'
                )}
                title={ch.label}
              >
                <Icon className="size-4" />
                {ch.badge > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {ch.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. WORKSTATION MAIN: 3 COLUMNS (TRIAGE | THREAD | CUSTOMER 360)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* ── LEFT COLUMN: THREAD LIST (3.5 Cols) ── */}
        <div className="md:col-span-4 lg:col-span-3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0">
          {/* 3 Top Segment Switchers: Conversations | Live Visitors | Tickets */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setInboxTab('conversations')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center',
                inboxTab === 'conversations'
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Conversations
            </button>
            <button
              type="button"
              onClick={() => setInboxTab('visitors')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1',
                inboxTab === 'visitors'
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Live Visitors
              <span className="size-4 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInboxTab('tickets')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1',
                inboxTab === 'tickets'
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              )}
            >
              Tickets
              <span className="size-4 bg-teal-100 text-teal-700 rounded-full text-[10px] flex items-center justify-center font-bold">
                5
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={() => toast.info('Advanced conversation filters')}
              className="size-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center justify-center text-slate-500"
            >
              <Filter className="size-3.5" />
            </button>
          </div>

          {/* Filter Pills: All 12 | Unread 12 | Assigned | AI | Starred */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All 12' },
              { id: 'unread', label: 'Unread 12' },
              { id: 'assigned', label: 'Assigned' },
              { id: 'ai', label: 'AI' },
              { id: 'starred', label: 'Starred' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterPill(pill.id as any)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors',
                  filterPill === pill.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Scrollable Conversation Thread Cards */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const isSelected = selectedConversation.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setInboxTab('conversations');
                    }}
                    className={cn(
                      'p-2.5 rounded-2xl transition-all cursor-pointer relative group flex items-start gap-3',
                      isSelected
                        ? 'bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    )}
                  >
                    {/* Avatar with Channel Badge Overlay */}
                    <div className="relative size-10 shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback className="text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {getInitials(conv.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-white dark:ring-slate-900 flex items-center justify-center shadow-2xs">
                        <ChannelIcon channel={conv.channel} className="size-3" />
                      </span>
                    </div>

                    {/* Metadata & Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {conv.customerName}
                          </span>
                          {conv.vipStatus && (
                            <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {conv.lastMessage}
                      </p>

                      {/* Tag Badges Row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {conv.tags?.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                        {conv.unreadCount > 0 && (
                          <span className="size-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center ml-auto">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER COLUMN: ACTIVE CONVERSATION / LIVE RADAR (5.5 Cols) ── */}
        <div className="md:col-span-8 lg:col-span-6 flex flex-col min-h-0 bg-[#F8FAFC] dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
          {inboxTab === 'conversations' ? (
            <>
              {/* Center Customer Header */}
              <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10">
                    <AvatarFallback className="text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-950">
                      {getInitials(selectedConversation.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedConversation.customerName}
                      </h3>
                      {selectedConversation.vipStatus && (
                        <Badge className="text-[10px] bg-teal-100 text-teal-700 border-none font-bold py-0 h-4">
                          VIP
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{selectedConversation.customerPhone || '+91 98765 43210'}</span>
                      <span>•</span>
                      <span className="capitalize">{selectedConversation.channel}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <span className="size-1 rounded-full bg-emerald-500" /> Last seen today at 10:24 AM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleToggleAssign(selectedConversation, e)}
                    className="h-8 text-xs font-semibold rounded-xl gap-1 border-slate-200"
                  >
                    <UserCheck className="size-3.5" />
                    {selectedConversation.assigneeId ? 'Assigned' : 'Assign'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success('Conversation marked as closed')}
                    className="h-8 text-xs font-semibold rounded-xl gap-1 border-slate-200"
                  >
                    <CheckCircle2 className="size-3.5" /> Mark closed
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setMessageInput('Hi! I noticed you are interested in our 3BHK Deep Cleaning package. Let me confirm that right away for you.');
                      setComposerMode('reply');
                    }}
                    className="h-8 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1"
                  >
                    <Sparkles className="size-3.5" /> AI Reply
                  </Button>
                </div>
              </div>

              {/* Sub-Navigation Tabs (Chat | Details | Notes | Orders | Appointments | Tickets) */}
              <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                {[
                  { id: 'chat', label: 'Chat' },
                  { id: 'details', label: 'Customer Details' },
                  { id: 'notes', label: 'Notes (2)' },
                  { id: 'orders', label: 'Orders (1)' },
                  { id: 'appointments', label: 'Appointments (1)' },
                  { id: 'tickets', label: 'Tickets (0)' },
                ].map((tab) => {
                  const active = centerSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCenterSubTab(tab.id as any)}
                      className={cn(
                        'py-2.5 border-b-2 transition-all',
                        active
                          ? 'border-teal-600 text-teal-600 font-bold'
                          : 'border-transparent hover:text-slate-900'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Chat Messages Stream */}
              <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="w-full space-y-4">
                  {selectedConversation.messages.map((msg) => {
                    const isCustomer = msg.sender === 'customer';
                    const isAi = msg.sender === 'ai';
                    return (
                      <div key={msg.id} className={cn('flex flex-col', isCustomer ? 'items-start' : 'items-end')}>
                        {/* Sender Label */}
                        {isAi && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-600 mb-1 pl-1">
                            <Sparkles className="size-3" /> AI Assistant
                          </div>
                        )}

                        <div
                          className={cn(
                            'p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-2xs whitespace-pre-line',
                            isCustomer
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 rounded-tl-xs'
                              : isAi
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 border border-teal-200 dark:border-teal-800 rounded-tr-xs'
                              : 'bg-teal-600 text-white rounded-tr-xs'
                          )}
                        >
                          <p>{msg.content}</p>

                          {/* ── IN-CHAT INTERACTIVE PACKAGE CARDS (Screenshot 3 Parity) ── */}
                          {msg.packageCards && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2 border-t border-teal-200/60 dark:border-teal-800">
                              {msg.packageCards.map((pkg) => (
                                <div
                                  key={pkg.id}
                                  className={cn(
                                    'p-2.5 rounded-xl border text-center transition-all bg-white dark:bg-slate-900 relative shadow-2xs flex flex-col justify-between',
                                    pkg.isPopular
                                      ? 'border-teal-600 ring-1 ring-teal-600'
                                      : 'border-slate-200 dark:border-slate-800'
                                  )}
                                >
                                  {pkg.isPopular && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-600 text-white absolute -top-2 left-1/2 -translate-x-1/2">
                                      Most Popular
                                    </span>
                                  )}
                                  <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                                      {pkg.name}
                                    </div>
                                    <div className="text-sm font-extrabold text-teal-600 mt-0.5">
                                      {pkg.price}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {pkg.duration}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleSelectPackage(pkg)}
                                    className="mt-2 w-full py-1 text-[11px] font-bold rounded-lg border border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white transition-colors"
                                  >
                                    Select
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── IN-CHAT SCHEDULE CONFIRMATION CHIPS (Screenshot 3 Parity) ── */}
                          {msg.confirmationCard && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-teal-200/60">
                              {msg.confirmationCard.actions.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => handleConfirmChip(chip)}
                                  className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-teal-600/40 text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-2xs"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </div>
              </ScrollArea>

              {/* Composer Toolbar & Input */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setComposerMode('reply')}
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-lg transition-colors',
                          composerMode === 'reply' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                        )}
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode('internal')}
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-lg transition-colors',
                          composerMode === 'internal' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                        )}
                      >
                        Internal Note
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast.info('Saved message macros')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <FileText className="size-3.5" /> Templates
                    </button>
                  </div>

                  <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:ring-1 focus-within:ring-teal-500">
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
                      placeholder={composerMode === 'internal' ? 'Add internal note for team...' : 'Type a message...'}
                      className="flex-1 text-xs bg-transparent focus:outline-none resize-none p-1 text-slate-900 dark:text-slate-100"
                    />

                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" className="p-1 hover:text-slate-600">
                        <Smile className="size-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-slate-600">
                        <Paperclip className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="size-8 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-transform hover:scale-105"
                      >
                        <Send className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
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
                    <User className="size-3.5 text-purple-600" />
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
                    <MessageSquare className="size-3.5 text-purple-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1.5">
                    6
                    <span className="text-[10px] text-purple-600 font-bold">5 AI / 1 Human</span>
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
                    <span className="text-[10px] text-purple-600 font-bold">18 booked</span>
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
                          ? 'bg-purple-600 text-white shadow-2xs'
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
                          ? 'bg-purple-600 text-white shadow-2xs'
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
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                      )}
                    >
                      <MessageSquare className="size-3 text-purple-500" /> Chatting <span className="text-[10px] opacity-80">6</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorSubTab('idle')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                        visitorSubTab === 'idle'
                          ? 'bg-purple-600 text-white shadow-2xs'
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

        {/* ── RIGHT COLUMN: CUSTOMER 360 DOSSIER & AUTOMATION (3 Cols) ── */}
        <div className="hidden lg:block lg:col-span-3 min-h-0 overflow-hidden">
          {inboxTab === 'visitors' ? (
            /* ── VISITOR DOSSIER & PROACTIVE CO-PILOT TAKEOVER PANEL ── */
            <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-4">
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 flex items-center justify-center font-black text-sm">
                    #{selectedVisitor.shortId}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedVisitor.name}</h3>
                      <Badge className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 font-semibold border-none">
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
                  <span className="text-xs font-bold text-emerald-600">{selectedVisitor.intentScore} / 100</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Est. Value</span>
                  <span className="text-xs font-bold text-teal-600">${selectedVisitor.quoteEstimate}.00</span>
                </div>
              </div>

              {/* Real-Time Journey Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Journey Timeline</span>
                  <span className="text-[10px] font-semibold text-teal-600">Active Stream</span>
                </div>
                <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {selectedVisitor.timeline.map((step, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span
                        className={cn(
                          'absolute -left-4 top-1 size-2 rounded-full border-2 border-white dark:border-slate-900',
                          step.isCurrent ? 'bg-rose-500 animate-ping' : 'bg-teal-500'
                        )}
                      />
                      <span
                        className={cn(
                          'absolute -left-4 top-1 size-2 rounded-full border-2 border-white dark:border-slate-900',
                          step.isCurrent ? 'bg-rose-500' : 'bg-teal-500'
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
              <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-teal-600" /> AI Nudge Recommended
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-teal-700">
                    {selectedVisitor.aiNudge.rule}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs italic text-slate-700 dark:text-slate-300 shadow-2xs border border-teal-100 dark:border-teal-900">
                  "{selectedVisitor.aiNudge.message}"
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setNudgeSent((prev) => ({ ...prev, [selectedVisitor.id]: true }));
                      toast.success(`AI Nudge dispatched to ${selectedVisitor.name}!`);
                    }}
                    className="flex-1 h-8 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
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
                className="w-full h-10 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-sm"
              >
                <Radio className="size-4 animate-pulse" /> Instant Human Takeover (Join As Agent)
              </Button>
            </div>
          ) : (
            <ConversationDetailPanel
              conversation={selectedConversation}
              customerContext={customerContext}
              contextLoading={contextLoading}
              onToggleAssign={handleToggleAssign}
              assignBusy={assignBusy}
              onToggleAiHandled={handleToggleAiHandled}
              onCreateBooking={() => toast.success(`Creating booking for ${selectedConversation.customerName}`)}
              onCreateQuote={() => toast.success(`Generating quote for ${selectedConversation.customerName}`)}
              onCreateTicket={() => toast.success(`Support ticket logged for ${selectedConversation.customerName}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
