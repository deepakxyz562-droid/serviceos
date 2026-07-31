'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  RefreshCw,
  Loader2,
  Clock,
  DollarSign,
  Bot,
  Activity,
  AlertCircle,
  X,
  Play,
  Pause,
  Volume2,
  FileText,
  Sparkles,
  User,
  ChevronRight,
  Tag,
  Plus,
  Ban,
  CalendarCheck,
  UserPlus,
  PhoneForwarded,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Outcome metadata (mirrors ai-receptionist-view) ──────────────────────
const OUTCOME_META: Record<
  string,
  { label: string; pill: string; icon: React.ReactNode }
> = {
  booked: {
    label: 'Booked',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <CalendarCheck className="size-3" />,
  },
  lead_created: {
    label: 'Lead Created',
    pill: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <UserPlus className="size-3" />,
  },
  transferred: {
    label: 'Transferred',
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <PhoneForwarded className="size-3" />,
  },
  info_only: {
    label: 'Info Only',
    pill: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300',
    icon: <Info className="size-3" />,
  },
  missed: {
    label: 'Missed',
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    icon: <Ban className="size-3" />,
  },
  spam: {
    label: 'Spam',
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    icon: <Ban className="size-3" />,
  },
};

function outcomeBadgeClass(outcome: string | null | undefined): string {
  if (!outcome) return 'bg-muted text-muted-foreground border-border';
  return (OUTCOME_META[outcome] ?? OUTCOME_META.info_only).pill;
}

function callerBadgeClass(caller: string | null | undefined): string {
  switch (caller) {
    case 'customer':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'lead':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// Tag shape — stored as JSON in AiCall.tagsJson: [{label, color, at}]
interface CallTag {
  label: string;
  color?: string | null;
  at?: string | null;
}

interface Call {
  id: string;
  vapiCallId: string | null;
  callType: string;
  status: string;
  customerPhone: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  durationSec: number;
  costUsd: number;
  startedAt: string | null;
  endedReason: string | null;
  summary: string | null;
  // ── Phase R2 enriched fields ────────────────────────────────────
  recordingUrl: string | null;
  outcomeType: string | null;
  timeSavedSec: number;
  aiDisabled: boolean;
  callerIdentifiedAs: string | null;
  tagsJson: string;
  agent: { id: string; name: string } | null;
  number: { id: string; phoneNumber: string; friendlyName: string | null } | null;
}

interface CallStats {
  total: number;
  totalDurationSec: number;
  totalCost: number;
  todayCount: number;
}

interface CallDetail extends Call {
  transcript: Array<{ role: string; content: string; timestamp?: string | null }>;
  analysis: Record<string, any>;
  functionCalls: Array<{ name: string; parameters: Record<string, unknown>; result: unknown; at: string }>;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All calls' },
  { value: 'ended', label: 'Completed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'failed', label: 'Missed / Failed' },
];

export function AiCallHistoryView() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats>({ total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const fetchCalls = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(`/api/vapi/calls?limit=100${statusParam}`);
      const data = await res.json();
      setCalls(data.calls || []);
      setStats(data.stats || { total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 });
    } catch {
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [statusFilter]);

  const openDetail = async (call: Call) => {
    setDetailOpen(true);
    setSelectedCall(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/vapi/calls?id=${call.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedCall(data.call);
    } catch (e) {
      toast.error('Failed to load call details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Tags state + handlers ───────────────────────────────────────────
  // Tags are stored on AiCall.tagsJson as a JSON array of
  // {label, color, at} objects. We parse the raw string into local state
  // when the dialog opens so add/remove operations can update the UI
  // optimistically (then persist via PUT /api/vapi/calls/[id]).
  const [tags, setTags] = useState<CallTag[]>([]);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [tagSaving, setTagSaving] = useState(false);
  const [aiDisabled, setAiDisabled] = useState(false);
  const [aiToggleSaving, setAiToggleSaving] = useState(false);

  // Parse selectedCall.tagsJson (string or already-array) into local state
  // whenever the call changes. Tags may have been pre-parsed by the API or
  // arrive as a raw JSON string — handle both.
  useEffect(() => {
    if (!selectedCall) {
      setTags([]);
      setNewTagLabel('');
      setAiDisabled(false);
      return;
    }
    const raw = (selectedCall as Call & { tags?: CallTag[] }).tags;
    if (Array.isArray(raw)) {
      setTags(raw);
    } else if (typeof selectedCall.tagsJson === 'string' && selectedCall.tagsJson) {
      try {
        const parsed = JSON.parse(selectedCall.tagsJson);
        setTags(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTags([]);
      }
    } else {
      setTags([]);
    }
    setAiDisabled(Boolean(selectedCall.aiDisabled));
    setNewTagLabel('');
  }, [selectedCall]);

  const persistTags = async (nextTags: CallTag[]) => {
    if (!selectedCall) return;
    setTagSaving(true);
    try {
      const res = await fetch(`/api/vapi/calls/${selectedCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagsJson: JSON.stringify(nextTags) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save tags');
      }
      // Update local selectedCall so a re-open doesn't lose changes.
      setSelectedCall((prev) => (prev ? { ...prev, tagsJson: JSON.stringify(nextTags) } : prev));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save tags');
      // Revert local tags on failure by re-parsing from selectedCall
      try {
        const parsed = JSON.parse(selectedCall.tagsJson || '[]');
        setTags(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTags([]);
      }
    } finally {
      setTagSaving(false);
    }
  };

  const handleAddTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      toast.error('That tag already exists');
      return;
    }
    const next: CallTag[] = [
      ...tags,
      { label, color: null, at: new Date().toISOString() },
    ];
    setTags(next);
    setNewTagLabel('');
    void persistTags(next);
  };

  const handleRemoveTag = (label: string) => {
    const next = tags.filter((t) => t.label !== label);
    setTags(next);
    void persistTags(next);
  };

  const handleToggleAiDisabled = async (checked: boolean) => {
    if (!selectedCall) return;
    setAiDisabled(checked);
    setAiToggleSaving(true);
    try {
      const res = await fetch(`/api/vapi/calls/${selectedCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiDisabled: checked }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update setting');
      }
      setSelectedCall((prev) => (prev ? { ...prev, aiDisabled: checked } : prev));
      toast.success(checked ? 'AI disabled for this caller' : 'AI re-enabled for this caller');
    } catch (e) {
      // Revert on failure
      setAiDisabled(!checked);
      toast.error(e instanceof Error ? e.message : 'Failed to update setting');
    } finally {
      setAiToggleSaving(false);
    }
  };

  // Memoised parsed tags for render — handles the case where selectedCall
  // has been updated optimistically and tags state hasn't caught up yet.
  const displayTags = useMemo(() => tags, [tags]);

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ended': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'ringing': case 'queued': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => setActiveView('aiReceptionist')} className="hover:text-foreground transition-colors">
              AI Receptionist
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Call History</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <PhoneCall className="size-6 text-emerald-600" />
            Call History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review calls, read transcripts, and see AI-extracted insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchCalls(true)} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* ─── Stats ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Total</span>
              <PhoneCall className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
            <div className="text-xs text-muted-foreground">{stats.todayCount} today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Talk Time</span>
              <Clock className="size-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mt-1">{fmtDuration(stats.totalDurationSec)}</div>
            <div className="text-xs text-muted-foreground">all time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Cost</span>
              <DollarSign className="size-4 text-violet-600" />
            </div>
            <div className="text-2xl font-bold mt-1">${stats.totalCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">paid to Vapi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Avg Duration</span>
              <Activity className="size-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats.total > 0 ? fmtDuration(Math.round(stats.totalDurationSec / stats.total)) : '0s'}
            </div>
            <div className="text-xs text-muted-foreground">per call</div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Calls list ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calls</CardTitle>
          <CardDescription>{calls.length} call{calls.length !== 1 ? 's' : ''} found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-3 flex items-center justify-center size-12 rounded-full bg-muted">
                <PhoneMissed className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No calls yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter === 'all'
                  ? 'Calls will appear here once your AI agents start receiving them.'
                  : 'No calls match this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {calls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => openDetail(call)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center size-9 rounded-full shrink-0',
                      call.callType === 'inbound'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {call.callType === 'inbound' ? (
                      <PhoneIncoming className="size-4 text-emerald-600" />
                    ) : (
                      <PhoneOutgoing className="size-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{call.customerPhone || 'Unknown'}</span>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', statusColor(call.status))}>
                        {call.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {call.agent?.name || 'No agent'}
                      {call.startedAt && ` • ${format(new Date(call.startedAt), 'MMM d, h:mm a')}`}
                      {call.summary && ` • ${call.summary.slice(0, 60)}${call.summary.length > 60 ? '…' : ''}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium font-mono">{fmtDuration(call.durationSec)}</div>
                    {call.costUsd > 0 && <div className="text-xs text-muted-foreground">${call.costUsd.toFixed(3)}</div>}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Call detail dialog ─────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCall?.callType === 'inbound' ? (
                <PhoneIncoming className="size-5 text-emerald-600" />
              ) : (
                <PhoneOutgoing className="size-5 text-blue-600" />
              )}
              Call Details
            </DialogTitle>
            <DialogDescription>
              {selectedCall
                ? `${selectedCall.customerPhone || 'Unknown'} • ${selectedCall.startedAt ? format(new Date(selectedCall.startedAt), 'MMM d, yyyy h:mm a') : 'Pending'}`
                : 'Loading...'}
            </DialogDescription>
            {/* ── Outcome + caller identity badges ─────────────────── */}
            {selectedCall && (selectedCall.outcomeType || selectedCall.callerIdentifiedAs) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {selectedCall.outcomeType && (
                  <Badge
                    variant="outline"
                    className={cn('gap-1 text-[10px] font-medium capitalize', outcomeBadgeClass(selectedCall.outcomeType))}
                  >
                    {OUTCOME_META[selectedCall.outcomeType]?.icon}
                    {OUTCOME_META[selectedCall.outcomeType]?.label || selectedCall.outcomeType.replace(/_/g, ' ')}
                  </Badge>
                )}
                {selectedCall.callerIdentifiedAs && (
                  <Badge
                    variant="outline"
                    className={cn('gap-1 text-[10px] font-medium capitalize', callerBadgeClass(selectedCall.callerIdentifiedAs))}
                  >
                    <User className="size-3" />
                    {selectedCall.callerIdentifiedAs}
                  </Badge>
                )}
                {selectedCall.aiDisabled && (
                  <Badge variant="outline" className="gap-1 text-[10px] font-medium bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400">
                    <Ban className="size-3" />
                    AI Disabled
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCall ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
              {/* ─── Meta ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground uppercase tracking-wide">Duration</div>
                  <div className="font-medium mt-0.5 font-mono">{fmtDuration(selectedCall.durationSec)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground uppercase tracking-wide">Cost</div>
                  <div className="font-medium mt-0.5">${selectedCall.costUsd.toFixed(3)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground uppercase tracking-wide">Agent</div>
                  <div className="font-medium mt-0.5 truncate">{selectedCall.agent?.name || '—'}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <div className="text-muted-foreground uppercase tracking-wide">Time Saved</div>
                  <div className="font-medium mt-0.5 font-mono">
                    {selectedCall.timeSavedSec > 0
                      ? selectedCall.timeSavedSec >= 3600
                        ? `${Math.floor(selectedCall.timeSavedSec / 3600)}h ${Math.floor((selectedCall.timeSavedSec % 3600) / 60)}m`
                        : `${Math.floor(selectedCall.timeSavedSec / 60)}m`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* ─── Audio recording ──────────────────────────────── */}
              {selectedCall.recordingUrl && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="size-4" />
                    <span className="text-sm font-medium">Call Recording</span>
                  </div>
                  {/* Key forces remount when call changes so playback resets. */}
                  <audio
                    key={selectedCall.id}
                    controls
                    src={selectedCall.recordingUrl}
                    className="w-full"
                    preload="none"
                  />
                </div>
              )}

              {/* ─── Summary ───────────────────────────────────────── */}
              {selectedCall.summary && (
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                    <Sparkles className="size-3.5" />
                    AI Summary
                  </div>
                  <p className="text-sm text-foreground">{selectedCall.summary}</p>
                </div>
              )}

              {/* ─── Tags ──────────────────────────────────────────── */}
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="size-3.5" />
                  Tags {displayTags.length > 0 && `(${displayTags.length})`}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {displayTags.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No tags yet.</span>
                  ) : (
                    displayTags.map((tag) => (
                      <Badge
                        key={tag.label}
                        variant="secondary"
                        className="gap-1 text-xs pr-1.5"
                      >
                        <Tag className="size-3 text-muted-foreground" />
                        {tag.label}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.label)}
                          disabled={tagSaving}
                          aria-label={`Remove tag ${tag.label}`}
                          className="ml-0.5 inline-flex items-center justify-center rounded-sm hover:bg-background/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag (e.g. vip, follow-up, spam)"
                    className="h-8 text-xs"
                    disabled={tagSaving}
                    maxLength={40}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={tagSaving || !newTagLabel.trim()}
                    className="h-8 gap-1 shrink-0"
                  >
                    {tagSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Add
                  </Button>
                </div>
              </div>

              {/* ─── Function calls ────────────────────────────────── */}
              {selectedCall.functionCalls && selectedCall.functionCalls.length > 0 && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Bot className="size-3.5" />
                    Function Calls ({selectedCall.functionCalls.length})
                  </div>
                  <div className="space-y-2">
                    {selectedCall.functionCalls.map((fc, i) => (
                      <div key={i} className="p-2.5 rounded-lg border bg-card text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">{fc.name}</Badge>
                          <span className="text-muted-foreground">{format(new Date(fc.at), 'h:mm:ss a')}</span>
                        </div>
                        <pre className="mt-1.5 text-[10px] text-muted-foreground overflow-x-auto">
                          {JSON.stringify(fc.result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Disable AI for this caller ────────────────────── */}
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <Ban className="size-3.5" />
                      Disable AI for this caller
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, future calls from this number will skip the AI
                      Receptionist and go to voicemail/forwarding.
                    </p>
                  </div>
                  <Switch
                    checked={aiDisabled}
                    onCheckedChange={handleToggleAiDisabled}
                    disabled={aiToggleSaving}
                    aria-label="Disable AI for this caller"
                  />
                </div>
                {aiToggleSaving && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Saving…
                  </div>
                )}
              </div>

              {/* ─── Transcript ────────────────────────────────────── */}
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  Transcript
                </div>
                {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {selectedCall.transcript.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-2.5',
                          msg.role === 'assistant' ? '' : 'flex-row-reverse'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center size-7 rounded-full shrink-0',
                            msg.role === 'assistant'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          )}
                        >
                          {msg.role === 'assistant' ? (
                            <Bot className="size-3.5 text-emerald-600" />
                          ) : (
                            <User className="size-3.5 text-blue-600" />
                          )}
                        </div>
                        <div className={cn('flex-1', msg.role === 'assistant' ? '' : 'text-right')}>
                          <div
                            className={cn(
                              'inline-block text-sm px-3 py-2 rounded-lg max-w-[85%]',
                              msg.role === 'assistant'
                                ? 'bg-muted text-foreground'
                                : 'bg-emerald-600 text-white'
                            )}
                          >
                            {msg.content}
                          </div>
                          {msg.timestamp && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(msg.timestamp), 'h:mm:ss a')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No transcript available for this call.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">Failed to load call details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
