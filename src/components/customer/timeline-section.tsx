'use client';

/**
 * Customer Timeline Section (V1.5)
 * --------------------------------
 * A unified chronological timeline shown on the Customer 360 page.
 *
 * Pulls from /api/customers/[id]/timeline which merges:
 *   • Explicit CustomerTimelineEntry rows (notes, logged calls/emails, …)
 *   • Aggregated leads / jobs / invoices / JobPhoto / JobSignature
 *
 * Features:
 *   • Filter tabs: All | Communications | Jobs | Invoices | Notes | Photos
 *   • Vertical timeline with entry-type-specific icons on a left rail
 *   • Add Internal Note box at the top
 *   • Quick-action buttons to log a manual call or email
 *   • Load more pagination
 *   • Internal notes show a subtle amber background
 *   • Pinned entries show a pin icon at top
 */

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Briefcase,
  FileText,
  DollarSign,
  Camera,
  PenLine,
  Star,
  LifeBuoy,
  StickyNote,
  MapPin,
  Package,
  Target,
  ArrowUpRight,
  Pin,
  Plus,
  Loader2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  entryType: string;
  title: string;
  description: string | null;
  sourceType: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown>;
  actorId: string | null;
  actorName: string | null;
  actorType: string;
  eventDate: string;
  isInternal: boolean;
  isPinned: boolean;
  isExplicit: boolean;
}

interface TimelineResponse {
  entries: TimelineEntry[];
  total: number;
  sources: {
    leads: number;
    jobs: number;
    invoices: number;
    photos: number;
    signatures: number;
    manual: number;
  };
}

// ─── Style maps ─────────────────────────────────────────────────────────────

const ENTRY_TYPE_CONFIG: Record<
  string,
  { icon: typeof Phone; color: string; bg: string; label: string }
> = {
  lead: {
    icon: Target,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 ring-sky-500/20',
    label: 'Lead',
  },
  call: {
    icon: Phone,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/20',
    label: 'Call',
  },
  email: {
    icon: Mail,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10 ring-violet-500/20',
    label: 'Email',
  },
  whatsapp: {
    icon: MessageCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/20',
    label: 'WhatsApp',
  },
  sms: {
    icon: MessageSquare,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 ring-sky-500/20',
    label: 'SMS',
  },
  quote: {
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    label: 'Quote',
  },
  job: {
    icon: Briefcase,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    label: 'Job',
  },
  invoice: {
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    label: 'Invoice',
  },
  payment: {
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/20',
    label: 'Payment',
  },
  photo: {
    icon: Camera,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-500/10 ring-fuchsia-500/20',
    label: 'Photo',
  },
  signature: {
    icon: PenLine,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10 ring-teal-500/20',
    label: 'Signature',
  },
  review: {
    icon: Star,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    label: 'Review',
  },
  ticket: {
    icon: LifeBuoy,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 ring-orange-500/20',
    label: 'Ticket',
  },
  note: {
    icon: StickyNote,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    label: 'Note',
  },
  visit: {
    icon: MapPin,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 ring-rose-500/20',
    label: 'Visit',
  },
  asset: {
    icon: Package,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 ring-indigo-500/20',
    label: 'Asset',
  },
  status_change: {
    icon: ArrowUpRight,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10 ring-teal-500/20',
    label: 'Status',
  },
};

const FILTER_TABS: { value: string; label: string; types?: string[] }[] = [
  { value: 'all', label: 'All' },
  {
    value: 'communications',
    label: 'Communications',
    types: ['call', 'email', 'whatsapp', 'sms'],
  },
  { value: 'jobs', label: 'Jobs', types: ['job'] },
  { value: 'invoices', label: 'Invoices', types: ['invoice', 'payment'] },
  { value: 'notes', label: 'Notes', types: ['note'] },
  { value: 'photos', label: 'Photos', types: ['photo', 'signature'] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Single timeline row ────────────────────────────────────────────────────

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const cfg =
    ENTRY_TYPE_CONFIG[entry.entryType] || {
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted ring-border',
      label: entry.entryType,
    };
  const Icon = cfg.icon;

  return (
    <div className="relative flex gap-3 sm:gap-4 pb-6 last:pb-0">
      {/* Left rail */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center size-9 rounded-full shrink-0 ring-1',
            cfg.bg,
            cfg.color,
          )}
        >
          <Icon className="size-4" />
        </div>
        {/* Connector line */}
        <div className="w-px flex-1 bg-border/60 mt-1" />
      </div>

      {/* Body */}
      <div
        className={cn(
          'flex-1 min-w-0 rounded-lg p-3 transition-colors',
          entry.isInternal
            ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40'
            : 'bg-card hover:bg-accent/30 border border-border/60',
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {entry.title}
            </p>
            {entry.isPinned && (
              <Pin className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            {entry.isInternal && (
              <Badge
                variant="outline"
                className="text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 shrink-0"
              >
                Internal
              </Badge>
            )}
          </div>
          <span
            className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0"
            title={formatDateTime(entry.eventDate)}
          >
            {timeAgo(entry.eventDate)}
          </span>
        </div>

        {entry.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-1.5 whitespace-pre-wrap">
            {entry.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {entry.actorName && (
            <span>
              by <span className="font-medium text-foreground/80">{entry.actorName}</span>
            </span>
          )}
          {!entry.isExplicit && entry.sourceType && (
            <Badge
              variant="outline"
              className="text-[9px] font-normal bg-muted/40 text-muted-foreground border-border/60"
            >
              {entry.sourceType}
            </Badge>
          )}
          {entry.entryType === 'photo' && entry.metadata?.url && (
            <a
              href={String(entry.metadata.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
            >
              <Camera className="size-3" /> View photo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 sm:gap-4">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface TimelineSectionProps {
  customerId: string;
}

export function TimelineSection({ customerId }: TimelineSectionProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [includeInternal, setIncludeInternal] = useState(true);
  const [pageSize, setPageSize] = useState(25);

  // New note state
  const [noteText, setNoteText] = useState('');
  const [showQuickLog, setShowQuickLog] = useState<null | 'call' | 'email'>(null);
  const [quickLogTitle, setQuickLogTitle] = useState('');
  const [quickLogDesc, setQuickLogDesc] = useState('');

  const queryKey = useMemo(
    () => ['customerTimeline', customerId, includeInternal],
    [customerId, includeInternal],
  );

  const { data, isLoading, isFetching, refetch } = useQuery<TimelineResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!includeInternal) params.set('isInternal', 'false');
      params.set('limit', '200');
      const res = await fetch(
        `/api/customers/${customerId}/timeline?${params.toString()}`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch timeline');
      }
      return res.json();
    },
    enabled: !!customerId,
    refetchOnWindowFocus: false,
  });

  // Client-side tab filter (cheaper than re-fetching)
  const entries = data?.entries ?? [];
  const filteredEntries = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.value === activeTab);
    if (!tab || !tab.types) return entries;
    return entries.filter((e) => tab.types!.includes(e.entryType));
  }, [entries, activeTab]);

  const pinned = filteredEntries.filter((e) => e.isPinned);
  const unpinned = filteredEntries.filter((e) => !e.isPinned);
  const visible = [...pinned, ...unpinned];
  const paged = visible.slice(0, pageSize);
  const hasMore = visible.length > pageSize;

  // Mutations
  const addEntryMutation = useMutation({
    mutationFn: async (payload: {
      entryType: string;
      title: string;
      description?: string;
      isInternal?: boolean;
    }) => {
      const res = await fetch(`/api/customers/${customerId}/timeline`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add timeline entry');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Timeline entry added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddNote = () => {
    const text = noteText.trim();
    if (!text) {
      toast.error('Note text is required');
      return;
    }
    addEntryMutation.mutate({
      entryType: 'note',
      title: text.slice(0, 80),
      description: text,
      isInternal: true,
    });
    setNoteText('');
  };

  const handleQuickLogSubmit = () => {
    if (!quickLogTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    addEntryMutation.mutate({
      entryType: showQuickLog!,
      title: quickLogTitle.trim(),
      description: quickLogDesc.trim() || undefined,
      isInternal: false,
    });
    setQuickLogTitle('');
    setQuickLogDesc('');
    setShowQuickLog(null);
  };

  const sources = data?.sources;

  return (
    <div className="space-y-4">
      {/* Quick action bar */}
      <Card className="rounded-xl border-border/70 card-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Add internal note */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add internal note
            </label>
            <Textarea
              placeholder="Log an internal note about this customer (visible only to staff)…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="mt-1.5 min-h-[72px] text-sm resize-y"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={addEntryMutation.isPending || !noteText.trim()}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addEntryMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Add Internal Note
              </Button>
            </div>
          </div>

          {/* Quick log call / email */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Quick log
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowQuickLog(showQuickLog === 'call' ? null : 'call');
                setQuickLogTitle('');
                setQuickLogDesc('');
              }}
              className={cn(
                'gap-1.5 h-8 text-xs',
                showQuickLog === 'call' &&
                  'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300',
              )}
            >
              <Phone className="size-3.5" /> Log Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowQuickLog(showQuickLog === 'email' ? null : 'email');
                setQuickLogTitle('');
                setQuickLogDesc('');
              }}
              className={cn(
                'gap-1.5 h-8 text-xs',
                showQuickLog === 'email' &&
                  'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300',
              )}
            >
              <Mail className="size-3.5" /> Log Email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="ml-auto h-8 text-xs gap-1.5 text-muted-foreground"
            >
              {isFetching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="size-3.5" />
              )}
              Refresh
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={includeInternal}
                onChange={(e) => setIncludeInternal(e.target.checked)}
                className="size-3.5 rounded border-border accent-emerald-600"
              />
              Show internal
            </label>
          </div>

          {/* Quick log form */}
          {showQuickLog && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
              <Input
                placeholder={
                  showQuickLog === 'call'
                    ? 'Call summary (e.g. Spoke with customer about reschedule)'
                    : 'Email subject'
                }
                value={quickLogTitle}
                onChange={(e) => setQuickLogTitle(e.target.value)}
                className="h-9 text-sm"
              />
              <Textarea
                placeholder="Notes / outcome (optional)"
                value={quickLogDesc}
                onChange={(e) => setQuickLogDesc(e.target.value)}
                className="min-h-[60px] text-sm resize-y"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQuickLog(null)}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleQuickLogSubmit}
                  disabled={addEntryMutation.isPending || !quickLogTitle.trim()}
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {addEntryMutation.isPending && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Save {showQuickLog === 'call' ? 'Call' : 'Email'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 h-9 p-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs h-7 data-[state=active]:bg-card data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border/70 card-shadow p-4 sm:p-5">
        {isLoading ? (
          <TimelineSkeleton />
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-muted/60 mb-3">
              <Clock className="size-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {activeTab === 'all'
                ? 'No activity yet'
                : `No ${activeTab} activity yet`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {activeTab === 'all'
                ? 'As leads come in, jobs are scheduled, and conversations happen, every interaction will appear here in one unified timeline.'
                : 'Try a different filter tab or add a manual entry using the buttons above.'}
            </p>
          </div>
        ) : (
          <>
            {sources && activeTab === 'all' && (
              <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-border/60">
                {sources.leads > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/40 border-border/60 text-muted-foreground"
                  >
                    {sources.leads} leads
                  </Badge>
                )}
                {sources.jobs > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/40 border-border/60 text-muted-foreground"
                  >
                    {sources.jobs} jobs
                  </Badge>
                )}
                {sources.invoices > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/40 border-border/60 text-muted-foreground"
                  >
                    {sources.invoices} invoices
                  </Badge>
                )}
                {sources.photos > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/40 border-border/60 text-muted-foreground"
                  >
                    {sources.photos} photos
                  </Badge>
                )}
                {sources.signatures > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted/40 border-border/60 text-muted-foreground"
                  >
                    {sources.signatures} signatures
                  </Badge>
                )}
                {sources.manual > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    {sources.manual} manual
                  </Badge>
                )}
              </div>
            )}

            <div className="pl-1">
              {paged.map((entry) => (
                <TimelineRow key={entry.id} entry={entry} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageSize((p) => p + 25)}
                  className="gap-1.5"
                >
                  <ChevronDown className="size-3.5" /> Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TimelineSection;
