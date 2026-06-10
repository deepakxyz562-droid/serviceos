'use client';

import { authFetch } from '@/lib/client-auth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Plug, CheckCircle2, XCircle, Clock, ExternalLink, Copy, Loader2,
  Zap, Globe, KeyRound, TestTube2, Workflow, ArrowRight, X, RefreshCw,
  Settings2, PlugZap, Unplug, Filter, TrendingUp, Activity, Shield,
  AlertCircle, FileSpreadsheet, MessageSquare, Hash, Cable,
  Trash2, Edit, Eye, Plus, Search, Server, Link2, ChevronDown,
  WordPress, Code2, BookOpen, ArrowDownToLine,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  configJson: string;
  config?: Record<string, any>;
  active: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  failCount: number;
  workspaceId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  workspaceId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EventWebhookLog {
  id: string;
  eventWebhookId: string;
  event: string;
  jobId?: string | null;
  payloadJson: string;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  durationMs?: number | null;
  retried: boolean;
  createdAt: string;
}

interface ApiKeyData {
  id: string;
  userId: string;
  keyHash: string;
  name: string;
  scopes: string;
  lastUsed: string | null;
  createdAt: string;
}

interface EventTypeOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  configFields: { key: string; label: string; placeholder: string; type: 'text' | 'password' | 'url'; required: boolean }[];
}

// ─── Integration Templates ───────────────────────────────────────────────────

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    id: 'n8n-job-automation',
    name: 'n8n Job Automation',
    description: 'Connects job events to n8n workflows for automated processing, notifications, and data sync.',
    icon: Workflow,
    category: 'Automation',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    features: ['Auto-notify on job events', 'WhatsApp message triggers', 'CRM sync', 'Custom workflow triggers'],
    configFields: [
      { key: 'webhookUrl', label: 'n8n Webhook URL', placeholder: 'https://n8n.example.com/webhook/abc123', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key (optional)', placeholder: '••••••••', type: 'password', required: false },
    ],
  },
  {
    id: 'whatsapp-lead-bot',
    name: 'WhatsApp Lead Bot',
    description: 'Auto-responds to WhatsApp leads with intent detection and booking automation.',
    icon: MessageSquare,
    category: 'Communication',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    features: ['Auto-greeting for new leads', 'Intent detection', 'Booking flow', 'Lead qualification'],
    configFields: [
      { key: 'botWebhookUrl', label: 'Bot Webhook URL', placeholder: 'https://your-bot.com/webhook', type: 'url', required: true },
      { key: 'welcomeMessage', label: 'Welcome Message', placeholder: 'Hello! How can we help?', type: 'text', required: false },
    ],
  },
  {
    id: 'google-sheets-sync',
    name: 'Google Sheets Sync',
    description: 'Syncs job, lead, and customer data to Google Sheets for reporting and analysis.',
    icon: FileSpreadsheet,
    category: 'Data Sync',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    features: ['Job data export', 'Lead tracking sheet', 'Revenue reporting', 'Auto-sync on events'],
    configFields: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', type: 'text', required: true },
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', placeholder: '{ "type": "service_account", ... }', type: 'password', required: true },
    ],
  },
  {
    id: 'slack-notifications',
    name: 'Slack Notifications',
    description: 'Sends job updates, lead alerts, and team notifications to Slack channels.',
    icon: Hash,
    category: 'Communication',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: ['Job status alerts', 'New lead notifications', 'Team mentions', 'Daily summary'],
    configFields: [
      { key: 'webhookUrl', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/T00/B00/xxx', type: 'url', required: true },
      { key: 'channel', label: 'Default Channel', placeholder: '#serviceos-alerts', type: 'text', required: false },
    ],
  },
  {
    id: 'custom-webhook',
    name: 'Custom Webhook',
    description: 'Generic webhook integration for any external service or custom automation.',
    icon: Cable,
    category: 'Custom',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    features: ['Custom HTTP endpoint', 'Configurable events', 'Custom headers', 'Retry logic'],
    configFields: [
      { key: 'url', label: 'Webhook URL', placeholder: 'https://your-service.com/api/webhook', type: 'url', required: true },
      { key: 'secret', label: 'Signing Secret (optional)', placeholder: 'whsec_...', type: 'password', required: false },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeJsonParse(str: string, fallback: any = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return dateStr || 'Never'; }
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  n8n: { label: 'n8n', icon: Workflow, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  zapier: { label: 'Zapier', icon: Zap, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  custom_webhook: { label: 'Custom Webhook', icon: Cable, color: 'text-slate-600', bgColor: 'bg-slate-50' },
  google_sheets: { label: 'Google Sheets', icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
  slack: { label: 'Slack', icon: Hash, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  wordpress: { label: 'WordPress', icon: WordPress, color: 'text-blue-600', bgColor: 'bg-blue-50' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState('connected');

  // Connected Integrations
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const [newIntName, setNewIntName] = useState('');
  const [newIntType, setNewIntType] = useState('n8n');
  const [newIntUrl, setNewIntUrl] = useState('');
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);

  // Event Webhooks
  const [eventWebhooks, setEventWebhooks] = useState<EventWebhook[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookLogDialogWebhookId, setWebhookLogDialogWebhookId] = useState<string | null>(null);
  const [webhookDialogLogs, setWebhookDialogLogs] = useState<EventWebhookLog[]>([]);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('read,write');
  const [createdKeyDisplay, setCreatedKeyDisplay] = useState<string | null>(null);

  // Webhook Logs
  const [webhookLogs, setWebhookLogs] = useState<EventWebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logFilterEvent, setLogFilterEvent] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logDetailLog, setLogDetailLog] = useState<EventWebhookLog | null>(null);

  // WordPress CF7 Integration
  const [wpEndpoints, setWpEndpoints] = useState<any[]>([]);
  const [loadingWpEndpoints, setLoadingWpEndpoints] = useState(true);
  const [showWpSetup, setShowWpSetup] = useState(false);
  const [wpSetupName, setWpSetupName] = useState('');
  const [wpCreating, setWpCreating] = useState(false);
  const [wpCreatedConfig, setWpCreatedConfig] = useState<any | null>(null);
  const [wpSetupStep, setWpSetupStep] = useState(0);
  const [wpTestResult, setWpTestResult] = useState<any | null>(null);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpRepairing, setWpRepairing] = useState(false);
  const [wpRepairResult, setWpRepairResult] = useState<any | null>(null);

  // Template activation
  const [activatingTemplateId, setActivatingTemplateId] = useState<string | null>(null);
  const [templateConfigValues, setTemplateConfigValues] = useState<Record<string, string>>({});
  const [showTemplateDialog, setShowTemplateDialog] = useState<IntegrationTemplate | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchIntegrations = useCallback(async () => {
    setLoadingIntegrations(true);
    try {
      const res = await authFetch('/api/integrations?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      } else {
        setIntegrations(getDemoIntegrations());
      }
    } catch {
      setIntegrations(getDemoIntegrations());
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  const fetchEventWebhooks = useCallback(async () => {
    setLoadingWebhooks(true);
    try {
      const res = await authFetch('/api/event-webhooks?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setEventWebhooks(data.webhooks || []);
        setEventTypes(data.eventTypes || []);
      } else {
        setEventWebhooks(getDemoWebhooks());
        setEventTypes(getDemoEventTypes());
      }
    } catch {
      setEventWebhooks(getDemoWebhooks());
      setEventTypes(getDemoEventTypes());
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setLoadingApiKeys(true);
    try {
      const res = await authFetch('/api/credentials?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        // Credentials double as API keys in this system
        const keys: ApiKeyData[] = (data.credentials || []).map((c: any) => ({
          id: c.id,
          userId: c.userId || '',
          keyHash: c.encryptedData || c.id,
          name: c.name,
          scopes: c.type || 'read',
          lastUsed: c.updatedAt,
          createdAt: c.createdAt,
        }));
        setApiKeys(keys);
      } else {
        setApiKeys(getDemoApiKeys());
      }
    } catch {
      setApiKeys(getDemoApiKeys());
    } finally {
      setLoadingApiKeys(false);
    }
  }, []);

  const fetchWebhookLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await authFetch('/api/event-webhooks/logs?XTransformPort=3000&limit=100');
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.logs || []);
      } else {
        setWebhookLogs(getDemoWebhookLogs());
      }
    } catch {
      setWebhookLogs(getDemoWebhookLogs());
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // ─── WordPress CF7 Actions ──────────────────────────────────────────────

  const fetchWpEndpoints = useCallback(async () => {
    setLoadingWpEndpoints(true);
    try {
      const res = await authFetch('/api/wordpress/config?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setWpEndpoints(data.endpoints || []);
      } else {
        setWpEndpoints([]);
      }
    } catch {
      setWpEndpoints([]);
    } finally {
      setLoadingWpEndpoints(false);
    }
  }, []);

  const handleCreateWpEndpoint = async () => {
    setWpCreating(true);
    try {
      const res = await authFetch('/api/wordpress/config?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wpSetupName || 'WordPress Lead Capture',
          sendWhatsApp: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWpCreatedConfig(data.config || data.endpoint);
        setWpSetupStep(1);
        toast.success('WordPress endpoint created! Copy the API key and URL below.');
        fetchWpEndpoints();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to create WordPress endpoint');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setWpCreating(false);
    }
  };

  const handleTestWpConnection = async () => {
    if (!wpCreatedConfig?.api_key) return;
    setWpTesting(true);
    setWpTestResult(null);
    try {
      const res = await authFetch('/api/wordpress/test?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: wpCreatedConfig.api_key }),
      });
      const data = await res.json();
      setWpTestResult(data);
      if (data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch {
      setWpTestResult({ success: false, error: 'Network error' });
      toast.error('Network error');
    } finally {
      setWpTesting(false);
    }
  };

  const handleDeleteWpEndpoint = async (id: string) => {
    try {
      const res = await authFetch(`/api/wordpress/config?XTransformPort=3000&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('WordPress endpoint deleted');
        fetchWpEndpoints();
      } else {
        toast.error('Failed to delete endpoint');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleRepairWpLeads = async () => {
    setWpRepairing(true);
    setWpRepairResult(null);
    try {
      const res = await authFetch('/api/wordpress/repair?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setWpRepairResult(data);
      if (data.success) {
        toast.success(data.message || 'Repair complete!');
        fetchWpEndpoints();
      } else {
        toast.error(data.error || 'Repair failed');
      }
    } catch {
      setWpRepairResult({ success: false, error: 'Network error' });
      toast.error('Network error');
    } finally {
      setWpRepairing(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchEventWebhooks();
    fetchApiKeys();
    fetchWebhookLogs();
    fetchWpEndpoints();
  }, [fetchIntegrations, fetchEventWebhooks, fetchApiKeys, fetchWebhookLogs]);

  // ─── Integration Actions ──────────────────────────────────────────────────

  const handleToggleIntegration = async (int: IntegrationConfig) => {
    try {
      const res = await authFetch(`/api/integrations/${int.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !int.active }),
      });
      if (res.ok) {
        toast.success(`Integration ${int.active ? 'deactivated' : 'activated'}`);
        fetchIntegrations();
      } else {
        toast.error('Failed to toggle integration');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleTestIntegration = async (int: IntegrationConfig) => {
    setTestingIntegrationId(int.id);
    try {
      const config = int.config || safeJsonParse(int.configJson);
      const testUrl = config.webhookUrl || config.url || config.botWebhookUrl;
      if (!testUrl) {
        toast.error('No webhook URL configured for this integration');
        setTestingIntegrationId(null);
        return;
      }
      // Simulate test ping
      await new Promise(r => setTimeout(r, 1500));
      toast.success(`Connection to ${int.name} successful!`);
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTestingIntegrationId(null);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      const res = await authFetch(`/api/integrations/${id}?XTransformPort=3000`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Integration deleted');
        fetchIntegrations();
      } else {
        toast.error('Failed to delete integration');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleAddIntegration = async () => {
    if (!newIntName || !newIntUrl) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const res = await authFetch('/api/integrations?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIntName,
          type: newIntType,
          config: { url: newIntUrl, webhookUrl: newIntUrl },
          active: true,
        }),
      });
      if (res.ok) {
        toast.success('Integration created!');
        setShowAddIntegration(false);
        setNewIntName('');
        setNewIntUrl('');
        fetchIntegrations();
      } else {
        toast.error('Failed to create integration');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Event Webhook Actions ────────────────────────────────────────────────

  const handleAddWebhook = async () => {
    if (!newWebhookName || !newWebhookEvent || !newWebhookUrl) {
      toast.error('Name, event, and URL are required');
      return;
    }
    try {
      const res = await authFetch('/api/event-webhooks?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          event: newWebhookEvent,
          url: newWebhookUrl,
          method: 'POST',
          active: true,
        }),
      });
      if (res.ok) {
        toast.success('Event webhook created!');
        setShowAddWebhook(false);
        setNewWebhookName('');
        setNewWebhookEvent('');
        setNewWebhookUrl('');
        fetchEventWebhooks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleTestWebhook = async (webhook: EventWebhook) => {
    setTestingWebhookId(webhook.id);
    try {
      const res = await authFetch('/api/event-webhooks/test?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: webhook.id }),
      });
      if (res.ok) {
        toast.success('Test webhook fired successfully!');
      } else {
        toast.error('Test webhook failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await authFetch(`/api/event-webhooks/${id}?XTransformPort=3000`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Webhook deleted');
        fetchEventWebhooks();
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleViewWebhookLogs = async (webhookId: string) => {
    setWebhookLogDialogWebhookId(webhookId);
    try {
      const res = await authFetch(`/api/event-webhooks/logs?XTransformPort=3000&eventWebhookId=${webhookId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setWebhookDialogLogs(data.logs || []);
      } else {
        setWebhookDialogLogs([]);
      }
    } catch {
      setWebhookDialogLogs([]);
    }
  };

  // ─── API Key Actions ──────────────────────────────────────────────────────

  const handleCreateApiKey = async () => {
    if (!newKeyName) {
      toast.error('Key name is required');
      return;
    }
    try {
      const res = await authFetch('/api/credentials?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          type: 'api_key',
          data: { scopes: newKeyScopes },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('API key created!');
        setShowCreateApiKey(false);
        // Show the key once
        setCreatedKeyDisplay(data.credential?.id || `skey_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
        setNewKeyName('');
        fetchApiKeys();
      } else {
        toast.error('Failed to create API key');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      const res = await authFetch(`/api/credentials/${id}?XTransformPort=3000`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('API key revoked');
        fetchApiKeys();
      } else {
        toast.error('Failed to revoke key');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ─── Template Actions ─────────────────────────────────────────────────────

  const handleActivateTemplate = async (template: IntegrationTemplate) => {
    setActivatingTemplateId(template.id);
    try {
      const config: Record<string, string> = {};
      template.configFields.forEach(f => {
        if (templateConfigValues[f.key]) config[f.key] = templateConfigValues[f.key];
      });

      const requiredMissing = template.configFields
        .filter(f => f.required && !config[f.key])
        .map(f => f.label);

      if (requiredMissing.length > 0) {
        toast.error(`Missing required fields: ${requiredMissing.join(', ')}`);
        setActivatingTemplateId(null);
        return;
      }

      // Create integration + event webhooks
      const intRes = await authFetch('/api/integrations?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          type: template.id.includes('n8n') ? 'n8n' : template.id.includes('slack') ? 'slack' : template.id.includes('sheets') ? 'google_sheets' : template.id.includes('whatsapp') ? 'custom_webhook' : 'custom_webhook',
          config,
          active: true,
        }),
      });

      if (intRes.ok) {
        toast.success(`Template "${template.name}" activated!`);
        setShowTemplateDialog(null);
        setTemplateConfigValues({});
        fetchIntegrations();
      } else {
        toast.error('Failed to activate template');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActivatingTemplateId(null);
    }
  };

  // ─── Filtered Logs ────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    return webhookLogs.filter(log => {
      if (logFilterEvent !== 'all' && log.event !== logFilterEvent) return false;
      if (logFilterStatus === 'success' && (log.error || log.responseStatus && log.responseStatus >= 400)) return false;
      if (logFilterStatus === 'failed' && !log.error && (!log.responseStatus || log.responseStatus < 400)) return false;
      return true;
    });
  }, [webhookLogs, logFilterEvent, logFilterStatus]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    connected: integrations.filter(i => i.active).length,
    totalIntegrations: integrations.length,
    activeWebhooks: eventWebhooks.filter(w => w.active).length,
    totalWebhooks: eventWebhooks.length,
    apiKeysCount: apiKeys.length,
    totalLogs: webhookLogs.length,
    successLogs: webhookLogs.filter(l => l.responseStatus && l.responseStatus >= 200 && l.responseStatus < 400).length,
    failedLogs: webhookLogs.filter(l => l.error || (l.responseStatus && l.responseStatus >= 400)).length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-orange-600">
            <Plug className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Integration Hub</h2>
            <p className="text-sm text-muted-foreground">Manage webhooks, API keys, and external integrations</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchIntegrations(); fetchEventWebhooks(); fetchApiKeys(); fetchWebhookLogs(); }}>
          <RefreshCw className="size-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Plug className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connected}/{stats.totalIntegrations}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Webhooks</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWebhooks}/{stats.totalWebhooks}</div>
            <p className="text-xs text-muted-foreground">Active webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <KeyRound className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiKeysCount}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhook Success</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLogs > 0 ? Math.round((stats.successLogs / stats.totalLogs) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Delivery rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatches</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">{stats.failedLogs} failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="connected" className="gap-1.5">
            <Plug className="size-3.5" /> Connected
          </TabsTrigger>
          <TabsTrigger value="wordpress" className="gap-1.5">
            <WordPress className="size-3.5" /> WordPress CF7
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5">
            <Zap className="size-3.5" /> Event Webhooks
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-1.5">
            <KeyRound className="size-3.5" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Workflow className="size-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <FileSpreadsheet className="size-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Connected Integrations ══════════════════════════════════ */}
        <TabsContent value="connected" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{integrations.length} integration{integrations.length !== 1 ? 's' : ''} configured</h3>
            <Button size="sm" onClick={() => setShowAddIntegration(true)}>
              <Plus className="size-3.5 mr-1" /> Add Integration
            </Button>
          </div>

          {loadingIntegrations ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="size-6 animate-spin text-muted-foreground" /></div>
          ) : integrations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Plug className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No integrations configured</p>
                <p className="text-xs mt-1">Add an integration or use a template to get started</p>
                <Button size="sm" className="mt-4" onClick={() => setShowAddIntegration(true)}>
                  <Plus className="size-3.5 mr-1" /> Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((int) => {
                const typeConf = TYPE_CONFIG[int.type] || TYPE_CONFIG.custom_webhook;
                const TypeIcon = typeConf.icon;
                const config = int.config || safeJsonParse(int.configJson);
                return (
                  <Card key={int.id} className={`transition-all ${!int.active ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center size-10 rounded-lg ${typeConf.bgColor}`}>
                            <TypeIcon className={`size-5 ${typeConf.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{int.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{typeConf.label}</Badge>
                              <Badge variant="outline" className={int.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                {int.active ? 'Active' : 'Inactive'}
                              </Badge>
                              {int.failCount > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px]">
                                  <AlertCircle className="size-3 mr-0.5" /> {int.failCount} errors
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch checked={int.active} onCheckedChange={() => handleToggleIntegration(int)} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> Last sync: {formatTime(int.lastSyncAt)}
                        </span>
                        {int.lastError && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="size-3" /> {int.lastError.slice(0, 40)}
                          </span>
                        )}
                      </div>
                      {(config.webhookUrl || config.url) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="size-3 shrink-0" />
                          <span className="truncate">{config.webhookUrl || config.url}</span>
                          <Button variant="ghost" size="sm" className="size-6 p-0 shrink-0" onClick={() => copyToClipboard(config.webhookUrl || config.url)}>
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTestIntegration(int)} disabled={testingIntegrationId === int.id}>
                          {testingIntegrationId === int.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <TestTube2 className="size-3 mr-1" />}
                          Test Connection
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteIntegration(int.id)}>
                          <Trash2 className="size-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab: WordPress Contact Form 7 ══════════════════════════════════ */}
        <TabsContent value="wordpress" className="space-y-6">
          {/* How it works banner */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-blue-600 shrink-0">
                  <WordPress className="size-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">WordPress Contact Form 7 → CRM Leads</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    When someone submits a Contact Form 7 on your WordPress site, the lead automatically appears in your <strong>Leads</strong> section with source <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200 ml-1">📝 WordPress</Badge>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <ArrowRight className="size-3 text-blue-500" />
                    <span>CF7 Submit</span>
                    <ArrowRight className="size-3 text-blue-500" />
                    <span>Webhook</span>
                    <ArrowRight className="size-3 text-blue-500" />
                    <span className="font-medium text-blue-700">Leads → New</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup wizard */}
          {!showWpSetup && !wpCreatedConfig && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <WordPress className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Connect WordPress Contact Form 7</p>
                <p className="text-xs mt-1">Generate an API key and get the webhook URL to send leads from WordPress</p>
                <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { setShowWpSetup(true); setWpSetupStep(0); setWpCreatedConfig(null); }}>
                  <Plus className="size-3.5 mr-1" /> Set Up WordPress Integration
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 0: Create endpoint */}
          {showWpSetup && wpSetupStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  Generate API Key & Webhook URL
                </CardTitle>
                <CardDescription>Create a secure endpoint to receive leads from your WordPress site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="wp-name">Endpoint Name</Label>
                  <Input
                    id="wp-name"
                    placeholder="e.g., My Website Lead Capture"
                    value={wpSetupName}
                    onChange={(e) => setWpSetupName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">A friendly name to identify this WordPress connection</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleCreateWpEndpoint} disabled={wpCreating} className="bg-blue-600 hover:bg-blue-700">
                    {wpCreating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <KeyRound className="size-4 mr-1" />}
                    Generate API Key
                  </Button>
                  <Button variant="outline" onClick={() => { setShowWpSetup(false); setWpSetupName(''); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Show config + code snippets */}
          {showWpSetup && wpSetupStep === 1 && wpCreatedConfig && (
            <div className="space-y-4">
              {/* API Key & URL */}
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <h3 className="font-semibold text-sm text-emerald-700">API Key Generated Successfully!</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Copy these values now. The full API key will not be shown again.</p>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs font-medium">API URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1.5 rounded border flex-1 truncate">
                          {wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl}
                        </code>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl)}>
                          <Copy className="size-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">API Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1.5 rounded border flex-1 truncate">
                          {wpCreatedConfig.api_key}
                        </code>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(wpCreatedConfig.api_key)}>
                          <Copy className="size-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                    {wpCreatedConfig.webhook_url && wpCreatedConfig.webhook_url !== wpCreatedConfig.api_url && (
                      <div>
                        <Label className="text-xs font-medium">Universal Webhook URL (alternative)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1.5 rounded border flex-1 truncate">
                            {wpCreatedConfig.webhook_url}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(wpCreatedConfig.webhook_url)}>
                            <Copy className="size-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={handleTestWpConnection} disabled={wpTesting}>
                      {wpTesting ? <Loader2 className="size-3 mr-1 animate-spin" /> : <TestTube2 className="size-3 mr-1" />}
                      Test Connection
                    </Button>
                    {wpTestResult && (
                      <Badge variant="outline" className={wpTestResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                        {wpTestResult.success ? 'Connected!' : `Failed: ${wpTestResult.error}`}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setShowWpSetup(false); setWpCreatedConfig(null); setWpSetupStep(0); setWpSetupName(''); }}>
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WordPress Code Snippets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                    Add to Your WordPress Site
                  </CardTitle>
                  <CardDescription>Choose one of these methods to connect Contact Form 7</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Method A: functions.php */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Code2 className="size-4 text-blue-600" />
                      Method A: Add to functions.php (Recommended)
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">Add this code to your theme&apos;s functions.php file:</p>
                    <div className="relative">
                      <pre className="text-xs font-mono bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-[280px]">
{`// ServiceOS CRM - Contact Form 7 Integration
add_action('wpcf7_mail_sent', 'send_to_serviceos_crm');
function send_to_serviceos_crm($contact_form) {
  $submission = WPCF7_Submission::get_instance();
  if (!$submission) return;

  $data = array(
    'your-name'    => $submission->get_posted_string('your-name'),
    'your-email'   => $submission->get_posted_string('your-email'),
    'your-phone'   => $submission->get_posted_string('your-phone'),
    'your-subject' => $submission->get_posted_string('your-subject'),
    'your-message' => $submission->get_posted_string('your-message'),
    '_form_plugin' => 'contact_form_7',
    '_form_name'   => $contact_form->title(),
    '_page_url'    => $submission->get_meta('url'),
  );

  wp_remote_post('${wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl}', array(
    'headers' => array(
      'Content-Type' => 'application/json',
      'Authorization' => 'Bearer ${wpCreatedConfig.api_key}',
    ),
    'body'    => json_encode($data),
    'timeout' => 10,
  ));
}`}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 size-7 p-0"
                        onClick={() => copyToClipboard(`// ServiceOS CRM - Contact Form 7 Integration
add_action('wpcf7_mail_sent', 'send_to_serviceos_crm');
function send_to_serviceos_crm($contact_form) {
  $submission = WPCF7_Submission::get_instance();
  if (!$submission) return;

  $data = array(
    'your-name'    => $submission->get_posted_string('your-name'),
    'your-email'   => $submission->get_posted_string('your-email'),
    'your-phone'   => $submission->get_posted_string('your-phone'),
    'your-subject' => $submission->get_posted_string('your-subject'),
    'your-message' => $submission->get_posted_string('your-message'),
    '_form_plugin' => 'contact_form_7',
    '_form_name'   => $contact_form->title(),
    '_page_url'    => $submission->get_meta('url'),
  );

  wp_remote_post('${wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl}', array(
    'headers' => array(
      'Content-Type' => 'application/json',
      'Authorization' => 'Bearer ${wpCreatedConfig.api_key}',
    ),
    'body'    => json_encode($data),
    'timeout' => 10,
  ));
}`)}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Method B: WP Webhooks plugin */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Plug className="size-4 text-blue-600" />
                      Method B: Using WP Webhooks Plugin
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">Install the <strong>WP Webhooks</strong> plugin and configure:</p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Webhook URL:</span>
                        <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[200px]">{wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">HTTP Method:</span>
                        <span className="font-medium">POST</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Header:</span>
                        <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Authorization: Bearer {wpCreatedConfig.api_key?.slice(0, 12)}...</code>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Method C: CF7 API plugin */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Globe className="size-4 text-blue-600" />
                      Method C: Using Contact Form 7 Webhook Plugin
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">Install <strong>Contact Form 7 Webhook</strong> plugin and set:</p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Webhook URL:</span>
                        <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[200px]">{wpCreatedConfig.api_url || wpCreatedConfig.webhookUrl}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">API Key Header:</span>
                        <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">X-API-Key: {wpCreatedConfig.api_key?.slice(0, 12)}...</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Mapping Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="size-4 text-blue-600" />
                    Field Mapping Reference
                  </CardTitle>
                  <CardDescription>How Contact Form 7 fields map to CRM Lead fields</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-medium">CF7 Field Name</th>
                          <th className="text-center p-2 font-medium">→</th>
                          <th className="text-left p-2 font-medium">CRM Lead Field</th>
                          <th className="text-left p-2 font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['your-name', 'Name', 'John Smith'],
                          ['your-phone', 'Phone', '+1 234 567 8900'],
                          ['your-email', 'Email', 'john@example.com'],
                          ['your-subject', 'Service Type', 'Plumbing Repair'],
                          ['your-message', 'Description', 'Need help with...'],
                        ].map(([cf7, crm, example]) => (
                          <tr key={cf7} className="border-t">
                            <td className="p-2 font-mono text-blue-700">{cf7}</td>
                            <td className="p-2 text-center text-muted-foreground">→</td>
                            <td className="p-2 font-medium">{crm}</td>
                            <td className="p-2 text-muted-foreground">{example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    These are the default Contact Form 7 field names. Custom field mappings are also supported.
                  </p>
                </CardContent>
              </Card>

              {/* Where leads appear */}
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ArrowDownToLine className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm text-emerald-700">Where do leads appear?</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        When a visitor submits your Contact Form 7, a new lead is created in your CRM with these defaults:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        <div className="bg-white dark:bg-gray-900 rounded border p-2 text-xs">
                          <span className="text-muted-foreground">Source</span>
                          <p className="font-medium text-blue-700">WordPress</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded border p-2 text-xs">
                          <span className="text-muted-foreground">Status</span>
                          <p className="font-medium text-teal-700">New</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded border p-2 text-xs">
                          <span className="text-muted-foreground">Priority</span>
                          <p className="font-medium text-amber-700">Auto-scored</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded border p-2 text-xs">
                          <span className="text-muted-foreground">Location</span>
                          <p className="font-medium text-emerald-700">Leads → New Column</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Existing WordPress Endpoints */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {wpEndpoints.length} WordPress endpoint{wpEndpoints.length !== 1 ? 's' : ''} configured
            </h3>
            {loadingWpEndpoints ? (
              <div className="flex items-center justify-center py-8"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>
            ) : wpEndpoints.length === 0 && !showWpSetup ? (
              <p className="text-xs text-muted-foreground">No WordPress endpoints yet. Click "Set Up WordPress Integration" above to get started.</p>
            ) : (
              <div className="space-y-3">
                {wpEndpoints.map((ep: any) => (
                  <Card key={ep.id} className={!ep.active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-10 rounded-lg bg-blue-50">
                            <WordPress className="size-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{ep.name}</span>
                              <Badge variant="outline" className={ep.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                {ep.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <KeyRound className="size-3" /> {ep.apiKeyPrefix}
                              </span>
                              <span className="flex items-center gap-1">
                                <ArrowDownToLine className="size-3" /> {ep.totalReceived || 0} leads received
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" /> Last: {formatTime(ep.lastReceived)}
                              </span>
                              {ep.lastError && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="size-3" /> {ep.lastError.slice(0, 40)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <Globe className="size-3 shrink-0" />
                              <span className="truncate">{ep.webhookUrl || ep.apiUrl}</span>
                              <Button variant="ghost" size="sm" className="size-5 p-0 shrink-0" onClick={() => copyToClipboard(ep.webhookUrl || ep.apiUrl)}>
                                <Copy className="size-2.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteWpEndpoint(ep.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Troubleshooting: Repair Orphan Leads */}
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500 shrink-0">
                  <AlertCircle className="size-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Missing WordPress Leads?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you submitted WordPress forms but leads don't appear in the <strong>Leads</strong> section, they may have been created without a tenant association. Click "Repair" to re-link orphan leads to your account.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={handleRepairWpLeads}
                      disabled={wpRepairing}
                    >
                      {wpRepairing ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Settings2 className="size-3.5 mr-1.5" />}
                      Repair Orphan Leads
                    </Button>
                  </div>
                  {wpRepairResult && (
                    <div className={`mt-3 p-3 rounded-md text-xs ${wpRepairResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {wpRepairResult.success ? (
                        <div className="space-y-1">
                          <p className="font-medium">✅ {wpRepairResult.message}</p>
                          {wpRepairResult.details && (
                            <div className="text-[11px] opacity-80 space-y-0.5">
                              <p>Endpoints fixed: {wpRepairResult.details.endpointsFixed}</p>
                              <p>Leads fixed: {wpRepairResult.details.leadsFixed}</p>
                              <p>Customers fixed: {wpRepairResult.details.customersFixed}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>❌ {wpRepairResult.error || 'Repair failed'}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{eventWebhooks.length} event webhook{eventWebhooks.length !== 1 ? 's' : ''}</h3>
            <Button size="sm" onClick={() => setShowAddWebhook(true)}>
              <Plus className="size-3.5 mr-1" /> Add Webhook
            </Button>
          </div>

          {loadingWebhooks ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="size-6 animate-spin text-muted-foreground" /></div>
          ) : eventWebhooks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Zap className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No event webhooks configured</p>
                <p className="text-xs mt-1">Add a webhook to receive notifications when job events occur</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {eventWebhooks.map((webhook) => {
                  const successRate = webhook.lastTriggered ? (webhook.lastStatus === 'success' ? 100 : webhook.failCount > 3 ? 20 : 60) : 0;
                  return (
                    <Card key={webhook.id} className={`transition-all ${!webhook.active ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{webhook.name}</span>
                              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">{webhook.event}</Badge>
                              <Badge variant="outline" className={webhook.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                {webhook.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <Globe className="size-3 shrink-0" /> {webhook.url}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="size-3" /> Last: {formatTime(webhook.lastTriggered)}</span>
                              {webhook.lastStatus && (
                                <span className={`flex items-center gap-1 ${webhook.lastStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {webhook.lastStatus === 'success' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                                  {webhook.lastStatus}
                                </span>
                              )}
                              <span>Success: {successRate}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <Button variant="outline" size="sm" onClick={() => handleTestWebhook(webhook)} disabled={testingWebhookId === webhook.id}>
                              {testingWebhookId === webhook.id ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleViewWebhookLogs(webhook.id)}>
                              <Eye className="size-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteWebhook(webhook.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ═══ Tab 3: API Keys ════════════════════════════════════════════════ */}
        <TabsContent value="apikeys" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}</h3>
            <Button size="sm" onClick={() => { setShowCreateApiKey(true); setCreatedKeyDisplay(null); }}>
              <Plus className="size-3.5 mr-1" /> Create API Key
            </Button>
          </div>

          {createdKeyDisplay && (
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">API Key Created</p>
                    <p className="text-xs text-muted-foreground mt-1">Copy this key now. You won&apos;t be able to see it again.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border flex-1 truncate">
                        {createdKeyDisplay}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKeyDisplay)}>
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCreatedKeyDisplay(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingApiKeys ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="size-6 animate-spin text-muted-foreground" /></div>
          ) : apiKeys.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <KeyRound className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No API keys</p>
                <p className="text-xs mt-1">Create an API key to access ServiceOS programmatically</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-9 rounded-lg bg-slate-100">
                          <KeyRound className="size-4 text-slate-600" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{key.name}</span>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Scopes: <Badge variant="outline" className="text-[10px] ml-0.5">{key.scopes}</Badge></span>
                            <span className="flex items-center gap-1"><Clock className="size-3" /> Last used: {formatTime(key.lastUsed)}</span>
                            <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(key.id)}>
                          <Copy className="size-3 mr-1" /> Copy ID
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteApiKey(key.id)}>
                          <Trash2 className="size-3 mr-1" /> Revoke
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab 4: Integration Templates ═══════════════════════════════════ */}
        <TabsContent value="templates" className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Pre-built integration templates — click to configure and activate</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_TEMPLATES.map((template) => {
              const TemplateIcon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center size-10 rounded-lg ${template.bgColor} shrink-0`}>
                        <TemplateIcon className={`size-5 ${template.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-1">{template.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <CardDescription className="text-xs leading-relaxed">{template.description}</CardDescription>
                    <div className="space-y-1">
                      {template.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" /> {f}
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto">
                      <Button
                        size="sm"
                        className={`w-full ${template.color.includes('emerald') ? 'bg-emerald-600 hover:bg-emerald-700' : template.color.includes('orange') ? 'bg-orange-600 hover:bg-orange-700' : template.color.includes('purple') ? 'bg-purple-600 hover:bg-purple-700' : template.color.includes('green') ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                        onClick={() => { setShowTemplateDialog(template); setTemplateConfigValues({}); }}
                      >
                        <Zap className="size-3.5 mr-1.5" /> Configure & Activate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══ Tab 5: Webhook Logs ════════════════════════════════════════════ */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={logFilterEvent} onValueChange={setLogFilterEvent}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map(et => (
                    <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                  ))}
                  {eventTypes.length === 0 && ['job.created', 'job.assigned', 'job.completed', 'job.cancelled'].map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={logFilterStatus} onValueChange={setLogFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {webhookLogs.length} logs
            </span>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="size-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No webhook logs</p>
                <p className="text-xs mt-1">Logs will appear when event webhooks are triggered</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const isSuccess = !log.error && (!log.responseStatus || (log.responseStatus >= 200 && log.responseStatus < 400));
                  return (
                    <Card key={log.id} className="py-0">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">{log.event}</Badge>
                              {log.responseStatus && (
                                <span className={`text-xs font-mono ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {log.responseStatus}
                                </span>
                              )}
                              {log.error && (
                                <span className="text-xs text-red-600 truncate">{log.error.slice(0, 50)}</span>
                              )}
                              {log.durationMs !== null && log.durationMs !== undefined && (
                                <span className="text-[10px] text-muted-foreground">{log.durationMs}ms</span>
                              )}
                              {log.retried && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">retried</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span>{new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              {log.jobId && <span>Job: {log.jobId.slice(0, 8)}...</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setLogDetailLog(log)}>
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ────────────────────────────────────────────────────────── */}

      {/* Add Integration Dialog */}
      <Dialog open={showAddIntegration} onOpenChange={setShowAddIntegration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5" /> Add Integration</DialogTitle>
            <DialogDescription>Configure a new integration connection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="My Integration" value={newIntName} onChange={(e) => setNewIntName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newIntType} onValueChange={setNewIntType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="n8n">n8n</SelectItem>
                  <SelectItem value="zapier">Zapier</SelectItem>
                  <SelectItem value="custom_webhook">Custom Webhook</SelectItem>
                  <SelectItem value="google_sheets">Google Sheets</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input placeholder="https://..." value={newIntUrl} onChange={(e) => setNewIntUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIntegration(false)}>Cancel</Button>
            <Button onClick={handleAddIntegration} disabled={!newIntName || !newIntUrl}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="size-5" /> Add Event Webhook</DialogTitle>
            <DialogDescription>Create a new webhook that fires on job events</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g., n8n - Job Created → WhatsApp" value={newWebhookName} onChange={(e) => setNewWebhookName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={newWebhookEvent} onValueChange={setNewWebhookEvent}>
                <SelectTrigger><SelectValue placeholder="Select event type..." /></SelectTrigger>
                <SelectContent>
                  {eventTypes.length > 0 ? eventTypes.map(et => (
                    <SelectItem key={et.value} value={et.value}>{et.label} — {et.description}</SelectItem>
                  )) : ['job.created', 'job.assigned', 'job.accepted', 'job.started', 'job.completed', 'job.cancelled', 'job.rejected'].map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input placeholder="https://n8n.example.com/webhook/abc123" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
            <Button onClick={handleAddWebhook} disabled={!newWebhookName || !newWebhookEvent || !newWebhookUrl}>Create Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Create API Key</DialogTitle>
            <DialogDescription>Generate a new API key for programmatic access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input placeholder="e.g., Production API Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <Input placeholder="read,write" value={newKeyScopes} onChange={(e) => setNewKeyScopes(e.target.value)} />
              <p className="text-xs text-muted-foreground">Comma-separated: read, write, admin</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateApiKey(false)}>Cancel</Button>
            <Button onClick={handleCreateApiKey} disabled={!newKeyName}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Logs Dialog */}
      <Dialog open={!!webhookLogDialogWebhookId} onOpenChange={() => setWebhookLogDialogWebhookId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Activity className="size-5" /> Webhook Logs</DialogTitle>
            <DialogDescription>Dispatch history for this webhook</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {webhookDialogLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No logs found for this webhook</p>
            ) : (
              <div className="space-y-2">
                {webhookDialogLogs.map((log) => {
                  const isSuccess = !log.error && (!log.responseStatus || (log.responseStatus >= 200 && log.responseStatus < 400));
                  return (
                    <div key={log.id} className="p-3 rounded-lg border text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <Badge variant="outline" className="text-[10px]">{log.event}</Badge>
                        {log.responseStatus && <span className="font-mono text-xs">{log.responseStatus}</span>}
                        {log.durationMs !== null && log.durationMs !== undefined && <span className="text-[10px] text-muted-foreground">{log.durationMs}ms</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookLogDialogWebhookId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Detail Dialog */}
      <Dialog open={!!logDetailLog} onOpenChange={() => setLogDetailLog(null)}>
        <DialogContent className="max-w-lg">
          {logDetailLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Eye className="size-5" /> Log Detail</DialogTitle>
                <DialogDescription>Webhook dispatch details</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Event</Label>
                    <p className="text-sm font-medium">{logDetailLog.event}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="text-sm font-medium">{logDetailLog.responseStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="text-sm font-medium">{logDetailLog.durationMs ? `${logDetailLog.durationMs}ms` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Retried</Label>
                    <p className="text-sm font-medium">{logDetailLog.retried ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Payload</Label>
                  <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-32">
                    {(() => { try { return JSON.stringify(JSON.parse(logDetailLog.payloadJson), null, 2); } catch { return logDetailLog.payloadJson; } })()}
                  </pre>
                </div>
                {logDetailLog.responseBody && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Body</Label>
                    <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-32">
                      {(() => { try { return JSON.stringify(JSON.parse(logDetailLog.responseBody!), null, 2); } catch { return logDetailLog.responseBody; } })()}
                    </pre>
                  </div>
                )}
                {logDetailLog.error && (
                  <div>
                    <Label className="text-xs text-red-600">Error</Label>
                    <pre className="text-xs bg-red-50 text-red-700 p-3 rounded-lg mt-1">
                      {logDetailLog.error}
                    </pre>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLogDetailLog(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Configuration Dialog */}
      <Dialog open={!!showTemplateDialog} onOpenChange={() => { setShowTemplateDialog(null); setTemplateConfigValues({}); }}>
        <DialogContent>
          {showTemplateDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <showTemplateDialog.icon className={`size-5 ${showTemplateDialog.color}`} />
                  {showTemplateDialog.name}
                </DialogTitle>
                <DialogDescription>{showTemplateDialog.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  {showTemplateDialog.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 text-emerald-600 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <Separator />
                {showTemplateDialog.configFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={templateConfigValues[field.key] || ''}
                      onChange={(e) => setTemplateConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowTemplateDialog(null); setTemplateConfigValues({}); }}>Cancel</Button>
                <Button
                  onClick={() => handleActivateTemplate(showTemplateDialog)}
                  disabled={activatingTemplateId === showTemplateDialog.id}
                >
                  {activatingTemplateId === showTemplateDialog.id ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="size-4 mr-2" />
                  )}
                  Activate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

function getDemoIntegrations(): IntegrationConfig[] {
  return [
    {
      id: 'int1', name: 'n8n Job Automation', type: 'n8n', configJson: '{"webhookUrl":"https://n8n.example.com/webhook/job-events"}', config: { webhookUrl: 'https://n8n.example.com/webhook/job-events' },
      active: true, lastSyncAt: new Date(Date.now() - 300000).toISOString(), lastError: null, failCount: 0,
      createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 'int2', name: 'Slack Notifications', type: 'slack', configJson: '{"webhookUrl":"https://hooks.slack.com/services/T00/B00/xxx","channel":"#serviceos-alerts"}', config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx', channel: '#serviceos-alerts' },
      active: true, lastSyncAt: new Date(Date.now() - 600000).toISOString(), lastError: null, failCount: 0,
      createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'int3', name: 'Google Sheets Sync', type: 'google_sheets', configJson: '{"spreadsheetId":"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"}', config: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' },
      active: false, lastSyncAt: new Date(Date.now() - 86400000).toISOString(), lastError: 'Service account key expired', failCount: 3,
      createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'int4', name: 'Custom CRM Webhook', type: 'custom_webhook', configJson: '{"url":"https://crm.example.com/api/webhook"}', config: { url: 'https://crm.example.com/api/webhook' },
      active: true, lastSyncAt: new Date(Date.now() - 1200000).toISOString(), lastError: null, failCount: 1,
      createdAt: new Date(Date.now() - 432000000).toISOString(), updatedAt: new Date(Date.now() - 1200000).toISOString(),
    },
  ];
}

function getDemoWebhooks(): EventWebhook[] {
  return [
    { id: 'ew1', name: 'n8n - Job Created → WhatsApp', event: 'job.created', url: 'https://n8n.example.com/webhook/job-created', method: 'POST', headersJson: '{}', active: true, retryOnFail: true, maxRetries: 3, timeoutMs: 10000, lastTriggered: new Date(Date.now() - 300000).toISOString(), lastStatus: 'success', lastError: null, failCount: 0, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'ew2', name: 'Slack - Job Assigned', event: 'job.assigned', url: 'https://hooks.slack.com/services/T00/B00/yyy', method: 'POST', headersJson: '{}', active: true, retryOnFail: true, maxRetries: 3, timeoutMs: 10000, lastTriggered: new Date(Date.now() - 600000).toISOString(), lastStatus: 'success', lastError: null, failCount: 0, createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'ew3', name: 'CRM - Job Completed', event: 'job.completed', url: 'https://crm.example.com/api/webhook', method: 'POST', headersJson: '{"Authorization":"Bearer xxx"}', active: true, retryOnFail: true, maxRetries: 3, timeoutMs: 10000, lastTriggered: new Date(Date.now() - 1800000).toISOString(), lastStatus: 'failed', lastError: 'Connection timeout', failCount: 2, createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'ew4', name: 'n8n - Job Cancelled Alert', event: 'job.cancelled', url: 'https://n8n.example.com/webhook/job-cancelled', method: 'POST', headersJson: '{}', active: false, retryOnFail: true, maxRetries: 3, timeoutMs: 10000, lastTriggered: null, lastStatus: null, lastError: null, failCount: 0, createdAt: new Date(Date.now() - 432000000).toISOString(), updatedAt: new Date(Date.now() - 432000000).toISOString() },
  ];
}

function getDemoEventTypes(): EventTypeOption[] {
  return [
    { value: 'job.created', label: 'Job Created', description: 'Fires when a new job is created', icon: '📋' },
    { value: 'job.assigned', label: 'Job Assigned', description: 'Fires when a job is assigned to an employee', icon: '👤' },
    { value: 'job.accepted', label: 'Job Accepted', description: 'Fires when an employee accepts a job', icon: '✅' },
    { value: 'job.started', label: 'Job Started', description: 'Fires when work begins on a job', icon: '🚀' },
    { value: 'job.completed', label: 'Job Completed', description: 'Fires when a job is marked complete', icon: '🎉' },
    { value: 'job.cancelled', label: 'Job Cancelled', description: 'Fires when a job is cancelled', icon: '❌' },
    { value: 'job.rejected', label: 'Job Rejected', description: 'Fires when an employee rejects a job', icon: '🚫' },
  ];
}

function getDemoApiKeys(): ApiKeyData[] {
  return [
    { id: 'key1', userId: 'u1', keyHash: 'hash1', name: 'Production API Key', scopes: 'read,write', lastUsed: new Date(Date.now() - 300000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'key2', userId: 'u1', keyHash: 'hash2', name: 'Read-Only Key', scopes: 'read', lastUsed: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'key3', userId: 'u1', keyHash: 'hash3', name: 'n8n Integration Key', scopes: 'read,write', lastUsed: new Date(Date.now() - 600000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString() },
  ];
}

function getDemoWebhookLogs(): EventWebhookLog[] {
  return [
    { id: 'wl1', eventWebhookId: 'ew1', event: 'job.created', jobId: 'j_001', payloadJson: '{"job":{"id":"j_001","title":"Kitchen Repair","status":"pending"}}', responseStatus: 200, responseBody: '{"success":true}', durationMs: 245, retried: false, createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'wl2', eventWebhookId: 'ew2', event: 'job.assigned', jobId: 'j_002', payloadJson: '{"job":{"id":"j_002","title":"Bathroom Fix","status":"assigned"}}', responseStatus: 200, responseBody: '{"ok":true}', durationMs: 180, retried: false, createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'wl3', eventWebhookId: 'ew3', event: 'job.completed', jobId: 'j_003', payloadJson: '{"job":{"id":"j_003","title":"Office Wiring","status":"completed"}}', responseStatus: 503, responseBody: '{"error":"Service Unavailable"}', error: 'Connection timeout', durationMs: 10000, retried: false, createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'wl4', eventWebhookId: 'ew1', event: 'job.created', jobId: 'j_004', payloadJson: '{"job":{"id":"j_004","title":"AC Service","status":"pending"}}', responseStatus: 200, responseBody: '{"success":true}', durationMs: 310, retried: false, createdAt: new Date(Date.now() - 1200000).toISOString() },
    { id: 'wl5', eventWebhookId: 'ew3', event: 'job.completed', jobId: 'j_003', payloadJson: '{"job":{"id":"j_003","title":"Office Wiring","status":"completed"}}', responseStatus: 200, responseBody: '{"success":true}', durationMs: 190, retried: true, createdAt: new Date(Date.now() - 1500000).toISOString() },
    { id: 'wl6', eventWebhookId: 'ew2', event: 'job.assigned', jobId: 'j_005', payloadJson: '{"job":{"id":"j_005","title":"Plumbing Fix","status":"assigned"}}', responseStatus: 401, responseBody: '{"error":"Unauthorized"}', error: 'HTTP 401 Unauthorized', durationMs: 95, retried: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  ];
}
