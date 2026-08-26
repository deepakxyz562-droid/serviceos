'use client';

/**
 * GoogleBookingLink
 * -----------------
 *
 * The "Copy your booking link" UI shown to tenants who have connected their
 * Google Business Profile. This is the MANUAL approach (Commit 3a) — no
 * Google API integration required, ships immediately.
 *
 * The link points to the tenant's public business hub with:
 *   1. A #book hash so the page scrolls to the booking form
 *   2. UTM parameters so Fieseros can track Google → booking → CRM lead
 *      conversions in analytics
 *
 * URL format:
 *   https://fieseros.com/{industry}/{city}/{slug}?utm_source=google&utm_medium=business_profile&utm_campaign=booking#book
 *
 * Per review direction:
 *   'I'd make the tracking smarter. For example:
 *    ...?utm_source=google&utm_medium=business_profile&utm_campaign=booking
 *    Then Fieseros knows: Google → SureTech page → booking → CRM lead'
 *
 * The tenant is instructed to paste this URL into their Google Business
 * Profile → Info → "Booking URL" / "Appointment URL" field. Google will
 * then show a "Book" / "Request Quote" action button on their Maps/Search
 * listing that links directly to the Fieseros-powered booking page.
 *
 * FUTURE (Commit 3b — deferred per review direction):
 *   - OAuth flow to connect GBP via API
 *   - Push the booking URL to Google automatically
 *   - Sync reviews, photos, hours from GBP → Fieseros
 */

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, ExternalLink, Info, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { mapIndustryToUrlSlug } from '@/lib/seo/schemas';
import { slugifyCity } from '@/lib/seo/schemas';

interface TenantUrlInfo {
  slug: string;
  industry: string | null;
  city: string | null;
}

/**
 * Build the public booking URL for a tenant with UTM tracking parameters.
 * Exported so other components (e.g. future analytics) can reuse the same
 * URL format.
 */
export function buildBookingUrl(
  tenant: TenantUrlInfo,
  appUrl: string,
  utm: { source: string; medium: string; campaign: string } = {
    source: 'google',
    medium: 'business_profile',
    campaign: 'booking',
  },
): string {
  const industrySlug = mapIndustryToUrlSlug(tenant.industry);
  const citySlug = slugifyCity(tenant.city);
  const base = `${appUrl.replace(/\/$/, '')}/${industrySlug}/${citySlug}/${tenant.slug}`;
  const params = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
  });
  return `${base}?${params.toString()}#book`;
}

export function GoogleBookingLink() {
  const [tenant, setTenant] = useState<TenantUrlInfo | null>(null);
  const [bookingUrl, setBookingUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/tenants/me?XTransformPort=3000', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const info: TenantUrlInfo = {
            slug: data.slug,
            industry: data.industry,
            city: data.city,
          };
          setTenant(info);
          const appUrl =
            typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';
          setBookingUrl(buildBookingUrl(info, appUrl));
        }
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success('Booking link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-secure contexts
      try {
        const textArea = document.createElement('textarea');
        textArea.value = bookingUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success('Booking link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy — please copy the link manually');
      }
    }
  }, [bookingUrl]);

  if (loading) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-900/40">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tenant) {
    return null; // nothing to render if tenant info couldn't be loaded
  }

  return (
    <Card
      id="google-booking-link"
      className="scroll-mt-20 border-emerald-200 dark:border-emerald-900/40"
    >
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <LinkIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Your Google booking link
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste this URL into your Google Business Profile &rarr; Info &rarr;{' '}
              <strong>Booking URL</strong> field. Google will show a{' '}
              <strong>&ldquo;Book&rdquo;</strong> button on your Maps/Search listing
              that links directly to your Fieseros booking page.
            </p>
          </div>
        </div>

        {/* The booking URL with copy button */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            value={bookingUrl}
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
            aria-label="Your Google booking link"
          />
          <Button
            onClick={copyToClipboard}
            className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            type="button"
          >
            {copied ? (
              <>
                <Check className="size-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copy link
              </>
            )}
          </Button>
        </div>

        {/* UTM info callout */}
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <div>
            <strong>Tracking included:</strong> This link has UTM parameters
            (<code className="rounded bg-emerald-100 px-1 dark:bg-emerald-900/40">utm_source=google</code>,{' '}
            <code className="rounded bg-emerald-100 px-1 dark:bg-emerald-900/40">utm_medium=business_profile</code>,{' '}
            <code className="rounded bg-emerald-100 px-1 dark:bg-emerald-900/40">utm_campaign=booking</code>)
            so Fieseros can track how many leads Google sends you.
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h4 className="font-semibold text-foreground">How to add this to Google</h4>
          <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li>
              1. Go to{' '}
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-emerald-600 hover:underline"
              >
                business.google.com <ExternalLink className="size-3" />
              </a>{' '}
              and sign in.
            </li>
            <li>2. Select your business.</li>
            <li>3. Click <strong>Info</strong> in the left menu.</li>
            <li>
              4. Find the <strong>Booking URL</strong> (or <strong>Appointment URL</strong>) field
              and click the pencil icon.
            </li>
            <li>5. Paste the link above and click <strong>Apply</strong>.</li>
            <li>
              6. Google may take a few minutes to update — your{' '}
              <strong>&ldquo;Book&rdquo;</strong> button will appear on Google Maps &amp; Search.
            </li>
          </ol>
        </div>

        {/* What the customer sees */}
        <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-cyan-950/20">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            What your customers will see on Google:
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">
              SureTech Heating &amp; Cooling
            </span>
            <span className="rounded-md border border-emerald-300 bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              Book →
            </span>
            <span className="text-muted-foreground self-center">
              (links to your Fieseros booking page)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
