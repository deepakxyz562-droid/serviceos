'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Mail, Plus, Trash2, Edit3, RefreshCw, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Send, Key, Settings2,
  Phone, Globe, Shield, Eye, EyeOff, Power, PowerOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ────────────────────────────────────────────────────────────────

interface EmailProviderItem {
  id: string;
  name: string;
  providerType: string;
  config: Record<string, unknown>;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  usageType: string;
  isDefaultTransactional: boolean;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
  status: string;
  tenantId: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CommunicationProviderItem {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  isDefault: boolean;
  sendingEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  sentToday: number;
  sentThisMonth: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  lastUsedAt: string | null;
  lastError: string | null;
  config: Record<string, string>;
  credentialId: string | null;
  tenantId: string | null;
  createdAt: string;
}

// ─── Config Field Definitions ─────────────────────────────────────────────

const EMAIL_PROVIDER_CONFIGS: Record<string, { label: string; fields: { key: string; label: string; type: 'text' | 'password'; required?: boolean; placeholder?: string }[] }> = {
  smtp: {
    label: 'SMTP',
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'text', required: true, placeholder: '587' },
      { key: 'smtpUser', label: 'Username', type: 'text', required: true, placeholder: 'user@example.com' },
      { key: 'smtpPass', label: 'Password', type: 'password', required: true },
      { key: 'smtpSecure', label: 'Use TLS', type: 'text', placeholder: 'true' },
    ],
  },
  resend: {
    label: 'Resend',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_xxxxxxxx' },
    ],
  },
  sendgrid: {
    label: 'SendGrid',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxx' },
    ],
  },
  ses: {
    label: 'AWS SES',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    ],
  },
  mailgun: {
    label: 'Mailgun',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'mg.example.com' },
      { key: 'host', label: 'Host (EU)', type: 'text', placeholder: 'api.eu.mailgun.net' },
    ],
  },
  postmark: {
    label: 'Postmark',
    fields: [
      { key: 'serverToken', label: 'Server Token', type: 'password', required: true },
    ],
  },
  brevo: {
    label: 'Brevo',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
};

const WHATSAPP_PROVIDER_CONFIGS: Record<string, { label: string; fields: { key: string; label: string; type: 'text' | 'password'; required?: boolean; placeholder?: string }[] }> = {
  meta_cloud_api: {
    label: 'Meta Cloud API',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true, placeholder: '1234567890' },
      { key: 'businessAccountId', label: 'Business Account ID', type: 'text', required: true, placeholder: '1234567890' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'my_verify_token' },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', type: 'text', placeholder: '1234567890' },
    ],
  },
  '360dialog': {
    label: '360Dialog',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
    ],
  },
  gupshup: {
    label: 'Gupshup',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'appName', label: 'App Name', type: 'text', required: true },
      { key: 'sourcePhone', label: 'Source Phone', type: 'text', required: true },
    ],
  },
  wati: {
    label: 'WATI',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'apiEndpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://app.wati.io' },
    ],
  },
  interakt: {
    label: 'Interakt',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  twilio: {
    label: 'Twilio',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'fromNumber', label: 'From Number', type: 'text', required: true, placeholder: '+1234567890' },
    ],
  },
};

const SMS_PROVIDER_CONFIGS: Record<string, { label: string; fields: { key: string; label: string; type: 'text' | 'password'; required?: boolean; placeholder?: string }[] }> = {
  twilio: {
    label: 'Twilio SMS',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'fromNumber', label: 'From Number', type: 'text', required: true, placeholder: '+1234567890' },
    ],
  },
  msg91: {
    label: 'MSG91',
    fields: [
      { key: 'authKey', label: 'Auth Key', type: 'password', required: true },
      { key: 'senderId', label: 'Sender ID', type: 'text', required: true },
    ],
  },
  textlocal: {
    label: 'TextLocal',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'sender', label: 'Sender Name', type: 'text', required: true },
    ],
  },
  exotel: {
    label: 'Exotel',
    fields: [
      { key: 'sid', label: 'SID', type: 'text', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
    ],
  },
  plivo: {
    label: 'Plivo',
    fields: [
      { key: 'authId', label: 'Auth ID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'fromNumber', label: 'From Number', type: 'text', required: true },
    ],
  },
};

// ─── Status Badge Helper ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    active: { color: 'text-primary bg-primary/10 border-primary/20', icon: CheckCircle2, label: 'Active' },
    inactive: { color: 'text-muted-foreground bg-muted border-border', icon: XCircle, label: 'Inactive' },
    paused: { color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle, label: 'Paused' },
    error: { color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle, label: 'Error' },
  };
  const c = config[status] || config.inactive;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', c.color)}>
      <Icon className="size-3 mr-1" />{c.label}
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function ProvidersTab() {
  const [emailProviders, setEmailProviders] = useState<EmailProviderItem[]>([]);
  const [commProviders, setCommProviders] = useState<CommunicationProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('whatsapp');

  // Dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showCommDialog, setShowCommDialog] = useState(false);
  const [editingEmailProvider, setEditingEmailProvider] = useState<EmailProviderItem | null>(null);
  const [editingCommProvider, setEditingCommProvider] = useState<CommunicationProviderItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form states for email provider
  const [emailForm, setEmailForm] = useState({
    name: '', providerType: 'smtp', fromName: '', fromEmail: '', replyTo: '',
    usageType: 'both', isDefaultTransactional: false, isDefaultMarketing: false,
    isPlatform: true, status: 'active',
    config: {} as Record<string, string>,
  });

  // Form states for communication provider
  const [commForm, setCommForm] = useState({
    name: '', type: 'whatsapp', provider: 'meta_cloud_api',
    isDefault: false, sendingEnabled: true, dailyLimit: 1000, monthlyLimit: 30000,
    status: 'active', tenantId: '',
    config: {} as Record<string, string>,
  });

  // ─── Fetch Data ──────────────────────────────────────────────────────

  const fetchEmailProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/providers/email-providers?showAll=true');
      if (res.ok) {
        const data = await res.json();
        setEmailProviders(data.data || []);
      }
    } catch {
      toast.error('Failed to load email providers');
    }
  }, []);

  const fetchCommProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/providers/communication-providers');
      if (res.ok) {
        const data = await res.json();
        setCommProviders(data.data || []);
      }
    } catch {
      toast.error('Failed to load communication providers');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEmailProviders(), fetchCommProviders()]);
    setLoading(false);
  }, [fetchEmailProviders, fetchCommProviders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Email Provider CRUD ─────────────────────────────────────────────

  const resetEmailForm = () => {
    setEmailForm({
      name: '', providerType: 'smtp', fromName: '', fromEmail: '', replyTo: '',
      usageType: 'both', isDefaultTransactional: false, isDefaultMarketing: false,
      isPlatform: true, status: 'active',
      config: {},
    });
    setEditingEmailProvider(null);
  };

  const openEmailCreate = () => {
    resetEmailForm();
    setShowEmailDialog(true);
  };

  const openEmailEdit = (provider: EmailProviderItem) => {
    setEditingEmailProvider(provider);
    setEmailForm({
      name: provider.name,
      providerType: provider.providerType,
      fromName: provider.fromName,
      fromEmail: provider.fromEmail,
      replyTo: provider.replyTo || '',
      usageType: provider.usageType,
      isDefaultTransactional: provider.isDefaultTransactional,
      isDefaultMarketing: provider.isDefaultMarketing,
      isPlatform: provider.isPlatform,
      status: provider.status,
      config: Object.fromEntries(
        Object.entries(provider.config).map(([k, v]) => [k, String(v)])
      ),
    });
    setShowEmailDialog(true);
  };

  const saveEmailProvider = async () => {
    if (!emailForm.name.trim() || !emailForm.fromName.trim() || !emailForm.fromEmail.trim()) {
      toast.error('Name, From Name, and From Email are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: emailForm.name,
        providerType: emailForm.providerType,
        fromName: emailForm.fromName,
        fromEmail: emailForm.fromEmail,
        replyTo: emailForm.replyTo || null,
        usageType: emailForm.usageType,
        isDefaultTransactional: emailForm.isDefaultTransactional,
        isDefaultMarketing: emailForm.isDefaultMarketing,
        isPlatform: emailForm.isPlatform,
        status: emailForm.status,
        configJson: emailForm.config,
      };

      if (editingEmailProvider) {
        const res = await fetch(`/api/superadmin/providers/email-providers/${editingEmailProvider.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || 'Failed to update');
          return;
        }
        toast.success('Email provider updated');
      } else {
        const res = await fetch('/api/superadmin/providers/email-providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || 'Failed to create');
          return;
        }
        toast.success('Email provider created');
      }
      setShowEmailDialog(false);
      resetEmailForm();
      fetchEmailProviders();
    } catch {
      toast.error('Failed to save email provider');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmailProvider = async (id: string) => {
    if (!confirm('Delete this email provider? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/superadmin/providers/email-providers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to delete');
        return;
      }
      toast.success('Email provider deleted');
      fetchEmailProviders();
    } catch {
      toast.error('Failed to delete email provider');
    }
  };

  // ─── Communication Provider CRUD ─────────────────────────────────────

  const resetCommForm = () => {
    setCommForm({
      name: '', type: 'whatsapp', provider: 'meta_cloud_api',
      isDefault: false, sendingEnabled: true, dailyLimit: 1000, monthlyLimit: 30000,
      status: 'active', tenantId: '',
      config: {},
    });
    setEditingCommProvider(null);
  };

  const openCommCreate = (type: string = 'whatsapp') => {
    resetCommForm();
    setCommForm(prev => ({ ...prev, type, provider: type === 'whatsapp' ? 'meta_cloud_api' : 'twilio' }));
    setShowCommDialog(true);
  };

  const openCommEdit = (provider: CommunicationProviderItem) => {
    setEditingCommProvider(provider);
    setCommForm({
      name: provider.name,
      type: provider.type,
      provider: provider.provider,
      isDefault: provider.isDefault,
      sendingEnabled: provider.sendingEnabled,
      dailyLimit: provider.dailyLimit,
      monthlyLimit: provider.monthlyLimit,
      status: provider.status,
      tenantId: provider.tenantId || '',
      config: Object.fromEntries(
        Object.entries(provider.config).map(([k, v]) => [k, String(v)])
      ),
    });
    setShowCommDialog(true);
  };

  const saveCommProvider = async () => {
    if (!commForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: commForm.name,
        type: commForm.type,
        provider: commForm.provider,
        isDefault: commForm.isDefault,
        sendingEnabled: commForm.sendingEnabled,
        dailyLimit: commForm.dailyLimit,
        monthlyLimit: commForm.monthlyLimit,
        status: commForm.status,
        tenantId: commForm.tenantId || null,
        config: commForm.config,
      };

      if (editingCommProvider) {
        const res = await fetch(`/api/superadmin/providers/communication-providers/${editingCommProvider.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || 'Failed to update');
          return;
        }
        toast.success('Provider updated');
      } else {
        const res = await fetch('/api/superadmin/providers/communication-providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || 'Failed to create');
          return;
        }
        toast.success('Provider created');
      }
      setShowCommDialog(false);
      resetCommForm();
      fetchCommProviders();
    } catch {
      toast.error('Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const deleteCommProvider = async (id: string) => {
    if (!confirm('Delete this provider? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/superadmin/providers/communication-providers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to delete');
        return;
      }
      toast.success('Provider deleted');
      fetchCommProviders();
    } catch {
      toast.error('Failed to delete provider');
    }
  };

  // ─── Get config fields for current form selection ────────────────────

  const getEmailConfigFields = () => EMAIL_PROVIDER_CONFIGS[emailForm.providerType]?.fields || [];
  const getCommConfigFields = () => {
    if (commForm.type === 'whatsapp') return WHATSAPP_PROVIDER_CONFIGS[commForm.provider]?.fields || [];
    return SMS_PROVIDER_CONFIGS[commForm.provider]?.fields || [];
  };
  const getCommProviderOptions = () => {
    if (commForm.type === 'whatsapp') return Object.entries(WHATSAPP_PROVIDER_CONFIGS);
    return Object.entries(SMS_PROVIDER_CONFIGS);
  };

  const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Stats ───────────────────────────────────────────────────────────

  const whatsappProviders = commProviders.filter(p => p.type === 'whatsapp');
  const smsProviders = commProviders.filter(p => p.type === 'sms');
  const platformEmailProviders = emailProviders.filter(p => p.isPlatform);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="size-5 text-primary" /> API &amp; Provider Management
          </h3>
          <p className="text-sm text-muted-foreground">Manage Meta API, WhatsApp, SMS, and Email provider configurations for the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="bg-muted border-border text-foreground hover:bg-muted">
          <RefreshCw className="size-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'WhatsApp', value: whatsappProviders.length, active: whatsappProviders.filter(p => p.status === 'active').length, icon: MessageSquare, color: 'text-primary' },
          { label: 'SMS', value: smsProviders.length, active: smsProviders.filter(p => p.status === 'active').length, icon: Phone, color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Platform Email', value: platformEmailProviders.length, active: platformEmailProviders.filter(p => p.status === 'active').length, icon: Mail, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Total Providers', value: commProviders.length + emailProviders.length, active: [...commProviders, ...emailProviders].filter(p => p.status === 'active').length, icon: Globe, color: 'text-violet-600 dark:text-violet-400' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-card border-border p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4', s.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.active} active</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Provider Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="flex gap-1 bg-card p-1 rounded-lg border border-border h-auto flex-wrap">
          <TabsTrigger value="whatsapp" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-foreground text-muted-foreground">
            <MessageSquare className="size-3.5" /><span className="hidden sm:inline">WhatsApp / Meta API</span><span className="sm:hidden">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-foreground text-muted-foreground">
            <Phone className="size-3.5" /><span className="hidden sm:inline">SMS Providers</span><span className="sm:hidden">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-foreground text-muted-foreground">
            <Mail className="size-3.5" /><span className="hidden sm:inline">Email Providers</span><span className="sm:hidden">Email</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── WhatsApp / Meta API Tab ─────────────────────────────────── */}
        <TabsContent value="whatsapp" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Manage WhatsApp/Meta API providers used for trial users and platform messaging.
            </p>
            <Button size="sm" onClick={() => openCommCreate('whatsapp')} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="size-3.5 mr-1.5" /> Add WhatsApp Provider
            </Button>
          </div>

          {whatsappProviders.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <MessageSquare className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No WhatsApp providers configured</p>
                <p className="text-xs text-muted-foreground mt-1">Add a Meta Cloud API provider to enable WhatsApp messaging for trial users.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {whatsappProviders.map(p => (
                <Card key={p.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="text-sm font-medium text-foreground">{p.name}</h4>
                          <StatusBadge status={p.status} />
                          {p.isDefault && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              <Key className="size-2.5 mr-0.5" /> Default
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                            {WHATSAPP_PROVIDER_CONFIGS[p.provider]?.label || p.provider}
                          </Badge>
                          {!p.sendingEnabled && (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                              <PowerOff className="size-2.5 mr-0.5" /> Sending Disabled
                            </Badge>
                          )}
                        </div>
                        {/* Config details */}
                        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
                          {Object.entries(p.config).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground shrink-0">{key}:</span>
                              <span className="text-foreground truncate font-mono">
                                {value === '••••••••' ? (
                                  <span className="flex items-center gap-1">
                                    ••••••••
                                    <button onClick={() => toggleSecret(`${p.id}-${key}`)} className="text-muted-foreground hover:text-foreground">
                                      {showSecrets[`${p.id}-${key}`] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                    </button>
                                  </span>
                                ) : (
                                  value || <span className="text-muted-foreground italic">empty</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Sent: {p.totalSent}</span>
                          <span>Delivered: {p.totalDelivered}</span>
                          <span>Failed: {p.totalFailed}</span>
                          {p.lastUsedAt && <span>Last used: {new Date(p.lastUsedAt).toLocaleDateString()}</span>}
                          {p.tenantId && <span>Tenant: {p.tenantId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openCommEdit(p)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCommProvider(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-300 h-8 w-8 p-0">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── SMS Providers Tab ────────────────────────────────────────── */}
        <TabsContent value="sms" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Manage SMS providers for platform messaging.
            </p>
            <Button size="sm" onClick={() => openCommCreate('sms')} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="size-3.5 mr-1.5" /> Add SMS Provider
            </Button>
          </div>

          {smsProviders.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <Phone className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No SMS providers configured</p>
                <p className="text-xs text-muted-foreground mt-1">Add an SMS provider like Twilio to enable SMS messaging.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {smsProviders.map(p => (
                <Card key={p.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="text-sm font-medium text-foreground">{p.name}</h4>
                          <StatusBadge status={p.status} />
                          {p.isDefault && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              <Key className="size-2.5 mr-0.5" /> Default
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                            {SMS_PROVIDER_CONFIGS[p.provider]?.label || p.provider}
                          </Badge>
                        </div>
                        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
                          {Object.entries(p.config).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground shrink-0">{key}:</span>
                              <span className="text-foreground truncate font-mono">
                                {value === '••••••••' ? '••••••••' : (value || <span className="text-muted-foreground italic">empty</span>)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Sent: {p.totalSent}</span>
                          <span>Delivered: {p.totalDelivered}</span>
                          <span>Failed: {p.totalFailed}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openCommEdit(p)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCommProvider(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-300 h-8 w-8 p-0">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Email Providers Tab ──────────────────────────────────────── */}
        <TabsContent value="email" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Manage platform-level email providers for transactional and marketing emails.
            </p>
            <Button size="sm" onClick={openEmailCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="size-3.5 mr-1.5" /> Add Email Provider
            </Button>
          </div>

          {emailProviders.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <Mail className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No email providers configured</p>
                <p className="text-xs text-muted-foreground mt-1">Add a platform email provider to enable transactional and marketing emails.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {emailProviders.map(p => (
                <Card key={p.id} className={cn('border', p.isPlatform ? 'bg-card border-emerald-900/30' : 'bg-card/70 border-border')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="text-sm font-medium text-foreground">{p.name}</h4>
                          <StatusBadge status={p.status} />
                          {p.isPlatform && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              <Shield className="size-2.5 mr-0.5" /> Platform
                            </Badge>
                          )}
                          {p.isDefaultTransactional && (
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                              Default Transactional
                            </Badge>
                          )}
                          {p.isDefaultMarketing && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Default Marketing
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border">
                            {EMAIL_PROVIDER_CONFIGS[p.providerType]?.label || p.providerType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border capitalize">
                            {p.usageType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>From: {p.fromName} &lt;{p.fromEmail}&gt;</span>
                          {p.replyTo && <span>Reply-To: {p.replyTo}</span>}
                        </div>
                        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
                          {Object.entries(p.config).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground shrink-0">{key}:</span>
                              <span className="text-foreground truncate font-mono">
                                {String(value) === '••••••••' ? '••••••••' : (String(value) || <span className="text-muted-foreground italic">empty</span>)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Sent: {p.totalSent}</span>
                          <span>Delivered: {p.totalDelivered}</span>
                          <span>Failed: {p.totalFailed}</span>
                          {p.tenantId && <span>Tenant: {p.tenantId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEmailEdit(p)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteEmailProvider(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-300 h-8 w-8 p-0">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Email Provider Dialog ──────────────────────────────────────── */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => { if (!open) { setShowEmailDialog(false); resetEmailForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              {editingEmailProvider ? 'Edit Email Provider' : 'Add Email Provider'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingEmailProvider ? 'Update the email provider configuration.' : 'Configure a new platform-level email provider for transactional and marketing emails.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Provider Name *</Label>
                <Input value={emailForm.name} onChange={e => setEmailForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., AWS SES Production" className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Provider Type *</Label>
                <Select value={emailForm.providerType} onValueChange={(val) => setEmailForm(prev => ({ ...prev, providerType: val, config: {} }))}>
                  <SelectTrigger className="bg-card border-border text-foreground text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(EMAIL_PROVIDER_CONFIGS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">From Name *</Label>
                <Input value={emailForm.fromName} onChange={e => setEmailForm(prev => ({ ...prev, fromName: e.target.value }))}
                  placeholder="ServiceOS" className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">From Email *</Label>
                <Input value={emailForm.fromEmail} onChange={e => setEmailForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="noreply@example.com" type="email" className="bg-card border-border text-foreground text-sm" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Reply-To</Label>
                <Input value={emailForm.replyTo} onChange={e => setEmailForm(prev => ({ ...prev, replyTo: e.target.value }))}
                  placeholder="support@example.com" type="email" className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Usage Type</Label>
                <Select value={emailForm.usageType} onValueChange={val => setEmailForm(prev => ({ ...prev, usageType: val }))}>
                  <SelectTrigger className="bg-card border-border text-foreground text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="transactional">Transactional Only</SelectItem>
                    <SelectItem value="marketing">Marketing Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-muted" />

            {/* Config Fields */}
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1.5 mb-3">
                <Key className="size-3.5 text-amber-600 dark:text-amber-400" />
                {EMAIL_PROVIDER_CONFIGS[emailForm.providerType]?.label || 'Provider'} Configuration
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {getEmailConfigFields().map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {field.label} {field.required && <span className="text-red-600 dark:text-red-400">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        type={field.type === 'password' ? (showSecrets[`email-${field.key}`] ? 'text' : 'password') : 'text'}
                        value={emailForm.config[field.key] || ''}
                        onChange={e => setEmailForm(prev => ({
                          ...prev,
                          config: { ...prev.config, [field.key]: e.target.value },
                        }))}
                        placeholder={field.placeholder}
                        className={cn(
                          'bg-card border-border text-foreground text-sm pr-9',
                          field.type === 'password' && 'font-mono',
                        )}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(`email-${field.key}`)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[`email-${field.key}`] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-muted" />

            {/* Flags */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Platform Provider</p>
                  <p className="text-xs text-muted-foreground">Platform-paid email provider</p>
                </div>
                <Switch checked={emailForm.isPlatform} onCheckedChange={val => setEmailForm(prev => ({ ...prev, isPlatform: val }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Default Transactional</p>
                  <p className="text-xs text-muted-foreground">Use for transactional emails</p>
                </div>
                <Switch checked={emailForm.isDefaultTransactional} onCheckedChange={val => setEmailForm(prev => ({ ...prev, isDefaultTransactional: val }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Default Marketing</p>
                  <p className="text-xs text-muted-foreground">Use for marketing emails</p>
                </div>
                <Switch checked={emailForm.isDefaultMarketing} onCheckedChange={val => setEmailForm(prev => ({ ...prev, isDefaultMarketing: val }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Status</p>
                  <p className="text-xs text-muted-foreground">Enable or pause this provider</p>
                </div>
                <Select value={emailForm.status} onValueChange={val => setEmailForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="w-28 bg-muted border-border text-foreground text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmailDialog(false); resetEmailForm(); }} className="bg-muted border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={saveEmailProvider} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editingEmailProvider ? 'Update Provider' : 'Create Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Communication Provider Dialog ──────────────────────────────── */}
      <Dialog open={showCommDialog} onOpenChange={(open) => { if (!open) { setShowCommDialog(false); resetCommForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {commForm.type === 'whatsapp' ? <MessageSquare className="size-5 text-primary" /> : <Phone className="size-5 text-sky-600 dark:text-sky-400" />}
              {editingCommProvider ? `Edit ${commForm.type === 'whatsapp' ? 'WhatsApp' : 'SMS'} Provider` : `Add ${commForm.type === 'whatsapp' ? 'WhatsApp/Meta API' : 'SMS'} Provider`}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {commForm.type === 'whatsapp'
                ? 'Configure Meta Cloud API or another WhatsApp Business provider for trial messaging.'
                : 'Configure an SMS provider for platform messaging.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Provider Name *</Label>
                <Input value={commForm.name} onChange={e => setCommForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Meta Cloud API - Trial" className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Provider Service *</Label>
                <Select value={commForm.provider} onValueChange={val => setCommForm(prev => ({ ...prev, provider: val, config: {} }))}>
                  <SelectTrigger className="bg-card border-border text-foreground text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {getCommProviderOptions().map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-muted" />

            {/* Config Fields */}
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1.5 mb-3">
                <Key className="size-3.5 text-amber-600 dark:text-amber-400" />
                {commForm.type === 'whatsapp'
                  ? (WHATSAPP_PROVIDER_CONFIGS[commForm.provider]?.label || commForm.provider)
                  : (SMS_PROVIDER_CONFIGS[commForm.provider]?.label || commForm.provider)
                } Configuration
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {getCommConfigFields().map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {field.label} {field.required && <span className="text-red-600 dark:text-red-400">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        type={field.type === 'password' ? (showSecrets[`comm-${field.key}`] ? 'text' : 'password') : 'text'}
                        value={commForm.config[field.key] || ''}
                        onChange={e => setCommForm(prev => ({
                          ...prev,
                          config: { ...prev.config, [field.key]: e.target.value },
                        }))}
                        placeholder={field.placeholder}
                        className={cn(
                          'bg-card border-border text-foreground text-sm pr-9',
                          field.type === 'password' && 'font-mono',
                        )}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(`comm-${field.key}`)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[`comm-${field.key}`] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-muted" />

            {/* Settings */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Default Provider</p>
                  <p className="text-xs text-muted-foreground">Set as default for this type</p>
                </div>
                <Switch checked={commForm.isDefault} onCheckedChange={val => setCommForm(prev => ({ ...prev, isDefault: val }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-sm text-foreground">Sending Enabled</p>
                  <p className="text-xs text-muted-foreground">Enable message sending</p>
                </div>
                <Switch checked={commForm.sendingEnabled} onCheckedChange={val => setCommForm(prev => ({ ...prev, sendingEnabled: val }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Daily Limit</Label>
                <Input type="number" value={commForm.dailyLimit} onChange={e => setCommForm(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                  className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Monthly Limit</Label>
                <Input type="number" value={commForm.monthlyLimit} onChange={e => setCommForm(prev => ({ ...prev, monthlyLimit: Number(e.target.value) }))}
                  className="bg-card border-border text-foreground text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Status</Label>
                <Select value={commForm.status} onValueChange={val => setCommForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="bg-card border-border text-foreground text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Tenant ID (optional)</Label>
                <Input value={commForm.tenantId} onChange={e => setCommForm(prev => ({ ...prev, tenantId: e.target.value }))}
                  placeholder="Leave empty for platform-wide" className="bg-card border-border text-foreground text-sm" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCommDialog(false); resetCommForm(); }} className="bg-muted border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={saveCommProvider} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editingCommProvider ? 'Update Provider' : 'Create Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
