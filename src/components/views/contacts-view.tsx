'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Contact as ContactIcon, Upload, Download, Plus, Search, Filter, Edit, Trash2,
  MoreVertical, FileSpreadsheet, CheckCircle2, AlertCircle, X,
  Loader2, Mail, Phone, Building2, Tag as TagIcon, ChevronDown,
  Users as UsersIcon, MapPin, AlertTriangle,
  ArrowUpRight, Workflow as WorkflowIcon, Send, Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TagOption {
  id: string;
  name: string;
  color?: string | null;
}

interface GroupOption {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactTagLink {
  id: string;
  tag: TagOption;
}

interface ContactGroupLink {
  id: string;
  group: GroupOption;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  // New normalized fields
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  source?: string | null;
  status?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  lastActivityAt?: string | null;
  // New M2M relations
  contactTags?: ContactTagLink[];
  contactGroups?: ContactGroupLink[];
  // Legacy tags string (kept for backward compat)
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ImportStats {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
}

type BulkAction =
  | 'addToGroup'
  | 'removeFromGroup'
  | 'applyTag'
  | 'removeTag'
  | 'delete'
  | 'updateStatus';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  { value: 'unsubscribed', label: 'Unsubscribed', className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700' },
  { value: 'bounced', label: 'Bounced', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  { value: 'blocked', label: 'Blocked', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'form', label: 'Form' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ads', label: 'Ads' },
  { value: 'api', label: 'API' },
];

const PAGE_SIZE_OPTIONS: Array<{ value: number | 'all'; label: string }> = [
  { value: 5, label: '5 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
  { value: 100, label: '100 / page' },
  { value: 'all', label: 'All' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatLocation = (c: Contact): string => {
  const parts = [c.city, c.country].filter(p => p && p.trim()).map(p => p!.trim());
  return parts.join(', ');
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

const groupBadgeStyle = (color?: string | null): React.CSSProperties => {
  if (!color) return {};
  return {
    backgroundColor: hexToRgba(color, 0.10),
    color,
    borderColor: hexToRgba(color, 0.30),
  };
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ─── Component ──────────────────────────────────────────────────────────────

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(20);

  // Available tags / groups (fetched once)
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [availableGroups, setAvailableGroups] = useState<GroupOption[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Bulk action dialog
  const [bulkActionDialog, setBulkActionDialog] = useState<null | {
    action: Exclude<BulkAction, 'delete'>;
    title: string;
    description: string;
  }>(null);
  const [bulkActionTargetId, setBulkActionTargetId] = useState<string>('');
  const [bulkActionStatusValue, setBulkActionStatusValue] = useState<string>('active');
  const [bulkActionRunning, setBulkActionRunning] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formSource, setFormSource] = useState<string>('manual');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState<string>('csv');

  // ─── Lead / Workflow / Campaign / Segment linkage state ────────────────
  // Lists of available workflows / campaigns / segments that the user can
  // attach a contact to. Loaded lazily on first sub-menu open and cached.
  interface WorkflowOption { id: string; name: string; description?: string | null; active?: boolean }
  interface CampaignOption { id: string; name: string; description?: string | null; status?: string }
  interface SegmentOption { id: string; name: string; description?: string | null; type?: string; memberCount?: number }

  const [availableWorkflows, setAvailableWorkflows] = useState<WorkflowOption[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignOption[]>([]);
  const [availableSegments, setAvailableSegments] = useState<SegmentOption[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [linkingContactId, setLinkingContactId] = useState<string | null>(null);

  // ─── Fetch tags & groups ────────────────────────────────────────────────

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const json = await res.json();
        const list: TagOption[] = json.data || json || [];
        setAvailableTags(list);
      }
    } catch {
      // Tags API may not exist yet — silent fallback to empty list
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const json = await res.json();
        const list: GroupOption[] = json.data || json || [];
        setAvailableGroups(list);
      }
    } catch {
      // Groups API may not exist yet — silent fallback to empty list
    }
  }, []);

  // ─── Fetch contacts (with filters + pagination) ─────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', pageSize === 'all' ? 'all' : String(pageSize));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (groupFilter !== 'all') params.set('groupId', groupFilter);
      if (tagFilter !== 'all') params.set('tagId', tagFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (countryFilter.trim()) params.set('country', countryFilter.trim());

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        // New contract: { data, pagination }
        if (json && Array.isArray(json.data)) {
          setContacts(json.data as Contact[]);
          setPagination(json.pagination || null);
        } else if (Array.isArray(json)) {
          // Legacy contract: plain array
          setContacts(json as Contact[]);
          setPagination(null);
        } else {
          setContacts([]);
          setPagination(null);
        }
      } else {
        toast.error('Failed to load contacts');
        setContacts([]);
      }
    } catch {
      toast.error('Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, groupFilter, tagFilter, statusFilter, sourceFilter, countryFilter]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [groupFilter, tagFilter, statusFilter, sourceFilter, countryFilter]);

  // Reset page when page size changes (page 1 of the new size)
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchTags();
    fetchGroups();
  }, [fetchTags, fetchGroups]);

  // Clear selection when contacts change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [contacts]);

  // ─── Derived stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = pagination?.total ?? contacts.length;
    const withEmail = contacts.filter(c => c.email).length;
    const withPhone = contacts.filter(c => c.phone).length;
    const tagCount = new Set<string>();
    contacts.forEach(c => {
      c.contactTags?.forEach(ct => tagCount.add(ct.tag.id));
      // legacy tags
      (c.tags || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagCount.add(t));
    });
    return { total, withEmail, withPhone, tagCount: tagCount.size };
  }, [contacts, pagination]);

  // ─── Filtered contacts (client-side fallback if no pagination) ──────────

  const displayedContacts = contacts;

  // ─── Add/Edit contact ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        company: formCompany.trim() || null,
        city: formCity.trim() || null,
        state: formState.trim() || null,
        country: formCountry.trim() || null,
        zip: formZip.trim() || null,
        source: formSource,
        status: formStatus,
        tagIds: formTagIds,
        groupIds: formGroupIds,
      };

      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingContact ? 'Contact updated' : 'Contact created');
        resetForm();
        fetchContacts();
        fetchTags();
        fetchGroups();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save contact');
      }
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormCity('');
    setFormState('');
    setFormCountry('');
    setFormZip('');
    setFormSource('manual');
    setFormStatus('active');
    setFormTagIds([]);
    setFormGroupIds([]);
    setNewTagName('');
    setNewGroupName('');
    setEditingContact(null);
    setAddDialogOpen(false);
    setEditDialogOpen(false);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormEmail(contact.email || '');
    setFormPhone(contact.phone || '');
    setFormCompany(contact.company || '');
    setFormCity(contact.city || '');
    setFormState(contact.state || '');
    setFormCountry(contact.country || '');
    setFormZip(contact.zip || '');
    setFormSource(contact.source || 'manual');
    setFormStatus(contact.status || 'active');
    setFormTagIds(contact.contactTags?.map(ct => ct.tag.id) || []);
    setFormGroupIds(contact.contactGroups?.map(cg => cg.group.id) || []);
    setEditDialogOpen(true);
  };

  // ─── Delete contact ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Contact deleted');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchContacts();
      } else {
        toast.error('Failed to delete contact');
      }
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  // ─── Inline create tag/group ────────────────────────────────────────────

  const handleCreateTagInline = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: '#10b981' }),
      });
      if (res.ok) {
        const json = await res.json();
        const created: TagOption = json.data || json;
        setAvailableTags(prev => [...prev, created]);
        setFormTagIds(prev => [...prev, created.id]);
        setNewTagName('');
        toast.success(`Tag "${name}" created`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create tag');
      }
    } catch {
      toast.error('Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleCreateGroupInline = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const json = await res.json();
        const created: GroupOption = json.data || json;
        setAvailableGroups(prev => [...prev, created]);
        setFormGroupIds(prev => [...prev, created.id]);
        setNewGroupName('');
        toast.success(`Group "${name}" created`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create group');
      }
    } catch {
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // ─── Contact → Lead / Workflow / Campaign / Segment actions ─────────────

  const fetchWorkflows = useCallback(async () => {
    if (loadingWorkflows) return;
    setLoadingWorkflows(true);
    try {
      const res = await fetch('/api/workflows?limit=100');
      if (res.ok) {
        const json = await res.json();
        const list: WorkflowOption[] = Array.isArray(json?.workflows) ? json.workflows : [];
        setAvailableWorkflows(list);
      }
    } catch {
      // Silent — sub-menu will just show an empty state.
    } finally {
      setLoadingWorkflows(false);
    }
  }, [loadingWorkflows]);

  const fetchCampaigns = useCallback(async () => {
    if (loadingCampaigns) return;
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/campaigns?limit=100');
      if (res.ok) {
        const json = await res.json();
        const list: CampaignOption[] = Array.isArray(json?.data) ? json.data : [];
        setAvailableCampaigns(list);
      }
    } catch {
      // Silent.
    } finally {
      setLoadingCampaigns(false);
    }
  }, [loadingCampaigns]);

  const fetchSegments = useCallback(async () => {
    if (loadingSegments) return;
    setLoadingSegments(true);
    try {
      const res = await fetch('/api/segments?limit=100');
      if (res.ok) {
        const json = await res.json();
        const list: SegmentOption[] = Array.isArray(json?.data) ? json.data : [];
        setAvailableSegments(list);
      }
    } catch {
      // Silent.
    } finally {
      setLoadingSegments(false);
    }
  }, [loadingSegments]);

  /** Convert a contact into a lead. POSTs the contact's name/email/phone
   *  to /api/leads with source='contact'. */
  const handleConvertToLead = useCallback(async (contact: Contact) => {
    setLinkingContactId(contact.id);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone || '',
          email: contact.email || null,
          source: 'contact',
        }),
      });
      if (res.ok) {
        toast.success(`Converted "${contact.name}" to a lead`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to convert to lead');
      }
    } catch {
      toast.error('Failed to convert to lead');
    } finally {
      setLinkingContactId(null);
    }
  }, []);

  /** Trigger an existing workflow with the contact as the trigger data.
   *  Uses the existing /api/workflows/[id]/execute endpoint. */
  const handleAddToWorkflow = useCallback(async (contact: Contact, workflow: WorkflowOption) => {
    setLinkingContactId(contact.id);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerData: {
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
          },
        }),
      });
      if (res.ok) {
        toast.success(`Added "${contact.name}" to workflow "${workflow.name}"`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to add to workflow "${workflow.name}"`);
      }
    } catch {
      toast.error(`Failed to add to workflow "${workflow.name}"`);
    } finally {
      setLinkingContactId(null);
    }
  }, []);

  /** Register a contact as a recipient of a campaign via the new
   *  /api/campaigns/[id]/recipients endpoint. */
  const handleAddToCampaign = useCallback(async (contact: Contact, campaign: CampaignOption) => {
    setLinkingContactId(contact.id);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.alreadyRecipient) {
          toast.info(`"${contact.name}" is already a recipient of "${campaign.name}"`);
        } else {
          toast.success(`Added "${contact.name}" to campaign "${campaign.name}"`);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to add to campaign "${campaign.name}"`);
      }
    } catch {
      toast.error(`Failed to add to campaign "${campaign.name}"`);
    } finally {
      setLinkingContactId(null);
    }
  }, []);

  /** Add a contact to a segment via the new /api/segments/[id]/members
   *  endpoint. */
  const handleAddToSegment = useCallback(async (contact: Contact, segment: SegmentOption) => {
    setLinkingContactId(contact.id);
    try {
      const res = await fetch(`/api/segments/${segment.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id }),
      });
      if (res.ok) {
        toast.success(`Added "${contact.name}" to segment "${segment.name}"`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to add to segment "${segment.name}"`);
      }
    } catch {
      toast.error(`Failed to add to segment "${segment.name}"`);
    } finally {
      setLinkingContactId(null);
    }
  }, []);

  // ─── Bulk actions ───────────────────────────────────────────────────────

  const runBulkAction = async (action: BulkAction, extra?: Record<string, unknown>) => {
    if (selectedIds.size === 0) {
      toast.error('No contacts selected');
      return;
    }
    setBulkActionRunning(true);
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          action,
          ...extra,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const succeeded: number = json.success ?? (json.succeeded ?? 0);
        const failed: number = json.failed ?? 0;
        if (failed > 0) {
          toast.warning(`Action applied to ${succeeded} contacts, ${failed} failed`);
        } else {
          toast.success(`Action applied to ${succeeded} contacts`);
        }
        setBulkActionDialog(null);
        setBulkActionTargetId('');
        setBulkActionStatusValue('active');
        setSelectedIds(new Set());
        fetchContacts();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || 'Bulk action failed';
        const detail = err?.detail ? ` (${err.detail})` : '';
        const hint = err?.hint ? ` — ${err.hint}` : '';
        toast.error(`${msg}${detail}${hint}`, { duration: 8000 });
      }
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setBulkActionRunning(false);
    }
  };

  const handleBulkActionConfirm = () => {
    if (!bulkActionDialog) return;
    const { action } = bulkActionDialog;
    if ((action === 'addToGroup' || action === 'removeFromGroup') && !bulkActionTargetId) {
      toast.error('Please select a group');
      return;
    }
    if ((action === 'applyTag' || action === 'removeTag') && !bulkActionTargetId) {
      toast.error('Please select a tag');
      return;
    }
    if (action === 'updateStatus') {
      runBulkAction('updateStatus', { status: bulkActionStatusValue });
      return;
    }
    if (action === 'addToGroup') {
      runBulkAction('addToGroup', { groupId: bulkActionTargetId });
      return;
    }
    if (action === 'removeFromGroup') {
      runBulkAction('removeFromGroup', { groupId: bulkActionTargetId });
      return;
    }
    if (action === 'applyTag') {
      runBulkAction('applyTag', { tagId: bulkActionTargetId });
      return;
    }
    if (action === 'removeTag') {
      runBulkAction('removeTag', { tagId: bulkActionTargetId });
      return;
    }
  };

  const handleBulkDelete = async () => {
    setBulkActionRunning(true);
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          action: 'delete',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const succeeded: number = json.success ?? (json.succeeded ?? selectedIds.size);
        toast.success(`${succeeded} contacts deleted`);
        setBulkDeleteDialogOpen(false);
        setSelectedIds(new Set());
        fetchContacts();
      } else {
        // Fallback: call DELETE per-contact
        await Promise.all(
          Array.from(selectedIds).map(id => fetch(`/api/contacts/${id}`, { method: 'DELETE' }))
        );
        toast.success(`${selectedIds.size} contacts deleted`);
        setBulkDeleteDialogOpen(false);
        setSelectedIds(new Set());
        fetchContacts();
      }
    } catch {
      toast.error('Failed to delete contacts');
    } finally {
      setBulkActionRunning(false);
    }
  };

  // ─── Selection ──────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedContacts.length && displayedContacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedContacts.map(c => c.id)));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setGroupFilter('all');
    setTagFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
    setCountryFilter('');
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    if (value === 'all') {
      setPageSize('all');
    } else {
      setPageSize(parseInt(value, 10));
    }
  };

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    groupFilter !== 'all' ||
    tagFilter !== 'all' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    countryFilter.trim() !== '';

  // ─── Import ─────────────────────────────────────────────────────────────

  const CONTACT_FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'zip', label: 'ZIP' },
    { key: 'tags', label: 'Tags (legacy)' },
  ];

  const parseCSV = (text: string): Record<string, string>[] => {
    // Strip a leading UTF-8 BOM if present — many editors add it and it
    // breaks header matching (the first column would be `\uFEFFname`).
    const cleaned = text.replace(/^\uFEFF/, '');

    // RFC-4180-ish parser that handles quoted fields containing commas,
    // newlines, and escaped quotes (""). The naive `line.split(',')` approach
    // silently corrupts any row containing `"Smith, John"`, which is the most
    // common cause of imports returning zero rows / 400 "No contacts provided".
    const rows: string[][] = [];
    let currentField = '';
    let currentRow: string[] = [];
    let inQuotes = false;
    const src = cleaned;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') { currentField += '"'; i++; continue; }
          inQuotes = false;
          continue;
        }
        currentField += ch;
        continue;
      }
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ',') { currentRow.push(currentField); currentField = ''; continue; }
      if (ch === '\r') {
        if (src[i + 1] === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentField = '';
        currentRow = [];
        continue;
      }
      if (ch === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentField = '';
        currentRow = [];
        continue;
      }
      currentField += ch;
    }
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ''));
    if (nonEmpty.length < 2) return [];

    const headers = nonEmpty[0].map(h => h.trim());
    return nonEmpty.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (row[idx] ?? '').trim(); });
      return obj;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStats(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('No data found in CSV file');
        return;
      }
      const headers = Object.keys(rows[0]);
      setImportHeaders(headers);
      setImportPreview(rows.slice(0, 10));
      const mapping: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('name') || lower === 'full name' || lower === 'first name') mapping[h] = 'name';
        else if (lower.includes('email') || lower === 'e-mail') mapping[h] = 'email';
        else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) mapping[h] = 'phone';
        else if (lower.includes('company') || lower.includes('organization') || lower.includes('org')) mapping[h] = 'company';
        else if (lower === 'city') mapping[h] = 'city';
        else if (lower === 'state' || lower === 'region') mapping[h] = 'state';
        else if (lower === 'country') mapping[h] = 'country';
        else if (lower === 'zip' || lower === 'postal') mapping[h] = 'zip';
        else if (lower.includes('tag') || lower.includes('label') || lower.includes('category')) mapping[h] = 'tags';
        else mapping[h] = '_skip';
      });
      setFieldMapping(mapping);
    } else {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/contacts/import?preview=true', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          setImportHeaders(data.headers || []);
          setImportPreview(data.preview || []);
          setFieldMapping(data.mapping || {});
        } else {
          toast.error('Failed to parse file. Please use CSV format.');
        }
      } catch {
        toast.error('Failed to parse file');
      }
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      const ext = importFile?.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await importFile!.text();
        const allRows = parseCSV(text);
        const mappedContacts = allRows.map(row => {
          const contact: Record<string, string | null> = {};
          CONTACT_FIELDS.forEach(f => {
            const sourceHeader = Object.entries(fieldMapping).find(([, target]) => target === f.key)?.[0];
            contact[f.key] = sourceHeader ? (row[sourceHeader] || null) : null;
          });
          return contact;
        }).filter(c => c.name);

        if (mappedContacts.length === 0) {
          toast.error('No rows with a mapped "Name" field. Please map at least one column to Name in the field mapping above.');
          setImporting(false);
          return;
        }

        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: mappedContacts }),
        });
        if (res.ok) {
          const stats = await res.json();
          setImportStats(stats);
          toast.success(`Imported ${stats.imported} contacts`);
          fetchContacts();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error || 'Import failed';
          const hint = err?.hint ? ` — ${err.hint}` : '';
          toast.error(`${msg}${hint}`);
        }
      } else {
        const formData = new FormData();
        if (importFile) formData.append('file', importFile);
        formData.append('mapping', JSON.stringify(fieldMapping));
        const res = await fetch('/api/contacts/import', { method: 'POST', body: formData });
        if (res.ok) {
          const stats = await res.json();
          setImportStats(stats);
          toast.success(`Imported ${stats.imported} contacts`);
          fetchContacts();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error || 'Import failed';
          const hint = err?.hint ? ` — ${err.hint}` : '';
          toast.error(`${msg}${hint}`);
        }
      }
    } catch (e) {
      console.error('Import failed', e);
      toast.error('Import failed — please check the file format and try again.');
    } finally {
      setImporting(false);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', exportFormat);
      if (selectedIds.size > 0) {
        params.set('ids', Array.from(selectedIds).join(','));
      }
      if (tagFilter !== 'all') {
        params.set('tagId', tagFilter);
      }
      if (groupFilter !== 'all') {
        params.set('groupId', groupFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (sourceFilter !== 'all') {
        params.set('source', sourceFilter);
      }
      const res = await fetch(`/api/contacts/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export complete');
        setExportDialogOpen(false);
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <ContactIcon className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contacts</h2>
            <p className="text-sm text-muted-foreground">Manage your contacts with groups, tags & smart filters</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="size-4 mr-1.5" /> Import</Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}><Download className="size-4 mr-1.5" /> Export</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setAddDialogOpen(true); }}><Plus className="size-4 mr-1.5" /> Add Contact</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ContactIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Mail className="size-4 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withEmail}</p>
                <p className="text-xs text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Phone className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withPhone}</p>
                <p className="text-xs text-muted-foreground">With Phone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                <TagIcon className="size-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableTags.length}</p>
                <p className="text-xs text-muted-foreground">Tags Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Groups" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {availableGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Country"
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="w-32"
            />
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="size-3" />
              <span>Filters active — showing {pagination?.total ?? contacts.length} matching contacts</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-30 rounded-lg border border-emerald-200 bg-emerald-50/95 dark:bg-emerald-900/20 dark:border-emerald-800 backdrop-blur p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {selectedIds.size} selected
            </Badge>
            <Separator orientation="vertical" className="h-6" />
            <Button size="sm" variant="outline" onClick={() => setBulkActionDialog({
              action: 'addToGroup',
              title: 'Add to Group',
              description: `Add ${selectedIds.size} selected contacts to a group.`,
            })}>
              <UsersIcon className="size-3 mr-1" /> Add to Group
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkActionDialog({
              action: 'applyTag',
              title: 'Apply Tag',
              description: `Apply a tag to ${selectedIds.size} selected contacts.`,
            })}>
              <TagIcon className="size-3 mr-1" /> Apply Tag
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkActionDialog({
              action: 'removeTag',
              title: 'Remove Tag',
              description: `Remove a tag from ${selectedIds.size} selected contacts.`,
            })}>
              <TagIcon className="size-3 mr-1" /> Remove Tag
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkActionDialog({
              action: 'updateStatus',
              title: 'Change Status',
              description: `Change the status of ${selectedIds.size} selected contacts.`,
            })}>
              <AlertCircle className="size-3 mr-1" /> Change Status
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="size-3 mr-1" /> Delete Selected
            </Button>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                <X className="size-3 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
            </div>
          ) : displayedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ContactIcon className="size-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">{hasActiveFilters ? 'No matching contacts' : 'No contacts yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-md text-center">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add contacts manually or import from a CSV/XLSX file to get started.'}
              </p>
              {!hasActiveFilters && (
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setAddDialogOpen(true); }}><Plus className="size-4 mr-1.5" /> Add Contact</Button>
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="size-4 mr-1.5" /> Import</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[1200px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === displayedContacts.length && displayedContacts.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedContacts.map(contact => {
                    const ctTags = contact.contactTags || [];
                    const cgGroups = contact.contactGroups || [];
                    const legacyTags = (contact.tags || '').split(',').map(t => t.trim()).filter(Boolean);
                    const statusOpt = STATUS_OPTIONS.find(s => s.value === (contact.status || 'active'));
                    return (
                      <TableRow key={contact.id} className={cn(selectedIds.has(contact.id) && 'bg-emerald-50 dark:bg-emerald-900/10')}>
                        <TableCell><Checkbox checked={selectedIds.has(contact.id)} onCheckedChange={() => toggleSelect(contact.id)} aria-label={`Select ${contact.name}`} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{contact.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.email || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.company || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLocation(contact) || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {ctTags.length > 0
                              ? ctTags.map(ct => (
                                <Badge
                                  key={ct.id}
                                  variant="outline"
                                  className="text-[10px] h-5"
                                  style={tagBadgeStyle(ct.tag.color)}
                                >
                                  {ct.tag.name}
                                </Badge>
                              ))
                              : legacyTags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {cgGroups.map(cg => (
                              <Badge
                                key={cg.id}
                                variant="outline"
                                className="text-[10px] h-5 bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700"
                                style={groupBadgeStyle(cg.group.color)}
                              >
                                <UsersIcon className="size-2.5 mr-0.5" />
                                {cg.group.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] h-5', statusOpt?.className || STATUS_OPTIONS[0].className)}>
                            {statusOpt?.label || contact.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={linkingContactId === contact.id}>
                                {linkingContactId === contact.id
                                  ? <Loader2 className="size-4 animate-spin" />
                                  : <MoreVertical className="size-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => handleConvertToLead(contact)}
                                title="Create a new Lead from this contact"
                              >
                                <ArrowUpRight className="size-3 mr-2" /> Convert to Lead
                              </DropdownMenuItem>

                              {/* Add to Workflow — sub-menu of available workflows */}
                              <DropdownMenuSub onOpenChange={(open) => { if (open) fetchWorkflows(); }}>
                                <DropdownMenuSubTrigger>
                                  <WorkflowIcon className="size-3 mr-2" /> Add to Workflow
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56">
                                  {loadingWorkflows && availableWorkflows.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-2">
                                      <Loader2 className="size-3 animate-spin" /> Loading workflows…
                                    </div>
                                  ) : availableWorkflows.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground">
                                      No workflows available
                                    </div>
                                  ) : (
                                    availableWorkflows.map(w => (
                                      <DropdownMenuItem
                                        key={w.id}
                                        onClick={() => handleAddToWorkflow(contact, w)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="truncate">{w.name}</span>
                                          {w.description && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                              {w.description}
                                            </span>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              {/* Add to Campaign — sub-menu of available campaigns */}
                              <DropdownMenuSub onOpenChange={(open) => { if (open) fetchCampaigns(); }}>
                                <DropdownMenuSubTrigger>
                                  <Send className="size-3 mr-2" /> Add to Campaign
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56">
                                  {loadingCampaigns && availableCampaigns.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-2">
                                      <Loader2 className="size-3 animate-spin" /> Loading campaigns…
                                    </div>
                                  ) : availableCampaigns.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground">
                                      No campaigns available
                                    </div>
                                  ) : (
                                    availableCampaigns.map(c => (
                                      <DropdownMenuItem
                                        key={c.id}
                                        onClick={() => handleAddToCampaign(contact, c)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="truncate">{c.name}</span>
                                          {c.status && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                              {c.status}
                                            </span>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              {/* Add to Segment — sub-menu of available segments */}
                              <DropdownMenuSub onOpenChange={(open) => { if (open) fetchSegments(); }}>
                                <DropdownMenuSubTrigger>
                                  <Layers className="size-3 mr-2" /> Add to Segment
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56">
                                  {loadingSegments && availableSegments.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-2">
                                      <Loader2 className="size-3 animate-spin" /> Loading segments…
                                    </div>
                                  ) : availableSegments.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground">
                                      No segments available
                                    </div>
                                  ) : (
                                    availableSegments.map(s => (
                                      <DropdownMenuItem
                                        key={s.id}
                                        onClick={() => handleAddToSegment(contact, s)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="truncate">{s.name}</span>
                                          {(s.type || typeof s.memberCount === 'number') && (
                                            <span className="text-[10px] text-muted-foreground truncate">
                                              {s.type || 'segment'}{typeof s.memberCount === 'number' ? ` · ${s.memberCount} members` : ''}
                                            </span>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(contact)}><Edit className="size-3 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteTarget(contact); setDeleteDialogOpen(true); }}><Trash2 className="size-3 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination + page-size selector — always visible so the user can
          switch between 20 / 50 / 100 / All per page regardless of result
          count. Sits directly below the loaded data. */}
      {pagination && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            {pagination.total === 0
              ? 'No contacts'
              : pageSize === 'all'
                ? `Showing all ${pagination.total} contact${pagination.total === 1 ? '' : 's'}`
                : `Showing ${Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
              <Select
                value={pageSize === 'all' ? 'all' : String(pageSize)}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <SelectItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pageSize !== 'all' && pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Contact Dialog ────────────────────────────────────── */}
      <Dialog open={addDialogOpen || editDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            <DialogDescription>
              {editingContact ? 'Update contact information, tags, and groups.' : 'Create a new contact with full details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1 555-0100" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Company</Label>
                <Input placeholder="Company name" value={formCompany} onChange={e => setFormCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="City" value={formCity} onChange={e => setFormCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State / Province</Label>
                <Input placeholder="State" value={formState} onChange={e => setFormState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input placeholder="Country" value={formCountry} onChange={e => setFormCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ZIP / Postal Code</Label>
                <Input placeholder="ZIP" value={formZip} onChange={e => setFormZip(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Tags multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags</Label>
                <span className="text-xs text-muted-foreground">{formTagIds.length} selected</span>
              </div>
              {availableTags.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tags yet — create one below.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-md border bg-slate-50/50 dark:bg-slate-900/30">
                  {availableTags.map(tag => {
                    const selected = formTagIds.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={selected ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer text-xs h-6 transition-colors',
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                        )}
                        style={!selected ? tagBadgeStyle(tag.color) : undefined}
                        onClick={() => {
                          setFormTagIds(prev =>
                            prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                          );
                        }}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTagInline(); } }}
                />
                <Button size="sm" variant="outline" onClick={handleCreateTagInline} disabled={!newTagName.trim() || creatingTag}>
                  {creatingTag ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3 mr-1" />}
                  Add
                </Button>
              </div>
            </div>

            {/* Groups multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Groups</Label>
                <span className="text-xs text-muted-foreground">{formGroupIds.length} selected</span>
              </div>
              {availableGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No groups yet — create one below.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-md border bg-slate-50/50 dark:bg-slate-900/30">
                  {availableGroups.map(group => {
                    const selected = formGroupIds.includes(group.id);
                    return (
                      <Badge
                        key={group.id}
                        variant={selected ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer text-xs h-6 transition-colors',
                          selected
                            ? 'bg-slate-700 text-white border-slate-700 hover:bg-slate-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        )}
                        style={!selected ? groupBadgeStyle(group.color) : undefined}
                        onClick={() => {
                          setFormGroupIds(prev =>
                            prev.includes(group.id) ? prev.filter(g => g !== group.id) : [...prev, group.id]
                          );
                        }}
                      >
                        <UsersIcon className="size-2.5 mr-0.5" />
                        {group.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="New group name..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGroupInline(); } }}
                />
                <Button size="sm" variant="outline" onClick={handleCreateGroupInline} disabled={!newGroupName.trim() || creatingGroup}>
                  {creatingGroup ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3 mr-1" />}
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Delete Confirmation ───────────────────────────────────── */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected contacts? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkActionRunning}>
              {bulkActionRunning && <Loader2 className="size-4 mr-1 animate-spin" />}
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Action Dialog (add to group / apply tag / etc) ─────────── */}
      <Dialog open={!!bulkActionDialog} onOpenChange={(open) => { if (!open) { setBulkActionDialog(null); setBulkActionTargetId(''); } }}>
        <DialogContent className="sm:max-w-md">
          {bulkActionDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{bulkActionDialog.title}</DialogTitle>
                <DialogDescription>{bulkActionDialog.description}</DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-3">
                {(bulkActionDialog.action === 'addToGroup' || bulkActionDialog.action === 'removeFromGroup') && (
                  <div className="space-y-2">
                    <Label>Select Group</Label>
                    {availableGroups.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No groups available. Create one first.</p>
                    ) : (
                      <Select value={bulkActionTargetId} onValueChange={setBulkActionTargetId}>
                        <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                        <SelectContent>
                          {availableGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                {(bulkActionDialog.action === 'applyTag' || bulkActionDialog.action === 'removeTag') && (
                  <div className="space-y-2">
                    <Label>Select Tag</Label>
                    {availableTags.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No tags available. Create one first.</p>
                    ) : (
                      <Select value={bulkActionTargetId} onValueChange={setBulkActionTargetId}>
                        <SelectTrigger><SelectValue placeholder="Choose a tag..." /></SelectTrigger>
                        <SelectContent>
                          {availableTags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                {bulkActionDialog.action === 'updateStatus' && (
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select value={bulkActionStatusValue} onValueChange={setBulkActionStatusValue}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkActionDialog(null); setBulkActionTargetId(''); }}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleBulkActionConfirm}
                  disabled={bulkActionRunning || (
                    (bulkActionDialog.action === 'addToGroup' || bulkActionDialog.action === 'removeFromGroup' ||
                     bulkActionDialog.action === 'applyTag' || bulkActionDialog.action === 'removeTag') && !bulkActionTargetId
                  )}
                >
                  {bulkActionRunning && <Loader2 className="size-4 mr-1 animate-spin" />}
                  Apply
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Import Dialog ───────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>Import contacts from CSV or XLSX files</DialogDescription>
          </DialogHeader>

          {!importStats ? (
            <div className="space-y-4 py-4 flex-1 overflow-y-auto min-h-0">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">{importFile ? importFile.name : 'Click to select a file'}</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .xls files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {importPreview.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Field Mapping</h4>
                    <p className="text-xs text-muted-foreground mb-3">Map file columns to contact fields</p>
                    <div className="grid grid-cols-2 gap-2">
                      {importHeaders.map(header => (
                        <div key={header} className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1" title={header}>{header}</span>
                          <ChevronDown className="size-3 text-muted-foreground" />
                          <Select
                            value={fieldMapping[header] || '_skip'}
                            onValueChange={v => setFieldMapping(prev => ({ ...prev, [header]: v }))}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_skip">Skip</SelectItem>
                              {CONTACT_FIELDS.map(f => (
                                <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Preview ({importPreview.length} rows shown)</h4>
                    <div className="max-h-48 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {importHeaders.map(h => <TableHead key={h} className="text-[10px]">{h}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.map((row, i) => (
                            <TableRow key={i}>
                              {importHeaders.map(h => (
                                <TableCell key={h} className="text-xs py-1">{row[h] || '-'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-4 flex-1 overflow-y-auto min-h-0">
              <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{importStats.imported}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{importStats.duplicates}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{importStats.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total rows: {importStats.total}</p>
            </div>
          )}

          <DialogFooter>
            {!importStats ? (
              <>
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); }}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleImport}
                  disabled={importing || importPreview.length === 0}
                >
                  {importing ? <><Loader2 className="size-4 mr-1 animate-spin" /> Importing...</> : <><Upload className="size-4 mr-1" /> Import</>}
                </Button>
              </>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setImportStats(null); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportDialogOpen(false); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Export Dialog ───────────────────────────────────────────────── */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Contacts</DialogTitle>
            <DialogDescription>
              Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : hasActiveFilters ? 'filtered' : 'all'} contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedIds.size === 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  No contacts selected — exporting all contacts matching the current filters.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExport}><Download className="size-4 mr-1" /> Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
