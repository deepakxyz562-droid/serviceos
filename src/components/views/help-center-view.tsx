'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Plus,
  Search,
  Filter,
  ArrowDown,
  ArrowUp,
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Download,
  ChevronDown,
  Check,
  Printer,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  User,
  ShieldAlert,
  MessageCircle,
  MessageSquare,
  HelpCircle,
  CheckCircle,
  Zap,
  Info,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface HelpdeskMessage {
  id: string;
  sender: 'customer' | 'agent' | 'ai' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  channel: string;
}

export interface AssociatedOrder {
  id: string;
  title: string;
  specs: string;
  amount: string;
  originalSchedule: string;
  depositStatus: string;
  assignedTech: string;
  propertyNotes: string;
}

export interface AiTriageSummary {
  confidence: string;
  slotAvailability: string;
  policyCheck: string;
  lockboxAccess: string;
  recommendedDraft: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'reschedule' | 'reclean' | 'billing' | 'escalated' | 'general';
  categoryLabel: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'pending_approval' | 'escalated' | 'solved' | 'closed';
  source: 'whatsapp' | 'google_review' | 'email' | 'phone' | 'sms';
  sourceLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerAvatar?: string;
  customerTier: string;
  customerTags: string[];
  cleaningsCount: number;
  totalSpent: number;
  avgRating: number;
  createdAt: string;
  timeAgo: string;
  slaRemaining: string;
  slaProgressPercent: number;
  firstTouchSla: string;
  channelId: string;
  assigneeName: string;
  associatedOrder?: AssociatedOrder;
  aiTriage?: AiTriageSummary;
  messages: HelpdeskMessage[];
}

// ─── Canonical Seed Data Matching Stitch Reference Design ──────────────────

const INITIAL_TICKETS: HelpdeskTicket[] = [
  {
    id: 'tk_1082',
    ticketNumber: '#TK-1082',
    subject: 'Reschedule move-out clean to Monday, May 5',
    description: 'Moving truck got delayed until Sunday night due to mechanical issues. Need to push move-out cleaning to Monday morning.',
    category: 'reschedule',
    categoryLabel: 'Reschedule',
    priority: 'high',
    status: 'in_progress',
    source: 'whatsapp',
    sourceLabel: 'WhatsApp',
    customerName: 'Emily Davis',
    customerPhone: '+1 (602) 111-2233',
    customerEmail: 'emily.davis@tucson.net',
    customerAddress: '3421 E Speedway, 85719',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    customerTier: 'Standard Tier',
    customerTags: ['Prompt Payer', 'Verified Client'],
    cleaningsCount: 3,
    totalSpent: 780,
    avgRating: 5.0,
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    timeAgo: '18m ago',
    slaRemaining: '28m left',
    slaProgressPercent: 28,
    firstTouchSla: '2m (Met)',
    channelId: '+1 (602) 111-2233',
    assigneeName: 'Deepak Chandra',
    associatedOrder: {
      id: '#ORD-4491',
      title: 'Move-out Deep Clean',
      specs: '3 Bed / 2 Bath • 1,850 sq ft',
      amount: '$280.00',
      originalSchedule: 'Sat, May 3 • 9:00 AM',
      depositStatus: 'Paid $50.00',
      assignedTech: 'Kevin Harris',
      propertyNotes: '2 indoor cats; client requires pet-safe non-toxic citrus agents. Gate lockbox code: #4912.',
    },
    aiTriage: {
      confidence: '99.4%',
      slotAvailability: 'Monday May 5 at 10:00 AM has 2 field crew leads free: Kevin Harris & Angela King.',
      policyCheck: 'Reschedule requested 72 hours prior to job (complies with Cinderella Cleaners 48h notice guarantee). $0 reschedule penalty applies.',
      lockboxAccess: 'Gate code #4912 remains identical. Key lockbox in patio planter.',
      recommendedDraft: 'Hi Emily! No worries at all — moving delays happen. We have successfully rescheduled your Move-out Deep Clean to Monday, May 5 at 10:00 AM. Technician Kevin Harris is assigned. Your $50 deposit carries over automatically. Good luck with the moving truck!',
    },
    messages: [
      {
        id: 'msg_1',
        sender: 'customer',
        senderName: 'Emily Davis',
        content: 'Hi Cinderella Cleaners team! Our moving truck got delayed until Sunday night due to mechanical issues. Can we please push our move-out cleaning from this Saturday 9:00 AM to Monday, May 5 at 10:00 AM instead? We really don\'t want to forfeit our landlord deposit!',
        timestamp: '10:14 AM (WhatsApp)',
        channel: 'whatsapp',
      },
    ],
  },
  {
    id: 'tk_1081',
    ticketNumber: '#TK-1081',
    subject: 'Streak marks on high living room windows',
    description: 'Google review triage: Technician missed upper transom panes during premium window wash.',
    category: 'reclean',
    categoryLabel: 'Reclean',
    priority: 'medium',
    status: 'open',
    source: 'google_review',
    sourceLabel: 'Google Review',
    customerName: 'Robert Kim',
    customerPhone: '+1 (520) 882-1993',
    customerEmail: 'robert.kim@gmail.com',
    customerAddress: '882 N Campbell Ave, Tucson, AZ',
    customerTier: 'Premium Tier',
    customerTags: ['Quality Audit', 'Repeat Customer'],
    cleaningsCount: 5,
    totalSpent: 1250,
    avgRating: 4.6,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    timeAgo: '1h ago',
    slaRemaining: '4h 15m left',
    slaProgressPercent: 45,
    firstTouchSla: '4m (Met)',
    channelId: 'Google Business Profile',
    assigneeName: 'Deepak Chandra',
    associatedOrder: {
      id: '#ORD-4482',
      title: 'Residential Window & Glass Detail',
      specs: 'Whole House Exterior & Transoms',
      amount: '$195.00',
      originalSchedule: 'Yesterday • 2:00 PM',
      depositStatus: 'Paid in Full',
      assignedTech: 'Marcus Vance',
      propertyNotes: 'Requires 24ft extension ladder for high vaulted living room panes.',
    },
    aiTriage: {
      confidence: '98.1%',
      slotAvailability: 'Marcus Vance is in the Campbell Ave neighborhood tomorrow at 11:30 AM for a 20m touch-up touchpoint.',
      policyCheck: 'Protected by 100% Satisfaction Guarantee. Free touch-up visit approved.',
      lockboxAccess: 'Customer works from home and will answer the door.',
      recommendedDraft: 'Hi Robert, thank you for bringing this to our attention. We take window clarity seriously. Technician Marcus will return tomorrow between 11:30 AM and 12:00 PM to re-clean the high transom panes at no charge.',
    },
    messages: [
      {
        id: 'msg_rk1',
        sender: 'customer',
        senderName: 'Robert Kim',
        content: 'Hi, the team did a solid job overall yesterday, but when the afternoon sun hit the living room today, we noticed significant streak marks on the upper transom panes that were hard to reach. Can someone touch these up?',
        timestamp: '09:20 AM (Google Business)',
        channel: 'google_review',
      },
    ],
  },
  {
    id: 'tk_1080',
    ticketNumber: '#TK-1080',
    subject: 'Request commercial invoice with tax ID',
    description: 'Accounts payable needing W-9 and updated EIN line item for monthly medical clinic sanitation.',
    category: 'billing',
    categoryLabel: 'Billing',
    priority: 'low',
    status: 'waiting_customer',
    source: 'email',
    sourceLabel: 'Email',
    customerName: 'Desert Vista Med',
    customerPhone: '+1 (520) 621-4000',
    customerEmail: 'billing@desertvistamed.org',
    customerAddress: '1500 N Wilmot Rd, Tucson, AZ',
    customerTier: 'Commercial B2B',
    customerTags: ['Net 30', 'EIN Verified'],
    cleaningsCount: 12,
    totalSpent: 4800,
    avgRating: 4.9,
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
    timeAgo: '3h ago',
    slaRemaining: '18h left',
    slaProgressPercent: 12,
    firstTouchSla: '8m (Met)',
    channelId: 'billing@desertvistamed.org',
    assigneeName: 'Deepak Chandra',
    associatedOrder: {
      id: '#ORD-4475',
      title: 'Commercial Medical Suite Janitorial',
      specs: '3,200 sq ft Weekly Sanitization',
      amount: '$650.00',
      originalSchedule: 'Monthly Recurring (Apr 2025)',
      depositStatus: 'Invoice Pending Net 30',
      assignedTech: 'Night Crew Alpha',
      propertyNotes: 'Keycard access only. Biohazard compliance certificate must be attached.',
    },
    aiTriage: {
      confidence: '99.8%',
      slotAvailability: 'Accounting team documents ready: W-9 form and Form W-9 PDF on file.',
      policyCheck: 'Commercial billing compliance verified. Standard Net-30 agreement active.',
      lockboxAccess: 'N/A — Digital invoice delivery.',
      recommendedDraft: 'Hello Desert Vista Med Accounts Payable, attached is Cinderella Cleaners signed Form W-9 along with updated Invoice #ORD-4475 displaying our Federal EIN #XX-XXXXXXX.',
    },
    messages: [
      {
        id: 'msg_dv1',
        sender: 'customer',
        senderName: 'Desert Vista Med',
        content: 'Good morning, our finance department requires an updated W-9 form and the revised invoice showing your company EIN before we can disburse payment for the April janitorial service.',
        timestamp: '07:30 AM (Email)',
        channel: 'email',
      },
    ],
  },
  {
    id: 'tk_1079',
    ticketNumber: '#TK-1079',
    subject: 'Missing keys after office cleaning visit',
    description: 'Tucson Tech Center lockbox code not replaced after night sweep. Escalated by facilities supervisor.',
    category: 'escalated',
    categoryLabel: 'Escalated',
    priority: 'urgent',
    status: 'escalated',
    source: 'phone',
    sourceLabel: 'AI Phone',
    customerName: 'Tucson Tech',
    customerPhone: '+1 (520) 555-0192',
    customerEmail: 'security@tucsontech.io',
    customerAddress: '200 S Park Ave, Tucson, AZ',
    customerTier: 'Enterprise Tier',
    customerTags: ['High Security', 'Escalated'],
    cleaningsCount: 8,
    totalSpent: 3600,
    avgRating: 4.8,
    createdAt: new Date(Date.now() - 240 * 60000).toISOString(),
    timeAgo: '4h ago',
    slaRemaining: '12m left',
    slaProgressPercent: 88,
    firstTouchSla: '1m (Met)',
    channelId: '+1 (520) 555-0192',
    assigneeName: 'Deepak Chandra',
    associatedOrder: {
      id: '#ORD-4460',
      title: 'Night Commercial Office Sweep',
      specs: '4,500 sq ft Corporate Tech Suite',
      amount: '$420.00',
      originalSchedule: 'Last Night • 10:00 PM',
      depositStatus: 'Paid in Full',
      assignedTech: 'Night Crew Lead Carlos',
      propertyNotes: 'Dual lockbox on north exterior wall. Master code scrambler required.',
    },
    aiTriage: {
      confidence: '95.2%',
      slotAvailability: 'Supervisor Carlos confirmed keys were securely locked in Exterior Box #2 instead of Box #1.',
      policyCheck: 'Security protocol breach alert. Immediate telephonic verification required.',
      lockboxAccess: 'Exterior Wall Lockbox #2 code 9814.',
      recommendedDraft: 'Hi Tucson Tech Security, Carlos from our night shift placed the master key in Lockbox #2 (West pillar) rather than Box #1. The box code is 9814. He has logged this with our operations manager.',
    },
    messages: [
      {
        id: 'msg_tt1',
        sender: 'customer',
        senderName: 'Tucson Tech Security',
        content: 'Urgent: Our morning receptionist cannot locate the suite key in Box #1. Please verify where the night crew deposited the keys after concluding at 1:30 AM.',
        timestamp: '06:15 AM (AI Voice Call Summary)',
        channel: 'phone',
      },
    ],
  },
  {
    id: 'tk_1078',
    ticketNumber: '#TK-1078',
    subject: 'Add carpet steam cleaning to tomorrow',
    description: 'Sarah Johnson requesting master bedroom carpet extraction added to regular residential maintenance.',
    category: 'reschedule',
    categoryLabel: 'VIP Addon',
    priority: 'medium',
    status: 'open',
    source: 'sms',
    sourceLabel: 'SMS',
    customerName: 'Sarah Johnson',
    customerPhone: '+1 (415) 889-2011',
    customerEmail: 'sarah.j@email.com',
    customerAddress: '123 Oak Street, Tucson, AZ',
    customerTier: 'VIP Tier',
    customerTags: ['VIP Client', 'Recurring Weekly'],
    cleaningsCount: 14,
    totalSpent: 2840,
    avgRating: 4.9,
    createdAt: new Date(Date.now() - 1440 * 60000).toISOString(),
    timeAgo: 'Yesterday',
    slaRemaining: '6h left',
    slaProgressPercent: 30,
    firstTouchSla: '3m (Met)',
    channelId: '+1 (415) 889-2011',
    assigneeName: 'Deepak Chandra',
    associatedOrder: {
      id: '#ORD-4451',
      title: 'Residential Bi-Weekly Cleaning',
      specs: '2,100 sq ft Home + Patio',
      amount: '$160.00',
      originalSchedule: 'Tomorrow • 10:00 AM',
      depositStatus: 'Card on File',
      assignedTech: 'Sarah & Lisa',
      propertyNotes: 'Gate remote #3. Prefers citrus floor polish.',
    },
    aiTriage: {
      confidence: '99.1%',
      slotAvailability: 'Truck steam extraction unit #2 is assigned to Sarah\'s van tomorrow. Extra 45 mins allocated.',
      policyCheck: 'VIP add-on discounted rate: $65 for master bedroom carpet extraction.',
      lockboxAccess: 'Front door smart lock code #2024.',
      recommendedDraft: 'Hi Sarah! We have added the Master Bedroom Carpet Steam Extraction to your appointment tomorrow for $65. The team will arrive with the extractor equipment at 10:00 AM as scheduled!',
    },
    messages: [
      {
        id: 'msg_sj1',
        sender: 'customer',
        senderName: 'Sarah Johnson',
        content: 'Hi team, would it be possible to add carpet steam cleaning for our master bedroom to tomorrow\'s regular 10 AM cleaning? My dog tracked in some mud earlier this week.',
        timestamp: 'Yesterday 04:30 PM (SMS)',
        channel: 'sms',
      },
    ],
  },
];

export function HelpCenterView() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('tk_1082');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<
    'all' | 'assigned' | 'urgent' | 'reschedule' | 'quality' | 'billing' | 'archived'
  >('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [composerMode, setComposerMode] = useState<'whatsapp' | 'internal' | 'sms'>('whatsapp');
  const [messageInput, setMessageInput] = useState('');
  const [savedTemplate, setSavedTemplate] = useState('Reschedule Confirmation');
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(42);

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState<'reschedule' | 'reclean' | 'billing' | 'escalated' | 'general'>('reschedule');
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('high');
  const [newSource, setNewSource] = useState<'whatsapp' | 'google_review' | 'email' | 'phone' | 'sms'>('whatsapp');
  const [newDescription, setNewDescription] = useState('');

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshSeconds((prev) => (prev <= 1 ? 45 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  // Filtering tickets
  const filteredTickets = tickets.filter((t) => {
    // Sub-nav tab filter
    if (activeFilterTab === 'assigned' && t.assigneeName !== 'Deepak Chandra') return false;
    if (activeFilterTab === 'urgent' && t.priority !== 'urgent' && t.priority !== 'high') return false;
    if (activeFilterTab === 'reschedule' && t.category !== 'reschedule') return false;
    if (activeFilterTab === 'quality' && t.category !== 'reclean') return false;
    if (activeFilterTab === 'billing' && t.category !== 'billing') return false;
    if (activeFilterTab === 'archived' && t.status !== 'solved' && t.status !== 'closed') return false;

    // Channel filter
    if (channelFilter !== 'all') {
      if (channelFilter === 'whatsapp' && t.source !== 'whatsapp') return false;
      if (channelFilter === 'calls' && t.source !== 'phone') return false;
      if (channelFilter === 'urgent' && t.priority !== 'urgent') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchCustomer = t.customerName.toLowerCase().includes(q);
      const matchNumber = t.ticketNumber.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      if (!matchSubject && !matchCustomer && !matchNumber && !matchDesc) return false;
    }

    return true;
  });

  // Action: 1-Click Update Schedule & Send WhatsApp
  const handleApplyResolution = () => {
    if (!selectedTicket || !selectedTicket.aiTriage) return;
    const resolutionText = selectedTicket.aiTriage.recommendedDraft;

    const newMsg: HelpdeskMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      senderName: 'Deepak Chandra',
      content: resolutionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (WhatsApp)',
      channel: 'whatsapp',
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              status: 'solved',
              messages: [...t.messages, newMsg],
              slaRemaining: 'Resolved on time',
            }
          : t
      )
    );
    toast.success('Schedule updated in Dispatch Calendar & WhatsApp confirmation dispatched to customer');
  };

  // Action: Send Message via Composer
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTicket) return;
    const content = messageInput.trim();
    setMessageInput('');

    const newMsg: HelpdeskMessage = {
      id: `msg_${Date.now()}`,
      sender: composerMode === 'internal' ? 'system' : 'agent',
      senderName: composerMode === 'internal' ? 'Private Staff Note' : 'Deepak Chandra',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: composerMode,
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              messages: [...t.messages, newMsg],
            }
          : t
      )
    );
    toast.success(composerMode === 'internal' ? 'Private staff note logged' : 'Message dispatched to customer');
  };

  // Action: Resolve Ticket
  const handleResolveTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'solved',
              slaRemaining: 'Resolved',
            }
          : t
      )
    );
    toast.success(`Ticket ${selectedTicket.ticketNumber} marked as Resolved`);
  };

  // Action: Status Change
  const handleStatusChange = (status: HelpdeskTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, status } : t))
    );
    toast.success(`Ticket status updated to ${status.replace('_', ' ')}`);
  };

  // Action: Create Ticket
  const handleCreateNewTicket = () => {
    if (!newSubject.trim() || !newCustomer.trim()) {
      toast.error('Please enter a ticket subject and customer name');
      return;
    }

    const nextNumber = `#TK-${1083 + tickets.length}`;
    const created: HelpdeskTicket = {
      id: `tk_${Date.now()}`,
      ticketNumber: nextNumber,
      subject: newSubject.trim(),
      description: newDescription.trim() || 'Customer support issue logged via Helpdesk',
      category: newCategory,
      categoryLabel: newCategory.charAt(0).toUpperCase() + newCategory.slice(1),
      priority: newPriority,
      status: 'open',
      source: newSource,
      sourceLabel: newSource === 'google_review' ? 'Google Review' : newSource.toUpperCase(),
      customerName: newCustomer.trim(),
      customerPhone: newPhone.trim() || '+1 (520) 555-0100',
      customerEmail: `${newCustomer.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      customerAddress: 'Tucson, Arizona',
      customerTier: 'Standard Tier',
      customerTags: ['New Inquiry'],
      cleaningsCount: 1,
      totalSpent: 280,
      avgRating: 5.0,
      createdAt: new Date().toISOString(),
      timeAgo: 'Just now',
      slaRemaining: '2h left',
      slaProgressPercent: 10,
      firstTouchSla: 'Pending',
      channelId: newPhone.trim() || '+1 (520) 555-0100',
      assigneeName: 'Deepak Chandra',
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'customer',
          senderName: newCustomer.trim(),
          content: newDescription.trim() || newSubject.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          channel: newSource,
        },
      ],
    };

    setTickets((prev) => [created, ...prev]);
    setSelectedTicketId(created.id);
    setCreateTicketOpen(false);
    setNewSubject('');
    setNewCustomer('');
    setNewPhone('');
    setNewDescription('');
    toast.success(`Ticket ${nextNumber} created successfully`);
  };

  // Action: Export CSV
  const handleExportCSV = () => {
    const headers = ['Ticket Number', 'Subject', 'Customer', 'Category', 'Priority', 'Status', 'Channel', 'SLA Remaining'];
    const rows = tickets.map((t) => [
      t.ticketNumber,
      `"${t.subject.replace(/"/g, '""')}"`,
      `"${t.customerName}"`,
      t.categoryLabel,
      t.priority,
      t.status,
      t.sourceLabel,
      t.slaRemaining,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bgos_tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tickets exported as CSV');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAF8FF] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 lg:p-6 select-none">
      <div className="max-w-[1720px] mx-auto space-y-5">
        {/* ═══════════════════════════════════════════════════════════════════
            1. PAGE HEADER & PRIMARY ACTIONS (Stitch Reference Parity)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Tickets &amp; Support Helpdesk
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs shadow-2xs border border-emerald-200 dark:border-emerald-800">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Copilot Triaging Active</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Manage service complaints, rescheduling requests, damage inquiries, and quality audits across all channels with automated SLA tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info('SLA policies and routing rules')}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5 text-slate-500" />
              <span>Ticket Settings</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 gap-1.5 shadow-2xs"
            >
              <Download className="size-3.5 text-slate-500" />
              <span>Export CSV</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateTicketOpen(true)}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-[#4648D4] hover:bg-[#383AC0] text-white shadow-sm gap-1.5"
            >
              <Plus className="size-4" />
              <span>Create Ticket</span>
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. 5 KPI TELEMETRY CARDS (With Sparklines & Micro-Telemetry)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Open Backlog */}
          <Card className="shadow-2xs border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Backlog</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#4648D4] dark:bg-indigo-950/60 dark:text-indigo-300">
                <Ticket className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">14</span>
              <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                <ArrowDown className="size-3" /> 18% vs wk
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-500">11 within SLA</span>
              <svg className="w-16 h-4 text-[#4648D4]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 80 20">
                <path d="M0 16 Q20 18 35 10 T70 4 T80 8" strokeLinecap="round" />
              </svg>
            </div>
          </Card>

          {/* Card 2: Unassigned */}
          <Card className="shadow-2xs border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unassigned</span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">3</span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Needs routing</span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-500">Max age: 14m</span>
              <svg className="w-16 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 80 20">
                <path d="M0 4 Q25 12 45 6 T80 14" strokeLinecap="round" />
              </svg>
            </div>
          </Card>

          {/* Card 3: Avg First Response */}
          <Card className="shadow-2xs border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg First Response</span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
                <Zap className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">4m 12s</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px] font-bold">
                AI Copilot
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-emerald-600 font-medium">Target &lt;15m (Pass)</span>
              <svg className="w-16 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 80 20">
                <path d="M0 14 Q20 4 40 8 T80 3" strokeLinecap="round" />
              </svg>
            </div>
          </Card>

          {/* Card 4: Resolution Rate */}
          <Card className="shadow-2xs border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Resolution Rate</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">94.2%</span>
              <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                <ArrowUp className="size-3" /> +5.4%
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-500">SLA target 90%</span>
              <svg className="w-16 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 80 20">
                <path d="M0 18 Q20 12 40 10 T80 2" strokeLinecap="round" />
              </svg>
            </div>
          </Card>

          {/* Card 5: CSAT Satisfaction */}
          <Card className="shadow-2xs border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">CSAT Satisfaction</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Star className="size-4 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">4.85</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-500">142 verified audits</span>
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star className="size-2.5 fill-amber-500" />
                <Star className="size-2.5 fill-amber-500" />
                <Star className="size-2.5 fill-amber-500" />
                <Star className="size-2.5 fill-amber-500" />
                <Star className="size-2.5 fill-amber-500/50" />
              </div>
            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. SUB-NAVIGATION FILTER TABS (With Counters)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 min-w-max">
            {[
              { id: 'all', label: 'All Tickets', count: tickets.length },
              { id: 'assigned', label: 'My Assigned', count: tickets.filter((t) => t.assigneeName === 'Deepak Chandra').length },
              { id: 'urgent', label: 'Urgent & Escalated', count: tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length, isUrgent: true },
              { id: 'reschedule', label: 'Reschedule Requests', count: tickets.filter((t) => t.category === 'reschedule').length },
              { id: 'quality', label: 'Quality & Complaints', count: tickets.filter((t) => t.category === 'reclean').length },
              { id: 'billing', label: 'Billing & Invoices', count: tickets.filter((t) => t.category === 'billing').length },
              { id: 'archived', label: 'Archived & Solved', count: 240 },
            ].map((tab) => {
              const isSelected = activeFilterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilterTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-[#4648D4] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                  )}
                >
                  {tab.isUrgent && <span className="size-2 rounded-full bg-rose-500" />}
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : tab.isUrgent
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-2 min-w-max text-xs text-slate-500">
            <span>
              Auto-refresh in <strong className="text-slate-800 dark:text-slate-200">{autoRefreshSeconds}s</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setAutoRefreshSeconds(45);
                toast.success('Helpdesk queue synced');
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-2xs"
              title="Sync now"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. THREE-COLUMN HELPDESK WORKSPACE (Queue Feed | Canvas | Dossier)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ─────────────────────────────────────────────────────────────
              COLUMN 1: TICKET QUEUE FEED (~3.2 Cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-2.5 bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            {/* Header with Live Counter and Actions */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Queue Feed</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  {filteredTickets.length} Live
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button type="button" className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md">
                  <SlidersHorizontal className="size-3.5" />
                </button>
                <button type="button" className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md">
                  <Filter className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by customer, ID, issue..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4648D4] border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Channel Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {[
                { id: 'all', label: 'All Channels' },
                { id: 'whatsapp', label: 'WhatsApp (6)' },
                { id: 'calls', label: 'Calls (4)' },
                { id: 'urgent', label: 'Urgent (2)' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelFilter(ch.id)}
                  className={cn(
                    'px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors',
                    channelFilter === ch.id
                      ? 'bg-indigo-50 text-[#4648D4] dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {/* Scrollable Ticket List */}
            <div className="space-y-2 mt-1 max-h-[640px] overflow-y-auto pr-0.5">
              {filteredTickets.map((ticket) => {
                const isSelected = selectedTicket.id === ticket.id;
                const isUrgent = ticket.priority === 'urgent';
                const isHigh = ticket.priority === 'high';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={cn(
                      'p-3 rounded-xl transition-all cursor-pointer relative shadow-2xs border',
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-[#4648D4] ring-1 ring-[#4648D4]/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    )}
                  >
                    {/* Active Ticket Left Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648D4] rounded-l-xl" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-[#4648D4]">
                          {ticket.ticketNumber}
                        </span>
                        {isUrgent || isHigh ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                            <Clock className="size-2.5" /> {ticket.slaRemaining}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium capitalize">
                            {ticket.priority}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ticket.timeAgo}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[9px] font-bold bg-purple-100 text-[#4648D4]">
                            {ticket.customerName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">
                          {ticket.customerName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[9px] font-bold">
                          {ticket.categoryLabel}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                        {ticket.sourceLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.info('Loading full ticket history archive')}
              className="w-full h-8 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Load 9 More Tickets
            </Button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              COLUMN 2: ACTIVE TICKET RESOLUTION WORKSTATION (~5.8 Cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 xl:col-span-6 flex flex-col gap-3.5">
            {/* Ticket Canvas Header & Metadata Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#4648D4] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-semibold flex items-center gap-1">
                    <RotateCcw className="size-3" /> {selectedTicket.categoryLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>SLA: 1h 42m remaining</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                    className="size-8 rounded-lg text-slate-500 hover:bg-slate-100"
                    title="Print Ticket"
                  >
                    <Printer className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toast.info('Additional ticket actions')}
                    className="size-8 rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleResolveTicket(selectedTicket.id)}
                    className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1.5"
                  >
                    <CheckCircle className="size-3.5" />
                    <span>Resolve</span>
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {selectedTicket.subject}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Created {selectedTicket.timeAgo} via{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedTicket.sourceLabel} Business API
                  </strong>{' '}
                  • Channel ID:{' '}
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {selectedTicket.channelId}
                  </span>
                </p>
              </div>

              {/* Status Controls Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs focus:outline-none"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting on Customer</option>
                    <option value="pending_approval">Pending Tech Approval</option>
                    <option value="escalated">Escalated</option>
                    <option value="solved">Solved</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Assignee:</span>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <Avatar className="size-4">
                      <AvatarFallback className="text-[9px] font-bold bg-[#4648D4] text-white">
                        DC
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedTicket.assigneeName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-start sm:justify-end">
                  <span className="text-slate-500 font-medium">Priority:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="capitalize">{selectedTicket.priority} Priority</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Live Conversation Stream & AI Triage */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-[#4648D4]" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Service Conversation &amp; Audit Trail
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  All events synced
                </span>
              </div>

              {/* Thread Timeline */}
              <div className="space-y-3.5">
                {/* Incoming Message from Customer */}
                {selectedTicket.messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="size-8 mt-0.5 shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-purple-100 text-[#4648D4]">
                        {selectedTicket.customerName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col max-w-[85%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedTicket.customerName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs whitespace-pre-line">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* AI Copilot Smart Triage Summary Card */}
                {selectedTicket.aiTriage && (
                  <div className="ml-11 p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                        <Sparkles className="size-3.5" />
                        <span>AI Copilot Smart Triage Summary</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
                        Triage Confidence {selectedTicket.aiTriage.confidence}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                      <p>
                        • <strong>Slot Availability:</strong> {selectedTicket.aiTriage.slotAvailability}
                      </p>
                      <p>
                        • <strong>Policy Check:</strong> {selectedTicket.aiTriage.policyCheck}
                      </p>
                      <p>
                        • <strong>Lockbox Access:</strong> {selectedTicket.aiTriage.lockboxAccess}
                      </p>
                    </div>
                  </div>
                )}

                {/* Proposed 1-Click Resolution Action Card */}
                {selectedTicket.aiTriage && (
                  <div className="ml-11 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#4648D4] uppercase tracking-wider">
                        Recommended 1-Click Resolution
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Zap className="size-3" /> Ready to Dispatch
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg text-xs text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                      &quot;{selectedTicket.aiTriage.recommendedDraft}&quot;
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyResolution}
                        className="h-8 px-3 text-xs font-bold rounded-xl bg-[#4648D4] hover:bg-[#383AC0] text-white shadow-2xs gap-1.5"
                      >
                        <Calendar className="size-3.5" />
                        <span>Update Schedule &amp; Send WhatsApp</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMessageInput(selectedTicket.aiTriage?.recommendedDraft || '');
                          setComposerMode('whatsapp');
                          toast.info('Draft loaded into composer for editing');
                        }}
                        className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      >
                        Edit Draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('Viewing field team Monday dispatch schedule')}
                        className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      >
                        View Monday Schedule
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Rich Reply Composer & Channel Modes */}
              <div className="mt-3 pt-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setComposerMode('whatsapp')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                        composerMode === 'whatsapp'
                          ? 'bg-white dark:bg-slate-900 text-[#4648D4] shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <MessageCircle className="size-3 text-emerald-500" />
                      <span>Reply via WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('internal')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                        composerMode === 'internal'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <FileText className="size-3" />
                      <span>Internal Staff Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('sms')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                        composerMode === 'sms'
                          ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <MessageSquare className="size-3 text-purple-500" />
                      <span>Send SMS</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 hidden sm:inline">Saved Template:</span>
                    <select
                      value={savedTemplate}
                      onChange={(e) => {
                        setSavedTemplate(e.target.value);
                        if (e.target.value === 'Quality Guarantee Reclean') {
                          setMessageInput('Hi! We take quality very seriously under our 100% Satisfaction Guarantee. We would be happy to send a crew lead back for a free touch-up visit.');
                        } else if (e.target.value === 'Reschedule Confirmation') {
                          setMessageInput('Hi! Your appointment has been successfully rescheduled. Your deposit carries over automatically.');
                        }
                      }}
                      className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
                    >
                      <option>Reschedule Confirmation</option>
                      <option>Quality Guarantee Reclean</option>
                      <option>Damage Inquiry Intake</option>
                      <option>Commercial Billing W-9</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
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
                        ? 'Write private note for team (not sent to customer)...'
                        : 'Type your message or press "/" for canned snippets...'
                    }
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4648D4] border border-slate-200 dark:border-slate-700 resize-none shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-400">
                    <button type="button" className="p-1 hover:text-slate-600" title="Attach file">
                      <Paperclip className="size-3.5" />
                    </button>
                    <button type="button" className="p-1 hover:text-slate-600" title="Emoji">
                      <Smile className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (messageInput.trim()) {
                          setMessageInput((prev) => prev + '\n\nThank you for choosing Cinderella Cleaners!');
                          toast.success('AI Tone Polish applied');
                        }
                      }}
                      className="p-1 hover:text-purple-600 text-purple-500"
                      title="AI Tone Polish"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                    <button type="button" className="p-1 hover:text-slate-600" title="Voice memo">
                      <Mic className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success('Draft response saved')}
                      className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="h-8 px-3.5 text-xs font-bold rounded-xl bg-[#4648D4] hover:bg-[#383AC0] text-white shadow-2xs gap-1.5"
                    >
                      <span>
                        {composerMode === 'internal'
                          ? 'Save Internal Note'
                          : composerMode === 'sms'
                          ? 'Send via SMS'
                          : 'Send via WhatsApp'}
                      </span>
                      <Send className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              COLUMN 3: CUSTOMER 360 & SERVICE CONTEXT DRAWER (~3.0 Cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-12 xl:col-span-3 flex flex-col gap-3.5">
            {/* Customer Dossier Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer Dossier
                </span>
                <button
                  type="button"
                  onClick={() => toast.info(`Viewing ${selectedTicket.customerName} in CRM profile`)}
                  className="text-xs font-semibold text-[#4648D4] hover:underline flex items-center gap-0.5"
                >
                  <span>View in CRM</span>
                  <ExternalLink className="size-3" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="size-12 rounded-xl">
                  <AvatarFallback className="text-sm font-bold bg-purple-100 text-[#4648D4] rounded-xl">
                    {selectedTicket.customerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedTicket.customerName}
                    </h3>
                    <CheckCircle className="size-3.5 text-emerald-500 fill-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Residential Client • Tucson, AZ
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                      {selectedTicket.customerTier}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                      Prompt Payer
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Contact Specs */}
              <div className="space-y-1.5 pt-1 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="size-3 text-emerald-500" /> Phone
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTicket.customerPhone}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="size-3 text-[#4648D4]" /> Email
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {selectedTicket.customerEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="size-3 text-rose-500" /> Address
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {selectedTicket.customerAddress}
                  </span>
                </div>
              </div>

              {/* Metric Triplets */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedTicket.cleaningsCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Cleanings</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-sm font-bold text-[#4648D4]">
                    ${selectedTicket.totalSpent}
                  </span>
                  <span className="text-[10px] text-slate-500">LTV Spent</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-sm font-bold text-emerald-600">
                    {selectedTicket.avgRating}
                  </span>
                  <span className="text-[10px] text-slate-500">Avg Rating</span>
                </div>
              </div>
            </div>

            {/* Associated Order / Service Details Card */}
            {selectedTicket.associatedOrder && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <FileText className="size-3.5 text-[#4648D4]" />
                    <span className="uppercase tracking-wider text-[11px] text-slate-500">
                      Associated Order
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#4648D4]">
                    {selectedTicket.associatedOrder.id}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedTicket.associatedOrder.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {selectedTicket.associatedOrder.specs}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedTicket.associatedOrder.amount}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Original Schedule:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedTicket.associatedOrder.originalSchedule}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Deposit Status:</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="size-3" /> {selectedTicket.associatedOrder.depositStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Assigned Tech:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {selectedTicket.associatedOrder.assignedTech}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Property / Entry Notes */}
                <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800 flex items-start gap-2 text-xs">
                  <Info className="size-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    <strong>Property Notes:</strong> {selectedTicket.associatedOrder.propertyNotes}
                  </p>
                </div>

                {/* 1-Click Service Action Buttons */}
                <div className="space-y-1.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success('Dispatch Calendar opened for rescheduling')}
                    className="w-full h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 gap-1.5 shadow-2xs"
                  >
                    <Calendar className="size-3.5 text-[#4648D4]" />
                    <span>Reschedule in Dispatch Calendar</span>
                  </Button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success('Store credit voucher generated')}
                      className="h-8 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 gap-1"
                    >
                      <DollarSign className="size-3 text-emerald-600" />
                      <span>Issue Credit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success('Re-clean service work order dispatched')}
                      className="h-8 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 gap-1"
                    >
                      <RotateCcw className="size-3 text-purple-600" />
                      <span>Re-clean Ticket</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* SLA Target Milestones Progress Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  SLA Target Milestones
                </span>
                <span className="font-mono text-xs font-bold text-emerald-600">In Compliance</span>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                {/* Step 1: First Touch SLA */}
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">First Touch SLA</span>
                      <span className="font-mono font-bold text-emerald-600">{selectedTicket.firstTouchSla}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Automated AI Copilot acknowledgment logged.</p>
                  </div>
                </div>

                {/* Step 2: Full Resolution SLA */}
                <div className="flex items-start gap-2.5">
                  <Clock className="size-4 text-[#4648D4] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Full Resolution SLA</span>
                      <span className="font-mono font-bold text-[#4648D4]">1h 42m Left</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-[#4648D4] h-full rounded-full transition-all"
                        style={{ width: `${selectedTicket.slaProgressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Target: Resolve before 12:15 PM today.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          5. MODAL: CREATE NEW SUPPORT TICKET
         ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Ticket className="size-5 text-[#4648D4]" />
              Create Support Ticket
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log a service complaint, rescheduling request, or customer issue into the automated SLA queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject *</Label>
              <Input
                placeholder="e.g. Reschedule deep cleaning for next Monday"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  placeholder="e.g. John Miller"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone / Channel</Label>
                <Input
                  placeholder="e.g. +1 (520) 555-0199"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full h-8 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2"
                >
                  <option value="reschedule">Reschedule</option>
                  <option value="reclean">Reclean / Quality</option>
                  <option value="billing">Billing / Invoice</option>
                  <option value="escalated">Escalated</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority</Label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full h-8 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Channel</Label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as any)}
                  className="w-full h-8 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">AI Phone</option>
                  <option value="google_review">Google Review</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Issue Details &amp; Notes</Label>
              <Textarea
                rows={3}
                placeholder="Describe the complaint, moving delay, or client issue..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateTicketOpen(false)}
              className="h-8 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewTicket}
              className="h-8 text-xs font-bold rounded-xl bg-[#4648D4] hover:bg-[#383AC0] text-white"
            >
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HelpCenterView;
