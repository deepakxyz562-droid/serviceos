'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings, Plus, Send, Mail, Smartphone, MessageSquare,
  Wifi, WifiOff, AlertCircle, CheckCircle2, Loader2,
  Trash2, Shield, Key, Globe, Pencil,
  ShieldCheck, Megaphone, RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderConfig {
  [key: string]: string;
}

interface CommunicationProvider {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp';
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
  config: ProviderConfig;
  createdAt: string;
}

// ─── Email Channel Status (two-section panel) ────────────────────────────────

interface EmailStatusMarketingProvider {
  id: string;
  name: string;
  providerType: string;
  usageType: string;
  isDefault: boolean;
  status: string;
  fromEmail: string;
  fromName: string;
  totalSent: number;
  lastUsedAt: string | null;
}

interface EmailChannelStatus {
  systemEmail: {
    managed: 'platform';
    connected: boolean;
    source: 'emailProvider' | 'env-smtp' | 'env-resend' | 'simulated' | string | null;
    providerId: string | null;
    providerName: string | null;
    providerType: string | null;
    simulated: boolean;
  };
  marketingEmail: {
    connected: boolean;
    defaultProviderId: string | null;
    providers: EmailStatusMarketingProvider[];
  };
}

const MARKETING_PROVIDER_CHIPS = ['SMTP', 'Resend', 'SendGrid', 'Amazon SES', 'Mailgun', 'Brevo'];

// ─── Provider Configurations ─────────────────────────────────────────────────

const PROVIDER_OPTIONS: Record<string, { value: string; label: string }> = {
  // Email
  amazon_ses: { value: 'amazon_ses', label: 'Amazon SES' },
  resend: { value: 'resend', label: 'Resend' },
  sendgrid: { value: 'sendgrid', label: 'SendGrid' },
  mailgun: { value: 'mailgun', label: 'Mailgun' },
  postmark: { value: 'postmark', label: 'Postmark' },
  // SMS
  twilio: { value: 'twilio', label: 'Twilio' },
  msg91: { value: 'msg91', label: 'MSG91' },
  plivo: { value: 'plivo', label: 'Plivo' },
  textlocal: { value: 'textlocal', label: 'Textlocal' },
  exotel: { value: 'exotel', label: 'Exotel' },
  // WhatsApp
  meta_cloud_api: { value: 'meta_cloud_api', label: 'Meta Cloud API' },
  '360dialog': { value: '360dialog', label: '360Dialog' },
  wati: { value: 'wati', label: 'WATI' },
  interakt: { value: 'interakt', label: 'Interakt' },
  gupshup: { value: 'gupshup', label: 'Gupshup' },
};

const EMAIL_PROVIDERS = ['amazon_ses', 'resend', 'sendgrid', 'mailgun', 'postmark'];
const SMS_PROVIDERS = ['twilio', 'msg91', 'plivo', 'textlocal', 'exotel'];
const WHATSAPP_PROVIDERS = ['meta_cloud_api', '360dialog', 'wati', 'interakt', 'gupshup'];

const CONFIG_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password'; placeholder: string }[]> = {
  // Email providers
  amazon_ses: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'email-smtp.us-east-1.amazonaws.com' },
    { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'AKIA...' },
    { key: 'apiKey', label: 'API Key / Password', type: 'password', placeholder: '••••••••' },
    { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'ServiceOS' },
  ],
  resend: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.resend.com' },
    { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '465' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'resend' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_••••••••' },
    { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'ServiceOS' },
  ],
  sendgrid: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.sendgrid.net' },
    { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'apikey' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.••••••••' },
    { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'ServiceOS' },
  ],
  mailgun: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.mailgun.org' },
    { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'postmaster@yourdomain.com' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'ServiceOS' },
  ],
  postmark: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.postmarkapp.com' },
    { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '587' },
    { key: 'username', label: 'Username', type: 'text', placeholder: '••••••••' },
    { key: 'apiKey', label: 'API Key / Password', type: 'password', placeholder: '••••••••' },
    { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'ServiceOS' },
  ],
  // SMS providers
  twilio: [
    { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
    { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
    { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: '+1234567890' },
  ],
  msg91: [
    { key: 'authKey', label: 'Auth Key / API Key', type: 'password', placeholder: '••••••••' },
    { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: '+919876543210' },
  ],
  plivo: [
    { key: 'authId', label: 'Auth ID', type: 'text', placeholder: 'MA••••••••' },
    { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
    { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: '+1234567890' },
  ],
  textlocal: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'fromNumber', label: 'Sender Name', type: 'text', placeholder: 'SVROS' },
  ],
  exotel: [
    { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'your_exotel_sid' },
    { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
    { key: 'fromNumber', label: 'From Number', type: 'text', placeholder: '+919876543210' },
  ],
  // WhatsApp providers
  meta_cloud_api: [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'BIZ-9876' },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAA••••••••' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'your_verify_token' },
  ],
  '360dialog': [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'BIZ-9876' },
    { key: 'accessToken', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'your_verify_token' },
  ],
  wati: [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'BIZ-9876' },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: '••••••••' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'your_verify_token' },
  ],
  interakt: [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'BIZ-9876' },
    { key: 'accessToken', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'your_verify_token' },
  ],
  gupshup: [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'BIZ-9876' },
    { key: 'accessToken', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password', placeholder: 'your_verify_token' },
  ],
};

// ─── Type Config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr || 'Never';
  }
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommunicationProvidersView() {
  const [providers, setProviders] = useState<CommunicationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CommunicationProvider | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state (shared for add/edit)
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [formProvider, setFormProvider] = useState('amazon_ses');
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSendingEnabled, setFormSendingEnabled] = useState(true);
  const [formDailyLimit, setFormDailyLimit] = useState('1000');
  const [formMonthlyLimit, setFormMonthlyLimit] = useState('30000');

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/communication-providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.data || []);
      } else {
        setError('Failed to load communication providers');
        toast.error('Failed to load communication providers');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading providers');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // ─── Email Channel Status (two-section panel) ──────────────────────────

  const [emailStatus, setEmailStatus] = useState<EmailChannelStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const setActiveView = useAppStore((s) => s.setActiveView);

  const fetchEmailStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/email-providers/status');
      if (res.ok) {
        const data = (await res.json()) as EmailChannelStatus;
        setEmailStatus(data);
      } else {
        setStatusError('Failed to load email channel status');
      }
    } catch {
      setStatusError('Network error loading status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailStatus();
  }, [fetchEmailStatus]);

  // ─── Computed ───────────────────────────────────────────────────────────

  const emailProviders = useMemo(() => providers.filter(p => p.type === 'email'), [providers]);
  const smsProviders = useMemo(() => providers.filter(p => p.type === 'sms'), [providers]);
  const whatsappProviders = useMemo(() => providers.filter(p => p.type === 'whatsapp'), [providers]);

  const stats = useMemo(() => {
    const active = providers.filter(p => p.status === 'active').length;
    const totalSent = providers.reduce((acc, p) => acc + p.totalSent, 0);
    const totalDelivered = providers.reduce((acc, p) => acc + p.totalDelivered, 0);
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    return { total: providers.length, active, totalSent, deliveryRate };
  }, [providers]);

  // Track whether we're populating for edit to avoid useEffect override
  const isPopulatingForEdit = useRef(false);

  // Reset form provider when type changes (skip during edit population)
  useEffect(() => {
    if (isPopulatingForEdit.current) return;
    const providerList = formType === 'email' ? EMAIL_PROVIDERS : formType === 'sms' ? SMS_PROVIDERS : WHATSAPP_PROVIDERS;
    setFormProvider(providerList[0]);
    setFormConfig({});
  }, [formType]);

  // ─── Form helpers ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName('');
    setFormType('email');
    setFormProvider('amazon_ses');
    setFormConfig({});
    setFormIsDefault(false);
    setFormSendingEnabled(true);
    setFormDailyLimit('1000');
    setFormMonthlyLimit('30000');
  };

  const populateFormForEdit = (provider: CommunicationProvider) => {
    isPopulatingForEdit.current = true;
    setFormName(provider.name);
    setFormType(provider.type);
    setFormProvider(provider.provider);
    setFormConfig(provider.config || {});
    setFormIsDefault(provider.isDefault);
    setFormSendingEnabled(provider.sendingEnabled);
    setFormDailyLimit(String(provider.dailyLimit));
    setFormMonthlyLimit(String(provider.monthlyLimit));
    // Reset flag after the next render cycle so useEffect doesn't override
    requestAnimationFrame(() => {
      isPopulatingForEdit.current = false;
    });
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!formName.trim()) {
      toast.error('Provider name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/communication-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          provider: formProvider,
          config: formConfig,
          isDefault: formIsDefault,
          sendingEnabled: formSendingEnabled,
          dailyLimit: parseInt(formDailyLimit) || 1000,
          monthlyLimit: parseInt(formMonthlyLimit) || 30000,
        }),
      });

      if (res.ok) {
        toast.success('Communication provider created');
        setShowAddDialog(false);
        resetForm();
        fetchProviders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create provider');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProvider || !formName.trim()) {
      toast.error('Provider name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/communication-providers/${editingProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          provider: formProvider,
          config: formConfig,
          isDefault: formIsDefault,
          sendingEnabled: formSendingEnabled,
          dailyLimit: parseInt(formDailyLimit) || 1000,
          monthlyLimit: parseInt(formMonthlyLimit) || 30000,
        }),
      });

      if (res.ok) {
        toast.success('Provider updated successfully');
        setShowEditDialog(false);
        setEditingProvider(null);
        resetForm();
        fetchProviders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update provider');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (provider: CommunicationProvider) => {
    setEditingProvider(provider);
    populateFormForEdit(provider);
    setShowEditDialog(true);
  };

  const handleToggleSending = async (provider: CommunicationProvider) => {
    setTogglingId(provider.id);
    try {
      const res = await fetch(`/api/communication-providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendingEnabled: !provider.sendingEnabled }),
      });
      if (res.ok) {
        toast.success(`Sending ${provider.sendingEnabled ? 'disabled' : 'enabled'} for ${provider.name}`);
        fetchProviders();
      } else {
        toast.error('Failed to toggle sending');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/communication-providers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Provider deleted');
        setShowDeleteDialog(null);
        fetchProviders();
      } else {
        toast.error('Failed to delete provider');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Provider Card ─────────────────────────────────────────────────────

  const ProviderCard = ({ provider }: { provider: CommunicationProvider }) => {
    const typeConf = TYPE_CONFIG[provider.type] || TYPE_CONFIG.email;
    const TypeIcon = typeConf.icon;
    const providerLabel = PROVIDER_OPTIONS[provider.provider]?.label || provider.provider;
    const dailyPct = provider.dailyLimit > 0 ? Math.min((provider.sentToday / provider.dailyLimit) * 100, 100) : 0;
    const monthlyPct = provider.monthlyLimit > 0 ? Math.min((provider.sentThisMonth / provider.monthlyLimit) * 100, 100) : 0;
    const deliveryRate = provider.totalSent > 0 ? Math.round((provider.totalDelivered / provider.totalSent) * 100) : 0;
    const isActive = provider.status === 'active';
    const isToggling = togglingId === provider.id;

    return (
      <Card className={cn('transition-all hover:shadow-md', !isActive && 'opacity-60')}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('flex items-center justify-center size-10 rounded-lg shrink-0 border', typeConf.bgColor, typeConf.borderColor)}>
                <TypeIcon className={cn('size-5', typeConf.color)} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
                <p className="text-xs text-muted-foreground">{providerLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {provider.isDefault && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  <Shield className="size-3 mr-0.5" /> Default
                </Badge>
              )}
              <Badge variant="outline" className={cn('text-[10px]', isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200')}>
                {isActive ? <Wifi className="size-3 mr-0.5" /> : <WifiOff className="size-3 mr-0.5" />}
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Sending Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sending</span>
            </div>
            <Switch
              checked={provider.sendingEnabled}
              onCheckedChange={() => handleToggleSending(provider)}
              disabled={isToggling}
            />
          </div>

          {/* Usage */}
          <div className="space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Daily Usage</span>
                <span className="font-medium">{provider.sentToday.toLocaleString()} / {provider.dailyLimit.toLocaleString()}</span>
              </div>
              <Progress value={dailyPct} className={cn('h-1.5', dailyPct > 80 && '[&>div]:bg-red-500', dailyPct > 50 && dailyPct <= 80 && '[&>div]:bg-amber-500', dailyPct <= 50 && '[&>div]:bg-emerald-500')} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly Usage</span>
                <span className="font-medium">{provider.sentThisMonth.toLocaleString()} / {provider.monthlyLimit.toLocaleString()}</span>
              </div>
              <Progress value={monthlyPct} className={cn('h-1.5', monthlyPct > 80 && '[&>div]:bg-red-500', monthlyPct > 50 && monthlyPct <= 80 && '[&>div]:bg-amber-500', monthlyPct <= 50 && '[&>div]:bg-emerald-500')} />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-md bg-muted/50">
              <p className="text-sm font-bold">{formatNumber(provider.totalSent)}</p>
              <p className="text-[10px] text-muted-foreground">Sent</p>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <p className="text-sm font-bold text-emerald-600">{formatNumber(provider.totalDelivered)}</p>
              <p className="text-[10px] text-muted-foreground">Delivered</p>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/50">
              <p className="text-sm font-bold text-red-600">{formatNumber(provider.totalFailed)}</p>
              <p className="text-[10px] text-muted-foreground">Failed</p>
            </div>
          </div>

          {/* Delivery Rate */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Delivery Rate
            </span>
            <span className={cn('font-semibold', deliveryRate >= 95 ? 'text-emerald-600' : deliveryRate >= 80 ? 'text-amber-600' : 'text-red-600')}>
              {deliveryRate}%
            </span>
          </div>

          {/* Last Used / Error */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last used: {formatRelative(provider.lastUsedAt)}</span>
            {provider.lastError && (
              <span className="flex items-center gap-1 text-red-600 truncate max-w-[140px]" title={provider.lastError}>
                <AlertCircle className="size-3 shrink-0" /> <span className="truncate">{provider.lastError}</span>
              </span>
            )}
          </div>

          {/* Edit / Delete */}
          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
              onClick={() => openEditDialog(provider)}
            >
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
              onClick={() => setShowDeleteDialog(provider.id)}
            >
              <Trash2 className="size-3 mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Section ────────────────────────────────────────────────────────────

  const ProviderSection = ({ title, icon: SectionIcon, providers: sectionProviders, emptyText }: {
    title: string;
    icon: React.ElementType;
    providers: CommunicationProvider[];
    emptyText: string;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SectionIcon className="size-5 text-emerald-600" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
          {sectionProviders.length}
        </Badge>
      </div>
      {sectionProviders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <SectionIcon className="size-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No {title.toLowerCase()} configured</p>
            <p className="text-xs mt-1">{emptyText}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectionProviders.map(p => <ProviderCard key={p.id} provider={p} />)}
        </div>
      )}
    </div>
  );

  // ─── Dynamic config fields for add/edit dialog ───────────────────────────

  const currentConfigFields = CONFIG_FIELDS[formProvider] || [];

  // ─── Shared form content for add/edit ──────────────────────────────────

  const formContent = (
    <div className="space-y-4 py-2">
      {/* Name */}
      <div className="space-y-2">
        <Label>Provider Name *</Label>
        <Input placeholder="e.g., Twilio SMS, Amazon SES" value={formName} onChange={e => setFormName(e.target.value)} />
      </div>

      {/* Type - only editable in Add mode */}
      {!editingProvider && (
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formType} onValueChange={(v: 'email' | 'sms' | 'whatsapp') => setFormType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <span className="flex items-center gap-2"><Mail className="size-3.5 text-emerald-600" /> Email</span>
              </SelectItem>
              <SelectItem value="sms">
                <span className="flex items-center gap-2"><Smartphone className="size-3.5 text-emerald-600" /> SMS</span>
              </SelectItem>
              <SelectItem value="whatsapp">
                <span className="flex items-center gap-2"><MessageSquare className="size-3.5 text-emerald-600" /> WhatsApp</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Type indicator in edit mode */}
      {editingProvider && (
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
            {(() => {
              const typeConf = TYPE_CONFIG[editingProvider.type];
              const TypeIcon = typeConf.icon;
              return <><TypeIcon className={cn('size-4', typeConf.color)} /> {typeConf.label}</>;
            })()}
          </div>
        </div>
      )}

      {/* Provider */}
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={formProvider} onValueChange={v => { setFormProvider(v); setFormConfig({}); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(formType === 'email' ? EMAIL_PROVIDERS : formType === 'sms' ? SMS_PROVIDERS : WHATSAPP_PROVIDERS).map(key => (
              <SelectItem key={key} value={key}>
                {PROVIDER_OPTIONS[key]?.label || key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Dynamic Config Fields */}
      {currentConfigFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-emerald-600" />
            <Label className="text-sm font-semibold">Configuration</Label>
          </div>
          {currentConfigFields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">{field.label}</Label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={formConfig[field.key] || ''}
                onChange={e => setFormConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Daily Limit</Label>
          <Input
            type="number"
            placeholder="1000"
            value={formDailyLimit}
            onChange={e => setFormDailyLimit(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Monthly Limit</Label>
          <Input
            type="number"
            placeholder="30000"
            value={formMonthlyLimit}
            onChange={e => setFormMonthlyLimit(e.target.value)}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Enable Sending</Label>
          <p className="text-xs text-muted-foreground">Allow this provider to send messages</p>
        </div>
        <Switch checked={formSendingEnabled} onCheckedChange={setFormSendingEnabled} />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Set as Default</Label>
          <p className="text-xs text-muted-foreground">Use as the default provider for this type</p>
        </div>
        <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Email Channel Status Panel (System Email + Marketing Email) */}
      <section className="space-y-3" aria-label="Email Channel Status">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Mail className="size-4 text-emerald-600" />
              Email Channel Status
            </h3>
            <p className="text-xs text-muted-foreground">
              Two separate channels: one for transactional email, one for your campaigns.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmailStatus}
            disabled={statusLoading}
          >
            <RefreshCw className={cn('size-4 mr-1.5', statusLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {statusLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : statusError ? (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-4 text-amber-600" />
                <span>Unable to load status — {statusError}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchEmailStatus}>
                <RefreshCw className="size-4 mr-1.5" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : emailStatus ? (
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── Card 1: System Email (transactional, platform-managed) ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                      <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">System Email</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Password resets, invitations, booking & invoice alerts
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                    <ShieldCheck className="size-3 mr-0.5" /> Managed By Platform
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3">
                  {emailStatus.systemEmail.simulated || !emailStatus.systemEmail.connected ? (
                    <p className="text-sm">
                      <span className="font-medium text-amber-700 dark:text-amber-400">Simulated</span>{' '}
                      <span className="text-muted-foreground">
                        (configure <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[11px]">RESEND_API_KEY</code> or SMTP env)
                      </span>
                    </p>
                  ) : emailStatus.systemEmail.source === 'emailProvider' && emailStatus.systemEmail.providerName ? (
                    <p className="text-sm">
                      <span className="font-medium">{emailStatus.systemEmail.providerName}</span>{' '}
                      <span className="text-muted-foreground">
                        via {emailStatus.systemEmail.providerType?.toUpperCase() || 'Provider'}
                      </span>
                    </p>
                  ) : emailStatus.systemEmail.source === 'env-smtp' ? (
                    <p className="text-sm">
                      <span className="font-medium">Environment SMTP</span>{' '}
                      <span className="text-muted-foreground">(SMTP_HOST / SMTP_USER env)</span>
                    </p>
                  ) : emailStatus.systemEmail.source === 'env-resend' ? (
                    <p className="text-sm">
                      <span className="font-medium">Resend</span>{' '}
                      <span className="text-muted-foreground">(RESEND_API_KEY env)</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Connected</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This channel is managed by the platform. You cannot reconfigure it.
                </p>
              </CardContent>
            </Card>

            {/* ── Card 2: Marketing Email (tenant's own campaign channel) ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-full bg-teal-100 dark:bg-teal-900/40 shrink-0">
                      <Megaphone className="size-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">Marketing Email</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Newsletters, promotions & bulk campaigns
                      </p>
                    </div>
                  </div>
                  {emailStatus.marketingEmail.connected ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                      <CheckCircle2 className="size-3 mr-0.5" /> Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
                      <AlertCircle className="size-3 mr-0.5" /> Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {emailStatus.marketingEmail.connected ? (
                  <div className="space-y-2">
                    {emailStatus.marketingEmail.providers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {emailStatus.marketingEmail.providers.length} provider
                        {emailStatus.marketingEmail.providers.length === 1 ? '' : 's'} connected
                      </p>
                    )}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {emailStatus.marketingEmail.providers.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 p-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{p.name}</span>
                              {p.isDefault && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.fromEmail || '—'}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase shrink-0"
                          >
                            {p.providerType}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Connect your own email provider to send campaigns. Bulk email is sent through your domain to protect platform deliverability.
                    </p>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      size="sm"
                      onClick={() => setActiveView('emailProviders')}
                    >
                      <Plus className="size-4 mr-1.5" /> Connect Provider
                    </Button>
                  </div>
                )}

                {/* Supported provider type chips */}
                <div className="pt-1">
                  <p className="text-[11px] text-muted-foreground mb-1.5">Supported providers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKETING_PROVIDER_CHIPS.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Settings className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Communication Providers</h2>
            <p className="text-sm text-muted-foreground">Manage email, SMS, and WhatsApp providers</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="size-4 mr-1.5" /> Add Provider
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Providers', value: stats.total, icon: Globe, color: 'text-foreground' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Total Sent', value: formatNumber(stats.totalSent), icon: Send, color: 'text-emerald-600' },
          { label: 'Delivery Rate', value: `${stats.deliveryRate}%`, icon: Wifi, color: stats.deliveryRate >= 95 ? 'text-emerald-600' : stats.deliveryRate >= 80 ? 'text-amber-600' : 'text-red-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4', stat.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-56 mt-1" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-10 mt-1" /></div></div></Card>
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-8 w-full" /></div></Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <Settings className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Failed to load providers</p>
          <p className="text-sm mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchProviders}>
            <Loader2 className="size-4 mr-1.5" /> Retry
          </Button>
        </div>
      ) : providers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Settings className="size-14 mb-4 opacity-30" />
            <p className="text-lg font-medium">No communication providers configured</p>
            <p className="text-sm mt-1 mb-4">Add your first provider to start sending messages</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="size-4 mr-1.5" /> Add Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <ProviderSection
            title="Email Providers"
            icon={Mail}
            providers={emailProviders}
            emptyText="Add an email provider like Amazon SES, Resend, or SendGrid"
          />
          <ProviderSection
            title="SMS Providers"
            icon={Smartphone}
            providers={smsProviders}
            emptyText="Add an SMS provider like Twilio, MSG91, or Plivo"
          />
          <ProviderSection
            title="WhatsApp Providers"
            icon={MessageSquare}
            providers={whatsappProviders}
            emptyText="Add a WhatsApp provider like Meta Cloud API or 360Dialog"
          />
        </div>
      )}

      {/* Add Provider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Communication Provider</DialogTitle>
            <DialogDescription>Configure a new email, SMS, or WhatsApp provider.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={!formName.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Creating...</> : <><Plus className="size-4 mr-1.5" /> Create Provider</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingProvider(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication Provider</DialogTitle>
            <DialogDescription>Update provider configuration and settings.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingProvider(null); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!formName.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><Pencil className="size-4 mr-1.5" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this provider? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
              <Trash2 className="size-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
