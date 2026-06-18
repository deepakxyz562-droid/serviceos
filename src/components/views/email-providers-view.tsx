'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Plus, Loader2, RefreshCw, Star, Trash2, Pencil,
  Send, Server, ShieldCheck, CheckCircle2, XCircle, AlertCircle,
  Settings2, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProviderType = 'smtp' | 'resend' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'brevo';

interface EmailProvider {
  id: string;
  name: string;
  providerType: string;
  configJson: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  usageType: string;
  isDefaultTransactional: boolean;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
  status: string;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ProviderFormState {
  name: string;
  providerType: ProviderType;
  config: Record<string, string | boolean>;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  usageType: 'transactional' | 'marketing' | 'both';
  isDefaultTransactional: boolean;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
}

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerUsed?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROVIDER_TYPES: { value: ProviderType; label: string; description: string }[] = [
  { value: 'smtp', label: 'SMTP', description: 'Any SMTP server (AWS SES via SMTP, Postfix, Gmail, etc.)' },
  { value: 'resend', label: 'Resend', description: 'Modern developer email API' },
  { value: 'sendgrid', label: 'SendGrid', description: 'Twilio SendGrid email API' },
  { value: 'ses', label: 'AWS SES', description: 'Amazon Simple Email Service (SMTP)' },
  { value: 'mailgun', label: 'Mailgun', description: 'Mailgun by Sinch email API' },
  { value: 'postmark', label: 'Postmark', description: 'Postmark transactional email' },
  { value: 'brevo', label: 'Brevo', description: 'Brevo (formerly Sendinblue)' },
];

const PROVIDER_BADGE_COLORS: Record<string, string> = {
  smtp: 'bg-slate-100 text-slate-700 border-slate-200',
  resend: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sendgrid: 'bg-teal-100 text-teal-700 border-teal-200',
  ses: 'bg-amber-100 text-amber-700 border-amber-200',
  mailgun: 'bg-rose-100 text-rose-700 border-rose-200',
  postmark: 'bg-orange-100 text-orange-700 border-orange-200',
  brevo: 'bg-violet-100 text-violet-700 border-violet-200',
};

const DEFAULT_CONFIGS: Record<ProviderType, Record<string, string | boolean>> = {
  smtp: { smtpHost: '', smtpPort: '587', smtpSecure: false, smtpUser: '', smtpPass: '' },
  resend: { apiKey: '' },
  sendgrid: { apiKey: '' },
  ses: { smtpHost: 'email-smtp.us-east-1.amazonaws.com', smtpPort: '587', smtpUser: '', smtpPass: '' },
  mailgun: { apiKey: '', domain: '', region: 'US' },
  postmark: { serverToken: '' },
  brevo: { apiKey: '', smtpUser: '' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseConfig(raw: string): Record<string, string | boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string | boolean>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function maskSecret(value: string): string {
  if (!value || typeof value !== 'string') return '';
  if (value.length <= 4) return '••••';
  return value.slice(0, 2) + '••••' + value.slice(-2);
}

// Returns true if the config value appears to be masked by the backend.
function isMaskedString(value: string | boolean | undefined): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return 'Never';
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
  } catch {
    return 'Never';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailProvidersView() {
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailProvider | null>(null);
  const [testTarget, setTestTarget] = useState<EmailProvider | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<ProviderFormState>(emptyForm('smtp'));

  // Test dialog state
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  function emptyForm(providerType: ProviderType): ProviderFormState {
    return {
      name: '',
      providerType,
      config: { ...DEFAULT_CONFIGS[providerType] },
      fromName: '',
      fromEmail: '',
      replyTo: '',
      usageType: 'both',
      isDefaultTransactional: false,
      isDefaultMarketing: false,
      isPlatform: false,
    };
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email-providers');
      if (!res.ok) throw new Error('Failed to load providers');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setProviders(list as EmailProvider[]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load email providers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => ({
    total: providers.length,
    defaultTransactional: providers.filter((p) => p.isDefaultTransactional).length,
    defaultMarketing: providers.filter((p) => p.isDefaultMarketing).length,
    active: providers.filter((p) => p.status === 'active').length,
  }), [providers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm('smtp'));
    setFormOpen(true);
  };

  const openEdit = (provider: EmailProvider) => {
    const parsed = safeParseConfig(provider.configJson);
    setEditing(provider);
    setForm({
      name: provider.name,
      providerType: provider.providerType as ProviderType,
      config: { ...DEFAULT_CONFIGS[provider.providerType as ProviderType], ...parsed },
      fromName: provider.fromName,
      fromEmail: provider.fromEmail,
      replyTo: provider.replyTo || '',
      usageType: provider.usageType as ProviderFormState['usageType'],
      isDefaultTransactional: provider.isDefaultTransactional,
      isDefaultMarketing: provider.isDefaultMarketing,
      isPlatform: provider.isPlatform,
    });
    setFormOpen(true);
  };

  const handleProviderTypeChange = (newType: ProviderType) => {
    // Preserve overlapping fields when switching types
    const preserved: Record<string, string | boolean> = {};
    const newDefaults = DEFAULT_CONFIGS[newType];
    Object.keys(form.config).forEach((key) => {
      if (key in newDefaults && !isMaskedString(form.config[key])) {
        preserved[key] = form.config[key];
      }
    });
    setForm((f) => ({
      ...f,
      providerType: newType,
      config: { ...newDefaults, ...preserved },
    }));
  };

  const setConfigField = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.fromName.trim()) { toast.error('From name is required'); return; }
    if (!form.fromEmail.trim()) { toast.error('From email is required'); return; }

    // Build config payload — drop masked/placeholder values so backend keeps existing secrets
    const cleanConfig: Record<string, string | boolean> = {};
    Object.entries(form.config).forEach(([k, v]) => {
      if (typeof v === 'boolean') {
        cleanConfig[k] = v;
      } else if (typeof v === 'string' && v.length > 0 && !isMaskedString(v)) {
        cleanConfig[k] = v;
      }
    });

    const payload = {
      name: form.name.trim(),
      providerType: form.providerType,
      configJson: JSON.stringify(cleanConfig),
      fromName: form.fromName.trim(),
      fromEmail: form.fromEmail.trim(),
      replyTo: form.replyTo.trim() || null,
      usageType: form.usageType,
      isDefaultTransactional: form.isDefaultTransactional,
      isDefaultMarketing: form.isDefaultMarketing,
      isPlatform: form.isPlatform,
    };

    setIsSaving(true);
    try {
      const url = editing
        ? `/api/email-providers/${editing.id}`
        : '/api/email-providers';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editing ? 'update' : 'create'} provider`);
      }
      toast.success(editing ? 'Provider updated' : 'Provider created');
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/email-providers/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete provider');
      }
      toast.success('Provider deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSetDefault = async (provider: EmailProvider, usageType: 'transactional' | 'marketing') => {
    try {
      const res = await fetch('/api/email-providers/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: provider.id, usageType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set default');
      }
      toast.success(`Default ${usageType} provider updated`);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Set default failed');
    }
  };

  const openTest = (provider: EmailProvider) => {
    setTestTarget(provider);
    setTestEmail('');
    setTestResult(null);
  };

  const handleSendTest = async () => {
    if (!testTarget) return;
    if (!testEmail.trim() || !/^\S+@\S+\.\S+$/.test(testEmail.trim())) {
      toast.error('Please enter a valid recipient email');
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/email-providers/${testTarget.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const data: TestResult = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success('Test email sent');
      } else {
        toast.error(data.error || 'Test failed');
      }
      load();
    } catch (err) {
      console.error(err);
      toast.error('Network error sending test');
      setTestResult({ success: false, error: 'Network error' });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Mail className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Email Providers</h2>
            <p className="text-sm text-muted-foreground">
              Manage SMTP, Resend, SendGrid, SES, Mailgun, Postmark, Brevo providers for transactional & marketing email
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className={cn('size-4 mr-1.5', isLoading && 'animate-spin')} /> Refresh
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4 mr-1.5" /> New Provider
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Providers</span>
            <Server className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Default Transactional</span>
            <Star className="size-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.defaultTransactional}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Default Marketing</span>
            <Star className="size-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.defaultMarketing}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.active}</div>
        </Card>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/2 mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && providers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <Mail className="size-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No email providers yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Add an SMTP, Resend, SendGrid, SES, Mailgun, Postmark, or Brevo provider to start sending transactional and marketing emails.
            </p>
            <Button onClick={openNew}>
              <Plus className="size-4 mr-1.5" /> Add Your First Provider
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Provider cards */}
      {!isLoading && providers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isLast={providers.length === 1}
              onEdit={() => openEdit(provider)}
              onTest={() => openTest(provider)}
              onDelete={() => setDeleteTarget(provider)}
              onSetDefault={(usageType) => handleSetDefault(provider, usageType)}
            />
          ))}
        </div>
      )}

      {/* New/Edit Provider Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Provider' : 'New Email Provider'}</DialogTitle>
            <DialogDescription>
              Configure a transactional or marketing email provider. Sensitive fields (passwords, API keys) are encrypted at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Provider Name <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g. Production SES"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select value={form.providerType} onValueChange={(v) => handleProviderTypeChange(v as ProviderType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        <div className="flex flex-col">
                          <span>{pt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{pt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic config */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings2 className="size-4 text-emerald-600" />
                Configuration — {PROVIDER_TYPES.find((p) => p.value === form.providerType)?.label}
              </div>
              <ConfigFields
                providerType={form.providerType}
                config={form.config}
                onChange={setConfigField}
              />
            </div>

            {/* From */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Name <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="ServiceOS"
                  value={form.fromName}
                  onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>From Email <span className="text-rose-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="noreply@example.com"
                  value={form.fromEmail}
                  onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reply-To (optional)</Label>
              <Input
                type="email"
                placeholder="support@example.com"
                value={form.replyTo}
                onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))}
              />
            </div>

            {/* Usage */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Usage Type</Label>
                <Select
                  value={form.usageType}
                  onValueChange={(v) => setForm((f) => ({ ...f, usageType: v as ProviderFormState['usageType'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status / Tier</Label>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Platform provider</div>
                    <div className="text-xs text-muted-foreground">You pay (vs customer's own provider)</div>
                  </div>
                  <Switch
                    checked={form.isPlatform}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isPlatform: v }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="size-3.5 text-teal-600" /> Default Transactional
                  </div>
                  <div className="text-xs text-muted-foreground">Use for receipts, alerts, etc.</div>
                </div>
                <Switch
                  checked={form.isDefaultTransactional}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isDefaultTransactional: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="size-3.5 text-amber-600" /> Default Marketing
                  </div>
                  <div className="text-xs text-muted-foreground">Use for campaigns & broadcasts</div>
                </div>
                <Switch
                  checked={form.isDefaultMarketing}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isDefaultMarketing: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.fromName.trim() || !form.fromEmail.trim()}>
              {isSaving ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</>
              ) : (
                <><ShieldCheck className="size-4 mr-1.5" /> {editing ? 'Update Provider' : 'Create Provider'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={!!testTarget} onOpenChange={(open) => { if (!open) setTestTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email from <strong>{testTarget?.name}</strong> ({testTarget?.providerType?.toUpperCase()}) to verify the connection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            {testResult && (
              <div className={cn(
                'rounded-md border p-3 text-sm',
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
              )}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium">
                      {testResult.success ? 'Test email sent successfully' : 'Test failed'}
                    </div>
                    {testResult.messageId && (
                      <div className="font-mono text-xs break-all">ID: {testResult.messageId}</div>
                    )}
                    {testResult.providerUsed && (
                      <div className="text-xs">Provider: {testResult.providerUsed}</div>
                    )}
                    {testResult.error && (
                      <div className="text-xs break-words">{testResult.error}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestTarget(null)}>Close</Button>
            <Button onClick={handleSendTest} disabled={testSending || !testEmail.trim()}>
              {testSending ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="size-4 mr-1.5" /> Send Test</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. Any workflows or campaigns using it will need to be reconfigured.
              {providers.length <= 1 && (
                <span className="block mt-2 text-rose-600 font-medium">
                  You cannot delete the last remaining email provider.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={providers.length <= 1}
              className={cn(providers.length <= 1 && 'opacity-50 cursor-not-allowed')}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Provider Card ─────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: EmailProvider;
  isLast: boolean;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
  onSetDefault: (usageType: 'transactional' | 'marketing') => void;
}

function ProviderCard({ provider, isLast, onEdit, onTest, onDelete, onSetDefault }: ProviderCardProps) {
  const badgeColor = PROVIDER_BADGE_COLORS[provider.providerType] || 'bg-slate-100 text-slate-700 border-slate-200';

  const usageBadges: { label: string; color: string }[] = [];
  if (provider.usageType === 'transactional' || provider.usageType === 'both') {
    usageBadges.push({ label: 'Transactional', color: 'bg-teal-100 text-teal-700 border-teal-200' });
  }
  if (provider.usageType === 'marketing' || provider.usageType === 'both') {
    usageBadges.push({ label: 'Marketing', color: 'bg-amber-100 text-amber-700 border-amber-200' });
  }

  const statusColor =
    provider.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : provider.status === 'paused' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-rose-100 text-rose-700 border-rose-200';

  const testStatus = !provider.lastTestStatus
    ? { label: 'Never tested', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: AlertCircle }
    : provider.lastTestStatus === 'success'
    ? { label: 'Test OK', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
    : { label: 'Test failed', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle };

  const TestStatusIcon = testStatus.icon;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2 truncate">
              <span className="truncate">{provider.name}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className={cn('uppercase text-[10px] font-semibold', badgeColor)}>
                {provider.providerType}
              </Badge>
              {provider.isPlatform && (
                <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200 text-[10px]">
                  <Zap className="size-2.5 mr-1" /> Platform
                </Badge>
              )}
              <Badge variant="outline" className={cn('text-[10px]', statusColor)}>
                {provider.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* From */}
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">From</div>
          <div className="font-medium truncate">
            {provider.fromName}{' '}
            <span className="text-muted-foreground font-normal">&lt;{provider.fromEmail}&gt;</span>
          </div>
          {provider.replyTo && (
            <div className="text-xs text-muted-foreground mt-0.5">Reply-To: {provider.replyTo}</div>
          )}
        </div>

        {/* Usage + defaults */}
        <div className="flex flex-wrap items-center gap-1.5">
          {usageBadges.map((b) => (
            <Badge key={b.label} variant="outline" className={cn('text-[10px]', b.color)}>
              {b.label}
            </Badge>
          ))}
          {provider.isDefaultTransactional && (
            <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal-200 text-[10px]">
              <Star className="size-2.5 mr-1 fill-teal-600" /> Default Tx
            </Badge>
          )}
          {provider.isDefaultMarketing && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
              <Star className="size-2.5 mr-1 fill-amber-600" /> Default Mkt
            </Badge>
          )}
        </div>

        {/* Test status */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className={cn('text-[10px]', testStatus.color)}>
            <TestStatusIcon className="size-2.5 mr-1" />
            {testStatus.label}
          </Badge>
          {provider.lastTestAt && (
            <span className="text-muted-foreground">{formatRelative(provider.lastTestAt)}</span>
          )}
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sent</div>
            <div className="text-sm font-semibold">{provider.totalSent}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Delivered</div>
            <div className="text-sm font-semibold text-emerald-600">{provider.totalDelivered}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Failed</div>
            <div className="text-sm font-semibold text-rose-600">{provider.totalFailed}</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground text-center">
          Last used: {formatRelative(provider.lastUsedAt)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={onEdit}>
            <Pencil className="size-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={onTest}>
            <Send className="size-3 mr-1" /> Test
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2" aria-label="More actions">
                <Star className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Set as default</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onSetDefault('transactional')}
                disabled={provider.isDefaultTransactional}
              >
                <Star className="size-3.5 mr-2 text-teal-600" />
                {provider.isDefaultTransactional ? 'Already transactional default' : 'Transactional default'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSetDefault('marketing')}
                disabled={provider.isDefaultMarketing}
              >
                <Star className="size-3.5 mr-2 text-amber-600" />
                {provider.isDefaultMarketing ? 'Already marketing default' : 'Marketing default'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={onDelete}
            disabled={isLast}
            title={isLast ? 'Cannot delete the last provider' : 'Delete'}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Config Fields (dynamic per providerType) ──────────────────────────────

interface ConfigFieldsProps {
  providerType: ProviderType;
  config: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
}

function ConfigFields({ providerType, config, onChange }: ConfigFieldsProps) {
  const get = (key: string): string => (typeof config[key] === 'string' ? (config[key] as string) : '');
  const getBool = (key: string): boolean => config[key] === true;

  if (providerType === 'smtp') {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Host</Label>
            <Input value={get('smtpHost')} onChange={(e) => onChange('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Port</Label>
            <Input value={get('smtpPort')} onChange={(e) => onChange('smtpPort', e.target.value)} placeholder="587" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-2.5">
          <div>
            <div className="text-xs font-medium">Use TLS / Secure</div>
            <div className="text-[10px] text-muted-foreground">Enable for port 465 (implicit TLS)</div>
          </div>
          <Switch checked={getBool('smtpSecure')} onCheckedChange={(v) => onChange('smtpSecure', v)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Username</Label>
            <Input value={get('smtpUser')} onChange={(e) => onChange('smtpUser', e.target.value)} placeholder="apikey" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Password</Label>
            <Input type="password" value={get('smtpPass')} onChange={(e) => onChange('smtpPass', e.target.value)} placeholder="••••••••" />
          </div>
        </div>
      </div>
    );
  }

  if (providerType === 'ses') {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">SES SMTP Host</Label>
            <Input value={get('smtpHost')} onChange={(e) => onChange('smtpHost', e.target.value)} placeholder="email-smtp.us-east-1.amazonaws.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Port</Label>
            <Input value={get('smtpPort')} onChange={(e) => onChange('smtpPort', e.target.value)} placeholder="587" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Username (IAM SMTP creds)</Label>
            <Input value={get('smtpUser')} onChange={(e) => onChange('smtpUser', e.target.value)} placeholder="AKIA..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SMTP Password</Label>
            <Input type="password" value={get('smtpPass')} onChange={(e) => onChange('smtpPass', e.target.value)} placeholder="••••••••" />
          </div>
        </div>
      </div>
    );
  }

  if (providerType === 'resend' || providerType === 'sendgrid') {
    const label = providerType === 'resend' ? 'Resend API Key' : 'SendGrid API Key';
    return (
      <div className="space-y-2">
        <Label className="text-xs">{label}</Label>
        <Input type="password" value={get('apiKey')} onChange={(e) => onChange('apiKey', e.target.value)} placeholder="re_... / SG...." />
        <p className="text-[10px] text-muted-foreground">Find this in your {providerType === 'resend' ? 'Resend dashboard' : 'SendGrid account'} under API Keys.</p>
      </div>
    );
  }

  if (providerType === 'mailgun') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Mailgun API Key</Label>
          <Input type="password" value={get('apiKey')} onChange={(e) => onChange('apiKey', e.target.value)} placeholder="key-..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sending Domain</Label>
          <Input value={get('domain')} onChange={(e) => onChange('domain', e.target.value)} placeholder="mg.example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Region</Label>
          <Select value={get('region') || 'US'} onValueChange={(v) => onChange('region', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="US">US (api.mailgun.net)</SelectItem>
              <SelectItem value="EU">EU (api.eu.mailgun.net)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (providerType === 'postmark') {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Postmark Server Token</Label>
        <Input type="password" value={get('serverToken')} onChange={(e) => onChange('serverToken', e.target.value)} placeholder="..." />
        <p className="text-[10px] text-muted-foreground">Find under Server → API Tokens → Server Token.</p>
      </div>
    );
  }

  if (providerType === 'brevo') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Brevo API Key</Label>
          <Input type="password" value={get('apiKey')} onChange={(e) => onChange('apiKey', e.target.value)} placeholder="xkeysib-..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SMTP Username (optional)</Label>
          <Input value={get('smtpUser')} onChange={(e) => onChange('smtpUser', e.target.value)} placeholder="defaults to API key" />
          <p className="text-[10px] text-muted-foreground">Brevo also exposes SMTP credentials; leave blank to use the API key.</p>
        </div>
      </div>
    );
  }

  return null;
}
