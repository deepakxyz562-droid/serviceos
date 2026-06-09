'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target, Plus, Search, RefreshCw, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye, MessageCircle,
  ArrowRight, Filter, GripVertical, Clock, TrendingUp,
  DollarSign, Users, BarChart3, LayoutGrid,
  List, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, CheckCircle2, X, Send, StickyNote,
  CalendarDays, Briefcase, AlertCircle, User, UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string;
  priority: string;
  value: number;
  description?: string | null;
  address?: string | null;
  serviceType?: string | null;
  assignedToId?: string | null;
  customerId?: string | null;
  jobId?: string | null;
  notesJson: string;
  tagsJson: string;
  followUpAt?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    phone: string;
    avatar?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  job?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

interface LeadFormData {
  name: string;
  phone: string;
  email: string;
  source: string;
  serviceType: string;
  address: string;
  priority: string;
  value: string;
  notes: string;
}

// ============================================================
// Constants
// ============================================================

// 5 pipeline stages for Kanban view
const KANBAN_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; headerBg: string; headerText: string; dotColor: string; icon: string }> = {
  new: {
    label: 'New',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    headerBg: 'bg-teal-600',
    headerText: 'text-white',
    dotColor: 'bg-teal-500',
    icon: '✨',
  },
  contacted: {
    label: 'Contacted',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    dotColor: 'bg-amber-500',
    icon: '📞',
  },
  quoted: {
    label: 'Quoted',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    headerBg: 'bg-violet-600',
    headerText: 'text-white',
    dotColor: 'bg-violet-500',
    icon: '📋',
  },
  won: {
    label: 'Won',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    dotColor: 'bg-emerald-500',
    icon: '🎉',
  },
  lost: {
    label: 'Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    dotColor: 'bg-red-500',
    icon: '✕',
  },
  // Map legacy statuses for API compatibility
  qualified: {
    label: 'Qualified',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    headerBg: 'bg-teal-600',
    headerText: 'text-white',
    dotColor: 'bg-teal-500',
    icon: '✓',
  },
  proposal: {
    label: 'Proposal',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    headerBg: 'bg-violet-600',
    headerText: 'text-white',
    dotColor: 'bg-violet-500',
    icon: '📋',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    dotColor: 'bg-orange-500',
    icon: '🤝',
  },
};

// All statuses available for filtering
const ALL_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

const SOURCE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  website: { label: 'Website', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', icon: '🌐' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '💬' },
  google: { label: 'Google', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '🔍' },
  facebook: { label: 'Facebook', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', icon: '📘' },
  referral: { label: 'Referral', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', icon: '👥' },
  manual: { label: 'Manual', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: '✏️' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  low: { label: 'Low', dotColor: 'bg-slate-400', bgColor: 'bg-slate-50', textColor: 'text-slate-600' },
  medium: { label: 'Medium', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'High', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  urgent: { label: 'Urgent', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

const SERVICE_TYPES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Packers & Movers' },
  { value: 'salon', label: 'Salon' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'electrical', label: 'Electricians' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'courier', label: 'Courier' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'car_wash', label: 'Car Wash' },
  { value: 'repair', label: 'Home Repair' },
];

const EMPTY_FORM: LeadFormData = {
  name: '',
  phone: '',
  email: '',
  source: 'manual',
  serviceType: '',
  address: '',
  priority: 'medium',
  value: '',
  notes: '',
};

// ============================================================
// Helper functions
// ============================================================

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function formatDateMedium(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
}

function getServiceTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const found = SERVICE_TYPES.find((s) => s.value === value);
  return found ? found.label : value;
}

/** Map API status to our 5 kanban stages */
function mapToKanbanStatus(status: string): string {
  if (status === 'qualified') return 'contacted';
  if (status === 'proposal' || status === 'negotiation') return 'quoted';
  return status;
}

// ============================================================
// Component
// ============================================================

export function LeadsView() {
  // Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View state
  const [activeView, setActiveView] = useState<'kanban' | 'table'>('kanban');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Sort state (table view)
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);

  // Notes
  const [newNote, setNewNote] = useState('');

  // ============================================================
  // Fetch leads
  // ============================================================

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotalLeads(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setLeads([]);
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, searchQuery, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, searchQuery]);

  // ============================================================
  // Sorted leads (table view)
  // ============================================================

  const sortedLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'phone': valA = a.phone; valB = b.phone; break;
        case 'email': valA = (a.email || '').toLowerCase(); valB = (b.email || '').toLowerCase(); break;
        case 'source': valA = a.source; valB = b.source; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'value': valA = a.value; valB = b.value; break;
        case 'serviceType': valA = a.serviceType || ''; valB = b.serviceType || ''; break;
        case 'createdAt': valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
        default: valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, sortField, sortDirection]);

  // ============================================================
  // Kanban grouped leads (5 columns)
  // ============================================================

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    for (const status of KANBAN_STATUSES) {
      groups[status] = leads.filter((l) => mapToKanbanStatus(l.status) === status);
    }
    return groups;
  }, [leads]);

  // ============================================================
  // CRUD handlers
  // ============================================================

  const handleSaveLead = async () => {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const isEditing = !!editingLead;
      const url = isEditing ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = isEditing ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim() || null,
        source: leadForm.source,
        status: isEditing ? editingLead.status : 'new',
        priority: leadForm.priority,
        value: parseFloat(leadForm.value) || 0,
        description: leadForm.notes.trim() || null,
        address: leadForm.address.trim() || null,
        serviceType: leadForm.serviceType || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(`Lead ${isEditing ? 'updated' : 'created'} successfully`);
        setShowAddDialog(false);
        setEditingLead(null);
        setLeadForm({ ...EMPTY_FORM });
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${isEditing ? 'update' : 'create'} lead`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    try {
      const res = await fetch(`/api/leads/${deletingLead.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead deleted');
        setShowDeleteDialog(false);
        setDeletingLead(null);
        if (showDetailDialog && selectedLead?.id === deletingLead.id) {
          setShowDetailDialog(false);
          setSelectedLead(null);
        }
        fetchLeads();
      } else {
        toast.error('Failed to delete lead');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleConvertToJob = async () => {
    if (!convertingLead) return;
    setConverting(true);
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: convertingLead.id }),
      });
      if (res.ok) {
        toast.success(`"${convertingLead.name}" converted to job successfully!`);
        setShowConvertDialog(false);
        setConvertingLead(null);
        if (showDetailDialog) {
          setShowDetailDialog(false);
          setSelectedLead(null);
        }
        fetchLeads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to convert lead');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      source: lead.source,
      serviceType: lead.serviceType || '',
      address: lead.address || '',
      priority: lead.priority,
      value: lead.value ? String(lead.value) : '',
      notes: lead.description || '',
    });
    setShowAddDialog(true);
  };

  const openAddLead = () => {
    setEditingLead(null);
    setLeadForm({ ...EMPTY_FORM });
    setShowAddDialog(true);
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  const openConvertDialog = (lead: Lead) => {
    setConvertingLead(lead);
    setShowConvertDialog(true);
  };

  const openDeleteDialog = (lead: Lead) => {
    setDeletingLead(lead);
    setShowDeleteDialog(true);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    try {
      const existingNotes = (() => {
        try { return JSON.parse(selectedLead.notesJson || '[]'); } catch { return []; }
      })();
      const updatedNotes = [...existingNotes, { text: newNote.trim(), createdAt: new Date().toISOString() }];
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesJson: JSON.stringify(updatedNotes) }),
      });
      if (res.ok) {
        toast.success('Note added');
        setNewNote('');
        setSelectedLead({ ...selectedLead, notesJson: JSON.stringify(updatedNotes) });
        fetchLeads();
      } else {
        toast.error('Failed to add note');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="size-3 ml-1" /> :
      <ChevronDown className="size-3 ml-1" />;
  };

  const renderSourceBadge = (source: string) => {
    const config = SOURCE_CONFIG[source];
    if (!config) return <Badge variant="outline" className="text-xs">{source}</Badge>;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bgColor} ${config.color} ${config.borderColor}`}>
        <span className="text-[11px]">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Badge variant="outline" className="text-xs">{status}</Badge>;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bgColor} ${config.color} ${config.borderColor}`}>
        {config.label}
      </Badge>
    );
  };

  // ============================================================
  // Render: Loading skeletons
  // ============================================================

  const renderKanbanSkeletons = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((status) => (
        <div key={status} className="min-w-[260px] w-[260px] shrink-0">
          <div className={`rounded-t-lg p-3 ${STATUS_CONFIG[status].headerBg}`}>
            <Skeleton className="h-4 w-20 bg-white/20" />
          </div>
          <div className="bg-muted/30 rounded-b-lg border border-t-0 p-3 space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================================
  // Render: Kanban card
  // ============================================================

  const renderKanbanCard = (lead: Lead) => (
    <Card
      key={lead.id}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative border-l-4",
        PRIORITY_CONFIG[lead.priority]?.borderColor || 'border-l-gray-300'
      )}
      style={{
        borderLeftColor:
          lead.priority === 'urgent' ? '#ef4444' :
          lead.priority === 'high' ? '#f97316' :
          lead.priority === 'medium' ? '#f59e0b' :
          '#94a3b8',
      }}
      onClick={() => openDetail(lead)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header row with initials avatar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">
              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">{lead.name}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" /> {lead.phone}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {!['won', 'lost'].includes(lead.status) && (
                <DropdownMenuItem onClick={() => openConvertDialog(lead)}>
                  <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openEditLead(lead)}>
                <Pencil className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Source badge with icon + Service type */}
        <div className="flex flex-wrap items-center gap-1">
          {renderSourceBadge(lead.source)}
          {lead.serviceType && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {getServiceTypeLabel(lead.serviceType)}
            </Badge>
          )}
        </div>

        {/* Value - prominently displayed */}
        {lead.value > 0 ? (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 border border-emerald-100">
            <DollarSign className="size-3.5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{formatUSD(lead.value)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="size-3" />
            <span>No value set</span>
          </div>
        )}

        {/* Assigned to */}
        {lead.assignedTo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3" />
            <span className="truncate">{lead.assignedTo.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateShort(lead.createdAt)}
          </span>
          {!['won', 'lost'].includes(lead.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[32px] text-[10px] px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={(e) => { e.stopPropagation(); openConvertDialog(lead); }}
            >
              <ArrowRight className="size-3 mr-0.5" /> Convert
            </Button>
          )}
          {lead.status === 'won' && lead.job && (
            <Badge variant="outline" className="text-[10px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="size-2.5 mr-0.5" /> Job
            </Badge>
          )}
        </div>

        {/* Drag indicator */}
        <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
          <GripVertical className="size-3 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================
  // Render: Kanban board
  // ============================================================

  const renderKanbanBoard = () => {
    if (loading) return renderKanbanSkeletons();

    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-h-[400px]">
          {KANBAN_STATUSES.map((status) => {
            const config = STATUS_CONFIG[status];
            const columnLeads = kanbanGroups[status] || [];
            const columnValue = columnLeads.reduce((sum, l) => sum + (l.value || 0), 0);
            return (
              <div key={status} className="min-w-[260px] w-[260px] shrink-0">
                {/* Column header */}
                <div className={`rounded-t-lg px-3 py-2.5 ${config.headerBg} ${config.headerText} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className="font-semibold text-sm">{config.label}</span>
                    <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
                      {columnLeads.length}
                    </Badge>
                  </div>
                  {columnValue > 0 && (
                    <span className="text-xs opacity-80">{formatUSD(columnValue)}</span>
                  )}
                </div>
                {/* Column body */}
                <div className="bg-muted/30 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <p className="text-xs">No leads</p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => renderKanbanCard(lead))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  // ============================================================
  // Render: Table view
  // ============================================================

  const renderTableView = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Target className="size-12 mb-3 opacity-20" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openAddLead}>
              <Plus className="size-4 mr-1" /> Add Lead
            </Button>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <span className="flex items-center">Name <SortIcon field="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('phone')}>
                      <span className="flex items-center">Phone <SortIcon field="phone" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('email')}>
                      <span className="flex items-center">Email <SortIcon field="email" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('source')}>
                      <span className="flex items-center">Source <SortIcon field="source" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('serviceType')}>
                      <span className="flex items-center">Service <SortIcon field="serviceType" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <span className="flex items-center">Status <SortIcon field="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('value')}>
                      <span className="flex items-center">Value <SortIcon field="value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('createdAt')}>
                      <span className="flex items-center">Date <SortIcon field="createdAt" /></span>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(lead)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
                          {lead.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{lead.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{lead.email || '—'}</TableCell>
                      <TableCell>{renderSourceBadge(lead.source)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {lead.serviceType ? getServiceTypeLabel(lead.serviceType) : '—'}
                      </TableCell>
                      <TableCell>{renderStatusBadge(lead.status)}</TableCell>
                      <TableCell className="hidden md:table-cell font-medium text-sm">
                        {lead.value > 0 ? formatUSD(lead.value) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDateShort(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openDetail(lead)}>
                              <Eye className="size-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            {!['won', 'lost'].includes(lead.status) && (
                              <DropdownMenuItem onClick={() => openConvertDialog(lead)}>
                                <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditLead(lead)}>
                              <Pencil className="size-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {leads.length} of {totalLeads} leads
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // Render: Add Lead Dialog
  // ============================================================

  const renderAddDialog = () => (
    <Dialog open={showAddDialog} onOpenChange={(open) => {
      if (!open) {
        setShowAddDialog(false);
        setEditingLead(null);
        setLeadForm({ ...EMPTY_FORM });
      }
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-600" />
            {editingLead ? 'Edit Lead' : 'Add Lead'}
          </DialogTitle>
          <DialogDescription>
            {editingLead ? 'Update lead information' : 'Add a new lead to your pipeline'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="lead-name">Name *</Label>
            <Input
              id="lead-name"
              placeholder="Full name"
              value={leadForm.name}
              onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
            />
          </div>

          {/* Phone & Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone *</Label>
              <Input
                id="lead-phone"
                placeholder="+1 234 567 8900"
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="email@example.com"
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
              />
            </div>
          </div>

          {/* Source & Service Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Service Type</Label>
              <Select value={leadForm.serviceType} onValueChange={(v) => setLeadForm({ ...leadForm, serviceType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="lead-address">Address</Label>
            <Input
              id="lead-address"
              placeholder="Street address, city, state"
              value={leadForm.address}
              onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
            />
          </div>

          {/* Priority & Value row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={leadForm.priority} onValueChange={(v) => setLeadForm({ ...leadForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-value">Value ($)</Label>
              <Input
                id="lead-value"
                type="number"
                placeholder="0"
                value={leadForm.value}
                onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              placeholder="Add any notes about this lead..."
              rows={3}
              value={leadForm.notes}
              onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingLead(null); setLeadForm({ ...EMPTY_FORM }); }}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveLead} disabled={saving}>
            {saving && <RefreshCw className="size-4 mr-1 animate-spin" />}
            {editingLead ? 'Update Lead' : 'Add Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Render: Lead Detail Dialog
  // ============================================================

  const renderDetailDialog = () => {
    if (!selectedLead) return null;

    const leadNotes = (() => {
      try { return JSON.parse(selectedLead.notesJson || '[]'); } catch { return []; }
    })();

    const kanbanStatus = mapToKanbanStatus(selectedLead.status);
    const currentStageIdx = KANBAN_STATUSES.indexOf(kanbanStatus as typeof KANBAN_STATUSES[number]);

    return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-emerald-600" />
              Lead Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name and status */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">{selectedLead.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3.5" /> {selectedLead.phone}
                  </p>
                  {selectedLead.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3.5" /> {selectedLead.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge(selectedLead.status)}
                <span className="flex items-center gap-1">
                  <span className={`size-2 rounded-full ${PRIORITY_CONFIG[selectedLead.priority]?.dotColor || 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">{PRIORITY_CONFIG[selectedLead.priority]?.label || selectedLead.priority}</span>
                </span>
              </div>
            </div>

            <Separator />

            {/* Pipeline Progress */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <TrendingUp className="size-4 text-muted-foreground" /> Pipeline Progress
              </h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {KANBAN_STATUSES.filter((s) => s !== 'lost').map((status, idx) => {
                  const config = STATUS_CONFIG[status];
                  const isCompleted = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div key={status} className="flex items-center gap-1">
                      <div
                        className={cn(
                          'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap',
                          isCompleted && `${config.bgColor} ${config.color} ${config.borderColor} border`,
                          isCurrent && `${config.bgColor} ${config.color} ${config.borderColor} border ring-2 ring-offset-1`,
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted && <CheckCircle2 className="size-3 inline mr-0.5" />}
                        {config.label}
                      </div>
                      {idx < KANBAN_STATUSES.filter((s) => s !== 'lost').length - 1 && (
                        <ArrowRight className="size-3 text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Lead Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedLead.value > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-semibold text-emerald-700">{formatUSD(selectedLead.value)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p>{SOURCE_CONFIG[selectedLead.source]?.label || selectedLead.source}</p>
                </div>
              </div>
              {selectedLead.serviceType && (
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p>{getServiceTypeLabel(selectedLead.serviceType)}</p>
                  </div>
                </div>
              )}
              {selectedLead.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="truncate">{selectedLead.address}</p>
                  </div>
                </div>
              )}
              {selectedLead.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p>{selectedLead.assignedTo.name}</p>
                  </div>
                </div>
              )}
              {selectedLead.job && (
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linked Job</p>
                    <p className="text-emerald-700 font-medium">{selectedLead.job.title}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDateMedium(selectedLead.createdAt)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Actions */}
            {!['won', 'lost'].includes(selectedLead.status) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {KANBAN_STATUSES.filter((s) => s !== selectedLead.status).map((status) => {
                    const config = STATUS_CONFIG[status];
                    return (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        className={cn('text-xs', config.color, config.borderColor)}
                        onClick={() => handleStatusChange(selectedLead.id, status)}
                      >
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Activity Timeline / Notes */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <StickyNote className="size-4 text-muted-foreground" /> Notes &amp; Activity
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {leadNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No notes yet</p>
                ) : (
                  leadNotes.map((note: { text: string; createdAt: string }, idx: number) => (
                    <div key={idx} className="flex gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">{note.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateMedium(note.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note */}
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) handleAddNote();
                  }}
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {!['won', 'lost'].includes(selectedLead.status) && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setShowDetailDialog(false);
                    openConvertDialog(selectedLead);
                  }}
                >
                  <ArrowRight className="size-4 mr-1.5" /> Convert to Job
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDetailDialog(false);
                  openEditLead(selectedLead);
                }}
              >
                <Pencil className="size-4 mr-1.5" /> Edit
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                  setShowDetailDialog(false);
                  openDeleteDialog(selectedLead);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ============================================================
  // Render: Convert to Job Dialog
  // ============================================================

  const renderConvertDialog = () => (
    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-emerald-600" />
            Convert to Job
          </DialogTitle>
          <DialogDescription>
            Convert &quot;{convertingLead?.name}&quot; into an active job assignment?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {convertingLead && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <p className="font-medium text-sm">{convertingLead.name}</p>
                <p className="text-xs text-muted-foreground">{convertingLead.phone}</p>
                {convertingLead.value > 0 && (
                  <p className="text-sm font-semibold text-emerald-700">{formatUSD(convertingLead.value)}</p>
                )}
                {convertingLead.serviceType && (
                  <p className="text-xs text-muted-foreground">{getServiceTypeLabel(convertingLead.serviceType)}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowConvertDialog(false); setConvertingLead(null); }}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConvertToJob} disabled={converting}>
            {converting && <RefreshCw className="size-4 mr-1 animate-spin" />}
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Render: Delete Confirmation Dialog
  // ============================================================

  const renderDeleteDialog = () => (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            Delete Lead
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{deletingLead?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletingLead(null); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteLead}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Target className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Leads</h2>
            <p className="text-sm text-muted-foreground">Manage leads and track pipeline progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg p-0.5">
            <Button
              variant={activeView === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 px-3 text-xs',
                activeView === 'kanban' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
              onClick={() => setActiveView('kanban')}
            >
              <LayoutGrid className="size-3.5 mr-1" /> Kanban
            </Button>
            <Button
              variant={activeView === 'table' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 px-3 text-xs',
                activeView === 'table' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
              onClick={() => setActiveView('table')}
            >
              <List className="size-3.5 mr-1" /> Table
            </Button>
          </div>

          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAddLead}>
            <Plus className="size-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* ─── Stats ─────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Leads', value: totalLeads, icon: Target, color: 'text-foreground' },
          { label: 'Pipeline Value', value: formatUSD(leads.reduce((s, l) => s + (l.value || 0), 0)), icon: DollarSign, color: 'text-emerald-600' },
          { label: 'Won', value: leads.filter(l => l.status === 'won').length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Conversion Rate', value: leads.length > 0 ? `${Math.round(leads.filter(l => l.status === 'won').length / leads.length * 100)}%` : '0%', icon: TrendingUp, color: 'text-purple-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchLeads()}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* ─── View Content ───────────────────────────────────────── */}
      {activeView === 'kanban' ? renderKanbanBoard() : renderTableView()}

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      {renderAddDialog()}
      {renderDetailDialog()}
      {renderConvertDialog()}
      {renderDeleteDialog()}
    </div>
  );
}
