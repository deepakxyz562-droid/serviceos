'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Trash2,
  Loader2,
  ArrowRight,
  Filter,
  Download,
  Building2,
  Calendar,
  X,
  Send,
  MoreVertical,
  Check,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  serviceType?: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'quote_sent' | 'won' | 'lost';
  priority?: 'low' | 'medium' | 'high' | null;
  value?: number | null;
  source?: string | null;
  address?: string | null;
  description?: string | null;
  notesJson?: string | null;
  createdAt: string;
}

const STAGE_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    dot: string;
  }
> = {
  new: {
    label: 'New Inquiry',
    bg: 'bg-blue-50/70 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/80 dark:border-blue-800/40',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    bg: 'bg-purple-50/70 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/80 dark:border-purple-800/40',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    dot: 'bg-purple-500',
  },
  qualified: {
    label: 'Qualified',
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/40',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  quote_sent: {
    label: 'Proposal Sent',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/80 dark:border-indigo-800/40',
    badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    dot: 'bg-indigo-500',
  },
  won: {
    label: 'Won / Converted',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/40',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost / Dropped',
    bg: 'bg-slate-50/70 dark:bg-slate-900/40',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

const KANBAN_STAGES: Array<'new' | 'contacted' | 'qualified' | 'quote_sent' | 'won' | 'lost'> = [
  'new',
  'contacted',
  'qualified',
  'quote_sent',
  'won',
  'lost',
];

const DEMO_LEADS: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Sarah Jenkins',
    phone: '+61 412 345 678',
    email: 'sarah.j@residential.com.au',
    serviceType: 'End of Lease Deep Cleaning',
    status: 'new',
    priority: 'high',
    value: 480,
    source: 'Google Business Profile',
    address: '14 Riverview Terrace, Hamilton QLD 4007',
    description: 'Full 3-bedroom bond exit clean required before handover next Monday.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'lead-2',
    name: 'Marcus Vance',
    phone: '+61 488 921 443',
    email: 'marcus@vancecommercial.com',
    serviceType: 'Commercial Office Sanitization',
    status: 'contacted',
    priority: 'high',
    value: 1650,
    source: 'WhatsApp Inbound',
    address: 'Level 4, 120 Edward St, Brisbane City QLD 4000',
    description: 'Weekly recurring cleaning contract for 45-desk law office.',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'lead-3',
    name: 'Elena Rostova',
    phone: '+61 403 772 190',
    email: 'elena.rostova@gmail.com',
    serviceType: 'Window & Solar Panel Wash',
    status: 'qualified',
    priority: 'medium',
    value: 320,
    source: 'Website Quote Form',
    address: '88 Sherwood Rd, Toowong QLD 4066',
    description: '2-storey home exterior windows and 24 rooftop solar panels.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'lead-4',
    name: 'David O’Connor',
    phone: '+61 431 809 231',
    email: 'david.oc@connorbuilds.com.au',
    serviceType: 'Post-Construction Site Clean',
    status: 'quote_sent',
    priority: 'high',
    value: 2900,
    source: 'Referral Partner',
    address: 'Site 3B, MacArthur Ave, Hamilton QLD 4007',
    description: 'Builder handover clean for 4 newly completed townhouses.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: 'lead-5',
    name: 'Chloe Tremblay',
    phone: '+61 422 109 883',
    email: 'chloe.tremblay@outlook.com',
    serviceType: 'Carpet Steam & Upholstery Care',
    status: 'won',
    priority: 'medium',
    value: 390,
    source: 'Google Business Profile',
    address: '22 Oxford St, Bulimba QLD 4171',
    description: 'Customer approved quote. Scheduled for tomorrow morning 9:00 AM.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'lead-6',
    name: 'Brian Thorne',
    phone: '+61 401 554 902',
    email: 'bthorne@thornelegal.com.au',
    serviceType: 'High-Pressure Driveway Wash',
    status: 'lost',
    priority: 'low',
    value: 250,
    source: 'Cold Inquiry',
    address: '7 Hillside Cres, Ascot QLD 4007',
    description: 'Client postponed landscaping renovations to next financial year.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name?: string | null): string {
  if (!name) return 'LD';
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function cleanPhoneForWhatsApp(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
}

export function BgosLeadsWorkstation({ isDemo = false }: { isDemo?: boolean }) {
  const navigate = useAppStore((s) => s.setCurrentView);
  const [leads, setLeads] = useState<LeadItem[]>(isDemo ? DEMO_LEADS : []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Lead Detail Dialog state
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // New Lead Dialog state
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: 'Home Cleaning Service',
    value: '',
    source: 'Website Quote Form',
    address: '',
    description: '',
  });

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leads?limit=100');
      if (res.ok) {
        const data = await res.json();
        const serverLeads = Array.isArray(data?.leads) ? data.leads : [];
        if (serverLeads.length === 0 && isDemo) {
          setLeads(DEMO_LEADS);
        } else {
          setLeads(serverLeads);
        }
      } else if (isDemo) {
        setLeads(DEMO_LEADS);
      }
    } catch {
      if (isDemo) setLeads(DEMO_LEADS);
    } finally {
      setIsLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Executive Computed KPI Metrics
  const metrics = useMemo(() => {
    const totalCount = leads.length;
    const activeCount = leads.filter(
      (l) => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified' || l.status === 'quote_sent'
    ).length;
    const wonCount = leads.filter((l) => l.status === 'won').length;
    const pipelineValue = leads
      .filter((l) => l.status !== 'lost')
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

    return {
      totalCount,
      activeCount,
      wonCount,
      pipelineValue,
      conversionRate,
    };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== 'all' && lead.status !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(query);
        const matchPhone = lead.phone?.toLowerCase().includes(query);
        const matchEmail = lead.email?.toLowerCase().includes(query);
        const matchService = lead.serviceType?.toLowerCase().includes(query);
        const matchAddress = lead.address?.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchEmail && !matchService && !matchAddress) {
          return false;
        }
      }
      return true;
    });
  }, [leads, stageFilter, searchQuery]);

  // Status Change Handler
  const handleStatusChange = async (leadId: string, newStatus: LeadItem['status']) => {
    setIsUpdatingStatus(true);
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Lead moved to ${STAGE_CONFIG[newStatus]?.label || newStatus}`);
      } else {
        toast.error('Failed to sync status change to server');
        fetchLeads();
      }
    } catch {
      toast.error('Connection error updating lead status');
      fetchLeads();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Create Lead Handler
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast.error('Please enter customer name and phone number');
      return;
    }

    setIsCreatingLead(true);
    const parsedValue = parseFloat(newLeadForm.value) || 0;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeadForm.name.trim(),
          phone: newLeadForm.phone.trim(),
          email: newLeadForm.email.trim() || null,
          serviceType: newLeadForm.serviceType,
          value: parsedValue,
          source: newLeadForm.source,
          address: newLeadForm.address.trim() || null,
          description: newLeadForm.description.trim() || null,
          status: 'new',
        }),
      });

      if (res.ok) {
        toast.success('New lead created successfully!');
        setIsNewLeadOpen(false);
        setNewLeadForm({
          name: '',
          phone: '',
          email: '',
          serviceType: 'Home Cleaning Service',
          value: '',
          source: 'Website Quote Form',
          address: '',
          description: '',
        });
        fetchLeads();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create lead');
      }
    } catch {
      toast.error('Network error creating lead. Please try again.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  // Convert to Customer & Job Handler
  const handleConvertLead = async (lead: LeadItem) => {
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          createJob: true,
        }),
      });
      if (res.ok) {
        toast.success(`${lead.name} converted to active Customer & Job!`);
        setIsDetailOpen(false);
        fetchLeads();
      } else {
        handleStatusChange(lead.id, 'won');
      }
    } catch {
      handleStatusChange(lead.id, 'won');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.info('No leads available to export');
      return;
    }
    const headers = ['Name', 'Phone', 'Email', 'Service', 'Status', 'Value', 'Source', 'Address', 'Created'];
    const rows = leads.map((l) => [
      `"${l.name || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.serviceType || ''}"`,
      `"${l.status}"`,
      l.value || 0,
      `"${l.source || ''}"`,
      `"${l.address || ''}"`,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads spreadsheet downloaded!');
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 text-[#009F50] shadow-2xs">
            <Target className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                Leads &amp; CRM Pipeline
              </h1>
              <span className="rounded-full bg-[#E8F8EF] dark:bg-emerald-950/70 text-[#009F50] px-2.5 py-0.5 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                {metrics.totalCount} Leads
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Manage incoming customer inquiries, pipeline stages, and conversion across all channels.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-view navigation pills */}
          <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs text-xs font-semibold">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#E8F8EF] dark:bg-emerald-950/70 text-[#009F50] font-bold"
            >
              Pipeline Board
            </button>
            <button
              type="button"
              onClick={() => navigate('contacts')}
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Contacts &amp; Segments →
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLeads}
            disabled={isLoading}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-2xs transition"
            title="Refresh Leads"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin text-[#009F50]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-2xs transition"
          >
            <Download className="size-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewLeadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#009F50] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#008A45] transition"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* ─── Executive KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Leads */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leads</span>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 p-1.5 text-blue-600">
              <Target className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalCount}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ↑ Active
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Captured in qualification pipeline</p>
        </div>

        {/* Card 2: Active In Pipeline */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Pipeline</span>
            <span className="rounded-full bg-purple-50 dark:bg-purple-950/40 p-1.5 text-purple-600">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.activeCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">in negotiation</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">New, Contacted, &amp; Proposal Sent</p>
        </div>

        {/* Card 3: Estimated Pipeline Value */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pipeline Value</span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 p-1.5 text-[#009F50]">
              <DollarSign className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.pipelineValue)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Estimated value across active inquiries</p>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Win Rate</span>
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 p-1.5 text-amber-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.conversionRate}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.wonCount} Converted
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Won leads converted to paying clients</p>
        </div>
      </div>

      {/* ─── Filter Bar & Layout Switcher ────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by customer name, phone, email, suburb or service..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#009F50] focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
              stageFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({leads.length})
          </button>
          {KANBAN_STAGES.map((stg) => {
            const count = leads.filter((l) => l.status === stg).length;
            const active = stageFilter === stg;
            const conf = STAGE_CONFIG[stg];
            return (
              <button
                key={stg}
                type="button"
                onClick={() => setStageFilter(active ? 'all' : stg)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition shrink-0 border ${
                  active
                    ? `${conf.badgeBg} ${conf.border} shadow-2xs`
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`size-1.5 rounded-full ${conf.dot}`} />
                <span>{conf.label}</span>
                <span className="text-[10px] font-bold opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* View Layout Toggle */}
        <div className="flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-2 lg:border-t-0 lg:pt-0">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'kanban'
                ? 'bg-[#E8F8EF] dark:bg-emerald-950/70 text-[#009F50] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'table'
                ? 'bg-[#E8F8EF] dark:bg-emerald-950/70 text-[#009F50] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <List className="size-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content: Board View or Table View ──────────────── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-start">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage);
            const conf = STAGE_CONFIG[stage];
            const laneTotalValue = stageLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

            return (
              <div
                key={stage}
                className="flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 shadow-2xs min-h-[480px]"
              >
                {/* Lane Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${conf.dot}`} />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {conf.label}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${conf.badgeBg}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lane Value Bar */}
                {laneTotalValue > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1">
                    <span>Lane Value</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(laneTotalValue)}
                    </span>
                  </div>
                )}

                {/* Cards List */}
                <div className="mt-3 space-y-3 flex-1 overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-3 text-slate-400">
                      <Target className="size-5 opacity-40 mb-1" />
                      <p className="text-[11px]">No leads in this stage</p>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const cleanPhone = cleanPhoneForWhatsApp(lead.phone);
                      return (
                        <div
                          key={lead.id}
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailOpen(true);
                          }}
                          className="group relative cursor-pointer rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3.5 shadow-2xs transition-all hover:border-[#009F50] hover:shadow-sm"
                        >
                          {/* Card Header: Initials + Name + Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E8F8EF] dark:bg-emerald-950 text-xs font-bold text-[#009F50]">
                                {getInitials(lead.name)}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#009F50] transition truncate max-w-[120px]">
                                {lead.name}
                              </span>
                            </div>
                            {lead.priority === 'high' && (
                              <span className="rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 text-[9px] font-bold">
                                High
                              </span>
                            )}
                          </div>

                          {/* Service Type */}
                          <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                            {lead.serviceType || 'General Inbound Service'}
                          </p>

                          {/* Value & Source */}
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#009F50]">
                              {lead.value ? formatCurrency(lead.value) : 'Quote Pending'}
                            </span>
                            <span className="text-slate-400 truncate max-w-[85px]">
                              {lead.source || 'Direct'}
                            </span>
                          </div>

                          {/* Contact Shortcuts */}
                          <div
                            className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-700/60 pt-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex size-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[#E8F8EF] hover:text-[#009F50] hover:border-[#009F50] transition"
                              title="Call customer"
                            >
                              <Phone className="size-3" />
                            </a>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex size-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="size-3" />
                              </a>
                            )}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex size-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition"
                                title="Send email"
                              >
                                <Mail className="size-3" />
                              </a>
                            )}

                            {/* Quick Next Stage Dropdown */}
                            <div className="ml-auto">
                              <select
                                aria-label="Change stage"
                                value={lead.status}
                                onChange={(e) =>
                                  handleStatusChange(lead.id, e.target.value as LeadItem['status'])
                                }
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="quote_sent">Proposal</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ─────────────────────────────────────────── */
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Customer / Lead</th>
                  <th className="py-3 px-4">Service Needed</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No leads match your active filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const conf = STAGE_CONFIG[lead.status] || STAGE_CONFIG.new;
                    const cleanPhone = cleanPhoneForWhatsApp(lead.phone);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDetailOpen(true);
                        }}
                        className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F8EF] dark:bg-emerald-950 text-xs font-bold text-[#009F50]">
                              {getInitials(lead.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">
                                {lead.name}
                              </p>
                              {lead.address && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                  {lead.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                          {lead.serviceType || 'General Inbound'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${conf.badgeBg}`}
                          >
                            <span className={`size-1.5 rounded-full ${conf.dot}`} />
                            {conf.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#009F50]">
                          {lead.value ? formatCurrency(lead.value) : '—'}
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${lead.phone}`}
                              className="size-7 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                              title={lead.phone}
                            >
                              <Phone className="size-3.5" />
                            </a>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="size-7 inline-flex items-center justify-center rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition"
                                title="WhatsApp"
                              >
                                <MessageSquare className="size-3.5" />
                              </a>
                            )}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="size-7 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                title={lead.email}
                              >
                                <Mail className="size-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {lead.source || 'Direct'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label="Change status"
                            value={lead.status}
                            onChange={(e) =>
                              handleStatusChange(lead.id, e.target.value as LeadItem['status'])
                            }
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="quote_sent">Proposal</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── New Lead Modal ──────────────────────────────────────── */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#E8F8EF] text-[#009F50]">
                <Plus className="size-4" />
              </div>
              <span>Add New Lead &amp; Opportunity</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record a new customer inquiry and immediately initiate pipeline follow-up.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="e.g. John Miller"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  placeholder="e.g. +61 400 000 000"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Estimated Value ($ AUD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newLeadForm.value}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                  placeholder="e.g. 450"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Requested
                </label>
                <select
                  value={newLeadForm.serviceType}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, serviceType: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                >
                  <option value="Home Cleaning Service">Home Cleaning Service</option>
                  <option value="End of Lease Deep Clean">End of Lease Deep Clean</option>
                  <option value="Commercial Office Sanitization">Commercial Office Sanitization</option>
                  <option value="Carpet Steam & Upholstery">Carpet Steam &amp; Upholstery</option>
                  <option value="Window & Solar Cleaning">Window &amp; Solar Cleaning</option>
                  <option value="High-Pressure Washing">High-Pressure Washing</option>
                  <option value="Custom Project / Quote">Custom Project / Quote</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lead Acquisition Source
                </label>
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
                >
                  <option value="Google Business Profile">Google Business Profile</option>
                  <option value="WhatsApp Inbound">WhatsApp Inbound</option>
                  <option value="Website Quote Form">Website Quote Form</option>
                  <option value="Referral Partner">Referral Partner</option>
                  <option value="Phone Call / Direct">Phone Call / Direct</option>
                  <option value="Facebook / Instagram Ad">Facebook / Instagram Ad</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Service Address / Suburb
              </label>
              <input
                type="text"
                value={newLeadForm.address}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, address: e.target.value })}
                placeholder="e.g. 14 Riverview Terrace, Hamilton QLD 4007"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inquiry Details &amp; Notes
              </label>
              <textarea
                rows={3}
                value={newLeadForm.description}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, description: e.target.value })}
                placeholder="Key scope, customer timing preferences, access instructions..."
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-[#009F50] focus:outline-hidden"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setIsNewLeadOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingLead}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#009F50] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#008A45] transition disabled:opacity-50"
              >
                {isCreatingLead ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Create Lead</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Lead Detail Modal ─────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          {selectedLead && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950 text-base font-black text-[#009F50]">
                      {getInitials(selectedLead.name)}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedLead.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Acquired via {selectedLead.source || 'Direct Channel'} • Added{' '}
                        {new Date(selectedLead.createdAt).toLocaleDateString()}
                      </DialogDescription>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      STAGE_CONFIG[selectedLead.status]?.badgeBg || 'bg-slate-100'
                    }`}
                  >
                    {STAGE_CONFIG[selectedLead.status]?.label || selectedLead.status}
                  </span>
                </div>
              </DialogHeader>

              {/* Status Selector Bar */}
              <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pipeline Stage
                </span>
                <select
                  aria-label="Change status"
                  value={selectedLead.status}
                  disabled={isUpdatingStatus}
                  onChange={(e) =>
                    handleStatusChange(selectedLead.id, e.target.value as LeadItem['status'])
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-2xs focus:outline-hidden"
                >
                  <option value="new">New Inquiry</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="quote_sent">Proposal Sent</option>
                  <option value="won">Won / Converted</option>
                  <option value="lost">Lost / Dropped</option>
                </select>
              </div>

              {/* Details Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 block">Phone</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedLead.phone}
                    </span>
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="size-6 inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-[#E8F8EF] hover:text-[#009F50] transition"
                    >
                      <Phone className="size-3" />
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 block">WhatsApp</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedLead.phone}
                    </span>
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp(selectedLead.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="size-6 inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                    >
                      <MessageSquare className="size-3" />
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 block">Service Needed</span>
                  <span className="mt-1 font-bold text-slate-800 dark:text-slate-200 block">
                    {selectedLead.serviceType || 'Standard Service'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 block">Estimated Value</span>
                  <span className="mt-1 font-bold text-[#009F50] text-sm block">
                    {selectedLead.value ? formatCurrency(selectedLead.value) : 'Not Estimated'}
                  </span>
                </div>
              </div>

              {/* Address */}
              {selectedLead.address && (
                <div className="mt-3 rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">Service Address</span>
                  <span className="mt-1 font-medium text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-[#009F50] shrink-0" />
                    {selectedLead.address}
                  </span>
                </div>
              )}

              {/* Description */}
              {selectedLead.description && (
                <div className="mt-3 rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">Customer Scope / Inquiry</span>
                  <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedLead.description}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(selectedLead.id, 'lost');
                    setIsDetailOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <XCircle className="size-3.5" />
                  <span>Mark as Lost</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertLead(selectedLead)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#009F50] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#008A45] transition"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Convert to Active Customer &amp; Job</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
