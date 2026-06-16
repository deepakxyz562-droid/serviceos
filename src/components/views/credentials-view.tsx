'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  KeyRound,
  Database,
  Globe,
  Shield,
  Cloud,
  MoreVertical,
  Trash2,
  Pencil,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Lock,
  MessageSquare,
  Save,
  Loader2,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getCreateFields,
  getFieldLabel,
  isSensitiveField,
  maskValue,
} from '@/lib/credential-fields';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CredentialItem {
  id: string;
  name: string;
  type: string;
  serviceName: string;
  data: Record<string, string>;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * Normalize an API-returned credential record into the shape the UI expects.
 *
 * The backend stores everything (including an optional `_serviceName`
 * metadata field) inside `encryptedData`. The API returns `data` already
 * masked/decrypted; we just split `_serviceName` back out so the rest of
 * the UI can treat `data` as pure credential fields.
 */
function normalizeCredential(c: any): CredentialItem {
  const data: Record<string, string> = {};
  let serviceName = '';
  for (const [k, v] of Object.entries(c.data || {})) {
    if (k === '_serviceName') {
      serviceName = String(v ?? '');
    } else {
      data[k] = v == null ? '' : String(v);
    }
  }
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    serviceName: serviceName || 'Custom',
    data,
    lastUsedAt: c.lastUsedAt ?? null,
    expiresAt: c.expiresAt ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isActive: c.isActive ?? true,
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp Business API', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  apiKey: { icon: KeyRound, label: 'API Key', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  httpBasic: { icon: Shield, label: 'Basic Auth', color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200' },
  httpBearer: { icon: KeyRound, label: 'Bearer Token', color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-200' },
  oAuth2: { icon: Globe, label: 'OAuth 2.0', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  dbConnection: { icon: Database, label: 'Database', color: 'text-violet-600', bgColor: 'bg-violet-50 border-violet-200' },
  sshKey: { icon: Shield, label: 'SSH Key', color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200' },
  awsIam: { icon: Cloud, label: 'AWS IAM', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  googleServiceAccount: { icon: Globe, label: 'Google SA', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CredentialsView() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCred, setSelectedCred] = useState<CredentialItem | null>(null);
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [isDetailEditMode, setIsDetailEditMode] = useState(false);

  // Create form
  const [newCredName, setNewCredName] = useState('');
  const [newCredType, setNewCredType] = useState('whatsapp');
  const [newCredService, setNewCredService] = useState('');
  const [newCredFields, setNewCredFields] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [testingCreate, setTestingCreate] = useState(false);

  // Edit form state (used in detail dialog edit mode)
  const [editCredId, setEditCredId] = useState<string | null>(null);
  const [editCredName, setEditCredName] = useState('');
  const [editCredType, setEditCredType] = useState('');
  const [editCredService, setEditCredService] = useState('');
  const [editCredFields, setEditCredFields] = useState<Record<string, string>>({});
  const [editRevealedFields, setEditRevealedFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testingEdit, setTestingEdit] = useState(false);

  // ─── Fetch credentials on mount ─────────────────────────────────────────
  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credentials');
      if (!res.ok) throw new Error(`Failed to load credentials (${res.status})`);
      const json = await res.json();
      const list: CredentialItem[] = (json.credentials || []).map(normalizeCredential);
      setCredentials(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load credentials';
      toast.error(msg);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Stats
  const stats = {
    total: credentials.length,
    active: credentials.filter(c => c.isActive).length,
    expired: credentials.filter(c => isExpired(c.expiresAt)).length,
    types: new Set(credentials.map(c => c.type)).size,
  };

  const filtered = credentials.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.serviceName.toLowerCase().includes(search.toLowerCase()) &&
        !c.type.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    return true;
  });

  const toggleReveal = (credId: string, fieldKey: string) => {
    const key = `${credId}-${fieldKey}`;
    setRevealedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEditReveal = (fieldKey: string) => {
    setEditRevealedFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const isRevealed = (credId: string, fieldKey: string) => {
    return revealedFields[`${credId}-${fieldKey}`] || false;
  };

  const isEditRevealed = (fieldKey: string) => {
    return editRevealedFields[fieldKey] || false;
  };

  const resetCreateForm = () => {
    setNewCredName('');
    setNewCredType('whatsapp');
    setNewCredService('');
    setNewCredFields({});
  };

  const handleCreate = async () => {
    if (!newCredName.trim()) { toast.error('Credential name is required'); return; }
    setCreating(true);
    try {
      const data: Record<string, string> = { ...newCredFields };
      if (newCredService.trim()) data._serviceName = newCredService.trim();
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCredName.trim(), type: newCredType, data }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to create credential (${res.status})`);
      }
      const created = normalizeCredential(await res.json());
      setCredentials(prev => [created, ...prev]);
      setDialogOpen(false);
      resetCreateForm();
      toast.success('Credential created');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create credential';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleTestCreate = async () => {
    if (testingCreate) return;
    setTestingCreate(true);
    try {
      const res = await fetch('/api/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCredName.trim(),
          type: newCredType,
          data: { ...newCredFields },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.success) {
        toast.success(j.message || 'Credential test passed', { description: j.details ? JSON.stringify(j.details).slice(0, 200) : undefined });
      } else {
        toast.error(j.message || 'Credential test failed', { description: j.details ? JSON.stringify(j.details).slice(0, 200) : undefined });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credential test failed';
      toast.error(msg);
    } finally {
      setTestingCreate(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to delete credential (${res.status})`);
      }
      setCredentials(prev => prev.filter(c => c.id !== id));
      // If the deleted credential was open in the detail dialog, close it.
      if (selectedCred?.id === id) {
        setDetailDialogOpen(false);
        setSelectedCred(null);
        setIsDetailEditMode(false);
      }
      toast.success('Credential deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete credential';
      toast.error(msg);
    }
  };

  const openEdit = (cred: CredentialItem) => {
    setEditCredId(cred.id);
    setEditCredName(cred.name);
    setEditCredType(cred.type);
    setEditCredService(cred.serviceName === 'Custom' ? '' : cred.serviceName);
    // Pre-fill non-sensitive fields with their real values from the server.
    // For sensitive fields, leave empty so the user can type a new value
    // (or leave blank to keep the existing value — handled by the PUT route).
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(cred.data)) {
      fields[key] = isSensitiveField(key) ? '' : value;
    }
    setEditCredFields(fields);
    setEditRevealedFields({});
  };

  const handleEditSave = async () => {
    if (!editCredName.trim()) { toast.error('Credential name is required'); return; }
    if (!editCredId) return;
    setSaving(true);
    try {
      const data: Record<string, string> = { ...editCredFields };
      if (editCredService.trim()) data._serviceName = editCredService.trim();
      const res = await fetch(`/api/credentials/${editCredId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCredName.trim(), data }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to update credential (${res.status})`);
      }
      const updated = normalizeCredential(await res.json());
      setCredentials(prev => prev.map(c => (c.id === editCredId ? updated : c)));
      setSelectedCred(updated);
      setSaving(false);
      setIsDetailEditMode(false);
      setEditCredId(null);
      toast.success('Credential updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update credential';
      toast.error(msg);
      setSaving(false);
    }
  };

  const handleTestEdit = async () => {
    if (testingEdit || !editCredId) return;
    // We can't test from the edit dialog directly because the API only
    // returns masked sensitive values. If the user just typed new sensitive
    // values, we test those; otherwise we tell them to use the test button
    // from the create flow.
    const hasNewSensitive = Object.entries(editCredFields).some(
      ([k, v]) => isSensitiveField(k) && v.trim() !== '' && !v.startsWith('••••')
    );
    if (!hasNewSensitive) {
      toast.message('Enter a new sensitive value to test, or test from the create dialog.', {
        description: 'Saved secrets cannot be re-tested from the edit form.',
      });
      return;
    }
    setTestingEdit(true);
    try {
      const res = await fetch('/api/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCredName.trim(),
          type: editCredType,
          data: { ...editCredFields },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.success) {
        toast.success(j.message || 'Credential test passed', { description: j.details ? JSON.stringify(j.details).slice(0, 200) : undefined });
      } else {
        toast.error(j.message || 'Credential test failed', { description: j.details ? JSON.stringify(j.details).slice(0, 200) : undefined });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credential test failed';
      toast.error(msg);
    } finally {
      setTestingEdit(false);
    }
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  const openDetail = (cred: CredentialItem) => {
    setSelectedCred(cred);
    setDetailDialogOpen(true);
  };

  // Dynamic fields for create dialog based on type — uses the shared helper
  // from `@/lib/credential-fields`. Re-derived on each render from
  // `newCredType`, so the create dialog re-renders when the user picks a
  // different credential type.
  const createFields = getCreateFields(newCredType);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Lock className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Credentials</h2>
            <p className="text-sm text-muted-foreground">Manage API keys, tokens, and connection secrets</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setNewCredType('whatsapp'); setDialogOpen(true); }}>
          <Plus className="size-4 mr-1.5" /> New Credential
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: Lock, color: 'text-foreground' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Expired', value: stats.expired, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Types', value: stats.types, icon: KeyRound, color: 'text-blue-600' },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
            <TabsTrigger value="apiKey" className="text-xs">API Key</TabsTrigger>
            <TabsTrigger value="oAuth2" className="text-xs">OAuth</TabsTrigger>
            <TabsTrigger value="httpBasic" className="text-xs">Basic Auth</TabsTrigger>
            <TabsTrigger value="dbConnection" className="text-xs">Database</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search credentials..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {/* Credential Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <KeyRound className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No credentials found</h3>
          <p className="text-muted-foreground mb-4">{search ? 'Try adjusting your search' : 'Add a credential to connect to external services'}</p>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> New Credential
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cred) => {
            const config = typeConfig[cred.type] || typeConfig.apiKey;
            const Icon = config.icon;
            const expired = isExpired(cred.expiresAt);
            return (
              <Card key={cred.id} className={cn('hover:shadow-md transition-all cursor-pointer', expired && 'opacity-70')} onClick={() => openDetail(cred)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('flex items-center justify-center size-9 rounded-lg shrink-0 border', config.bgColor)}>
                        <Icon className={`size-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{cred.name}</h3>
                        <p className="text-xs text-muted-foreground">{cred.serviceName}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCred(cred); setDetailDialogOpen(true); setIsDetailEditMode(false); }}>
                          <Eye className="size-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCred(cred); openEdit(cred); setIsDetailEditMode(true); setDetailDialogOpen(true); }}>
                          <Pencil className="size-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(cred.id); }}>
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px]', config.bgColor, config.color)}>
                      {config.label}
                    </Badge>
                    {expired ? (
                      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                        <AlertTriangle className="size-3 mr-1" />Expired
                      </Badge>
                    ) : cred.isActive ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                        <CheckCircle2 className="size-3 mr-1" />Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">Inactive</Badge>
                    )}
                  </div>

                  {/* Masked fields preview */}
                  <div className="space-y-1.5">
                    {Object.entries(cred.data).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-24 truncate">{getFieldLabel(key)}:</span>
                        <code className="flex-1 bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono truncate">
                          {isRevealed(cred.id, key) ? value : maskValue(String(value))}
                        </code>
                        <button className="shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); toggleReveal(cred.id, key); }}>
                          {isRevealed(cred.id, key) ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" />{cred.lastUsedAt ? formatRelative(cred.lastUsedAt) : 'Never used'}</span>
                    <span>{formatDate(cred.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Credential Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Credential</DialogTitle>
            <DialogDescription>Add a new credential for connecting to external services.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Credential Name *</Label>
              <Input placeholder="e.g., WhatsApp Business API" value={newCredName} onChange={e => setNewCredName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input placeholder="e.g., Meta / WhatsApp, Stripe, AWS" value={newCredService} onChange={e => setNewCredService(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newCredType} onValueChange={v => { setNewCredType(v); setNewCredFields({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {/* WhatsApp listed first for prominence */}
                  <SelectItem value="whatsapp">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-emerald-600" />
                      <span className="font-medium">WhatsApp Business API</span>
                    </span>
                  </SelectItem>
                  <Separator className="my-1" />
                  {Object.entries(typeConfig).filter(([key]) => key !== 'whatsapp').map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return <SelectItem key={key} value={key}><span className="flex items-center gap-2"><Icon className="size-3.5" />{cfg.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            {newCredType === 'whatsapp' && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <p className="font-medium mb-1">WhatsApp Business API Credentials</p>
                <p className="text-emerald-600">Find these in your Meta Business Settings → WhatsApp → API Setup</p>
              </div>
            )}
            {createFields.map(field => (
              <div key={field} className="space-y-2">
                <Label className="text-xs">{getFieldLabel(field)}</Label>
                {isSensitiveField(field) ? (
                  <div className="relative">
                    <Input 
                      type="password" 
                      placeholder={`Enter ${getFieldLabel(field).toLowerCase()}...`} 
                      value={newCredFields[field] || ''} 
                      onChange={e => setNewCredFields(prev => ({ ...prev, [field]: e.target.value }))} 
                      className="pr-9"
                    />
                  </div>
                ) : (
                  <Input 
                    placeholder={`Enter ${getFieldLabel(field).toLowerCase()}...`} 
                    value={newCredFields[field] || ''} 
                    onChange={e => setNewCredFields(prev => ({ ...prev, [field]: e.target.value }))} 
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTestCreate}
              disabled={testingCreate || !newCredName.trim()}
            >
              {testingCreate ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Testing...</>
              ) : (
                <><FlaskConical className="size-4 mr-1.5" /> Test</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={!newCredName.trim() || creating}
            >
              {creating ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="size-4 mr-1.5" /> Create</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credential Detail / Edit Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setIsDetailEditMode(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {isDetailEditMode && selectedCred ? (
            // ─── Edit Mode ───────────────────────────────────────────────────
            <>
              <DialogHeader>
                <DialogTitle>Edit Credential</DialogTitle>
                <DialogDescription>Update credential details and fields.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Credential Name *</Label>
                  <Input placeholder="Credential name" value={editCredName} onChange={e => setEditCredName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input placeholder="Service name" value={editCredService} onChange={e => setEditCredService(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = typeConfig[editCredType];
                      if (!cfg) return <Badge variant="outline">{editCredType}</Badge>;
                      const TypeIcon = cfg.icon;
                      return (
                        <Badge variant="outline" className={cn('py-1 px-3', cfg.bgColor, cfg.color)}>
                          <TypeIcon className="size-3.5 mr-1.5" /> {cfg.label}
                        </Badge>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">(cannot be changed)</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Credential Fields</h4>
                  {editCredType === 'whatsapp' && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 mb-3">
                      <p className="font-medium mb-1">WhatsApp Business API</p>
                      <p className="text-emerald-600">Update your WhatsApp API credentials from Meta Business Settings</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {Object.keys(editCredFields).map(field => {
                      const sensitive = isSensitiveField(field);
                      const revealed = isEditRevealed(field);
                      return (
                        <div key={field} className="space-y-1.5">
                          <Label className="text-xs">{getFieldLabel(field)}</Label>
                          <div className="relative">
                            <Input
                              type={sensitive && !revealed ? 'password' : 'text'}
                              placeholder={sensitive ? 'Enter new value to change, leave blank to keep existing' : `Enter ${getFieldLabel(field).toLowerCase()}...`}
                              value={editCredFields[field] || ''}
                              onChange={e => setEditCredFields(prev => ({ ...prev, [field]: e.target.value }))}
                              className={cn(sensitive && 'pr-9')}
                            />
                            {sensitive && (
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => toggleEditReveal(field)}
                              >
                                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestEdit}
                  disabled={testingEdit || !editCredName.trim()}
                >
                  {testingEdit ? (
                    <><Loader2 className="size-4 mr-1.5 animate-spin" /> Testing...</>
                  ) : (
                    <><FlaskConical className="size-4 mr-1.5" /> Test</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsDetailEditMode(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditSave} disabled={!editCredName.trim() || saving}>
                  {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><Save className="size-4 mr-1.5" /> Save Changes</>}
                </Button>
              </DialogFooter>
            </>
          ) : (
            // ─── View Mode ───────────────────────────────────────────────────
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCred?.name}
                  {selectedCred && isExpired(selectedCred.expiresAt) && (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                      <AlertTriangle className="size-3 mr-1" />Expired
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>{selectedCred?.serviceName}</DialogDescription>
              </DialogHeader>
              {selectedCred && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs', typeConfig[selectedCred.type]?.bgColor, typeConfig[selectedCred.type]?.color)}>
                      {typeConfig[selectedCred.type]?.label || selectedCred.type}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', selectedCred.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200')}>
                      {selectedCred.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <Separator />

                  {/* All fields with reveal toggle */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Credential Data</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedCred.data).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <span className="text-xs text-muted-foreground w-32 shrink-0">{getFieldLabel(key)}</span>
                          <code className={cn('flex-1 text-xs font-mono px-2 py-1 rounded bg-background', !isRevealed(selectedCred.id, key) && 'blur-sm select-none')}>
                            {String(value)}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => toggleReveal(selectedCred.id, key)}>
                            {isRevealed(selectedCred.id, key) ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleCopy(String(value))}>
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{formatDate(selectedCred.createdAt)}</span></div>
                    <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium">{formatDate(selectedCred.updatedAt)}</span></div>
                    <div><span className="text-muted-foreground">Last Used:</span> <span className="font-medium">{selectedCred.lastUsedAt ? formatRelative(selectedCred.lastUsedAt) : 'Never'}</span></div>
                    {selectedCred.expiresAt && (
                      <div><span className="text-muted-foreground">Expires:</span> <span className={cn('font-medium', isExpired(selectedCred.expiresAt) ? 'text-red-600' : '')}>{formatDate(selectedCred.expiresAt)}</span></div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(selectedCred); setIsDetailEditMode(true); }}>
                      <Pencil className="size-4 mr-1.5" /> Edit
                    </Button>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(selectedCred.id); }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="size-4 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
