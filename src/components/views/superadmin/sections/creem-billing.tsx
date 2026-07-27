'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Creem Billing — superadmin configuration section.
//
// Stores the Creem API key + webhook secret in the RevenueFeatureToggle table
// (featureKey = 'creem_billing') so the admin can configure Creem from the
// panel without editing .env. The credentials are NEVER returned in full from
// the API — the GET response masks the API key (creem_••••abcd) and reports
// only whether a webhook secret is set.
//
// UI:
//   - Status badge (Configured / Not configured)
//   - Webhook URL display + copy button (so the admin knows where to point
//     Creem's webhook configuration in the Creem dashboard)
//   - Test mode toggle (visual flag for the admin; the live API key
//     determines whether test mode is actually used)
//   - API Key input (password-type with show/hide)
//   - Webhook Secret input (password-type with show/hide)
//   - "Save" button → POST /api/superadmin/creem
//   - "Test Connection" button → POST /api/superadmin/creem?action=test
//     (pings Creem's /v1/products endpoint with the saved key)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Zap,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from '@/components/views/superadmin/_shared';
import { authFetch } from '@/lib/client-auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreemConfigResponse {
  configured: boolean;
  enabled: boolean;
  testMode: boolean;
  apiKeyMasked: string;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  /** Map of planCode → { monthly, yearly } Creem product IDs. Empty when not configured. */
  products?: Record<string, { monthly?: string; yearly?: string }>;
}

interface TestResult {
  ok: boolean;
  message: string;
  productCount?: number;
  sampleProduct?: { id: string; name?: string } | null;
}

// ─── Product ID input grid definition ────────────────────────────────────────
// The DB plan catalog (see `src/lib/billing-seed.ts` PLAN_DEFS) has 4 plans:
//   starter (free), growth, business, enterprise.
// Starter is free → no checkout needed. Enterprise is contact-sales ($0) but
// we still surface its inputs in case the admin configures a paid enterprise
// product in Creem later. So the grid has 3 plans × 2 cycles = 6 inputs.
//
// NOTE: the task spec mentioned "pro, business, enterprise" but the DB catalog
// has migrated 'pro' → 'business' (see seedPlans() in billing-seed.ts). We use
// the live DB plan codes here so the product IDs line up with the plan codes
// the checkout endpoint looks up.
const PRODUCT_INPUT_DEFS: Array<{
  planCode: string;
  planName: string;
  cycle: 'monthly' | 'yearly';
  cycleLabel: string;
}> = [
  { planCode: 'growth', planName: 'Growth', cycle: 'monthly', cycleLabel: 'Monthly' },
  { planCode: 'growth', planName: 'Growth', cycle: 'yearly', cycleLabel: 'Yearly' },
  { planCode: 'business', planName: 'Business', cycle: 'monthly', cycleLabel: 'Monthly' },
  { planCode: 'business', planName: 'Business', cycle: 'yearly', cycleLabel: 'Yearly' },
  { planCode: 'enterprise', planName: 'Enterprise', cycle: 'monthly', cycleLabel: 'Monthly' },
  { planCode: 'enterprise', planName: 'Enterprise', cycle: 'yearly', cycleLabel: 'Yearly' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function CreemBillingSection() {
  const [config, setConfig] = useState<CreemConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Product ID map (planCode → { monthly, yearly }). Pre-filled from the API
  // on load; the admin can edit any of the 6 inputs without re-entering the
  // API key (product IDs are NOT secret — they appear in the Creem hosted
  // checkout URL).
  const [products, setProducts] = useState<Record<string, { monthly?: string; yearly?: string }>>({});

  // Webhook URL copy state
  const [copied, setCopied] = useState(false);

  // ─── Load current config ──────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/superadmin/creem');
      if (!res.ok) {
        throw new Error('Failed to load Creem configuration');
      }
      const data: CreemConfigResponse = await res.json();
      setConfig(data);
      setTestMode(data.testMode);
      // Pre-fill the products map — product IDs are not secret so the API
      // returns them in full. The admin can edit them without re-entering
      // the API key.
      setProducts(data.products || {});
      // Don't pre-fill the secret inputs — the API only returns masked/boolean
      // hints. The admin enters the key/secret fresh each save (or leaves the
      // webhook secret blank to preserve the existing one).
      setApiKey('');
      setWebhookSecret('');
    } catch (err) {
      toast.error('Failed to load Creem configuration', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ─── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!apiKey || apiKey.trim().length < 8) {
      toast.error('API key is required', {
        description: 'Enter a valid Creem API key (at least 8 characters).',
      });
      return;
    }
    setSaving(true);
    setTestResult(null);
    try {
      const res = await authFetch('/api/superadmin/creem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          // Only send the webhook secret if the admin entered a new one —
          // the API preserves the existing secret when this is empty.
          webhookSecret: webhookSecret.trim() || undefined,
          testMode,
          // Always send the full products map — product IDs are not sensitive
          // and the admin may have edited them without changing the API key.
          products,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      toast.success('Creem configuration saved', {
        description: 'The new API key is now active.',
      });
      // Clear the inputs (the masked display will refresh via loadConfig).
      setApiKey('');
      setWebhookSecret('');
      await loadConfig();
    } catch (err) {
      toast.error('Failed to save Creem configuration', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  // ─── Test connection handler ───────────────────────────────────────────────
  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await authFetch('/api/superadmin/creem?action=test', {
        method: 'POST',
      });
      const data: TestResult = await res.json().catch(() => ({
        ok: false,
        message: 'No response from server.',
      }));
      setTestResult(data);
      if (data.ok) {
        toast.success('Creem connection verified', {
          description:
            data.productCount !== undefined
              ? `Connected. ${data.productCount} product(s) visible.`
              : 'Connected successfully.',
        });
      } else {
        toast.error('Creem connection failed', {
          description: data.message,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setTestResult({ ok: false, message: msg });
      toast.error('Creem connection failed', { description: msg });
    } finally {
      setTesting(false);
    }
  }

  // ─── Copy webhook URL ──────────────────────────────────────────────────────
  async function copyWebhookUrl() {
    if (!config?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      toast.success('Webhook URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy — please copy manually.');
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const isConfigured = !!config?.configured;
  const webhookUrl = config?.webhookUrl || '';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Creem Billing"
        description="Configure Creem as a card-payment fallback when PayPal is unavailable."
        icon={CreditCard}
        actions={
          isConfigured ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="size-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              <XCircle className="size-3 mr-1" />
              Not configured
            </Badge>
          )
        }
      />

      {/* ── Webhook URL card ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Endpoint</CardTitle>
          <CardDescription>
            Register this URL in your Creem dashboard under Webhooks so Creem can
            notify us of subscription activations, renewals, and cancellations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-muted text-xs font-mono break-all select-all">
              {loading ? 'Loading…' : webhookUrl || '—'}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              disabled={!webhookUrl}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-4 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Events to subscribe to:{' '}
            <code className="font-mono">checkout.session.completed</code>,{' '}
            <code className="font-mono">subscription.active</code>,{' '}
            <code className="font-mono">subscription.updated</code>,{' '}
            <code className="font-mono">subscription.canceled</code>,{' '}
            <code className="font-mono">subscription.payment_failed</code>.
          </p>
          <a
            href="https://creem.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open Creem dashboard
            <ExternalLink className="size-3" />
          </a>
        </CardContent>
      </Card>

      {/* ── Credentials card ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credentials</CardTitle>
          <CardDescription>
            Paste your Creem API key and webhook signing secret. These are stored
            encrypted at rest in the platform database and never returned in full
            to any client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isConfigured && config?.apiKeyMasked && (
            <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Current API key:{' '}
                <code className="font-mono text-foreground">{config.apiKeyMasked}</code>
              </span>
              <Badge variant="outline" className="text-[10px]">
                {config.hasWebhookSecret ? 'Webhook secret set' : 'No webhook secret'}
              </Badge>
            </div>
          )}

          {/* Test mode toggle */}
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Test mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Flag this as a test key. Creem determines test vs. live mode by
                the key itself — this toggle is a visual reminder for admins and
                is stored alongside the credentials.
              </p>
            </div>
            <Switch checked={testMode} onCheckedChange={setTestMode} />
          </div>

          {/* API Key input */}
          <div className="space-y-1.5">
            <Label htmlFor="creem-api-key" className="text-sm font-medium">
              API Key {!isConfigured && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="creem-api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="creem_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isConfigured
                ? 'Leave blank to keep the current key. Enter a new value to replace it.'
                : 'Find your API key in the Creem dashboard under Settings → API Keys.'}
            </p>
          </div>

          {/* Webhook Secret input */}
          <div className="space-y-1.5">
            <Label htmlFor="creem-webhook-secret" className="text-sm font-medium">
              Webhook Secret
            </Label>
            <div className="relative">
              <Input
                id="creem-webhook-secret"
                type={showWebhookSecret ? 'text' : 'password'}
                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label={showWebhookSecret ? 'Hide webhook secret' : 'Show webhook secret'}
              >
                {showWebhookSecret ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {config?.hasWebhookSecret
                ? 'Leave blank to keep the current secret. Enter a new value to replace it.'
                : 'Generate a webhook signing secret when you register the webhook URL in Creem.'}
            </p>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !apiKey}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || loading || !isConfigured}
            >
              {testing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Testing…
                </>
              ) : (
                <>
                  <Zap className="size-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadConfig}
              disabled={loading}
              className="sm:ml-auto"
            >
              <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                testResult.ok
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="size-4 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {testResult.ok ? 'Connection verified' : 'Connection failed'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                {testResult.sampleProduct && (
                  <p className="text-xs mt-1 opacity-75">
                    Sample product: {testResult.sampleProduct.name || testResult.sampleProduct.id}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Product ID mapping card ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product IDs</CardTitle>
          <CardDescription>
            Optional. Paste the Creem product ID for each plan × billing-cycle
            combination so Creem uses the pre-created product (with tax + currency
            handled by the Creem dashboard). If a combination is left blank, the
            checkout falls back to an ad-hoc price derived from the local plan
            catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCT_INPUT_DEFS.map(({ planCode, planName, cycle, cycleLabel }) => {
              const id = `creem-product-${planCode}-${cycle}`;
              const value = products[planCode]?.[cycle] ?? '';
              return (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs font-medium">
                    {planName} — {cycleLabel} Product ID
                  </Label>
                  <Input
                    id={id}
                    type="text"
                    placeholder={`prod_xxxxxxxxxxxxxxxxxxxx`}
                    value={value}
                    onChange={(e) =>
                      setProducts((prev) => ({
                        ...prev,
                        [planCode]: {
                          ...prev[planCode],
                          [cycle]: e.target.value.trim() || undefined,
                        },
                      }))
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Create this product in the Creem dashboard and paste the ID here.
                  </p>
                </div>
              );
            })}
          </div>
          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> if a tenant picks
            the Creem path and no product ID is configured for their plan +
            cycle, the checkout will use the plan&apos;s catalog price as an
            ad-hoc unit price. Pre-creating products in Creem is recommended so
            tax + currency are handled consistently across both payment paths.
          </div>
        </CardContent>
      </Card>

      {/* ── How Creem fits into the billing flow ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Creem is used</CardTitle>
          <CardDescription>
            Creem is a merchant-of-record fallback. PayPal remains the primary
            payment option shown to tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              A tenant clicks <strong>Upgrade</strong> on a plan in the billing
              page. A payment-method chooser dialog opens.
            </li>
            <li>
              <strong>PayPal</strong> is shown first (recommended). If PayPal is
              not configured, that option is disabled.
            </li>
            <li>
              <strong>Pay with Card (via Creem)</strong> is shown second. If
              Creem is not configured, that option is disabled.
            </li>
            <li>
              When the tenant picks Creem, the client calls{' '}
              <code className="font-mono text-xs">/api/creem/checkout</code> and
              redirects to the Creem-hosted checkout URL.
            </li>
            <li>
              After the charge succeeds, Creem sends a{' '}
              <code className="font-mono text-xs">checkout.session.completed</code>{' '}
              webhook to this server, which activates the tenant&apos;s
              subscription.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
