'use client';

/**
 * CallsTab
 * ========
 *
 * Modern call history, transcript viewer, and CRM lead suite.
 *
 * Data source: GET /api/vapi/calls (list) + ?id=<callId> (detail with transcript)
 *
 * Features:
 *   - Search by caller number, contact name, or conversation summary
 *   - Outcome filters (All, Booked, Lead Created, Transferred, Info Only, Missed)
 *   - Date-grouped call feed with caller avatars and duration badges
 *   - Rich call detail modal with audio player, speaker bubbles, and CRM action badges
 */

import { useState, useMemo, useEffect } from 'react';
import { useReceptionistCalls } from './use-receptionist-queries';
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
  X,
  User,
  Tag,
  CalendarCheck,
  UserPlus,
  PhoneForwarded,
  Ban,
  Info,
  ChevronRight,
  Play,
  CheckCircle2,
  Search,
  Volume2,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseStructuredTranscript } from '@/lib/transcript-parser';

interface CallRecord {
  id: string;
  callType: string;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  customerPhone: string | null;
  durationSec: number;
  billableSeconds: number;
  costUsd: number;
  outcomeType: string | null;
  summary: string | null;
  callerIdentifiedAs: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  createdAt: string;
  agent?: { id: string; name: string } | null;
  number?: { id: string; phoneNumber: string; friendlyName: string } | null;
}

interface CallDetail extends CallRecord {
  transcriptJson: string;
  analysisJson: string;
  functionCallsJson: string;
  recordingUrl: string | null;
  transcript?: Array<{ role: string; content: string; timestamp?: string }>;
}

const OUTCOME_META: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  booked: {
    label: 'Job Booked',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    icon: CalendarCheck,
  },
  lead_created: {
    label: 'Lead Captured',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    icon: UserPlus,
  },
  transferred: {
    label: 'Transferred',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    icon: PhoneForwarded,
  },
  info_only: {
    label: 'Inquiry Only',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
    icon: Info,
  },
  missed: {
    label: 'Missed Call',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
    icon: PhoneMissed,
  },
  spam: {
    label: 'Spam Blocked',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
    icon: Ban,
  },
};

export function CallsTab() {
  const { data: callsData, isLoading: loading, refetch } = useReceptionistCalls(100);
  const calls = Array.isArray(callsData?.calls) ? (callsData.calls as CallRecord[]) : [];
  const stats =
    (callsData?.stats as {
      total: number;
      todayCount: number;
      totalDurationSec: number;
      totalCost: number;
    } | null) ?? null;
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const fetchCalls = () => {
    refetch();
  };

  const groupedCalls = useMemo(() => {
    const filtered = calls.filter((c) => {
      if (outcomeFilter !== 'all' && c.outcomeType !== outcomeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const party = c.callType === 'outbound' ? c.toNumber : c.fromNumber || c.customerPhone;
        if (!party?.toLowerCase().includes(q) && !c.summary?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const groups: { label: string; calls: CallRecord[] }[] = [
      { label: 'Today', calls: [] },
      { label: 'Yesterday', calls: [] },
      { label: 'This Week', calls: [] },
      { label: 'Earlier', calls: [] },
    ];

    for (const call of filtered) {
      const date = call.startedAt ? new Date(call.startedAt) : new Date(call.createdAt);
      if (isToday(date)) groups[0].calls.push(call);
      else if (isYesterday(date)) groups[1].calls.push(call);
      else if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) groups[2].calls.push(call);
      else groups[3].calls.push(call);
    }

    return groups.filter((g) => g.calls.length > 0);
  }, [calls, outcomeFilter, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Call History &amp; Transcripts</h3>
          <p className="text-xs text-muted-foreground">
            Complete record of customer conversations, automated appointments, and captured leads
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalls}
          disabled={loading}
          className="gap-1.5 text-xs h-9 self-start sm:self-auto"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh Log
        </Button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat icon={PhoneCall} label="Total Handled" value={String(stats.total)} />
          <MiniStat icon={CalendarCheck} label="Today" value={String(stats.todayCount)} />
          <MiniStat icon={Clock} label="Total AI Time" value={formatDuration(stats.totalDurationSec)} />
          <MiniStat icon={DollarSign} label="Estimated Cost" value={`$${stats.totalCost.toFixed(2)}`} />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by caller number, contact name, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-full sm:w-[170px] text-xs h-9">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="booked">Job Booked</SelectItem>
            <SelectItem value="lead_created">Lead Captured</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="info_only">Inquiry Only</SelectItem>
            <SelectItem value="missed">Missed Call</SelectItem>
            <SelectItem value="spam">Spam Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls list */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : groupedCalls.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-muted text-muted-foreground">
              <PhoneCall className="size-6 opacity-40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No calls found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {search || outcomeFilter !== 'all'
                  ? 'No calls match your active filter. Try resetting search filters.'
                  : 'Incoming calls to your dedicated AI number will appear here in real time.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedCalls.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/60">
                  {group.calls.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {group.calls.map((call) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    onClick={() => setSelectedCallId(call.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call detail dialog */}
      <CallDetailDialog
        callId={selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-lg font-bold text-foreground tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function CallRow({ call, onClick }: { call: CallRecord; onClick: () => void }) {
  const isOutbound = call.callType === 'outbound';
  const otherParty = isOutbound ? call.toNumber : call.fromNumber || call.customerPhone;
  const isFailed = call.status === 'failed';
  const outcome = call.outcomeType ? OUTCOME_META[call.outcomeType] : null;
  const OutcomeIcon = outcome?.icon || Info;
  const date = call.startedAt ? new Date(call.startedAt) : new Date(call.createdAt);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 hover:shadow-sm transition-all p-3.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex items-center gap-3.5">
        <Avatar className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200/50 shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {otherParty ? otherParty.slice(-2) : 'AI'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
              {otherParty || 'Unknown Caller'}
            </p>
            {call.callerIdentifiedAs && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/60">
                {call.callerIdentifiedAs}
              </Badge>
            )}
            {isOutbound && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                Test Call
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {call.summary || 'Call processed by AI Receptionist'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-mono font-medium text-foreground">
              {call.durationSec > 0 ? formatDuration(call.durationSec) : '0s'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {format(date, 'h:mm a')}
            </p>
          </div>

          {outcome && (
            <Badge variant="outline" className={cn('text-[10px] font-semibold gap-1 py-0.5', outcome.className)}>
              <OutcomeIcon className="size-3" />
              {outcome.label}
            </Badge>
          )}

          <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}

function CallDetailDialog({
  callId,
  onClose,
}: {
  callId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [call, setCall] = useState<CallDetail | null>(null);

  useEffect(() => {
    if (!callId) {
      setCall(null);
      return;
    }
    setLoading(true);
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/vapi/calls?id=${callId}`);
        if (res.ok) {
          const data = await res.json();
          setCall(data.call);
        }
      } catch {
        toast.error('Failed to load call details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [callId]);

  const transcript: Array<{ role: string; content: string; timestamp?: string }> =
    Array.isArray(call?.transcript) && call.transcript.length > 0
      ? call.transcript
      : parseStructuredTranscript(call?.transcriptJson || call?.transcript || []);

  const rawFunctionCalls = Array.isArray(call?.functionCallsJson)
    ? call.functionCallsJson
    : call
      ? safeParse(call.functionCallsJson, [])
      : [];
  const functionCalls: Array<{ toolName?: string; name?: string; status?: string; result?: string }> =
    Array.isArray(rawFunctionCalls) ? rawFunctionCalls : [];

  const otherParty =
    call?.callType === 'outbound' ? call?.toNumber : call?.fromNumber || call?.customerPhone;
  const outcome = call?.outcomeType ? OUTCOME_META[call.outcomeType] : null;

  return (
    <Dialog open={!!callId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200/50">
                <AvatarFallback className="text-xs font-semibold">
                  {otherParty ? otherParty.slice(-2) : 'AI'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {otherParty || 'Unknown Caller'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {call?.startedAt ? format(new Date(call.startedAt), 'MMMM d, yyyy · h:mm a') : 'Recent Call'}
                </p>
              </div>
            </div>

            {outcome && (
              <Badge variant="outline" className={cn('text-xs font-semibold gap-1.5 py-1 px-2.5', outcome.className)}>
                <CheckCircle2 className="size-3.5" />
                {outcome.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            <p className="text-xs text-muted-foreground">Loading call transcript &amp; CRM actions...</p>
          </div>
        ) : call ? (
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-5 pb-4">
              {/* Quick stat chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Duration</p>
                  <p className="text-xs font-bold font-mono mt-0.5">{formatDuration(call.durationSec)}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Call Type</p>
                  <p className="text-xs font-bold capitalize mt-0.5">{call.callType || 'Inbound'}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Status</p>
                  <p className="text-xs font-bold capitalize mt-0.5">{call.status}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Billable</p>
                  <p className="text-xs font-bold font-mono mt-0.5">{call.billableSeconds || call.durationSec}s</p>
                </div>
              </div>

              {/* Summary Card */}
              {call.summary && (
                <div className="p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="size-3.5" />
                    <span className="text-xs font-bold">AI Call Summary &amp; Key Inquiries</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{call.summary}</p>
                </div>
              )}

              {/* CRM Actions Triggered */}
              {functionCalls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">
                    CRM Actions Executed During Call ({functionCalls.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {functionCalls.map((fc, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs"
                      >
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold capitalize text-foreground">
                          {(fc.toolName || fc.name || 'Action').replace(/_/g, ' ')}
                        </span>
                        {fc.status && (
                          <Badge variant="outline" className="text-[10px] ml-auto py-0 px-1.5">
                            {fc.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recording Audio Player */}
              {call.recordingUrl && (
                <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Volume2 className="size-4 text-emerald-600" />
                    Call Audio Recording
                  </div>
                  <audio
                    controls
                    src={`/api/vapi/calls/${call.id}/recording`}
                    className="w-full h-9 rounded-lg"
                    preload="none"
                  />
                </div>
              )}

              {/* Structured Conversation Transcript */}
              {transcript.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-foreground">
                    Spoken Conversation Transcript ({transcript.length} turns)
                  </span>
                  <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/10 max-h-72 overflow-y-auto">
                    {transcript.map((msg, i) => {
                      const isAi = msg.role === 'assistant' || msg.role === 'bot';
                      return (
                        <div
                          key={i}
                          className={cn('flex flex-col gap-1', isAi ? 'items-start' : 'items-end')}
                        >
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase px-1">
                            {isAi ? `${call.agent?.name || 'AI Receptionist'}` : 'Customer'}
                          </span>
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2 text-xs leading-relaxed max-w-[85%] shadow-sm',
                              isAi
                                ? 'bg-card border border-emerald-200/60 dark:border-emerald-900/40 text-foreground'
                                : 'bg-emerald-600 text-white font-medium',
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(sec: number): string {
  if (!sec || sec < 1) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const val = JSON.parse(json);
    if (val === null || val === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(val)) return fallback;
    if (typeof fallback === 'object' && !Array.isArray(fallback) && (typeof val !== 'object' || Array.isArray(val)))
      return fallback;
    return val as T;
  } catch {
    return fallback;
  }
}

