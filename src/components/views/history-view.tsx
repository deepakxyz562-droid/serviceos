'use client';

/**
 * History View — tabbed view combining Activity Logs, Job History, and Lead History.
 *
 * Replaces the standalone Activity Logs view in the sidebar. The first tab shows
 * the original ActivityLogsView; the second shows completed + soft-deleted jobs
 * (with filters: date range, payment status, etc.); the third shows soft-deleted
 * leads (with permanent-delete option).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Briefcase,
  Target,
  Trash2,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { ActivityLogsView } from './activity-logs-view';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistoryJob {
  id: string;
  jobNumber?: string;
  title: string;
  status: string;
  priority: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  amountCollected?: number | null;
  quotedAmount?: number | null;
  customerName?: string | null;
  assigneeName?: string | null;
  completedAt?: string | null;
  actualEndTime?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HistoryLead {
  id: string;
  title?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  status: string;
  priority: string;
  value: number;
  source: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Job History Tab ────────────────────────────────────────────────────────

export function JobHistoryTab({ onSelectJob }: { onSelectJob?: (jobId: string) => void } = {}) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL jobs (including soft-deleted + completed) with the lighter
      // `select` (history=true). The same-day grace filter is applied
      // client-side using UTC comparison so completed-today jobs stay in the
      // Active list and only move to History the next day. This is enforced
      // client-side because the Supabase REST adapter cannot handle the
      // nested OR structure a server-side filter would require.
      const res = await fetch('/api/jobs?includeDeleted=true&history=true');
      if (res.ok) {
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];
        const now = new Date();
        // SAME-DAY GRACE: show soft-deleted jobs OR completed jobs that were
        // NOT completed today (UTC). Completed-today jobs stay in Active.
        setJobs(
          all.filter((j) => {
            if (j.deletedAt) return true; // soft-deleted → always in history
            if (j.status !== 'completed') return false; // active job → not in history
            const completedAt = j.completedAt || j.actualEndTime;
            if (!completedAt) return true; // legacy completed job with no timestamp
            const cd = new Date(completedAt);
            const isToday =
              cd.getUTCFullYear() === now.getUTCFullYear() &&
              cd.getUTCMonth() === now.getUTCMonth() &&
              cd.getUTCDate() === now.getUTCDate();
            return !isToday; // completed before today → show in history
          })
        );
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !j.title.toLowerCase().includes(q) &&
        !(j.customerName || '').toLowerCase().includes(q) &&
        !(j.jobNumber || '').toLowerCase().includes(q)
      )
        return false;
    }
    if (paymentFilter !== 'all') {
      const isPaid = j.paymentStatus === 'paid' || j.amountCollected != null;
      if (paymentFilter === 'paid' && !isPaid) return false;
      if (paymentFilter === 'pending' && isPaid) return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'deleted' && !j.deletedAt) return false;
      if (statusFilter === 'completed' && (j.deletedAt || j.status !== 'completed')) return false;
    }
    if (startDate) {
      const jobDate = new Date(j.completedAt || j.updatedAt);
      if (jobDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const jobDate = new Date(j.completedAt || j.updatedAt);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      if (jobDate > end) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (action: 'delete' | 'restore') => {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selectedIds), action }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.success} job${data.success !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : 'restored'}`);
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
        fetchJobs();
      } else {
        toast.error('Bulk action failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, customer, job #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All History</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="deleted">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Payment Pending</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px]" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px]" />
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 px-4 py-2.5">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => runBulkAction('restore')} disabled={bulkRunning}>
            <RotateCcw className="size-3.5 mr-1" /> Restore
          </Button>
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setBulkDeleteOpen(true)} disabled={bulkRunning}>
            <Trash2 className="size-3.5 mr-1" /> Delete Permanently
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading job history...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Briefcase className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No job history found</p>
          <p className="text-sm">Completed and archived jobs will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <Card key={job.id} className={`hover:shadow-sm transition-shadow ${onSelectJob && !job.deletedAt ? 'cursor-pointer' : ''}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleSelect(job.id)}
                  className="size-4 rounded cursor-pointer shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className="flex-1 min-w-0"
                  onClick={() => {
                    if (onSelectJob && !job.deletedAt) onSelectJob(job.id);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{job.jobNumber || job.id.slice(0, 8).toUpperCase()}</span>
                    {job.deletedAt ? (
                      <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-200">Archived</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="size-3 mr-0.5" /> Completed
                      </Badge>
                    )}
                    {job.paymentStatus === 'paid' || job.amountCollected != null ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Payment Pending</Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {job.customerName && <span>{job.customerName}</span>}
                    {job.assigneeName && <span>· {job.assigneeName}</span>}
                    {job.completedAt && <span>· Completed {new Date(job.completedAt).toLocaleDateString()}</span>}
                    {job.deletedAt && <span>· Archived {new Date(job.deletedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    {job.quotedAmount != null && (
                      <p className="text-sm font-semibold">${job.quotedAmount.toFixed(2)}</p>
                    )}
                    {job.amountCollected != null && (
                      <p className="text-xs text-emerald-600">Collected ${job.amountCollected.toFixed(2)}</p>
                    )}
                  </div>
                  {onSelectJob && !job.deletedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(job.id);
                      }}
                      className="shrink-0 min-h-[36px]"
                    >
                      View / Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" /> Permanently Delete {selectedIds.size} Job{selectedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} job{selectedIds.size !== 1 ? 's' : ''} from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runBulkAction('delete')}
              disabled={bulkRunning}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {bulkRunning ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Lead History Tab ───────────────────────────────────────────────────────

function LeadHistoryTab() {
  const [leads, setLeads] = useState<HistoryLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch soft-deleted leads only
      const res = await fetch('/api/leads?deleted=true');
      if (res.ok) {
        const data = await res.json();
        const all = Array.isArray(data) ? data : (data.leads || []);
        setLeads(all.filter((l: HistoryLead) => l.deletedAt));
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.title || '').toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (action: 'delete' | 'restore') => {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), action }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.success} lead${data.success !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : 'restored'}`);
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
        fetchLeads();
      } else {
        toast.error('Bulk action failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 px-4 py-2.5">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => runBulkAction('restore')} disabled={bulkRunning}>
            <RotateCcw className="size-3.5 mr-1" /> Restore
          </Button>
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setBulkDeleteOpen(true)} disabled={bulkRunning}>
            <Trash2 className="size-3.5 mr-1" /> Delete Permanently
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Lead list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading lead history...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Target className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No deleted leads found</p>
          <p className="text-sm">Soft-deleted leads will appear here for permanent removal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <Card key={lead.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="size-4 rounded cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                      <XCircle className="size-3 mr-0.5" /> Deleted
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{lead.priority}</Badge>
                  </div>
                  <h4 className="font-semibold text-sm truncate">{lead.title || lead.name}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{lead.name}</span>
                    <span>· {lead.phone}</span>
                    {lead.email && <span>· {lead.email}</span>}
                    <span>· Deleted {new Date(lead.deletedAt!).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {lead.value > 0 && <p className="text-sm font-semibold">${lead.value.toFixed(2)}</p>}
                  <p className="text-xs text-muted-foreground">{lead.source}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" /> Permanently Delete {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runBulkAction('delete')}
              disabled={bulkRunning}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {bulkRunning ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main History View (tabs) ───────────────────────────────────────────────

export function HistoryView() {
  const [tab, setTab] = useState('activity');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-slate-600">
          <History className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">History</h2>
          <p className="text-sm text-muted-foreground">
            Activity logs, completed jobs, and deleted leads — all in one place
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-11">
          <TabsTrigger value="activity" className="text-sm min-h-[44px]">
            <History className="size-4 mr-1.5" /> Activity Logs
          </TabsTrigger>
          <TabsTrigger value="jobs" className="text-sm min-h-[44px]">
            <Briefcase className="size-4 mr-1.5" /> Job History
          </TabsTrigger>
          <TabsTrigger value="leads" className="text-sm min-h-[44px]">
            <Target className="size-4 mr-1.5" /> Lead History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <ActivityLogsView />
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
          <JobHistoryTab />
        </TabsContent>
        <TabsContent value="leads" className="mt-6">
          <LeadHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HistoryView;
