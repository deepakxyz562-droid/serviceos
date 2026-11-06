'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  RefreshCw,
  Loader2,
  Clock,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  UserPlus,
  Download,
  Calendar,
  Filter,
  ArrowRight,
  ExternalLink,
  Schedule,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface CallLead {
  id: string;
  name: string;
  status: string;
  value: number;
}

interface CallItem {
  id: string;
  callType: 'inbound' | 'outbound' | 'missed';
  status: string;
  fromNumber?: string | null;
  toNumber?: string | null;
  customerPhone?: string | null;
  durationSec: number;
  summary?: string | null;
  outcomeType?: string | null;
  endedReason?: string | null;
  leadId?: string | null;
  lead?: CallLead | null;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

interface CallStats {
  total: number;
  todayCount: number;
  missedCount: number;
  convertedCount: number;
  followupCount?: number;
}

interface CallsResponse {
  calls: CallItem[];
  stats: CallStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function CallTrackerView() {
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [stats, setStats] = useState<CallStats>({
    total: 0,
    todayCount: 0,
    missedCount: 0,
    convertedCount: 0,
    followupCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed' | 'followup' | 'converted'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Conversion state
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Manual Log Dialog State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logPhone, setLogPhone] = useState('');
  const [logType, setLogType] = useState<'inbound' | 'outbound' | 'missed'>('inbound');
  const [logOutcome, setLogOutcome] = useState('connected');
  const [logDurationMin, setLogDurationMin] = useState('2');
  const [logNotes, setLogNotes] = useState('');
  const [logCreateLead, setLogCreateLead] = useState(true);
  const [logLeadValue, setLogLeadValue] = useState('');
  const [logSubmitting, setLogSubmitting] = useState(false);

  const fetchCalls = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        const params = new URLSearchParams({
          page: String(page),
          limit: '25',
          filter,
        });
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const res = await fetch(`/api/calls?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load calls');

        const data: CallsResponse = await res.json();
        setCalls(data.calls || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load call logs');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filter, search]
  );

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleConvertToLead = async (call: CallItem) => {
    setConvertingId(call.id);
    try {
      const phone = call.customerPhone || call.fromNumber || call.toNumber || '';
      const res = await fetch('/api/calls/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          name: call.lead?.name || `Caller ${phone.slice(-4)}`,
          notes: call.summary || `Converted from ${call.callType} call (${call.durationSec || 0}s)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      toast.success(
        data.alreadyConverted ? 'Call is already in CRM leads' : 'Converted to CRM Lead successfully!'
      );
      await fetchCalls(true);
    } catch (err: any) {
      toast.error(err.message || 'Could not convert call to lead');
    } finally {
      setConvertingId(null);
    }
  };

  const handleSaveManualLog = async () => {
    const cleanPhone = logPhone.replace(/[\s()-]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLogSubmitting(true);
    try {
      const durationSec = Math.max(0, (parseInt(logDurationMin, 10) || 0) * 60);
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: cleanPhone,
          callType: logType,
          durationSec,
          outcomeType: logOutcome,
          summary: logNotes.trim() || undefined,
          createLead: logCreateLead,
          leadName: `Caller ${cleanPhone.slice(-4)}`,
          leadValue: parseFloat(logLeadValue) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save call');

      toast.success(
        logCreateLead ? 'Call logged and CRM Lead created!' : 'Call logged successfully!'
      );
      setLogModalOpen(false);
      setLogPhone('');
      setLogNotes('');
      setLogDurationMin('2');
      setLogLeadValue('');
      await fetchCalls(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record call');
    } finally {
      setLogSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (calls.length === 0) {
      toast.error('No calls to export');
      return;
    }

    const headers = ['Date', 'Phone', 'Caller Name', 'Direction', 'Outcome', 'Duration (sec)', 'Notes', 'Lead Attached'];
    const rows = calls.map((c) => [
      format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      `"${c.customerPhone || c.fromNumber || c.toNumber || ''}"`,
      `"${c.lead?.name || 'Unknown'}"`,
      c.callType,
      c.outcomeType || c.status,
      c.durationSec || 0,
      `"${(c.summary || '').replace(/"/g, '""')}"`,
      c.leadId ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `call-tracker-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Call report exported as CSV');
  };

  const handleWhatsApp = (phone?: string | null) => {
    const raw = (phone || '').replace(/\D/g, '');
    if (!raw) {
      toast.error('No valid phone number for WhatsApp');
      return;
    }
    const msg = encodeURIComponent('Hi! Following up regarding our conversation earlier. How can I assist you today?');
    window.open(`https://wa.me/${raw}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Call Tracker & Leads</h1>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
              Native Capture
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Capture inbound phone calls, manage callback queues, and convert callers into CRM leads in 1 tap.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchCalls(true)} disabled={refreshing}>
            <RefreshCw className={`size-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>

          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setLogModalOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Log Call
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Calls</CardTitle>
            <PhoneIncoming className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.total} total recorded</p>
          </CardContent>
        </Card>

        {/* Missed Calls */}
        <Card className={stats.missedCount > 0 ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Missed Calls</CardTitle>
            <PhoneMissed className={`size-4 ${stats.missedCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.missedCount > 0 ? 'text-amber-700' : ''}`}>
              {stats.missedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.missedCount > 0 ? 'Needs immediate callback' : 'All clear'}
            </p>
          </CardContent>
        </Card>

        {/* Follow-up Queue */}
        <Card className={(stats.followupCount || 0) > 0 ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Follow-up Queue</CardTitle>
            <Clock className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats.followupCount || 0) > 0 ? 'text-blue-700' : ''}`}>
              {stats.followupCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending proposals & callbacks</p>
          </CardContent>
        </Card>

        {/* Converted to Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Captured in CRM</CardTitle>
            <UserPlus className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.convertedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? `${Math.round((stats.convertedCount / stats.total) * 100)}% lead conversion rate` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('all'); setPage(1); }}
            className={filter === 'all' ? 'bg-slate-900 text-white' : ''}
          >
            All Calls ({stats.total})
          </Button>
          <Button
            variant={filter === 'missed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('missed'); setPage(1); }}
            className={filter === 'missed' ? 'bg-amber-600 text-white' : ''}
          >
            Missed ⚠️ ({stats.missedCount})
          </Button>
          <Button
            variant={filter === 'followup' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('followup'); setPage(1); }}
            className={filter === 'followup' ? 'bg-blue-600 text-white' : ''}
          >
            Follow-up ⏳ ({stats.followupCount || 0})
          </Button>
          <Button
            variant={filter === 'converted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter('converted'); setPage(1); }}
            className={filter === 'converted' ? 'bg-emerald-600 text-white' : ''}
          >
            In CRM ✅ ({stats.convertedCount})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search caller or number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-10 w-44" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16 px-4">
              <PhoneCall className="mx-auto size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No calls found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                {filter === 'missed'
                  ? 'Great job! You have no missed calls awaiting callbacks.'
                  : filter === 'followup'
                  ? 'No calls currently scheduled for follow-up.'
                  : 'Phone calls made or received on your business line will appear here.'}
              </p>
              <Button size="sm" className="mt-4" onClick={() => setLogModalOpen(true)}>
                <Plus className="size-4 mr-1.5" />
                Log First Call
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Caller & Phone</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Notes & CRM Link</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calls.map((call) => {
                    const phone = call.customerPhone || call.fromNumber || call.toNumber || 'Unknown';
                    const isMissed =
                      call.callType === 'missed' ||
                      call.status === 'missed' ||
                      ['no-answer', 'busy', 'missed', 'rejected', 'canceled'].includes(call.endedReason || '');
                    const isOutbound = call.callType === 'outbound';
                    const isConverted = Boolean(call.leadId);
                    const callerName = call.lead?.name || `Caller ${phone.slice(-4)}`;

                    return (
                      <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                        {/* Caller */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{callerName}</span>
                              {call.lead && (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  CRM Lead
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{phone}</span>
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="px-4 py-3.5">
                          <Badge
                            variant="outline"
                            className={
                              isMissed
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isOutbound
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }
                          >
                            {isMissed ? 'Missed' : isOutbound ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </td>

                        {/* Outcome */}
                        <td className="px-4 py-3.5">
                          <span className="capitalize text-xs font-medium text-foreground">
                            {call.outcomeType || call.endedReason || (isMissed ? 'No Answer' : 'Connected')}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {call.durationSec > 0
                            ? `${Math.floor(call.durationSec / 60)}m ${call.durationSec % 60}s`
                            : '—'}
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                        </td>

                        {/* Notes / CRM Status */}
                        <td className="px-4 py-3.5 max-w-xs">
                          {call.summary ? (
                            <p className="text-xs text-foreground truncate" title={call.summary}>
                              {call.summary}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No notes</span>
                          )}
                          {call.lead && (
                            <span className="text-[11px] text-emerald-600 block mt-0.5">
                              Status: {call.lead.status} {call.lead.value ? `· $${call.lead.value}` : ''}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isConverted ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                disabled={convertingId === call.id}
                                onClick={() => handleConvertToLead(call)}
                              >
                                <UserPlus className="size-3.5 mr-1" />
                                {convertingId === call.id ? 'Converting…' : '+ Lead'}
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                                <CheckCircle2 className="size-3 mr-1" /> In CRM
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleWhatsApp(phone)}
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="size-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-slate-700 hover:bg-slate-100"
                              onClick={() => window.open(`tel:${phone}`)}
                              title="Call back"
                            >
                              <PhoneCall className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manual Log Modal ── */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Phone Call</DialogTitle>
            <DialogDescription>Record a phone conversation and optionally create a CRM lead.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Customer Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1 555-0199"
                value={logPhone}
                onChange={(e) => setLogPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Call Direction</Label>
                <Select value={logType} onValueChange={(val: any) => setLogType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound (Received)</SelectItem>
                    <SelectItem value="outbound">Outbound (Dialed)</SelectItem>
                    <SelectItem value="missed">Missed Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={logOutcome} onValueChange={setLogOutcome}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Spoke / Interested</SelectItem>
                    <SelectItem value="followup">Follow-up Needed</SelectItem>
                    <SelectItem value="missed">No Answer</SelectItem>
                    <SelectItem value="cancelled">Cancelled / Busy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {logType !== 'missed' && (
              <div className="space-y-1.5">
                <Label htmlFor="duration">Approx. Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="2"
                  value={logDurationMin}
                  onChange={(e) => setLogDurationMin(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes & Requirements</Label>
              <Textarea
                id="notes"
                placeholder="Customer asked for quote on AC servicing next Tuesday…"
                rows={3}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Save as CRM Lead</Label>
                <p className="text-xs text-muted-foreground">Automatically add this caller to your Leads pipeline</p>
              </div>
              <Switch checked={logCreateLead} onCheckedChange={setLogCreateLead} />
            </div>

            {logCreateLead && (
              <div className="space-y-1.5">
                <Label htmlFor="leadValue">Estimated Deal Value ($)</Label>
                <Input
                  id="leadValue"
                  type="number"
                  placeholder="350"
                  value={logLeadValue}
                  onChange={(e) => setLogLeadValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={logSubmitting}
              onClick={handleSaveManualLog}
            >
              {logSubmitting ? 'Saving…' : 'Save Call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
