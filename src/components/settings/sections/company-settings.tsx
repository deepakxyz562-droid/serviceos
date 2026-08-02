'use client';

/**
 * Company Settings section.
 *
 * Extracted from the original monolithic settings-view.tsx (lines 219-1002
 * of the legacy file). Owns its own form state + save handler. Calls
 * `onSaved` after a successful save so the parent shell can refresh the
 * shared tenant snapshot (tenantId / industry / slug) used by the
 * Marketplace section.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Bell,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { CURRENCIES as SHARED_CURRENCIES } from '@/lib/currency';
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
  };
  return map[value.toLowerCase()] || value;
}

const CURRENCIES = SHARED_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} (${c.symbol}) — ${c.name}`,
}));

interface CompanySettingsProps {
  /** Called after a successful save so the parent can refresh tenant snapshot. */
  onSaved?: () => void;
}

export function CompanySettings({ onSaved }: CompanySettingsProps) {
  const { darkMode, toggleDarkMode } = useAppStore();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    currency: 'INR',
    phone: '',
    email: '',
    whatsappPhone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [executionAlerts, setExecutionAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(true);

  const fetchTenantData = useCallback(async () => {
    setTenantLoading(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (authRes.ok) {
        const authData = await authRes.json();
        const tenant = authData.tenant;
        if (tenant) {
          setTenantId(tenant.id);

          let street = '';
          let city = '';
          let state = '';
          let pincode = '';
          let country = tenant.country || '';

          if (tenant.address) {
            try {
              const addr = JSON.parse(tenant.address);
              street = addr.street || '';
              city = addr.city || '';
              state = addr.state || '';
              pincode = addr.pincode || '';
              country = addr.country || country;
            } catch {
              street = tenant.address;
            }
          }

          setCompanyForm({
            name: tenant.name || '',
            industry: normalizeIndustry(tenant.industry || ''),
            currency: tenant.currency || 'INR',
            phone: tenant.phone || '',
            email: tenant.email || '',
            whatsappPhone: tenant.whatsappPhone || '',
            street,
            city,
            state,
            pincode,
            country,
          });
        }
      }
    } catch {
      // silently fail
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const handleSaveCompany = async () => {
    if (!tenantId) {
      toast.error('No tenant found. Complete onboarding first.');
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
          currency: companyForm.currency,
          phone: companyForm.phone,
          email: companyForm.email,
          whatsappPhone: companyForm.whatsappPhone,
          address: JSON.stringify(addressObj),
          country: companyForm.country,
          settingsJson: JSON.stringify({
            emailNotifications,
            executionAlerts,
          }),
        }),
      });
      if (res.ok) {
        invalidateCurrencyCache();
        toast.success('Company profile saved successfully');
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

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading company profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Update your company details and contact information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Company Name</Label>
            <Input
              placeholder="Your Company Name"
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currency</Label>
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
                Your company currency is used across CRM, dashboard, invoices, quotes, and reports.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="size-3.5" /> Phone
              </Label>
              <Input
                placeholder="+91 98765 43210"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5" /> Email
              </Label>
              <Input
                type="email"
                placeholder="company@example.com"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <MessageCircle className="size-3.5" /> WhatsApp Number
            </Label>
            <Input
              placeholder="+91 98765 43210"
              value={companyForm.whatsappPhone}
              onChange={(e) => setCompanyForm({ ...companyForm, whatsappPhone: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Used for lead notifications and customer communications
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <MapPin className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Business Address</CardTitle>
              <CardDescription>Your company&apos;s physical address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Street Address</Label>
            <Input
              placeholder="123 Main Street, Suite 100"
              value={companyForm.street}
              onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">City</Label>
              <Input
                placeholder="Mumbai"
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">State</Label>
              <Input
                placeholder="Maharashtra"
                value={companyForm.state}
                onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pincode</Label>
              <Input
                placeholder="400001"
                value={companyForm.pincode}
                onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Bell className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Customize your application experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle dark mode theme</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Get notified about workflow failures and updates</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Execution Alerts</Label>
              <p className="text-xs text-muted-foreground">Notify when workflow executions finish</p>
            </div>
            <Switch checked={executionAlerts} onCheckedChange={setExecutionAlerts} />
          </div>
        </CardContent>
      </Card>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
          onClick={handleSaveCompany}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
