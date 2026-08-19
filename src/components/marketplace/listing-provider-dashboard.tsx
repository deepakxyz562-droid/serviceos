'use client';

/**
 * ListingProviderDashboard
 * ==========================
 * A simplified 2-tab dashboard for "listing only" providers
 * (signupMode = 'listing_only', listingTier = 'claimed_free'). These
 * providers don't have the CRM / paid features, so they see:
 *
 *   Tab 1 — Marketplace Page:
 *            • BusinessDetailsCard — edit core identity (business name,
 *              phone, email, category). These fields are NOT editable
 *              anywhere else for listing-only users (the standalone
 *              Settings page is hidden from them).
 *            • PublicHubTab — edit the public profile (cover image,
 *              tagline, description, city, hours, photos, FAQs, service
 *              areas, marketplace opt-in toggle).
 *   Tab 2 — Services: create/edit services shown on their marketplace page.
 *
 * Plus an upsell banner: "Want online bookings, quote inbox, and emergency
 * dispatch? Upgrade to the full CRM — 14-day free trial."
 *
 * The full 6-tab ProviderMarketplaceDashboard is for CRM-trial / paid
 * providers only.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Zap,
  ArrowRight,
  Loader2,
  Check,
  Building2,
  Phone,
  Mail,
  Wrench,
  Info,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { PublicHubTab } from '@/components/settings/public-hub-tab';
import { ServiceCatalogView } from '@/components/views/service-catalog-view';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import {
  VERTICALS,
  getIndustriesByVertical,
  type Industry,
} from '@/lib/industry-catalog';

interface TenantSnapshot {
  id: string;
  name: string;
  industry: string | null;
  slug: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  marketplaceOptIn: boolean;
}

export function ListingProviderDashboard() {
  const [tab, setTab] = useState('page');
  const auth = useAppStore((s) => s.auth);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Fetch a fresh tenant snapshot so BusinessDetailsCard edits current data.
  // (PublicHubTab manages its own city + marketplaceOptIn state internally;
  //  this snapshot feeds the BusinessDetailsCard: name, phone, email, industry.)
  const [tenantSnap, setTenantSnap] = useState<TenantSnapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(true);

  const loadSnapshot = useCallback(async () => {
    if (!auth?.tenant?.id) return;
    try {
      const res = await authFetch(
        `/api/tenants/${auth.tenant.id}?XTransformPort=3000`
      );
      if (res.ok) {
        const data = await res.json();
        setTenantSnap({
          id: data.id,
          name: data.name || '',
          industry: data.industry || null,
          slug: data.slug || '',
          phone: data.phone || null,
          email: data.email || null,
          city: data.city || null,
          marketplaceOptIn: data.marketplaceOptIn ?? true,
        });
      }
    } catch {
      // non-fatal — BusinessDetailsCard will show stale data
    } finally {
      setLoadingSnap(false);
    }
  }, [auth?.tenant?.id]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-sm shadow-emerald-500/20 shrink-0">
          <Store className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">Marketplace</h1>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
              Free Listing
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your public marketplace page. Customers can find you and call you directly.
          </p>
        </div>
      </div>

      {/* Upsell banner */}
      <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-900/40">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Zap className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Get more customers with the full CRM
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Online bookings, quote inbox, emergency dispatch, AI Receptionist, invoicing & more. 14-day free trial, no credit card.
            </p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 shrink-0"
            onClick={() => setCurrentView('billing')}
          >
            Upgrade to CRM <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="page" className="gap-1.5">
            <Store className="size-3.5" /> Marketplace Page
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Wrench className="size-3.5" /> Services
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Marketplace Page
            • BusinessDetailsCard — core identity (name/phone/email/category)
            • PublicHubTab — public profile content (city, opt-in, images, etc.) */}
        <TabsContent value="page" className="mt-4 space-y-4">
          {tenantSnap ? (
            <>
              <BusinessDetailsCard
                key={tenantSnap.id + tenantSnap.name + tenantSnap.phone + tenantSnap.email + tenantSnap.industry}
                tenant={tenantSnap}
                onSaved={loadSnapshot}
              />
              <PublicHubTab
                tenantId={tenantSnap.id}
                industry={tenantSnap.industry || ''}
                slug={tenantSnap.slug}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading…
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Services — listing-only users can create/edit services.
            Services appear on their public marketplace page. They are NOT
            bookable until the user upgrades to CRM (the booking panel only
            renders for claimed + valid-subscription tenants). This lets
            listing users showcase what they offer without receiving online
            bookings. */}
        <TabsContent value="services" className="mt-4">
          <Card className="mb-3 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="p-3 flex items-start gap-2.5">
              <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  Services you add appear on your public marketplace page.
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                  Online booking is disabled on the free plan — customers will call you to book. Upgrade to CRM to enable online bookings and quote requests.
                </p>
              </div>
            </CardContent>
          </Card>
          <ServiceCatalogView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Business Details Card ─────────────────────────────────────────────────────
// Compact editor for the 4 core-identity fields that are NOT covered by
// PublicHubTab: business name, phone, email, category/industry.
//
// (city + marketplace-opt-in are intentionally excluded here because they are
//  already editable inside PublicHubTab's "Location & Service Areas" and
//  "Public Business Hub" sections — duplicating them would cause two forms
//  to fight over the same fields on save.)

function BusinessDetailsCard({
  tenant,
  onSaved,
}: {
  tenant: TenantSnapshot;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone || '');
  const [email, setEmail] = useState(tenant.email || '');
  const [industry, setIndustry] = useState(tenant.industry || '');

  const industriesByVertical = (() => {
    const map: Record<string, Industry[]> = {};
    for (const v of VERTICALS) {
      map[v.id] = getIndustriesByVertical(v.id);
    }
    return map;
  })();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Business name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenant.id}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          industry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save business details');
        setSaving(false);
        return;
      }
      toast.success('Business details saved');
      onSaved();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business details</CardTitle>
        <CardDescription>
          Your name, phone, email, and category. These power your &ldquo;Call now&rdquo; button and public URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Business name */}
          <div className="space-y-1.5">
            <Label htmlFor="lpd-name" className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-muted-foreground" />
              Business name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lpd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Category / Industry */}
          <div className="space-y-1.5">
            <Label htmlFor="lpd-industry">Category</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="lpd-industry">
                <SelectValue placeholder="Select your trade / industry" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {VERTICALS.map((v) => {
                  const items = industriesByVertical[v.id] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={v.id}>
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {v.label}
                      </div>
                      {items.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id}>
                          {ind.name}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Sets the first part of your public URL: <code className="text-[10px]">/{industry || 'industry'}/{tenant.city || 'city'}/{tenant.slug}</code>
            </p>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lpd-phone" className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lpd-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Shown as your &ldquo;Call now&rdquo; button on the marketplace.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lpd-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="lpd-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Saving…</>
              ) : (
                <><Check className="size-4 mr-2" /> Save details</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ListingProviderDashboard;
