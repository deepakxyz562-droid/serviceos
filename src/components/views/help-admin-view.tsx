'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  ShieldCheck,
  Search,
  Ticket,
  BookOpen,
  FolderTree,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  ArrowLeft,
  ChevronRight,
  Filter,
  Loader2,
  StickyNote,
  UserCircle,
  RefreshCw,
  MessageSquare,
  Lock,
  Pin,
  MoreHorizontal,
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDemoPageSize } from '@/hooks/use-demo-page-size';

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
  expiresAt?: string;
  authorName?: string;
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

// ─── Config ─────────────────────────────────────────────────────────────────

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  waiting_customer: { label: 'Waiting', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  resolved: { label: 'Resolved', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

const annTypeConfig: Record<string, { label: string; color: string }> = {
  new_feature: { label: 'New Feature', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  bug_fix: { label: 'Bug Fix', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  system_update: { label: 'System Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  info: { label: 'Info', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HelpAdminView() {
  const { auth, setCurrentView } = useAppStore();
  // Demo-mode page size cap (5 for demo tenant, else 50)
  const demoPageSize = useDemoPageSize(50);
  const activeView = (auth.user?.isSuperAdmin || auth.user?.role === 'superadmin') ?
    (window.location.pathname === '/help-admin-kb' ? 'kb' : 'default') : 'default';

  const [activeTab, setActiveTab] = useState('tickets');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Reply
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', icon: 'FolderOpen', color: '#0f766e', sortOrder: 0, isActive: true });
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  // Announcement dialog
  const [annDialogOpen, setAnnDialogOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', type: 'info', priority: 'normal', status: 'draft', targetRole: 'all', icon: 'Bell', color: '#0f766e', isPinned: false });
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [deleteAnn, setDeleteAnn] = useState<Announcement | null>(null);

  // ─── Fetches ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/support/stats');
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', String(demoPageSize));
      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) { console.error(err); } finally { setTicketsLoading(false); }
  }, [statusFilter, priorityFilter, searchQuery, demoPageSize]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/support/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/announcements?limit=${demoPageSize}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) { console.error(err); }
  }, [demoPageSize]);

  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (res.ok) setSelectedTicket(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchCategories(), fetchAnnouncements(), fetchTickets()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchCategories, fetchAnnouncements, fetchTickets]);

  useEffect(() => {
    if (!loading) fetchTickets();
  }, [statusFilter, priorityFilter, fetchTickets]);

  // ─── Ticket Actions ───────────────────────────────────────────────────

  const handleUpdateTicket = async (ticketId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success('Ticket updated');
        fetchTickets();
        fetchStats();
        if (selectedTicket?.id === ticketId) fetchTicketDetail(ticketId);
      }
    } catch {
      toast.error('Failed to update ticket');
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, isInternal }),
      });
      if (res.ok) {
        toast.success(isInternal ? 'Internal note added' : 'Reply sent');
        setReplyContent('');
        setIsInternal(false);
        fetchTicketDetail(selectedTicket.id);
      }
    } catch {
      toast.error('Failed to send');
    } finally { setReplying(false); }
  };

  // ─── Category Actions ─────────────────────────────────────────────────

  const handleCategorySubmit = async () => {
    if (!categoryForm.name || !categoryForm.slug) {
      toast.error('Name and slug are required');
      return;
    }
    setCatSubmitting(true);
    try {
      const url = editCategory ? `/api/support/categories/${editCategory.id}` : '/api/support/categories';
      const method = editCategory ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });
      if (res.ok) {
        toast.success(editCategory ? 'Category updated' : 'Category created');
        setCategoryDialogOpen(false);
        setEditCategory(null);
        setCategoryForm({ name: '', slug: '', description: '', icon: 'FolderOpen', color: '#0f766e', sortOrder: 0, isActive: true });
        fetchCategories();
      }
    } catch {
      toast.error('Failed to save category');
    } finally { setCatSubmitting(false); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    try {
      const res = await fetch(`/api/support/categories/${deleteCategory.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete category');
    }
    setDeleteCategory(null);
  };

  const handleSeedCategories = async () => {
    try {
      const res = await fetch('/api/support/categories', { method: 'PUT' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.created} categories seeded`);
        fetchCategories();
      }
    } catch {
      toast.error('Failed to seed categories');
    }
  };

  // ─── Announcement Actions ─────────────────────────────────────────────

  const handleAnnSubmit = async () => {
    if (!annForm.title || !annForm.content) {
      toast.error('Title and content are required');
      return;
    }
    setAnnSubmitting(true);
    try {
      const url = editAnn ? `/api/support/announcements/${editAnn.id}` : '/api/support/announcements';
      const method = editAnn ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annForm),
      });
      if (res.ok) {
        toast.success(editAnn ? 'Announcement updated' : 'Announcement created');
        setAnnDialogOpen(false);
        setEditAnn(null);
        setAnnForm({ title: '', content: '', type: 'info', priority: 'normal', status: 'draft', targetRole: 'all', icon: 'Bell', color: '#0f766e', isPinned: false });
        fetchAnnouncements();
        fetchStats();
      }
    } catch {
      toast.error('Failed to save announcement');
    } finally { setAnnSubmitting(false); }
  };

  const handleDeleteAnn = async () => {
    if (!deleteAnn) return;
    try {
      await fetch(`/api/support/announcements/${deleteAnn.id}`, { method: 'DELETE' });
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete');
    }
    setDeleteAnn(null);
  };

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ─── Ticket Detail ──────────────────────────────────────────────────────

  if (selectedTicket) {
    const sConfig = statusConfig[selectedTicket.status] || statusConfig.open;
    const pConfig = priorityConfig[selectedTicket.priority] || priorityConfig.medium;

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="gap-2">
            <ArrowLeft className="size-4" /> Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ticket className="size-4" /> {selectedTicket.ticketNumber}
                </div>
                <CardTitle className="text-xl">{selectedTicket.subject}</CardTitle>
                <CardDescription>
                  By {selectedTicket.reporterName || 'Unknown'} ({selectedTicket.reporterEmail || 'no email'}) • {formatRelative(selectedTicket.createdAt)}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Select
                  value={selectedTicket.status}
                  onValueChange={(val) => handleUpdateTicket(selectedTicket.id, { status: val })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedTicket.priority}
                  onValueChange={(val) => handleUpdateTicket(selectedTicket.id, { priority: val })}
                >
                  <SelectTrigger className="w-[150px]">
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
          </CardHeader>
          <CardContent>
            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{selectedTicket.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="font-medium capitalize">{selectedTicket.source}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Assignee</span>
                <p className="font-medium">{selectedTicket.assigneeName || 'Unassigned'}</p>
              </div>
              {selectedTicket.firstResponseAt && (
                <div>
                  <span className="text-muted-foreground">First Response</span>
                  <p className="font-medium">{formatRelative(selectedTicket.firstResponseAt)}</p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Conversation */}
            <ScrollArea className="max-h-[50vh] pr-2">
              <div className="space-y-4">
                {(selectedTicket.messages || []).map((msg) => {
                  const isUser = msg.authorRole === 'user';
                  const isAdmin = msg.authorRole === 'admin';
                  return (
                    <div key={msg.id} className={cn(
                      'rounded-xl p-4',
                      msg.isInternal ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                      isUser ? 'bg-muted' : 'bg-blue-50 dark:bg-blue-900/20'
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="size-6">
                          <AvatarFallback className={cn('text-[10px]', isUser ? 'bg-emerald-600 text-white' : isAdmin ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white')}>
                            {(msg.authorName || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{msg.authorName || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {msg.authorRole}
                        </Badge>
                        {msg.isInternal && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-100 text-amber-700 border-amber-300">
                            <Lock className="size-2.5 mr-0.5" /> Internal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelative(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Reply */}
            {selectedTicket.status !== 'closed' && (
              <div className="mt-4 space-y-3">
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Reply</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      <Lock className="size-3" />
                      Internal Note
                    </label>
                  </div>
                  <Textarea
                    placeholder={isInternal ? 'Add internal note (not visible to user)...' : 'Type your reply...'}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">⌘+Enter to send</span>
                    <div className="flex gap-2">
                      {selectedTicket.status !== 'waiting_customer' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'waiting_customer' })}
                        >
                          Waiting for Customer
                        </Button>
                      )}
                      <Button size="sm" onClick={handleReply} disabled={!replyContent.trim() || replying} className="gap-2">
                        {replying ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        {isInternal ? 'Add Note' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Admin Dashboard ────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="size-6 text-red-500" />
            Support Admin
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage support tickets, knowledge base, and announcements</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats?.tickets.total || 0, icon: Ticket, color: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Open', value: stats?.tickets.open || 0, icon: Eye, color: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'In Progress', value: stats?.tickets.inProgress || 0, icon: Clock, color: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Waiting', value: stats?.tickets.waitingCustomer || 0, icon: AlertCircle, color: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Resolved', value: stats?.tickets.resolved || 0, icon: CheckCircle2, color: 'bg-teal-100 dark:bg-teal-900/30' },
          { label: 'Urgent', value: stats?.tickets.urgent || 0, icon: AlertCircle, color: 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Unassigned', value: stats?.tickets.unassigned || 0, icon: UserCircle, color: 'bg-orange-100 dark:bg-orange-900/30' },
        ].map(stat => (
          <Card key={stat.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('tickets'); if (stat.label === 'Urgent') setPriorityFilter('urgent'); }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn('size-8 rounded-lg flex items-center justify-center', stat.color)}>
                  <stat.icon className="size-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="size-4" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="size-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="size-4" /> Announcements
          </TabsTrigger>
        </TabsList>

        {/* ─── Tickets Tab ──────────────────────────────────────────────── */}
        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_customer">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchTickets} className="gap-2">
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>

          {/* Tickets Table */}
          {ticketsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-emerald-500" /></div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No tickets found</h3>
                <p className="text-sm text-muted-foreground mt-1">Adjust your filters or wait for new tickets</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => {
                    const sConf = statusConfig[ticket.status] || statusConfig.open;
                    const pConf = priorityConfig[ticket.priority] || priorityConfig.medium;
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => fetchTicketDetail(ticket.id)}
                      >
                        <TableCell className="font-mono text-xs">{ticket.ticketNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">{ticket.subject}</TableCell>
                        <TableCell className="text-sm">{ticket.reporterName || 'Unknown'}</TableCell>
                        <TableCell><Badge className={cn('text-[10px]', pConf.color)}>{pConf.label}</Badge></TableCell>
                        <TableCell><Badge className={cn('text-[10px]', sConf.color)}>{sConf.label}</Badge></TableCell>
                        <TableCell className="text-sm">{ticket.assigneeName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatRelative(ticket.createdAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'in_progress', assigneeId: auth.user?.id, assigneeName: auth.user?.name }); }}>
                                Assign to Me
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'waiting_customer' }); }}>
                                Set Waiting
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'resolved' }); }}>
                                Resolve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'closed' }); }}>
                                Close
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ─── Categories Tab ────────────────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Support Categories</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSeedCategories} className="gap-2">
                <RefreshCw className="size-3.5" /> Seed Defaults
              </Button>
              <Button size="sm" onClick={() => {
                setEditCategory(null);
                setCategoryForm({ name: '', slug: '', description: '', icon: 'FolderOpen', color: '#0f766e', sortOrder: 0, isActive: true });
                setCategoryDialogOpen(true);
              }} className="gap-2">
                <Plus className="size-3.5" /> New Category
              </Button>
            </div>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderTree className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No categories</h3>
                <p className="text-sm text-muted-foreground mt-1">Click &quot;Seed Defaults&quot; to add default categories or create new ones</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map(cat => (
                <Card key={cat.id} className={cn(!cat.isActive && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <FolderTree className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{cat.name}</h3>
                          <p className="text-xs text-muted-foreground">{cat.slug}</p>
                          {cat.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{cat.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {cat.isSystem && <Badge variant="outline" className="text-[9px] h-4 px-1">System</Badge>}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditCategory(cat);
                              setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon, color: cat.color, sortOrder: cat.sortOrder, isActive: cat.isActive });
                              setCategoryDialogOpen(true);
                            }}>
                              <Pencil className="size-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            {!cat.isSystem && (
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCategory(cat)}>
                                <Trash2 className="size-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Category Dialog */}
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={categoryForm.name} onChange={(e) => {
                      setCategoryForm(prev => ({ ...prev, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') }));
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input value={categoryForm.slug} onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Active</Label>
                    <Select value={categoryForm.isActive ? 'true' : 'false'} onValueChange={(val) => setCategoryForm(prev => ({ ...prev, isActive: val === 'true' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCategorySubmit} disabled={catSubmitting}>
                  {catSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {editCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Category Alert */}
          <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deleteCategory?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ─── Announcements Tab ─────────────────────────────────────────── */}
        <TabsContent value="announcements" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Announcements</h2>
            <Button size="sm" onClick={() => {
              setEditAnn(null);
              setAnnForm({ title: '', content: '', type: 'info', priority: 'normal', status: 'draft', targetRole: 'all', icon: 'Bell', color: '#0f766e', isPinned: false });
              setAnnDialogOpen(true);
            }} className="gap-2">
              <Plus className="size-3.5" /> New Announcement
            </Button>
          </div>

          {announcements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Megaphone className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No announcements</h3>
                <p className="text-sm text-muted-foreground mt-1">Create your first announcement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => {
                const tConf = annTypeConfig[ann.type] || annTypeConfig.info;
                return (
                  <Card key={ann.id} className={cn(ann.isPinned && 'border-amber-200 dark:border-amber-800')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="size-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${ann.color}20`, color: ann.color }}>
                            <Megaphone className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-sm">{ann.title}</h3>
                              {ann.isPinned && <Pin className="size-3 text-amber-500" />}
                              <Badge variant="outline" className={cn('text-[9px] h-4 px-1', tConf.color)}>{tConf.label}</Badge>
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                {ann.status === 'published' ? '✓ Published' : ann.status === 'draft' ? 'Draft' : 'Archived'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{formatRelative(ann.publishedAt || ann.createdAt)}</span>
                              {ann.authorName && <span>by {ann.authorName}</span>}
                              <Badge variant="outline" className="text-[9px] h-4 px-1">→ {ann.targetRole}</Badge>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 shrink-0">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditAnn(ann);
                              setAnnForm({
                                title: ann.title, content: ann.content, type: ann.type,
                                priority: ann.priority, status: ann.status, targetRole: ann.targetRole,
                                icon: ann.icon, color: ann.color, isPinned: ann.isPinned,
                              });
                              setAnnDialogOpen(true);
                            }}>
                              <Pencil className="size-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            {ann.status === 'draft' && (
                              <DropdownMenuItem onClick={async () => {
                                await fetch(`/api/support/announcements/${ann.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'published' }),
                                });
                                toast.success('Announcement published');
                                fetchAnnouncements();
                              }}>
                                <Eye className="size-3.5 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAnn(ann)}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Announcement Dialog */}
          <Dialog open={annDialogOpen} onOpenChange={setAnnDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editAnn ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={annForm.title} onChange={(e) => setAnnForm(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea value={annForm.content} onChange={(e) => setAnnForm(prev => ({ ...prev, content: e.target.value }))} className="min-h-[120px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={annForm.type} onValueChange={(val) => setAnnForm(prev => ({ ...prev, type: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="new_feature">New Feature</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="bug_fix">Bug Fix</SelectItem>
                        <SelectItem value="system_update">System Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={annForm.priority} onValueChange={(val) => setAnnForm(prev => ({ ...prev, priority: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={annForm.status} onValueChange={(val) => setAnnForm(prev => ({ ...prev, status: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Role</Label>
                    <Select value={annForm.targetRole} onValueChange={(val) => setAnnForm(prev => ({ ...prev, targetRole: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="tenant">Tenants Only</SelectItem>
                        <SelectItem value="superadmin">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input type="color" value={annForm.color} onChange={(e) => setAnnForm(prev => ({ ...prev, color: e.target.value }))} className="h-9 w-20" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-6">
                    <input type="checkbox" checked={annForm.isPinned} onChange={(e) => setAnnForm(prev => ({ ...prev, isPinned: e.target.checked }))} className="rounded" />
                    <Pin className="size-4" />
                    <span className="text-sm">Pin to top</span>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAnnDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAnnSubmit} disabled={annSubmitting}>
                  {annSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {editAnn ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Announcement Alert */}
          <AlertDialog open={!!deleteAnn} onOpenChange={() => setDeleteAnn(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deleteAnn?.title}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAnn} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
