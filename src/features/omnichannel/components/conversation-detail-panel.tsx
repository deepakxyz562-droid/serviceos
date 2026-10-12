'use client';

import React, { useState, type MouseEvent } from 'react';
import {
  Phone, Globe, UserCheck, Sparkles, Star, Briefcase,
  Contact as ContactIcon, ChevronRight, MessageSquare, Loader2,
  Calendar, FileText, Share2, Tag, Ticket, Send, Eye,
  Clock, CheckCircle2, AlertCircle, Plus, Copy, Check,
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
  ChannelBadge,
  getChannelMeta,
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
  onViewInCrm?: (conv: Conversation) => void;
}

export function ConversationDetailPanel({
  conversation: conv,
  customerContext,
  contextLoading,
  onToggleAssign,
  assignBusy,
  onToggleAiHandled,
  onCreateBooking,
  onCreateQuote,
  onCreateTicket,
  onViewInCrm,
}: ConversationDetailPanelProps) {
  const channelMeta = getChannelMeta(conv.channel);
  const [copied, setCopied] = useState(false);
  const [isAiHandled, setIsAiHandled] = useState(!conv.aiPaused);
  const [customTags, setCustomTags] = useState<Record<string, string[]>>({});
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [customNotes, setCustomNotes] = useState<Record<string, { text: string; date: string; author: string }[]>>({});
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteInput, setNewNoteInput] = useState('');

  React.useEffect(() => {
    setIsAiHandled(!conv.aiPaused);
  }, [conv.id, conv.aiPaused]);

  // Derived or fallback data for Customer 360 Dossier
  const totalSpent = conv.totalSpent ?? 12450;
  const bookingsCount = conv.bookingsCount ?? (customerContext?.jobs?.length || 3);
  const ratingScore = conv.rating ?? 4.8;
  const location = conv.address || 'Pune, Maharashtra';

  const activeTags = customTags[conv.id] ?? conv.tags ?? ['Residential', 'Deep Cleaning', 'VIP'];
  const activeNotes = customNotes[conv.id] ?? [
    { text: 'Prefers morning slots', date: 'Apr 15, 2025', author: 'Team' },
    { text: 'Allergic to strong chemicals', date: 'Apr 12, 2025', author: 'Team' },
  ];

  const defaultSummary = conv.aiSummary ||
    `Customer is inquiring via ${conv.channel} ("${conv.lastMessage.slice(0, 90)}${conv.lastMessage.length > 90 ? '...' : ''}"). Ready for follow-up or booking confirmation.`;

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
    toast.success(checked ? 'AI Assistant is now handling this conversation' : 'Human operator took over conversation');
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

  return (
    <ScrollArea className="flex-1 min-h-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      <div className="p-4 space-y-4">
        {/* 1. Conversation Summary Card (AI Generated) */}
        <Card className="shadow-none border-teal-200 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-teal-600" /> Conversation Summary
              </CardTitle>
              <Badge
                variant="secondary"
                className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-none font-semibold py-0 h-4"
              >
                AI Generated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {defaultSummary}
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (onCreateBooking) onCreateBooking(conv);
                else toast.success(`Initiating booking for ${conv.customerName}`);
              }}
              className="w-full h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs rounded-xl"
            >
              Create Booking
            </Button>
          </CardContent>
        </Card>

        {/* 2. Customer Profile 360 Card */}
        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Customer Profile
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  if (onViewInCrm) onViewInCrm(conv);
                  else toast.info(`Viewing ${conv.customerName} in CRM`);
                }}
                className="text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-0.5"
              >
                View in CRM &rarr;
              </button>
            </div>
          </CardHeader>

          <CardContent className="px-3.5 pb-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border-2 border-slate-100 dark:border-slate-800">
                <AvatarFallback className="text-sm font-bold bg-teal-100 text-teal-700 dark:bg-teal-950">
                  {getInitials(conv.customerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {conv.customerName}
                  </h4>
                  <Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-none font-semibold px-1.5 py-0">
                    VIP Customer
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                  <Phone className="size-3 text-slate-400 shrink-0" />
                  <span className="truncate">{conv.customerPhone || '+91 98765 43210'}</span>
                  <button type="button" onClick={copyPhone} className="hover:text-slate-800">
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="size-3 text-slate-400 shrink-0" />
                <span className="truncate">{conv.customerEmail || `${conv.customerName.toLowerCase().replace(/\s+/g, '.')}@email.com`}</span>
              </div>
              <div className="flex items-center gap-2">
                <ContactIcon className="size-3 text-slate-400 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                <Clock className="size-3 shrink-0" />
                <span>Added Apr 12, 2025</span>
              </div>
            </div>

            {/* 3 Metric Tiles (Bookings / Total Spent / Rating) */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{bookingsCount}</div>
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

            {/* Tags */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>Tags</span>
                <button
                  type="button"
                  onClick={() => setAddingTag((prev) => !prev)}
                  className="text-[10px] text-teal-600 hover:underline"
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
                    className="flex-1 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <Button size="sm" onClick={handleAddTag} className="h-6 px-2 text-[10px] bg-teal-600 text-white">
                    Add
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {activeTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>Notes</span>
                <button
                  type="button"
                  onClick={() => setAddingNote((prev) => !prev)}
                  className="text-[10px] text-teal-600 hover:underline"
                >
                  {addingNote ? 'Cancel' : '+ Add Note'}
                </button>
              </div>
              {addingNote && (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    placeholder="Write an internal note..."
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 resize-none"
                  />
                  <Button size="sm" onClick={handleAddNote} className="w-full h-7 text-[11px] bg-teal-600 text-white">
                    Save Note
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                {activeNotes.map((note, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-snug">
                      {note.text}
                    </p>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {note.date} • {note.author}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>Recent Bookings</span>
                <button
                  type="button"
                  onClick={() => onCreateBooking?.(conv)}
                  className="text-[10px] text-teal-600 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Apr 10, 2025</div>
                    <div className="text-[10px] text-muted-foreground">3BHK Deep Cleaning • ₹3,999</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Completed
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Mar 05, 2025</div>
                    <div className="text-[10px] text-muted-foreground">Sofa &amp; Carpet Cleaning • ₹2,499</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Completed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Quick Actions Card */}
        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-1">
            {[
              { label: 'Create Booking', icon: Calendar, action: () => onCreateBooking?.(conv) },
              { label: 'Send Quote', icon: FileText, action: () => onCreateQuote?.(conv) },
              { label: 'Create Ticket', icon: Ticket, action: () => onCreateTicket?.(conv) },
              {
                label: 'View in CRM',
                icon: Eye,
                action: () => {
                  if (onViewInCrm) onViewInCrm(conv);
                  else toast.info(`Viewing ${conv.customerName} in CRM`);
                },
              },
            ].map((qa) => {
              const ActionIcon = qa.icon;
              return (
                <button
                  key={qa.label}
                  type="button"
                  onClick={qa.action}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ActionIcon className="size-3.5 text-teal-600 group-hover:scale-105 transition-transform" />
                    <span>{qa.label}</span>
                  </div>
                  <ChevronRight className="size-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* 4. Channel Information Card */}
        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Channel Information
              </CardTitle>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-none font-semibold">
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Channel:</span>
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 flex items-center gap-1">
                {conv.channel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">First Message:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Apr 15, 2025</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Messages:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {conv.messages?.length || 24}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Message:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Today, 10:24 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Opted in:</span>
              <span className="font-semibold text-emerald-600">Yes</span>
            </div>
          </CardContent>
        </Card>

        {/* 5. Automation & AI Status Card */}
        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-teal-600" /> Automation &amp; AI
              </CardTitle>
              <Switch
                checked={isAiHandled}
                onCheckedChange={handleAiToggle}
                className="scale-75 data-[state=checked]:bg-teal-600"
              />
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI Status:</span>
              <span className={cn('font-semibold', isAiHandled ? 'text-emerald-600' : 'text-amber-600')}>
                {isAiHandled ? 'AI Handled' : 'Human Operator'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-reply sent:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">2 messages</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Handoff to human:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {isAiHandled ? 'No' : 'Active'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Workflow:</span>
              <span className="font-semibold text-teal-600">Booking Enquiry</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
