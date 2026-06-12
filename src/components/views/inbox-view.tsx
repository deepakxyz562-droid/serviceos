'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, Plus, Send, Phone, Clock,
  User, Tag, Flag, ArrowRightLeft, StickyNote, AtSign, MoreVertical,
  Circle, Check, CheckCheck, Smile, Paperclip, Mic,
  Hash, Archive, Trash2, X, Inbox, AlertCircle, CheckCircle2,
  CornerDownLeft, PanelRightOpen, PanelRightClose,
  Volume2, VolumeX, Pin,
  ChevronLeft, MessageCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  online: boolean;
  role: string;
}

interface ChatLabel {
  id: string;
  name: string;
  color: string;
}

interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  customerEmail?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'new' | 'assigned' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  assignedAgent?: Agent;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels: ChatLabel[];
  tags: string[];
  isTyping: boolean;
  isInternalNote?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  channel: 'whatsapp' | 'sms' | 'email' | 'webchat';
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'internal_note';
  status: 'sent' | 'delivered' | 'read';
  mentions?: string[];
  isEdited?: boolean;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_AGENTS: Agent[] = [
  { id: 'a1', name: 'Sarah Johnson', online: true, role: 'Senior Agent' },
  { id: 'a2', name: 'Mike Chen', online: true, role: 'Agent' },
  { id: 'a3', name: 'Priya Patel', online: false, role: 'Agent' },
  { id: 'a4', name: 'David Brown', online: true, role: 'Team Lead' },
  { id: 'a5', name: 'Emma Wilson', online: false, role: 'Agent' },
];

const MOCK_LABELS: ChatLabel[] = [
  { id: 'l1', name: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'l2', name: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'l3', name: 'Billing', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'l4', name: 'Support', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'l5', name: 'Sales', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', customerName: 'Alex Rivera', customerPhone: '+1 555-0101', customerEmail: 'alex@email.com',
    lastMessage: 'I need help with my recent order #4521', lastMessageTime: '2 min ago',
    unreadCount: 3, status: 'new', priority: 'high',
    labels: [MOCK_LABELS[1]], tags: ['new-customer', 'order-issue'], isTyping: false,
    channel: 'whatsapp', isPinned: true,
  },
  {
    id: 'c2', customerName: 'Maria Santos', customerPhone: '+1 555-0102', customerEmail: 'maria@email.com',
    lastMessage: 'When will the cleaning team arrive?', lastMessageTime: '5 min ago',
    unreadCount: 1, status: 'in_progress', assignedAgent: MOCK_AGENTS[0], priority: 'medium',
    labels: [MOCK_LABELS[4]], tags: ['repeat-customer'], isTyping: true,
    channel: 'whatsapp',
  },
  {
    id: 'c3', customerName: 'James Wilson', customerPhone: '+1 555-0103',
    lastMessage: 'Can I reschedule my appointment?', lastMessageTime: '12 min ago',
    unreadCount: 0, status: 'waiting', assignedAgent: MOCK_AGENTS[1], priority: 'low',
    labels: [MOCK_LABELS[3]], tags: ['reschedule'], isTyping: false,
    channel: 'sms',
  },
  {
    id: 'c4', customerName: 'Sophie Chen', customerPhone: '+1 555-0104',
    lastMessage: 'Thank you! That resolved my issue.', lastMessageTime: '25 min ago',
    unreadCount: 0, status: 'resolved', assignedAgent: MOCK_AGENTS[3], priority: 'low',
    labels: [], tags: ['satisfied'], isTyping: false,
    channel: 'whatsapp',
  },
  {
    id: 'c5', customerName: 'Robert Kim', customerPhone: '+1 555-0105', customerEmail: 'robert@email.com',
    lastMessage: 'I have a question about my invoice', lastMessageTime: '30 min ago',
    unreadCount: 2, status: 'assigned', assignedAgent: MOCK_AGENTS[0], priority: 'medium',
    labels: [MOCK_LABELS[2]], tags: ['billing', 'invoice'], isTyping: false,
    channel: 'email',
  },
  {
    id: 'c6', customerName: 'Emily Davis', customerPhone: '+1 555-0106',
    lastMessage: 'Do you offer window cleaning services?', lastMessageTime: '1 hr ago',
    unreadCount: 0, status: 'closed', assignedAgent: MOCK_AGENTS[2], priority: 'low',
    labels: [MOCK_LABELS[4]], tags: ['inquiry'], isTyping: false,
    channel: 'webchat', isMuted: true,
  },
  {
    id: 'c7', customerName: 'Carlos Mendoza', customerPhone: '+1 555-0107',
    lastMessage: 'The technician was excellent!', lastMessageTime: '2 hr ago',
    unreadCount: 0, status: 'resolved', assignedAgent: MOCK_AGENTS[1], priority: 'low',
    labels: [MOCK_LABELS[0]], tags: ['vip', 'positive-feedback'], isTyping: false,
    channel: 'whatsapp',
  },
  {
    id: 'c8', customerName: 'Lisa Park', customerPhone: '+1 555-0108', customerEmail: 'lisa@email.com',
    lastMessage: 'I want a refund for the last service', lastMessageTime: '3 hr ago',
    unreadCount: 4, status: 'new', priority: 'urgent',
    labels: [MOCK_LABELS[1], MOCK_LABELS[2]], tags: ['complaint', 'refund'], isTyping: true,
    channel: 'whatsapp',
  },
  {
    id: 'c9', customerName: 'Derek Thompson', customerPhone: '+1 555-0109',
    lastMessage: 'Is there a discount for recurring services?', lastMessageTime: '4 hr ago',
    unreadCount: 1, status: 'new', priority: 'medium',
    labels: [MOCK_LABELS[4]], tags: ['sales-lead'], isTyping: false,
    channel: 'webchat',
  },
  {
    id: 'c10', customerName: 'Aisha Khan', customerPhone: '+1 555-0110',
    lastMessage: 'The team did an amazing job on my house!', lastMessageTime: '5 hr ago',
    unreadCount: 0, status: 'resolved', assignedAgent: MOCK_AGENTS[3], priority: 'low',
    labels: [MOCK_LABELS[0]], tags: ['vip', 'positive'], isTyping: false,
    channel: 'sms',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', content: 'Hi, I placed an order recently', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:30 AM', type: 'text', status: 'read' },
    { id: 'm2', conversationId: 'c1', content: 'Hello Alex! I can see your order #4521. How can I help you today?', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '10:31 AM', type: 'text', status: 'delivered' },
    { id: 'm3', conversationId: 'c1', content: 'The delivery hasn\'t arrived yet and it was scheduled for yesterday', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:33 AM', type: 'text', status: 'read' },
    { id: 'm4', conversationId: 'c1', content: 'I need help with my recent order #4521', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:35 AM', type: 'text', status: 'delivered' },
    { id: 'm5', conversationId: 'c1', content: '@Mike Chen can you check the delivery status for order #4521? The customer says it was scheduled for yesterday.', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '10:36 AM', type: 'internal_note', status: 'read', mentions: ['Mike Chen'] },
  ],
  c2: [
    { id: 'm6', conversationId: 'c2', content: 'Hi, I booked a cleaning for today', sender: 'customer', senderName: 'Maria Santos', timestamp: '9:00 AM', type: 'text', status: 'read' },
    { id: 'm7', conversationId: 'c2', content: 'Hello Maria! Yes, your cleaning is confirmed for 2 PM today with our team.', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '9:02 AM', type: 'text', status: 'delivered' },
    { id: 'm8', conversationId: 'c2', content: 'When will the cleaning team arrive?', sender: 'customer', senderName: 'Maria Santos', timestamp: '9:15 AM', type: 'text', status: 'delivered' },
  ],
  c3: [
    { id: 'm3a', conversationId: 'c3', content: 'Hi, I need to reschedule my appointment', sender: 'customer', senderName: 'James Wilson', timestamp: '8:00 AM', type: 'text', status: 'read' },
    { id: 'm3b', conversationId: 'c3', content: 'Of course! When would you like to reschedule to?', sender: 'agent', senderName: 'Mike Chen', timestamp: '8:05 AM', type: 'text', status: 'read' },
    { id: 'm3c', conversationId: 'c3', content: 'Can I reschedule my appointment?', sender: 'customer', senderName: 'James Wilson', timestamp: '8:10 AM', type: 'text', status: 'delivered' },
  ],
  c5: [
    { id: 'm5a', conversationId: 'c5', content: 'Hi, I noticed an extra charge on my invoice', sender: 'customer', senderName: 'Robert Kim', timestamp: '11:00 AM', type: 'text', status: 'read' },
    { id: 'm5b', conversationId: 'c5', content: 'I have a question about my invoice', sender: 'customer', senderName: 'Robert Kim', timestamp: '11:05 AM', type: 'text', status: 'delivered' },
  ],
  c8: [
    { id: 'm8a', conversationId: 'c8', content: 'The service was not up to the mark. I want a refund.', sender: 'customer', senderName: 'Lisa Park', timestamp: '8:00 AM', type: 'text', status: 'read' },
    { id: 'm8b', conversationId: 'c8', content: 'I\'m very disappointed with the quality. This is unacceptable.', sender: 'customer', senderName: 'Lisa Park', timestamp: '8:15 AM', type: 'text', status: 'read' },
    { id: 'm8c', conversationId: 'c8', content: 'I want a refund for the last service', sender: 'customer', senderName: 'Lisa Park', timestamp: '8:30 AM', type: 'text', status: 'delivered' },
  ],
  c9: [
    { id: 'm9a', conversationId: 'c9', content: 'Is there a discount for recurring services?', sender: 'customer', senderName: 'Derek Thompson', timestamp: '7:00 AM', type: 'text', status: 'delivered' },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    new: 'bg-teal-100 text-teal-700 border-teal-200',
    assigned: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    waiting: 'bg-orange-100 text-orange-700 border-orange-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusDot(status: string) {
  const map: Record<string, string> = {
    new: 'bg-teal-500',
    assigned: 'bg-amber-500',
    in_progress: 'bg-emerald-500',
    waiting: 'bg-orange-500',
    resolved: 'bg-green-500',
    closed: 'bg-slate-400',
  };
  return map[status] || 'bg-gray-400';
}

function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getPriorityIcon(priority: string) {
  const map: Record<string, string> = {
    low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴',
  };
  return map[priority] || '';
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ChannelIndicator({ channel }: { channel: Conversation['channel'] }) {
  if (channel === 'whatsapp') return <MessageSquare className="size-2.5 text-emerald-600" />;
  if (channel === 'sms') return <Phone className="size-2.5 text-blue-600" />;
  if (channel === 'email') return <Send className="size-2.5 text-purple-600" />;
  return <MessageCircle className="size-2.5 text-teal-600" />;
}

function ConversationItem({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'w-full p-3 text-left transition-all duration-150 group relative',
        'hover:bg-muted/60',
        isSelected && 'bg-primary/5 border-l-[3px] border-l-primary',
        !isSelected && 'border-l-[3px] border-l-transparent',
        conv.unreadCount > 0 && !isSelected && 'bg-primary/[0.02]',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="size-10 ring-1 ring-border/50">
            <AvatarFallback className={cn('text-xs font-semibold', getAvatarColor(conv.customerName))}>
              {getInitials(conv.customerName)}
            </AvatarFallback>
          </Avatar>
          {/* Unread badge */}
          {conv.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
            </div>
          )}
          {/* Channel icon */}
          <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-background border flex items-center justify-center">
            <ChannelIndicator channel={conv.channel} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: name + time */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {conv.isPinned && <Pin className="size-3 text-amber-500 shrink-0" />}
              <span className={cn(
                'text-sm truncate',
                conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
              )}>
                {conv.customerName}
              </span>
            </div>
            <span className={cn(
              'text-[11px] shrink-0 tabular-nums',
              conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {conv.lastMessageTime}
            </span>
          </div>

          {/* Last message */}
          <p className={cn(
            'text-[13px] leading-snug truncate mb-1',
            conv.unreadCount > 0 ? 'text-foreground/90 font-medium' : 'text-muted-foreground'
          )}>
            {conv.lastMessage}
          </p>

          {/* Bottom row: badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={cn(getStatusColor(conv.status), 'text-[9px] h-[18px] px-1.5 font-medium')}>
              <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(conv.status))} />
              {conv.status === 'in_progress' ? 'Active' : conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
            </Badge>
            {conv.priority !== 'low' && (
              <Badge variant="outline" className={cn(getPriorityColor(conv.priority), 'text-[9px] h-[18px] px-1.5')}>
                {getPriorityIcon(conv.priority)} {conv.priority}
              </Badge>
            )}
            {conv.labels.slice(0, 1).map(label => (
              <Badge key={label.id} variant="outline" className={cn(label.color, 'text-[9px] h-[18px] px-1.5')}>
                {label.name}
              </Badge>
            ))}
            {conv.labels.length > 1 && (
              <span className="text-[10px] text-muted-foreground">+{conv.labels.length - 1}</span>
            )}
          </div>

          {/* Agent assignment */}
          <div className="flex items-center justify-between mt-1.5">
            {conv.assignedAgent ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="size-4 ring-1 ring-border/50">
                  <AvatarFallback className={cn('text-[7px] font-semibold', getAvatarColor(conv.assignedAgent.name))}>
                    {conv.assignedAgent.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">{conv.assignedAgent.name}</span>
                <Circle className={cn('size-1.5', conv.assignedAgent.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
              </div>
            ) : (
              <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 bg-amber-50 text-amber-600 border-amber-200">
                Unassigned
              </Badge>
            )}
            {conv.isTyping && (
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                <span className="flex gap-0.5">
                  <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </span>
                typing
              </span>
            )}
            {conv.isMuted && (
              <VolumeX className="size-3 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg, isLastInGroup }: { msg: Message; isLastInGroup: boolean }) {
  const isCustomer = msg.sender === 'customer';
  const isInternal = msg.type === 'internal_note';

  return (
    <div className={cn(
      'flex gap-2.5 max-w-[85%]',
      isCustomer ? 'self-start' : 'self-end flex-row-reverse',
      !isLastInGroup && (isCustomer ? 'mb-0.5' : 'mb-0.5'),
    )}>
      {/* Avatar - only show for first in group */}
      {isLastInGroup ? (
        <Avatar className="size-8 shrink-0 mt-0.5 ring-1 ring-border/50">
          <AvatarFallback className={cn(
            'text-[10px] font-semibold',
            isCustomer ? getAvatarColor(msg.senderName) :
            isInternal ? 'bg-amber-100 text-amber-700' :
            'bg-primary/10 text-primary'
          )}>
            {getInitials(msg.senderName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-8 shrink-0" />
      )}

      <div className={cn(
        'rounded-2xl px-3.5 py-2.5 shadow-sm',
        isCustomer && 'bg-muted rounded-tl-sm',
        isInternal && 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-tr-sm',
        !isCustomer && !isInternal && 'bg-primary text-primary-foreground rounded-tr-sm',
      )}>
        {/* Internal note header */}
        {isInternal && (
          <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-amber-200 dark:border-amber-800">
            <StickyNote className="size-3 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Internal Note</span>
            {msg.mentions && msg.mentions.length > 0 && (
              <div className="flex gap-1 ml-1">
                {msg.mentions.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] h-4 bg-teal-50 text-teal-600 border-teal-200 px-1">
                    <AtSign className="size-2 mr-0.5" />{m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sender name for group chats */}
        {isLastInGroup && (
          <p className={cn(
            'text-[11px] font-medium mb-1',
            isCustomer ? 'text-foreground/70' :
            isInternal ? 'text-amber-600 dark:text-amber-400' :
            'text-primary-foreground/70'
          )}>
            {msg.senderName}
          </p>
        )}

        {/* Message content */}
        <p className={cn(
          'text-[13px] leading-relaxed',
          isInternal && 'text-amber-800 dark:text-amber-200',
        )}>
          {msg.content}
        </p>

        {/* Timestamp and status */}
        <div className={cn(
          'flex items-center gap-1.5 mt-1.5',
          isCustomer ? 'justify-start' : 'justify-end',
        )}>
          <span className={cn(
            'text-[10px] tabular-nums',
            isCustomer ? 'text-muted-foreground' :
            isInternal ? 'text-amber-400 dark:text-amber-500' :
            'text-primary-foreground/60'
          )}>
            {msg.timestamp}
          </span>
          {!isCustomer && !isInternal && (
            <span className={cn(
              'text-primary-foreground/60',
              msg.status === 'read' && 'text-primary-foreground/90'
            )}>
              {msg.status === 'read' ? <CheckCheck className="size-3.5" /> :
               msg.status === 'delivered' ? <CheckCheck className="size-3.5" /> :
               <Check className="size-3.5" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerDetailPanel({
  conv,
  onClose,
  onAssign,
  onPriorityChange,
  onStatusChange,
  onToggleMute,
  onTogglePin,
  onToggleLabel,
}: {
  conv: Conversation;
  onClose: () => void;
  onAssign: (agentId: string) => void;
  onPriorityChange: (priority: Conversation['priority']) => void;
  onStatusChange: (status: Conversation['status']) => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onToggleLabel: (labelId: string) => void;
}) {
  return (
    <div className="w-80 shrink-0 border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Details</h3>
        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Customer Info */}
          <div className="text-center">
            <Avatar className="size-16 mx-auto mb-3 ring-2 ring-border">
              <AvatarFallback className={cn('text-lg font-bold', getAvatarColor(conv.customerName))}>
                {getInitials(conv.customerName)}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold text-sm">{conv.customerName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{conv.customerPhone}</p>
            {conv.customerEmail && (
              <p className="text-xs text-muted-foreground">{conv.customerEmail}</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className={cn(getStatusColor(conv.status), 'text-[10px]')}>
                <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(conv.status))} />
                {conv.status === 'in_progress' ? 'Active' : conv.status}
              </Badge>
              <Badge variant="outline" className={cn(getPriorityColor(conv.priority), 'text-[10px]')}>
                {getPriorityIcon(conv.priority)} {conv.priority}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onTogglePin}
              >
                <Pin className={cn('size-3', conv.isPinned && 'text-amber-500 fill-amber-500')} />
                {conv.isPinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onToggleMute}
              >
                {conv.isMuted ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
                {conv.isMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Assign Agent */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Agent</p>
            <Select onValueChange={onAssign} value={conv.assignedAgent?.id}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_AGENTS.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <Circle className={cn('size-2', a.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                      {a.name}
                      <span className="text-muted-foreground text-xs">({a.role})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Priority */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</p>
            <Select value={conv.priority} onValueChange={(v) => onPriorityChange(v as Conversation['priority'])}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Low</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['new', 'assigned', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map(s => (
                <Button
                  key={s}
                  variant={conv.status === s ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-7 text-[10px] gap-1',
                    conv.status === s && 'shadow-sm'
                  )}
                  onClick={() => onStatusChange(s)}
                >
                  <span className={cn('size-1.5 rounded-full', getStatusDot(s))} />
                  {s === 'in_progress' ? 'Active' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Labels */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Labels</p>
            <div className="space-y-1.5">
              {MOCK_LABELS.map(label => {
                const isActive = conv.labels.some(l => l.id === label.id);
                return (
                  <button
                    key={label.id}
                    className={cn(
                      'flex items-center gap-2 w-full p-2 rounded-lg text-left text-xs transition-colors',
                      'hover:bg-muted/60',
                      isActive && 'bg-muted/40'
                    )}
                    onClick={() => onToggleLabel(label.id)}
                  >
                    <div className={cn(
                      'size-4 rounded border-2 flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    )}>
                      {isActive && <Check className="size-3 text-primary-foreground" />}
                    </div>
                    <Badge variant="outline" className={cn(label.color, 'text-[10px]')}>{label.name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          {conv.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {conv.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] h-5">
                    <Hash className="size-2.5 mr-0.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAgent, setTransferAgent] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvName, setNewConvName] = useState('');
  const [newConvMessage, setNewConvMessage] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Local messages for the currently selected conversation (allows adding new messages)
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setLocalMessages(MOCK_MESSAGES[conv.id] || []);
    setShowMobileList(false);
    // Mark as read
    if (conv.unreadCount > 0) {
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      ));
    }
  }, []);

  const handleDeselectConversation = useCallback(() => {
    setSelectedConversation(null);
    setLocalMessages([]);
    setShowMobileList(true);
  }, []);

  const messages = localMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.customerName.toLowerCase().includes(q) ||
             c.lastMessage.toLowerCase().includes(q) ||
             c.customerPhone.includes(search);
    }
    return true;
  });

  // Sort: pinned first, then by unread, then by time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    return 0;
  });

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: messageInput,
      sender: 'agent',
      senderName: 'You',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: isInternalNoteMode ? 'internal_note' : 'text',
      status: 'sent',
      mentions: isInternalNoteMode ? [] : undefined,
    };

    // Extract @mentions
    if (isInternalNoteMode) {
      const mentionRegex = /@(\w+\s\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(messageInput)) !== null) {
        mentions.push(match[1]);
      }
      newMsg.mentions = mentions;
    }

    setLocalMessages(prev => [...prev, newMsg]);
    setMessageInput('');
    setIsInternalNoteMode(false);

    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? {
            ...c,
            lastMessage: isInternalNoteMode ? `📝 ${messageInput}` : messageInput,
            lastMessageTime: 'Just now',
            status: isInternalNoteMode ? c.status : 'in_progress' as const,
            isInternalNote: isInternalNoteMode,
          }
        : c
    ));

    setSelectedConversation(prev => prev ? {
      ...prev,
      lastMessage: isInternalNoteMode ? `📝 ${messageInput}` : messageInput,
      lastMessageTime: 'Just now',
      status: isInternalNoteMode ? prev.status : 'in_progress',
    } : null);

    if (isInternalNoteMode) {
      toast.success('Internal note added');
    } else {
      toast.success('Message sent');
    }

    messageInputRef.current?.focus();
  }, [messageInput, selectedConversation, isInternalNoteMode]);

  const handleTransfer = () => {
    if (!selectedConversation || !transferAgent) return;
    const agent = MOCK_AGENTS.find(a => a.id === transferAgent);
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, assignedAgent: agent, status: 'assigned' as const }
        : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, assignedAgent: agent, status: 'assigned' } : null);

    // Add system message
    const sysMsg: Message = {
      id: `m-sys-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: `Conversation transferred to ${agent?.name}${transferReason ? ` — Reason: ${transferReason}` : ''}`,
      sender: 'system',
      senderName: 'System',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'read',
    };
    setLocalMessages(prev => [...prev, sysMsg]);

    setShowTransferDialog(false);
    setTransferAgent('');
    setTransferReason('');
    toast.success(`Transferred to ${agent?.name}`);
  };

  const handleAssign = (agentId: string) => {
    if (!selectedConversation) return;
    const agent = MOCK_AGENTS.find(a => a.id === agentId);
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, assignedAgent: agent, status: 'assigned' as const }
        : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, assignedAgent: agent, status: 'assigned' } : null);
    toast.success(`Assigned to ${agent?.name}`);
  };

  const handlePriorityChange = (priority: Conversation['priority']) => {
    if (!selectedConversation) return;
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, priority } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, priority } : null);
    toast.success(`Priority set to ${priority}`);
  };

  const handleStatusChange = (status: Conversation['status']) => {
    if (!selectedConversation) return;
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, status } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, status } : null);
    toast.success(`Status changed to ${status.replace('_', ' ')}`);
  };

  const handleToggleMute = () => {
    if (!selectedConversation) return;
    const newMuted = !selectedConversation.isMuted;
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, isMuted: newMuted } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, isMuted: newMuted } : null);
    toast.success(newMuted ? 'Conversation muted' : 'Conversation unmuted');
  };

  const handleTogglePin = () => {
    if (!selectedConversation) return;
    const newPinned = !selectedConversation.isPinned;
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, isPinned: newPinned } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, isPinned: newPinned } : null);
    toast.success(newPinned ? 'Conversation pinned' : 'Conversation unpinned');
  };

  const handleToggleLabel = (labelId: string) => {
    if (!selectedConversation) return;
    const hasLabel = selectedConversation.labels.some(l => l.id === labelId);
    const label = MOCK_LABELS.find(l => l.id === labelId);
    if (!label) return;

    const newLabels = hasLabel
      ? selectedConversation.labels.filter(l => l.id !== labelId)
      : [...selectedConversation.labels, label];

    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, labels: newLabels } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, labels: newLabels } : null);
    toast.success(hasLabel ? `Label "${label.name}" removed` : `Label "${label.name}" added`);
  };

  const handleNewConversation = () => {
    if (!newConvPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    const newConv: Conversation = {
      id: `c-${Date.now()}`,
      customerName: newConvName || `Customer ${newConvPhone.slice(-4)}`,
      customerPhone: newConvPhone,
      lastMessage: newConvMessage || 'New conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      status: 'new',
      priority: 'medium',
      labels: [],
      tags: [],
      isTyping: false,
      channel: 'whatsapp',
    };
    setConversations(prev => [newConv, ...prev]);
    setSelectedConversation(newConv);
    setLocalMessages(MOCK_MESSAGES[newConv.id] || []);
    if (newConvMessage) {
      const newMsg: Message = {
        id: `m-${Date.now()}`,
        conversationId: newConv.id,
        content: newConvMessage,
        sender: 'agent',
        senderName: 'You',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        status: 'sent',
      };
      MOCK_MESSAGES[newConv.id] = [newMsg];
    } else {
      MOCK_MESSAGES[newConv.id] = [];
    }
    setShowNewConversationDialog(false);
    setNewConvPhone('');
    setNewConvName('');
    setNewConvMessage('');
    toast.success('New conversation created');
  };

  const handleDeleteConversation = () => {
    if (!selectedConversation) return;
    setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
    handleDeselectConversation();
    toast.success('Conversation deleted');
  };

  const stats = {
    total: conversations.length,
    new: conversations.filter(c => c.status === 'new').length,
    inProgress: conversations.filter(c => c.status === 'in_progress').length,
    waiting: conversations.filter(c => c.status === 'waiting').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
    unread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
  };

  const activeConv = selectedConversation ? conversations.find(c => c.id === selectedConversation.id) : null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <ViewHeader
        icon={Inbox}
        title="Shared Inbox"
        description="Manage customer conversations across channels"
        badge={
          <Badge variant="outline" className="text-xs gap-1.5">
            <Circle className="size-2 fill-emerald-500 text-emerald-500" />
            {MOCK_AGENTS.filter(a => a.online).length} agents online
          </Badge>
        }
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setShowNewConversationDialog(true)}>
            <Plus className="size-4" />
            New Conversation
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-3 sm:grid-cols-6 mb-4">
        {[
          { label: 'Total', value: stats.total, icon: MessageSquare, color: '' },
          { label: 'New', value: stats.new, icon: Inbox, color: 'text-teal-600' },
          { label: 'Active', value: stats.inProgress, icon: MessageCircle, color: 'text-emerald-600' },
          { label: 'Waiting', value: stats.waiting, icon: Clock, color: 'text-orange-600' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Unread', value: stats.unread, icon: AlertCircle, color: 'text-red-600' },
        ].map(stat => (
          <Card key={stat.label} className="p-3 card-hover group">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
              </div>
              <div className="size-8 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
                <stat.icon className={cn('size-4', stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex gap-0 min-h-0 rounded-xl border shadow-sm overflow-hidden bg-background">
        {/* Left Panel - Conversation List */}
        <div className={cn(
          'w-80 lg:w-96 shrink-0 flex flex-col border-r bg-background',
          'max-md:absolute max-md:inset-0 max-md:z-20 max-md:w-full',
          !showMobileList && 'max-md:hidden'
        )}>
          {/* Search & Filter */}
          <div className="p-3 space-y-2.5 border-b bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, message, or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-background"
              />
              {search && (
                <Button
                  variant="ghost" size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-6 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="w-full h-8 bg-background">
                <TabsTrigger value="all" className="text-[11px] flex-1 gap-1">
                  All
                  <span className="text-[10px] text-muted-foreground">{conversations.length}</span>
                </TabsTrigger>
                <TabsTrigger value="new" className="text-[11px] flex-1 gap-1">
                  New
                  {stats.new > 0 && <span className="size-1.5 rounded-full bg-teal-500" />}
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="text-[11px] flex-1">Active</TabsTrigger>
                <TabsTrigger value="waiting" className="text-[11px] flex-1">Waiting</TabsTrigger>
                <TabsTrigger value="resolved" className="text-[11px] flex-1">Done</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {sortedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MessageSquare className="size-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs mt-1">Try adjusting your filters or search</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {sortedConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isSelected={selectedConversation?.id === conv.id}
                    onClick={() => handleSelectConversation(conv)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Middle Panel - Message Thread */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          showMobileList && 'max-md:hidden'
        )}>
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost" size="sm"
                    className="size-8 p-0 md:hidden shrink-0"
                    onClick={() => handleDeselectConversation()}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Avatar className="size-9 ring-1 ring-border/50">
                    <AvatarFallback className={cn('text-xs font-semibold', getAvatarColor(activeConv.customerName))}>
                      {getInitials(activeConv.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{activeConv.customerName}</span>
                      <Badge variant="outline" className={cn(getStatusColor(activeConv.status), 'text-[10px] h-5 shrink-0')}>
                        {activeConv.status === 'in_progress' ? 'Active' : activeConv.status}
                      </Badge>
                      {activeConv.isMuted && <VolumeX className="size-3 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      <span>{activeConv.customerPhone}</span>
                      {activeConv.assignedAgent && (
                        <>
                          <span className="text-border">·</span>
                          <User className="size-3" />
                          <span>{activeConv.assignedAgent.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <TooltipProvider>
                    {/* Assign */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Select onValueChange={(v) => handleAssign(v)}>
                          <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1 hover:bg-muted">
                            <User className="size-3.5" />
                            <span className="hidden lg:inline text-xs max-w-[80px] truncate">{activeConv.assignedAgent?.name || 'Assign'}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {MOCK_AGENTS.map(a => (
                              <SelectItem key={a.id} value={a.id}>
                                <span className="flex items-center gap-2">
                                  <Circle className={cn('size-2', a.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                                  {a.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TooltipTrigger>
                      <TooltipContent>Assign Agent</TooltipContent>
                    </Tooltip>

                    {/* Priority */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Select value={activeConv.priority} onValueChange={(v) => handlePriorityChange(v as Conversation['priority'])}>
                          <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1 hover:bg-muted">
                            <Flag className="size-3.5" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">🟢 Low</SelectItem>
                            <SelectItem value="medium">🟡 Medium</SelectItem>
                            <SelectItem value="high">🟠 High</SelectItem>
                            <SelectItem value="urgent">🔴 Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TooltipTrigger>
                      <TooltipContent>Set Priority</TooltipContent>
                    </Tooltip>

                    {/* Transfer */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setShowTransferDialog(true)}>
                          <ArrowRightLeft className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Transfer</TooltipContent>
                    </Tooltip>

                    {/* Detail Panel Toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="sm"
                          className={cn('size-8 p-0', showDetailPanel && 'bg-muted')}
                          onClick={() => setShowDetailPanel(!showDetailPanel)}
                        >
                          {showDetailPanel ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showDetailPanel ? 'Hide Details' : 'Show Details'}</TooltipContent>
                    </Tooltip>

                    {/* More */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => handleTogglePin()}>
                          <Pin className={cn('size-3.5 mr-2', activeConv.isPinned && 'text-amber-500')} />
                          {activeConv.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleMute()}>
                          {activeConv.isMuted ? <Volume2 className="size-3.5 mr-2" /> : <VolumeX className="size-3.5 mr-2" />}
                          {activeConv.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                          <CheckCircle2 className="size-3.5 mr-2" /> Mark Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                          <Archive className="size-3.5 mr-2" /> Close Conversation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDeleteConversation} className="text-destructive focus:text-destructive">
                          <Trash2 className="size-3.5 mr-2" /> Delete Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipProvider>
                </div>
              </div>

              {/* Labels bar */}
              {(activeConv.labels.length > 0 || activeConv.tags.length > 0) && (
                <div className="px-4 py-1.5 border-b flex items-center gap-1.5 flex-wrap bg-muted/10">
                  <Tag className="size-3 text-muted-foreground shrink-0" />
                  {activeConv.labels.map(label => (
                    <Badge key={label.id} variant="outline" className={cn(label.color, 'text-[10px] h-5')}>
                      {label.name}
                    </Badge>
                  ))}
                  {activeConv.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5">
                      <Hash className="size-2.5 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Internal Notes Toggle */}
              <div className="px-4 py-1.5 border-b flex items-center justify-between bg-muted/5">
                <div className="flex items-center gap-2">
                  <StickyNote className="size-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Internal Notes</span>
                  <Switch
                    checked={showInternalNotes}
                    onCheckedChange={setShowInternalNotes}
                    className="scale-75"
                  />
                </div>
                {isInternalNoteMode && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] h-5">
                    <StickyNote className="size-3 mr-1" />
                    Writing internal note
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-1 max-w-3xl mx-auto flex flex-col">
                  {messages
                    .filter(m => showInternalNotes || m.type !== 'internal_note')
                    .map((msg, i, arr) => {
                      const isLastInGroup = i === 0 ||
                        arr[i - 1].sender !== msg.sender ||
                        arr[i - 1].type !== msg.type;

                      if (msg.sender === 'system') {
                        return (
                          <div key={msg.id} className="flex items-center justify-center py-2">
                            <div className="px-3 py-1 rounded-full bg-muted text-[11px] text-muted-foreground">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <MessageBubble key={msg.id} msg={msg} isLastInGroup={isLastInGroup} />
                      );
                    })}
                  {activeConv.isTyping && (
                    <div className="flex items-center gap-2 self-start ml-10">
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Compose Area */}
              <div className="p-3 border-t bg-background">
                <div className="max-w-3xl mx-auto">
                  {/* Quick Actions Row */}
                  <div className="flex items-center gap-0.5 mb-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn('size-8 p-0', isInternalNoteMode && 'bg-amber-100 text-amber-700 hover:bg-amber-200')} onClick={() => setIsInternalNoteMode(!isInternalNoteMode)}>
                            <StickyNote className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Internal Note (visible to team only)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <AtSign className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mention teammate</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <Paperclip className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Attach file</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <Smile className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Emoji</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">
                      <CornerDownLeft className="size-3 inline mr-0.5" />
                      to send
                    </span>
                  </div>

                  {/* Input Area */}
                  <div className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors',
                    isInternalNoteMode
                      ? 'border-amber-300 bg-amber-50/50 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-200'
                      : 'focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10'
                  )}>
                    {isInternalNoteMode && (
                      <StickyNote className="size-4 text-amber-500 shrink-0" />
                    )}
                    <input
                      ref={messageInputRef}
                      placeholder={isInternalNoteMode ? 'Write an internal note... (@ to mention)' : 'Type a message...'}
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <Mic className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voice message</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        className={cn(
                          'gap-1.5 h-8',
                          isInternalNoteMode
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-primary hover:bg-primary/90'
                        )}
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                      >
                        <Send className="size-3.5" />
                        <span className="text-xs">{isInternalNoteMode ? 'Note' : 'Send'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <MessageSquare className="size-10 opacity-30" />
              </div>
              <p className="text-lg font-semibold text-foreground/80">Select a conversation</p>
              <p className="text-sm mt-1 text-center max-w-[260px]">Choose a conversation from the list or start a new one to begin messaging</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setShowNewConversationDialog(true)}
              >
                <Plus className="size-4" />
                New Conversation
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Customer Details */}
        {showDetailPanel && activeConv && (
          <CustomerDetailPanel
            conv={activeConv}
            onClose={() => setShowDetailPanel(false)}
            onAssign={handleAssign}
            onPriorityChange={handlePriorityChange}
            onStatusChange={handleStatusChange}
            onToggleMute={handleToggleMute}
            onTogglePin={handleTogglePin}
            onToggleLabel={handleToggleLabel}
          />
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" />
              Transfer Conversation
            </DialogTitle>
            <DialogDescription>Transfer this conversation to another agent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={transferAgent} onValueChange={setTransferAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent to transfer to" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_AGENTS.filter(a => a.id !== activeConv?.assignedAgent?.id).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <Circle className={cn('size-2', a.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                        {a.name}
                        <span className="text-muted-foreground text-xs">({a.role})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transfer Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Why are you transferring this conversation?"
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTransferDialog(false); setTransferAgent(''); setTransferReason(''); }}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={!transferAgent}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              New Conversation
            </DialogTitle>
            <DialogDescription>Start a new conversation with a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="+1 555-0000"
                value={newConvPhone}
                onChange={e => setNewConvPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="John Doe"
                value={newConvName}
                onChange={e => setNewConvName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Opening Message <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Hi there! How can we help you today?"
                value={newConvMessage}
                onChange={e => setNewConvMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewConversationDialog(false); setNewConvPhone(''); setNewConvName(''); setNewConvMessage(''); }}>
              Cancel
            </Button>
            <Button onClick={handleNewConversation}>
              Start Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
