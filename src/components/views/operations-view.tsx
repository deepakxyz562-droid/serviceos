'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Clock, CheckCircle2, AlertCircle, BarChart3, Search,
  Plus, RefreshCw, XCircle, ChevronRight, MapPin, Phone, Star,
  User, Settings, Trash2, Edit, Eye, Play, ArrowRight, ExternalLink,
  Filter, MoreHorizontal, Activity, Globe, Database, Server,
  Zap, Link2, Shield, CheckCircle, XCircle as XIcon, AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Types
interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  pickup?: string;
  dropoff?: string;
  scheduledAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  resourceId?: string;
  externalId?: string;
  externalSource?: string;
  notificationLogJson?: string;
  createdAt: string;
  updatedAt: string;
  resource?: { id: string; name: string; phone: string; type: string };
  assignee?: { id: string; name: string; phone: string };
  customer?: { id: string; name: string; phone: string };
}

interface Resource {
  id: string;
  name: string;
  phone: string;
  type: string;
  status: string;
  skills: string;
  location?: string;
  rating: number;
  completedJobs: number;
  whatsappId?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookSource {
  id: string;
  name: string;
  type: string;
  configJson: string;
  status: string;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

// Status color helpers
function getJobStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600 border-gray-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getResourceStatusColor(status: string) {
  const colors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    busy: 'bg-orange-100 text-orange-700 border-orange-200',
    offline: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getTypeEmoji(type: string) {
  const emojis: Record<string, string> = {
    driver: '🚗', cleaner: '🧹', beautician: '💇', doctor: '👨‍⚕️',
    technician: '🔧', packer: '📦', mover: '🚚', electrician: '⚡', delivery: '🛵',
  };
  return emojis[type] || '👤';
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    driver: 'Driver', cleaner: 'Cleaner', beautician: 'Beautician', doctor: 'Doctor',
    technician: 'Technician', packer: 'Packer', mover: 'Mover', electrician: 'Electrician', delivery: 'Delivery',
  };
  return labels[type] || type;
}

function getJobTypeLabel(type: string) {
  const labels: Record<string, string> = {
    delivery: '🛵 Delivery', service: '🔧 Service', transport: '🚚 Transport',
    installation: '⚡ Installation', salon: '💇 Salon', healthcare: '👨‍⚕️ Healthcare',
  };
  return labels[type] || type;
}

function getWebhookTypeIcon(type: string) {
  const icons: Record<string, string> = {
    supabase: '🟢', postgresql: '🐘', mongodb: '🍃', firebase: '🔥',
    mysql: '🐬', redis: '🔴', api: '🌐', webhook: '🔗',
  };
  return icons[type] || '📡';
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export function OperationsView() {
  const [activeTab, setActiveTab] = useState('jobs');

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningJob, setAssigningJob] = useState<Job | null>(null);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  // Per-job loading state so only the clicked card button shows a spinner.
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Resources state
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState({ name: '', phone: '', type: 'driver', location: '', skills: '' });

  // Webhook sources state
  const [webhookSources, setWebhookSources] = useState<WebhookSource[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ name: '', type: 'supabase' });

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobStatusFilter !== 'all') params.set('status', jobStatusFilter);
      if (jobTypeFilter !== 'all') params.set('type', jobTypeFilter);
      if (jobSearch) params.set('search', jobSearch);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [jobStatusFilter, jobTypeFilter, jobSearch]);

  // Fetch resources
  const fetchResources = useCallback(async () => {
    setResourcesLoading(true);
    try {
      const params = new URLSearchParams();
      if (resourceTypeFilter !== 'all') params.set('type', resourceTypeFilter);
      if (resourceStatusFilter !== 'all') params.set('status', resourceStatusFilter);
      if (resourceSearch) params.set('search', resourceSearch);
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResources(Array.isArray(data) ? data : []);
      }
    } catch {
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  }, [resourceTypeFilter, resourceStatusFilter, resourceSearch]);

  // Fetch webhook sources
  const fetchWebhookSources = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch('/api/webhook-sources');
      if (res.ok) {
        const data = await res.json();
        setWebhookSources(Array.isArray(data) ? data : []);
      }
    } catch {
      setWebhookSources([]);
    } finally {
      setWebhooksLoading(false);
    }
  }, []);

  // Fetch available resources for assignment
  const fetchAvailableResources = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams({ status: 'available' });
      if (type) params.set('type', type);
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableResources(Array.isArray(data) ? data : []);
      }
    } catch {
      setAvailableResources([]);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    fetchWebhookSources();
  }, [fetchWebhookSources]);

  // Job lifecycle actions
  const handleLifecycleAction = async (action: string, jobId: string, resourceId?: string) => {
    setLifecycleLoading(true);
    setLoadingJobId(jobId);
    setLoadingAction(action);
    try {
      const res = await fetch('/api/jobs/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, resourceId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Job ${action} successfully`);
        fetchJobs();
        if (action === 'assign') {
          setShowAssignDialog(false);
          setAssigningJob(null);
        }
        if (showJobDetail && selectedJob?.id === jobId) {
          setSelectedJob(data);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} job`);
      }
    } catch {
      toast.error(`Network error: Failed to ${action} job`);
    } finally {
      setLifecycleLoading(false);
      setLoadingJobId(null);
      setLoadingAction(null);
    }
  };

  // Open assign dialog
  const openAssignDialog = (job: Job) => {
    setAssigningJob(job);
    fetchAvailableResources(job.type);
    setShowAssignDialog(true);
  };

  // Open job detail
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

  // Resource CRUD
  const handleSaveResource = async () => {
    const isEditing = !!editingResource;
    try {
      const url = '/api/resources';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? { id: editingResource!.id, ...resourceForm, skills: resourceForm.skills ? resourceForm.skills.split(',').map((s) => s.trim()) : [] }
        : { ...resourceForm, skills: resourceForm.skills ? resourceForm.skills.split(',').map((s) => s.trim()) : [] };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Resource ${isEditing ? 'updated' : 'created'} successfully`);
        setShowAddResource(false);
        setEditingResource(null);
        setResourceForm({ name: '', phone: '', type: 'driver', location: '', skills: '' });
        fetchResources();
      } else {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} resource`);
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const res = await fetch(`/api/resources?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Resource deleted');
        fetchResources();
      } else {
        toast.error('Failed to delete resource');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    const skills = (() => { try { return JSON.parse(resource.skills || '[]').join(', '); } catch { return resource.skills; } })();
    setResourceForm({
      name: resource.name,
      phone: resource.phone,
      type: resource.type,
      location: resource.location || '',
      skills,
    });
    setShowAddResource(true);
  };

  // Webhook source CRUD
  const handleSaveWebhookSource = async () => {
    try {
      const res = await fetch('/api/webhook-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });
      if (res.ok) {
        toast.success('Webhook source created');
        setShowAddWebhook(false);
        setWebhookForm({ name: '', type: 'supabase' });
        fetchWebhookSources();
      } else {
        toast.error('Failed to create webhook source');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteWebhookSource = async (id: string) => {
    try {
      const res = await fetch(`/api/webhook-sources?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Webhook source deleted');
        fetchWebhookSources();
      } else {
        toast.error('Failed to delete webhook source');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleTestWebhookSource = async (source: WebhookSource) => {
    toast.info(`Testing connection to ${source.name}...`);
    try {
      const res = await fetch('/api/webhook-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'TEST', source: source.type, sourceId: source.id }),
      });
      if (res.ok) {
        toast.success(`${source.name} connection test passed`);
      } else {
        toast.error(`${source.name} connection test failed`);
      }
    } catch {
      toast.error('Network error during test');
    }
  };

  // Compute stats
  const jobStats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    inProgress: jobs.filter((j) => j.status === 'in_progress').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    urgent: jobs.filter((j) => j.priority === 'urgent' || j.priority === 'high').length,
  };

  const resourceStats = {
    total: resources.length,
    available: resources.filter((r) => r.status === 'available').length,
    busy: resources.filter((r) => r.status === 'busy').length,
    offline: resources.filter((r) => r.status === 'offline').length,
  };

  // Parse notification log
  const parseNotificationLog = (logJson?: string) => {
    try {
      return logJson ? JSON.parse(logJson) : [];
    } catch {
      return [];
    }
  };

  // Get action buttons for job status
  const getJobActionButtons = (job: Job) => {
    switch (job.status) {
      case 'pending':
        return (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}>
            <User className="size-3 mr-1" /> Assign Resource
          </Button>
        );
      case 'assigned':
        return (
          <div className="flex gap-1">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('start', job.id); }}
              disabled={loadingJobId === job.id && loadingAction === 'start'}
            >
              {loadingJobId === job.id && loadingAction === 'start'
                ? <Loader2 className="size-3 mr-1 animate-spin" />
                : <Play className="size-3 mr-1" />} Start Job
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}>
              <RefreshCw className="size-3 mr-1" /> Reassign
            </Button>
          </div>
        );
      case 'in_progress':
        return (
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('complete', job.id); }}
            disabled={loadingJobId === job.id && loadingAction === 'complete'}
          >
            {loadingJobId === job.id && loadingAction === 'complete'
              ? <Loader2 className="size-3 mr-1 animate-spin" />
              : <CheckCircle2 className="size-3 mr-1" />} Complete Job
          </Button>
        );
      case 'completed':
        return (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}>
            <Eye className="size-3 mr-1" /> View Details
          </Button>
        );
      case 'cancelled':
        return (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); toast.info('Reopen functionality would be triggered here'); }}>
            <RefreshCw className="size-3 mr-1" /> Reopen
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Truck className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Operations</h2>
          <p className="text-sm text-muted-foreground">Monitor and manage operational workflows</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="jobs" className="gap-1.5">
            <BarChart3 className="size-3.5" /> Jobs
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5">
            <Users className="size-3.5" /> Resources
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5">
            <Globe className="size-3.5" /> Webhook Sources
          </TabsTrigger>
        </TabsList>

        {/* ===================== JOBS TAB ===================== */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Stats bar */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Jobs</p>
                  <p className="text-lg font-bold">{jobStats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">{jobStats.pending}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-lg font-bold text-emerald-600">{jobStats.inProgress}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-bold text-green-600">{jobStats.completed}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Urgent</p>
                  <p className="text-lg font-bold text-red-600">{jobStats.urgent}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="assigned">👤 Assigned</SelectItem>
                <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                <SelectItem value="completed">✅ Completed</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="delivery">🛵 Delivery</SelectItem>
                <SelectItem value="service">🔧 Service</SelectItem>
                <SelectItem value="transport">🚚 Transport</SelectItem>
                <SelectItem value="installation">⚡ Installation</SelectItem>
                <SelectItem value="salon">💇 Salon</SelectItem>
                <SelectItem value="healthcare">👨‍⚕️ Healthcare</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchJobs()}>
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {/* Job cards grid */}
          {jobsLoading ? (
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="size-10 mb-3 opacity-30" />
              <p>No jobs found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openJobDetail(job)}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Title + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight">{job.title}</h4>
                      <Badge variant="outline" className={getPriorityColor(job.priority)}>
                        {job.priority}
                      </Badge>
                    </div>

                    {/* ID + Type */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-mono">{job.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {getJobTypeLabel(job.type)}
                      </Badge>
                      <Badge variant="outline" className={getJobStatusColor(job.status)}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Customer + Route */}
                    {job.customerName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3" />
                        <span>{job.customerName}</span>
                      </div>
                    )}
                    {(job.pickup || job.dropoff) && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {job.pickup && <span className="truncate max-w-[100px]">{job.pickup}</span>}
                        {job.pickup && job.dropoff && <ArrowRight className="size-3 text-muted-foreground shrink-0" />}
                        {job.dropoff && <span className="truncate max-w-[100px]">{job.dropoff}</span>}
                      </div>
                    )}

                    {/* Assignee */}
                    {job.assigneeName && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-medium">
                          {job.assigneeName[0]}
                        </div>
                        <span className="text-muted-foreground">{job.assigneeName}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-1 border-t">
                      {getJobActionButtons(job)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Assign Resource Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Assign Resource</DialogTitle>
                <DialogDescription>
                  {assigningJob ? `Assign a resource to: ${assigningJob.title}` : 'Select a resource'}
                </DialogDescription>
              </DialogHeader>
              {assigningJob && (
                <div className="space-y-4">
                  {/* Job details */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{assigningJob.title}</span>
                      <Badge variant="outline" className={getJobStatusColor(assigningJob.status)}>
                        {assigningJob.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Type: {getTypeLabel(assigningJob.type)} • Priority: {assigningJob.priority}</p>
                    {assigningJob.customerName && <p className="text-xs text-muted-foreground">Customer: {assigningJob.customerName}</p>}
                    {assigningJob.address && <p className="text-xs text-muted-foreground">Address: {assigningJob.address}</p>}
                  </div>

                  <Separator />

                  {/* Available Resources */}
                  <div>
                    <p className="text-sm font-medium mb-2">Available Resources</p>
                    {availableResources.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No available resources found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2">
                          {availableResources.map((resource) => (
                            <button
                              key={resource.id}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                              onClick={() => handleLifecycleAction('assign', assigningJob.id, resource.id)}
                              disabled={lifecycleLoading}
                            >
                              <div className="size-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium shrink-0">
                                {resource.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{resource.name}</span>
                                  <span className="text-xs">{getTypeEmoji(resource.type)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="size-3" /> {resource.phone}
                                  {resource.location && (
                                    <>
                                      <MapPin className="size-3 ml-1" /> {resource.location}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-0.5 text-xs">
                                  <Star className="size-3 text-yellow-500 fill-yellow-500" />
                                  <span>{resource.rating.toFixed(1)}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{resource.completedJobs} jobs</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Job Detail Dialog */}
          <Dialog open={showJobDetail} onOpenChange={setShowJobDetail}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Job Details</DialogTitle>
                <DialogDescription>{selectedJob?.title}</DialogDescription>
              </DialogHeader>
              {selectedJob && (
                <div className="space-y-4">
                  {/* Job info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className={getJobStatusColor(selectedJob.status)}>
                        {selectedJob.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <Badge variant="outline" className={getPriorityColor(selectedJob.priority)}>
                        {selectedJob.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p>{getJobTypeLabel(selectedJob.type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ID</p>
                      <p className="font-mono text-xs">{selectedJob.id}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer & Assignment */}
                  <div className="space-y-2 text-sm">
                    {selectedJob.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <span>Customer: {selectedJob.customerName}</span>
                        {selectedJob.customerPhone && <span className="text-muted-foreground">({selectedJob.customerPhone})</span>}
                      </div>
                    )}
                    {selectedJob.assigneeName && (
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-emerald-600" />
                        <span>Assignee: {selectedJob.assigneeName}</span>
                        {selectedJob.assigneePhone && <span className="text-muted-foreground">({selectedJob.assigneePhone})</span>}
                      </div>
                    )}
                    {(selectedJob.pickup || selectedJob.dropoff) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        <span>{selectedJob.pickup || '—'} → {selectedJob.dropoff || '—'}</span>
                      </div>
                    )}
                    {selectedJob.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        <span>{selectedJob.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Timeline */}
                  <div>
                    <p className="text-sm font-medium mb-2">Lifecycle Timeline</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Created', time: selectedJob.createdAt, icon: <Plus className="size-3" /> },
                        { label: 'Assigned', time: selectedJob.assigneeName ? selectedJob.updatedAt : null, icon: <User className="size-3" /> },
                        { label: 'Started', time: selectedJob.actualStartTime, icon: <Play className="size-3" /> },
                        { label: 'Completed', time: selectedJob.actualEndTime, icon: <CheckCircle2 className="size-3" /> },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`size-6 rounded-full flex items-center justify-center ${
                            step.time ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                          }`}>
                            {step.icon}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm ${step.time ? '' : 'text-muted-foreground'}`}>{step.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {step.time ? formatTime(step.time) : '—'}
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
                      <div>
                        <p className="text-sm font-medium mb-2">Notification Log</p>
                        <ScrollArea className="max-h-32">
                          <div className="space-y-1">
                            {logs.map((log: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                                <Zap className="size-3 text-yellow-500" />
                                <span className="font-medium">{log.action}</span>
                                {log.resourceName && <span className="text-muted-foreground">→ {log.resourceName}</span>}
                                {log.timestamp && <span className="text-muted-foreground ml-auto">{new Date(log.timestamp).toLocaleTimeString()}</span>}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })()}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===================== RESOURCES TAB ===================== */}
        <TabsContent value="resources" className="space-y-4">
          {/* Stats bar */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{resourceStats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-lg font-bold text-emerald-600">{resourceStats.available}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Busy</p>
                  <p className="text-lg font-bold text-orange-600">{resourceStats.busy}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Offline</p>
                  <p className="text-lg font-bold text-gray-600">{resourceStats.offline}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="driver">🚗 Driver</SelectItem>
                <SelectItem value="cleaner">🧹 Cleaner</SelectItem>
                <SelectItem value="beautician">💇 Beautician</SelectItem>
                <SelectItem value="doctor">👨‍⚕️ Doctor</SelectItem>
                <SelectItem value="technician">🔧 Technician</SelectItem>
                <SelectItem value="packer">📦 Packer</SelectItem>
                <SelectItem value="mover">🚚 Mover</SelectItem>
                <SelectItem value="electrician">⚡ Electrician</SelectItem>
                <SelectItem value="delivery">🛵 Delivery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resourceStatusFilter} onValueChange={setResourceStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchResources()}>
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingResource(null); setResourceForm({ name: '', phone: '', type: 'driver', location: '', skills: '' }); setShowAddResource(true); }}>
              <Plus className="size-3.5 mr-1" /> Add Resource
            </Button>
          </div>

          {/* Resource cards */}
          {resourcesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="size-10 mb-3 opacity-30" />
              <p>No resources found</p>
              <p className="text-xs">Try adjusting your filters or add a new resource</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => {
                const skills = (() => { try { return JSON.parse(resource.skills || '[]'); } catch { return [resource.skills]; } })();
                return (
                  <Card key={resource.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-medium">
                            {getTypeEmoji(resource.type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{resource.name}</h4>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] h-4">{getTypeLabel(resource.type)}</Badge>
                              <Badge variant="outline" className={getResourceStatusColor(resource.status)}>
                                {resource.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{resource.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {resource.phone}
                        </div>
                        {resource.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3" /> {resource.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3" /> {resource.completedJobs} jobs completed
                        </div>
                      </div>

                      {/* Skills */}
                      {skills.length > 0 && typeof skills[0] === 'string' && skills[0] !== '' && (
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 4).map((skill: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] h-4">
                              {skill}
                            </Badge>
                          ))}
                          {skills.length > 4 && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              +{skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 border-t flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditResource(resource)}>
                          <Edit className="size-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDeleteResource(resource.id)}>
                          <Trash2 className="size-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit Resource Dialog */}
          <Dialog open={showAddResource} onOpenChange={setShowAddResource}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
                <DialogDescription>{editingResource ? 'Update resource information' : 'Add a new resource to the system'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Resource name" value={resourceForm.name} onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+91 98765 43210" value={resourceForm.phone} onChange={(e) => setResourceForm({ ...resourceForm, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={resourceForm.type} onValueChange={(v) => setResourceForm({ ...resourceForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">🚗 Driver</SelectItem>
                      <SelectItem value="cleaner">🧹 Cleaner</SelectItem>
                      <SelectItem value="beautician">💇 Beautician</SelectItem>
                      <SelectItem value="doctor">👨‍⚕️ Doctor</SelectItem>
                      <SelectItem value="technician">🔧 Technician</SelectItem>
                      <SelectItem value="packer">📦 Packer</SelectItem>
                      <SelectItem value="mover">🚚 Mover</SelectItem>
                      <SelectItem value="electrician">⚡ Electrician</SelectItem>
                      <SelectItem value="delivery">🛵 Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="City or area" value={resourceForm.location} onChange={(e) => setResourceForm({ ...resourceForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma separated)</Label>
                  <Input placeholder="e.g., driving, navigation, heavy lifting" value={resourceForm.skills} onChange={(e) => setResourceForm({ ...resourceForm, skills: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddResource(false); setEditingResource(null); }}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveResource}>
                  {editingResource ? 'Update Resource' : 'Add Resource'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===================== WEBHOOK SOURCES TAB ===================== */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Webhook Sources</h3>
              <p className="text-sm text-muted-foreground">Manage external data sources and webhooks</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setWebhookForm({ name: '', type: 'supabase' }); setShowAddWebhook(true); }}>
              <Plus className="size-4 mr-2" /> Add Source
            </Button>
          </div>

          {webhooksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : webhookSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Globe className="size-10 mb-3 opacity-30" />
              <p>No webhook sources configured</p>
              <p className="text-xs">Add a source to start receiving external data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {webhookSources.map((source) => (
                <Card key={source.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                          {getWebhookTypeIcon(source.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{source.name}</h4>
                          <Badge variant="outline" className="text-[10px] h-4 capitalize">
                            {source.type}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className={source.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
                        {source.status}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3" />
                        <span>Last Sync: {source.lastSyncAt ? formatTime(source.lastSyncAt) : 'Never'}</span>
                      </div>
                      {source.lastError && (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle className="size-3" />
                          <span className="truncate">{source.lastError}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleTestWebhookSource(source)}>
                        <Zap className="size-3 mr-1" /> Test
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info('Edit functionality would open here')}>
                        <Edit className="size-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDeleteWebhookSource(source.id)}>
                        <Trash2 className="size-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Webhook Source Dialog */}
          <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Webhook Source</DialogTitle>
                <DialogDescription>Connect an external data source to receive job events</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Source Name</Label>
                  <Input placeholder="e.g., Production Supabase" value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select value={webhookForm.type} onValueChange={(v) => setWebhookForm({ ...webhookForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supabase">🟢 Supabase</SelectItem>
                      <SelectItem value="postgresql">🐘 PostgreSQL</SelectItem>
                      <SelectItem value="mongodb">🍃 MongoDB</SelectItem>
                      <SelectItem value="firebase">🔥 Firebase</SelectItem>
                      <SelectItem value="mysql">🐬 MySQL</SelectItem>
                      <SelectItem value="redis">🔴 Redis</SelectItem>
                      <SelectItem value="api">🌐 REST API</SelectItem>
                      <SelectItem value="webhook">🔗 Custom Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Webhook URL for this source:</p>
                  <code className="text-[11px] break-all">{window.location.origin}/api/webhook-ingest</code>
                  <p className="mt-2">Send POST requests with <code>eventType</code>: NEW_JOB, UPDATE_JOB, or CANCEL_JOB</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveWebhookSource}>Add Source</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Users icon (needed for tab trigger)
function Users({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
