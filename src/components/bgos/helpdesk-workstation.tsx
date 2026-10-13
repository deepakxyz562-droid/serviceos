'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Send,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as PriorityArrow,
  Check,
  CheckCheck,
  MoreHorizontal,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Zap,
  Sparkles,
  UserPlus,
  ClipboardList,
  MessageCircle,
  Clock,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';

export interface HelpdeskAttachment {
  id: string;
  label: string;
  type: 'ac_unit' | 'ac_label';
}

export interface HelpdeskMessage {
  id: string;
  sender: 'customer' | 'agent' | 'note';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  channel: 'WhatsApp' | 'Email' | 'SMS';
  attachments?: HelpdeskAttachment[];
}

export interface RelatedAppointment {
  id: string;
  date: string;
  timeRange: string;
  status: 'Scheduled' | 'Completed';
  technicianName: string;
  technicianAvatar?: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Waiting' | 'Resolved' | 'Closed';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerAvatar: string;
  createdAtLabel: string;
  updatedAgoLabel: string;
  timeAgo: string;
  assigneeName: string;
  assigneeAvatar: string;
  dueDate: string;
  tags: string[];
  aiSuggestedReply: string;
  appointments: RelatedAppointment[];
  messages: HelpdeskMessage[];
}

const PRIYA_AVATAR =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80';
const AGENT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80';
const TECH_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80';

const INITIAL_TICKETS: HelpdeskTicket[] = [
  {
    id: 'tk_1245',
    ticketNumber: '#1245',
    subject: 'AC not cooling properly',
    description:
      'Hi, my AC is not cooling properly. There is some strange noise and the airflow is very low. Can you send a technician tomorrow morning?',
    category: 'AC Service',
    priority: 'High',
    status: 'Open',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'priya.sharma@gmail.com',
    customerAddress: '123 Green Park, Delhi, India',
    customerAvatar: PRIYA_AVATAR,
    createdAtLabel: 'Oct 7, 2026, 10:24 AM',
    updatedAgoLabel: '2 hours ago',
    timeAgo: '2h ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 8, 2026, 10:00 AM',
    tags: ['AC Service', 'Repair', 'Urgent'],
    aiSuggestedReply:
      'Hi Priya! Technician Amit Singh is confirmed for tomorrow, Oct 8 at 10:00 AM and will carry a refrigerant pressure gauge to inspect the gas level.',
    appointments: [
      {
        id: 'apt_1',
        date: 'Oct 8, 2026',
        timeRange: '10:00 AM – 11:00 AM',
        status: 'Scheduled',
        technicianName: 'Amit Singh',
        technicianAvatar: TECH_AVATAR,
      },
    ],
    messages: [
      {
        id: 'm_1',
        sender: 'customer',
        senderName: 'Priya Sharma',
        senderAvatar: PRIYA_AVATAR,
        content:
          'Hi, my AC is not cooling properly. There is some strange noise and the airflow is very low. Can you send a technician tomorrow morning?',
        timestamp: '10:24 AM',
        channel: 'WhatsApp',
      },
      {
        id: 'm_2',
        sender: 'agent',
        senderName: 'Rahul Kumar',
        senderAvatar: TECH_AVATAR,
        content:
          'Hi Priya! 👋\nThank you for reaching out. We can definitely send a technician tomorrow morning. Can you please confirm your address and preferred time?',
        timestamp: '10:28 AM',
        channel: 'WhatsApp',
      },
      {
        id: 'm_3',
        sender: 'customer',
        senderName: 'Priya Sharma',
        senderAvatar: PRIYA_AVATAR,
        content:
          'Sure, my address is 123 Green Park, Delhi. Preferred time is 10:00 AM. Please make sure to check the gas level also.',
        timestamp: '10:32 AM',
        channel: 'WhatsApp',
        attachments: [
          { id: 'att_1', label: 'Split AC Indoor Unit', type: 'ac_unit' },
          { id: 'att_2', label: 'Compressor Rating Plate', type: 'ac_label' },
        ],
      },
      {
        id: 'm_4',
        sender: 'agent',
        senderName: 'Rahul Kumar',
        senderAvatar: TECH_AVATAR,
        content:
          "Great! I've scheduled a technician for tomorrow at 10:00 AM. You'll receive a confirmation shortly.",
        timestamp: '10:34 AM',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1244',
    ticketNumber: '#1244',
    subject: 'Installation query',
    description: 'Need wall bracket installation quote for a new 1.5 ton inverter split AC.',
    category: 'Installation',
    priority: 'Medium',
    status: 'In Progress',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98111 22334',
    customerEmail: 'rahul.verma@gmail.com',
    customerAddress: '45 Vasant Kunj, Delhi, India',
    customerAvatar: TECH_AVATAR,
    createdAtLabel: 'Oct 7, 2026, 08:15 AM',
    updatedAgoLabel: '5 hours ago',
    timeAgo: '5h ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 8, 2026, 02:00 PM',
    tags: ['Installation', 'Quote'],
    aiSuggestedReply:
      'Hi Rahul! Standard split AC installation including copper pipe kit inspection is ₹1,499. Would you like to book a slot for tomorrow afternoon?',
    appointments: [],
    messages: [
      {
        id: 'm_1244_1',
        sender: 'customer',
        senderName: 'Rahul Verma',
        senderAvatar: TECH_AVATAR,
        content:
          'Hi team, what are the charges for installing a new 1.5 ton split AC on the second floor?',
        timestamp: '08:15 AM',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1243',
    ticketNumber: '#1243',
    subject: 'Billing issue',
    description: 'GST invoice number needs to be updated on yesterday service receipt.',
    category: 'Billing',
    priority: 'High',
    status: 'Open',
    customerName: 'Sneha Kapoor',
    customerPhone: '+91 98222 33445',
    customerEmail: 'sneha.kapoor@gmail.com',
    customerAddress: '88 Hauz Khas, Delhi, India',
    customerAvatar: AGENT_AVATAR,
    createdAtLabel: 'Oct 6, 2026, 04:10 PM',
    updatedAgoLabel: '1 day ago',
    timeAgo: '1d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 8, 2026, 05:00 PM',
    tags: ['Billing', 'GST'],
    aiSuggestedReply:
      'Hi Sneha, we have updated your company GSTIN on Invoice #INV-1243 and emailed the revised PDF.',
    appointments: [],
    messages: [
      {
        id: 'm_1243_1',
        sender: 'customer',
        senderName: 'Sneha Kapoor',
        senderAvatar: AGENT_AVATAR,
        content: 'Please add our company GST number to the invoice from yesterday.',
        timestamp: 'Yesterday',
        channel: 'Email',
      },
    ],
  },
  {
    id: 'tk_1242',
    ticketNumber: '#1242',
    subject: 'Service reschedule',
    description: 'Move annual maintenance visit from Saturday morning to Sunday 11 AM.',
    category: 'Reschedule',
    priority: 'Low',
    status: 'Waiting',
    customerName: 'Amit Singh',
    customerPhone: '+91 98333 44556',
    customerEmail: 'amit.singh@gmail.com',
    customerAddress: '19 Saket, Delhi, India',
    customerAvatar: TECH_AVATAR,
    createdAtLabel: 'Oct 6, 2026, 01:00 PM',
    updatedAgoLabel: '1 day ago',
    timeAgo: '1d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 9, 2026, 11:00 AM',
    tags: ['Reschedule', 'AMC'],
    aiSuggestedReply:
      'Hi Amit, your AMC visit has been moved to Sunday at 11:00 AM as requested.',
    appointments: [],
    messages: [
      {
        id: 'm_1242_1',
        sender: 'customer',
        senderName: 'Amit Singh',
        senderAvatar: TECH_AVATAR,
        content: 'Can we move my AC servicing to Sunday at 11 AM?',
        timestamp: '1d ago',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1241',
    ticketNumber: '#1241',
    subject: 'General inquiry',
    description: 'Checking availability for deep home cleaning and sofa shampooing.',
    category: 'General',
    priority: 'Medium',
    status: 'Open',
    customerName: 'Neha Gupta',
    customerPhone: '+91 98444 55667',
    customerEmail: 'neha.gupta@gmail.com',
    customerAddress: 'Sector 18, Noida, India',
    customerAvatar: PRIYA_AVATAR,
    createdAtLabel: 'Oct 5, 2026, 03:40 PM',
    updatedAgoLabel: '2 days ago',
    timeAgo: '2d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 9, 2026, 04:00 PM',
    tags: ['Inquiry'],
    aiSuggestedReply:
      'Hi Neha! We have slots open this Friday and Saturday for 3BHK deep cleaning.',
    appointments: [],
    messages: [
      {
        id: 'm_1241_1',
        sender: 'customer',
        senderName: 'Neha Gupta',
        senderAvatar: PRIYA_AVATAR,
        content: 'Do you also provide eco-friendly kitchen degreasing in Noida?',
        timestamp: '2d ago',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1240',
    ticketNumber: '#1240',
    subject: 'Payment not reflecting',
    description: 'UPI payment completed via Razorpay link but receipt still shows pending.',
    category: 'Billing',
    priority: 'High',
    status: 'In Progress',
    customerName: 'Vikram Patel',
    customerPhone: '+91 98555 66778',
    customerEmail: 'vikram.patel@gmail.com',
    customerAddress: 'DLF Phase 3, Gurgaon, India',
    customerAvatar: TECH_AVATAR,
    createdAtLabel: 'Oct 5, 2026, 11:20 AM',
    updatedAgoLabel: '2 days ago',
    timeAgo: '2d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 8, 2026, 06:00 PM',
    tags: ['Billing', 'Payment'],
    aiSuggestedReply:
      'Hi Vikram, we have reconciled your UPI transaction ID and marked your invoice as Paid.',
    appointments: [],
    messages: [
      {
        id: 'm_1240_1',
        sender: 'customer',
        senderName: 'Vikram Patel',
        senderAvatar: TECH_AVATAR,
        content: 'I paid ₹2,400 via UPI an hour ago, please check the status.',
        timestamp: '2d ago',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1239',
    ticketNumber: '#1239',
    subject: 'Appointment cancellation',
    description: 'Travelling out of station this week, need to cancel Thursday slot.',
    category: 'General',
    priority: 'Low',
    status: 'Resolved',
    customerName: 'Ananya Rao',
    customerPhone: '+91 98666 77889',
    customerEmail: 'ananya.rao@gmail.com',
    customerAddress: 'Greater Kailash, Delhi, India',
    customerAvatar: AGENT_AVATAR,
    createdAtLabel: 'Oct 4, 2026, 05:00 PM',
    updatedAgoLabel: '3 days ago',
    timeAgo: '3d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 7, 2026, 12:00 PM',
    tags: ['Cancellation'],
    aiSuggestedReply:
      'Hi Ananya, your Thursday booking has been cancelled with zero cancellation fee.',
    appointments: [],
    messages: [
      {
        id: 'm_1239_1',
        sender: 'customer',
        senderName: 'Ananya Rao',
        senderAvatar: AGENT_AVATAR,
        content: 'Please cancel my Thursday appointment as I am travelling.',
        timestamp: '3d ago',
        channel: 'WhatsApp',
      },
    ],
  },
  {
    id: 'tk_1238',
    ticketNumber: '#1238',
    subject: 'Quote request',
    description: 'Annual maintenance contract quote for 6 office split ACs.',
    category: 'AC Service',
    priority: 'Medium',
    status: 'Open',
    customerName: 'Suresh Mehta',
    customerPhone: '+91 98777 88990',
    customerEmail: 'suresh.mehta@gmail.com',
    customerAddress: 'Connaught Place, Delhi, India',
    customerAvatar: TECH_AVATAR,
    createdAtLabel: 'Oct 4, 2026, 09:45 AM',
    updatedAgoLabel: '3 days ago',
    timeAgo: '3d ago',
    assigneeName: 'Rahul Kumar',
    assigneeAvatar: TECH_AVATAR,
    dueDate: 'Oct 10, 2026, 03:00 PM',
    tags: ['Quote', 'Commercial'],
    aiSuggestedReply:
      'Hi Suresh! We have prepared a commercial AMC quote for 6 split ACs with quarterly wet servicing.',
    appointments: [],
    messages: [
      {
        id: 'm_1238_1',
        sender: 'customer',
        senderName: 'Suresh Mehta',
        senderAvatar: TECH_AVATAR,
        content: 'Could you share an annual AMC quote for 6 split ACs in our CP office?',
        timestamp: '3d ago',
        channel: 'Email',
      },
    ],
  },
];

type StatusFilterPill = 'All' | 'Open' | 'In Progress' | 'Waiting' | 'Resolved' | 'Closed';
type CenterTab = 'conversation' | 'notes' | 'customer' | 'activity';
type ComposerTab = 'reply' | 'note' | 'ai';
type RelatedTab = 'appointments' | 'other_tickets';

export function HelpCenterView() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const [tickets, setTickets] = useState<HelpdeskTicket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('tk_1245');
  const [checkedTicketIds, setCheckedTicketIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilterPill>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [centerTab, setCenterTab] = useState<CenterTab>('conversation');
  const [composerTab, setComposerTab] = useState<ComposerTab>('reply');
  const [selectedChannel, setSelectedChannel] = useState<'WhatsApp' | 'Email' | 'SMS'>('WhatsApp');
  const [messageInput, setMessageInput] = useState('');

  const [relatedTab, setRelatedTab] = useState<RelatedTab>('appointments');
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Create Ticket Modal state
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('AC Service');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [newDescription, setNewDescription] = useState('');

  // Optional background API hydration while keeping the 8 canonical tickets
  useEffect(() => {
    let isMounted = true;
    async function fetchSupportTickets() {
      try {
        const res = await fetch('/api/support/tickets?limit=20');
        if (res.ok && isMounted) {
          await res.json();
        }
      } catch {
        // fallback to canonical seed tickets
      }
    }
    fetchSupportTickets();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusPills: { label: StatusFilterPill; count: number }[] = [
    { label: 'All', count: 12 },
    { label: 'Open', count: 5 },
    { label: 'In Progress', count: 3 },
    { label: 'Waiting', count: 2 },
    { label: 'Resolved', count: 2 },
    { label: 'Closed', count: 0 },
  ];

  const toggleTicketCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUpdateSelectedTicket = (patch: Partial<HelpdeskTicket>) => {
    if (!selectedTicket) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...patch } : t))
    );
  };

  const handleMarkInProgress = () => {
    if (!selectedTicket) return;
    const nextStatus: HelpdeskTicket['status'] =
      selectedTicket.status === 'In Progress' ? 'Resolved' : 'In Progress';
    handleUpdateSelectedTicket({ status: nextStatus });
    toast.success(`Ticket ${selectedTicket.ticketNumber} marked as ${nextStatus}`);
  };

  const handleUseAiToReply = () => {
    if (!selectedTicket) return;
    setComposerTab('reply');
    setMessageInput(selectedTicket.aiSuggestedReply);
    toast.success('AI reply draft inserted into composer');
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedTicket) return;
    const text = messageInput.trim();
    setMessageInput('');

    const newMsg: HelpdeskMessage = {
      id: `msg_${Date.now()}`,
      sender: composerTab === 'note' ? 'note' : 'agent',
      senderName: composerTab === 'note' ? 'Internal Note' : selectedTicket.assigneeName,
      senderAvatar: TECH_AVATAR,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: selectedChannel,
    };

    handleUpdateSelectedTicket({
      messages: [...selectedTicket.messages, newMsg],
      updatedAgoLabel: 'Just now',
    });

    toast.success(
      composerTab === 'note' ? 'Internal note added to ticket' : `Reply sent via ${selectedChannel}`
    );
  };

  const handleAddTag = () => {
    if (!newTagInput.trim() || !selectedTicket) return;
    const tag = newTagInput.trim();
    if (!selectedTicket.tags.includes(tag)) {
      handleUpdateSelectedTicket({ tags: [...selectedTicket.tags, tag] });
    }
    setNewTagInput('');
    setAddingTag(false);
  };

  const handleCreateNewTicket = () => {
    if (!newSubject.trim() || !newCustomer.trim()) {
      toast.error('Please enter a ticket subject and customer name');
      return;
    }

    const nextNum = `#${1246 + tickets.length - 8}`;
    const created: HelpdeskTicket = {
      id: `tk_${Date.now()}`,
      ticketNumber: nextNum,
      subject: newSubject.trim(),
      description: newDescription.trim() || newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: 'Open',
      customerName: newCustomer.trim(),
      customerPhone: newPhone.trim() || '+91 98765 43210',
      customerEmail: `${newCustomer.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      customerAddress: 'New Delhi, India',
      customerAvatar: PRIYA_AVATAR,
      createdAtLabel: 'Just now',
      updatedAgoLabel: 'Just now',
      timeAgo: 'Just now',
      assigneeName: 'Rahul Kumar',
      assigneeAvatar: TECH_AVATAR,
      dueDate: 'Tomorrow, 10:00 AM',
      tags: [newCategory],
      aiSuggestedReply: `Hi ${newCustomer.trim()}, thank you for contacting support! We are reviewing your request regarding "${newSubject.trim()}".`,
      appointments: [],
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'customer',
          senderName: newCustomer.trim(),
          senderAvatar: PRIYA_AVATAR,
          content: newDescription.trim() || newSubject.trim(),
          timestamp: 'Just now',
          channel: 'WhatsApp',
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
    toast.success(`Ticket ${nextNum} created`);
  };

  const renderPriorityBadge = (priority: HelpdeskTicket['priority']) => {
    if (priority === 'High') {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
          <PriorityArrow className="size-3 stroke-[2.5]" />
          <span>High</span>
        </span>
      );
    }
    if (priority === 'Medium') {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
          <PriorityArrow className="size-3 stroke-[2.5]" />
          <span>Medium</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EF] px-2 py-0.5 text-[11px] font-semibold text-[#009F50]">
        <span className="size-1.5 rounded-full bg-[#009F50]" />
        <span>Low</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        {/* 1. TOP PAGE HEADER */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tickets &amp; Support
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage customer support tickets and issues.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateTicketOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-[#009F50] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#008A45] sm:self-auto"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>New Ticket</span>
          </button>
        </div>

        {/* 2. STATUS FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-2">
          {statusPills.map((pill) => {
            const active = statusFilter === pill.label;
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setStatusFilter(pill.label)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#009F50] text-white shadow-2xs'
                    : 'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. MAIN 3-COLUMN WORKSTATION GRID */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* COLUMN 1: LEFT TICKET QUEUE LIST */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs lg:col-span-3">
            <div>
              {/* Search & Filter Row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-3 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#009F50] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Filter tickets"
                  onClick={() => setStatusFilter('All')}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                >
                  <Filter className="size-3.5" />
                </button>
              </div>

              {/* Ticket Queue Items */}
              <div className="mt-3 divide-y divide-slate-100">
                {filteredTickets.map((ticket) => {
                  const isSelected = ticket.id === selectedTicket.id;
                  const isChecked = checkedTicketIds.includes(ticket.id);
                  return (
                    <div
                      key={ticket.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTicketId(ticket.id);
                        }
                      }}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-3 transition ${
                        isSelected
                          ? 'border-l-4 border-l-[#009F50] bg-[#E8F8EF]/65'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={`Select ticket ${ticket.ticketNumber}`}
                        onClick={(e) => toggleTicketCheck(ticket.id, e)}
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                          isChecked
                            ? 'border-[#009F50] bg-[#009F50] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="size-2.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900">
                            {ticket.ticketNumber}
                          </span>
                          {renderPriorityBadge(ticket.priority)}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                          {ticket.subject}
                        </p>
                        <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate">{ticket.customerName}</span>
                          <span className="shrink-0 text-slate-400">{ticket.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination Footer */}
            <div className="mt-4 flex items-center justify-center gap-1 border-t border-slate-100 pt-3">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex size-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                    currentPage === page
                      ? 'bg-[#009F50] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-50"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          {/* COLUMN 2: CENTER TICKET CONVERSATION & COMPOSER */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-6">
            {/* Ticket Header */}
            <div>
              <div className="p-5 pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
                      <PriorityArrow className="size-3 stroke-[2.5]" />
                      <span>{selectedTicket.priority} Priority</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkInProgress}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                    >
                      <span>
                        {selectedTicket.status === 'In Progress'
                          ? 'Mark as Resolved'
                          : 'Mark as In Progress'}
                      </span>
                      <ChevronDown className="size-3.5 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      aria-label="More ticket actions"
                      className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                </div>

                <h2 className="mt-2 text-lg font-bold text-slate-900">
                  {selectedTicket.subject}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Created {selectedTicket.createdAtLabel} • Updated{' '}
                  {selectedTicket.updatedAgoLabel}
                </p>

                {/* 4 Horizontal Underline Sub-Tabs */}
                <div className="mt-4 flex items-center gap-6 border-b border-slate-100">
                  {(
                    [
                      { id: 'conversation', label: 'Conversation' },
                      { id: 'notes', label: 'Internal Notes' },
                      { id: 'customer', label: 'Customer Details' },
                      { id: 'activity', label: 'Activity' },
                    ] as const
                  ).map((t) => {
                    const active = centerTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCenterTab(t.id)}
                        className={`border-b-2 pb-2.5 text-xs font-semibold transition ${
                          active
                            ? 'border-[#009F50] text-[#009F50]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversation Thread Content */}
              <div className="space-y-4 p-5">
                {centerTab === 'conversation' &&
                  selectedTicket.messages.map((msg) => {
                    if (msg.sender === 'customer') {
                      return (
                        <div key={msg.id} className="flex items-start gap-3">
                          <img
                            src={msg.senderAvatar || PRIYA_AVATAR}
                            alt={msg.senderName}
                            className="size-8 shrink-0 rounded-full object-cover"
                          />
                          <div className="max-w-[85%] space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="flex size-4 items-center justify-center rounded-full bg-[#009F50] text-white">
                                <MessageCircle className="size-2.5 fill-current" />
                              </span>
                              <span className="font-bold text-slate-900">
                                {msg.senderName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {msg.timestamp}
                              </span>
                            </div>

                            <div className="rounded-2xl rounded-tl-xs bg-slate-100/90 px-4 py-2.5 text-xs leading-relaxed text-slate-800">
                              {msg.content}
                            </div>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2.5 pt-1">
                                {msg.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className="group relative h-20 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs"
                                  >
                                    {att.type === 'ac_unit' ? (
                                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-2 text-center">
                                        <div className="h-7 w-20 rounded-md border border-slate-300 bg-white shadow-2xs" />
                                        <span className="mt-1.5 text-[10px] font-medium text-slate-600">
                                          {att.label}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex h-full w-full flex-col justify-between bg-slate-200/80 p-2">
                                        <div className="space-y-1 rounded-xs border border-slate-300 bg-white p-1">
                                          <div className="h-1 w-12 bg-slate-400" />
                                          <div className="h-1 w-16 bg-slate-300" />
                                          <div className="h-1 w-10 bg-slate-300" />
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-600">
                                          {att.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex items-start justify-end gap-2.5">
                        <div className="flex max-w-[82%] flex-col items-end space-y-1">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>{msg.timestamp}</span>
                            <CheckCheck className="size-3.5 text-[#009F50]" />
                          </div>
                          <div
                            className={`whitespace-pre-line rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs leading-relaxed ${
                              msg.sender === 'note'
                                ? 'border border-amber-200 bg-amber-50 text-amber-900'
                                : 'bg-[#E8F8EF] text-slate-800'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                        <img
                          src={msg.senderAvatar || TECH_AVATAR}
                          alt={msg.senderName}
                          className="size-7 shrink-0 rounded-full object-cover"
                        />
                      </div>
                    );
                  })}

                {centerTab === 'notes' && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
                    <p className="font-semibold">Technician Dispatch Note</p>
                    <p className="mt-1 text-amber-800">
                      Carry R32 refrigerant canister and digital manifold gauge for Priya Sharma&apos;s
                      10:00 AM visit in Green Park.
                    </p>
                  </div>
                )}

                {centerTab === 'customer' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{selectedTicket.customerName}</p>
                    <p className="mt-1">{selectedTicket.customerAddress}</p>
                    <p className="mt-0.5 text-slate-500">
                      {selectedTicket.customerPhone} • {selectedTicket.customerEmail}
                    </p>
                  </div>
                )}

                {centerTab === 'activity' && (
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-[#009F50]" />
                      <span>Ticket {selectedTicket.ticketNumber} created via WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-[#009F50]" />
                      <span>Assigned to {selectedTicket.assigneeName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Reply Composer */}
            <div className="border-t border-slate-100 p-4">
              {/* Composer Mode Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setComposerTab('reply')}
                    className={`border-b-2 pb-1.5 text-xs font-semibold transition ${
                      composerTab === 'reply'
                        ? 'border-[#009F50] text-[#009F50]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerTab('note')}
                    className={`border-b-2 pb-1.5 text-xs font-semibold transition ${
                      composerTab === 'note'
                        ? 'border-[#009F50] text-[#009F50]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Note
                  </button>
                  <button
                    type="button"
                    onClick={handleUseAiToReply}
                    className={`inline-flex items-center gap-1 border-b-2 pb-1.5 text-xs font-semibold transition ${
                      composerTab === 'ai'
                        ? 'border-[#009F50] text-[#009F50]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sparkles className="size-3 text-slate-400" />
                    <span>AI Assist</span>
                  </button>
                </div>

                {/* Channel Selector */}
                <div className="relative inline-flex items-center">
                  <span className="pointer-events-none absolute left-2.5 flex size-4 items-center justify-center rounded-full bg-[#009F50] text-white">
                    <MessageCircle className="size-2.5 fill-current" />
                  </span>
                  <select
                    aria-label="Reply channel"
                    value={selectedChannel}
                    onChange={(e) =>
                      setSelectedChannel(e.target.value as 'WhatsApp' | 'Email' | 'SMS')
                    }
                    className="appearance-none rounded-xl border border-slate-200 bg-white py-1 pr-7 pl-8 text-xs font-medium text-slate-700 focus:border-[#009F50] focus:outline-hidden"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Message Input */}
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 focus-within:border-[#009F50] focus-within:bg-white">
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
                  placeholder="Type a message..."
                  className="w-full resize-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                />

                <div className="mt-2 flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      type="button"
                      aria-label="Insert emoji"
                      className="hover:text-slate-600"
                    >
                      <Smile className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Attach file"
                      className="hover:text-slate-600"
                    >
                      <Paperclip className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Attach image"
                      className="hover:text-slate-600"
                    >
                      <ImageIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleUseAiToReply}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#009F50]"
                    >
                      <Zap className="size-3.5" />
                      <span>Use AI to reply</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="inline-flex items-center justify-center rounded-xl bg-[#009F50] px-5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#008A45]"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: RIGHT CUSTOMER, TICKET DETAILS, RELATED & QUICK ACTIONS */}
          <div className="space-y-4 lg:col-span-3">
            {/* CARD 1: Customer */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Customer</h3>
                <button
                  type="button"
                  onClick={() => setCurrentView('leads')}
                  className="text-[11px] font-semibold text-[#009F50] hover:underline"
                >
                  View in CRM →
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <img
                  src={selectedTicket.customerAvatar}
                  alt={selectedTicket.customerName}
                  className="size-11 rounded-full object-cover"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {selectedTicket.customerName}
                  </span>
                  <span className="rounded-full bg-[#E8F8EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#009F50]">
                    Customer
                  </span>
                </div>
              </div>

              <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Phone className="size-3.5 text-slate-400" />
                  <span>{selectedTicket.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="size-3.5 text-slate-400" />
                  <span>{selectedTicket.customerEmail}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="size-3.5 text-slate-400" />
                  <span>{selectedTicket.customerAddress}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('customers')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(`${selectedTicket.customerName} synced to CRM`)}
                  className="rounded-xl border border-[#009F50] bg-white px-3 py-2 text-xs font-semibold text-[#009F50] transition hover:bg-[#E8F8EF]/50"
                >
                  Add to CRM
                </button>
              </div>
            </section>

            {/* CARD 2: Ticket Details */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Ticket Details</h3>
                <button
                  type="button"
                  onClick={() => toast.info('Ticket fields are editable inline')}
                  className="text-[11px] font-semibold text-[#009F50] hover:underline"
                >
                  Edit
                </button>
              </div>

              <div className="mt-3.5 space-y-2.5 text-xs">
                {/* Status */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-500">Status</span>
                  <div className="relative col-span-8">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full bg-rose-500" />
                    <select
                      aria-label="Ticket Status"
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleUpdateSelectedTicket({
                          status: e.target.value as HelpdeskTicket['status'],
                        })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-6 text-xs font-medium text-slate-800 focus:border-[#009F50] focus:outline-hidden"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Priority */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-500">Priority</span>
                  <div className="relative col-span-8">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full bg-rose-500" />
                    <select
                      aria-label="Ticket Priority"
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handleUpdateSelectedTicket({
                          priority: e.target.value as HelpdeskTicket['priority'],
                        })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-6 text-xs font-medium text-slate-800 focus:border-[#009F50] focus:outline-hidden"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Category */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-500">Category</span>
                  <div className="relative col-span-8">
                    <select
                      aria-label="Ticket Category"
                      value={selectedTicket.category}
                      onChange={(e) =>
                        handleUpdateSelectedTicket({ category: e.target.value })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-2.5 text-xs font-medium text-slate-800 focus:border-[#009F50] focus:outline-hidden"
                    >
                      <option value="AC Service">AC Service</option>
                      <option value="Installation">Installation</option>
                      <option value="Billing">Billing</option>
                      <option value="Reschedule">Reschedule</option>
                      <option value="General">General</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Assigned To */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-500">Assigned To</span>
                  <div className="relative col-span-8">
                    <img
                      src={selectedTicket.assigneeAvatar}
                      alt={selectedTicket.assigneeName}
                      className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 rounded-full object-cover"
                    />
                    <select
                      aria-label="Assigned To"
                      value={selectedTicket.assigneeName}
                      onChange={(e) =>
                        handleUpdateSelectedTicket({ assigneeName: e.target.value })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-7 text-xs font-medium text-slate-800 focus:border-[#009F50] focus:outline-hidden"
                    >
                      <option value="Rahul Kumar">Rahul Kumar</option>
                      <option value="Amit Singh">Amit Singh</option>
                      <option value="Deepak Chandra">Deepak Chandra</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Due Date */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-500">Due Date</span>
                  <div className="col-span-8 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span className="truncate">{selectedTicket.dueDate}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="grid grid-cols-12 items-start gap-2 pt-1">
                  <span className="col-span-4 pt-1 text-slate-500">Tags</span>
                  <div className="col-span-8 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTicket.tags.map((tag) => {
                        const style =
                          tag === 'Urgent'
                            ? 'bg-rose-50 text-rose-600'
                            : tag === 'Repair'
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-[#E8F8EF] text-[#009F50]';
                        return (
                          <span
                            key={tag}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${style}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>

                    {addingTag ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Tag name..."
                          className="w-24 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] focus:border-[#009F50] focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="text-[11px] font-semibold text-[#009F50]"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingTag(false)}
                          className="text-slate-400"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingTag(true)}
                        className="text-[11px] font-semibold text-[#009F50] hover:underline"
                      >
                        + Add Tag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* CARD 3: Related */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900">Related</h3>

              <div className="mt-2.5 flex items-center gap-4 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setRelatedTab('appointments')}
                  className={`border-b-2 pb-2 text-xs font-semibold transition ${
                    relatedTab === 'appointments'
                      ? 'border-[#009F50] text-[#009F50]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Appointments ({selectedTicket.appointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRelatedTab('other_tickets')}
                  className={`border-b-2 pb-2 text-xs font-semibold transition ${
                    relatedTab === 'other_tickets'
                      ? 'border-[#009F50] text-[#009F50]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Other Tickets (0)
                </button>
              </div>

              <div className="mt-3">
                {relatedTab === 'appointments' && selectedTicket.appointments.length > 0 ? (
                  selectedTicket.appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F8EF] text-[#009F50]">
                            <Calendar className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{apt.date}</p>
                            <p className="text-[11px] text-slate-500">{apt.timeRange}</p>
                          </div>
                        </div>
                        <span className="rounded-md bg-[#E8F8EF] px-2 py-0.5 text-[10px] font-semibold text-[#009F50]">
                          {apt.status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5 pl-10 text-[11px] text-slate-500">
                        <span>Technician</span>
                        <span>•</span>
                        <img
                          src={apt.technicianAvatar || TECH_AVATAR}
                          alt={apt.technicianName}
                          className="size-4 rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-800">
                          {apt.technicianName}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-xs text-slate-400">No records found.</p>
                )}
              </div>
            </section>

            {/* CARD 4: Quick Actions */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900">Quick Actions</h3>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('scheduling')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Calendar className="size-3.5 text-[#009F50]" />
                  <span className="truncate">Book Appointment</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.success('Quote builder opened for Priya Sharma')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText className="size-3.5 text-[#009F50]" />
                  <span className="truncate">Create Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('formBuilder')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardList className="size-3.5 text-[#009F50]" />
                  <span className="truncate">Create Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(`${selectedTicket.customerName} added to CRM`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserPlus className="size-3.5 text-[#009F50]" />
                  <span className="truncate">Add to CRM</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* NEW TICKET DIALOG */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Ticket</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Log a new customer support ticket or service request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject *</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g., AC not cooling properly"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Priya Sharma"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs"
                >
                  <option value="AC Service">AC Service</option>
                  <option value="Installation">Installation</option>
                  <option value="Billing">Billing</option>
                  <option value="Reschedule">Reschedule</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority</Label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as 'High' | 'Medium' | 'Low')
                  }
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe the customer issue..."
                className="resize-none rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateTicketOpen(false)}
              className="h-8 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewTicket}
              className="h-8 rounded-xl bg-[#009F50] text-xs font-semibold text-white hover:bg-[#008A45]"
            >
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { HelpCenterView as BgosHelpdeskWorkstation };
export default HelpCenterView;
