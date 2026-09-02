'use client';

/**
 * CompanySettings — Canonical Single Source of Truth (SSOT) for Business Profile.
 *
 * Owns:
 *   1. Business Identity: Company Name, Industry, Tagline, About / Description
 *   2. Contact Information: Public Phone, Public Email, WhatsApp Number, Website
 *   3. Business Address: Physical Address backed by OpenStreetMap Nominatim with
 *      full Country, State, City, Postal Code, and Geocoordinates extraction.
 *   4. Business Hours: Weekly 7-day schedule editor (Monday–Sunday)
 *   5. Application Preferences: Currency, Theme (Dark Mode), Notification alerts
 *
 * All other platform areas (Invoices, Quotes, Customer Portal, Email Templates,
 * Marketplace, and Mobile App) inherit directly from this component.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Bell,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Globe,
  Clock,
  Save,
  Loader2,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete, type AddressValue } from '@/components/onboarding/address-autocomplete';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { CURRENCIES as SHARED_CURRENCIES } from '@/lib/currency';
import { CUSTOMER_COUNTRIES } from '@/lib/customer-countries';
import { invalidateCurrencyCache } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/api';

const INDUSTRIES = [
  'Home Services',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Landscaping',
  'Pest Control',
  'Roofing',
  'Painting',
  'Moving',
  'Construction',
  'Handyman',
  'Real Estate',
  'Healthcare',
  'Legal',
  'Education',
  'Technology',
  'Other',
];

function getIndustryOptions(currentIndustry: string): string[] {
  if (!currentIndustry) return INDUSTRIES;
  const lower = currentIndustry.toLowerCase();
  const exists = INDUSTRIES.some((i) => i.toLowerCase() === lower);
  return exists ? INDUSTRIES : [...INDUSTRIES, currentIndustry];
}

function normalizeIndustry(value: string): string {
  if (!value) return '';
  const map: Record<string, string> = {
    'home-services': 'Home Services',
    'packers-movers': 'Moving',
    'plumbing': 'Plumbing',
    'cleaning': 'Cleaning',
    'window-cleaning': 'Cleaning',
    'pest-control': 'Pest Control',
    'hvac': 'HVAC',
    'electrical': 'Electrical',
    'landscaping': 'Landscaping',
    'courier': 'Moving',
    'home-repair': 'Home Services',
    'salon-beauty': 'Other',
    'roofing': 'Roofing',
    'painting': 'Painting',
    'construction': 'Construction',
  };
  return map[value.toLowerCase()] || value;
}

const CURRENCIES = SHARED_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} (${c.symbol}) — ${c.name}`,
}));

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<DayKey, DayHours>;

const DAY_ORDER: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function defaultBusinessHours(): BusinessHours {
  const days: BusinessHours = {} as BusinessHours;
  for (const day of DAY_ORDER) {
    const isWeekend = day === 'saturday' || day === 'sunday';
    days[day] = {
      open: '09:00',
      close: '17:00',
      closed: isWeekend,
    };
  }
  return days;
}

interface CompanySettingsProps {
  onSaved?: () => void;
}

export function CompanySettings({ onSaved }: CompanySettingsProps) {
  const { darkMode, toggleDarkMode } = useAppStore();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Business Identity & Contact Form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    tagline: '',
    description: '',
    currency: 'USD',
    phone: '',
    email: '',
    whatsappPhone: '',
    website: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'US',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [executionAlerts, setExecutionAlerts] = useState(true);

  const fetchTenantData = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) return;
      const authData = await authRes.json();
      const tenant = authData?.tenant;
      if (!tenant?.id) return;
      setTenantId(tenant.id);

      // Fetch detailed tenant data
      const res = await authFetch(`/api/tenants/${tenant.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const t = data.tenant;
      if (!t) return;

      let street = '';
      let city = t.city || '';
      let state = t.state || '';
      let pincode = t.postalCode || '';
      let country = t.country || 'US';
      let lat: number | null = t.latitude ?? null;
      let lng: number | null = t.longitude ?? null;

      if (t.address) {
        try {
          const addr = JSON.parse(t.address);
          street = addr.street || '';
          city = addr.city || city;
          state = addr.state || state;
          pincode = addr.pincode || pincode;
          country = addr.country || country;
        } catch {
          street = t.address;
        }
      }

      setCompanyForm({
        name: t.name || '',
        industry: normalizeIndustry(t.industry || ''),
        tagline: t.tagline || '',
        description: t.description || '',
        currency: t.currency || 'USD',
        phone: t.phone || '',
        email: t.email || '',
        whatsappPhone: t.whatsappPhone || '',
        website: t.website || '',
        street,
        city,
        state,
        pincode,
        country,
        latitude: lat,
        longitude: lng,
      });

      // Parse business hours
      if (t.businessHoursJson) {
        try {
          const parsed = JSON.parse(t.businessHoursJson);
          if (parsed && typeof parsed === 'object') {
            const merged = defaultBusinessHours();
            for (const day of DAY_ORDER) {
              if (parsed[day]) {
                merged[day] = {
                  open: parsed[day].open || '09:00',
                  close: parsed[day].close || '17:00',
                  closed: Boolean(parsed[day].closed),
                };
              }
            }
            setBusinessHours(merged);
          }
        } catch {}
      }

      // Settings JSON
      if (t.settingsJson) {
        try {
          const s = JSON.parse(t.settingsJson);
          if (typeof s.emailNotifications === 'boolean') setEmailNotifications(s.emailNotifications);
          if (typeof s.executionAlerts === 'boolean') setExecutionAlerts(s.executionAlerts);
        } catch {}
      }
    } catch (err) {
      console.error('[CompanySettings] Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenantData();
  }, [fetchTenantData]);

  const handleSaveCompany = async () => {
    if (!tenantId) {
      toast.error('No tenant found.');
      return;
    }

    setSaving(true);
    try {
      const addressObj = {
        street: companyForm.street,
        city: companyForm.city,
        state: companyForm.state,
        pincode: companyForm.pincode,
        country: companyForm.country,
      };

      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name,
          industry: companyForm.industry,
          tagline: companyForm.tagline,
          description: companyForm.description,
          currency: companyForm.currency,
          phone: companyForm.phone,
          email: companyForm.email,
          whatsappPhone: companyForm.whatsappPhone,
          website: companyForm.website,
          address: JSON.stringify(addressObj),
          city: companyForm.city,
          state: companyForm.state,
          postalCode: companyForm.pincode,
          country: companyForm.country,
          latitude: companyForm.latitude,
          longitude: companyForm.longitude,
          businessHoursJson: JSON.stringify(businessHours),
          settingsJson: JSON.stringify({
            emailNotifications,
            executionAlerts,
          }),
        }),
      });

      if (res.ok) {
        invalidateCurrencyCache();
        toast.success('Company profile and business hours saved!');
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        await fetchTenantData();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save company profile');
      }
    } catch {
      toast.error('Network error saving company profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDayChange = (day: DayKey, patch: Partial<DayHours>) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading company information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Business Identity ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Business Identity</CardTitle>
              <CardDescription>Your primary business identity used across all customer documents and discovery</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Business Name</Label>
              <Input
                placeholder="e.g. Acme Services"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Industry</Label>
              <Select value={companyForm.industry} onValueChange={(v) => setCompanyForm({ ...companyForm, industry: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {getIndustryOptions(companyForm.industry).map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tagline / Slogan</Label>
            <Input
              placeholder="e.g. Reliable 24/7 Residential & Commercial Heating & Cooling"
              value={companyForm.tagline}
              onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              A short, memorable one-liner displayed on your invoices, customer portal, and marketplace listing.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">About Your Business (Description)</Label>
            <Textarea
              placeholder="Tell customers about your company history, licensed technicians, specialties, and service guarantees..."
              rows={4}
              value={companyForm.description}
              onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Used across your public business page, quotes, and AI receptionist brand context. Recommended: 150–500 characters.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Contact Details ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Phone className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Contact Details</CardTitle>
              <CardDescription>Public contact channels for client inquiries and notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="size-3.5" /> Public Phone Number
              </Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5" /> Public Support Email
              </Label>
              <Input
                type="email"
                placeholder="service@example.com"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MessageCircle className="size-3.5" /> WhatsApp Business Number (optional)
              </Label>
              <Input
                placeholder="+1 (555) 987-6543"
                value={companyForm.whatsappPhone}
                onChange={(e) => setCompanyForm({ ...companyForm, whatsappPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="size-3.5" /> Official Website
              </Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Physical Business Address ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Business Address</CardTitle>
              <CardDescription>Your company&apos;s physical base location. Automatically geocodes your city, state, postal code, and country.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressAutocomplete
            value={{
              address: companyForm.street,
              city: companyForm.city,
              state: companyForm.state,
              pincode: companyForm.pincode,
              country: companyForm.country,
              countryCode: companyForm.country,
              latitude: companyForm.latitude,
              longitude: companyForm.longitude,
            }}
            onChange={(v: AddressValue) => {
              const detectedCountry = v.countryCode || v.country || companyForm.country;
              setCompanyForm((prev) => ({
                ...prev,
                street: v.address,
                city: v.city,
                state: v.state,
                pincode: v.pincode,
                country: detectedCountry.toUpperCase(),
                latitude: v.latitude,
                longitude: v.longitude,
              }));
            }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">State / Region</Label>
              <Input
                value={companyForm.state}
                onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Postal Code</Label>
              <Input
                value={companyForm.pincode}
                onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Select
                value={companyForm.country}
                onValueChange={(v) => setCompanyForm({ ...companyForm, country: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {CUSTOMER_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Business Hours ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Business Hours</CardTitle>
              <CardDescription>
                Your weekly operating schedule. Powers customer booking slots, portal dispatch, and marketplace &ldquo;Open Now&rdquo; badges.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border divide-y divide-border">
            {DAY_ORDER.map((day) => {
              const h = businessHours[day] || { open: '09:00', close: '17:00', closed: false };
              return (
                <div key={day} className="flex flex-wrap items-center justify-between p-3 gap-3">
                  <span className="w-28 text-sm font-medium">{DAY_LABELS[day]}</span>

                  <div className="flex items-center gap-3 flex-1 justify-end">
                    {!h.closed ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={h.open}
                          onChange={(e) => handleDayChange(day, { open: e.target.value })}
                          className="w-28 h-9 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={h.close}
                          onChange={(e) => handleDayChange(day, { close: e.target.value })}
                          className="w-28 h-9 text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground italic px-4 py-1.5 rounded bg-muted/50">
                        Closed
                      </span>
                    )}

                    <div className="flex items-center gap-2 pl-3 border-l border-border">
                      <Label htmlFor={`closed-${day}`} className="text-xs text-muted-foreground cursor-pointer">
                        {h.closed ? 'Open' : 'Closed'}
                      </Label>
                      <Switch
                        id={`closed-${day}`}
                        checked={!h.closed}
                        onCheckedChange={(open) => handleDayChange(day, { closed: !open })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. Preferences ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Bell className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Application currency and alert preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label className="text-sm font-medium">Accounting & Invoicing Currency</Label>
            <Select value={companyForm.currency} onValueChange={(v) => setCompanyForm({ ...companyForm, currency: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Applied automatically across jobs, estimates, invoices, and financial reports.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle application dark appearance</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Workflow Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive system updates and critical job dispatch alerts</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Save Changes Button ──────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6 font-semibold shadow-sm"
          onClick={handleSaveCompany}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : savedFlash ? (
            <Check className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? 'Saving...' : savedFlash ? 'Saved!' : 'Save Company Profile'}
        </Button>
      </div>
    </div>
  );
}
