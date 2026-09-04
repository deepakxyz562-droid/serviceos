'use client';

/**
 * ListingOnboarding
 * ==================
 * A lightweight 1-step onboarding wizard for "listing only" providers
 * (signupMode = 'listing_only', listingTier = 'claimed_free'). Collects
 * just enough data to publish a marketplace listing:
 *
 *   - Business name (prefilled from registration)
 *   - Industry / category (single select)
 *   - City (required — needed for the [city] URL segment)
 *   - Phone (required — powers the "Call Now" button)
 *   - Business hours (optional, defaults to "by appointment")
 *
 * On submit, PATCHes the tenant via /api/tenants/[id] with the collected
 * fields + onboardingCompleted=true, then calls onComplete().
 *
 * This is deliberately much simpler than the 4-step SaaSOnboarding wizard
 * — no plan selection, no payment setup, no coverage areas, no marketplace T&Cs
 * (the listing-only path implies opt-in already).
 */

import { useState, useMemo } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Check,
  Loader2,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import {
  INDUSTRY_CATALOG,
  getIndustriesByVertical,
  VERTICALS,
  type Industry,
} from '@/lib/industry-catalog';

interface ListingOnboardingProps {
  tenant: {
    id: string;
    name?: string;
    industry?: string | null;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    state?: string | null;
  } | null;
  user: {
    name?: string;
    email?: string;
  } | null;
  onComplete: () => void;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export function ListingOnboarding({
  tenant,
  user,
  onComplete,
}: ListingOnboardingProps) {
  const [saving, setSaving] = useState(false);

  // Form state — prefilled from tenant data
  const [businessName, setBusinessName] = useState(tenant?.name || '');
  const [industry, setIndustry] = useState(tenant?.industry || '');
  const [city, setCity] = useState(tenant?.city || '');
  const [phone, setPhone] = useState(tenant?.phone || '');
  const [byAppointment, setByAppointment] = useState(true);

  // Hours — default all days 9-5, but "by appointment" overrides
  const [hours, setHours] = useState<Record<string, DayHours>>(() => {
    const def: Record<string, DayHours> = {};
    for (const d of DAYS) {
      def[d.key] = { open: '09:00', close: '17:00', closed: d.key === 'sun' };
    }
    return def;
  });

  // Group industries by vertical for the select dropdown
  const industriesByVertical = useMemo(() => {
    const map: Record<string, Industry[]> = {};
    for (const v of VERTICALS) {
      map[v.id] = getIndustriesByVertical(v.id);
    }
    return map;
  }, []);

  const isValid = businessName.trim() && industry && city.trim() && phone.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!tenant?.id) {
      toast.error('No tenant found. Please refresh and try again.');
      return;
    }
    setSaving(true);

    // Build businessHoursJson — if byAppointment, store {byAppointment: true}
    const businessHoursJson = byAppointment
      ? JSON.stringify({ byAppointment: true })
      : JSON.stringify(
          Object.fromEntries(
            DAYS.map((d) => [
              d.key,
              hours[d.key].closed
                ? { closed: true }
                : { open: hours[d.key].open, close: hours[d.key].close },
            ])
          )
        );

    try {
      const res = await authFetch(`/api/tenants/${tenant.id}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName.trim(),
          industry,
          city: city.trim(),
          phone: phone.trim(),
          businessHoursJson,
          onboardingCompleted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save. Please try again.');
        setSaving(false);
        return;
      }
      toast.success('Your listing is live! 🎉');
      // Brief delay so the toast is visible before the app layout mounts.
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch {
      toast.error('Network error. Please try again.');
      setSaving(false);
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-600 text-white mb-3 shadow-lg shadow-emerald-600/20">
            <Store className="size-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Set up your marketplace listing
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
            Just a few details and your business will be live on the marketplace, {firstName}.
            You can edit everything later from your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-md">
            <CardContent className="p-5 sm:p-6 space-y-4">
              {/* Business name */}
              <div className="space-y-1.5">
                <Label htmlFor="lo-name" className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  Business name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lo-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Summit Roofing Co"
                  required
                />
              </div>

              {/* Industry */}
              <div className="space-y-1.5">
                <Label htmlFor="lo-industry" className="flex items-center gap-1.5">
                  <Store className="size-3.5 text-muted-foreground" />
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={industry} onValueChange={setIndustry} required>
                  <SelectTrigger id="lo-industry">
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

              {/* City + Phone (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lo-city" className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lo-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Denver"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lo-phone" className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lo-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 0100"
                    required
                  />
                </div>
              </div>

              {/* Business hours */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Business hours
                  </Label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={byAppointment}
                      onCheckedChange={(v) => setByAppointment(!!v)}
                    />
                    By appointment only
                  </label>
                </div>

                {!byAppointment && (
                  <div className="rounded-lg border divide-y">
                    {DAYS.map((d) => (
                      <div key={d.key} className="flex items-center gap-3 px-3 py-2">
                        <div className="w-24 text-sm font-medium shrink-0">{d.label}</div>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={!hours[d.key].closed}
                            onCheckedChange={(v) =>
                              setHours((h) => ({
                                ...h,
                                [d.key]: { ...h[d.key], closed: !v },
                              }))
                            }
                          />
                          Open
                        </label>
                        {!hours[d.key].closed ? (
                          <div className="flex items-center gap-2 ml-auto">
                            <Input
                              type="time"
                              value={hours[d.key].open}
                              onChange={(e) =>
                                setHours((h) => ({
                                  ...h,
                                  [d.key]: { ...h[d.key], open: e.target.value },
                                }))
                              }
                              className="w-28 h-8 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={hours[d.key].close}
                              onChange={(e) =>
                                setHours((h) => ({
                                  ...h,
                                  [d.key]: { ...h[d.key], close: e.target.value },
                                }))
                              }
                              className="w-28 h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <span className="ml-auto text-xs text-muted-foreground">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {byAppointment && (
                  <p className="text-xs text-muted-foreground italic">
                    Customers will see “By appointment” on your listing.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <Check className="inline size-3 text-emerald-600 mr-1" />
              Free forever · No credit card · Upgrade to CRM anytime
            </p>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving || !isValid}
            >
              {saving ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Publishing…</>
              ) : (
                <>Publish my listing <ArrowRight className="size-4 ml-2" /></>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ListingOnboarding;
