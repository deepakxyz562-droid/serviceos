'use client';

/**
 * SMS / 2-Way Text — tenant-owned SMS provider settings.
 *
 * Tenants bring their own SMS provider credentials (Twilio / Vonage / Custom).
 * Stored encrypted in `Tenant.settingsJson.smsSettings` (auth token uses
 * AES-256-GCM via `ai-key-crypto.ts`). See:
 *   - `src/app/api/settings/sms/route.ts`  — GET + PUT
 *   - `src/app/api/sms/test/route.ts`      — POST test send
 *
 * UI sections:
 *   1. Provider Configuration  — provider dropdown, accountSid (masked),
 *      authToken (show/hide), phoneNumber (E.164), senderId
 *   2. 2-Way Messaging          — enable toggle + read-only inbound webhook URL
 *   3. Keywords                  — toggle + keyword/response rules table
 *   4. Test Configuration        — test phone + message + "Send Test SMS" button
 *
 * If the tenant has no SMS configured, a clear "Not configured" empty state
 * with a "Configure SMS" CTA is shown instead of the form.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Phone,
  Key,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Reply,
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

type SmsProvider = 'twilio' | 'vonage' | 'custom' | 'none';

interface SmsKeywordRule {
  keyword: string;
  response: string;
}

interface SmsSettingsState {
  provider: SmsProvider;
  accountSid: string;
  authToken: string; // masked when loaded from server (••••••••<last4>)
  phoneNumber: string;
  senderId: string;
  twoWayEnabled: boolean;
  keywordsEnabled: boolean;
  keywords: SmsKeywordRule[];
  configured?: boolean;
  webhookUrl?: string;
}

const DEFAULT_STATE: SmsSettingsState = {
  provider: 'none',
  accountSid: '',
  authToken: '',
  phoneNumber: '',
  senderId: '',
  twoWayEnabled: false,
  keywordsEnabled: false,
  keywords: [],
  configured: false,
  webhookUrl: '',
};

const MASK_PREFIX = '••••••••';

function isMasked(value: string): boolean {
  return !!value && value.startsWith(MASK_PREFIX);
}

const PROVIDER_OPTIONS: { value: SmsProvider; label: string; hint: string }[] = [
  { value: 'twilio', label: 'Twilio', hint: 'Recommended — full 2-way support' },
  { value: 'vonage', label: 'Vonage', hint: 'Nexmo / Vonage API' },
  { value: 'custom', label: 'Custom', hint: 'Bring your own HTTP SMS gateway' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function SmsTextSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  const [state, setState] = useState<SmsSettingsState>(DEFAULT_STATE);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Test form
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Fieseros test: your SMS provider is working.',
  );

  // ── Load existing settings ──────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/sms');
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to load SMS settings');
        return;
      }
      const data = (await res.json()) as SmsSettingsState;
      setState({
        provider: data.provider || 'none',
        accountSid: data.accountSid || '',
        authToken: data.authToken || '',
        phoneNumber: data.phoneNumber || '',
        senderId: data.senderId || '',
        twoWayEnabled: !!data.twoWayEnabled,
        keywordsEnabled: !!data.keywordsEnabled,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        configured: !!data.configured,
        webhookUrl: data.webhookUrl || '',
      });
      setWebhookUrl(data.webhookUrl || '');
      // Show the form when already configured OR when the user explicitly
      // opened it. On first load with no config, show the empty state.
      setShowConfigForm(!!data.configured);
    } catch {
      toast.error('Network error loading SMS settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (state.provider === 'none') {
      toast.error('Please choose an SMS provider.');
      return;
    }
    if (!state.accountSid.trim() && state.provider !== 'custom') {
      toast.error('Account SID is required.');
      return;
    }
    if (!state.phoneNumber.trim()) {
      toast.error('A sender phone number is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/sms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: state.provider,
          accountSid: state.accountSid,
          // If the authToken is still masked (user didn't change it), send
          // the mask back so the server preserves the stored ciphertext.
          authToken: state.authToken,
          phoneNumber: state.phoneNumber,
          senderId: state.senderId,
          twoWayEnabled: state.twoWayEnabled,
          keywordsEnabled: state.keywordsEnabled,
          keywords: state.keywords,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to save SMS settings');
        return;
      }
      const data = (await res.json()) as SmsSettingsState;
      setState((prev) => ({
        ...prev,
        authToken: data.authToken || prev.authToken,
        configured: !!data.configured,
        webhookUrl: data.webhookUrl || prev.webhookUrl,
      }));
      setWebhookUrl(data.webhookUrl || '');
      toast.success('SMS settings saved successfully');
    } catch {
      toast.error('Network error saving SMS settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Send Test SMS ───────────────────────────────────────────────────────
  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Enter a test phone number (E.164 format).');
      return;
    }
    if (!state.configured && !isMasked(state.authToken) && !state.authToken) {
      toast.error('Save your SMS configuration before sending a test.');
      return;
    }
    setTesting(true);
    try {
      // If the user has typed a NEW (non-masked) auth token, send the raw
      // config so the test uses the just-typed credentials. Otherwise, send
      // only `{ to }` so the backend resolves the saved tenant config.
      const hasRawOverride = !isMasked(state.authToken) && !!state.authToken;

      const body: Record<string, unknown> = {
        to: testPhone.trim(),
        ...(hasRawOverride
          ? {
              provider: state.provider,
              config: {
                accountSid: state.accountSid,
                authToken: state.authToken,
                fromNumber: state.phoneNumber,
                senderId: state.senderId,
              },
            }
          : {}),
      };

      const res = await authFetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        simulated?: boolean;
        error?: string;
        messageId?: string;
        provider?: string;
      };

      if (res.ok && data.success) {
        if (data.simulated) {
          toast.success(
            'Test SMS simulated (no live provider configured). Message ID: ' +
              (data.messageId || 'sim'),
          );
        } else {
          toast.success(
            `Test SMS sent to ${testPhone.trim()}` +
              (data.provider ? ` via ${data.provider}` : ''),
          );
        }
      } else {
        toast.error(data.error || 'Test SMS failed to send.');
      }
    } catch {
      toast.error('Network error sending test SMS');
    } finally {
      setTesting(false);
    }
  };

  // ── Keyword helpers ─────────────────────────────────────────────────────
  const addKeyword = () => {
    setState((prev) => ({
      ...prev,
      keywords: [...prev.keywords, { keyword: '', response: '' }],
    }));
  };

  const updateKeyword = (index: number, field: keyof SmsKeywordRule, value: string) => {
    setState((prev) => ({
      ...prev,
      keywords: prev.keywords.map((k, i) =>
        i === index ? { ...k, [field]: value } : k,
      ),
    }));
  };

  const removeKeyword = (index: number) => {
    setState((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading SMS settings...
      </div>
    );
  }

  // ── Empty state (no provider configured) ────────────────────────────────
  if (!state.configured && !showConfigForm) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-4">
            <MessageSquare className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">SMS Not Configured</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-5">
            Bring your own Twilio, Vonage, or custom SMS gateway to send and
            receive text messages. Each tenant configures their own provider —
            credentials are stored encrypted.
          </p>
          <Button
            onClick={() => {
              setShowConfigForm(true);
              if (state.provider === 'none') {
                setState((prev) => ({ ...prev, provider: 'twilio' }));
              }
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Configure SMS
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── 1. Provider Configuration ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Phone className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Provider Configuration
                  {state.configured && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                    >
                      <CheckCircle2 className="size-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Each tenant brings their own SMS provider credentials.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Provider</Label>
            <Select
              value={state.provider}
              onValueChange={(v) =>
                setState((prev) => ({ ...prev, provider: v as SmsProvider }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account SID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Key className="size-3.5" />
              {state.provider === 'custom' ? 'Account / API ID' : 'Account SID'}
            </Label>
            <Input
              type={state.provider === 'twilio' ? 'text' : 'text'}
              placeholder={
                state.provider === 'twilio'
                  ? 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                  : 'Your account identifier'
              }
              value={state.accountSid}
              onChange={(e) =>
                setState((prev) => ({ ...prev, accountSid: e.target.value }))
              }
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Found in your {state.provider === 'twilio' ? 'Twilio' : state.provider === 'vonage' ? 'Vonage' : 'provider'} console dashboard.
            </p>
          </div>

          {/* Auth Token */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Key className="size-3.5" />
              Auth Token
            </Label>
            <div className="flex gap-2">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Enter your auth token"
                value={state.authToken}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, authToken: e.target.value }))
                }
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((s) => !s)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isMasked(state.authToken)
                ? 'Token is saved. Re-enter to replace it (shows •••••••• when unchanged).'
                : 'Stored encrypted (AES-256-GCM). Never returned in plaintext.'}
            </p>
          </div>

          {/* Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number</Label>
              <Input
                placeholder="+14155551234"
                value={state.phoneNumber}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                E.164 format — include country code, e.g. <code>+1 415 555 1234</code>.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sender ID (optional)</Label>
              <Input
                placeholder="MYBRAND"
                value={state.senderId}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, senderId: e.target.value }))
                }
                autoComplete="off"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                Alphanumeric sender ID (max 11 chars). Not supported in all regions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. 2-Way Messaging ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Reply className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">2-Way Messaging</CardTitle>
              <CardDescription>
                Receive inbound SMS replies from your customers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable 2-Way Messaging</Label>
              <p className="text-xs text-muted-foreground">
                Inbound replies are stored as conversations and shown in the omnichannel inbox.
              </p>
            </div>
            <Switch
              checked={state.twoWayEnabled}
              onCheckedChange={(v) =>
                setState((prev) => ({ ...prev, twoWayEnabled: v }))
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <LinkIcon className="size-3.5" />
              Webhook URL (read-only)
            </Label>
            <Input
              readOnly
              value={webhookUrl || '/api/sms/inbound'}
              className="font-mono text-xs bg-muted/40"
              onFocus={(e) => e.currentTarget.select()}
            />
            <p className="text-xs text-muted-foreground">
              Point your provider&apos;s inbound SMS webhook to this URL. Fieseros
              handles the inbound message and matches it to a conversation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Keywords ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <MessageSquare className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Keywords</CardTitle>
              <CardDescription>
                Auto-respond when a customer texts a specific keyword.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto-respond to keywords</Label>
              <p className="text-xs text-muted-foreground">
                When a customer texts a matching keyword, Fieseros replies with the configured response.
              </p>
            </div>
            <Switch
              checked={state.keywordsEnabled}
              onCheckedChange={(v) =>
                setState((prev) => ({ ...prev, keywordsEnabled: v }))
              }
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Keyword Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyword}
                className="gap-1.5"
              >
                <Plus className="size-3.5" /> Add Rule
              </Button>
            </div>

            {state.keywords.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 py-6 text-center text-sm text-muted-foreground">
                No keyword rules yet. Click <span className="font-medium">Add Rule</span> to create one.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Keyword</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead className="w-[60px] text-right">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.keywords.map((rule, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            placeholder="STOP"
                            value={rule.keyword}
                            onChange={(e) =>
                              updateKeyword(idx, 'keyword', e.target.value)
                            }
                            className="h-8 font-mono text-xs"
                            maxLength={64}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="You have been unsubscribed."
                            value={rule.response}
                            onChange={(e) =>
                              updateKeyword(idx, 'response', e.target.value)
                            }
                            className="h-8 text-xs"
                            maxLength={480}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeKeyword(idx)}
                            aria-label="Remove keyword rule"
                            title="Remove"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Test Configuration ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Send className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Test Configuration</CardTitle>
              <CardDescription>
                Send a test SMS to verify your provider settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.configured && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>
                Save your configuration before sending a test. If you&apos;ve entered
                a fresh auth token above (not the masked value), the test will use it directly.
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Phone Number</Label>
              <Input
                placeholder="+14155551234"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                E.164 format. Use a number you control.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Message</Label>
              <Input
                placeholder="Fieseros test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTest}
              disabled={testing}
              className="gap-1.5"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send Test SMS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Save button ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
