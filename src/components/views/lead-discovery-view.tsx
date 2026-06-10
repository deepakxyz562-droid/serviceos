'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, MapPin, Building2, Star, Phone, Globe, Mail,
  Plus, Trash2, Download, Upload, Filter, RefreshCw,
  ExternalLink, X, CheckCircle2, Clock,
  TrendingUp, Users, BarChart3, Target, ArrowRight,
  MoreHorizontal, Pencil, Eye, Layers,
  FileSpreadsheet, Database, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ViewHeader } from '@/components/shared/view-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface LeadDiscovery {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  externalId?: string | null;
  sourceUrl?: string | null;
  sourceDataJson: string;
  businessType?: string | null;
  category?: string | null;
  rating: number;
  reviewCount: number;
  description?: string | null;
  status: string;
  priority: string;
  leadId?: string | null;
  campaignId?: string | null;
  importedAt?: string | null;
  contactedAt?: string | null;
  convertedAt?: string | null;
  tagsJson: string;
  notesJson: string;
  searchQueryId?: string | null;
  tenantId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DiscoveryStats {
  totalDiscovered: number;
  importedToCrm: number;
  conversionRate: number;
  activeCampaigns: number;
  sourceBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    discoveryName: string;
    timestamp: string;
  }>;
}

// ============================================================
// Constants
// ============================================================

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym' },
  { value: 'spa', label: 'Spa' },
  { value: 'auto_repair', label: 'Auto Repair' },
  { value: 'other', label: 'Other' },
];

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  google_places: { label: 'Google Places', icon: <Globe className="size-3" />, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  facebook: { label: 'Facebook', icon: <Users className="size-3" />, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  website: { label: 'Website', icon: <ExternalLink className="size-3" />, bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  csv: { label: 'CSV Import', icon: <FileSpreadsheet className="size-3" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  manual: { label: 'Manual', icon: <Pencil className="size-3" />, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dotColor: string; headerBg: string; headerText: string }> = {
  discovered: { label: 'Discovered', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dotColor: 'bg-sky-500', headerBg: 'bg-sky-600', headerText: 'text-white' },
  contacted: { label: 'Contacted', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500', headerBg: 'bg-amber-500', headerText: 'text-white' },
  imported: { label: 'Imported', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-600', headerText: 'text-white' },
  qualified: { label: 'Qualified', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dotColor: 'bg-violet-500', headerBg: 'bg-violet-600', headerText: 'text-white' },
  converted: { label: 'Converted', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dotColor: 'bg-teal-500', headerBg: 'bg-teal-600', headerText: 'text-white' },
  dismissed: { label: 'Dismissed', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dotColor: 'bg-gray-400', headerBg: 'bg-gray-500', headerText: 'text-white' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  low: { label: 'Low', dotColor: 'bg-slate-400', bgColor: 'bg-slate-50', textColor: 'text-slate-600' },
  medium: { label: 'Medium', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'High', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  hot: { label: 'Hot', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

const KANBAN_STATUSES = ['discovered', 'contacted', 'imported', 'qualified', 'converted', 'dismissed'] as const;

const SEARCH_SOURCES = [
  { value: 'google_places', label: 'Google Places' },
  { value: 'facebook', label: 'Facebook Pages' },
  { value: 'website', label: 'Website Import' },
  { value: 'csv', label: 'CSV Import' },
  { value: 'manual', label: 'Manual Entry' },
];

interface ManualEntryForm {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  businessType: string;
  description: string;
}

const EMPTY_MANUAL_FORM: ManualEntryForm = {
  name: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  state: '',
  businessType: '',
  description: '',
};

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function getBusinessTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const found = BUSINESS_TYPES.find((b) => b.value === value);
  return found ? found.label : value;
}

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG.manual;
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.discovered;
}

function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
}

// ============================================================
// Component
// ============================================================

export function LeadDiscoveryView() {
  // Data state
  const [discoveries, setDiscoveries] = useState<LeadDiscovery[]>([]);
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');

  // Discover tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchBusinessType, setSearchBusinessType] = useState('');
  const [searchSource, setSearchSource] = useState('google_places');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LeadDiscovery[]>([]);

  // Manual entry dialog
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState<ManualEntryForm>({ ...EMPTY_MANUAL_FORM });
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDiscovery, setSelectedDiscovery] = useState<LeadDiscovery | null>(null);

  // Pipeline tab state
  const [pipelineFilter, setPipelineFilter] = useState('all');

  // Import tab state
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<Array<{ date: string; count: number; source: string }>>([]);

  // ============================================================
  // Fetch data
  // ============================================================

  const fetchDiscoveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/lead-discovery?limit=200');
      if (res.ok) {
        const data = await res.json();
        setDiscoveries(data.discoveries || data || []);
      } else {
        setDiscoveries([]);
      }
    } catch {
      setDiscoveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/lead-discovery/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats are optional, don't block
    }
  }, []);

  useEffect(() => {
    fetchDiscoveries();
    fetchStats();
  }, [fetchDiscoveries, fetchStats]);

  // ============================================================
  // Computed values
  // ============================================================

  const computedStats = useMemo(() => {
    const total = discoveries.length;
    const imported = discoveries.filter((d) => d.status === 'imported' || d.status === 'converted').length;
    const converted = discoveries.filter((d) => d.status === 'converted').length;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, imported, converted, rate };
  }, [discoveries]);

  const sourceBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    discoveries.forEach((d) => {
      breakdown[d.source] = (breakdown[d.source] || 0) + 1;
    });
    return breakdown;
  }, [discoveries]);

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    discoveries.forEach((d) => {
      breakdown[d.status] = (breakdown[d.status] || 0) + 1;
    });
    return breakdown;
  }, [discoveries]);

  const kanbanGroups = useMemo(() => {
    const groups: Record<string, LeadDiscovery[]> = {};
    for (const status of KANBAN_STATUSES) {
      groups[status] = discoveries.filter((d) => d.status === status);
    }
    return groups;
  }, [discoveries]);

  const filteredDiscoveries = useMemo(() => {
    let list = searchResults.length > 0 ? searchResults : discoveries;
    return list;
  }, [searchResults, discoveries]);

  // ============================================================
  // Search handler
  // ============================================================

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchLocation.trim()) {
      toast.error('Please enter a search query or location');
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await authFetch('/api/lead-discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          location: searchLocation.trim(),
          businessType: searchBusinessType || undefined,
          source: searchSource,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.discoveries || data.results || []);
        const count = (data.discoveries || data.results || []).length;
        toast.success(`Found ${count} result${count !== 1 ? 's' : ''}`);
        fetchDiscoveries();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Search failed');
      }
    } catch {
      toast.error('Network error during search');
    } finally {
      setSearching(false);
    }
  };

  // ============================================================
  // CRUD handlers
  // ============================================================

  const handleCreateManual = async () => {
    if (!manualForm.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/lead-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualForm.name.trim(),
          phone: manualForm.phone.trim() || null,
          email: manualForm.email.trim() || null,
          website: manualForm.website.trim() || null,
          address: manualForm.address.trim() || null,
          city: manualForm.city.trim() || null,
          state: manualForm.state.trim() || null,
          businessType: manualForm.businessType || null,
          description: manualForm.description.trim() || null,
          source: 'manual',
        }),
      });
      if (res.ok) {
        toast.success('Business added successfully');
        setShowManualDialog(false);
        setManualForm({ ...EMPTY_MANUAL_FORM });
        fetchDiscoveries();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to add business');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (discoveryId: string, newStatus: string) => {
    try {
      const res = await authFetch(`/api/lead-discovery/${discoveryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        fetchDiscoveries();
        fetchStats();
        if (selectedDiscovery?.id === discoveryId) {
          setSelectedDiscovery({ ...selectedDiscovery, status: newStatus });
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handlePriorityChange = async (discoveryId: string, newPriority: string) => {
    try {
      const res = await authFetch(`/api/lead-discovery/${discoveryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        toast.success(`Priority updated to ${PRIORITY_CONFIG[newPriority]?.label || newPriority}`);
        fetchDiscoveries();
        if (selectedDiscovery?.id === discoveryId) {
          setSelectedDiscovery({ ...selectedDiscovery, priority: newPriority });
        }
      } else {
        toast.error('Failed to update priority');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleImportToCrm = async (discoveryId: string) => {
    try {
      const res = await authFetch('/api/lead-discovery/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoveryIds: [discoveryId] }),
      });
      if (res.ok) {
        toast.success('Imported to CRM successfully');
        fetchDiscoveries();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to import to CRM');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDismiss = async (discoveryId: string) => {
    await handleStatusChange(discoveryId, 'dismissed');
  };

  const handleDelete = async (discoveryId: string) => {
    try {
      const res = await authFetch(`/api/lead-discovery/${discoveryId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Discovery deleted');
        if (selectedDiscovery?.id === discoveryId) {
          setShowDetailDialog(false);
          setSelectedDiscovery(null);
        }
        fetchDiscoveries();
        fetchStats();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleBulkImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('No discoveries selected');
      return;
    }
    setBulkImporting(true);
    try {
      const res = await authFetch('/api/lead-discovery/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoveryIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        toast.success(`${selectedIds.size} discover${selectedIds.size > 1 ? 'ies' : 'y'} imported to CRM`);
        setSelectedIds(new Set());
        fetchDiscoveries();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to import');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste CSV data');
      return;
    }
    setCsvImporting(true);
    try {
      const res = await authFetch('/api/lead-discovery/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.imported || data.count || 0;
        toast.success(`Imported ${count} entr${count !== 1 ? 'ies' : 'y'} from CSV`);
        setCsvText('');
        setImportHistory((prev) => [
          { date: new Date().toISOString(), count, source: 'csv' },
          ...prev.slice(0, 9),
        ]);
        fetchDiscoveries();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'CSV import failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCsvImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openDetail = (discovery: LeadDiscovery) => {
    setSelectedDiscovery(discovery);
    setShowDetailDialog(true);
  };

  // ============================================================
  // CSV Preview
  // ============================================================

  const csvPreview = useMemo(() => {
    if (!csvText.trim()) return [];
    const lines = csvText.trim().split('\n').slice(0, 4);
    return lines.map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
  }, [csvText]);

  // ============================================================
  // Render: Loading skeleton
  // ============================================================

  if (loading && discoveries.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <ViewHeader icon={Search} iconBg="bg-orange-600" title="Lead Discovery" description="Find and import local businesses" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ============================================================
  // Render: Source badge
  // ============================================================

  const renderSourceBadge = (source: string) => {
    const config = getSourceConfig(source);
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bg} ${config.text} ${config.border}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // ============================================================
  // Render: Status badge
  // ============================================================

  const renderStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bg} ${config.text} ${config.border}`}>
        <span className={`size-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
      </Badge>
    );
  };

  // ============================================================
  // Render: Star rating
  // ============================================================

  const renderStarRating = (rating: number) => {
    if (rating <= 0) return <span className="text-xs text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`size-3 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // ============================================================
  // Render: Discovery Card (Discover tab)
  // ============================================================

  const renderDiscoveryCard = (discovery: LeadDiscovery) => (
    <Card key={discovery.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center size-9 rounded-lg bg-orange-100 text-orange-700 shrink-0">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">{discovery.name}</h4>
              {discovery.businessType && (
                <p className="text-xs text-muted-foreground">{getBusinessTypeLabel(discovery.businessType)}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetail(discovery)}>
                <Eye className="size-3.5 mr-2" /> View Details
              </DropdownMenuItem>
              {discovery.status !== 'imported' && discovery.status !== 'converted' && (
                <DropdownMenuItem onClick={() => handleImportToCrm(discovery.id)}>
                  <Download className="size-3.5 mr-2" /> Import to CRM
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handlePriorityChange(discovery.id, 'hot')}>
                <Sparkles className="size-3.5 mr-2" /> Mark Hot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(discovery.id)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Source + Rating */}
        <div className="flex items-center justify-between gap-2">
          {renderSourceBadge(discovery.source)}
          {renderStarRating(discovery.rating)}
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          {discovery.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <MapPin className="size-3 shrink-0" /> {discovery.address}
            </p>
          )}
          {discovery.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3 shrink-0" /> {discovery.phone}
            </p>
          )}
          {discovery.website && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Globe className="size-3 shrink-0" /> {discovery.website}
            </p>
          )}
        </div>

        {/* Priority selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Select value={discovery.priority} onValueChange={(v) => handlePriorityChange(discovery.id, v)}>
            <SelectTrigger className="h-6 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${val.dotColor}`} />
                    {val.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {discovery.status !== 'imported' && discovery.status !== 'converted' ? (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleImportToCrm(discovery.id)}
            >
              <Download className="size-3 mr-1" /> Import to CRM
            </Button>
          ) : (
            <Badge className="flex-1 justify-center h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">
              <CheckCircle2 className="size-3 mr-1" /> Imported
            </Badge>
          )}
          {discovery.status !== 'dismissed' && discovery.status !== 'imported' && discovery.status !== 'converted' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleDismiss(discovery.id)}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================
  // Render: Kanban Card (Pipeline tab)
  // ============================================================

  const renderKanbanCard = (discovery: LeadDiscovery) => (
    <Card
      key={discovery.id}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative",
      )}
      style={{
        borderLeftColor:
          discovery.priority === 'hot' ? '#ef4444' :
          discovery.priority === 'high' ? '#f97316' :
          discovery.priority === 'medium' ? '#f59e0b' :
          '#94a3b8',
        borderLeftWidth: '3px',
      }}
      onClick={() => openDetail(discovery)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate">{discovery.name}</h4>
            {discovery.businessType && (
              <p className="text-xs text-muted-foreground">{getBusinessTypeLabel(discovery.businessType)}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {KANBAN_STATUSES.filter((s) => s !== discovery.status).map((status) => (
                <DropdownMenuItem key={status} onClick={() => handleStatusChange(discovery.id, status)}>
                  <ArrowRight className="size-3.5 mr-2" /> Move to {STATUS_CONFIG[status].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(discovery.id)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5">
          {renderSourceBadge(discovery.source)}
        </div>

        {discovery.rating > 0 && (
          <div className="flex items-center gap-1">
            {renderStarRating(discovery.rating)}
            {discovery.reviewCount > 0 && (
              <span className="text-[10px] text-muted-foreground">({discovery.reviewCount})</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateShort(discovery.createdAt)}
          </span>
          {discovery.priority && (
            <Badge variant="outline" className={`text-[10px] h-4 ${getPriorityConfig(discovery.priority).bgColor} ${getPriorityConfig(discovery.priority).textColor}`}>
              {getPriorityConfig(discovery.priority).label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================
  // Render: Kanban Board
  // ============================================================

  const renderKanbanBoard = () => (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-h-[400px]">
        {KANBAN_STATUSES.map((status) => {
          const config = STATUS_CONFIG[status];
          const columnItems = kanbanGroups[status] || [];
          return (
            <div key={status} className="min-w-[260px] w-[260px] shrink-0">
              {/* Column header */}
              <div className={`rounded-t-lg px-3 py-2.5 ${config.headerBg} ${config.headerText} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{config.label}</span>
                  <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
                    {columnItems.length}
                  </Badge>
                </div>
              </div>
              {/* Column body */}
              <div className="bg-muted/30 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-420px)] overflow-y-auto">
                {columnItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <p className="text-xs">No items</p>
                  </div>
                ) : (
                  columnItems.map((item) => renderKanbanCard(item))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  // ============================================================
  // Render: Discover Tab
  // ============================================================

  const renderDiscoverTab = () => (
    <div className="space-y-4">
      {/* Search section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="size-4 text-orange-600" />
            <span className="text-sm font-semibold">Search Businesses</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Query</Label>
              <Input
                placeholder="e.g., plumbers, dentists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input
                placeholder="e.g., New York, NY"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Type</Label>
              <Select value={searchBusinessType} onValueChange={setSearchBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={searchSource} onValueChange={setSearchSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <><RefreshCw className="size-4 mr-1.5 animate-spin" /> Searching...</>
              ) : (
                <><Search className="size-4 mr-1.5" /> Search</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowManualDialog(true)}>
              <Plus className="size-4 mr-1.5" /> Manual Entry
            </Button>
            {searchResults.length > 0 && (
              <Button variant="ghost" onClick={() => setSearchResults([])}>
                <X className="size-4 mr-1" /> Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {searchResults.length} search result{searchResults.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {filteredDiscoveries.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No discoveries yet"
          description="Search for local businesses or add them manually to start building your pipeline"
          actionLabel="Add Manually"
          onAction={() => setShowManualDialog(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDiscoveries.map((d) => renderDiscoveryCard(d))}
        </div>
      )}
    </div>
  );

  // ============================================================
  // Render: Pipeline Tab
  // ============================================================

  const renderPipelineTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Filter:</Label>
          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {KANBAN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{discoveries.length} total discoveries</p>
      </div>

      {discoveries.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No pipeline items"
          description="Discover businesses to populate your pipeline"
          actionLabel="Start Discovery"
          onAction={() => setActiveTab('discover')}
        />
      ) : (
        renderKanbanBoard()
      )}
    </div>
  );

  // ============================================================
  // Render: Import Tab
  // ============================================================

  const renderImportTab = () => (
    <div className="space-y-6">
      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-emerald-600" />
            CSV Import
          </CardTitle>
          <CardDescription>Paste CSV data or upload a file to import businesses in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">CSV Data (paste below)</Label>
            <Textarea
              placeholder="name,phone,email,address,city,state,business_type&#10;John's Plumbing,555-1234,john@plumbing.com,123 Main St,New York,NY,plumber"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="text-xs font-mono"
            />
          </div>

          {/* CSV Preview */}
          {csvPreview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview (first 4 rows)</Label>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {csvPreview[0]?.map((cell, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {cell || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCsvImport}
              disabled={csvImporting || !csvText.trim()}
            >
              {csvImporting ? (
                <><RefreshCw className="size-4 mr-1.5 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="size-4 mr-1.5" /> Import CSV</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-4 text-violet-600" />
            Bulk Import to CRM
          </CardTitle>
          <CardDescription>Select discoveries and import them to your CRM in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {discoveries.filter((d) => d.status !== 'imported' && d.status !== 'converted' && d.status !== 'dismissed').length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No discoveries available for import</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === discoveries.filter((d) => d.status !== 'imported' && d.status !== 'converted' && d.status !== 'dismissed').length && selectedIds.size > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const ids = discoveries
                          .filter((d) => d.status !== 'imported' && d.status !== 'converted' && d.status !== 'dismissed')
                          .map((d) => d.id);
                        setSelectedIds(new Set(ids));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleBulkImport}
                  disabled={selectedIds.size === 0 || bulkImporting}
                >
                  {bulkImporting ? (
                    <><RefreshCw className="size-3 mr-1 animate-spin" /> Importing...</>
                  ) : (
                    <><Download className="size-3 mr-1" /> Import Selected to CRM</>
                  )}
                </Button>
              </div>

              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {discoveries
                    .filter((d) => d.status !== 'imported' && d.status !== 'converted' && d.status !== 'dismissed')
                    .map((d) => (
                      <div
                        key={d.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer",
                          selectedIds.has(d.id) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleSelect(d.id)}
                      >
                        <Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{d.name}</span>
                            {renderSourceBadge(d.source)}
                          </div>
                          {d.address && (
                            <p className="text-xs text-muted-foreground truncate">{d.address}</p>
                          )}
                        </div>
                        {d.rating > 0 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Star className="size-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs">{d.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-gray-600" />
            Recent Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {importHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent imports</p>
          ) : (
            <div className="space-y-2">
              {importHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {getSourceConfig(item.source).icon}
                    <div>
                      <p className="text-sm font-medium">{item.count} entries imported</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 ${getSourceConfig(item.source).bg} ${getSourceConfig(item.source).text} ${getSourceConfig(item.source).border}`}>
                    {getSourceConfig(item.source).label}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // Render: Analytics Tab
  // ============================================================

  const renderAnalyticsTab = () => {
    const total = computedStats.total;
    const imported = computedStats.imported;
    const rate = computedStats.rate;

    // Funnel stages
    const funnelStages = [
      { label: 'Discovered', count: statusBreakdown.discovered || 0, color: 'bg-sky-500' },
      { label: 'Contacted', count: statusBreakdown.contacted || 0, color: 'bg-amber-500' },
      { label: 'Imported', count: (statusBreakdown.imported || 0), color: 'bg-emerald-500' },
      { label: 'Qualified', count: statusBreakdown.qualified || 0, color: 'bg-violet-500' },
      { label: 'Converted', count: statusBreakdown.converted || 0, color: 'bg-teal-500' },
    ];

    const maxFunnelCount = Math.max(...funnelStages.map((s) => s.count), 1);

    // Recent activity from discoveries (sorted by createdAt desc)
    const recentActivity = [...discoveries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Discovered" value={total} icon={Search} color="text-sky-600" />
          <StatCard label="Imported to CRM" value={imported} icon={Download} color="text-emerald-600" />
          <StatCard label="Conversion Rate" value={`${rate}%`} icon={TrendingUp} color="text-teal-600" />
          <StatCard label="Active Campaigns" value={stats?.activeCampaigns || 0} icon={Target} color="text-violet-600" />
        </div>

        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-orange-600" />
              Source Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(sourceBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
                  const count = sourceBreakdown[key] || 0;
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key} className="text-center p-3 rounded-lg border">
                      <div className={`inline-flex items-center justify-center size-10 rounded-full ${config.bg} ${config.text} mb-2`}>
                        {config.icon}
                      </div>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                      <p className="text-xs font-medium mt-1">{percentage}%</p>
                      <Progress value={percentage} className="h-1.5 mt-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="size-4 text-violet-600" />
              Discovery Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-lg mx-auto">
              {funnelStages.map((stage, i) => {
                const widthPercent = Math.max((stage.count / maxFunnelCount) * 100, 8);
                return (
                  <div key={stage.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{stage.label}</span>
                    <div className="flex-1 relative">
                      <div
                        className={`${stage.color} rounded-lg h-9 flex items-center justify-center transition-all`}
                        style={{ width: `${widthPercent}%`, margin: '0 auto' }}
                      >
                        <span className="text-white text-sm font-semibold">{stage.count}</span>
                      </div>
                    </div>
                    {i < funnelStages.length - 1 && (
                      <span className="text-xs text-muted-foreground shrink-0 w-12">
                        {funnelStages[i].count > 0
                          ? `${Math.round((funnelStages[i + 1].count / funnelStages[i].count) * 100)}%`
                          : '0%'}
                      </span>
                    )}
                    {i === funnelStages.length - 1 && <span className="w-12" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2"
                    onClick={() => openDetail(d)}
                  >
                    <div className="flex items-center justify-center size-8 rounded-full bg-orange-100 text-orange-700 shrink-0">
                      <Building2 className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(d.status)}
                        {renderSourceBadge(d.source)}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDateShort(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={Search}
        iconBg="bg-orange-600"
        title="Lead Discovery"
        description="Find and import local businesses"
        action={
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowManualDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Add Business
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Discovered" value={computedStats.total} icon={Search} color="text-sky-600" />
        <StatCard label="Imported to CRM" value={computedStats.imported} icon={Download} color="text-emerald-600" />
        <StatCard label="Conversion Rate" value={`${computedStats.rate}%`} icon={TrendingUp} color="text-teal-600" />
        <StatCard label="Active Campaigns" value={stats?.activeCampaigns || 0} icon={Target} color="text-violet-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discover" className="text-xs">Discover</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="import" className="text-xs">Import</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4">
          {renderDiscoverTab()}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          {renderPipelineTab()}
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          {renderImportTab()}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {renderAnalyticsTab()}
        </TabsContent>
      </Tabs>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-orange-600" />
              Add Business Manually
            </DialogTitle>
            <DialogDescription>Enter business details to add to your discovery pipeline</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ld-name">Business Name *</Label>
              <Input
                id="ld-name"
                placeholder="e.g., Joe's Plumbing"
                value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ld-phone">Phone</Label>
                <Input
                  id="ld-phone"
                  placeholder="+1 234 567 8900"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ld-email">Email</Label>
                <Input
                  id="ld-email"
                  type="email"
                  placeholder="info@business.com"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ld-website">Website</Label>
              <Input
                id="ld-website"
                placeholder="https://www.business.com"
                value={manualForm.website}
                onChange={(e) => setManualForm({ ...manualForm, website: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ld-address">Address</Label>
              <Input
                id="ld-address"
                placeholder="123 Main Street"
                value={manualForm.address}
                onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ld-city">City</Label>
                <Input
                  id="ld-city"
                  placeholder="New York"
                  value={manualForm.city}
                  onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ld-state">State</Label>
                <Input
                  id="ld-state"
                  placeholder="NY"
                  value={manualForm.state}
                  onChange={(e) => setManualForm({ ...manualForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Business Type</Label>
              <Select value={manualForm.businessType} onValueChange={(v) => setManualForm({ ...manualForm, businessType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ld-description">Description</Label>
              <Textarea
                id="ld-description"
                placeholder="Brief description of the business..."
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleCreateManual} disabled={saving}>
              {saving ? 'Saving...' : 'Add Business'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedDiscovery && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="size-5 text-orange-600" />
                  {selectedDiscovery.name}
                </DialogTitle>
                <DialogDescription>
                  {getBusinessTypeLabel(selectedDiscovery.businessType)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status + Source */}
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedDiscovery.status)}
                  {renderSourceBadge(selectedDiscovery.source)}
                  <Badge variant="outline" className={`text-[10px] h-5 ${getPriorityConfig(selectedDiscovery.priority).bgColor} ${getPriorityConfig(selectedDiscovery.priority).textColor}`}>
                    <span className={`size-1.5 rounded-full mr-1 ${getPriorityConfig(selectedDiscovery.priority).dotColor}`} />
                    {getPriorityConfig(selectedDiscovery.priority).label}
                  </Badge>
                </div>

                {/* Rating */}
                {selectedDiscovery.rating > 0 && (
                  <div className="flex items-center gap-2">
                    {renderStarRating(selectedDiscovery.rating)}
                    {selectedDiscovery.reviewCount > 0 && (
                      <span className="text-xs text-muted-foreground">({selectedDiscovery.reviewCount} reviews)</span>
                    )}
                  </div>
                )}

                <Separator />

                {/* Contact info */}
                <div className="grid gap-3">
                  {selectedDiscovery.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-4 text-muted-foreground shrink-0" />
                      <span>{selectedDiscovery.phone}</span>
                    </div>
                  )}
                  {selectedDiscovery.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-4 text-muted-foreground shrink-0" />
                      <span>{selectedDiscovery.email}</span>
                    </div>
                  )}
                  {selectedDiscovery.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedDiscovery.website}</span>
                    </div>
                  )}
                  {selectedDiscovery.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="size-4 text-muted-foreground shrink-0" />
                      <span>{selectedDiscovery.address}{selectedDiscovery.city ? `, ${selectedDiscovery.city}` : ''}{selectedDiscovery.state ? `, ${selectedDiscovery.state}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedDiscovery.description && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedDiscovery.description}</p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium">Discovered</p>
                    <p>{formatDate(selectedDiscovery.createdAt)}</p>
                  </div>
                  {selectedDiscovery.importedAt && (
                    <div>
                      <p className="font-medium">Imported</p>
                      <p>{formatDate(selectedDiscovery.importedAt)}</p>
                    </div>
                  )}
                  {selectedDiscovery.contactedAt && (
                    <div>
                      <p className="font-medium">Contacted</p>
                      <p>{formatDate(selectedDiscovery.contactedAt)}</p>
                    </div>
                  )}
                  {selectedDiscovery.convertedAt && (
                    <div>
                      <p className="font-medium">Converted</p>
                      <p>{formatDate(selectedDiscovery.convertedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <Separator />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Change Status</Label>
                      <Select
                        value={selectedDiscovery.status}
                        onValueChange={(v) => handleStatusChange(selectedDiscovery.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KANBAN_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Change Priority</Label>
                      <Select
                        value={selectedDiscovery.priority}
                        onValueChange={(v) => handlePriorityChange(selectedDiscovery.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${val.dotColor}`} />
                                {val.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedDiscovery.status !== 'imported' && selectedDiscovery.status !== 'converted' && (
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { handleImportToCrm(selectedDiscovery.id); }}
                      >
                        <Download className="size-4 mr-1.5" /> Import to CRM
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(selectedDiscovery.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
