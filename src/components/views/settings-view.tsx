'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  KeyRound,
  Palette,
  Globe,
  Shield,
  Bell,
  Code,
  ExternalLink,
  Zap,
  Plus,
  Trash2,
  TestTube2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  AlertCircle,
  Copy,
  Download,
  Link2,
  Eye,
  EyeOff,
  Plug,
  FileCode,
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
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

// ─── Event Webhook Types ──────────────────────────────────────────────────

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

// ─── WordPress Integration Types ──────────────────────────────────────────

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

const EVENT_COLORS: Record<string, string> = {
  'job.created': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'job.assigned': 'bg-blue-100 text-blue-700 border-blue-200',
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

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsView() {
  const { darkMode, toggleDarkMode } = useAppStore();

  // Event webhooks state
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

  // ─── WordPress Integration State ─────────────────────────────────────────
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

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await authFetch('/api/event-webhooks');
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
      const res = await authFetch('/api/wordpress/config');
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

  useEffect(() => { fetchWebhooks(); fetchWpEndpoints(); }, [fetchWebhooks, fetchWpEndpoints]);

  // ─── WordPress: Generate & Configure ─────────────────────────────────────
  const handleGenerateWpConfig = async () => {
    setWpGenerating(true);
    try {
      const res = await authFetch('/api/wordpress/config', {
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

  // ─── WordPress: Test Connection ──────────────────────────────────────────
  const handleTestWpConnection = async () => {
    if (!wpNewConfig?.api_key) {
      toast.error('Generate a config first');
      return;
    }
    setWpTesting(true);
    try {
      const res = await authFetch('/api/wordpress/test', {
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

  // ─── WordPress: Delete Endpoint ──────────────────────────────────────────
  const handleDeleteWpEndpoint = async (id: string) => {
    try {
      const res = await authFetch(`/api/wordpress/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('WordPress endpoint deleted');
        fetchWpEndpoints();
        if (wpNewConfig && wpEndpoints.find(e => e.id === id)) {
          setWpNewConfig(null);
        }
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Copy helper ─────────────────────────────────────────────────────────
  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Value'} copied to clipboard`);
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const res = await authFetch('/api/event-webhooks', {
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
      const res = await authFetch(`/api/event-webhooks/${id}`, { method: 'DELETE' });
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
      const res = await authFetch(`/api/event-webhooks/${id}`, {
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
      const res = await authFetch('/api/event-webhooks/test', {
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <SettingsIcon className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Configure general application settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle dark mode theme</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Auto-save Workflows</Label>
              <p className="text-xs text-muted-foreground">Automatically save workflow changes</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Timezone</Label>
            <Input placeholder="UTC" defaultValue="UTC" className="max-w-xs" />
            <p className="text-xs text-muted-foreground">Timezone used for scheduling workflows</p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          WordPress / CRM Integration
          ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Plug className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">WordPress / CRM Integration</CardTitle>
                <CardDescription>Connect WordPress forms to capture leads directly into ServiceOS</CardDescription>
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
              Generate &amp; Configure
            </Button>
          </div>

          {/* Flow diagram */}
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
              <ArrowRight className="size-3" />
              <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Pipeline</span>
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
          {/* ─── Newly generated config display ─────────────────────────── */}
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

          {/* ─── Download Plugin (always visible) ──────────────────────── */}
          {!wpNewConfig && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
              <FileCode className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">WordPress Plugin</p>
                <p className="text-xs text-muted-foreground">Download the ServiceOS CRM Lead Capture plugin for WordPress</p>
              </div>
              <a
                href="/downloads/serviceos-crm-lead-capture.php"
                download="serviceos-crm-lead-capture.php"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
              >
                <Download className="size-3" /> Download Plugin
              </a>
            </div>
          )}

          {/* ─── Existing endpoints ─────────────────────────────────────── */}
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
                      {ep.totalReceived > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                          {ep.totalReceived} lead{ep.totalReceived !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono truncate">{ep.apiUrl}</span>
                    </div>
                    {ep.lastReceived && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="size-2.5" />
                        Last lead: {new Date(ep.lastReceived).toLocaleString()}
                      </div>
                    )}
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
          ) : !wpNewConfig ? (
            <div className="text-center py-6 text-muted-foreground">
              <Plug className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No WordPress endpoints configured</p>
              <p className="text-xs">Click &quot;Generate &amp; Configure&quot; to create one instantly</p>
            </div>
          ) : null}

          {/* ─── Field mapping reference ────────────────────────────────── */}
          <div>
            <Separator className="mb-3" />
            <p className="text-xs font-medium text-muted-foreground mb-2">Auto-Mapped Form Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { field: 'Name', keys: 'your-name, name, full_name' },
                { field: 'Phone', keys: 'your-phone, phone, mobile' },
                { field: 'Email', keys: 'your-email, email' },
                { field: 'Subject', keys: 'your-subject, subject, service' },
                { field: 'Message', keys: 'your-message, message, description' },
                { field: 'Address', keys: 'your-address, address, location' },
              ].map((fm) => (
                <div key={fm.field} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    {fm.field}
                  </Badge>
                  <span className="text-muted-foreground truncate">{fm.keys}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <KeyRound className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>Manage your API keys for external integrations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Production API Key</p>
                <p className="text-xs text-muted-foreground font-mono">ff_prod_••••••••••••k8m2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
              <Button variant="ghost" size="sm" className="min-h-[36px]">Revoke</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Development API Key</p>
                <p className="text-xs text-muted-foreground font-mono">ff_dev_••••••••••••a7n4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
              <Button variant="ghost" size="sm" className="min-h-[36px]">Revoke</Button>
            </div>
          </div>
          <Button variant="outline" className="gap-2 min-h-[44px]">
            <KeyRound className="size-3.5" />
            Generate New Key
          </Button>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Code className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Environment Variables</CardTitle>
              <CardDescription>Manage environment variables for workflows</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'DATABASE_URL', value: '••••••••••••' },
            { key: 'SMTP_HOST', value: 'smtp.gmail.com' },
            { key: 'SLACK_WEBHOOK_URL', value: '••••••••••••' },
          ].map((env) => (
            <div key={env.key} className="flex items-center gap-3 p-3 rounded-lg border">
              <code className="text-xs font-mono text-emerald-600 min-w-[160px]">{env.key}</code>
              <code className="text-xs font-mono text-muted-foreground flex-1">{env.value}</code>
              <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
            </div>
          ))}
          <Button variant="outline" className="gap-2">
            <Code className="size-3.5" />
            Add Variable
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Bell className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Get notified about workflow failures</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Slack Notifications</Label>
              <p className="text-xs text-muted-foreground">Send alerts to a Slack channel</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Execution Complete</Label>
              <p className="text-xs text-muted-foreground">Notify when executions finish</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Security and access control settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Two-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground">Require 2FA for account access</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Session Timeout</Label>
            <Input placeholder="30 minutes" defaultValue="30" className="max-w-xs" type="number" />
            <p className="text-xs text-muted-foreground">Minutes of inactivity before session expires</p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Event Webhooks (n8n Integration) ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Event Webhooks</CardTitle>
                <CardDescription>Configure n8n / Zapier webhooks that fire automatically on job events</CardDescription>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddWebhook(true)}>
              <Plus className="size-3.5 mr-1" /> Add Webhook
            </Button>
          </div>
          {/* Architecture explanation */}
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

          {/* Event type reference */}
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

      {/* ─── Add Webhook Dialog ──────────────────────────────────────────── */}
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

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Globe className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">About ServiceOS</CardTitle>
              <CardDescription>Version and system information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">0.3.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Build</span>
            <span className="font-mono">2025.03.05</span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="size-3" /> Documentation
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="size-3" /> Changelog
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
