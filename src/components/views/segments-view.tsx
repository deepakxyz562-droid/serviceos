'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Search, Filter, Trash2,
  Eye, X, Loader2, Tag as TagIcon, Layers, Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  type: string;
  memberCount: number;
  matchLogic: string;
  rulesJson: string;
  isDefault: boolean;
  color?: string | null;
  icon?: string | null;
  createdAt: string;
}

interface TagOption { id: string; name: string; color?: string | null; }
interface GroupOption { id: string; name: string; color?: string | null; }

interface ContactTagLink { id: string; tag: TagOption; }
interface ContactGroupLink { id: string; group: GroupOption; }

interface PreviewContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city?: string | null;
  country?: string | null;
  status?: string;
  contactTags?: ContactTagLink[];
  contactGroups?: ContactGroupLink[];
  tags?: string | null;
}

interface PreviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

type FilterFieldType = 'text' | 'select' | 'tagSelect' | 'groupSelect' | 'boolean';

interface FilterFieldDef {
  value: string;
  label: string;
  type: FilterFieldType;
  operators: string[]; // allowed operator values
  options?: { value: string; label: string }[];
}

const OPERATOR_EQUALS_ONLY = ['equals'];
const OPERATOR_TEXT = ['equals', 'not_equals', 'contains'];
const OPERATOR_ALL = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'more_than'];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'more_than', label: 'More Than (days)' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'form', label: 'Form' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ads', label: 'Ads' },
  { value: 'api', label: 'API' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'blocked', label: 'Blocked' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const FILTER_FIELDS: FilterFieldDef[] = [
  { value: 'name', label: 'Name', type: 'text', operators: OPERATOR_TEXT },
  { value: 'email', label: 'Email', type: 'text', operators: OPERATOR_TEXT },
  { value: 'phone', label: 'Phone', type: 'text', operators: OPERATOR_TEXT },
  { value: 'company', label: 'Company', type: 'text', operators: OPERATOR_TEXT },
  { value: 'tags', label: 'Customer Tags (legacy)', type: 'text', operators: OPERATOR_TEXT },
  { value: 'groupId', label: 'In Group', type: 'groupSelect', operators: OPERATOR_EQUALS_ONLY },
  { value: 'tagId', label: 'Has Tag', type: 'tagSelect', operators: OPERATOR_EQUALS_ONLY },
  { value: 'city', label: 'City', type: 'text', operators: OPERATOR_TEXT },
  { value: 'country', label: 'Country', type: 'text', operators: OPERATOR_TEXT },
  { value: 'source', label: 'Source', type: 'select', operators: OPERATOR_EQUALS_ONLY, options: SOURCE_OPTIONS },
  { value: 'status', label: 'Status', type: 'select', operators: OPERATOR_EQUALS_ONLY, options: STATUS_OPTIONS },
  { value: 'emailVerified', label: 'Email Verified', type: 'boolean', operators: OPERATOR_EQUALS_ONLY, options: BOOLEAN_OPTIONS },
  { value: 'phoneVerified', label: 'Phone Verified', type: 'boolean', operators: OPERATOR_EQUALS_ONLY, options: BOOLEAN_OPTIONS },
];

const getFieldDef = (field: string): FilterFieldDef | undefined =>
  FILTER_FIELDS.find(f => f.value === field);

const PREVIEW_PAGE_SIZE = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return `rgba(16,185,129,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
};

const tagBadgeStyle = (color?: string | null): React.CSSProperties => {
  if (!color) return {};
  return {
    backgroundColor: hexToRgba(color, 0.12),
    color,
    borderColor: hexToRgba(color, 0.35),
  };
};

// Translate FilterRows → /api/contacts query params (for live preview of unsaved rules)
const rulesToContactParams = (rules: FilterRow[], matchLogic: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const setOrOverride = (key: string, value: string) => {
    // For AND logic, all rules must apply — but the contacts API only supports one value per param.
    // For OR logic, we use the first occurrence.
    if (!(key in params)) params[key] = value;
  };
  for (const r of rules) {
    if (!r.value) continue;
    switch (r.field) {
      case 'name':
      case 'email':
      case 'phone':
      case 'company':
      case 'tags':
        // Contacts API supports a single `search` query across name/email/phone/company
        setOrOverride('search', r.value);
        break;
      case 'groupId':
        setOrOverride('groupId', r.value);
        break;
      case 'tagId':
        setOrOverride('tagId', r.value);
        break;
      case 'city':
        setOrOverride('city', r.value);
        break;
      case 'country':
        setOrOverride('country', r.value);
        break;
      case 'source':
        setOrOverride('source', r.value);
        break;
      case 'status':
        setOrOverride('status', r.value);
        break;
      // emailVerified / phoneVerified are not directly supported by /api/contacts query (deviation noted)
      default:
        break;
    }
  }
  void matchLogic; // currently we forward the first occurrence per field
  return params;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Tags & Groups
  const [tags, setTags] = useState<TagOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  // Preview state
  const [previewContacts, setPreviewContacts] = useState<PreviewContact[]>([]);
  const [previewPagination, setPreviewPagination] = useState<PreviewPagination | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', matchLogic: 'and',
    filters: [{ id: 'f-new-1', field: 'name', operator: 'equals', value: '' }] as FilterRow[],
  });

  // ── Load segments ──
  const loadSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/segments?limit=50');
      if (res.ok) {
        const result = await res.json();
        setSegments(result.data || []);
      } else {
        setError('Failed to load segments');
        toast.error('Failed to load segments');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading segments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load tags & groups ──
  const loadTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const json = await res.json();
        setTags(json.data || json || []);
      }
    } catch {
      // silent
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const json = await res.json();
        setGroups(json.data || json || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadSegments();
    loadTags();
    loadGroups();
  }, [loadSegments, loadTags, loadGroups]);

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Segment name is required'); return; }

    setIsCreating(true);
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          type: 'dynamic',
          matchLogic: createForm.matchLogic,
          rulesJson: JSON.stringify(createForm.filters.filter(f => f.value)),
          memberCount: 0,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const seg: Segment = result.data || result;
        setSegments(prev => [seg, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({ name: '', description: '', matchLogic: 'and', filters: [{ id: 'f-new-1', field: 'name', operator: 'equals', value: '' }] });
        toast.success('Segment created');
      } else {
        toast.error('Failed to create segment');
      }
    } catch {
      toast.error('Failed to create segment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSegments(prev => prev.filter(s => s.id !== id));
        toast.success('Segment deleted');
      }
    } catch {
      toast.error('Failed to delete segment');
    }
  };

  const addFilterRow = () => {
    setCreateForm(prev => ({
      ...prev,
      filters: [...prev.filters, { id: `f-${Date.now()}`, field: 'name', operator: 'equals', value: '' }],
    }));
  };

  const removeFilterRow = (id: string) => {
    setCreateForm(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id),
    }));
  };

  const updateFilterRow = (id: string, key: keyof FilterRow, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      filters: prev.filters.map(f => {
        if (f.id !== id) return f;
        const next = { ...f, [key]: value };
        // When field changes, reset operator to the first allowed one for that field
        if (key === 'field') {
          const def = getFieldDef(value);
          if (def && !def.operators.includes(next.operator)) {
            next.operator = def.operators[0];
          }
          // Clear value if field type doesn't match a free-text input
          if (def && def.type !== 'text') {
            // keep value (user might have typed it), but no clear
          }
        }
        return next;
      }),
    }));
  };

  const parseRules = (rulesJson: string): FilterRow[] => {
    try {
      const rules = JSON.parse(rulesJson || '[]');
      if (Array.isArray(rules)) return rules;
      return [];
    } catch {
      return [];
    }
  };

  // ── Preview members ──
  const openMembersPreview = async (segment: Segment) => {
    setSelectedSegment(segment);
    setShowMembersDialog(true);
    setPreviewPage(1);
    await runPreview(segment, 1);
  };

  const openUnsavedPreview = async () => {
    // Build a synthetic segment-like object for the dialog
    const synthetic: Segment = {
      id: '__unsaved__',
      name: createForm.name || 'New Segment (unsaved)',
      description: createForm.description,
      type: 'dynamic',
      memberCount: 0,
      matchLogic: createForm.matchLogic,
      rulesJson: JSON.stringify(createForm.filters.filter(f => f.value)),
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    setSelectedSegment(synthetic);
    setShowMembersDialog(true);
    setPreviewPage(1);
    await runPreview(synthetic, 1);
  };

  const runPreview = async (segment: Segment | null, pageNum: number) => {
    if (!segment) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const rules = parseRules(segment.rulesJson);
      let res: Response;

      if (segment.id === '__unsaved__') {
        // Use the /api/contacts endpoint with translated rules (live preview)
        const params = rulesToContactParams(rules, segment.matchLogic);
        params.page = String(pageNum);
        params.limit = String(PREVIEW_PAGE_SIZE);
        res = await fetch(`/api/contacts?${new URLSearchParams(params).toString()}`);
      } else {
        // Existing segment: use dedicated preview endpoint
        res = await fetch(`/api/segments/${segment.id}/preview?page=${pageNum}&limit=${PREVIEW_PAGE_SIZE}`);
      }

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setPreviewContacts(json.data as PreviewContact[]);
          setPreviewPagination(json.pagination || null);
        } else if (Array.isArray(json)) {
          setPreviewContacts(json as PreviewContact[]);
          setPreviewPagination(null);
        } else {
          setPreviewContacts([]);
          setPreviewPagination(null);
        }
      } else if (res.status === 404) {
        // Preview endpoint not implemented for this segment — fall back to translating rules client-side
        const params = rulesToContactParams(rules, segment.matchLogic);
        params.page = String(pageNum);
        params.limit = String(PREVIEW_PAGE_SIZE);
        const fallbackRes = await fetch(`/api/contacts?${new URLSearchParams(params).toString()}`);
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          setPreviewContacts(Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
          setPreviewPagination(json.pagination || null);
        } else {
          setPreviewError('Preview endpoint not available');
          setPreviewContacts([]);
        }
      } else {
        setPreviewError('Failed to load preview');
        setPreviewContacts([]);
      }
    } catch {
      setPreviewError('Network error loading preview');
      setPreviewContacts([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onPreviewPageChange = (newPage: number) => {
    setPreviewPage(newPage);
    runPreview(selectedSegment, newPage);
  };

  const totalMembers = segments.reduce((s, seg) => s + seg.memberCount, 0);

  // ── Render helpers for filter row value input ──
  const renderFilterValueInput = (filter: FilterRow) => {
    const def = getFieldDef(filter.field);
    if (!def) {
      return (
        <Input
          className="h-8 text-xs"
          placeholder="Value"
          value={filter.value}
          onChange={e => updateFilterRow(filter.id, 'value', e.target.value)}
        />
      );
    }
    if (def.type === 'select' && def.options) {
      return (
        <Select value={filter.value} onValueChange={v => updateFilterRow(filter.id, 'value', v)}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {def.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (def.type === 'boolean' && def.options) {
      return (
        <Select value={filter.value} onValueChange={v => updateFilterRow(filter.id, 'value', v)}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {def.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (def.type === 'tagSelect') {
      return (
        <Select value={filter.value} onValueChange={v => updateFilterRow(filter.id, 'value', v)}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Select tag..." /></SelectTrigger>
          <SelectContent>
            {tags.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No tags available</div>
            ) : (
              tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
            )}
          </SelectContent>
        </Select>
      );
    }
    if (def.type === 'groupSelect') {
      return (
        <Select value={filter.value} onValueChange={v => updateFilterRow(filter.id, 'value', v)}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Select group..." /></SelectTrigger>
          <SelectContent>
            {groups.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No groups available</div>
            ) : (
              groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)
            )}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        className="h-8 text-xs"
        placeholder="Value"
        value={filter.value}
        onChange={e => updateFilterRow(filter.id, 'value', e.target.value)}
      />
    );
  };

  const renderFilterSummary = (filter: FilterRow) => {
    const def = getFieldDef(filter.field);
    const label = def?.label || filter.field;
    let valueLabel = filter.value;
    if (def?.type === 'tagSelect') {
      valueLabel = tags.find(t => t.id === filter.value)?.name || filter.value;
    } else if (def?.type === 'groupSelect') {
      valueLabel = groups.find(g => g.id === filter.value)?.name || filter.value;
    } else if (def?.type === 'select' || def?.type === 'boolean') {
      valueLabel = def.options?.find(o => o.value === filter.value)?.label || filter.value;
    }
    const opLabel = OPERATORS.find(o => o.value === filter.operator)?.label || filter.operator;
    return { label, valueLabel, opLabel };
  };

  const hasActiveFilter = useMemo(() =>
    createForm.filters.some(f => f.value.trim() !== ''),
    [createForm.filters]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-44 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-8 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-8 w-full" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Users className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load segments</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadSegments}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Segments</h2>
            <p className="text-sm text-muted-foreground">Customer segmentation engine with live preview</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Segment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <Card className="p-4"><div className="flex items-center gap-2"><Users className="size-4 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Total Segments</p><p className="text-lg font-bold">{segments.length}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Users className="size-4 text-teal-600" /><div><p className="text-xs text-muted-foreground">Total Members</p><p className="text-lg font-bold">{totalMembers.toLocaleString()}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Filter className="size-4 text-amber-600" /><div><p className="text-xs text-muted-foreground">Dynamic</p><p className="text-lg font-bold">{segments.filter(s => s.type === 'dynamic').length}</p></div></div></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Segments List */}
      {filteredSegments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No segments found</p>
          <p className="text-sm mt-1">Create your first customer segment</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Segment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map(segment => {
            const rules = parseRules(segment.rulesJson);
            return (
              <Card key={segment.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{segment.name}</h4>
                        {segment.isDefault && <Badge variant="secondary" className="text-[9px] h-4">Default</Badge>}
                        <Badge variant="outline" className="text-[9px] h-4">{segment.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{segment.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openMembersPreview(segment)} title="Preview members">
                        <Eye className="size-3.5" />
                      </Button>
                      {!segment.isDefault && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(segment.id)} title="Delete">
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="size-3 mr-1" /> {segment.memberCount} members
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{segment.matchLogic.toUpperCase()} logic</Badge>
                  </div>
                  {rules.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                      {rules.slice(0, 3).map((filter, idx) => {
                        const s = renderFilterSummary(filter);
                        return (
                          <div key={idx} className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium">{s.label}</span>
                            <span>{s.opLabel}</span>
                            <span className="font-medium text-emerald-600">&quot;{s.valueLabel}&quot;</span>
                          </div>
                        );
                      })}
                      {rules.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{rules.length - 3} more filters</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Segment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Segment</DialogTitle>
            <DialogDescription>Build a dynamic customer segment with rich filters</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Segment Name *</Label>
                <Input placeholder="e.g., Inactive Customers" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input placeholder="What is this segment for?" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Match Logic</Label>
                <Select value={createForm.matchLogic} onValueChange={v => setCreateForm({ ...createForm, matchLogic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Match ALL conditions (AND)</SelectItem>
                    <SelectItem value="or">Match ANY condition (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Filter Conditions</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFilterRow}>
                  <Plus className="size-3 mr-1" /> Add Filter
                </Button>
              </div>
              {createForm.filters.map((filter, idx) => {
                const def = getFieldDef(filter.field);
                const allowedOps = def?.operators || OPERATOR_ALL;
                return (
                  <div key={filter.id} className="flex flex-wrap items-center gap-2">
                    {idx > 0 && <Badge variant="secondary" className="text-[9px] shrink-0">{createForm.matchLogic.toUpperCase()}</Badge>}
                    <Select value={filter.field} onValueChange={v => updateFilterRow(filter.id, 'field', v)}>
                      <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FILTER_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filter.operator} onValueChange={v => updateFilterRow(filter.id, 'operator', v)}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERATORS.filter(o => allowedOps.includes(o.value)).map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-[140px]">{renderFilterValueInput(filter)}</div>
                    {createForm.filters.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => removeFilterRow(filter.id)}>
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                Tip: Use <span className="font-medium">In Group</span> or <span className="font-medium">Has Tag</span> filters to target contacts by their group/tag memberships.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={openUnsavedPreview}
              disabled={!hasActiveFilter || previewLoading}
              title="Preview matched contacts before saving"
            >
              {previewLoading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Play className="size-4 mr-1" />}
              Preview Members
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Preview Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4 text-emerald-600" />
              {selectedSegment?.name} — Preview
            </DialogTitle>
            <DialogDescription>
              {selectedSegment?.id === '__unsaved__'
                ? 'Live preview based on current filter rules (not yet saved).'
                : `Members matching this segment's rules.`}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
            </div>
          ) : previewError ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">{previewError}</p>
            </div>
          ) : previewContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="size-10 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No contacts match this segment&apos;s rules.</p>
              {selectedSegment?.id !== '__unsaved__' && (
                <p className="text-xs text-muted-foreground mt-1">Member count: {selectedSegment?.memberCount ?? 0}</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Badge variant="outline" className="text-[10px]">
                  {previewPagination?.total ?? previewContacts.length} matches
                </Badge>
                {selectedSegment?.matchLogic && (
                  <Badge variant="outline" className="text-[10px]">{selectedSegment.matchLogic.toUpperCase()}</Badge>
                )}
              </div>
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Groups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewContacts.map(c => {
                      const ctTags = c.contactTags || [];
                      const legacyTags = (c.tags || '').split(',').map(t => t.trim()).filter(Boolean);
                      const cgGroups = c.contactGroups || [];
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                                  {getInitials(c.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{c.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.email || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {ctTags.length > 0
                                ? ctTags.map(ct => (
                                  <Badge key={ct.id} variant="outline" className="text-[10px] h-5" style={tagBadgeStyle(ct.tag.color)}>
                                    {ct.tag.name}
                                  </Badge>
                                ))
                                : legacyTags.map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                    {t}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {cgGroups.map(cg => (
                                <Badge key={cg.id} variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700">
                                  <Layers className="size-2.5 mr-0.5" />
                                  {cg.group.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {previewPagination && previewPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {(previewPagination.page - 1) * previewPagination.limit + 1}-{Math.min(previewPagination.page * previewPagination.limit, previewPagination.total)} of {previewPagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={previewPagination.page <= 1} onClick={() => onPreviewPageChange(previewPagination.page - 1)}>
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {previewPagination.page} of {previewPagination.totalPages}
                    </span>
                    <Button size="sm" variant="outline" disabled={previewPagination.page >= previewPagination.totalPages} onClick={() => onPreviewPageChange(previewPagination.page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
