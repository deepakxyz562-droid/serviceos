'use client';

/**
 * Integrations section.
 *
 * Extracted from the legacy settings-view.tsx Integrations tab.
 * Self-contained: fetches its own webhooks + WordPress endpoints +
 * WhatsApp notification settings, manages all CRUD and test handlers.
 *
 * Four cards:
 *   1. WordPress / CRM Integration  — generate creds, test, manage endpoints
 *   2. Website Form Integration     — universal embed script + API for any site
 *   3. WhatsApp Notifications       — owner + customer templates with AI gen
 *   4. Event Webhooks               — n8n/Zapier-style webhook registration
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
  Code2,
  Webhook,
  ExternalLink,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

interface WebformEndpointConfig {
  id: string;
  name: string;
  endpointId: string;
  apiKeyPrefix: string;
  apiKey?: string; // only present on freshly-generated
  source: string;
  active: boolean;
  totalReceived: number;
  lastReceived: string | null;
  sendWhatsApp: boolean;
  apiUrl: string;
  embedScriptUrl: string;
  createdAt: string;
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

  // ─── Website Form Integration State ───────────────────────────────────
  const [wfEndpoints, setWfEndpoints] = useState<WebformEndpointConfig[]>([]);
  const [wfLoading, setWfLoading] = useState(true);
  const [wfGenerating, setWfGenerating] = useState(false);
  const [wfNewConfig, setWfNewConfig] = useState<{
    apiKey: string;
    apiUrl: string;
    embedScriptUrl: string;
    snippet: string;
  } | null>(null);
  const [wfTesting, setWfTesting] = useState(false);
  const [wfShowApiKey, setWfShowApiKey] = useState(false);
  const [wfCopied, setWfCopied] = useState(false);
  const [jotformCopied, setJotformCopied] = useState(false);

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

  const fetchWfEndpoints = useCallback(async () => {
    setWfLoading(true);
    try {
      const res = await fetch('/api/webform/config');
      if (res.ok) {
        const data = await res.json();
        setWfEndpoints(data.endpoints || []);
      }
    } catch {
      // silently fail
    } finally {
      setWfLoading(false);
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
    fetchWfEndpoints();
    fetchTenantForWhatsapp();
  }, [fetchWebhooks, fetchWpEndpoints, fetchWfEndpoints, fetchTenantForWhatsapp]);

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
        toast.success('Connection successful! Fieseros is ready to receive leads.');
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

  // ─── Handlers: Website Form Integration ───────────────────────────────
  const handleGenerateWfConfig = async () => {
    setWfGenerating(true);
    try {
      const res = await fetch('/api/webform/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Website Form Capture' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const ep = data.endpoint;
        const snippet = `<script src="${ep.embedScriptUrl}" data-key="${ep.apiKey}" async></script>`;
        setWfNewConfig({
          apiKey: ep.apiKey,
          apiUrl: ep.apiUrl,
          embedScriptUrl: ep.embedScriptUrl,
          snippet,
        });
        toast.success('Website form integration created! Copy the snippet below.');
        fetchWfEndpoints();
      } else {
        toast.error(data.error || 'Failed to create integration');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setWfGenerating(false);
    }
  };

  const handleTestWfConnection = async () => {
    if (!wfNewConfig?.apiKey) return;
    setWfTesting(true);
    try {
      const res = await fetch('/api/forms/leads', {
        headers: { 'X-API-Key': wfNewConfig.apiKey },
      });
      const data = await res.json();
      if (res.ok && data.status === 'connected') {
        toast.success('Connection successful! Your form integration is working.');
      } else if (res.ok && data.status === 'ok') {
        toast.success('Endpoint reachable. API key is required for full test.');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch {
      toast.error('Network error during test');
    } finally {
      setWfTesting(false);
    }
  };

  const handleDeleteWfEndpoint = async (id: string) => {
    try {
      const res = await fetch(`/api/webform/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Website form endpoint deleted');
        fetchWfEndpoints();
        if (wfNewConfig && wfEndpoints.find((e) => e.id === id)) {
          setWfNewConfig(null);
        }
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCopySnippet = () => {
    if (!wfNewConfig?.snippet) return;
    navigator.clipboard.writeText(wfNewConfig.snippet);
    setWfCopied(true);
    toast.success('Embed snippet copied to clipboard');
    setTimeout(() => setWfCopied(false), 2000);
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
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Fieseros API</span>
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
                  href="/downloads/fieseros-crm-lead-capture.php"
                  download="fieseros-crm-lead-capture.php"
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
                href="/downloads/fieseros-crm-lead-capture.php"
                download="fieseros-crm-lead-capture.php"
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

      {/* ─── Card 2: Website Form Integration ────────────────────────────── */}
      <Card className="border-sky-200 dark:border-sky-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Globe className="size-4 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-base">Website Form Integration</CardTitle>
                <CardDescription>Capture leads from any website — HTML, React, Next.js, PHP, JotForm, Typeform &amp; more</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 gap-1.5"
              onClick={handleGenerateWfConfig}
              disabled={wfGenerating}
            >
              {wfGenerating ? (
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
              <ArrowRight className="size-3" /> Universal Lead Capture Flow
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Any Website Form</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">embed.js</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">/api/forms/leads</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-medium">Lead Created</span>
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WhatsApp Sent</span>
            </div>
          </div>

          {/* Supported platforms */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              'HTML', 'React', 'Next.js', 'Vue', 'PHP', 'JotForm', 'Typeform', 'Google Forms', 'Webflow', 'Custom',
            ].map((platform) => (
              <Badge key={platform} variant="outline" className="text-[10px] bg-background">
                {platform}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Newly generated config display */}
          {wfNewConfig && (
            <div className="p-4 rounded-lg border-2 border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/20 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-sky-600" />
                <span className="font-semibold text-sky-700 dark:text-sky-400 text-sm">Integration Ready!</span>
                <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px]" variant="outline">New</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste the embed script into your website&apos;s <code className="text-[11px] bg-background px-1 rounded">&lt;head&gt;</code> or before
                <code className="text-[11px] bg-background px-1 rounded">&lt;/body&gt;</code>. The API Key is shown only once.
              </p>

              <Tabs defaultValue="embed" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="embed" className="text-xs gap-1.5">
                    <Code2 className="size-3" /> Embed Script
                  </TabsTrigger>
                  <TabsTrigger value="api" className="text-xs gap-1.5">
                    <FileCode className="size-3" /> API Reference
                  </TabsTrigger>
                </TabsList>

                {/* ─── Embed Script tab ─── */}
                <TabsContent value="embed" className="space-y-3 mt-3">
                  {/* Embed snippet */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Code2 className="size-3" /> Embed Snippet
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">Paste in &lt;head&gt;</Badge>
                    </Label>
                    <div className="relative">
                      <pre className="text-[11px] font-mono bg-gray-950 text-gray-100 px-3 py-2.5 rounded-md border overflow-x-auto whitespace-pre-wrap break-all">
                        {wfNewConfig.snippet}
                      </pre>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-1.5 right-1.5 h-6 gap-1 text-[11px]"
                        onClick={handleCopySnippet}
                      >
                        {wfCopied ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
                        {wfCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      The script auto-detects all <code className="text-[10px]">&lt;form&gt;</code> submissions. Add
                      <code className="text-[10px] bg-muted px-1 rounded">data-fieseros=&quot;false&quot;</code> to any form to opt out.
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <KeyRound className="size-3" /> API Key
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Show once</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                        {wfShowApiKey ? wfNewConfig.apiKey : wfNewConfig.apiKey.slice(0, 16) + '••••••••••••••••'}
                      </code>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setWfShowApiKey(!wfShowApiKey)}>
                        {wfShowApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </Button>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wfNewConfig.apiKey, 'API Key')}>
                        <Copy className="size-3" /> Copy
                      </Button>
                    </div>
                  </div>

                  {/* API URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Link2 className="size-3" /> API Endpoint
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                        {wfNewConfig.apiUrl}
                      </code>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wfNewConfig.apiUrl, 'API URL')}>
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
                      onClick={handleTestWfConnection}
                      disabled={wfTesting}
                    >
                      {wfTesting ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />}
                      Test Connection
                    </Button>
                    <a
                      href={wfNewConfig.embedScriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Globe className="size-3" /> View embed.js
                    </a>
                  </div>
                </TabsContent>

                {/* ─── API Reference tab ─── */}
                <TabsContent value="api" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    For server-to-server integration (PHP, Node, Python, etc.), POST form data directly to the API endpoint.
                  </p>

                  {/* cURL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">cURL</Label>
                    <pre className="text-[11px] font-mono bg-gray-950 text-gray-100 px-3 py-2.5 rounded-md border overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST ${wfNewConfig.apiUrl} \\
  -H "Authorization: Bearer ${wfNewConfig.apiKey.slice(0, 8)}••••" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John Doe","phone":"+61412345678","email":"john@example.com","message":"I need a plumber"}'`}
                    </pre>
                  </div>

                  {/* PHP */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">PHP</Label>
                    <pre className="text-[11px] font-mono bg-gray-950 text-gray-100 px-3 py-2.5 rounded-md border overflow-x-auto whitespace-pre-wrap break-all">
{`<?php
$ch = curl_init("${wfNewConfig.apiUrl}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer ${wfNewConfig.apiKey.slice(0, 8)}••••",
  "Content-Type: application/json",
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($_POST));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);`}
                    </pre>
                  </div>

                  {/* Node.js */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Node.js (fetch)</Label>
                    <pre className="text-[11px] font-mono bg-gray-950 text-gray-100 px-3 py-2.5 rounded-md border overflow-x-auto whitespace-pre-wrap break-all">
{`await fetch("${wfNewConfig.apiUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${wfNewConfig.apiKey.slice(0, 8)}••••",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name, phone, email, message }),
});`}
                    </pre>
                  </div>

                  {/* JotForm webhook note */}
                  <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-medium">JotForm / Typeform / Google Forms users:</p>
                        <p>
                          Add <code className="text-[10px] bg-background px-1 rounded">{wfNewConfig.apiUrl}</code> as a webhook URL in your form
                          builder&apos;s notification settings. Use the API key in the <code className="text-[10px] bg-background px-1 rounded">Authorization: Bearer</code> header.
                          Field mapping is automatic.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Getting started guide */}
          {!wfNewConfig && (
            <div className="p-3 rounded-lg border border-dashed bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium">How it works</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside ml-1">
                <li>Click <span className="font-medium text-foreground">Generate</span> to create a publishable API key.</li>
                <li>Copy the <span className="font-medium text-foreground">embed snippet</span> and paste it into your website&apos;s <code className="text-[10px] bg-background px-1 rounded">&lt;head&gt;</code>.</li>
                <li>The script auto-detects all form submissions and sends leads to Fieseros.</li>
                <li>Leads appear instantly in your CRM with WhatsApp notifications.</li>
              </ol>
            </div>
          )}

          {/* ─── JotForm Webhook Setup sub-section ─── */}
          <Separator />
          <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-md bg-amber-100 dark:bg-amber-900/40 shrink-0">
                <Webhook className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 flex-wrap">
                  Using JotForm? Use Webhooks Instead
                  <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                    Cross-origin iframe
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  JotForm embeds forms in a cross-origin iframe, so our universal JavaScript cannot capture
                  submissions automatically. Instead, use JotForm&apos;s native Webhook integration to send
                  submissions directly to Fieseros.
                </p>
              </div>
            </div>

            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside ml-1.5">
              <li>
                In JotForm Form Builder → <span className="font-medium text-foreground">Settings</span> →{' '}
                <span className="font-medium text-foreground">Integrations</span> → search{' '}
                <span className="font-medium text-foreground">&quot;Webhook&quot;</span> → click{' '}
                <span className="font-medium text-foreground">Add</span>.
              </li>
              <li>Paste this URL into the <span className="font-medium text-foreground">Webhook Endpoint</span> field:</li>
            </ol>

            {/* Webhook URL + copy button */}
            <div className="space-y-1.5 ml-1.5">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    wfNewConfig?.apiKey
                      ? `${wfNewConfig.apiUrl}?key=${wfNewConfig.apiKey}`
                      : (wfEndpoints[0]?.apiUrl
                          ? `${wfEndpoints[0].apiUrl}?key=${wfEndpoints[0].apiKeyPrefix || 'YOUR_API_KEY'}…`
                          : 'Generate an API key above to reveal your webhook URL')
                  }
                  className="text-[11px] font-mono bg-white dark:bg-gray-900 h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 h-8"
                  disabled={!wfNewConfig?.apiKey}
                  onClick={() => {
                    if (!wfNewConfig?.apiKey) return;
                    const url = `${wfNewConfig.apiUrl}?key=${wfNewConfig.apiKey}`;
                    navigator.clipboard.writeText(url);
                    setJotformCopied(true);
                    toast.success('JotForm webhook URL copied to clipboard');
                    setTimeout(() => setJotformCopied(false), 2000);
                  }}
                >
                  {jotformCopied ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
                  {jotformCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {!wfNewConfig?.apiKey && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <KeyRound className="size-3" />
                  {wfEndpoints.length > 0
                    ? 'Generate a new API key above to view the complete webhook URL with key. (Existing keys are masked for security.)'
                    : 'Click the Generate button at the top of this card to create an API key first.'}
                </p>
              )}
            </div>

            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside ml-1.5" start={3}>
              <li>Click <span className="font-medium text-foreground">Finish</span> in JotForm, then submit a test form.</li>
              <li>
                Check the <span className="font-medium text-foreground">Active Endpoints</span> list below — the{' '}
                <code className="text-[10px] bg-background px-1 rounded">totalReceived</code> counter should increment.
              </li>
            </ol>

            <Alert className="bg-white/70 dark:bg-gray-900/40 border-amber-200 dark:border-amber-800">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Automatic Field Mapping
              </AlertTitle>
              <AlertDescription className="text-[11px] text-amber-800 dark:text-amber-300">
                Field mapping is automatic. JotForm fields like{' '}
                <code className="text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1 rounded">q1_name</code>,{' '}
                <code className="text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1 rounded">q2_email4</code>,{' '}
                <code className="text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1 rounded">q3_phone</code> are mapped to lead
                name, email, phone. Custom field names may require manual mapping (coming soon).
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ExternalLink className="size-3" />
              <a
                href="https://www.jotform.com/help/245-How-to-Create-a-Webhook-in-JotForm/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 dark:text-amber-400 hover:underline"
              >
                JotForm Webhook setup docs
              </a>
            </div>
          </div>

          {/* Active Endpoints */}
          {wfLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" /> Loading endpoints...
            </div>
          ) : wfEndpoints.length > 0 ? (
            <div className="space-y-2">
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Active Endpoints</p>
              {wfEndpoints.map((ep) => (
                <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{ep.name}</span>
                      <Badge className={ep.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'} variant="outline">
                        <span className="text-[10px]">{ep.active ? 'Active' : 'Inactive'}</span>
                      </Badge>
                      {ep.totalReceived > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                          {ep.totalReceived} leads
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono truncate block">
                      {ep.apiKeyPrefix} · {ep.apiUrl}
                    </span>
                    {ep.lastReceived && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Last lead: {new Date(ep.lastReceived).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                    onClick={() => handleDeleteWfEndpoint(ep.id)}
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
            <p className="text-xs font-medium text-muted-foreground mb-2">Auto-Mapped Form Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { field: 'name', source: 'name, full_name, your-name, first_name' },
                { field: 'phone', source: 'phone, mobile, tel, your-phone, whatsapp' },
                { field: 'email', source: 'email, your-email, contact_email' },
                { field: 'serviceType', source: 'service, subject, inquiry_type, topic' },
                { field: 'description', source: 'message, description, notes, comments' },
                { field: 'address', source: 'address, street, city, location' },
              ].map((fm) => (
                <div key={fm.field} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                  <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200 shrink-0">
                    {fm.field}
                  </Badge>
                  <span className="text-muted-foreground">←</span>
                  <span className="text-muted-foreground truncate">{fm.source}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Fields are auto-detected by name, id, label, placeholder, and autocomplete attributes. Custom mapping available via API.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Card 3: WhatsApp Notifications ──────────────────────────────── */}
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
                The URL from your n8n workflow webhook trigger. Fieseros will POST job data here when the event fires.
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
