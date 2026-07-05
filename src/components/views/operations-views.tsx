'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Briefcase, Clock, CheckCircle2, Search, Plus, X, Zap, Wrench,
  Sparkles, Eye, Loader2, AlertCircle, RotateCcw, Play,
  MessageCircle, Calendar, Inbox as InboxIcon, Users, FileText,
  ChevronRight, MapPin, Phone, Flag, UserPlus, DollarSign,
  LayoutGrid, List as ListIcon, ArrowRight, Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Shared helpers ────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, bg, subtitle }: {
  title: string; value: string; icon: React.ElementType; color: string; bg: string; subtitle?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2 sm:p-2.5 rounded-xl', bg)}>
            <Icon className={cn('size-4 sm:size-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return '—'; }
};

// ════════════════════════════════════════════════════════════════════
// JOBS VIEW
// ════════════════════════════════════════════════════════════════════
type JobStatus = 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
type JobPriority = 'low' | 'medium' | 'high' | 'urgent';
type JobType = 'service' | 'installation' | 'repair' | 'maintenance' | 'inspection';

interface Job {
  id: string;
  jobNumber: string | null;
  title: string;
  description: string | null;
  service: string | null;
  status: JobStatus;
  priority: JobPriority;
  type: JobType;
  address: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneePhone: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string; phone: string; status: string } | null;
  customer: { id: string; name: string; phone: string; email: string | null } | null;
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending', assigned: 'Assigned', accepted: 'Accepted',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

const JOB_TYPE_LABELS: Record<JobType, string> = {
  service: 'Service', installation: 'Installation', repair: 'Repair',
  maintenance: 'Maintenance', inspection: 'Inspection',
};

const jobStatusColors: Record<JobStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

const jobPriorityColors: Record<JobPriority, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const jobTypeIcons: Record<JobType, React.ElementType> = {
  service: Sparkles, installation: Wrench, repair: Zap,
  maintenance: Clock, inspection: Eye,
};

const statusFlow: JobStatus[] = ['pending', 'assigned', 'accepted', 'in_progress', 'completed'];

interface NewJobForm {
  title: string; description: string; type: JobType; priority: JobPriority;
  address: string; customerName: string; customerPhone: string;
  assigneeId: string; assigneeName: string; scheduledAt: string; notes: string; service: string;
}

const emptyJobForm: NewJobForm = {
  title: '', description: '', type: 'service', priority: 'medium',
  address: '', customerName: '', customerPhone: '',
  assigneeId: '', assigneeName: '', scheduledAt: '', notes: '', service: '',
};

export function JobsView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<NewJobForm>(emptyJobForm);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<{id: string; name: string; phone: string; skills: string[]; status: string}[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Fetch employees for assign dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees?autoRefreshStatus=true&limit=50');
        if (res.ok) {
          const json = await res.json();
          const mapped = (json.data || []).map((e: any) => ({
            id: e.id, name: e.name, phone: e.phone,
            skills: (() => { try { return JSON.parse(e.skills || '[]'); } catch { return []; } })(),
            status: e.status,
          }));
          setEmployees(mapped);
        }
      } catch {}
    };
    fetchEmployees();
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (priorityFilter !== 'All') params.set('priority', priorityFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.customerName.trim()) return;
    try {
      setCreating(true);
      const res = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title, description: createForm.description || undefined,
          type: createForm.type, priority: createForm.priority, service: createForm.service || undefined,
          address: createForm.address || undefined, customerName: createForm.customerName,
          customerPhone: createForm.customerPhone || undefined,
          assigneeId: createForm.assigneeId || undefined,
          assigneeName: createForm.assigneeName || undefined,
          assigneePhone: employees.find(e => e.id === createForm.assigneeId)?.phone || undefined,
          scheduledAt: createForm.scheduledAt || undefined, notes: createForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create job');
      toast.success('Job created successfully');
      setCreateOpen(false); setCreateForm(emptyJobForm); await fetchJobs();
    } catch { toast.error('Failed to create job'); }
    finally { setCreating(false); }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: JobStatus) => {
    try {
      setUpdatingId(jobId);
      const res = await fetch('/api/jobs', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Job status updated to ${JOB_STATUS_LABELS[newStatus]}`);
      await fetchJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingId(null); }
  };

  const handleAssignEmployee = async (jobId: string, empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    try {
      setUpdatingId(jobId);
      const res = await fetch('/api/jobs', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, assigneeId: emp.id, assigneeName: emp.name, assigneePhone: emp.phone, status: 'assigned' }),
      });
      if (!res.ok) throw new Error('Failed to assign employee');
      toast.success(`${emp.name} assigned to job`);
      await fetchJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, assigneeId: emp.id, assigneeName: emp.name, assigneePhone: emp.phone, status: 'assigned' } : prev);
      }
    } catch { toast.error('Failed to assign employee'); }
    finally { setUpdatingId(null); }
  };

  const handleGenerateInvoice = async (job: Job) => {
    setGeneratingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id, customerId: job.customerId || undefined,
          customerName: job.customerName, customerPhone: job.customerPhone,
          itemsJson: JSON.stringify([{ description: job.title || job.service || 'Service', quantity: 1, unitPrice: 0, amount: 0 }]),
          status: 'draft',
        }),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      toast.success('Invoice generated', { description: `Invoice created for ${job.customerName || 'job'}` });
    } catch { toast.error('Failed to generate invoice'); }
    finally { setGeneratingInvoice(false); }
  };

  const getNextStatus = (status: JobStatus): JobStatus | null => {
    const flow: Record<JobStatus, JobStatus | null> = {
      pending: 'assigned', assigned: 'accepted', accepted: 'in_progress',
      in_progress: 'completed', completed: null, cancelled: null,
    };
    return flow[status];
  };

  const stats = useMemo(() => ({
    total: jobs.length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
  }), [jobs]);

  const openJobDetail = (job: Job) => { setSelectedJob(job); setDetailOpen(true); };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Briefcase className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Jobs Management</h1>
            <p className="text-sm text-muted-foreground">Track and manage all service jobs</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Create Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Jobs" value={stats.total.toString()} icon={Briefcase} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="In Progress" value={stats.inProgress.toString()} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Completed" value={stats.completed.toString()} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Pending" value={stats.pending.toString()} icon={AlertCircle} color="text-slate-600" bg="bg-slate-50" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button variant={statusFilter === 'All' ? 'default' : 'outline'} size="sm" className={cn('text-xs h-7 shrink-0', statusFilter === 'All' && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => setStatusFilter('All')}>All</Button>
              {(['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled'] as JobStatus[]).map(s => (
                <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className={cn('text-xs h-7 shrink-0', statusFilter === s && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => setStatusFilter(s)}>
                  {JOB_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priority</SelectItem>
                {(['low', 'medium', 'high', 'urgent'] as JobPriority[]).map(p => (
                  <SelectItem key={p} value={p}>{JOB_PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading jobs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-red-50"><AlertCircle className="size-6 text-red-500" /></div>
                <p className="text-sm font-medium text-red-600">Failed to load jobs</p>
                <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchJobs} className="gap-1.5 mt-1"><RotateCcw className="size-3" /> Retry</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => {
                const TypeIcon = jobTypeIcons[job.type];
                const nextStatus = getNextStatus(job.status);
                const isUpdating = updatingId === job.id;
                return (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-muted cursor-pointer" onClick={() => openJobDetail(job)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-50 shrink-0"><TypeIcon className="size-4 text-emerald-600" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{job.customerName || 'Unknown Customer'}</p>
                          {job.whatsappSessionId && <MessageCircle className="size-3 text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.jobNumber || job.id.slice(0, 8)} &middot; {JOB_TYPE_LABELS[job.type]} &middot; {job.assigneeName || 'Unassigned'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{job.address || 'No address'} &middot; {fmtDate(job.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={cn('text-[10px] hidden sm:inline-flex', jobPriorityColors[job.priority])}>{JOB_PRIORITY_LABELS[job.priority]}</Badge>
                      <Badge variant="outline" className={cn('text-[10px]', jobStatusColors[job.status])}>{JOB_STATUS_LABELS[job.status]}</Badge>
                      <div className="flex items-center gap-0.5">
                        {nextStatus && (
                          <Button variant="ghost" size="sm" className="size-7 p-0" title={`Move to ${JOB_STATUS_LABELS[nextStatus]}`} disabled={isUpdating} onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, nextStatus); }}>
                            {isUpdating ? <div className="size-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> : <Play className="size-3 text-emerald-600" />}
                          </Button>
                        )}
                        {job.status !== 'cancelled' && job.status !== 'completed' && (
                          <Button variant="ghost" size="sm" className="size-7 p-0" title="Cancel" disabled={isUpdating} onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'cancelled'); }}>
                            <X className="size-3 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Briefcase className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No jobs found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statusFilter !== 'All' || searchQuery ? 'Try adjusting your filters or search.' : 'Create your first job to get started.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Job Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>Add a new service job to the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="job-title">Title *</Label>
              <Input id="job-title" placeholder="e.g. AC Repair at Sharma Residence" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Service</Label>
                <Input placeholder="e.g., AC Repair" value={createForm.service} onChange={e => setCreateForm(f => ({ ...f, service: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={(v: JobType) => setCreateForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['service', 'installation', 'repair', 'maintenance', 'inspection'] as JobType[]).map(t => (
                      <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={createForm.priority} onValueChange={(v: JobPriority) => setCreateForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as JobPriority[]).map(p => (
                      <SelectItem key={p} value={p}>{JOB_PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Scheduled At</Label>
                <Input type="datetime-local" value={createForm.scheduledAt} onChange={e => setCreateForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input placeholder="Service address" value={createForm.address} onChange={e => setCreateForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Customer Name *</Label>
                <Input placeholder="Customer name" value={createForm.customerName} onChange={e => setCreateForm(f => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Customer Phone</Label>
                <Input placeholder="+91 98765 43210" value={createForm.customerPhone} onChange={e => setCreateForm(f => ({ ...f, customerPhone: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assign Technician</Label>
              <Select value={createForm.assigneeId} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setCreateForm(f => ({ ...f, assigneeId: v === 'unassigned' ? '' : v, assigneeName: v === 'unassigned' ? '' : (emp?.name || '') }));
              }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.filter(e => e.status === 'available').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} {emp.skills.slice(0, 2).length > 0 ? `(${emp.skills.slice(0, 2).join(', ')})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea placeholder="Job details..." value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input placeholder="Additional notes" value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={creating || !createForm.title.trim() || !createForm.customerName.trim()}>
              {creating ? 'Creating...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedJob.title}</SheetTitle>
                <SheetDescription>{selectedJob.jobNumber || selectedJob.id.slice(0, 8)}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Priority Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs', jobStatusColors[selectedJob.status])}>{JOB_STATUS_LABELS[selectedJob.status]}</Badge>
                  <Badge variant="outline" className={cn('text-xs', jobPriorityColors[selectedJob.priority])}>{JOB_PRIORITY_LABELS[selectedJob.priority]}</Badge>
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">{JOB_TYPE_LABELS[selectedJob.type]}</Badge>
                </div>

                {/* Status Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Status Timeline</h4>
                  <div className="flex items-center gap-1">
                    {statusFlow.map((s, idx) => {
                      const isActive = statusFlow.indexOf(selectedJob.status) >= idx;
                      const isCurrent = selectedJob.status === s;
                      return (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <div className={cn('size-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-colors', isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400')}>
                            {isActive ? '✓' : idx + 1}
                          </div>
                          <span className={cn('text-[9px] hidden sm:inline', isCurrent ? 'font-bold text-emerald-600' : isActive ? 'text-emerald-500' : 'text-muted-foreground')}>{JOB_STATUS_LABELS[s]}</span>
                          {idx < statusFlow.length - 1 && <div className={cn('flex-1 h-0.5', isActive && statusFlow.indexOf(selectedJob.status) > idx ? 'bg-emerald-500' : 'bg-slate-200')} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Job Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{selectedJob.customerName || 'Unknown'}</p>
                    {selectedJob.customerPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="size-3" />{selectedJob.customerPhone}</p>}
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Technician</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5"><AvatarFallback className="text-[8px]">{(selectedJob.assigneeName || '?').split(' ').map(n => n[0]).join('').substring(0, 2)}</AvatarFallback></Avatar>
                      <p className="text-sm font-medium">{selectedJob.assigneeName || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Address</p>
                    <p className="text-sm font-medium flex items-center gap-1"><MapPin className="size-3 shrink-0" />{selectedJob.address || 'No address'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Scheduled</p>
                    <p className="text-sm font-medium flex items-center gap-1"><Calendar className="size-3 shrink-0" />{selectedJob.scheduledAt ? fmtDateTime(selectedJob.scheduledAt) : 'Not scheduled'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{fmtDate(selectedJob.createdAt)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium">{fmtDate(selectedJob.completedAt)}</p>
                  </div>
                </div>

                {/* Assign Employee */}
                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5"><UserPlus className="size-4" />Assign Technician</h4>
                      <div className="flex gap-2">
                        <Select onValueChange={(v) => handleAssignEmployee(selectedJob.id, v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Select available technician" /></SelectTrigger>
                          <SelectContent>
                            {employees.filter(e => e.status === 'available').map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} {emp.skills.slice(0, 2).length > 0 ? `(${emp.skills.slice(0, 2).join(', ')})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* Update Status Buttons */}
                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {getNextStatus(selectedJob.status) && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => handleStatusUpdate(selectedJob.id, getNextStatus(selectedJob.status)!)} disabled={updatingId === selectedJob.id}>
                          <Play className="size-3" />Move to {JOB_STATUS_LABELS[getNextStatus(selectedJob.status)!]}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleStatusUpdate(selectedJob.id, 'cancelled')} disabled={updatingId === selectedJob.id}>
                        <Ban className="size-3" />Cancel Job
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedJob.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Notes</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{selectedJob.notes}</p>
                    </div>
                  </>
                )}

                {selectedJob.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{selectedJob.description}</p>
                  </div>
                )}

                {/* Generate Invoice */}
                {selectedJob.status === 'completed' && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="size-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-semibold">Generate Invoice</p>
                          <p className="text-xs text-muted-foreground">Create an invoice for this completed job</p>
                        </div>
                      </div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleGenerateInvoice(selectedJob)} disabled={generatingInvoice}>
                        {generatingInvoice ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />}
                        {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                      </Button>
                    </div>
                  </>
                )}

                {/* Rating */}
                {selectedJob.rating && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Customer Rating</h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} className={cn('text-lg', i <= selectedJob.rating! ? 'text-amber-400' : 'text-slate-200')}>★</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// INBOX VIEW — Placeholder
// ════════════════════════════════════════════════════════════════════
export function InboxView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="p-4 rounded-full bg-emerald-50 mb-4">
        <InboxIcon className="size-8 text-emerald-600" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">WhatsApp Inbox</h2>
      <p className="text-sm text-muted-foreground mt-1">Multi-agent shared inbox coming soon</p>
      <p className="text-xs text-muted-foreground mt-2">Conversations will appear here when connected to WhatsApp Business API</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCHEDULING VIEW — Placeholder
// ════════════════════════════════════════════════════════════════════
export function SchedulingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="p-4 rounded-full bg-emerald-50 mb-4">
        <Calendar className="size-8 text-emerald-600" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Smart Scheduling</h2>
      <p className="text-sm text-muted-foreground mt-1">AI-powered scheduling coming soon</p>
      <p className="text-xs text-muted-foreground mt-2">Drag-and-drop calendar with smart time-slot recommendations will appear here</p>
    </div>
  );
}
