'use client';

import React, { useState, type MouseEvent } from 'react';
import {
  Phone, Globe, UserCheck, Sparkles, Star,
  Contact as ContactIcon, ChevronRight, MessageSquare,
  Calendar, FileText, Ticket, Eye,
  Clock, Plus, Copy, Check, Mail, MessageCircle,
  MoreHorizontal, MoreVertical, MapPin, UserPlus,
  ClipboardList, Activity as ActivityIcon, StickyNote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getInitials,
} from '@/features/omnichannel/utils/omnichannel-helpers';
import type {
  Conversation,
  CustomerContext,
} from '@/features/omnichannel/types';

export interface ConversationDetailPanelProps {
  conversation: Conversation;
  customerContext: CustomerContext | null;
  contextLoading: boolean;
  showSurveyResults?: boolean;
  onShowSurveyResultsChange?: (open: boolean) => void;
  showCaseHistory?: boolean;
  onShowCaseHistoryChange?: (open: boolean) => void;
  onToggleAssign: (conv: Conversation, e: MouseEvent) => void;
  assignBusy: string | null;
  onToggleAiHandled?: (convId: string, aiPaused: boolean) => void;
  onCreateBooking?: (conv: Conversation) => void;
  onCreateQuote?: (conv: Conversation) => void;
  onCreateTicket?: (conv: Conversation) => void;
  onCreateForm?: (conv: Conversation) => void;
  onViewInCrm?: (conv: Conversation) => void;
}

const TAG_COLOR_MAP: Record<string, string> = {
  'AC Service': 'bg-[#E8F8EF] text-[#009F50] border-[#009F50]/20',
  Residential: 'bg-blue-50 text-blue-700 border-blue-200/70',
  Delhi: 'bg-slate-100 text-slate-700 border-slate-200',
  'New Lead': 'bg-amber-50 text-amber-700 border-amber-200/70',
  'Deep Cleaning': 'bg-[#E8F8EF] text-[#009F50] border-[#009F50]/20',
  VIP: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
};

export function ConversationDetailPanel({
  conversation: conv,
  customerContext,
  onToggleAiHandled,
  onCreateBooking,
  onCreateQuote,
  onCreateTicket,
  onCreateForm,
  onViewInCrm,
}: ConversationDetailPanelProps) {
  const [rightTab, setRightTab] = useState<'contact' | 'activity' | 'notes' | 'appointments'>('contact');
  const [copied, setCopied] = useState(false);
  const [isAiHandled, setIsAiHandled] = useState(!conv.aiPaused);
  const [customTags, setCustomTags] = useState<Record<string, string[]>>({});
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [customNotes, setCustomNotes] = useState<Record<string, { text: string; date: string; author: string }[]>>({});
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Editable custom fields state per conversation
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [customFieldsStore, setCustomFieldsStore] = useState<
    Record<
      string,
      {
        source: string;
        interestedIn: string;
        preferredDate: string;
        address: string;
        notes: string;
      }
    >
  >({});

  React.useEffect(() => {
    setIsAiHandled(!conv.aiPaused);
  }, [conv.id, conv.aiPaused]);

  // Derived or fallback data for Customer 360 Dossier
  const totalSpent = conv.totalSpent ?? 12450;
  const bookingsCount = conv.bookingsCount ?? (customerContext?.jobs?.length || 3);
  const ratingScore = conv.rating ?? 4.8;
  const location = conv.address || 'Delhi, India';
  const emailAddress =
    conv.customerEmail || `${conv.customerName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

  const activeTags =
    customTags[conv.id] ?? conv.tags ?? ['AC Service', 'Residential', 'Delhi', 'New Lead'];

  const activeCustomFields = customFieldsStore[conv.id] ?? {
    source: conv.customFields?.source || (conv.channel === 'whatsapp' ? 'WhatsApp' : conv.channel),
    interestedIn: conv.customFields?.interestedIn || 'AC Service',
    preferredDate: conv.customFields?.preferredDate || 'Tomorrow morning',
    address: conv.customFields?.address || '123 Green Park, Delhi',
    notes: conv.customFields?.notes || 'Looking for annual maintenance after service.',
  };

  const activeNotes = customNotes[conv.id] ?? [
    { text: 'Looking for annual maintenance after service.', date: 'Today, 10:24 AM', author: 'Team' },
    { text: 'Prefers morning slots (10:00 AM)', date: 'Apr 15, 2025', author: 'Team' },
  ];

  const defaultSummary =
    conv.aiSummary ||
    `Customer is inquiring via ${conv.channel} ("${conv.lastMessage.slice(0, 90)}${
      conv.lastMessage.length > 90 ? '...' : ''
    }"). Ready for follow-up or booking confirmation.`;

  const copyPhone = () => {
    if (conv.customerPhone) {
      navigator.clipboard?.writeText(conv.customerPhone);
      setCopied(true);
      toast.success('Phone copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAiToggle = (checked: boolean) => {
    setIsAiHandled(checked);
    const aiPaused = !checked;
    onToggleAiHandled?.(conv.id, aiPaused);
    toast.success(
      checked
        ? 'AI Assistant is now handling this conversation'
        : 'Human operator took over conversation'
    );
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!activeTags.includes(trimmed)) {
      setCustomTags((prev) => ({ ...prev, [conv.id]: [...activeTags, trimmed] }));
      toast.success(`Tag "${trimmed}" added`);
    }
    setNewTagInput('');
    setAddingTag(false);
  };

  const handleAddNote = () => {
    const trimmed = newNoteInput.trim();
    if (!trimmed) return;
    const nextNote = {
      text: trimmed,
      date: 'Just now',
      author: 'You',
    };
    setCustomNotes((prev) => ({ ...prev, [conv.id]: [nextNote, ...activeNotes] }));
    setNewNoteInput('');
    setAddingNote(false);
    toast.success('Customer note saved');
  };

  const updateCustomField = (
    field: 'source' | 'interestedIn' | 'preferredDate' | 'address' | 'notes',
    value: string
  ) => {
    setCustomFieldsStore((prev) => ({
      ...prev,
      [conv.id]: {
        ...activeCustomFields,
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* ── Top 4 Tabs: Contact | Activity | Notes | Appointments (Screenshot Parity) ── */}
      <div className="px-3 pt-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 shrink-0">
        {[
          { id: 'contact', label: 'Contact' },
          { id: 'activity', label: 'Activity' },
          { id: 'notes', label: 'Notes' },
          { id: 'appointments', label: 'Appointments' },
        ].map((tab) => {
          const isActive = rightTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRightTab(tab.id as any)}
              className={cn(
                'px-2.5 pb-2.5 pt-1 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[#009F50] text-[#009F50] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {rightTab === 'contact' ? (
          <div className="p-4 space-y-4">
            {/* ── 1. Contact Header & 4 Action Tiles (Call | WhatsApp | Email | More) ── */}
            <div className="space-y-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-12 border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
                    <AvatarFallback className="text-sm font-bold bg-[#E8F8EF] text-[#009F50]">
                      {getInitials(conv.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {conv.customerName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className="text-[10px] bg-[#E8F8EF] text-[#009F50] hover:bg-[#E8F8EF] border-none font-semibold px-2 py-0.5 rounded-md">
                        {conv.leadStatusBadge || 'New Lead'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onViewInCrm) onViewInCrm(conv);
                    else toast.info(`Opened options for ${conv.customerName}`);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Contact options"
                >
                  <MoreVertical className="size-4" />
                </button>
              </div>

              {/* Contact Info Rows */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Phone className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {conv.customerPhone || '+91 98765 43210'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyPhone}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copy phone"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-[#009F50]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="size-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {emailAddress}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="size-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-600 dark:text-slate-300">{location}</span>
                </div>
              </div>

              {/* 4 Communication Action Tiles: Call | WhatsApp | Email | More */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  {
                    label: 'Call',
                    icon: Phone,
                    action: () =>
                      toast.success(`Calling ${conv.customerName} (${conv.customerPhone || '+91 98765 43210'})`),
                  },
                  {
                    label: 'WhatsApp',
                    icon: MessageCircle,
                    action: () => toast.success(`Switched to WhatsApp channel for ${conv.customerName}`),
                  },
                  {
                    label: 'Email',
                    icon: Mail,
                    action: () => toast.success(`Opening email composer for ${emailAddress}`),
                  },
                  {
                    label: 'More',
                    icon: MoreHorizontal,
                    action: () => {
                      if (onViewInCrm) onViewInCrm(conv);
                      else toast.info(`Viewing full CRM record for ${conv.customerName}`);
                    },
                  },
                ].map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.label}
                      type="button"
                      onClick={tile.action}
                      className="py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-[#E8F8EF]/70 hover:border-[#009F50]/30 flex flex-col items-center justify-center gap-1 transition-all group"
                    >
                      <Icon className="size-4 text-[#009F50] group-hover:scale-105 transition-transform" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {tile.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. Tags Section (Screenshot Parity) ── */}
            <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Tags</span>
                <button
                  type="button"
                  onClick={() => setAddingTag((prev) => !prev)}
                  className="text-xs font-semibold text-[#009F50] hover:underline"
                >
                  {addingTag ? 'Cancel' : '+ Add Tag'}
                </button>
              </div>

              {addingTag && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="New tag..."
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#009F50]"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                    className="h-7 px-2.5 text-[11px] bg-[#009F50] hover:bg-[#008A45] text-white rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {activeTags.map((tag) => {
                  const tagColor =
                    TAG_COLOR_MAP[tag] ||
                    'bg-[#E8F8EF] text-[#009F50] border-[#009F50]/20';
                  return (
                    <span
                      key={tag}
                      className={cn(
                        'text-[11px] font-medium px-2.5 py-0.5 rounded-md border',
                        tagColor
                      )}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* ── 3. Custom Fields Section (Screenshot Parity) ── */}
            <div className="space-y-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Custom Fields
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (editingCustomFields) {
                      toast.success('Custom fields updated');
                    }
                    setEditingCustomFields((prev) => !prev);
                  }}
                  className="text-xs font-semibold text-[#009F50] hover:underline"
                >
                  {editingCustomFields ? 'Save' : 'Edit'}
                </button>
              </div>

              {editingCustomFields ? (
                <div className="space-y-2 text-xs">
                  {(
                    [
                      { key: 'source', label: 'Source' },
                      { key: 'interestedIn', label: 'Interested In' },
                      { key: 'preferredDate', label: 'Preferred Date' },
                      { key: 'address', label: 'Address' },
                      { key: 'notes', label: 'Notes' },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={activeCustomFields[item.key]}
                        onChange={(e) => updateCustomField(item.key, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0">Source</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {activeCustomFields.source}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0">Interested In</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {activeCustomFields.interestedIn}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0">Preferred Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {activeCustomFields.preferredDate}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0">Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {activeCustomFields.address}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 shrink-0">Notes</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right leading-snug max-w-[165px]">
                      {activeCustomFields.notes}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── 4. Quick Actions 2x2 Grid (Screenshot Parity) ── */}
            <div className="space-y-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Quick Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onCreateBooking) onCreateBooking(conv);
                    else toast.success(`Booking appointment for ${conv.customerName}`);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-[#E8F8EF]/60 hover:border-[#009F50]/30 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                >
                  <Calendar className="size-4 text-[#009F50] shrink-0" />
                  <span className="truncate">Book Appointment</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onCreateQuote) onCreateQuote(conv);
                    else toast.success(`Creating quote for ${conv.customerName}`);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-[#E8F8EF]/60 hover:border-[#009F50]/30 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                >
                  <FileText className="size-4 text-[#009F50] shrink-0" />
                  <span className="truncate">Create Quote</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onCreateForm) onCreateForm(conv);
                    else if (onCreateTicket) onCreateTicket(conv);
                    else toast.success(`Opening form builder for ${conv.customerName}`);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-[#E8F8EF]/60 hover:border-[#009F50]/30 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                >
                  <ClipboardList className="size-4 text-[#009F50] shrink-0" />
                  <span className="truncate">Create Form</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onViewInCrm) onViewInCrm(conv);
                    else toast.success(`${conv.customerName} synced to Leads & CRM`);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-[#E8F8EF]/60 hover:border-[#009F50]/30 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                >
                  <UserPlus className="size-4 text-[#009F50] shrink-0" />
                  <span className="truncate">Add to CRM</span>
                </button>
              </div>
            </div>

            {/* ── 5. AI Conversation Summary & Customer 360 Dossier ── */}
            <Card className="shadow-none border-[#009F50]/25 bg-gradient-to-br from-[#E8F8EF]/60 to-white dark:from-emerald-950/20 dark:to-slate-900">
              <CardHeader className="pb-2 pt-3 px-3.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#009F50]" /> Conversation Summary
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-[#E8F8EF] text-[#009F50] border-none font-semibold py-0 h-4"
                  >
                    AI Generated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3.5 pb-3.5 space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {defaultSummary}
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    if (onCreateBooking) onCreateBooking(conv);
                    else toast.success(`Initiating booking for ${conv.customerName}`);
                  }}
                  className="w-full h-8 text-xs font-bold bg-[#009F50] hover:bg-[#008A45] text-white shadow-xs rounded-xl"
                >
                  Create Booking
                </Button>
              </CardContent>
            </Card>

            {/* Customer Profile Metrics Card */}
            <Card className="shadow-none border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2 pt-3 px-3.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Customer Profile
                  </CardTitle>
                  <Badge className="text-[10px] bg-[#E8F8EF] text-[#009F50] border-none font-semibold px-1.5 py-0">
                    VIP Customer
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3.5 pb-3.5 space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {bookingsCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Bookings</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      ₹{totalSpent.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Total Spent</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-0.5">
                      {ratingScore} <Star className="size-2.5 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation & AI Status Card */}
            <Card className="shadow-none border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2 pt-3 px-3.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#009F50]" /> Automation &amp; AI
                  </CardTitle>
                  <Switch
                    checked={isAiHandled}
                    onCheckedChange={handleAiToggle}
                    className="scale-75 data-[state=checked]:bg-[#009F50]"
                  />
                </div>
              </CardHeader>
              <CardContent className="px-3.5 pb-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Status:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      isAiHandled ? 'text-[#009F50]' : 'text-amber-600'
                    )}
                  >
                    {isAiHandled ? 'AI Handled' : 'Human Operator'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Workflow:</span>
                  <span className="font-semibold text-[#009F50]">Booking Enquiry</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : rightTab === 'activity' ? (
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ActivityIcon className="size-3.5 text-[#009F50]" /> Contact Activity Timeline
            </h4>
            <div className="space-y-3 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {[
                {
                  time: 'Today, 10:25 AM',
                  title: 'Outbound reply sent via WhatsApp',
                  desc: 'Proposed tomorrow 10:00 AM slot for AC servicing.',
                },
                {
                  time: 'Today, 10:22 AM',
                  title: 'Customer uploaded photo attachment',
                  desc: 'Split AC indoor unit inspection image received.',
                },
                {
                  time: 'Today, 10:18 AM',
                  title: 'Lead captured from Google Ad click',
                  desc: 'Source: Google Search Ad • Delhi 2BHK AC Service.',
                },
              ].map((ev, i) => (
                <div key={i} className="pl-6 relative text-xs">
                  <span className="size-2 rounded-full bg-[#009F50] absolute left-1.5 top-1.5 ring-4 ring-white dark:ring-slate-900" />
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{ev.title}</div>
                  <p className="text-slate-500 mt-0.5">{ev.desc}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        ) : rightTab === 'notes' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <StickyNote className="size-3.5 text-[#009F50]" /> Contact Notes
              </h4>
              <button
                type="button"
                onClick={() => setAddingNote((prev) => !prev)}
                className="text-xs font-semibold text-[#009F50] hover:underline"
              >
                {addingNote ? 'Cancel' : '+ Add Note'}
              </button>
            </div>
            {addingNote && (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Write an internal note..."
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  className="w-full h-7 text-xs bg-[#009F50] hover:bg-[#008A45] text-white rounded-lg"
                >
                  Save Note
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {activeNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-snug">
                    {note.text}
                  </p>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {note.date} • {note.author}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#009F50]" /> Appointments
              </h4>
              <button
                type="button"
                onClick={() => onCreateBooking?.(conv)}
                className="text-xs font-semibold text-[#009F50] hover:underline"
              >
                + Book New
              </button>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#E8F8EF]/50 border border-[#009F50]/20 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Tomorrow, 10:00 AM
                  </span>
                  <Badge className="text-[10px] bg-[#E8F8EF] text-[#009F50] border-none">
                    Proposed
                  </Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  2 Split AC Servicing &amp; Cooling Inspection
                </p>
                <span className="text-[10px] text-slate-400 block">{location}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Apr 10, 2025
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-50 text-emerald-700"
                  >
                    Completed
                  </Badge>
                </div>
                <p className="text-slate-500">Home Service Visit • ₹3,999</p>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
