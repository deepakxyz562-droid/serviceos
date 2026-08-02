'use client';

/**
 * WhatsApp Settings section (tenant-owned / BYO Meta Cloud API).
 *
 * Writes credentials to `Tenant.whatsappConfigJson` via
 * `PUT /api/settings/whatsapp`. GET returns the access token masked — when
 * the user re-saves without changing the token, the masked placeholder is
 * sent back and the server preserves the existing value.
 *
 * Layout (5 cards):
 *   1. Connection Status  — Connected / Not Connected / Demo mode badge
 *   2. Meta Cloud API Configuration — token, phone ID, BA ID, verify token,
 *      API version dropdown
 *   3. Webhook Setup (read-only) — copyable webhook URL + verify token +
 *      Meta dashboard instructions
 *   4. Message Templates — list pulled from /api/whatsapp/templates, with a
 *      "Sync Templates" button that calls the same endpoint with action:
 *      'sync_status'
 *   5. Test Configuration — phone number + message + Send button that POSTs
 *      to /api/whatsapp/send
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Send,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { authFetch } from '@/lib/api';
import { toast } from 'sonner';

const API_VERSIONS = ['v18.0', 'v19.0', 'v20.0', 'v21.0'] as const;

interface WhatsAppConfigResponse {
  mode: 'connected' | 'demo';
  connected: boolean;
  config: {
    accessToken: string; // masked: "****abcd"
    accessTokenMasked: boolean;
    phoneNumberId: string;
    businessAccountId: string;
    verifyToken: string;
    apiVersion: string;
    webhookVerified: boolean;
  };
  whatsappPhone?: string;
}

interface TemplateItem {
  id: string;
  name: string;
  status?: string;
  isApproved?: boolean;
  language?: string;
  category?: string;
  templateType?: string;
  externalId?: string | null;
}

/** Generate a URL-safe random verify token (looks like "aB3dEf9h_Ij2k_Mn0pQr7sTuv"). */
function generateVerifyToken(): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [8, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from(
        { length: len },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join(''),
    )
    .join('_');
}

/** Copy text to clipboard with a graceful fallback + toast feedback. */
async function copyToClipboard(text: string, label: string): Promise<void> {
  if (!text) {
    toast.error(`Nothing to copy — ${label} is empty.`);
    return;
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Legacy fallback for non-secure contexts.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast.success(`${label} copied to clipboard`);
  } catch {
    toast.error(`Failed to copy ${label}`);
  }
}

export function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form state — initialized from the GET response.
  const [form, setForm] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    verifyToken: '',
    apiVersion: 'v21.0' as string,
  });

  // Connection status (from the GET response, NOT the form).
  const [connected, setConnected] = useState(false);
  const [webhookVerified, setWebhookVerified] = useState(false);
  const [accessTokenMasked, setAccessTokenMasked] = useState(false);

  // Templates list + sync state.
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);

  // Test message form.
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Hello from Fieseros! This is a test message.',
  );
  const [sendingTest, setSendingTest] = useState(false);

  // Copy-button state per row.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/callback`
      : '/api/whatsapp/callback';

  // ── Fetch settings + templates on mount ───────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/whatsapp');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to load WhatsApp settings');
        return;
      }
      const data = (await res.json()) as WhatsAppConfigResponse;
      setConnected(data.connected);
      setWebhookVerified(data.config.webhookVerified);
      setAccessTokenMasked(data.config.accessTokenMasked);
      setForm({
        accessToken: data.config.accessToken,
        phoneNumberId: data.config.phoneNumberId,
        businessAccountId: data.config.businessAccountId,
        verifyToken: data.config.verifyToken,
        apiVersion: data.config.apiVersion || 'v21.0',
      });
    } catch {
      toast.error('Network error loading WhatsApp settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await authFetch('/api/whatsapp/templates?limit=100');
      if (!res.ok) {
        // Templates endpoint may 403 if plan tier doesn't include WhatsApp —
        // render an empty list rather than blocking the rest of the UI.
        setTemplates([]);
        return;
      }
      const data = (await res.json()) as { data?: TemplateItem[] };
      setTemplates(data.data ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
  }, [fetchSettings, fetchTemplates]);

  // ── Save handler ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(
          data.connected
            ? 'WhatsApp configuration saved — connection active.'
            : 'WhatsApp configuration saved (demo mode).',
        );
        setConnected(!!data.connected);
        setWebhookVerified(!!data.config?.webhookVerified);
        setAccessTokenMasked(!!data.config?.accessTokenMasked);
        // Refresh the masked token in the form field.
        setForm((prev) => ({
          ...prev,
          accessToken: data.config?.accessToken ?? prev.accessToken,
        }));
      } else {
        toast.error(data.error || 'Failed to save WhatsApp configuration');
      }
    } catch {
      toast.error('Network error saving WhatsApp configuration');
    } finally {
      setSaving(false);
    }
  };

  // ── Templates sync ────────────────────────────────────────────────
  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await authFetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_status' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const synced = data.synced ?? 0;
        const created = data.created ?? 0;
        toast.success(
          `Synced ${synced} template(s)${
            created > 0 ? `, imported ${created} new` : ''
          }.`,
        );
        await fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to sync templates from Meta');
      }
    } catch {
      toast.error('Network error syncing templates');
    } finally {
      setSyncingTemplates(false);
    }
  };

  // ── Send test message ─────────────────────────────────────────────
  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Enter a test phone number (E.164 format, e.g. +91…).');
      return;
    }
    if (!testMessage.trim()) {
      toast.error('Enter a test message.');
      return;
    }
    setSendingTest(true);
    try {
      const res = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone.trim(),
          message: testMessage.trim(),
          type: 'text',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(
          data.simulated
            ? 'Test message sent (simulated — no live credentials resolved).'
            : `Test message sent to ${testPhone.trim()}.`,
        );
      } else {
        // Most failures here are: plan-tier gate, credit exhaustion, or
        // missing credentials. Surface the message verbatim.
        toast.error(data.error || 'Failed to send test message');
      }
    } catch {
      toast.error('Network error sending test message');
    } finally {
      setSendingTest(false);
    }
  };

  // ── Disconnect (clears local credentials → demo mode) ─────────────
  const handleDisconnect = async () => {
    if (
      !window.confirm(
        'Disconnect WhatsApp? This clears your Meta Cloud API credentials from this tenant. ' +
          'You can re-enter them anytime.',
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: '',
          phoneNumberId: '',
          businessAccountId: '',
          verifyToken: '',
          webhookVerified: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success('WhatsApp disconnected.');
        setConnected(false);
        setWebhookVerified(false);
        setAccessTokenMasked(false);
        setForm({
          accessToken: '',
          phoneNumberId: '',
          businessAccountId: '',
          verifyToken: '',
          apiVersion: form.apiVersion || 'v21.0',
        });
      } else {
        toast.error(data.error || 'Failed to disconnect WhatsApp');
      }
    } catch {
      toast.error('Network error disconnecting WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────
  const handleCopy = async (text: string, label: string, key: string) => {
    await copyToClipboard(text, label);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleGenerateVerifyToken = () => {
    const newToken = generateVerifyToken();
    setForm((prev) => ({ ...prev, verifyToken: newToken }));
    toast.success('Generated a new webhook verify token. Save to apply.');
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading WhatsApp settings...
      </div>
    );
  }

  const approvedCount = templates.filter(
    (t) => t.isApproved || t.status === 'approved',
  ).length;

  return (
    <div className="space-y-6">
      {/* ── 1. Connection Status ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MessageCircle className="size-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Connection Status</CardTitle>
              <CardDescription>
                Current state of your tenant-owned WhatsApp connection.
              </CardDescription>
            </div>
            {connected ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                <ShieldCheck className="size-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="size-3" /> Demo mode
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium">
                {connected ? 'Live (Meta Cloud API)' : 'Not connected'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Webhook verified</p>
              <p className="font-medium">
                {webhookVerified ? 'Yes' : 'Pending'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">API version</p>
              <p className="font-medium">{form.apiVersion}</p>
            </div>
          </div>
          {connected ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
              <p className="text-emerald-700 dark:text-emerald-300">
                Your own Meta Cloud API credentials are active. Messages are
                sent directly from your WhatsApp Business Account.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={saving}
                className="gap-1.5 shrink-0"
              >
                <Trash2 className="size-3.5" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
              <p className="text-amber-800 dark:text-amber-300">
                Not connected. Enter your Meta Cloud API credentials below to
                send WhatsApp messages from your own number. Until then, the
                platform fallback (if configured by SuperAdmin) or demo mode
                applies.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. Meta Cloud API Configuration ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Sparkles className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Meta Cloud API Configuration</CardTitle>
              <CardDescription>
                Bring your own Meta Cloud API credentials. Stored on your tenant
                record.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Access Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="wa-access-token">
              Access Token
            </Label>
            <div className="flex gap-2">
              <Input
                id="wa-access-token"
                type={showToken ? 'text' : 'password'}
                placeholder="EAAG..."
                value={form.accessToken}
                onChange={(e) =>
                  setForm({ ...form, accessToken: e.target.value })
                }
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((v) => !v)}
                aria-label={showToken ? 'Hide access token' : 'Show access token'}
                title={showToken ? 'Hide' : 'Show'}
              >
                {showToken ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {accessTokenMasked && form.accessToken.startsWith('****')
                ? 'Token is saved (masked). Re-enter a new value to replace it.'
                : 'Find this in Meta App Dashboard → WhatsApp → API Setup.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="wa-phone-id">
                Phone Number ID
              </Label>
              <Input
                id="wa-phone-id"
                placeholder="103xxxxxxx"
                value={form.phoneNumberId}
                onChange={(e) =>
                  setForm({ ...form, phoneNumberId: e.target.value })
                }
              />
            </div>

            {/* Business Account ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="wa-ba-id">
                Business Account ID
              </Label>
              <Input
                id="wa-ba-id"
                placeholder="10xxxxxyyyyzzz"
                value={form.businessAccountId}
                onChange={(e) =>
                  setForm({ ...form, businessAccountId: e.target.value })
                }
              />
            </div>
          </div>

          {/* Webhook Verify Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="wa-verify-token">
              Webhook Verify Token
            </Label>
            <div className="flex gap-2">
              <Input
                id="wa-verify-token"
                placeholder="my_secret_verify_token"
                value={form.verifyToken}
                onChange={(e) =>
                  setForm({ ...form, verifyToken: e.target.value })
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateVerifyToken}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="size-3.5" /> Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to verify the webhook with Meta. Generate one or paste your
              own — it must match what you enter in the Meta dashboard.
            </p>
          </div>

          {/* API Version */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">API Version</Label>
            <Select
              value={form.apiVersion}
              onValueChange={(v) => setForm({ ...form, apiVersion: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select API version" />
              </SelectTrigger>
              <SelectContent>
                {API_VERSIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save row */}
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Credentials are stored on your tenant record. Access token is
              masked in API responses.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6 shrink-0"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Webhook Setup (read-only) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <ExternalLink className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Webhook Setup</CardTitle>
              <CardDescription>
                Configure this in your Meta App Dashboard so WhatsApp can
                deliver incoming messages and status updates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Webhook URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="bg-muted/40" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  handleCopy(webhookUrl, 'Webhook URL', 'webhook-url')
                }
                aria-label="Copy webhook URL"
                title="Copy"
              >
                {copiedKey === 'webhook-url' ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Verify Token</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={form.verifyToken}
                placeholder="Save a verify token first"
                className="bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  handleCopy(form.verifyToken, 'Verify Token', 'verify-token')
                }
                aria-label="Copy verify token"
                title="Copy"
                disabled={!form.verifyToken}
              >
                {copiedKey === 'verify-token' ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">How to verify the webhook:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Go to{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Meta App Dashboard
                  <ExternalLink className="size-3" />
                </a>{' '}
                → your app → WhatsApp → Configuration.
              </li>
              <li>
                Click <span className="font-medium">Edit</span> on the Webhook
                field.
              </li>
              <li>
                Paste the <span className="font-medium">Webhook URL</span> above
                as the callback URL.
              </li>
              <li>
                Paste the <span className="font-medium">Verify Token</span> above
                (it must match what you saved in this form).
              </li>
              <li>
                Click <span className="font-medium">Verify and Save</span>.
              </li>
              <li>
                Subscribe to required fields:{' '}
                <code className="text-xs bg-background px-1 py-0.5 rounded">
                  messages
                </code>
                ,{' '}
                <code className="text-xs bg-background px-1 py-0.5 rounded">
                  message_status
                </code>
                .
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Message Templates ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <MessageCircle className="size-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Message Templates</CardTitle>
              <CardDescription>
                Approved Meta templates available for this tenant. Sync to pull
                the latest status from Meta.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncTemplates}
              disabled={syncingTemplates || !connected}
              className="gap-1.5 shrink-0"
              title={
                connected
                  ? 'Sync templates from Meta'
                  : 'Connect WhatsApp first to sync templates'
              }
            >
              {syncingTemplates ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Sync Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-emerald-600">
              {approvedCount} approved
            </Badge>
            <Badge variant="outline">{templates.length} total</Badge>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin mr-2" /> Loading
              templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No templates yet. After connecting WhatsApp, sync templates from
              Meta or import pre-built ones from the WhatsApp Templates screen.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border divide-y">
              {templates.map((t) => {
                const approved = t.isApproved || t.status === 'approved';
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.language || '—'}
                        {t.category ? ` · ${t.category}` : ''}
                        {t.templateType ? ` · ${t.templateType}` : ''}
                      </p>
                    </div>
                    {approved ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white shrink-0">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {t.status || 'draft'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Test Configuration ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Send className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Test Configuration</CardTitle>
              <CardDescription>
                Send a test message to verify your WhatsApp setup end-to-end.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="wa-test-phone">
              Test phone number
            </Label>
            <Input
              id="wa-test-phone"
              placeholder="+91 98765 43210"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use E.164 format with country code. The number must be a test
              recipient added in your Meta app, or a real opt-in contact.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="wa-test-message">
              Test message
            </Label>
            <Textarea
              id="wa-test-message"
              rows={3}
              placeholder="Type a test message..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
              onClick={handleSendTest}
              disabled={sendingTest || !testPhone.trim() || !testMessage.trim()}
            >
              {sendingTest ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send Test Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
