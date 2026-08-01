'use client';

/**
 * ListingProviderDashboard
 * ==========================
 * A simplified 2-tab dashboard for "listing only" providers
 * (signupMode = 'listing_only', listingTier = 'claimed_free'). These
 * providers don't have the CRM / paid features, so they see:
 *
 *   Tab 1 — Marketplace Page: edit their public profile (cover image,
 *           tagline, description, hours, photos, FAQs, service areas).
 *           Reuses the existing <PublicHubTab> component.
 *   Tab 2 — Settings: business name, phone, email, category, city, and
 *           a "deactivate listing" toggle.
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
  Settings,
  Zap,
  ArrowRight,
  Loader2,
  Check,
  Building2,
  MapPin,
  Phone,
  Mail,
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
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/app-store';
import { PublicHubTab } from '@/components/settings/public-hub-tab';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import {
  INDUSTRY_CATALOG,
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

  // Fetch a fresh tenant snapshot so the Settings tab edits current data
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
      // non-fatal — Settings tab will show stale data
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
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Marketplace Page (reuses PublicHubTab) */}
        <TabsContent value="page" className="mt-4">
          {tenantSnap ? (
            <PublicHubTab
              tenantId={tenantSnap.id}
              industry={tenantSnap.industry || ''}
              slug={tenantSnap.slug}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading…
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Settings (business name, phone, category, city, deactivate) */}
        <TabsContent value="settings" className="mt-4">
          {loadingSnap ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading…
            </div>
          ) : tenantSnap ? (
            <SettingsTab tenant={tenantSnap} onSaved={loadSnapshot} />
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Could not load your business details. Please refresh the page.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
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
  const [city, setCity] = useState(tenant.city || '');
  const [industry, setIndustry] = useState(tenant.industry || '');
  const [marketplaceOptIn, setMarketplaceOptIn] = useState(tenant.marketplaceOptIn);

  // Re-sync if the tenant prop changes (after onSaved reload)
  useEffect(() => {
    setName(tenant.name);
    setPhone(tenant.phone || '');
    setEmail(tenant.email || '');
    setCity(tenant.city || '');
    setIndustry(tenant.industry || '');
    setMarketplaceOptIn(tenant.marketplaceOptIn);
  }, [tenant]);

  const industriesByVertical = (() => {
    const map: Record<string, Industry[]> = {};
    for (const v of VERTICALS) {
      map[v.id] = getIndustriesByVertical(v.id);
    }
    return map;
  })();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !phone.trim()) {
      toast.error('Business name, city, and phone are required');
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
          city: city.trim(),
          industry,
          marketplaceOptIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings');
        setSaving(false);
        return;
      }
      toast.success('Settings saved');
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
          These details appear on your public marketplace page and power your “Call Now” button.
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

          {/* Industry */}
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
          </div>

          {/* City + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lpd-city" className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lpd-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
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
            </div>
          </div>

          {/* Email */}
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

          {/* Listing active toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Show on marketplace</p>
              <p className="text-xs text-muted-foreground">
                When off, your listing is hidden from the public marketplace.
              </p>
            </div>
            <Switch
              checked={marketplaceOptIn}
              onCheckedChange={setMarketplaceOptIn}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Saving…</>
              ) : (
                <><Check className="size-4 mr-2" /> Save changes</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ListingProviderDashboard;
