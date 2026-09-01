'use client';

/**
 * CallsTab
 * ========
 *
 * Call history with date grouping + call detail dialog.
 *
 * Data source: GET /api/vapi/calls (list) + ?id=<callId> (detail with transcript)
 *
 * Features:
 *   - Date-grouped call list (Today, Yesterday, This Week, Earlier)
 *   - Outcome badges (booked, lead_created, transferred, etc.)
 *   - Click a call → detail dialog with transcript, summary, actions
 *   - Filter by outcome
 *   - Stats summary (total, today, duration, cost)
 */

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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
}

const OUTCOME_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  booked: { label: 'Booked', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CalendarCheck },
  lead_created: { label: 'Lead Created', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400', icon: UserPlus },
  transferred: { label: 'Transferred', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400', icon: PhoneForwarded },
  info_only: { label: 'Info Only', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400', icon: Info },
  missed: { label: 'Missed', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400', icon: PhoneMissed },
  spam: { label: 'Spam', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
};

export function CallsTab() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; todayCount: number; totalDurationSec: number; totalCost: number } | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vapi/calls?limit=100');
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
        setStats(data.stats || null);
      }
    } catch {
      toast.error('Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Filter + group calls by date
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Call History</h3>
          <p className="text-sm text-muted-foreground">
            All calls handled by your AI Receptionist
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCalls} disabled={loading} className="gap-1.5 shrink-0">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat icon={PhoneCall} label="Total Calls" value={String(stats.total)} />
          <MiniStat icon={CalendarCheck} label="Today" value={String(stats.todayCount)} />
          <MiniStat icon={Clock} label="Total Time" value={formatDuration(stats.totalDurationSec)} />
          <MiniStat icon={DollarSign} label="Cost" value={`$${stats.totalCost.toFixed(2)}`} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by number or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="lead_created">Lead Created</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="info_only">Info Only</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : groupedCalls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <PhoneCall className="size-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">No calls yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Calls handled by your AI Receptionist will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedCalls.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.label} · {group.calls.length}
              </p>
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
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CallRow({ call, onClick }: { call: CallRecord; onClick: () => void }) {
  const isOutbound = call.callType === 'outbound';
  const otherParty = isOutbound ? call.toNumber : call.fromNumber || call.customerPhone;
  const isFailed = call.status === 'failed';
  const outcome = call.outcomeType ? OUTCOME_META[call.outcomeType] : null;
  const OutcomeIcon = outcome?.icon;
  const date = call.startedAt ? new Date(call.startedAt) : new Date(call.createdAt);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card hover:bg-accent/50 transition-colors p-3"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {isFailed ? (
            <PhoneMissed className="size-5 text-red-500" />
          ) : isOutbound ? (
            <PhoneOutgoing className="size-5 text-blue-500" />
          ) : (
            <PhoneIncoming className="size-5 text-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">
              {otherParty || 'Unknown'}
            </p>
            {call.callerIdentifiedAs && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {call.callerIdentifiedAs}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {call.summary || (outcome ? outcome.label : call.status)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {format(date, 'h:mm a')}
            </p>
            {call.durationSec > 0 && (
              <p className="text-xs font-medium">
                {formatDuration(call.durationSec)}
              </p>
            )}
          </div>
          {OutcomeIcon && outcome && (
            <Badge variant="outline" className={cn('gap-1', outcome.className)}>
              <OutcomeIcon className="size-3" />
              {outcome.label}
            </Badge>
          )}
          <ChevronRight className="size-4 text-muted-foreground" />
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

  const transcript = Array.isArray(call?.transcriptJson)
    ? call.transcriptJson
    : call
      ? safeParse(call.transcriptJson, [])
      : [];
  const functionCalls = Array.isArray(call?.functionCallsJson)
    ? call.functionCallsJson
    : call
      ? safeParse(call.functionCallsJson, [])
      : [];
  const analysis = typeof call?.analysisJson === 'object' && call.analysisJson
    ? call.analysisJson
    : call
      ? safeParse(call.analysisJson, {})
      : {};

  return (
    <Dialog open={!!callId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {call?.callType === 'outbound' ? (
              <PhoneOutgoing className="size-5 text-blue-500" />
            ) : (
              <PhoneIncoming className="size-5 text-emerald-500" />
            )}
            Call Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : call ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* Outcome + duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DetailStat
                  label="Outcome"
                  value={call.outcomeType ? OUTCOME_META[call.outcomeType]?.label || call.outcomeType : call.status}
                />
                <DetailStat label="Duration" value={formatDuration(call.durationSec)} />
                <DetailStat
                  label="Started"
                  value={call.startedAt ? format(new Date(call.startedAt), 'h:mm a') : '—'}
                />
                <DetailStat
                  label="Ended"
                  value={call.endedAt ? format(new Date(call.endedAt), 'h:mm a') : '—'}
                />
              </div>

              {/* Caller info */}
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5" />
                    {call.callType === 'outbound' ? 'Called' : 'Caller'}
                  </span>
                  <span className="font-medium font-mono">
                    {call.callType === 'outbound' ? call.toNumber : call.fromNumber || call.customerPhone || 'Unknown'}
                  </span>
                </div>
                {call.callerIdentifiedAs && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Tag className="size-3.5" />
                      Identified as
                    </span>
                    <Badge variant="secondary" className="capitalize">{call.callerIdentifiedAs}</Badge>
                  </div>
                )}
                {call.endedReason && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ended reason</span>
                    <span className="text-xs font-medium capitalize">{call.endedReason.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {call.summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Summary</p>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">{call.summary}</div>
                </div>
              )}

              {/* Actions taken */}
              {functionCalls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Actions taken by AI ({functionCalls.length})
                  </p>
                  <div className="space-y-1.5">
                    {functionCalls.map((fc: { toolName?: string; name?: string; status?: string; result?: string }, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs rounded-lg border p-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium capitalize">
                          {(fc.toolName || fc.name || 'action').replace(/_/g, ' ')}
                        </span>
                        {fc.status && (
                          <Badge variant="outline" className="text-[10px] ml-auto">{fc.status}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {transcript.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Transcript</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border p-3 bg-muted/20">
                    {transcript.map((msg: { role: string; content: string; timestamp?: string }, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-2 text-sm',
                          msg.role === 'assistant' || msg.role === 'bot' ? 'justify-start' : 'justify-end',
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg px-3 py-1.5 max-w-[80%]',
                            msg.role === 'assistant' || msg.role === 'bot'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200',
                          )}
                        >
                          <p className="text-[10px] font-medium uppercase opacity-70 mb-0.5">
                            {msg.role === 'assistant' || msg.role === 'bot' ? 'AI' : 'Caller'}
                          </p>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recording — uses proxy endpoint (Vapi raw URLs need API key auth) */}
              {call.recordingUrl && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Recording</p>
                  <audio controls src={`/api/vapi/calls/${call.id}/recording`} className="w-full" />
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
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
    return val === null ? fallback : (val as T);
  } catch {
    return fallback;
  }
}
