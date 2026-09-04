'use client';

/**
 * Payment Integrations settings section.
 *
 * Two cards:
 *   1. PayPal     — Client ID + Client Secret + Sandbox toggle. Save &
 *                   Test Connection. Secrets masked in API response.
 *   2. Square     — Application ID + Access Token + Location ID. Save &
 *                   Test Connection.
 *
 * Backed by `/api/settings/payment-integrations` (GET + PUT). All secrets
 * are stored under `Tenant.settingsJson.paymentIntegrations` (no new Prisma
 * models).
 *
 * NOTE: Marketplace payment setup (Airwallex) is NOT on this page — it's
 * on Settings → Verification & Compliance → "Payments" card, which calls
 * the white-label /api/payments/setup + /api/payments/status routes.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Banknote,
  Wallet,
  Loader2,
  Save,
  Plug,
  PlugZap,
  ShieldCheck,
  ShieldAlert,
  TestTube2,
  Unplug,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}
interface SquareSettings {
  applicationId: string;
  accessToken: string;
  locationId: string;
}
interface QuickBooksSettings {
  connected: boolean;
  companyId: string;
}
interface BankFeedsSettings {
  enabled: boolean;
}
interface PaymentIntegrationsSettings {
  paypal: PayPalSettings;
  square: SquareSettings;
  quickbooks: QuickBooksSettings;
  bankFeeds: BankFeedsSettings;
}

const DEFAULT_SETTINGS: PaymentIntegrationsSettings = {
  paypal: { clientId: '', clientSecret: '', sandbox: true },
  square: { applicationId: '', accessToken: '', locationId: '' },
  quickbooks: { connected: false, companyId: '' },
  bankFeeds: { enabled: false },
};

// ─── Small helpers ───────────────────────────────────────────────────────────
function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return connected ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent gap-1">
      <ShieldCheck className="size-3" />
      {label || 'Connected'}
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <ShieldAlert className="size-3" />
      {label || 'Not Connected'}
    </Badge>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PaymentIntegrationsSettings() {
  const [settings, setSettings] = useState<PaymentIntegrationsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<null | 'paypal' | 'square'>(null);
  const [testingProvider, setTestingProvider] = useState<null | 'paypal' | 'square'>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<null | 'quickbooks'>(null);

  // Show/hide secret toggles
  const [showPayPalSecret, setShowPayPalSecret] = useState(false);
  const [showSquareToken, setShowSquareToken] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/payment-integrations');
      if (res.ok) {
        const data = (await res.json()) as PaymentIntegrationsSettings;
        setSettings({
          paypal: {
            clientId: data.paypal?.clientId || '',
            clientSecret: data.paypal?.clientSecret || '',
            sandbox: data.paypal?.sandbox ?? true,
          },
          square: {
            applicationId: data.square?.applicationId || '',
            accessToken: data.square?.accessToken || '',
            locationId: data.square?.locationId || '',
          },
          quickbooks: {
            connected: !!data.quickbooks?.connected,
            companyId: data.quickbooks?.companyId || '',
          },
          bankFeeds: { enabled: !!data.bankFeeds?.enabled },
        });
      } else {
        toast.error('Failed to load payment integrations');
      }
    } catch {
      toast.error('Network error loading payment integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ─── Save (PayPal or Square) ──────────────────────────────────────────────
  const handleSave = async (provider: 'paypal' | 'square') => {
    setSavingProvider(provider);
    try {
      const payload: Record<string, unknown> = { action: 'save' };
      if (provider === 'paypal') {
        payload.paypal = {
          clientId: settings.paypal.clientId,
          clientSecret: settings.paypal.clientSecret,
          sandbox: settings.paypal.sandbox,
        };
      } else {
        payload.square = {
          applicationId: settings.square.applicationId,
          accessToken: settings.square.accessToken,
          locationId: settings.square.locationId,
        };
      }
      const res = await authFetch('/api/settings/payment-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings: PaymentIntegrationsSettings };
        // Refresh from the masked response so the secret fields show the mask.
        if (data?.settings) {
          setSettings((prev) => ({
            ...prev,
            paypal: {
              ...prev.paypal,
              clientSecret: data.settings.paypal.clientSecret || prev.paypal.clientSecret,
            },
            square: {
              ...prev.square,
              accessToken: data.settings.square.accessToken || prev.square.accessToken,
            },
          }));
        }
        toast.success(`${provider === 'paypal' ? 'PayPal' : 'Square'} settings saved`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to save ${provider} settings`);
      }
    } catch {
      toast.error(`Network error saving ${provider} settings`);
    } finally {
      setSavingProvider(null);
    }
  };

  // ─── Test Connection ──────────────────────────────────────────────────────
  const handleTest = async (provider: 'paypal' | 'square') => {
    setTestingProvider(provider);
    try {
      const payload: Record<string, unknown> = { action: 'test', provider };
      if (provider === 'paypal') {
        payload.paypal = {
          clientId: settings.paypal.clientId,
          clientSecret: settings.paypal.clientSecret,
          sandbox: settings.paypal.sandbox,
        };
      } else {
        payload.square = {
          applicationId: settings.square.applicationId,
          accessToken: settings.square.accessToken,
          locationId: settings.square.locationId,
        };
      }
      const res = await authFetch('/api/settings/payment-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        toast.success(data.message || `${provider} connection OK`);
      } else {
        toast.error(data.message || data.error || `${provider} connection failed`);
      }
    } catch {
      toast.error(`Network error testing ${provider} connection`);
    } finally {
      setTestingProvider(null);
    }
  };

  // ─── Disconnect (QuickBooks) ────────────────────────────────────────────
  const handleDisconnect = async (provider: 'quickbooks') => {
    if (!confirm(`Disconnect QuickBooks? You will need to reconnect to sync transactions.`)) {
      return;
    }
    setDisconnectingProvider(provider);
    try {
      const res = await authFetch('/api/settings/payment-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', provider }),
      });
      if (res.ok) {
        toast.success(`QuickBooks disconnected`);
        await fetchSettings();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to disconnect ${provider}`);
      }
    } catch {
      toast.error(`Network error disconnecting ${provider}`);
    } finally {
      setDisconnectingProvider(null);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading payment integrations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Marketplace payments info banner ─────────────────────────────── */}
      {/* Marketplace payment setup (Airwallex) is on the Verification & Compliance
          page — not here. This banner points users there so they know where to
          find the "Set up payments" flow. */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="size-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            Marketplace payment setup
          </p>
          <p className="text-emerald-700 dark:text-emerald-400 mt-1">
            To receive marketplace payouts, set up your payment account under
            Settings → Verification &amp; Compliance → Payments.
          </p>
        </div>
      </div>

      {/* ─── PayPal ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Wallet className="size-4 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  PayPal
                  <StatusBadge connected={!!settings.paypal.clientId && !!settings.paypal.clientSecret} />
                </CardTitle>
                <CardDescription>
                  Accept PayPal and credit-card payments via PayPal REST API.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client ID</Label>
              <Input
                placeholder="PayPal Client ID"
                value={settings.paypal.clientId}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, paypal: { ...p.paypal, clientId: e.target.value } }))
                }
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="size-3.5" /> Client Secret
              </Label>
              <div className="relative">
                <Input
                  type={showPayPalSecret ? 'text' : 'password'}
                  placeholder="PayPal Client Secret"
                  value={settings.paypal.clientSecret}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      paypal: { ...p.paypal, clientSecret: e.target.value },
                    }))
                  }
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 size-7"
                  onClick={() => setShowPayPalSecret((s) => !s)}
                  aria-label={showPayPalSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showPayPalSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              {settings.paypal.clientSecret.startsWith('****') && (
                <p className="text-xs text-muted-foreground">
                  Secret is masked — re-enter to update.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm font-medium">Sandbox mode</Label>
              <p className="text-xs text-muted-foreground">
                Use PayPal&apos;s sandbox environment for testing.
              </p>
            </div>
            <Switch
              checked={settings.paypal.sandbox}
              onCheckedChange={(v) =>
                setSettings((p) => ({ ...p, paypal: { ...p.paypal, sandbox: v } }))
              }
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => handleTest('paypal')}
              disabled={testingProvider === 'paypal' || savingProvider === 'paypal'}
            >
              {testingProvider === 'paypal' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TestTube2 className="size-4" />
              )}
              Test Connection
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleSave('paypal')}
              disabled={testingProvider === 'paypal' || savingProvider === 'paypal'}
            >
              {savingProvider === 'paypal' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Square ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-slate-100 dark:bg-slate-900/40">
                <Banknote className="size-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Square
                  <StatusBadge
                    connected={!!settings.square.applicationId && !!settings.square.accessToken}
                  />
                </CardTitle>
                <CardDescription>
                  Accept in-person and online payments via Square.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Application ID</Label>
              <Input
                placeholder="sq0idp-..."
                value={settings.square.applicationId}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    square: { ...p.square, applicationId: e.target.value },
                  }))
                }
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location ID</Label>
              <Input
                placeholder="sq0loc-... or LB..."
                value={settings.square.locationId}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    square: { ...p.square, locationId: e.target.value },
                  }))
                }
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="size-3.5" /> Access Token
            </Label>
            <div className="relative">
              <Input
                type={showSquareToken ? 'text' : 'password'}
                placeholder="sq0atp-... (production) or EAA... (sandbox)"
                value={settings.square.accessToken}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    square: { ...p.square, accessToken: e.target.value },
                  }))
                }
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 size-7"
                onClick={() => setShowSquareToken((s) => !s)}
                aria-label={showSquareToken ? 'Hide token' : 'Show token'}
              >
                {showSquareToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
            {settings.square.accessToken.startsWith('****') && (
              <p className="text-xs text-muted-foreground">
                Token is masked — re-enter to update.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => handleTest('square')}
              disabled={testingProvider === 'square' || savingProvider === 'square'}
            >
              {testingProvider === 'square' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TestTube2 className="size-4" />
              )}
              Test Connection
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleSave('square')}
              disabled={testingProvider === 'square' || savingProvider === 'square'}
            >
              {savingProvider === 'square' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
