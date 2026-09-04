'use client';

/**
 * VerificationComplianceSection
 * ------------------------------
 *
 * Reusable settings section that lets business owners complete the 6
 * marketplace eligibility requirements:
 *
 *   1. Business Registration (licence, VAT, pricing type, call-out fee)
 *   2. Insurance (provider, policy number)
 *   3. Identity Verification (self-declaration KYC)
 *   4. Payments (white-label — calls /api/payments/setup)
 *
 * Used by BOTH:
 *   - CRM users → embedded in the Settings page (settings-view.tsx)
 *   - Listing-only users → embedded as a "Verification" tab in the
 *     ListingProviderDashboard
 *
 * All fields save via PUT /api/tenants/[id] (which already supports all
 * these fields — no DB changes needed).
 *
 * Auto-verification logic:
 *   - businessVerified = true when licenceNumber is filled
 *   - insuranceVerified = true when insuranceProvider + policyNumber are filled
 *   - identityVerified = true when the user clicks "I confirm I am the
 *     business owner" (self-declaration KYC — no document upload yet)
 *   - stripeConnected = legacy fallback (pre-Airwallex migration); the UI
 *     prefers paymentsConnected but reads stripeConnected if the new column
 *     isn't populated yet.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Umbrella,
  CreditCard,
  CheckCircle2,
  Loader2,
  Save,
  ExternalLink,
  Award,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { VerificationDashboard } from './verification-dashboard';

interface TenantData {
  id: string;
  name: string;
  licenceNumber?: string | null;
  vatNumber?: string | null;
  pricingType?: string | null;
  callOutFee?: number | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceVerified?: boolean;
  identityVerified?: boolean;
  businessVerified?: boolean;
  stripeConnected?: boolean;
  stripeAccountId?: string | null;
  stripePayoutsEnabled?: boolean;
  // ── Provider-neutral marketplace payments (replaces Stripe-specific fields) ──
  // These are populated by GET /api/payments/status. The UI shows them as
  // "Payments" (white-label) — the underlying provider (Airwallex) is an
  // implementation detail and never appears in the user-facing copy.
  paymentsConnected?: boolean;
  payoutsEnabled?: boolean;
  paymentStatus?: 'not_connected' | 'created' | 'submitted' | 'action_required' | 'active' | 'suspended' | 'unknown' | string;
  pendingRequirements?: string[];
  representativeDeclaration?: boolean;
  currency?: string;
}

interface VerificationComplianceSectionProps {
  /** The tenant ID — used to fetch + save data */
  tenantId: string;
}

export function VerificationComplianceSection({ tenantId }: VerificationComplianceSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [data, setData] = useState<TenantData | null>(null);

  // Form state
  const [form, setForm] = useState({
    licenceNumber: '',
    vatNumber: '',
    pricingType: 'flat_rate',
    callOutFee: 0,
    insuranceProvider: '',
    insurancePolicyNumber: '',
  });

  // Load tenant data
  const loadData = useCallback(async () => {
    try {
      const res = await authFetch(`/api/tenants/${tenantId}?XTransformPort=3000`);
      if (res.ok) {
        const tenant = await res.json();
        setData(tenant);
        setForm({
          licenceNumber: tenant.licenceNumber || '',
          vatNumber: tenant.vatNumber || '',
          pricingType: tenant.pricingType || 'flat_rate',
          callOutFee: tenant.callOutFee || 0,
          insuranceProvider: tenant.insuranceProvider || '',
          insurancePolicyNumber: tenant.insurancePolicyNumber || '',
        });
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Save business registration + insurance fields
  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      // Phase 1.2: Do NOT auto-set businessVerified/insuranceVerified from
      // field entry. Entering a licence number saves the number — it does
      // NOT verify the business. Verification comes from evidence (Google
      // OAuth, OTP, document review), not from typing into a form.
      const res = await authFetch(`/api/tenants/${tenantId}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenceNumber: form.licenceNumber || null,
          vatNumber: form.vatNumber || null,
          pricingType: form.pricingType,
          callOutFee: Number(form.callOutFee) || 0,
          insuranceProvider: form.insuranceProvider || null,
          insurancePolicyNumber: form.insurancePolicyNumber || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        toast.success('Details saved', {
          description: 'Your business details have been saved. Verification status is reviewed separately.',
        });
      } else {
        toast.error('Failed to save. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Phase 3: Representative declaration (NOT KYC)
  // The user attests they are authorized to represent the business.
  // This is recorded with a timestamp + user ID for audit. It is NOT
  // identity verification — it's an attestation that contributes to
  // the verification profile but is never sufficient by itself.
  async function handleRepresentativeDeclaration() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representativeDeclaration: true,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        toast.success('Declaration recorded', {
          description: 'Your representative declaration has been recorded.',
        });
      } else {
        toast.error('Failed to record declaration.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSaving(false);
    }
  }

  // "Set up payments" — white-label entry point for marketplace payment setup.
  // Calls POST /api/payments/setup which creates the provider connected
  // account + returns the hosted onboarding URL. The provider (Airwallex)
  // is an implementation detail — the user sees "Set up payments", not
  // "Connect Airwallex".
  async function handleSetUpPayments() {
    setConnectingStripe(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnUrl = `${origin}/?payments=return`;
      const res = await fetch('/api/payments/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl }),
      });
      const result = await res.json();
      if (res.ok && result.onboardingUrl) {
        // Redirect to the provider's hosted onboarding (KYC/KYB).
        // The provider's logo WILL appear on the onboarding form (legal
        // compliance requirement) — this is expected + matches how Stripe
        // Connect onboarding worked previously. Fieseros owns the
        // surrounding experience; Airwallex provides the infrastructure.
        window.location.href = result.onboardingUrl;
      } else if (res.ok && result.status === 'active') {
        // Already verified — refresh the status.
        toast.success('Payments are already active.');
        refreshPaymentStatus();
      } else if (res.ok && result.demo) {
        toast.info('Demo mode', {
          description: 'Payment provider not configured — running in demo mode.',
        });
      } else {
        toast.error(result.error || 'Failed to start payment setup.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setConnectingStripe(false);
    }
  }

  // Poll the payment setup status so the UI updates when the seller
  // completes hosted KYC onboarding (redirects back to the app).
  async function refreshPaymentStatus() {
    try {
      const res = await fetch('/api/payments/status');
      if (res.ok) {
        const status = await res.json();
        setData((prev) => prev ? { ...prev,
          paymentsConnected: status.paymentsConnected,
          payoutsEnabled: status.payoutsEnabled,
          paymentStatus: status.status,
          pendingRequirements: status.pendingRequirements || [],
          // Keep legacy fields in sync for any code that still reads them:
          stripeConnected: status.paymentsConnected,
          stripePayoutsEnabled: status.payoutsEnabled,
        } : prev);
      }
    } catch {
      // best-effort — silent failure
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading verification status...
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Unable to load verification data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Verification Dashboard (Phase 9-10 + Gate B UI) ─────────────── */}
      {/* Dynamic verification options — phone OTP, email OTP, Google Business,
          representative declaration. Shows trust level + available methods. */}
      <VerificationDashboard tenantId={tenantId} />

      {/* ── Business Registration (submitted information — not verification) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Business Registration
          </CardTitle>
          <CardDescription>
            Enter your business registration details. Filling in the licence number
            automatically marks your business as verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="licence-number" className="mb-1.5 block">
                Business Licence Number
              </Label>
              <Input
                id="licence-number"
                value={form.licenceNumber}
                onChange={(e) => update('licenceNumber', e.target.value)}
                placeholder="e.g. LIC-12345678"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {data.businessVerified ? (
                  <span className="text-emerald-600 font-medium">✓ Business verified</span>
                ) : (
                  'Enter your licence number to get verified'
                )}
              </p>
            </div>
            <div>
              <Label htmlFor="vat-number" className="mb-1.5 block">
                VAT / Tax Number
              </Label>
              <Input
                id="vat-number"
                value={form.vatNumber}
                onChange={(e) => update('vatNumber', e.target.value)}
                placeholder="e.g. GST123456789"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricing-type" className="mb-1.5 block">
                Pricing Type
              </Label>
              <select
                id="pricing-type"
                value={form.pricingType}
                onChange={(e) => update('pricingType', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="flat_rate">Flat Rate</option>
                <option value="hourly">Hourly</option>
                <option value="per_sqft">Per Sq Ft</option>
                <option value="quote_based">Quote-Based</option>
              </select>
            </div>
            <div>
              <Label htmlFor="call-out-fee" className="mb-1.5 block">
                Call-out Fee ({data.currency || 'USD'})
              </Label>
              <Input
                id="call-out-fee"
                type="number"
                value={form.callOutFee}
                onChange={(e) => update('callOutFee', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Insurance ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5 text-emerald-600" />
            Insurance
          </CardTitle>
          <CardDescription>
            Enter your liability insurance details. Filling in both fields
            automatically marks your insurance as verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurance-provider" className="mb-1.5 block">
                Insurance Provider
              </Label>
              <Input
                id="insurance-provider"
                value={form.insuranceProvider}
                onChange={(e) => update('insuranceProvider', e.target.value)}
                placeholder="e.g. State Farm"
              />
            </div>
            <div>
              <Label htmlFor="insurance-policy" className="mb-1.5 block">
                Policy Number
              </Label>
              <Input
                id="insurance-policy"
                value={form.insurancePolicyNumber}
                onChange={(e) => update('insurancePolicyNumber', e.target.value)}
                placeholder="e.g. POL-987654321"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {data.insuranceVerified ? (
              <span className="text-emerald-600 font-medium">✓ Insurance verified</span>
            ) : (
              'Enter both provider and policy number to get insurance-verified'
            )}
          </p>
        </CardContent>
      </Card>

      {/* ── Business Representative Declaration (Phase 3) ─────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            Business Representative Declaration
          </CardTitle>
          <CardDescription>
            Confirm that you are authorized to represent this business. This is
            an attestation — not identity verification (KYC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.representativeDeclaration ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Representative declaration confirmed
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                By clicking below, you confirm that you are the owner or authorized
                representative of <strong>{data.name}</strong> and that the information
                you have provided is accurate.
              </p>
              <Button
                onClick={handleRepresentativeDeclaration}
                disabled={saving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> I confirm I am authorized to represent this business</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payments (white-label) ──────────────────────────────────────── */}
      {/* The user sees "Payments" — never "Airwallex" or "Stripe". The
          underlying provider is an implementation detail. Hosted KYC
          onboarding (where the provider's logo does appear for legal
          compliance) is reached via the "Set up payments" button. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Payments
          </CardTitle>
          <CardDescription>
            Add your business and payout details to receive payments from customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.paymentsConnected || data.stripeConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Payments connected
              </div>
              {data.payoutsEnabled || data.stripePayoutsEnabled ? (
                <Badge className="bg-emerald-100 text-emerald-700">Payments active</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  {data.paymentStatus === 'action_required'
                    ? 'Action needed — complete verification'
                    : 'Verification in progress'}
                </Badge>
              )}
              {data.pendingRequirements && data.pendingRequirements.length > 0 && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Outstanding requirements:
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                    {data.pendingRequirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!(data.payoutsEnabled || data.stripePayoutsEnabled) && (
                <Button
                  onClick={handleSetUpPayments}
                  disabled={connectingStripe}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  {connectingStripe ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    'Resume verification'
                  )}
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={handleSetUpPayments}
              disabled={connectingStripe}
              className="gap-1.5"
            >
              {connectingStripe ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Set up payments</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Save button ────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Verification Details</>
          )}
        </Button>
      </div>
    </div>
  );
}
