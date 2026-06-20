'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Search, RefreshCw, Filter, Clock, MapPin, User,
  Phone, Calendar, Play, CheckCircle2, XCircle, Eye, ChevronRight,
  ArrowRight, AlertCircle, Activity, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  pickup?: string;
  dropoff?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  serviceId?: string;
  notificationLogJson?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; phone: string; role: string };
  customer?: { id: string; name: string; phone: string; email?: string };
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusIcon(status: string) {
  const map: Record<string, React.ReactNode> = {
    pending: <Clock className="size-3" />,
    assigned: <User className="size-3" />,
    in_progress: <Activity className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
    cancelled: <XCircle className="size-3" />,
  };
  return map[status] || null;
}

function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getJobTypeLabel(type: string) {
  const labels: Record<string, string> = {
    delivery: 'Delivery',
    service: 'Service',
    transport: 'Transport',
    installation: 'Installation',
    salon: 'Salon',
    healthcare: 'Healthcare',
    repair: 'Repair',
    maintenance: 'Maintenance',
  };
  return labels[type] || type;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function parseNotificationLog(logJson?: string) {
  try {
    return logJson ? JSON.parse(logJson) : [];
  } catch {
    return [];
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function JobsView() {
  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Dialogs
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assigningJob, setAssigningJob] = useState<Job | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  // Create job form
  const [jobForm, setJobForm] = useState({
    title: '',
    customerName: '',
    customerPhone: '',
    type: 'service',
    address: '',
    scheduledDate: '',
    scheduledTime: '',
    assigneeId: 'none',
    priority: 'medium',
    notes: '',
    serviceId: '',
    estimatedDuration: '',
  });

  // Service catalog — fetched so the create-job form can pick a service
  // and auto-fill the duration from the catalog.
  const [services, setServices] = useState<
    { id: string; name: string; category: string; basePrice: number; duration: number }[]
  >([]);
  useEffect(() => {
    fetch('/api/services?active=true&limit=200')
      .then((r) => (r.ok ? r.json() : { services: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services ?? [];
        setServices(list);
      })
      .catch(() => setServices([]));
  }, []);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    assigned: jobs.filter(j => j.status === 'assigned').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCreateJob = async () => {
    if (!jobForm.title) {
      toast.error('Job title is required');
      return;
    }
    try {
      const assignee = jobForm.assigneeId !== 'none'
        ? employees.find(e => e.id === jobForm.assigneeId)
        : null;

      const scheduledAt = jobForm.scheduledDate && jobForm.scheduledTime
        ? new Date(`${jobForm.scheduledDate}T${jobForm.scheduledTime}`).toISOString()
        : undefined;

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobForm.title,
          type: jobForm.type,
          priority: jobForm.priority,
          address: jobForm.address || undefined,
          customerName: jobForm.customerName || undefined,
          customerPhone: jobForm.customerPhone || undefined,
          assigneeId: assignee?.id || undefined,
          assigneeName: assignee?.name || undefined,
          assigneePhone: assignee?.phone || undefined,
          scheduledAt,
          scheduledTime: jobForm.scheduledTime || undefined,
          notes: jobForm.notes || undefined,
          serviceId: jobForm.serviceId || undefined,
          estimatedDuration: jobForm.estimatedDuration
            ? Number(jobForm.estimatedDuration)
            : undefined,
          status: assignee ? 'assigned' : 'pending',
        }),
      });

      if (res.ok) {
        toast.success('Job created successfully');
        setShowCreateJob(false);
        setJobForm({
          title: '', customerName: '', customerPhone: '', type: 'service',
          address: '', scheduledDate: '', scheduledTime: '', assigneeId: 'none',
          priority: 'medium', notes: '', serviceId: '', estimatedDuration: '',
        });
        fetchJobs();
      } else {
        toast.error('Failed to create job');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleLifecycleAction = async (action: string, jobId: string, resourceId?: string) => {
    setLifecycleLoading(true);
    try {
      const res = await fetch('/api/jobs/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, resourceId }),
      });
      if (res.ok) {
        toast.success(`Job ${action} successfully`);
        fetchJobs();
        if (action === 'assign') {
          setShowAssignDialog(false);
          setAssigningJob(null);
        }
        if (showJobDetail && selectedJob?.id === jobId) {
          const detailRes = await fetch(`/api/jobs/lifecycle?jobId=${jobId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setSelectedJob(data);
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} job`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const openJobDetail = async (job: Job) => {
    try {
      const res = await fetch(`/api/jobs/lifecycle?jobId=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data);
      } else {
        setSelectedJob(job);
      }
    } catch {
      setSelectedJob(job);
    }
    setShowJobDetail(true);
  };

  const openAssignDialog = (job: Job) => {
    setAssigningJob(job);
    setShowAssignDialog(true);
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: 'cancelled' }),
      });
      if (res.ok) {
        toast.success('Job cancelled');
        fetchJobs();
        setShowJobDetail(false);
      } else {
        toast.error('Failed to cancel job');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const getActionButtons = (job: Job) => {
    switch (job.status) {
      case 'pending':
        return (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}
          >
            <User className="size-3 mr-1" /> Assign
          </Button>
        );
      case 'assigned':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); handleLifecycleAction('start', job.id); }}
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}
            >
              Reassign
            </Button>
          </div>
        );
      case 'in_progress':
        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); handleLifecycleAction('complete', job.id); }}
          >
            <CheckCircle2 className="size-3 mr-1" /> Complete
          </Button>
        );
      case 'completed':
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}
          >
            <Eye className="size-3 mr-1" /> View
          </Button>
        );
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-amber-600">
            <Briefcase className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Jobs</h2>
            <p className="text-sm text-muted-foreground">Manage and track all service jobs</p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowCreateJob(true)}
        >
          <Plus className="size-4 mr-1.5" /> Create Job
        </Button>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', icon: Briefcase },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600', icon: Clock },
          { label: 'Assigned', value: stats.assigned, color: 'text-blue-600', icon: User },
          { label: 'In Progress', value: stats.inProgress, color: 'text-emerald-600', icon: Activity },
          { label: 'Completed', value: stats.completed, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600', icon: XCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color.replace('text-', 'text-').includes('foreground') ? 'text-muted-foreground' : stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Status Filter Tabs + Search ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
            <TabsList>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="assigned" className="text-xs">Assigned</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs">In Progress</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, customer, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchJobs()}>
            <RefreshCw className="size-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Jobs Content ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3 mb-4" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Briefcase className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No jobs found</p>
          <p className="text-sm">Create a new job or adjust your filters</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ─── Card View ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:shadow-md transition-all border-l-4"
              style={{
                borderLeftColor:
                  job.status === 'pending' ? '#f59e0b' :
                  job.status === 'assigned' ? '#3b82f6' :
                  job.status === 'in_progress' ? '#10b981' :
                  job.status === 'completed' ? '#22c55e' :
                  job.status === 'cancelled' ? '#ef4444' : '#94a3b8',
              }}
              onClick={() => openJobDetail(job)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Title + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {job.jobNumber || job.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm leading-tight truncate">{job.title}</h4>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(job.status)} shrink-0 text-[10px]`}>
                    <span className="mr-1">{getStatusIcon(job.status)}</span>
                    {job.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Customer */}
                {job.customerName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3 shrink-0" />
                    <span className="truncate">{job.customerName}</span>
                  </div>
                )}

                {/* Service Type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {getJobTypeLabel(job.type)}
                  </Badge>
                  <Badge variant="outline" className={`${getPriorityColor(job.priority)} text-[10px] h-5`}>
                    {job.priority}
                  </Badge>
                </div>

                {/* Address */}
                {job.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{job.address}</span>
                  </div>
                )}

                {/* Route */}
                {(job.pickup || job.dropoff) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate max-w-[80px]">{job.pickup}</span>
                    <ArrowRight className="size-3 shrink-0" />
                    <span className="truncate max-w-[80px]">{job.dropoff}</span>
                  </div>
                )}

                {/* Schedule */}
                {job.scheduledAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3 shrink-0" />
                    <span>{formatDate(job.scheduledAt)}</span>
                    {job.scheduledTime && <span className="ml-1">{job.scheduledTime}</span>}
                  </div>
                )}

                {/* Assignee */}
                {job.assigneeName ? (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                        {job.assigneeName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{job.assigneeName}</span>
                  </div>
                ) : (
                  <div className="pt-1 border-t">
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="size-3" /> Unassigned
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 border-t">
                  {getActionButtons(job)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────────── */
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => openJobDetail(job)}
                  >
                    <TableCell className="font-mono text-xs">
                      {job.jobNumber || job.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{job.title}</TableCell>
                    <TableCell className="text-sm">{job.customerName || '--'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {getJobTypeLabel(job.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {job.address || job.pickup || '--'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.scheduledAt ? formatDate(job.scheduledAt) : '--'}
                      {job.scheduledTime && <div>{job.scheduledTime}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {job.assigneeName || <span className="text-amber-600 text-xs">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getStatusColor(job.status)} text-[10px]`}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {getActionButtons(job)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* ─── Create Job Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>Schedule a new service job</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Service Catalog dropdown — auto-fills title + duration */}
            <div className="space-y-2">
              <Label>
                Service{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (from catalog — optional)
                </span>
              </Label>
              <Select
                value={jobForm.serviceId || '_none'}
                onValueChange={(v) => {
                  const id = v === '_none' ? '' : v;
                  const svc = services.find((s) => s.id === id);
                  setJobForm((prev) => ({
                    ...prev,
                    serviceId: id,
                    // Auto-fill title only if empty or matches a known service name.
                    title:
                      !prev.title.trim() || services.some((s) => s.name === prev.title)
                        ? svc?.name ?? prev.title
                        : prev.title,
                    // Auto-fill duration from catalog (in minutes).
                    estimatedDuration: svc ? String(svc.duration) : prev.estimatedDuration,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      services.length === 0
                        ? 'No services in catalog'
                        : 'Select a service to auto-fill details'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No service —</SelectItem>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        · {svc.category} · {svc.duration}m · ${svc.basePrice.toFixed(2)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., AC Repair at Customer Site"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  placeholder="Customer name"
                  value={jobForm.customerName}
                  onChange={(e) => setJobForm({ ...jobForm, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  placeholder="+1 555 123 4567"
                  value={jobForm.customerPhone}
                  onChange={(e) => setJobForm({ ...jobForm, customerPhone: e.target.value })}
                />
              </div>
            </div>

            {/* Priority (full-width — Service Type dropdown hidden; jobForm.type
                stays at its default 'service' which is what the API expects for
                a catalog-driven job. The catalog Service dropdown above is the
                source of truth for what kind of job this is.) */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={jobForm.priority} onValueChange={(v) => setJobForm({ ...jobForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Service location address"
                value={jobForm.address}
                onChange={(e) => setJobForm({ ...jobForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={jobForm.scheduledDate}
                  onChange={(e) => setJobForm({ ...jobForm, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time</Label>
                <Input
                  type="time"
                  value={jobForm.scheduledTime}
                  onChange={(e) => setJobForm({ ...jobForm, scheduledTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Est. Duration{' '}
                  <span className="text-xs font-normal text-muted-foreground">(min)</span>
                </Label>
                <Input
                  type="number"
                  min="5"
                  placeholder="60"
                  value={jobForm.estimatedDuration}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, estimatedDuration: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={jobForm.assigneeId} onValueChange={(v) => setJobForm({ ...jobForm, assigneeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignee</SelectItem>
                  {employees.filter(e => e.status === 'available').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.role} ({emp.rating.toFixed(1)} rating)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or instructions"
                value={jobForm.notes}
                onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateJob(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateJob}
              disabled={!jobForm.title}
            >
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Employee Dialog ────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>
              {assigningJob ? `Select an employee for: ${assigningJob.title}` : 'Select an employee'}
            </DialogDescription>
          </DialogHeader>
          {assigningJob && (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{assigningJob.title}</span>
                  <Badge variant="outline" className={getStatusColor(assigningJob.status)}>
                    {assigningJob.status.replace('_', ' ')}
                  </Badge>
                </div>
                {assigningJob.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {assigningJob.address}
                  </p>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Available Employees</p>
                {employees.filter(e => e.status === 'available').length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No available employees
                  </div>
                ) : (
                  <ScrollArea className="max-h-[50vh]">
                    <div className="space-y-2">
                      {employees.filter(e => e.status === 'available').map((emp) => {
                        let skills: string[] = [];
                        try { skills = JSON.parse(emp.skills || '[]'); } catch { /* empty */ }
                        return (
                          <button
                            key={emp.id}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left"
                            onClick={() => handleLifecycleAction('assign', assigningJob.id, emp.id)}
                            disabled={lifecycleLoading}
                          >
                            <Avatar className="size-9 shrink-0">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{emp.name}</span>
                                <Badge variant="outline" className="text-[10px] h-4">{emp.role}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="size-3" /> {emp.phone}
                              </div>
                              {skills.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {skills.slice(0, 3).map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-0.5 text-xs">
                                <span className="text-yellow-500">★</span>
                                <span>{emp.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{emp.completedJobs} jobs</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Job Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={showJobDetail} onOpenChange={setShowJobDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Job Details
              {selectedJob && (
                <Badge variant="outline" className={getStatusColor(selectedJob.status)}>
                  {getStatusIcon(selectedJob.status)}
                  <span className="ml-1">{selectedJob.status.replace('_', ' ')}</span>
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedJob?.jobNumber && (
                <span className="font-mono">{selectedJob.jobNumber}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-5">
              {/* Title & Priority */}
              <div>
                <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={getPriorityColor(selectedJob.priority)}>
                    {selectedJob.priority} priority
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getJobTypeLabel(selectedJob.type)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedJob.customerName && (
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium">{selectedJob.customerName}</p>
                      {selectedJob.customerPhone && (
                        <p className="text-xs text-muted-foreground">{selectedJob.customerPhone}</p>
                      )}
                    </div>
                  </div>
                )}
                {selectedJob.assigneeName && (
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium shrink-0">
                      {selectedJob.assigneeName[0]}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assignee</p>
                      <p className="font-medium">{selectedJob.assigneeName}</p>
                      {selectedJob.assigneePhone && (
                        <p className="text-xs text-muted-foreground">{selectedJob.assigneePhone}</p>
                      )}
                    </div>
                  </div>
                )}
                {selectedJob.address && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p>{selectedJob.address}</p>
                    </div>
                  </div>
                )}
                {selectedJob.scheduledAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p>{formatDate(selectedJob.scheduledAt)}{selectedJob.scheduledTime ? ` at ${selectedJob.scheduledTime}` : ''}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p>{formatDateTime(selectedJob.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              {(selectedJob.description || selectedJob.notes) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">
                      {selectedJob.description ? 'Description' : 'Notes'}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedJob.description || selectedJob.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Status Timeline */}
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Status Timeline</p>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Created',
                      time: selectedJob.createdAt,
                      icon: <Briefcase className="size-3" />,
                      done: true,
                    },
                    {
                      label: 'Assigned',
                      time: selectedJob.assigneeName ? selectedJob.updatedAt : null,
                      icon: <User className="size-3" />,
                      done: !!selectedJob.assigneeName,
                    },
                    {
                      label: 'In Progress',
                      time: selectedJob.actualStartTime,
                      icon: <Play className="size-3" />,
                      done: ['in_progress', 'completed'].includes(selectedJob.status),
                    },
                    {
                      label: 'Completed',
                      time: selectedJob.actualEndTime,
                      icon: <CheckCircle2 className="size-3" />,
                      done: selectedJob.status === 'completed',
                    },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                        step.done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${step.done ? '' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {step.time ? formatDateTime(step.time) : '--'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Log */}
              {(() => {
                const logs = parseNotificationLog(selectedJob.notificationLogJson);
                if (logs.length === 0) return null;
                return (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Notification Log</p>
                      <div className="space-y-1.5">
                        {logs.map((log: Record<string, unknown>, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                            <Zap className="size-3 text-yellow-500 shrink-0" />
                            <span className="font-medium">{String(log.action)}</span>
                            {Boolean(log.resourceName) && (
                              <span className="text-muted-foreground">to {String(log.resourceName)}</span>
                            )}
                            {Boolean(log.timestamp) && (
                              <span className="text-muted-foreground ml-auto">
                                {new Date(String(log.timestamp)).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {selectedJob.status === 'pending' && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setShowJobDetail(false);
                      openAssignDialog(selectedJob);
                    }}
                  >
                    <User className="size-4 mr-1.5" /> Assign
                  </Button>
                )}
                {selectedJob.status === 'assigned' && (
                  <>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleLifecycleAction('start', selectedJob.id)}
                      disabled={lifecycleLoading}
                    >
                      <Play className="size-4 mr-1.5" /> Start Job
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowJobDetail(false);
                        openAssignDialog(selectedJob);
                      }}
                    >
                      Reassign
                    </Button>
                  </>
                )}
                {selectedJob.status === 'in_progress' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleLifecycleAction('complete', selectedJob.id)}
                    disabled={lifecycleLoading}
                  >
                    <CheckCircle2 className="size-4 mr-1.5" /> Complete
                  </Button>
                )}
                {!['completed', 'cancelled'].includes(selectedJob.status) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelJob(selectedJob.id)}
                  >
                    <XCircle className="size-4 mr-1.5" /> Cancel Job
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
