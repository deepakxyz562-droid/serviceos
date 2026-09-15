'use client';

/**
 * Payment Integrations settings section.
 *
 * Supported payment options:
 *   1. Razorpay    — Key ID + Key Secret (India UPI, GPay, PhonePe, Cards, Netbanking).
 *   2. Stripe      — Direct API Keys (Publishable + Secret) or Connect.
 *   3. PayPal      — Client ID + Client Secret + Sandbox toggle.
 *   4. Square      — Application ID + Access Token + Location ID.
 *   5. Direct Bank — Account Name, Bank Name, Account Number, Routing/IFSC/IBAN/Sort Code/BSB.
 *   6. UPI Direct  — UPI ID (VPA) & Merchant Name.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  Wallet,
  Loader2,
  Save,
  ShieldCheck,
  ShieldAlert,
  TestTube2,
  Eye,
  EyeOff,
  ExternalLink,
  QrCode,
  Info,
  CheckCircle2,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StripeSettings {
  connected: boolean;
  accountId: string;
  payoutsEnabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  mode?: 'direct' | 'connect';
}

interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

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

interface DirectBankSettings {
  enabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  ifscCode?: string;
  sortCode?: string;
  bsb?: string;
  iban?: string;
  swiftBic?: string;
  instructions?: string;
}

interface UpiSettings {
  enabled: boolean;
  upiId: string;
  merchantName?: string;
}

interface PaymentIntegrationsSettings {
  stripe: StripeSettings;
  razorpay: RazorpaySettings;
  paypal: PayPalSettings;
  square: SquareSettings;
  directBank: DirectBankSettings;
  upi: UpiSettings;
}

const DEFAULT_SETTINGS: PaymentIntegrationsSettings = {
  stripe: { connected: false, accountId: '', payoutsEnabled: false, publishableKey: '', secretKey: '', webhookSecret: '', mode: 'direct' },
  razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
  paypal: { clientId: '', clientSecret: '', sandbox: true },
  square: { applicationId: '', accessToken: '', locationId: '' },
  directBank: { enabled: false, bankName: '', accountName: '', accountNumber: '', routingNumber: '', ifscCode: '', sortCode: '', bsb: '', iban: '', swiftBic: '', instructions: '' },
  upi: { enabled: false, upiId: '', merchantName: '' },
};

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return connected ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent gap-1">
      <ShieldCheck className="size-3" />
      {label || 'Active'}
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <ShieldAlert className="size-3" />
      {label || 'Not Configured'}
    </Badge>
  );
}

export function PaymentIntegrationsSettings() {
  const [settings, setSettings] = useState<PaymentIntegrationsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Show/hide secret toggles
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPayPalSecret, setShowPayPalSecret] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/payment-integrations');
      if (res.ok) {
        const data = (await res.json()) as PaymentIntegrationsSettings;
        setSettings({
          stripe: {
            connected: !!data.stripe?.connected,
            accountId: data.stripe?.accountId || '',
            payoutsEnabled: !!data.stripe?.payoutsEnabled,
            publishableKey: data.stripe?.publishableKey || '',
            secretKey: data.stripe?.secretKey || '',
            webhookSecret: data.stripe?.webhookSecret || '',
            mode: data.stripe?.mode || 'direct',
          },
          razorpay: {
            enabled: !!data.razorpay?.enabled,
            keyId: data.razorpay?.keyId || '',
            keySecret: data.razorpay?.keySecret || '',
            webhookSecret: data.razorpay?.webhookSecret || '',
          },
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
          directBank: {
            enabled: !!data.directBank?.enabled,
            bankName: data.directBank?.bankName || '',
            accountName: data.directBank?.accountName || '',
            accountNumber: data.directBank?.accountNumber || '',
            routingNumber: data.directBank?.routingNumber || '',
            ifscCode: data.directBank?.ifscCode || '',
            sortCode: data.directBank?.sortCode || '',
            bsb: data.directBank?.bsb || '',
            iban: data.directBank?.iban || '',
            swiftBic: data.directBank?.swiftBic || '',
            instructions: data.directBank?.instructions || '',
          },
          upi: {
            enabled: !!data.upi?.enabled,
            upiId: data.upi?.upiId || '',
            merchantName: data.upi?.merchantName || '',
          },
        });
      } else {
        toast.error('Failed to load payment settings');
      }
    } catch {
      toast.error('Network error loading payment settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (provider: string) => {
    setSavingProvider(provider);
    try {
      const payload: Record<string, unknown> = { action: 'save' };
      if (provider === 'razorpay') payload.razorpay = settings.razorpay;
      if (provider === 'stripe') payload.stripe = settings.stripe;
      if (provider === 'paypal') payload.paypal = settings.paypal;
      if (provider === 'square') payload.square = settings.square;
      if (provider === 'directBank') payload.directBank = settings.directBank;
      if (provider === 'upi') payload.upi = settings.upi;

      const res = await authFetch('/api/settings/payment-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { settings: PaymentIntegrationsSettings };
        if (data?.settings) setSettings(data.settings);
        toast.success(`${provider.toUpperCase()} settings saved successfully`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to save ${provider} settings`);
      }
    } catch {
      toast.error('Network error saving settings');
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTest = async (provider: 'razorpay' | 'stripe' | 'paypal' | 'square') => {
    setTestingProvider(provider);
    try {
      const payload: Record<string, unknown> = { action: 'test', provider };
      if (provider === 'razorpay') payload.razorpay = settings.razorpay;
      if (provider === 'stripe') payload.stripe = settings.stripe;
      if (provider === 'paypal') payload.paypal = settings.paypal;
      if (provider === 'square') payload.square = settings.square;

      const res = await authFetch('/api/settings/payment-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || 'Connection successful!');
      } else {
        toast.error(data.message || 'Connection test failed');
      }
    } catch {
      toast.error('Connection test request failed');
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-1.5 text-foreground">
        <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
          <Info className="size-4 shrink-0" />
          Direct-to-Provider Settlement (Zero Intermediary Risk)
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Customer invoice payments deposit directly into your connected bank or gateway account. Fieseros does not process, hold, or escrow your customer funds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ── 1. Razorpay Card (India UPI, GPay, PhonePe, Cards) ──────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="size-4 text-blue-600" />
                  Razorpay (India UPI, Google Pay, PhonePe & Cards)
                </CardTitle>
                <CardDescription className="text-xs">
                  Accept instant UPI, QR codes, debit/credit cards, and Netbanking. Instant automated verification.
                </CardDescription>
              </div>
              <StatusBadge connected={!!(settings.razorpay.keyId && settings.razorpay.keySecret)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-xs font-semibold">Enable Razorpay Checkout</p>
                <p className="text-[11px] text-muted-foreground">Show Razorpay on customer pay screens</p>
              </div>
              <Switch
                checked={settings.razorpay.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    razorpay: { ...settings.razorpay, enabled: checked },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Key ID</Label>
                <Input
                  placeholder="rzp_live_..."
                  value={settings.razorpay.keyId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      razorpay: { ...settings.razorpay, keyId: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Key Secret</Label>
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showRazorpaySecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showRazorpaySecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  type={showRazorpaySecret ? 'text' : 'password'}
                  placeholder="Secret from Razorpay Dashboard"
                  value={settings.razorpay.keySecret}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      razorpay: { ...settings.razorpay, keySecret: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest('razorpay')}
                disabled={testingProvider === 'razorpay' || !settings.razorpay.keyId}
                className="gap-1.5 text-xs"
              >
                {testingProvider === 'razorpay' ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
                Test Connection
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('razorpay')}
                disabled={savingProvider === 'razorpay'}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingProvider === 'razorpay' ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save Razorpay
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Stripe Direct Card (US / UK / EU / Global) ─────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="size-4 text-indigo-600" />
                  Stripe (Cards, Apple Pay, Google Pay, ACH, SEPA)
                </CardTitle>
                <CardDescription className="text-xs">
                  Connect your Stripe account for 1-tap customer card & wallet payments with instant auto-verification.
                </CardDescription>
              </div>
              <StatusBadge connected={!!(settings.stripe.publishableKey && settings.stripe.secretKey)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Publishable Key</Label>
                <Input
                  placeholder="pk_live_..."
                  value={settings.stripe.publishableKey || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      stripe: { ...settings.stripe, publishableKey: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Secret Key</Label>
                  <button
                    type="button"
                    onClick={() => setShowStripeSecret(!showStripeSecret)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showStripeSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showStripeSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  type={showStripeSecret ? 'text' : 'password'}
                  placeholder="sk_live_..."
                  value={settings.stripe.secretKey || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      stripe: { ...settings.stripe, secretKey: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest('stripe')}
                disabled={testingProvider === 'stripe' || !settings.stripe.secretKey}
                className="gap-1.5 text-xs"
              >
                {testingProvider === 'stripe' ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
                Test Connection
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('stripe')}
                disabled={savingProvider === 'stripe'}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingProvider === 'stripe' ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save Stripe
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Direct Bank Transfer Card ─────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-600" />
                  Direct Bank Transfer / Wire Instructions
                </CardTitle>
                <CardDescription className="text-xs">
                  Display your official bank account details on customer invoices with 1-click copy buttons and "I&apos;ve Paid" reporting.
                </CardDescription>
              </div>
              <StatusBadge connected={settings.directBank.enabled && !!settings.directBank.accountNumber} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-xs font-semibold">Enable Direct Bank Transfer</p>
                <p className="text-[11px] text-muted-foreground">Show bank details tab on customer invoice checkout</p>
              </div>
              <Switch
                checked={settings.directBank.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    directBank: { ...settings.directBank, enabled: checked },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank Name</Label>
                <Input
                  placeholder="e.g. Chase / HDFC / Barclays / TD"
                  value={settings.directBank.bankName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      directBank: { ...settings.directBank, bankName: e.target.value },
                    })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Beneficiary Name</Label>
                <Input
                  placeholder="e.g. ABC Plumbing LLC"
                  value={settings.directBank.accountName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      directBank: { ...settings.directBank, accountName: e.target.value },
                    })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Number</Label>
                <Input
                  placeholder="e.g. 1234567890"
                  value={settings.directBank.accountNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      directBank: { ...settings.directBank, accountNumber: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Routing / IFSC / Sort Code / BSB</Label>
                <Input
                  placeholder="e.g. HDFC0001234 / 062-000 / 021000021"
                  value={settings.directBank.ifscCode || settings.directBank.routingNumber || settings.directBank.sortCode || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      directBank: {
                        ...settings.directBank,
                        ifscCode: e.target.value,
                        routingNumber: e.target.value,
                      },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">IBAN / SWIFT (International Wire)</Label>
                <Input
                  placeholder="Optional for international wires (e.g. GB29NWBK60161331926819)"
                  value={settings.directBank.iban || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      directBank: { ...settings.directBank, iban: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => handleSave('directBank')}
                disabled={savingProvider === 'directBank'}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingProvider === 'directBank' ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save Bank Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. UPI Direct Card ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="size-4 text-purple-600" />
                  UPI Direct ID / VPA
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide your direct UPI ID (e.g. yourbusiness@okhdfcbank) for 1-tap mobile app launch and QR display.
                </CardDescription>
              </div>
              <StatusBadge connected={settings.upi.enabled && !!settings.upi.upiId} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-xs font-semibold">Enable Direct UPI ID</p>
                <p className="text-[11px] text-muted-foreground">Show UPI transfer option on invoice page</p>
              </div>
              <Switch
                checked={settings.upi.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    upi: { ...settings.upi, enabled: checked },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">UPI ID (VPA)</Label>
                <Input
                  placeholder="e.g. business@upi"
                  value={settings.upi.upiId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      upi: { ...settings.upi, upiId: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Merchant Display Name</Label>
                <Input
                  placeholder="e.g. ABC Plumbing Services"
                  value={settings.upi.merchantName || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      upi: { ...settings.upi, merchantName: e.target.value },
                    })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => handleSave('upi')}
                disabled={savingProvider === 'upi'}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingProvider === 'upi' ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save UPI ID
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 5. PayPal Card ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="size-4 text-blue-500" />
                  PayPal Business
                </CardTitle>
                <CardDescription className="text-xs">
                  Accept PayPal balance and international credit card payments.
                </CardDescription>
              </div>
              <StatusBadge connected={!!(settings.paypal.clientId && settings.paypal.clientSecret)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Client ID</Label>
                <Input
                  placeholder="PayPal REST Client ID"
                  value={settings.paypal.clientId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paypal: { ...settings.paypal, clientId: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Client Secret</Label>
                  <button
                    type="button"
                    onClick={() => setShowPayPalSecret(!showPayPalSecret)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showPayPalSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showPayPalSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  type={showPayPalSecret ? 'text' : 'password'}
                  placeholder="PayPal Client Secret"
                  value={settings.paypal.clientSecret}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paypal: { ...settings.paypal, clientSecret: e.target.value },
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest('paypal')}
                disabled={testingProvider === 'paypal' || !settings.paypal.clientId}
                className="gap-1.5 text-xs"
              >
                {testingProvider === 'paypal' ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
                Test Connection
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('paypal')}
                disabled={savingProvider === 'paypal'}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingProvider === 'paypal' ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save PayPal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
