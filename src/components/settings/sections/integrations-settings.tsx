'use client';

/**
 * Integrations section.
 *
 * Extracted from the legacy settings-view.tsx Integrations tab.
 * Self-contained: fetches its own webhooks + WordPress endpoints +
 * WhatsApp notification settings, manages all CRUD and test handlers.
 *
 * Three cards:
 *   1. WordPress / CRM Integration  — generate creds, test, manage endpoints
 *   2. WhatsApp Notifications       — owner + customer templates with AI gen
 *   3. Event Webhooks               — n8n/Zapier-style webhook registration
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  Zap,
  Plus,
  Trash2,
  TestTube2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  Copy,
  Download,
  Link2,
  Eye,
  EyeOff,
  FileCode,
  Phone,
  MessageSquare,
  Save,
  Globe,
  KeyRound,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────

interface EventWebhook {
  id: string;
  name: string;
  event: string;
  url: string;
  method: string;
  headersJson: string;
  active: boolean;
  retryOnFail: boolean;
  maxRetries: number;
  timeoutMs: number;
  lastTriggered: string | null;
  lastStatus: string | null;
  lastError: string | null;
  failCount: number;
  workspaceId: string | null;
  createdAt: string;
}

interface EventType {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface WpEndpointConfig {
  id: string;
  name: string;
  endpointId: string;
  apiKeyPrefix: string;
  source: string;
  active: boolean;
  totalReceived: number;
  lastReceived: string | null;
  lastError: string | null;
  sendWhatsApp: boolean;
  webhookUrl: string;
  apiUrl: string;
  createdAt: string;
  _count?: { logs: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  'job.created': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'job.assigned': 'bg-teal-100 text-teal-700 border-teal-200',
  'job.accepted': 'bg-sky-100 text-sky-700 border-sky-200',
  'job.started': 'bg-amber-100 text-amber-700 border-amber-200',
  'job.completed': 'bg-green-100 text-green-700 border-green-200',
  'job.cancelled': 'bg-red-100 text-red-700 border-red-200',
  'job.rejected': 'bg-orange-100 text-orange-700 border-orange-200',
};

const WP_FORM_PLUGINS = [
  { name: 'Contact Form 7', slug: 'cf7' },
  { name: 'WPForms', slug: 'wpforms' },
  { name: 'Gravity Forms', slug: 'gravity' },
  { name: 'Fluent Forms', slug: 'fluent' },
  { name: 'Elementor Forms', slug: 'elementor' },
];

const DEFAULT_OWNER_TEMPLATE =
  '🎯 New Lead from Website!\n\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nService: {{serviceType}}\nMessage: {{description}}\n\nFollow up promptly!';
const DEFAULT_CUSTOMER_TEMPLATE =
  'Thank you for contacting us, {{name}}! 🙏\n\nWe have received your inquiry about {{serviceType}}. Our team will contact you shortly.\n\n— {{companyName}}';

// ─── Component ─────────────────────────────────────────────────────────────

export function IntegrationsSettings() {
  // ─── Event Webhooks State ─────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<EventWebhook[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    event: 'job.created',
    url: '',
    method: 'POST',
    active: true,
  });

  // ─── WordPress Integration State ──────────────────────────────────────
  const [wpEndpoints, setWpEndpoints] = useState<WpEndpointConfig[]>([]);
  const [wpLoading, setWpLoading] = useState(true);
  const [wpGenerating, setWpGenerating] = useState(false);
  const [wpNewConfig, setWpNewConfig] = useState<{
    api_url: string;
    api_key: string;
    webhook_url: string;
    endpoint_id: string;
  } | null>(null);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpShowApiKey, setWpShowApiKey] = useState(false);

  // ─── WhatsApp Business Phone State ────────────────────────────────────
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [ownerTemplate, setOwnerTemplate] = useState(DEFAULT_OWNER_TEMPLATE);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [customerTemplate, setCustomerTemplate] = useState(DEFAULT_CUSTOMER_TEMPLATE);
  const [whatsappSettingsSaving, setWhatsappSettingsSaving] = useState(false);
  const [editingFieldMapping, setEditingFieldMapping] = useState(false);

  // ─── Fetchers ─────────────────────────────────────────────────────────
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/event-webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
        setEventTypes(data.eventTypes || []);
      }
    } catch {
      // silently fail
    } finally {
      setWebhookLoading(false);
    }
  }, []);

  const fetchWpEndpoints = useCallback(async () => {
    setWpLoading(true);
    try {
      const res = await fetch('/api/wordpress/config');
      if (res.ok) {
        const data = await res.json();
        setWpEndpoints(data.endpoints || []);
      }
    } catch {
      // silently fail
    } finally {
      setWpLoading(false);
    }
  }, []);

  const fetchTenantForWhatsapp = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (authRes.ok) {
        const authData = await authRes.json();
        const tenant = authData.tenant;
        if (tenant) {
          setWhatsappPhone(tenant.whatsappPhone || '');
          try {
            const settings = tenant.settingsJson ? JSON.parse(tenant.settingsJson) : {};
            if (settings.notifyOwner !== undefined) setNotifyOwner(settings.notifyOwner);
            if (settings.ownerTemplate) setOwnerTemplate(settings.ownerTemplate);
            if (settings.notifyCustomer !== undefined) setNotifyCustomer(settings.notifyCustomer);
            if (settings.customerTemplate) setCustomerTemplate(settings.customerTemplate);
          } catch {
            // ignore malformed settingsJson
          }
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
    fetchWpEndpoints();
    fetchTenantForWhatsapp();
  }, [fetchWebhooks, fetchWpEndpoints, fetchTenantForWhatsapp]);

  // ─── Handlers: WhatsApp Settings ──────────────────────────────────────
  const handleSaveWhatsappSettings = async () => {
    setWhatsappSettingsSaving(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) { toast.error('Not authenticated'); return; }
      const authData = await authRes.json();
      const tid = authData.tenant?.id;
      if (!tid) { toast.error('No tenant found'); return; }
      const res = await fetch(`/api/tenants/${tid}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhone,
          settingsJson: JSON.stringify({
            notifyOwner,
            ownerTemplate,
            notifyCustomer,
            customerTemplate,
          }),
        }),
      });
      if (res.ok) { toast.success('WhatsApp notification settings saved'); }
      else { toast.error('Failed to save settings'); }
    } catch {
      toast.error('Network error');
    } finally {
      setWhatsappSettingsSaving(false);
    }
  };

  const handleAiGenerate = async (type: 'owner' | 'customer') => {
    try {
      const res = await fetch('/api/whatsapp/generate-template?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'owner') setOwnerTemplate(data.template);
        else setCustomerTemplate(data.template);
        toast.success('Template generated with AI');
      } else {
        toast.error('Failed to generate template');
      }
    } catch {
      toast.error('AI generation failed');
    }
  };

  // ─── Handlers: WordPress ──────────────────────────────────────────────
  const handleGenerateWpConfig = async () => {
    setWpGenerating(true);
    try {
      const res = await fetch('/api/wordpress/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'WordPress Lead Capture',
          sendWhatsApp: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWpNewConfig(data.config);
        setWpShowApiKey(true);
        toast.success('WordPress integration configured! Copy your credentials below.');
        fetchWpEndpoints();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate config');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setWpGenerating(false);
    }
  };

  const handleTestWpConnection = async () => {
    if (!wpNewConfig?.api_key) {
      toast.error('Generate a config first');
      return;
    }
    setWpTesting(true);
    try {
      const res = await fetch('/api/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: wpNewConfig.api_key }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Connection successful! ServiceOS is ready to receive leads.');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setWpTesting(false);
    }
  };

  const handleDeleteWpEndpoint = async (id: string) => {
    try {
      const res = await fetch(`/api/wordpress/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('WordPress endpoint deleted');
        fetchWpEndpoints();
        if (wpNewConfig && wpEndpoints.find((e) => e.id === id)) {
          setWpNewConfig(null);
        }
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Value'} copied to clipboard`);
  };

  // ─── Handlers: Webhooks ───────────────────────────────────────────────
  const handleAddWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const res = await fetch('/api/event-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });
      if (res.ok) {
        toast.success('Event webhook created');
        setShowAddWebhook(false);
        setWebhookForm({ name: '', event: 'job.created', url: '', method: 'POST', active: true });
        fetchWebhooks();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/event-webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/event-webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        toast.success(active ? 'Webhook enabled' : 'Webhook disabled');
        fetchWebhooks();
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleTestWebhook = async (event: string) => {
    setTestingWebhook(event);
    try {
      const res = await fetch('/api/event-webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (data.successCount > 0) {
        toast.success(`Test sent: ${data.successCount} webhook(s) triggered`);
      } else if (data.totalWebhooks === 0) {
        toast.info('No active webhooks configured for this event');
      } else {
        toast.error('All webhooks failed — check the URLs');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Card 1: WordPress / CRM Integration ─────────────────────────── */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Plug className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">WordPress / CRM Integration</CardTitle>
                <CardDescription>Connect WordPress forms to capture leads directly</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleGenerateWpConfig}
              disabled={wpGenerating}
            >
              {wpGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              Generate
            </Button>
          </div>

          {/* Lead Capture Flow diagram */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
              <ArrowRight className="size-3" /> Lead Capture Flow
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WordPress Form</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">ServiceOS API</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">Lead Created</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WhatsApp Sent</span>
            </div>
          </div>

          {/* Supported form plugins */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WP_FORM_PLUGINS.map((fp) => (
              <Badge key={fp.slug} variant="outline" className="text-[10px] bg-background">
                {fp.name}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Newly generated config display */}
          {wpNewConfig && (
            <div className="p-4 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">Integration Configured!</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" variant="outline">New</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Copy these values into your WordPress plugin settings. The API Key is shown only once.</p>

              {/* API URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="size-3" /> API URL
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                    {wpNewConfig.api_url}
                  </code>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.api_url, 'API URL')}>
                    <Copy className="size-3" /> Copy
                  </Button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <KeyRound className="size-3" /> API Key
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Show once</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                    {wpShowApiKey ? wpNewConfig.api_key : wpNewConfig.api_key.slice(0, 12) + '••••••••••••••••'}
                  </code>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setWpShowApiKey(!wpShowApiKey)}>
                    {wpShowApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.api_key, 'API Key')}>
                    <Copy className="size-3" /> Copy
                  </Button>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Link2 className="size-3" /> Webhook URL
                  <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200">Universal</Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                    {wpNewConfig.webhook_url}
                  </code>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.webhook_url, 'Webhook URL')}>
                    <Copy className="size-3" /> Copy
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleTestWpConnection}
                  disabled={wpTesting}
                >
                  {wpTesting ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />}
                  Test Connection
                </Button>
                <a
                  href="/downloads/serviceos-crm-lead-capture.php"
                  download="serviceos-crm-lead-capture.php"
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Download className="size-3" /> Download Plugin
                </a>
              </div>
            </div>
          )}

          {/* WordPress Plugin download row */}
          {!wpNewConfig && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
              <FileCode className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">WordPress Plugin</p>
              </div>
              <a
                href="/downloads/serviceos-crm-lead-capture.php"
                download="serviceos-crm-lead-capture.php"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
              >
                <Download className="size-3" /> Download
              </a>
            </div>
          )}

          {/* Active Endpoints */}
          {wpLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" /> Loading endpoints...
            </div>
          ) : wpEndpoints.length > 0 ? (
            <div className="space-y-2">
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Active Endpoints</p>
              {wpEndpoints.map((ep) => (
                <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{ep.name}</span>
                      <Badge className={ep.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'} variant="outline">
                        <span className="text-[10px]">{ep.active ? 'Active' : 'Inactive'}</span>
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono truncate block">{ep.apiUrl}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                    onClick={() => handleDeleteWpEndpoint(ep.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Auto-Mapped Form Fields */}
          <div>
            <Separator className="mb-3" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Auto-Mapped Form Fields</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={() => setEditingFieldMapping(!editingFieldMapping)}
              >
                <Pencil className="size-3" />
                {editingFieldMapping ? 'Done' : 'Edit'}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { field: 'name', source: 'your-name' },
                { field: 'phone', source: 'your-phone' },
                { field: 'email', source: 'your-email' },
                { field: 'serviceType', source: 'your-subject' },
                { field: 'description', source: 'your-message' },
                { field: 'address', source: 'your-address' },
              ].map((fm) => (
                <div key={fm.field} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    {fm.field}
                  </Badge>
                  <span className="text-muted-foreground">←</span>
                  <span className="text-muted-foreground truncate">{fm.source}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Card 2: WhatsApp Notifications ──────────────────────────────── */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MessageSquare className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Notifications</CardTitle>
              <CardDescription>Configure WhatsApp messages for WordPress form submissions</CardDescription>
            </div>
          </div>

          {/* Notification Flow diagram */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
              <ArrowRight className="size-3" /> Notification Flow
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Form Submit</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Lead Created</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">Owner WhatsApp</span>
              <span className="text-[10px] text-muted-foreground mx-1">+</span>
              <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-medium">Customer WhatsApp</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Section 1: Notify Business Owner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-600" />
                <div>
                  <Label className="text-sm font-medium">Notify Business Owner</Label>
                  <p className="text-xs text-muted-foreground">Send a WhatsApp notification to the business owner when a new lead arrives</p>
                </div>
              </div>
              <Switch checked={notifyOwner} onCheckedChange={setNotifyOwner} />
            </div>

            {notifyOwner && (
              <div className="ml-6 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Phone className="size-3" /> Owner WhatsApp Number
                  </Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Owner Message Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                      onClick={() => handleAiGenerate('owner')}
                    >
                      <Sparkles className="size-3" /> AI Generate
                    </Button>
                  </div>
                  <Textarea
                    rows={8}
                    value={ownerTemplate}
                    onChange={(e) => setOwnerTemplate(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{address}}'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 2: Auto-Reply to Customer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-sky-600" />
                <div>
                  <Label className="text-sm font-medium">Auto-Reply to Customer</Label>
                  <p className="text-xs text-muted-foreground">Automatically send a WhatsApp reply to the customer who submitted the form</p>
                </div>
              </div>
              <Switch checked={notifyCustomer} onCheckedChange={setNotifyCustomer} />
            </div>

            {notifyCustomer && (
              <div className="ml-6 pl-4 border-l-2 border-sky-200 dark:border-sky-800 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Customer Message Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-xs text-sky-600 hover:text-sky-700"
                      onClick={() => handleAiGenerate('customer')}
                    >
                      <Sparkles className="size-3" /> AI Generate
                    </Button>
                  </div>
                  <Textarea
                    rows={6}
                    value={customerTemplate}
                    onChange={(e) => setCustomerTemplate(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{companyName}}'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 min-w-[160px]"
              onClick={handleSaveWhatsappSettings}
              disabled={whatsappSettingsSaving}
            >
              {whatsappSettingsSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save WhatsApp Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Card 3: Event Webhooks ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Event Webhooks</CardTitle>
                <CardDescription>Configure n8n / Zapier webhooks on job events</CardDescription>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setShowAddWebhook(true)}>
              <Plus className="size-3.5" /> Add Webhook
            </Button>
          </div>

          {/* Flow diagram */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <Zap className="size-3" /> How it works
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Job Event</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Save to DB</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">POST to n8n</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WhatsApp</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {webhookLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading webhooks...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No event webhooks configured</p>
              <p className="text-xs">Add a webhook URL to trigger n8n workflows when job events occur</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{wh.name}</span>
                        <Badge variant="outline" className={`${EVENT_COLORS[wh.event] || 'bg-gray-100 text-gray-600'} text-[10px] shrink-0`}>
                          {wh.event.replace('job.', '')}
                        </Badge>
                        {wh.active ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] shrink-0" variant="outline">
                            <CheckCircle2 className="size-2.5 mr-0.5" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] shrink-0" variant="outline">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                      {wh.lastTriggered && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          Last: {new Date(wh.lastTriggered).toLocaleString()}
                          {wh.lastStatus === 'success' && <CheckCircle2 className="size-2.5 text-emerald-500" />}
                          {wh.lastStatus === 'failed' && <XCircle className="size-2.5 text-red-500" />}
                          {wh.failCount > 0 && <span className="text-red-500">({wh.failCount} failures)</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTestWebhook(wh.event)}
                        disabled={testingWebhook === wh.event}
                        title="Test this webhook"
                      >
                        {testingWebhook === wh.event ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <TestTube2 className="size-3.5" />
                        )}
                      </Button>
                      <Switch
                        checked={wh.active}
                        onCheckedChange={(checked) => handleToggleWebhook(wh.id, checked)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteWebhook(wh.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Available Events */}
          {eventTypes.length > 0 && (
            <div className="mt-4">
              <Separator className="mb-3" />
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Events</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {eventTypes.map((et) => (
                  <button
                    key={et.value}
                    className="flex items-center gap-2 p-2 rounded-md border text-xs hover:bg-muted/50 transition-colors text-left"
                    onClick={() => {
                      setWebhookForm({ ...webhookForm, event: et.value, name: `n8n - ${et.label}` });
                      setShowAddWebhook(true);
                    }}
                  >
                    <Badge variant="outline" className={`${EVENT_COLORS[et.value] || ''} text-[9px] shrink-0`}>
                      {et.value.replace('job.', '')}
                    </Badge>
                    <span className="truncate">{et.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Event Webhook</DialogTitle>
            <DialogDescription>Configure a webhook URL (e.g., n8n workflow) that fires when a job event occurs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input
                placeholder="e.g., n8n - Job Created → WhatsApp Employee"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Event Trigger</Label>
              <Select value={webhookForm.event} onValueChange={(v) => setWebhookForm({ ...webhookForm, event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eventTypes.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label} — {et.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://n8n.yourdomain.com/webhook/abc123"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                The URL from your n8n workflow webhook trigger. ServiceOS will POST job data here when the event fires.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-[10px] text-muted-foreground">Enable this webhook immediately</p>
              </div>
              <Switch
                checked={webhookForm.active}
                onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAddWebhook}
              disabled={!webhookForm.name || !webhookForm.url}
            >
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
