'use client';

import { useState, useMemo } from 'react';
import {
  User, Search, Phone, Mail, MapPin, MessageSquare, Calendar, DollarSign,
  Wrench, Activity, Clock, Star, Tag, Plus, Send, FileText, Zap,
  ChevronRight, X, CheckCircle2, AlertCircle,
  ArrowUpRight, Receipt, MessageCircle, FileStack,
  Bot, Sparkles, Users, StickyNote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import {
  useCustomers,
  useCustomer360,
  useBookings,
} from '@/hooks/queries/use-supabase-queries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return '';
  }
}

function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(date: Date | string): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

function isThisWeek(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

// ─── Status Color Maps ──────────────────────────────────────────────────────

const jobStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
  assigned: { label: 'Assigned', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  overdue: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

const bookingStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  no_show: { label: 'No Show', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
};

const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 border-amber-200',
  'Repeat Customer': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'High-Value': 'bg-teal-100 text-teal-700 border-teal-200',
  'At-Risk': 'bg-red-100 text-red-700 border-red-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
  repeat: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'New Lead': 'bg-sky-100 text-sky-700 border-sky-200',
  Commercial: 'bg-violet-100 text-violet-700 border-violet-200',
};

const timelineEventTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  booking: { icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_update: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  campaign: { icon: Send, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  note: { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  call: { icon: Phone, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  form_submission: { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  lead: { icon: ArrowUpRight, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_created: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  job_completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_paid: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_created: { icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  review: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  whatsapp_sent: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  lead_converted: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
};

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'text-emerald-400',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 font-medium">{label}</span>
          <Icon className={cn('size-4', accent)} />
        </div>
        <p className="text-xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-600'
          )}
        />
      ))}
    </div>
  );
}

// ─── Timeline Event Group ────────────────────────────────────────────────────

function TimelineGroup({
  label,
  events,
}: {
  label: string;
  events: any[];
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</h4>
      <div className="space-y-1">
        {events.map((event, i) => {
          const config = timelineEventTypeConfig[event.eventType || event.type] ||
            timelineEventTypeConfig.message;
          const Icon = config.icon;
          return (
            <div
              key={event.id || i}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group"
            >
              <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', config.bg)}>
                <Icon className={cn('size-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {event.title || event.description || 'Event'}
                  </p>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {event.createdAt ? timeAgo(event.createdAt) : ''}
                  </span>
                </div>
                {event.description && event.title && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{event.description}</p>
                )}
                {event.actorName && (
                  <p className="text-[11px] text-slate-500 mt-0.5">by {event.actorName}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  isCustomer,
}: {
  message: any;
  isCustomer: boolean;
}) {
  return (
    <div className={cn('flex', isCustomer ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isCustomer
            ? 'bg-slate-800 text-slate-200 rounded-bl-md'
            : 'bg-emerald-600 text-white rounded-br-md'
        )}
      >
        <p>{message.body || message.lastMessageBody || message.content || ''}</p>
        <p className={cn('text-[10px] mt-1', isCustomer ? 'text-slate-500' : 'text-emerald-200')}>
          {message.createdAt ? formatDateTime(message.createdAt) : ''}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Customer360View() {
  const { auth } = useAppStore();
  const tenantId = auth?.tenant?.id;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch customer list
  const { data: customers = [], isLoading: customersLoading } = useCustomers(tenantId);

  // Fetch 360 data for selected customer
  const { data: customer360, isLoading: customer360Loading } = useCustomer360(selectedCustomerId || '');

  // Fetch bookings for selected customer
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(selectedCustomerId || undefined);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  // Extract data
  const customer = customer360?.customer;
  const jobs: any[] = customer360?.jobs || [];
  const invoices: any[] = customer360?.invoices || [];
  const conversations: any[] = customer360?.conversations || [];
  const timelineEvents: any[] = customer360?.timeline || [];
  const bookings: any[] = bookingsData?.bookings || (Array.isArray(bookingsData) ? bookingsData : []);

  // Computed stats
  const stats = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(
      i => i.status === 'pending' || i.status === 'overdue'
    );
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const outstandingBalance = pendingInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const avgRating =
      completedJobs.length > 0
        ? completedJobs.filter(j => j.customerRating).reduce((s, j) => s + (j.customerRating || 0), 0) /
          Math.max(completedJobs.filter(j => j.customerRating).length, 1)
        : 0;

    return {
      totalBookings: bookings.length,
      totalRevenue,
      completedJobs: completedJobs.length,
      avgRating: Math.round(avgRating * 10) / 10,
      outstandingBalance,
      totalJobs: jobs.length,
    };
  }, [jobs, invoices, bookings]);

  // Grouped timeline
  const groupedTimeline = useMemo(() => {
    const groups: { label: string; events: any[] }[] = [];
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const earlier: any[] = [];

    timelineEvents.forEach(event => {
      if (!event.createdAt) {
        earlier.push(event);
        return;
      }
      if (isToday(event.createdAt)) today.push(event);
      else if (isYesterday(event.createdAt)) yesterday.push(event);
      else if (isThisWeek(event.createdAt)) thisWeek.push(event);
      else earlier.push(event);
    });

    if (today.length > 0) groups.push({ label: 'Today', events: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', events: yesterday });
    if (thisWeek.length > 0) groups.push({ label: 'This Week', events: thisWeek });
    if (earlier.length > 0) groups.push({ label: 'Earlier', events: earlier });

    return groups;
  }, [timelineEvents]);

  // Parse tags from customer data
  const customerTags = useMemo(() => {
    if (!customer) return [];
    const raw = (customer as any).tags;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : raw ? [raw] : [];
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [];
  }, [customer]);

  // ─── No customer selected — show list ─────────────────────────────────────
  if (!selectedCustomerId) {
    return (
      <div className="h-full flex flex-col bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600/10">
              <User className="size-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Customer 360&deg;</h1>
              <p className="text-sm text-slate-400">Everything about a customer on a single screen</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Customer Grid */}
        <div className="flex-1 min-h-0 px-6 pb-6">
          {customersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Skeleton className="size-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-12 text-slate-700 mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">No customers found</h3>
              <p className="text-sm text-slate-500 max-w-md mt-1">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Customers will appear here once they are added'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCustomers.map((c: any) => (
                  <Card
                    key={c.id}
                    className="bg-slate-900/60 border-slate-800 hover:border-emerald-600/50 cursor-pointer transition-all hover:bg-slate-900"
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12 border-2 border-slate-700">
                          <AvatarFallback className="bg-emerald-600/20 text-emerald-400 font-bold">
                            {getInitials(c.name || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                          {c.email && (
                            <p className="text-xs text-slate-500 truncate">{c.email}</p>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-slate-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  // ─── Customer Selected — show 360 view ─────────────────────────────────────
  const c = customer;

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Top bar with back */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5"
          onClick={() => setSelectedCustomerId(null)}
        >
          <ChevronRight className="size-4 rotate-180" />
          Back
        </Button>
        <div className="flex-1" />
        <h1 className="text-sm font-semibold text-slate-300">
          Customer 360&deg;
        </h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* ─── Left Sidebar — Profile Panel ─────────────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0">
          <ScrollArea className="h-full max-h-[calc(100vh-8rem)]">
            {customer360Loading ? (
              <ProfileSkeleton />
            ) : c ? (
              <div className="p-5 space-y-5">
                {/* Avatar & Name */}
                <div className="flex items-start gap-4">
                  <Avatar className="size-16 border-2 border-emerald-600/30">
                    <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-xl font-bold">
                      {getInitials(c.name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{c.name}</h2>
                    {c.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="size-3 shrink-0" /> {c.email}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <Phone className="size-3 shrink-0" /> {c.phone}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {customerTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customerTags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn(
                          'text-[10px] px-2 py-0.5',
                          tagColors[tag] || 'bg-slate-800 text-slate-300 border-slate-700'
                        )}
                      >
                        <Tag className="size-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator className="bg-slate-800" />

                {/* Contact Details */}
                <div className="space-y-2.5">
                  {c.whatsappId && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <MessageSquare className="size-4 text-emerald-500 shrink-0" />
                      <span className="text-slate-300 truncate">{c.whatsappId}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin className="size-4 text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{c.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="size-4 text-slate-500 shrink-0" />
                    <span className="text-slate-400">
                      Customer since{' '}
                      <span className="text-slate-300">{formatDate(c.createdAt)}</span>
                    </span>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 justify-start"
                      onClick={() =>
                        toast.info('WhatsApp integration coming soon', {
                          description: c.whatsappId || c.phone,
                        })
                      }
                    >
                      <MessageSquare className="size-3.5" /> Send WhatsApp
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
                        onClick={() =>
                          toast.info('Booking creation coming soon', {
                            description: `Create booking for ${c.name}`,
                          })
                        }
                      >
                        <Calendar className="size-3.5" /> Book
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
                        onClick={() =>
                          toast.info('Invoice creation coming soon', {
                            description: `Create invoice for ${c.name}`,
                          })
                        }
                      >
                        <Receipt className="size-3.5" /> Invoice
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Mini Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{stats.totalJobs}</p>
                    <p className="text-[10px] text-slate-500">Total Jobs</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-[10px] text-slate-500">Revenue</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{stats.completedJobs}</p>
                    <p className="text-[10px] text-slate-500">Completed</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg font-bold text-amber-400">
                        {stats.avgRating > 0 ? stats.avgRating : '—'}
                      </span>
                      {stats.avgRating > 0 && <StarRating rating={stats.avgRating} />}
                    </div>
                    <p className="text-[10px] text-slate-500">Avg Rating</p>
                  </div>
                </div>

                {/* Outstanding Balance */}
                {stats.outstandingBalance > 0 && (
                  <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-red-400" />
                        <span className="text-xs text-red-300 font-medium">Outstanding</span>
                      </div>
                      <span className="text-sm font-bold text-red-400">
                        {formatCurrency(stats.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <AlertCircle className="size-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Could not load customer details</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ─── Main Content Area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* KPI Cards Row */}
          <div className="p-4 border-b border-slate-800 shrink-0">
            {customer360Loading ? (
              <KpiSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiCard
                  label="Total Bookings"
                  value={stats.totalBookings}
                  icon={Calendar}
                  accent="text-sky-400"
                />
                <KpiCard
                  label="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={DollarSign}
                  accent="text-emerald-400"
                />
                <KpiCard
                  label="Completed Jobs"
                  value={stats.completedJobs}
                  icon={CheckCircle2}
                  accent="text-emerald-400"
                />
                <KpiCard
                  label="Avg Rating"
                  value={stats.avgRating > 0 ? `${stats.avgRating} / 5` : '—'}
                  icon={Star}
                  accent="text-amber-400"
                />
                <KpiCard
                  label="Outstanding"
                  value={formatCurrency(stats.outstandingBalance)}
                  icon={AlertCircle}
                  accent={stats.outstandingBalance > 0 ? 'text-red-400' : 'text-slate-500'}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b border-slate-800 px-4 shrink-0">
                <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <Activity className="size-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="conversations"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <MessageCircle className="size-3.5" /> Conversations
                    {conversations.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-emerald-600 text-white flex items-center justify-center">
                        {conversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookings"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <Calendar className="size-3.5" /> Bookings
                  </TabsTrigger>
                  <TabsTrigger
                    value="jobs"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <Wrench className="size-3.5" /> Jobs
                    {jobs.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-slate-700 text-slate-300 flex items-center justify-center">
                        {jobs.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="invoices"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <Receipt className="size-3.5" /> Invoices
                    {invoices.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-slate-700 text-slate-300 flex items-center justify-center">
                        {invoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <FileStack className="size-3.5" /> Documents
                  </TabsTrigger>
                  <TabsTrigger
                    value="automation"
                    className="data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 hover:text-slate-200 rounded-md px-3 h-9 text-xs gap-1.5"
                  >
                    <Zap className="size-3.5" /> Automation
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                {/* ─── Overview Tab ─────────────────────────────────────────── */}
                <TabsContent value="overview" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {customer360Loading ? (
                        <TimelineSkeleton />
                      ) : groupedTimeline.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Clock className="size-10 text-slate-700 mb-3" />
                          <h3 className="text-base font-semibold text-slate-400">
                            No activity yet
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Activity timeline will populate as the customer interacts
                          </p>
                        </div>
                      ) : (
                        groupedTimeline.map(group => (
                          <TimelineGroup
                            key={group.label}
                            label={group.label}
                            events={group.events}
                          />
                        ))
                      )}

                      {/* Recent Jobs Quick View */}
                      {jobs.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Recent Jobs
                          </h4>
                          <div className="space-y-2">
                            {jobs.slice(0, 3).map(job => {
                              const statusCfg = jobStatusConfig[job.status] || jobStatusConfig.pending;
                              return (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                      <Wrench className="size-3.5 text-amber-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-200 truncate">
                                        {job.title || job.service || 'Service'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {job.assigneeName || 'Unassigned'} &middot;{' '}
                                        {formatDate(job.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] shrink-0',
                                      statusCfg.bg,
                                      statusCfg.color
                                    )}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Conversations Tab ────────────────────────────────────── */}
                <TabsContent value="conversations" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5">
                      {customer360Loading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skeleton className="size-8 rounded-full" />
                              <Skeleton className="h-12 w-64 rounded-xl" />
                            </div>
                          ))}
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <MessageCircle className="size-10 text-slate-700 mb-3" />
                          <h3 className="text-base font-semibold text-slate-400">
                            No conversations
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Conversations from WhatsApp, SMS, and Email will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {conversations.map((conv: any) => (
                            <Card
                              key={conv.id}
                              className="bg-slate-900/60 border-slate-800"
                            >
                              <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="size-4 text-emerald-500" />
                                    <CardTitle className="text-sm text-slate-200">
                                      {conv.customerName || conv.customerPhone || 'Conversation'}
                                    </CardTitle>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px]',
                                        conv.channel === 'whatsapp'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-800'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      )}
                                    >
                                      {conv.channel || 'chat'}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px]',
                                        conv.status === 'active'
                                          ? 'bg-sky-500/10 text-sky-400 border-sky-800'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      )}
                                    >
                                      {conv.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-2">
                                <div className="space-y-2">
                                  {conv.lastMessageBody && (
                                    <ChatBubble
                                      message={conv}
                                      isCustomer={conv.lastDirection !== 'outbound'}
                                    />
                                  )}
                                  {conv.messagesJson && (() => {
                                    try {
                                      const msgs = JSON.parse(conv.messagesJson);
                                      if (Array.isArray(msgs) && msgs.length > 0) {
                                        return msgs.slice(-5).map((msg: any, idx: number) => (
                                          <ChatBubble
                                            key={idx}
                                            message={msg}
                                            isCustomer={msg.senderType === 'customer'}
                                          />
                                        ));
                                      }
                                    } catch { /* ignore parse errors */ }
                                    return null;
                                  })()}
                                  <p className="text-[10px] text-slate-600 text-right">
                                    {conv.lastMessageAt
                                      ? formatDateTime(conv.lastMessageAt)
                                      : ''}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Bookings Tab ─────────────────────────────────────────── */}
                <TabsContent value="bookings" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-5">
                      {bookingsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Calendar className="size-10 text-slate-700 mb-3" />
                          <h3 className="text-base font-semibold text-slate-400">
                            No bookings
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Bookings for this customer will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Upcoming */}
                          {bookings.filter(
                            (b: any) =>
                              b.status === 'confirmed' || b.status === 'pending'
                          ).length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="size-3.5" /> Upcoming
                              </h4>
                              {bookings
                                .filter(
                                  (b: any) =>
                                    b.status === 'confirmed' || b.status === 'pending'
                                )
                                .map((booking: any) => {
                                  const statusCfg =
                                    bookingStatusConfig[booking.status] ||
                                    bookingStatusConfig.pending;
                                  return (
                                    <div
                                      key={booking.id}
                                      className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate">
                                          {booking.title || 'Booking'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {booking.scheduledAt
                                            ? formatDateTime(booking.scheduledAt)
                                            : 'No date set'}
                                          {booking.employee?.name &&
                                            ` · ${booking.employee.name}`}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[10px] shrink-0',
                                          statusCfg.bg,
                                          statusCfg.color
                                        )}
                                      >
                                        {statusCfg.label}
                                      </Badge>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Completed */}
                          {bookings.filter((b: any) => b.status === 'completed').length >
                            0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="size-3.5" /> Completed
                              </h4>
                              {bookings
                                .filter((b: any) => b.status === 'completed')
                                .map((booking: any) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-200 truncate">
                                        {booking.title || 'Booking'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {booking.scheduledAt
                                          ? formatDate(booking.scheduledAt)
                                          : ''}
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-800"
                                    >
                                      Completed
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Cancelled */}
                          {bookings.filter((b: any) => b.status === 'cancelled').length >
                            0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <X className="size-3.5" /> Cancelled
                              </h4>
                              {bookings
                                .filter((b: any) => b.status === 'cancelled')
                                .map((booking: any) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 opacity-60"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-300 line-through truncate">
                                        {booking.title || 'Booking'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {booking.scheduledAt
                                          ? formatDate(booking.scheduledAt)
                                          : ''}
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 bg-red-500/10 text-red-400 border-red-800"
                                    >
                                      Cancelled
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Jobs Tab ─────────────────────────────────────────────── */}
                <TabsContent value="jobs" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-3">
                      {customer360Loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))
                      ) : jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Wrench className="size-10 text-slate-700 mb-3" />
                          <h3 className="text-base font-semibold text-slate-400">
                            No jobs yet
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Jobs assigned to this customer will appear here
                          </p>
                        </div>
                      ) : (
                        jobs.map(job => {
                          const statusCfg =
                            jobStatusConfig[job.status] || jobStatusConfig.pending;
                          return (
                            <div
                              key={job.id}
                              className="flex items-center justify-between p-4 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'size-10 rounded-full flex items-center justify-center shrink-0',
                                    job.status === 'completed'
                                      ? 'bg-emerald-500/10'
                                      : job.status === 'in_progress'
                                        ? 'bg-amber-500/10'
                                        : job.status === 'cancelled'
                                          ? 'bg-red-500/10'
                                          : 'bg-slate-700/50'
                                  )}
                                >
                                  <Wrench
                                    className={cn(
                                      'size-4',
                                      job.status === 'completed'
                                        ? 'text-emerald-500'
                                        : job.status === 'in_progress'
                                          ? 'text-amber-500'
                                          : job.status === 'cancelled'
                                            ? 'text-red-500'
                                            : 'text-slate-400'
                                    )}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">
                                    {job.title || job.service || 'Service'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {job.assigneeName || 'Unassigned'} &middot;{' '}
                                    {formatDate(job.createdAt)}
                                  </p>
                                  {job.address && (
                                    <p className="text-xs text-slate-600 truncate flex items-center gap-1">
                                      <MapPin className="size-2.5" /> {job.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {job.scheduledAt && (
                                  <span className="text-[11px] text-slate-500 hidden sm:block">
                                    {formatDate(job.scheduledAt)}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    statusCfg.bg,
                                    statusCfg.color
                                  )}
                                >
                                  {statusCfg.label}
                                </Badge>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Invoices Tab ─────────────────────────────────────────── */}
                <TabsContent value="invoices" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-5">
                      {customer360Loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))
                      ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Receipt className="size-10 text-slate-700 mb-3" />
                          <h3 className="text-base font-semibold text-slate-400">
                            No invoices
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Invoices for this customer will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Paid */}
                          {invoices.filter((i: any) => i.status === 'paid').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="size-3.5 text-emerald-500" /> Paid
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'paid')
                                .map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-200">
                                        {inv.number || inv.invoiceNumber || 'Invoice'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {formatDate(inv.createdAt)}
                                        {inv.paidAt ? ` · Paid ${formatDate(inv.paidAt)}` : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-sm font-semibold text-emerald-400">
                                        {formatCurrency(inv.total)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-800"
                                      >
                                        Paid
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Pending */}
                          {invoices.filter((i: any) => i.status === 'pending').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="size-3.5 text-amber-500" /> Pending
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'pending')
                                .map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-amber-800/30"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-200">
                                        {inv.number || inv.invoiceNumber || 'Invoice'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {formatDate(inv.createdAt)}
                                        {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-sm font-semibold text-amber-400">
                                        {formatCurrency(inv.total)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-800"
                                      >
                                        Pending
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Overdue */}
                          {invoices.filter((i: any) => i.status === 'overdue').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="size-3.5 text-red-500" /> Overdue
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'overdue')
                                .map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center justify-between p-3 bg-red-950/20 rounded-lg border border-red-900/40"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-200">
                                        {inv.number || inv.invoiceNumber || 'Invoice'}
                                      </p>
                                      <p className="text-xs text-red-400">
                                        Due {inv.dueDate ? formatDate(inv.dueDate) : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-sm font-semibold text-red-400">
                                        {formatCurrency(inv.total)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-red-500/10 text-red-400 border-red-800"
                                      >
                                        Overdue
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Draft */}
                          {invoices.filter((i: any) => i.status === 'draft').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Draft
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'draft')
                                .map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 opacity-70"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-300">
                                        {inv.number || inv.invoiceNumber || 'Invoice'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {formatDate(inv.createdAt)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-sm font-semibold text-slate-400">
                                        {formatCurrency(inv.total)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-slate-800 text-slate-400 border-slate-700"
                                      >
                                        Draft
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Documents Tab ────────────────────────────────────────── */}
                <TabsContent value="documents" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5">
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FileStack className="size-10 text-slate-700 mb-3" />
                        <h3 className="text-base font-semibold text-slate-400">
                          Documents
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Upload and manage documents for this customer. Contracts, proposals, and other files will appear here.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
                          onClick={() => toast.info('Document upload coming soon')}
                        >
                          <Plus className="size-3.5" /> Upload Document
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Automation Tab ───────────────────────────────────────── */}
                <TabsContent value="automation" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-5">
                      {/* Automation Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <Card className="bg-slate-900/60 border-slate-800">
                          <CardContent className="p-3 text-center">
                            <Bot className="size-5 text-emerald-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">
                              {timelineEvents.filter(
                                (e: any) =>
                                  e.actorType === 'system' || e.actorType === 'bot'
                              ).length}
                            </p>
                            <p className="text-[10px] text-slate-500">Triggers Fired</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-slate-900/60 border-slate-800">
                          <CardContent className="p-3 text-center">
                            <Send className="size-5 text-sky-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">
                              {timelineEvents.filter(
                                (e: any) =>
                                  e.eventType === 'message' ||
                                  e.eventType === 'whatsapp_sent'
                              ).length}
                            </p>
                            <p className="text-[10px] text-slate-500">Messages Sent</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-slate-900/60 border-slate-800">
                          <CardContent className="p-3 text-center">
                            <Zap className="size-5 text-amber-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-white">
                              {timelineEvents.filter((e: any) =>
                                e.eventType?.includes('lead') ||
                                e.eventType?.includes('booking') ||
                                e.eventType?.includes('invoice')
                              ).length}
                            </p>
                            <p className="text-[10px] text-slate-500">Workflows Run</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Automation History */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Workflow History
                        </h4>
                        {timelineEvents
                          .filter(
                            (e: any) =>
                              e.actorType === 'system' ||
                              e.actorType === 'bot' ||
                              e.eventType === 'whatsapp_sent' ||
                              e.eventType === 'campaign' ||
                              e.eventType === 'lead_converted'
                          )
                          .length === 0 ? (
                          <div className="text-center py-8">
                            <Zap className="size-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">
                              No automation events yet
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Automated workflows will be recorded here
                            </p>
                          </div>
                        ) : (
                          timelineEvents
                            .filter(
                              (e: any) =>
                                e.actorType === 'system' ||
                                e.actorType === 'bot' ||
                                e.eventType === 'whatsapp_sent' ||
                                e.eventType === 'campaign' ||
                                e.eventType === 'lead_converted'
                            )
                            .map((event: any, i: number) => {
                              const config =
                                timelineEventTypeConfig[event.eventType] ||
                                timelineEventTypeConfig.message;
                              const Icon = config.icon;
                              return (
                                <div
                                  key={event.id || i}
                                  className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800"
                                >
                                  <div
                                    className={cn(
                                      'size-8 rounded-full flex items-center justify-center shrink-0',
                                      config.bg
                                    )}
                                  >
                                    <Icon className={cn('size-3.5', config.color)} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-200">
                                      {event.title}
                                    </p>
                                    {event.description && (
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        {event.description}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                      {event.createdAt ? formatDateTime(event.createdAt) : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
