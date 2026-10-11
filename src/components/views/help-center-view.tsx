'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  BookOpen,
  Megaphone,
  Ticket,
  ArrowLeft,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  Filter,
  Loader2,
  Pin,
  X,
  ThumbsUp,
  Star,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  categoryId?: string;
  priority: string;
  status: string;
  type: string;
  source: string;
  reporterId: string;
  reporterEmail?: string;
  reporterName?: string;
  tenantId: string;
  assigneeId?: string;
  assigneeName?: string;
  resolution?: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
  firstResponseAt?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

interface Message {
  id: string;
  ticketId: string;
  content: string;
  contentType: string;
  authorId: string;
  authorName?: string;
  authorRole: string;
  isInternal: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  status: string;
  targetRole: string;
  icon: string;
  color: string;
  isPinned: boolean;
  publishedAt?: string;
  authorName?: string;
  createdAt: string;
}

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tagsJson: string;
  isPublic: boolean;
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
}

interface Stats {
  tickets: {
    open: number;
    inProgress: number;
    waitingCustomer: number;
    resolved: number;
    closed: number;
    total: number;
    urgent?: number;
    unassigned?: number;
  };
  categories?: number;
  announcements?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const priorityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Clock },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: AlertCircle },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertCircle },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: Eye },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  waiting_customer: { label: 'Waiting', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: XCircle },
};

const announcementTypeConfig: Record<string, { label: string; color: string }> = {
  new_feature: { label: 'New Feature', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  bug_fix: { label: 'Bug Fix', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  system_update: { label: 'System Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  info: { label: 'Info', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HelpCenterView() {
  const { auth } = useAppStore();
  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin');

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // New ticket form
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    categoryId: '',
    priority: 'medium',
    type: 'general',
  });
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/support/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/support/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/support/announcements?status=published&limit=10');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  }, []);

  // Fetch KB articles
  const fetchKBArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-base?isActive=true&limit=20');
      if (res.ok) {
        const data = await res.json();
        setKbArticles(data.articles || []);
      }
    } catch (err) {
      console.error('Failed to fetch KB articles:', err);
    }
  }, []);

  // Fetch ticket detail with messages
  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data);
      }
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchCategories(), fetchAnnouncements(), fetchKBArticles(), fetchTickets()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchCategories, fetchAnnouncements, fetchKBArticles, fetchTickets]);

  // Refetch tickets when filters change
  useEffect(() => {
    if (!loading) fetchTickets();
  }, [statusFilter, priorityFilter, fetchTickets]);

  // Create ticket
  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket),
      });
      if (res.ok) {
        toast.success('Ticket created successfully');
        setNewTicketOpen(false);
        setNewTicket({ subject: '', description: '', categoryId: '', priority: 'medium', type: 'general' });
        fetchTickets();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create ticket');
      }
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Send reply
  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.ok) {
        toast.success('Reply sent');
        setReplyContent('');
        fetchTicketDetail(selectedTicket.id);
      } else {
        toast.error('Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  // Close ticket
  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        toast.success('Ticket closed');
        fetchTickets();
        fetchStats();
        if (selectedTicket?.id === ticketId) {
          fetchTicketDetail(ticketId);
        }
      }
    } catch {
      toast.error('Failed to close ticket');
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ─── Ticket Detail View ────────────────────────────────────────────────
  if (selectedTicket) {
    const sConfig = statusConfig[selectedTicket.status] || statusConfig.open;
    const pConfig = priorityConfig[selectedTicket.priority] || priorityConfig.medium;
    const StatusIcon = sConfig.icon;
    const PriorityIcon = pConfig.icon;

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="gap-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ticket className="size-4" />
                  {selectedTicket.ticketNumber}
                </div>
                <CardTitle className="text-xl">{selectedTicket.subject}</CardTitle>
                <CardDescription>
                  Created {formatRelative(selectedTicket.createdAt)} by {selectedTicket.reporterName || 'You'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn('gap-1', pConfig.color)}>
                  <PriorityIcon className="size-3" />
                  {pConfig.label}
                </Badge>
                <Badge className={cn('gap-1', sConfig.color)}>
                  <StatusIcon className="size-3" />
                  {sConfig.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Ticket meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{selectedTicket.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="font-medium capitalize">{selectedTicket.source}</p>
              </div>
              {selectedTicket.assigneeName && (
                <div>
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="font-medium">{selectedTicket.assigneeName}</p>
                </div>
              )}
              {selectedTicket.firstResponseAt && (
                <div>
                  <span className="text-muted-foreground">First Response</span>
                  <p className="font-medium">{formatRelative(selectedTicket.firstResponseAt)}</p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Conversation Thread */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {(selectedTicket.messages || []).map((msg) => {
                const isUser = msg.authorRole === 'user';
                return (
                  <div key={msg.id} className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-xl p-4', isUser ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-muted')}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="size-6">
                          <AvatarFallback className={cn('text-[10px]', isUser ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white')}>
                            {(msg.authorName || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{msg.authorName || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {msg.authorRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelative(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
              )}
            </div>

            {/* Reply box */}
            {selectedTicket.status !== 'closed' && (
              <div className="mt-4 space-y-3">
                <Separator />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Press ⌘+Enter to send</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                    >
                      Close Ticket
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyContent.trim() || replying}
                      className="gap-2"
                    >
                      {replying ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedTicket.status === 'closed' && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                <XCircle className="size-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">This ticket is closed. Create a new ticket if you need further assistance.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Help Center View ──────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="size-6 text-emerald-500" />
            Help & Support
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Get help, submit tickets, and browse resources</p>
        </div>
        <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit a Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and we&apos;ll get back to you as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  placeholder="Brief summary of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Please provide details about your issue..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTicket.categoryId}
                    onValueChange={(val) => setNewTicket(prev => ({ ...prev, categoryId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(val) => setNewTicket(prev => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newTicket.type}
                  onValueChange={(val) => setNewTicket(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTicketOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTicket} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
                Submit Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <LifeBuoy className="size-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="size-4" />
            <span className="hidden sm:inline">My Tickets</span>
            {stats && stats.tickets.open > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{stats.tickets.open}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="size-4" />
            <span className="hidden sm:inline">Knowledge Base</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="size-4" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('tickets'); setStatusFilter('open'); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Eye className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.tickets.open || 0}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('tickets'); setStatusFilter('in_progress'); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.tickets.inProgress || 0}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('tickets'); setStatusFilter('waiting_customer'); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.tickets.waitingCustomer || 0}</p>
                    <p className="text-xs text-muted-foreground">Awaiting Reply</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('tickets'); setStatusFilter('resolved'); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.tickets.resolved || 0}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions + Announcements */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setNewTicketOpen(true)}
                >
                  <Plus className="size-4 text-emerald-500" />
                  Submit a Support Ticket
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setActiveTab('knowledge')}
                >
                  <BookOpen className="size-4 text-blue-500" />
                  Browse Knowledge Base
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setActiveTab('tickets')}
                >
                  <Ticket className="size-4 text-purple-500" />
                  View My Tickets
                </Button>
              </CardContent>
            </Card>

            {/* Latest Announcements */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Latest Updates</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('announcements')}>View all</Button>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map(ann => {
                      const typeConf = announcementTypeConfig[ann.type] || announcementTypeConfig.info;
                      return (
                        <div key={ann.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Megaphone className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{ann.title}</span>
                              {ann.isPinned && <Pin className="size-3 text-amber-500 shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn('text-[9px] h-4 px-1', typeConf.color)}>{typeConf.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">{formatRelative(ann.publishedAt || ann.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── My Tickets Tab ──────────────────────────────────────────────── */}
        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_customer">Awaiting Reply</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets List */}
          {ticketsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No tickets found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : "You haven't submitted any tickets yet"}
                </p>
                <Button className="mt-4 gap-2" onClick={() => setNewTicketOpen(true)}>
                  <Plus className="size-4" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const sConfig = statusConfig[ticket.status] || statusConfig.open;
                const pConfig = priorityConfig[ticket.priority] || priorityConfig.medium;
                const SIcon = sConfig.icon;
                const PIcon = pConfig.icon;

                return (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => fetchTicketDetail(ticket.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</span>
                            <Badge className={cn('text-[10px] h-4 px-1.5 gap-1', pConfig.color)}>
                              <PIcon className="size-2.5" />
                              {pConfig.label}
                            </Badge>
                            <Badge className={cn('text-[10px] h-4 px-1.5 gap-1', sConfig.color)}>
                              <SIcon className="size-2.5" />
                              {sConfig.label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatRelative(ticket.createdAt)}</span>
                            {ticket.assigneeName && <span>Assigned to {ticket.assigneeName}</span>}
                            {ticket.messages && ticket.messages.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="size-3" />
                                {ticket.messages.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Knowledge Base Tab ────────────────────────────────────────── */}
        <TabsContent value="knowledge" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search articles..." className="pl-9" />
            </div>
          </div>

          {kbArticles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No articles yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Knowledge base articles will appear here when published by the admin team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {kbArticles.map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="size-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm">{article.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{article.category}</Badge>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3" />
                            {article.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="size-3" />
                            {article.helpfulCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Announcements Tab ─────────────────────────────────────────── */}
        <TabsContent value="announcements" className="space-y-4">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Megaphone className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No announcements</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for updates from the team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map(ann => {
                const typeConf = announcementTypeConfig[ann.type] || announcementTypeConfig.info;
                return (
                  <Card key={ann.id} className={cn(ann.isPinned && 'border-amber-200 dark:border-amber-800')}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="size-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${ann.color}20`, color: ann.color }}
                        >
                          <Megaphone className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{ann.title}</h3>
                            {ann.isPinned && <Pin className="size-3 text-amber-500" />}
                            <Badge variant="outline" className={cn('text-[9px] h-4 px-1 ml-auto shrink-0', typeConf.color)}>
                              {typeConf.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatRelative(ann.publishedAt || ann.createdAt)}</span>
                            {ann.authorName && <span>by {ann.authorName}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
