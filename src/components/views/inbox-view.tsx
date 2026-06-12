'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare, Search, Filter, Plus, Send, Phone, Clock,
  User, Tag, Flag, ArrowRightLeft, StickyNote, AtSign, MoreVertical,
  Circle, Check, CheckCheck, ChevronDown, Smile, Paperclip, Mic,
  Hash, Star, Archive, Trash2, Eye, X, ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  { id: 'l4', name: 'Support', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'l5', name: 'Sales', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', customerName: 'Alex Rivera', customerPhone: '+1 555-0101',
    lastMessage: 'I need help with my recent order #4521', lastMessageTime: '2 min ago',
    unreadCount: 3, status: 'new', priority: 'high',
    labels: [MOCK_LABELS[1]], tags: ['new-customer', 'order-issue'], isTyping: false,
  },
  {
    id: 'c2', customerName: 'Maria Santos', customerPhone: '+1 555-0102',
    lastMessage: 'When will the cleaning team arrive?', lastMessageTime: '5 min ago',
    unreadCount: 1, status: 'in_progress', assignedAgent: MOCK_AGENTS[0], priority: 'medium',
    labels: [MOCK_LABELS[4]], tags: ['repeat-customer'], isTyping: true,
  },
  {
    id: 'c3', customerName: 'James Wilson', customerPhone: '+1 555-0103',
    lastMessage: 'Can I reschedule my appointment?', lastMessageTime: '12 min ago',
    unreadCount: 0, status: 'waiting', assignedAgent: MOCK_AGENTS[1], priority: 'low',
    labels: [MOCK_LABELS[3]], tags: ['reschedule'], isTyping: false,
  },
  {
    id: 'c4', customerName: 'Sophie Chen', customerPhone: '+1 555-0104',
    lastMessage: 'Thank you! That resolved my issue.', lastMessageTime: '25 min ago',
    unreadCount: 0, status: 'resolved', assignedAgent: MOCK_AGENTS[3], priority: 'low',
    labels: [], tags: ['satisfied'], isTyping: false,
  },
  {
    id: 'c5', customerName: 'Robert Kim', customerPhone: '+1 555-0105',
    lastMessage: 'I have a question about my invoice', lastMessageTime: '30 min ago',
    unreadCount: 2, status: 'assigned', assignedAgent: MOCK_AGENTS[0], priority: 'medium',
    labels: [MOCK_LABELS[2]], tags: ['billing', 'invoice'], isTyping: false,
  },
  {
    id: 'c6', customerName: 'Emily Davis', customerPhone: '+1 555-0106',
    lastMessage: 'Do you offer window cleaning services?', lastMessageTime: '1 hr ago',
    unreadCount: 0, status: 'closed', assignedAgent: MOCK_AGENTS[2], priority: 'low',
    labels: [MOCK_LABELS[4]], tags: ['inquiry'], isTyping: false,
  },
  {
    id: 'c7', customerName: 'Carlos Mendoza', customerPhone: '+1 555-0107',
    lastMessage: 'The technician was excellent!', lastMessageTime: '2 hr ago',
    unreadCount: 0, status: 'resolved', assignedAgent: MOCK_AGENTS[1], priority: 'low',
    labels: [MOCK_LABELS[0]], tags: ['vip', 'positive-feedback'], isTyping: false,
  },
  {
    id: 'c8', customerName: 'Lisa Park', customerPhone: '+1 555-0108',
    lastMessage: 'I want a refund for the last service', lastMessageTime: '3 hr ago',
    unreadCount: 4, status: 'new', priority: 'urgent',
    labels: [MOCK_LABELS[1], MOCK_LABELS[2]], tags: ['complaint', 'refund'], isTyping: true,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', content: 'Hi, I placed an order recently', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:30 AM', type: 'text', status: 'read' },
    { id: 'm2', conversationId: 'c1', content: 'Hello Alex! I can see your order #4521. How can I help?', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '10:31 AM', type: 'text', status: 'delivered' },
    { id: 'm3', conversationId: 'c1', content: 'The delivery hasn\'t arrived yet and it was scheduled for yesterday', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:33 AM', type: 'text', status: 'read' },
    { id: 'm4', conversationId: 'c1', content: 'I need help with my recent order #4521', sender: 'customer', senderName: 'Alex Rivera', timestamp: '10:35 AM', type: 'text', status: 'delivered' },
    { id: 'm5', conversationId: 'c1', content: '@Mike Chen can you check the delivery status?', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '10:36 AM', type: 'internal_note', status: 'read', mentions: ['Mike Chen'] },
  ],
  c2: [
    { id: 'm6', conversationId: 'c2', content: 'Hi, I booked a cleaning for today', sender: 'customer', senderName: 'Maria Santos', timestamp: '9:00 AM', type: 'text', status: 'read' },
    { id: 'm7', conversationId: 'c2', content: 'Hello Maria! Yes, your cleaning is confirmed for 2 PM today', sender: 'agent', senderName: 'Sarah Johnson', timestamp: '9:02 AM', type: 'text', status: 'delivered' },
    { id: 'm8', conversationId: 'c2', content: 'When will the cleaning team arrive?', sender: 'customer', senderName: 'Maria Santos', timestamp: '9:15 AM', type: 'text', status: 'delivered' },
  ],
  c5: [
    { id: 'm9', conversationId: 'c5', content: 'Hi, I noticed an extra charge on my invoice', sender: 'customer', senderName: 'Robert Kim', timestamp: '11:00 AM', type: 'text', status: 'read' },
    { id: 'm10', conversationId: 'c5', content: 'I have a question about my invoice', sender: 'customer', senderName: 'Robert Kim', timestamp: '11:05 AM', type: 'text', status: 'delivered' },
  ],
  c8: [
    { id: 'm11', conversationId: 'c8', content: 'The service was not up to the mark. I want a refund.', sender: 'customer', senderName: 'Lisa Park', timestamp: '8:00 AM', type: 'text', status: 'read' },
    { id: 'm12', conversationId: 'c8', content: 'I want a refund for the last service', sender: 'customer', senderName: 'Lisa Park', timestamp: '8:30 AM', type: 'text', status: 'delivered' },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    assigned: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    waiting: 'bg-orange-100 text-orange-700 border-orange-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
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

/** Format time strings like "2 min ago" into compact format like "2m" */
function formatRelativeTime(timeStr: string): string {
  const match = timeStr.match(/(\d+)\s*(min|hr|hour|day|sec|week)s?\s*ago/i);
  if (match) {
    const val = match[1];
    const unit = match[2].toLowerCase();
    if (unit.startsWith('sec')) return `${val}s`;
    if (unit.startsWith('min')) return `${val}m`;
    if (unit.startsWith('hr') || unit.startsWith('hour')) return `${val}h`;
    if (unit.startsWith('day')) return `${val}d`;
    if (unit.startsWith('week')) return `${val}w`;
  }
  // If it's like "Just now" or already short
  if (timeStr.toLowerCase() === 'just now') return 'now';
  // If it doesn't match pattern, return as-is (e.g., "10:30 AM")
  return timeStr;
}

/** Get channel icon for a conversation */
function getChannelIcon(convId: string) {
  // Distribute channels across conversations for visual variety
  const channels: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
    c1: { icon: Phone, label: 'WhatsApp', color: 'text-green-600' },
    c2: { icon: Phone, label: 'WhatsApp', color: 'text-green-600' },
    c3: { icon: MessageSquare, label: 'Website', color: 'text-blue-600' },
    c4: { icon: MessageSquare, label: 'Website', color: 'text-blue-600' },
    c5: { icon: Phone, label: 'WhatsApp', color: 'text-green-600' },
    c6: { icon: MessageSquare, label: 'Website', color: 'text-blue-600' },
    c7: { icon: Phone, label: 'WhatsApp', color: 'text-green-600' },
    c8: { icon: Phone, label: 'WhatsApp', color: 'text-green-600' },
  };
  return channels[convId] || { icon: MessageSquare, label: 'Chat', color: 'text-slate-600' };
}

// ─── Typing Indicator Component ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-emerald-600 mr-0.5">typing</span>
      <span className="flex gap-0.5">
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}

// ─── Message Status Icon ────────────────────────────────────────────────────

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') {
    return <CheckCheck className="size-3.5 text-blue-500" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="size-3.5 text-muted-foreground" />;
  }
  // sent
  return <Check className="size-3.5 text-muted-foreground" />;
}

// ─── Auto-Grow Textarea ─────────────────────────────────────────────────────

function AutoGrowTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className={cn(
        'resize-none w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'max-h-[120px] overflow-y-auto',
        className
      )}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [prevConvId, setPrevConvId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAgent, setTransferAgent] = useState('');
  const [showLabelsDialog, setShowLabelsDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // React-recommended pattern: adjust state during render when derived value changes
  const currentConvId = selectedConversation?.id ?? null;
  if (currentConvId !== prevConvId) {
    setPrevConvId(currentConvId);
    setLocalMessages(prev => {
      if (currentConvId && !prev[currentConvId]) {
        return { ...prev, [currentConvId]: [] };
      }
      return prev;
    });
  }

  const messages = useMemo(() => {
    if (!selectedConversation) return [];
    const base = MOCK_MESSAGES[selectedConversation.id] || [];
    const local = localMessages[selectedConversation.id] || [];
    return [...base, ...local];
  }, [selectedConversation, localMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.customerName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    if (isMobile) {
      setMobileShowThread(true);
    }
  }, [isMobile]);

  const handleMobileBack = useCallback(() => {
    setMobileShowThread(false);
  }, []);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: messageInput,
      sender: 'agent',
      senderName: 'You',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'sent',
    };
    setLocalMessages(prev => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg],
    }));
    setMessageInput('');
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, lastMessage: messageInput, lastMessageTime: 'Just now', status: 'in_progress' as const }
        : c
    ));
    toast.success('Message sent');
  };

  const handleTransfer = () => {
    if (!selectedConversation || !transferAgent) return;
    const agent = MOCK_AGENTS.find(a => a.id === transferAgent);
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, assignedAgent: agent, status: 'assigned' as const }
        : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, assignedAgent: agent, status: 'assigned' } : null);
    setShowTransferDialog(false);
    setTransferAgent('');
    toast.success(`Conversation transferred to ${agent?.name}`);
  };

  const handleAssign = (convId: string, agentId: string) => {
    const agent = MOCK_AGENTS.find(a => a.id === agentId);
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, assignedAgent: agent, status: 'assigned' as const }
        : c
    ));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(prev => prev ? { ...prev, assignedAgent: agent, status: 'assigned' } : null);
    }
    toast.success(`Assigned to ${agent?.name}`);
  };

  const handlePriorityChange = (convId: string, priority: Conversation['priority']) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, priority } : c
    ));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(prev => prev ? { ...prev, priority } : null);
    }
    toast.success(`Priority set to ${priority}`);
  };

  const handleStatusChange = (convId: string, status: Conversation['status']) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, status } : c
    ));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
    }
    toast.success(`Status changed to ${status.replace('_', ' ')}`);
  };

  const stats = {
    total: conversations.length,
    new: conversations.filter(c => c.status === 'new').length,
    inProgress: conversations.filter(c => c.status === 'in_progress').length,
    waiting: conversations.filter(c => c.status === 'waiting').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
    unread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
  };

  // ─── Conversation List Panel Content ──────────────────────────────────────

  const conversationListContent = (
    <div className="flex flex-col h-full">
      {/* Search + Filters */}
      <div className="p-3 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full h-8">
            <TabsTrigger value="all" className="text-[10px] flex-1">All</TabsTrigger>
            <TabsTrigger value="new" className="text-[10px] flex-1">New</TabsTrigger>
            <TabsTrigger value="assigned" className="text-[10px] flex-1">Assigned</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-[10px] flex-1">Active</TabsTrigger>
            <TabsTrigger value="waiting" className="text-[10px] flex-1">Waiting</TabsTrigger>
            <TabsTrigger value="resolved" className="text-[10px] flex-1">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="size-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredConversations.map(conv => {
              const isActive = selectedConversation?.id === conv.id;
              const channel = getChannelIcon(conv.id);
              const ChannelIcon = channel.icon;
              return (
                <button
                  key={conv.id}
                  className={cn(
                    'w-full p-3 text-left transition-all duration-150',
                    'hover:bg-muted/40',
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-l-emerald-600'
                      : 'border-l-[3px] border-l-transparent',
                    conv.unreadCount > 0 && !isActive && 'bg-muted/20'
                  )}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback className={cn(
                          'text-xs font-medium',
                          isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {conv.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <ChannelIcon className={cn('size-3', channel.color)} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn(
                          'text-sm truncate',
                          conv.unreadCount > 0 ? 'font-semibold' : 'font-medium'
                        )}>
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {formatRelativeTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={cn(
                          'text-xs truncate flex-1',
                          conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5 min-w-[20px] px-1.5 shrink-0 flex items-center justify-center rounded-full">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={cn(getStatusColor(conv.status), 'text-[9px] h-4 px-1.5')}>
                          {conv.status.replace('_', ' ')}
                        </Badge>
                        {conv.priority !== 'low' && (
                          <Badge variant="outline" className={cn(getPriorityColor(conv.priority), 'text-[9px] h-4 px-1.5')}>
                            {getPriorityIcon(conv.priority)} {conv.priority}
                          </Badge>
                        )}
                        {conv.labels.slice(0, 1).map(label => (
                          <Badge key={label.id} variant="outline" className={cn(label.color, 'text-[9px] h-4 px-1.5')}>
                            {label.name}
                          </Badge>
                        ))}
                        {conv.labels.length > 1 && (
                          <span className="text-[9px] text-muted-foreground">+{conv.labels.length - 1}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        {conv.assignedAgent ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-4">
                              <AvatarFallback className="text-[8px] bg-slate-100">
                                {conv.assignedAgent.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground">{conv.assignedAgent.name}</span>
                            <Circle className={cn('size-1.5', conv.assignedAgent.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">Unassigned</span>
                        )}
                        {conv.isTyping && <TypingIndicator />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─── Message Thread Panel Content ─────────────────────────────────────────

  const messageThreadContent = selectedConversation ? (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile back button */}
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleMobileBack}>
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
              {selectedConversation.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{selectedConversation.customerName}</span>
              <Badge variant="outline" className={cn(getStatusColor(selectedConversation.status), 'text-[10px] h-5 shrink-0')}>
                {selectedConversation.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{selectedConversation.customerPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Assign */}
          <Select onValueChange={(v) => handleAssign(selectedConversation.id, v)}>
            <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1">
              <User className="size-3.5" />
              <span className="hidden lg:inline">{selectedConversation.assignedAgent?.name || 'Assign'}</span>
            </SelectTrigger>
            <SelectContent>
              {MOCK_AGENTS.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-1">
                    <Circle className={cn('size-2', a.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                    {a.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={selectedConversation.priority} onValueChange={(v) => handlePriorityChange(selectedConversation.id, v as Conversation['priority'])}>
            <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1">
              <Flag className="size-3.5" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Labels */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowLabelsDialog(true)}>
                  <Tag className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Labels</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Transfer */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowTransferDialog(true)}>
                  <ArrowRightLeft className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Transfer</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'resolved')}>
                <Check className="size-3 mr-2" /> Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(selectedConversation.id, 'closed')}>
                <Archive className="size-3 mr-2" /> Close Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="size-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Labels bar */}
      {selectedConversation.labels.length > 0 && (
        <div className="px-3 py-1.5 border-b flex items-center gap-1.5 flex-wrap bg-muted/30">
          <Tag className="size-3 text-muted-foreground" />
          {selectedConversation.labels.map(label => (
            <Badge key={label.id} variant="outline" className={cn(label.color, 'text-[10px] h-5')}>
              {label.name}
            </Badge>
          ))}
          {selectedConversation.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Messages - Chat Bubbles */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1 max-w-3xl mx-auto">
          {messages
            .filter(m => showInternalNotes || m.type !== 'internal_note')
            .map((msg, idx, arr) => {
              const prevMsg = idx > 0 ? arr[idx - 1] : null;
              const isSameSender = prevMsg && prevMsg.sender === msg.sender && prevMsg.type === msg.type;
              const isInternalNote = msg.type === 'internal_note';
              const isCustomer = msg.sender === 'customer';
              const isAgent = msg.sender === 'agent' && !isInternalNote;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    isInternalNote ? 'justify-center' : isAgent ? 'justify-end' : 'justify-start',
                    !isSameSender ? 'mt-4' : 'mt-0.5'
                  )}
                >
                  {isInternalNote ? (
                    /* Internal Note - centered with amber styling */
                    <div className="max-w-[85%] rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-amber-600 font-medium">
                        <StickyNote className="size-3" /> Internal Note
                      </div>
                      <p className="text-sm text-amber-900 dark:text-amber-200">{msg.content}</p>
                      {msg.mentions && msg.mentions.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {msg.mentions.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-600 border-blue-200">
                              <AtSign className="size-2 mr-0.5" />{m}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500">
                        <span>{msg.senderName}</span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  ) : (
                    /* Regular message - chat bubble style */
                    <div className={cn(
                      'max-w-[75%] flex flex-col',
                      isAgent ? 'items-end' : 'items-start'
                    )}>
                      {/* Show sender name only when sender changes */}
                      {!isSameSender && (
                        <span className={cn(
                          'text-[10px] font-medium mb-1 px-1',
                          isAgent ? 'text-emerald-700' : 'text-muted-foreground'
                        )}>
                          {msg.senderName}
                        </span>
                      )}
                      <div className={cn(
                        'rounded-2xl px-3 py-2',
                        isAgent
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-muted rounded-bl-md',
                        isSameSender && isAgent && 'rounded-br-2xl',
                        isSameSender && isCustomer && 'rounded-bl-2xl'
                      )}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          isAgent ? 'justify-end' : 'justify-start'
                        )}>
                          <span className={cn(
                            'text-[10px]',
                            isAgent ? 'text-emerald-200' : 'text-muted-foreground'
                          )}>
                            {msg.timestamp}
                          </span>
                          {isAgent && <MessageStatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Compose Area */}
      <div className="p-3 border-t bg-background">
        {/* Quick action buttons */}
        <div className="flex items-center gap-1 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Smile className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Paperclip className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <AtSign className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mention</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <StickyNote className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Internal Note</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Input + Send */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <AutoGrowTextarea
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message... (Shift+Enter for new line)"
            />
          </div>
          <Button
            size="sm"
            className={cn(
              'bg-emerald-600 hover:bg-emerald-700 h-9 w-9 p-0 rounded-xl shrink-0',
              !messageInput.trim() && 'opacity-50 cursor-not-allowed'
            )}
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <MessageSquare className="size-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">Select a conversation</p>
      <p className="text-sm mt-1">Choose from the list to start messaging</p>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600">
            <MessageSquare className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Shared Inbox</h2>
            <p className="text-sm text-muted-foreground">Multi-agent WhatsApp conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={showInternalNotes} onCheckedChange={setShowInternalNotes} id="internal-notes" />
            <Label htmlFor="internal-notes" className="text-xs cursor-pointer">Internal Notes</Label>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Circle className="size-2 fill-emerald-500 text-emerald-500" />
            {MOCK_AGENTS.filter(a => a.online).length} online
          </Badge>
        </div>
      </div>

      {/* Compact Stats Strip */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {stats.unread > 0 && (
          <Badge variant="outline" className="gap-1 text-xs border-red-200 text-red-700 bg-red-50">
            <span className="font-bold">{stats.unread}</span> unread
          </Badge>
        )}
        <Badge variant="outline" className="gap-1 text-xs">
          <span className="font-bold">{stats.total}</span> total
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs border-blue-200 text-blue-700 bg-blue-50">
          <span className="font-bold">{stats.new}</span> new
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
          <span className="font-bold">{stats.inProgress}</span> active
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs border-orange-200 text-orange-700 bg-orange-50">
          <span className="font-bold">{stats.waiting}</span> waiting
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs border-green-200 text-green-700 bg-green-50">
          <span className="font-bold">{stats.resolved}</span> resolved
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs">
          <Circle className="size-2 fill-emerald-500 text-emerald-500" />
          <span className="font-bold">{MOCK_AGENTS.filter(a => a.online).length}</span> agents online
        </Badge>
      </div>

      {/* Main Content - Desktop: Resizable Panels, Mobile: Sliding Panels */}
      {isMobile ? (
        /* Mobile Layout: Sliding panels */
        <div className="flex-1 relative overflow-hidden min-h-0 rounded-xl border bg-card">
          <div
            className={cn(
              'absolute inset-0 transition-transform duration-300 ease-in-out',
              mobileShowThread ? '-translate-x-full' : 'translate-x-0'
            )}
          >
            {conversationListContent}
          </div>
          <div
            className={cn(
              'absolute inset-0 transition-transform duration-300 ease-in-out',
              mobileShowThread ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {messageThreadContent}
          </div>
        </div>
      ) : (
        /* Desktop Layout: Resizable Panels */
        <div className="flex-1 min-h-0 rounded-xl border bg-card overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Conversation List */}
            <ResizablePanel defaultSize={35} minSize={20} className="min-w-[280px]">
              {conversationListContent}
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle className="bg-border/50" />

            {/* Right Panel - Message Thread */}
            <ResizablePanel defaultSize={65} minSize={30}>
              {messageThreadContent}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Conversation</DialogTitle>
            <DialogDescription>Transfer this conversation to another agent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={transferAgent} onValueChange={setTransferAgent}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                {MOCK_AGENTS.filter(a => a.id !== selectedConversation?.assignedAgent?.id).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <Circle className={cn('size-2', a.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                      {a.name} - {a.role}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Transfer reason (optional)" rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleTransfer} disabled={!transferAgent}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Labels Dialog */}
      <Dialog open={showLabelsDialog} onOpenChange={setShowLabelsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chat Labels</DialogTitle>
            <DialogDescription>Manage labels for this conversation</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MOCK_LABELS.map(label => (
              <div key={label.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={label.color}>{label.name}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  {selectedConversation?.labels.some(l => l.id === label.id) ? 'Remove' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
