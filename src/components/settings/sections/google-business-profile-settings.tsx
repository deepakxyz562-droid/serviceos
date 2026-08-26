'use client';

/**
 * Google Business Profile Settings section.
 *
 * Link-only integration (Option 1 from the redesign proposal):
 *   - User pastes their Google Business Profile URL into a text field.
 *   - We save it to `tenant.googleBusinessProfileUrl`.
 *   - We display the URL on their marketplace card (as a "View on Google" link).
 *   - We do NOT call the GBP API (that requires Google app review + OAuth
 *     consent screen — out of scope for now).
 *
 * The user verifies their business on Google directly (Google mails them a
 * postcard / calls them / video call). Once verified on Google, they can
 * paste the URL here. If they used the Google verification method during
 * the claim flow, `googleBusinessVerified` is already true.
 *
 * CTAs:
 *   - "Go to Google Business Profile" → links to https://business.google.com
 *     (opens in new tab — user creates/verifies their listing there)
 *   - "Save URL" → saves the pasted URL to the tenant record
 */

import { useState, useEffect } from 'react';
import { Check, ExternalLink, Save, Loader2, ShieldCheck, Star, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  GoogleConnectedCelebration,
  hasSeenCelebration,
  markCelebrationSeen,
  resetCelebrationSeen,
} from './google-connected-celebration';
import { GoogleBookingLink } from './google-booking-link';

const BENEFITS = [
  'Get more clicks from people ready to book',
  'Show up higher in local searches',
  'Build trust with polished business info',
];

export function GoogleBusinessProfileSettings() {
  const [gbpUrl, setGbpUrl] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  // Load current tenant's GBP URL + verified flag + tenantId (for the
  // celebration-dialog localStorage key).
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/tenants/me?XTransformPort=3000', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setGbpUrl(data.googleBusinessProfileUrl ?? '');
          setVerified(!!data.googleBusinessVerified);
          setTenantId(data.id ?? null);
        }
      } catch {
        // ignore — non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveUrl() {
    setSaving(true);
    try {
      const res = await fetch('/api/tenants/me?XTransformPort=3000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleBusinessProfileUrl: gbpUrl }),
      });
      if (res.ok) {
        toast.success('Google Business Profile URL saved.');
        // ── Celebration dialog ──────────────────────────────────────────
        // Show the celebration the FIRST time the tenant connects a GBP URL.
        // Tracked per-tenant via localStorage so it shows once per tenant
        // (not once globally, not on every save).
        if (gbpUrl && tenantId && !hasSeenCelebration(tenantId)) {
          markCelebrationSeen(tenantId);
          setCelebrationOpen(true);
        }
      } else {
        toast.error('Failed to save URL.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSaving(false);
    }
  }

  /** "Show me again" link — resets the seen flag and re-opens the celebration. */
  function showCelebrationAgain() {
    if (tenantId) resetCelebrationSeen(tenantId);
    setCelebrationOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Hero headline + description */}
      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Connect your Google Business Profile
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Verify your business on Google to appear on Google Maps &amp; Search, then paste your profile URL here.
              We&rsquo;ll display a &ldquo;View on Google&rdquo; link on your marketplace card so customers can see your Google rating and reviews.
            </p>
          </div>

          {/* Verification status badge */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading...
            </div>
          ) : verified ? (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Check className="size-3" /> Google-verified
              </Badge>
              {/* "Show me again" link — re-opens the celebration dialog on demand.
                  Per review direction: "Once + 'Show me again'". */}
              {gbpUrl && (
                <button
                  onClick={showCelebrationAgain}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <RotateCcw className="size-3" />
                  Show the growth checklist again
                </button>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-700">
              <Star className="size-3" /> Not yet connected
            </Badge>
          )}

          {/* URL input + save */}
          <div className="space-y-2">
            <Label htmlFor="gbp-url">Your Google Business Profile URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="gbp-url"
                placeholder="https://www.google.com/maps/place/..."
                value={gbpUrl}
                onChange={(e) => setGbpUrl(e.target.value)}
                disabled={loading}
              />
              <Button
                onClick={saveUrl}
                disabled={saving || loading || !gbpUrl}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Don&rsquo;t have a Google Business Profile yet? Create one for free at{' '}
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-emerald-600 hover:underline"
              >
                business.google.com
                <ExternalLink className="size-3" />
              </a>
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <ul className="space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary CTA — go to Google */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://business.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Go to Google Business Profile
              <ExternalLink className="size-4" />
            </a>
          </div>

          {/* How verification works (clarifies the user's confusion) */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <h3 className="font-semibold text-foreground">How Google verification works</h3>
            <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>1. Go to <strong>business.google.com</strong> and sign in with your Google account.</li>
              <li>2. Add your business (name, category, address, phone).</li>
              <li>3. Google asks you to verify — by phone, email, postcard (5-14 days), or video call.</li>
              <li>4. Once verified on Google, come back here and paste your profile URL above.</li>
              <li>5. If you used &ldquo;Google Business Profile&rdquo; as your claim verification method on this marketplace, we&rsquo;ll auto-approve your claim.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* ── Booking link section (Commit 3a) ──────────────────────────────────
          Shows ONLY after the tenant has connected their GBP URL. This is the
          manual approach — no Google API integration required. The tenant
          copies the UTM-tagged booking URL and pastes it into their Google
          Business Profile → Info → Booking URL field. Per review direction:
          'Option A — manual booking link now'. */}
      {!loading && gbpUrl && <GoogleBookingLink />}

      {/* ── Celebration dialog ───────────────────────────────────────────────
          Shows ONCE after the tenant saves their GBP URL for the first time.
          Can be re-opened via the "Show the growth checklist again" link above.
          Per review direction: "Once + 'Show me again'". */}
      <GoogleConnectedCelebration
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        onSetUpLeadCapture={() => {
          setCelebrationOpen(false);
          // Commit 3a will wire this to the booking-link copy UI. For now,
          // scroll to the booking-link section if it exists, otherwise just
          // close the dialog.
          const bookingLinkEl = document.getElementById('google-booking-link');
          if (bookingLinkEl) {
            bookingLinkEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />
    </div>
  );
}
