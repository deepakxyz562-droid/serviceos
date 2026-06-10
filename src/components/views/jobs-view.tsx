'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase, Plus, Search, RefreshCw, Filter, Clock, MapPin, User,
  Phone, Calendar, Play, CheckCircle2, XCircle, Eye, ChevronRight,
  ArrowRight, AlertCircle, Activity, Zap, Navigation, Timer,
  Pencil, Trash2, Camera, Image,
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
import { authFetch } from '@/lib/client-auth';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { CardGridSkeleton } from '@/components/shared/view-loader';

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

interface CompletionProof {
  id: string;
  jobId: string;
  completionNotes?: string;
  completionPhotosJson?: string;
  completionSignatureData?: string;
  paymentMethod?: string;
  amountCollected?: number;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-teal-100 text-teal-700 border-teal-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
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
    en_route: <Navigation className="size-3" />,
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

  // Edit job dialog
  const [showEditJob, setShowEditJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    customerName: '',
    customerPhone: '',
    type: 'service',
    priority: 'medium',
    address: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);

  // Complete with proof
  const [showCompleteProof, setShowCompleteProof] = useState(false);
  const [proofForm, setProofForm] = useState({
    completionNotes: '',
    completionPhotos: [] as string[],
    completionSignatureData: '',
    amountCollected: '',
  });
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // View proof
  const [showProofView, setShowProofView] = useState(false);
  const [proofData, setProofData] = useState<CompletionProof | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await authFetch(`/api/jobs?${params.toString()}`);
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
      const res = await authFetch('/api/employees');
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

      const res = await authFetch('/api/jobs', {
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
          status: assignee ? 'assigned' : 'pending',
        }),
      });

      if (res.ok) {
        toast.success('Job created successfully');
        setShowCreateJob(false);
        setJobForm({
          title: '', customerName: '', customerPhone: '', type: 'service',
          address: '', scheduledDate: '', scheduledTime: '', assigneeId: 'none',
          priority: 'medium', notes: '',
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
      const res = await authFetch('/api/jobs/lifecycle', {
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
          const detailRes = await authFetch(`/api/jobs/lifecycle?jobId=${jobId}`);
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
      const res = await authFetch(`/api/jobs/lifecycle?jobId=${job.id}`);
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
      const res = await authFetch(`/api/jobs/${jobId}`, {
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

  // ─── Edit Job ──────────────────────────────────────────────────────────

  const openEditJob = (job: Job) => {
    setEditingJob(job);
    const scheduledDate = job.scheduledAt
      ? new Date(job.scheduledAt).toISOString().split('T')[0]
      : '';
    setEditForm({
      title: job.title || '',
      customerName: job.customerName || '',
      customerPhone: job.customerPhone || '',
      type: job.type || 'service',
      priority: job.priority || 'medium',
      address: job.address || '',
      scheduledDate,
      scheduledTime: job.scheduledTime || '',
      notes: job.notes || '',
    });
    setShowEditJob(true);
  };

  const handleSaveEdit = async () => {
    if (!editingJob || !editForm.title) {
      toast.error('Job title is required');
      return;
    }
    try {
      const scheduledAt = editForm.scheduledDate && editForm.scheduledTime
        ? new Date(`${editForm.scheduledDate}T${editForm.scheduledTime}`).toISOString()
        : undefined;

      const res = await authFetch(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingJob.id,
          title: editForm.title,
          type: editForm.type,
          priority: editForm.priority,
          address: editForm.address || undefined,
          customerName: editForm.customerName || undefined,
          customerPhone: editForm.customerPhone || undefined,
          scheduledAt,
          scheduledTime: editForm.scheduledTime || undefined,
          notes: editForm.notes || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Job updated successfully');
        setShowEditJob(false);
        setEditingJob(null);
        fetchJobs();
        // Refresh detail if open
        if (showJobDetail && selectedJob?.id === editingJob.id) {
          const detailRes = await authFetch(`/api/jobs/lifecycle?jobId=${editingJob.id}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setSelectedJob(data);
          }
        }
      } else {
        toast.error('Failed to update job');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Delete Job ────────────────────────────────────────────────────────

  const openDeleteConfirm = (job: Job) => {
    setDeletingJob(job);
    setShowDeleteConfirm(true);
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    try {
      const res = await authFetch(`/api/jobs/${deletingJob.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Job deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingJob(null);
        setShowJobDetail(false);
        setSelectedJob(null);
        fetchJobs();
      } else {
        toast.error('Failed to delete job');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Complete with Proof ──────────────────────────────────────────────

  const openCompleteProof = (job: Job) => {
    setEditingJob(job);
    setProofForm({
      completionNotes: '',
      completionPhotos: [],
      completionSignatureData: '',
      amountCollected: '',
    });
    setShowCompleteProof(true);
    // Initialize canvas after dialog opens
    setTimeout(() => {
      const canvas = signatureCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }, 100);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxPhotos = 3;
    const maxSize = 2 * 1024 * 1024; // 2MB
    const remaining = maxPhotos - proofForm.completionPhotos.length;

    if (remaining <= 0) {
      toast.error('Maximum 3 photos allowed');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 2MB limit`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setProofForm(prev => ({
          ...prev,
          completionPhotos: [...prev.completionPhotos, base64],
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setProofForm(prev => ({
      ...prev,
      completionPhotos: prev.completionPhotos.filter((_, i) => i !== index),
    }));
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setProofForm(prev => ({ ...prev, completionSignatureData: dataUrl }));
  };

  const handleSubmitProof = async () => {
    if (!editingJob) return;

    // Save signature before submitting
    saveSignature();

    const amount = proofForm.amountCollected ? parseFloat(proofForm.amountCollected) : 0;

    try {
      const res = await authFetch(`/api/jobs/${editingJob.id}/complete-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completionNotes: proofForm.completionNotes || undefined,
          completionPhotosJson: proofForm.completionPhotos.length > 0
            ? JSON.stringify(proofForm.completionPhotos)
            : undefined,
          completionSignatureData: proofForm.completionSignatureData || undefined,
          paymentMethod: amount > 0 ? 'cod' : undefined,
          amountCollected: amount > 0 ? amount : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Job completed with proof successfully');
        setShowCompleteProof(false);
        setEditingJob(null);
        fetchJobs();
        // Refresh detail if open
        if (showJobDetail && selectedJob?.id === editingJob.id) {
          const detailRes = await authFetch(`/api/jobs/lifecycle?jobId=${editingJob.id}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setSelectedJob(data);
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to complete job with proof');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── View Proof ───────────────────────────────────────────────────────

  const handleViewProof = async (job: Job) => {
    setProofLoading(true);
    setShowProofView(true);
    try {
      const res = await authFetch(`/api/jobs/${job.id}/complete-proof`);
      if (res.ok) {
        const data = await res.json();
        setProofData(data);
      } else {
        toast.error('Failed to load completion proof');
        setProofData(null);
      }
    } catch {
      toast.error('Network error');
      setProofData(null);
    } finally {
      setProofLoading(false);
    }
  };

  const getActionButtons = (job: Job) => {
    switch (job.status) {
      case 'pending':
        return (
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}
            >
              <User className="size-3 mr-1" /> Assign
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openEditJob(job); }}
            >
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
          </div>
        );
      case 'assigned':
        return (
          <div className="flex gap-1 flex-wrap">
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
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openEditJob(job); }}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); handleLifecycleAction('complete', job.id); }}
            >
              <CheckCircle2 className="size-3 mr-1" /> Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openCompleteProof(job); }}
            >
              <Camera className="size-3 mr-1" /> Proof
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openEditJob(job); }}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        );
      case 'completed':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}
            >
              <Eye className="size-3 mr-1" /> View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); handleViewProof(job); }}
            >
              <Image className="size-3 mr-1" alt="Proof" /> Proof
            </Button>
          </div>
        );
      case 'cancelled':
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); openEditJob(job); }}
          >
            <Pencil className="size-3" />
          </Button>
        );
      default:
        return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <ViewHeader
        icon={Briefcase}
        iconBg="bg-amber-600"
        title="Jobs"
        description="Manage and track all service jobs"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateJob(true)}>
            <Plus className="size-4 mr-1.5" /> Create Job
          </Button>
        }
      />

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', icon: Briefcase },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600', icon: Clock },
          { label: 'Assigned', value: stats.assigned, color: 'text-teal-600', icon: User },
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
              <TabsTrigger value="all" className="text-xs">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="assigned" className="text-xs">Assigned ({stats.assigned})</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs">In Progress ({stats.inProgress})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs">Cancelled ({stats.cancelled})</TabsTrigger>
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
        <CardGridSkeleton count={6} columns={3} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Create a new job or adjust your filters to get started"
          actionLabel="Create Job"
          onAction={() => setShowCreateJob(true)}
        />
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
                  job.status === 'assigned' ? '#14b8a6' :
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

                {/* Estimated Duration */}
                {job.estimatedDuration && (
                  <div className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-0.5 border border-teal-100 w-fit">
                    <Timer className="size-3 text-teal-600" />
                    <span className="text-[11px] font-medium text-teal-700">{job.estimatedDuration} min</span>
                  </div>
                )}

                {/* Assignee */}
                {job.assigneeName ? (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                        {job.assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={jobForm.type} onValueChange={(v) => setJobForm({ ...jobForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="salon">Salon</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Service location address"
                value={jobForm.address}
                onChange={(e) => setJobForm({ ...jobForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

      {/* ─── Edit Job Dialog ────────────────────────────────────────────── */}
      <Dialog open={showEditJob} onOpenChange={setShowEditJob}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              {editingJob?.jobNumber && (
                <span className="font-mono">{editingJob.jobNumber}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., AC Repair at Customer Site"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  placeholder="Customer name"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  placeholder="+1 555 123 4567"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="salon">Salon</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Service location address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={editForm.scheduledDate}
                  onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time</Label>
                <Input
                  type="time"
                  value={editForm.scheduledTime}
                  onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or instructions"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditJob(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveEdit}
              disabled={!editForm.title}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingJob && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="font-medium text-sm">{deletingJob.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {deletingJob.jobNumber || deletingJob.id.slice(0, 8).toUpperCase()} &middot; {deletingJob.status.replace('_', ' ')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteJob}
            >
              <Trash2 className="size-4 mr-1.5" /> Delete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Complete with Proof Dialog ──────────────────────────────────── */}
      <Dialog open={showCompleteProof} onOpenChange={setShowCompleteProof}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete with Proof</DialogTitle>
            <DialogDescription>
              Add completion details, photos, and signature for this job
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Completion Notes */}
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea
                placeholder="Describe what was done, any issues encountered..."
                value={proofForm.completionNotes}
                onChange={(e) => setProofForm({ ...proofForm, completionNotes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Completion Photos (max 3, 2MB each)</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                    <Camera className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {proofForm.completionPhotos.length < 3 ? 'Add Photos' : 'Limit Reached'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={proofForm.completionPhotos.length >= 3}
                  />
                </label>
              </div>
              {proofForm.completionPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {proofForm.completionPhotos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={photo}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                        onClick={() => setLightboxImage(photo)}
                      />
                      <button
                        className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(i)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Signature</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      clearSignature();
                      setProofForm(prev => ({ ...prev, completionSignatureData: '' }));
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={saveSignature}
                  >
                    Save Signature
                  </Button>
                </div>
              </div>
              <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={signatureCanvasRef}
                  width={460}
                  height={160}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              {proofForm.completionSignatureData && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Saved signature:</p>
                  <img
                    src={proofForm.completionSignatureData}
                    alt="Signature"
                    className="h-16 border rounded bg-white cursor-pointer"
                    onClick={() => setLightboxImage(proofForm.completionSignatureData)}
                  />
                </div>
              )}
            </div>

            {/* COD Payment */}
            <div className="space-y-2">
              <Label>COD Payment Amount (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-7"
                  value={proofForm.amountCollected}
                  onChange={(e) => setProofForm({ ...proofForm, amountCollected: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
              {proofForm.amountCollected && parseFloat(proofForm.amountCollected) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Payment method will be set to COD
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteProof(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmitProof}
            >
              <CheckCircle2 className="size-4 mr-1.5" /> Complete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Proof Dialog ───────────────────────────────────────────── */}
      <Dialog open={showProofView} onOpenChange={setShowProofView}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completion Proof</DialogTitle>
            <DialogDescription>Job completion details and evidence</DialogDescription>
          </DialogHeader>
          {proofLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : proofData ? (
            <div className="space-y-5">
              {/* Completion Notes */}
              {proofData.completionNotes && (
                <div>
                  <p className="text-sm font-medium mb-1">Completion Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted/50 rounded-lg">
                    {proofData.completionNotes}
                  </p>
                </div>
              )}

              {/* Photos */}
              {(() => {
                let photos: string[] = [];
                try {
                  photos = proofData.completionPhotosJson ? JSON.parse(proofData.completionPhotosJson) : [];
                } catch { /* empty */ }
                if (photos.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm font-medium mb-2">Completion Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt={`Completion photo ${i + 1}`}
                          className="w-full h-40 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage(photo)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Signature */}
              {proofData.completionSignatureData && (
                <div>
                  <p className="text-sm font-medium mb-1">Signature</p>
                  <img
                    src={proofData.completionSignatureData}
                    alt="Completion signature"
                    className="h-24 border rounded-lg bg-white cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(proofData.completionSignatureData)}
                  />
                </div>
              )}

              {/* Payment Details */}
              {(proofData.paymentMethod || (proofData.amountCollected != null && proofData.amountCollected > 0)) && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Payment Details</p>
                  <div className="flex items-center gap-3 text-sm">
                    {proofData.paymentMethod && (
                      <Badge variant="outline" className="text-xs">
                        {proofData.paymentMethod.toUpperCase()}
                      </Badge>
                    )}
                    {proofData.amountCollected != null && proofData.amountCollected > 0 && (
                      <span className="font-semibold text-green-700">
                        ${proofData.amountCollected.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                Completed on {formatDateTime(proofData.createdAt)}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No proof data available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Lightbox Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full size"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Assign Employee Dialog ────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>
              {assigningJob ? `Select an employee for: ${assigningJob.title}` : 'Select an employee'}
            </DialogDescription>
          </DialogHeader>
          {assigningJob && (
            <div className="space-y-4">
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
                  <ScrollArea className="max-h-64">
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
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleLifecycleAction('complete', selectedJob.id)}
                      disabled={lifecycleLoading}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" /> Complete
                    </Button>
                    <Button
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setShowJobDetail(false);
                        openCompleteProof(selectedJob);
                      }}
                    >
                      <Camera className="size-4 mr-1.5" /> Complete with Proof
                    </Button>
                  </>
                )}
                {selectedJob.status === 'completed' && (
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => handleViewProof(selectedJob)}
                  >
                    <Image className="size-4 mr-1.5" alt="Proof" /> View Proof
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

                {/* Edit & Delete buttons */}
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowJobDetail(false);
                      openEditJob(selectedJob);
                    }}
                  >
                    <Pencil className="size-4 mr-1.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      setShowJobDetail(false);
                      openDeleteConfirm(selectedJob);
                    }}
                  >
                    <Trash2 className="size-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
