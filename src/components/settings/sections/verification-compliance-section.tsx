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
 *   4. Stripe Connect (wire up existing API)
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
 *   - stripeConnected = handled via the Stripe Connect OAuth flow
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
      // Auto-verify: business verified when licence is filled
      const shouldBusinessVerified = !!form.licenceNumber.trim();
      // Auto-verify: insurance verified when provider + policy are filled
      const shouldInsuranceVerified = !!form.insuranceProvider.trim() && !!form.insurancePolicyNumber.trim();

      const res = await authFetch(`/api/tenants/${tenantId}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenceNumber: form.licenceNumber || null,
          vatNumber: form.vatNumber || null,
          pricingType: form.pricingType,
          callOutFee: Number(form.callOutFee) || 0,
          insuranceProvider: form.insuranceProvider || null,
          insurancePolicyNumber: form.insurancePolicyNumber || null,
          // Auto-set verification flags
          businessVerified: shouldBusinessVerified,
          insuranceVerified: shouldInsuranceVerified,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        toast.success('Verification details saved', {
          description: shouldBusinessVerified
            ? 'Business verification updated.'
            : 'Fill in your licence number to get business-verified.',
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

  // Self-declaration KYC
  async function handleIdentityVerify() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityVerified: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        toast.success('Identity verified', {
          description: 'Your identity has been self-verified.',
        });
      } else {
        toast.error('Failed to verify identity.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSaving(false);
    }
  }

  // Stripe Connect — wire up the existing API
  async function handleStripeConnect() {
    setConnectingStripe(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnUrl = `${origin}/?stripe_connect=return`;
      const refreshUrl = `${origin}/?stripe_connect=refresh`;
      const res = await fetch(
        `/api/billing/stripe/connect?returnUrl=${encodeURIComponent(returnUrl)}&refreshUrl=${encodeURIComponent(refreshUrl)}`,
        { method: 'POST' },
      );
      const result = await res.json();
      if (res.ok && result.url) {
        // Redirect to Stripe onboarding
        window.location.href = result.url;
      } else {
        toast.error(result.error || 'Failed to start Stripe Connect.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setConnectingStripe(false);
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
      {/* ── Eligibility summary ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Marketplace Eligibility
          </CardTitle>
          <CardDescription>
            Complete these steps to start receiving marketplace leads and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EligibilityItem
              label="Active Subscription"
              done={false}
              hint="Upgrade from trial to a paid plan"
            />
            <EligibilityItem
              label="Identity Verified"
              done={!!data.identityVerified}
              hint="Self-declaration KYC"
            />
            <EligibilityItem
              label="Business Verified"
              done={!!data.businessVerified}
              hint="Enter your licence number below"
            />
            <EligibilityItem
              label="Insurance Verified"
              done={!!data.insuranceVerified}
              hint="Enter insurance details below"
            />
            <EligibilityItem
              label="Stripe Connected"
              done={!!data.stripeConnected}
              hint="Connect Stripe for payouts"
            />
            <EligibilityItem
              label="Profile ≥ 80%"
              done={false}
              hint="Fill out your public hub profile"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Business Registration ──────────────────────────────────────── */}
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

      {/* ── Identity Verification (KYC) ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            Identity Verification (KYC)
          </CardTitle>
          <CardDescription>
            Confirm that you are the authorized owner of this business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.identityVerified ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Identity verified
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                By clicking below, you confirm that you are the authorized owner or
                representative of <strong>{data.name}</strong> and that the information
                you have provided is accurate.
              </p>
              <Button
                onClick={handleIdentityVerify}
                disabled={saving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> I confirm I am the business owner</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stripe Connect ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Stripe Connect
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive marketplace payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.stripeConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Stripe connected
                {data.stripeAccountId && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Account: {data.stripeAccountId.slice(0, 12)}...
                  </span>
                )}
              </div>
              {data.stripePayoutsEnabled ? (
                <Badge className="bg-emerald-100 text-emerald-700">Payouts enabled</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  Complete Stripe requirements to enable payouts
                </Badge>
              )}
            </div>
          ) : (
            <Button
              onClick={handleStripeConnect}
              disabled={connectingStripe}
              className="gap-1.5"
            >
              {connectingStripe ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Connect Stripe</>
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

// ─── Eligibility item helper ────────────────────────────────────────────────

function EligibilityItem({ label, done, hint }: { label: string; done: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
