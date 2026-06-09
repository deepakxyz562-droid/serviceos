'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Search, Filter, Plus, Send, Phone, Clock,
  User, Tag, Flag, ArrowRightLeft, StickyNote, AtSign, MoreVertical,
  Circle, Check, CheckCheck, ChevronDown, Smile, Paperclip, Mic,
  Hash, Star, Archive, Trash2, Eye, X, Inbox, AlertCircle, CheckCircle2,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { StatCard } from '@/components/shared/stat-card';

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
  { id: 'l4', name: 'Support', color: 'bg-teal-100 text-teal-700 border-teal-200' },
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
    new: 'bg-teal-100 text-teal-700 border-teal-200',
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

// ─── Component ──────────────────────────────────────────────────────────────

export function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAgent, setTransferAgent] = useState('');
  const [showLabelsDialog, setShowLabelsDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversation) {
      const msgs = MOCK_MESSAGES[selectedConversation.id] || [];
      requestAnimationFrame(() => setMessages(msgs));
    }
  }, [selectedConversation]);

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
    setMessages(prev => [...prev, newMsg]);
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <ViewHeader
        icon={MessageSquare}
        title="Shared Inbox"
        description="Multi-agent WhatsApp conversations"
        badge={
          <Badge variant="outline" className="text-xs">
            <Circle className="size-2 fill-emerald-500 text-emerald-500 mr-1" />
            {MOCK_AGENTS.filter(a => a.online).length} online
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid gap-2 grid-cols-3 sm:grid-cols-6 mb-4">
        <StatCard label="Total" value={stats.total} icon={MessageSquare} />
        <StatCard label="New" value={stats.new} icon={Inbox} color="text-teal-600" />
        <StatCard label="In Progress" value={stats.inProgress} icon={MessageSquare} color="text-emerald-600" />
        <StatCard label="Waiting" value={stats.waiting} icon={Clock} color="text-orange-600" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="text-green-600" />
        <StatCard label="Unread" value={stats.unread} icon={AlertCircle} color="text-red-600" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel - Conversation List */}
        <Card className="w-80 lg:w-96 shrink-0 flex flex-col">
          {/* Filters */}
          <div className="p-3 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
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
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="size-8 mb-2 opacity-20" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    className={cn(
                      'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                      selectedConversation?.id === conv.id && 'bg-emerald-50 border-l-2 border-l-emerald-600'
                    )}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative shrink-0">
                        <Avatar className="size-10 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                            {conv.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Unread dot indicator */}
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-emerald-600 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{conv.unreadCount}</span>
                          </div>
                        )}
                        {/* Online/typing indicator */}
                        {conv.isTyping && (
                          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('font-medium text-sm truncate', conv.unreadCount > 0 && 'font-bold')}>{conv.customerName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{conv.lastMessageTime}</span>
                        </div>
                        <p className={cn('text-xs truncate', conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>{conv.lastMessage}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className={`${getStatusColor(conv.status)} text-[9px] h-4 px-1`}>
                            {conv.status.replace('_', ' ')}
                          </Badge>
                          {conv.priority !== 'low' && (
                            <Badge variant="outline" className={`${getPriorityColor(conv.priority)} text-[9px] h-4 px-1`}>
                              {getPriorityIcon(conv.priority)} {conv.priority}
                            </Badge>
                          )}
                          {conv.labels.slice(0, 1).map(label => (
                            <Badge key={label.id} variant="outline" className={`${label.color} text-[9px] h-4 px-1`}>
                              {label.name}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          {conv.assignedAgent ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-4">
                                <AvatarFallback className="text-[8px] bg-teal-100 text-teal-700">
                                  {conv.assignedAgent.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-muted-foreground">{conv.assignedAgent.name}</span>
                              <Circle className={cn('size-1.5', conv.assignedAgent.online ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300')} />
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-600 border-amber-200">
                              Unassigned
                            </Badge>
                          )}
                          {conv.isTyping && (
                            <span className="text-[10px] text-emerald-600 animate-pulse font-medium">typing...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right Panel - Message Thread */}
        <Card className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                      {selectedConversation.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{selectedConversation.customerName}</span>
                      <Badge variant="outline" className={`${getStatusColor(selectedConversation.status)} text-[10px] h-5`}>
                        {selectedConversation.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedConversation.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Assign */}
                  <Select onValueChange={(v) => handleAssign(selectedConversation.id, v)}>
                    <SelectTrigger className="h-7 w-auto text-xs border-0 gap-1">
                      <User className="size-3" />
                      <span className="hidden sm:inline">{selectedConversation.assignedAgent?.name || 'Assign'}</span>
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
                    <SelectTrigger className="h-7 w-auto text-xs border-0 gap-1">
                      <Flag className="size-3" />
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowLabelsDialog(true)}>
                          <Tag className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Labels</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Transfer */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowTransferDialog(true)}>
                          <ArrowRightLeft className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Transfer</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* More */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="size-3" />
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
                <div className="px-3 py-1.5 border-b flex items-center gap-1 flex-wrap bg-muted/30">
                  <Tag className="size-3 text-muted-foreground" />
                  {selectedConversation.labels.map(label => (
                    <Badge key={label.id} variant="outline" className={`${label.color} text-[10px] h-5`}>
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

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-2xl mx-auto">
                  {messages
                    .filter(m => showInternalNotes || m.type !== 'internal_note')
                    .map(msg => (
                    <div key={msg.id} className={cn('flex gap-2', msg.sender === 'customer' ? '' : 'flex-row-reverse')}>
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className={cn(
                          'text-[10px]',
                          msg.sender === 'customer' ? 'bg-slate-100 text-slate-600' :
                          msg.type === 'internal_note' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        )}>
                          {msg.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        'max-w-[70%] rounded-2xl p-3',
                        msg.sender === 'customer' ? 'bg-slate-100 dark:bg-slate-800 rounded-tl-sm' :
                        msg.type === 'internal_note' ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded-tr-sm' :
                        'bg-emerald-600 text-white rounded-tr-sm'
                      )}>
                        {msg.type === 'internal_note' && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] text-amber-600">
                            <StickyNote className="size-3" /> Internal Note
                          </div>
                        )}
                        <p className={cn(
                          'text-sm',
                          msg.type === 'internal_note' && 'text-amber-800'
                        )}>{msg.content}</p>
                        {msg.mentions && msg.mentions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {msg.mentions.map((m, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] h-4 bg-teal-50 text-teal-600 border-teal-200">
                                <AtSign className="size-2 mr-0.5" />{m}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className={cn(
                          'flex items-center gap-1 mt-1 text-[10px]',
                          msg.sender === 'customer' ? 'text-slate-400' :
                          msg.type === 'internal_note' ? 'text-amber-400' :
                          'text-emerald-200'
                        )}>
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'agent' && msg.type !== 'internal_note' && (
                            <span>{msg.status === 'read' ? <CheckCheck className="size-3" /> : msg.status === 'delivered' ? <Check className="size-3" /> : <Clock className="size-3" />}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Compose */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Smile className="size-4" /></Button></TooltipTrigger><TooltipContent>Emoji</TooltipContent></Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Paperclip className="size-4" /></Button></TooltipTrigger><TooltipContent>Attach</TooltipContent></Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><AtSign className="size-4" /></Button></TooltipTrigger><TooltipContent>Mention</TooltipContent></Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><StickyNote className="size-4" /></Button></TooltipTrigger><TooltipContent>Internal Note</TooltipContent></Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message... (@ to mention)"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="h-8 text-sm pr-10"
                    />
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="size-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose from the list to start messaging</p>
            </div>
          )}
        </Card>
      </div>

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
