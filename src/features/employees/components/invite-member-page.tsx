'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Shield,
  Clock,
  DollarSign,
  FileText,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  AlertCircle,
  Briefcase,
  CalendarCheck,
  MessageSquare,
  BarChart3,
  Lock,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Send,
  Eye,
  CreditCard,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import { apiUrl } from '@/features/employees/utils/employee-helpers';
import { CUSTOMER_COUNTRIES } from '@/lib/customer-countries';

export type PermissionPreset = 'field_crew' | 'senior_field_crew' | 'crew_lead' | 'manager' | 'custom';

export interface InviteMemberPageProps {
  onBack: () => void;
  onSaved: () => void;
}

export function InviteMemberPage({ onBack, onSaved }: InviteMemberPageProps) {
  const { currentWorkspaceId, auth, countryPack } = useAppStore();
  const currencySymbol = countryPack?.currency?.symbol || '$';
  const defaultCountry = countryPack?.countryCode || 'US';

  // Personal Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState(defaultCountry);

  // Labour Cost
  const [hourlyRate, setHourlyRate] = useState('0.00');

  // Permission Presets
  const [preset, setPreset] = useState<PermissionPreset>('field_crew');

  // Custom Granular Permissions
  const [customSchedule, setCustomSchedule] = useState<'view_own' | 'complete_own' | 'edit_own' | 'edit_everyone' | 'edit_delete_everyone'>('complete_own');
  const [customTimeTracking, setCustomTimeTracking] = useState<'start_stop_own' | 'edit_own' | 'edit_everyone'>('start_stop_own');
  const [customNotes, setCustomNotes] = useState<'jobs_visits_only' | 'view_all' | 'edit_all' | 'edit_delete_all'>('jobs_visits_only');
  const [customFilesMedia, setCustomFilesMedia] = useState(false);
  const [customExpenses, setCustomExpenses] = useState<'own' | 'everyone'>('own');
  const [customShowPricing, setCustomShowPricing] = useState(false);
  const [customJobCosting, setCustomJobCosting] = useState(false);
  const [customClients, setCustomClients] = useState<'name_only' | 'view_full' | 'edit_full' | 'edit_delete_full'>('name_only');
  const [customRequests, setCustomRequests] = useState<'view' | 'create_edit' | 'create_edit_delete'>('view');
  const [customQuotes, setCustomQuotes] = useState<'view' | 'create_edit' | 'create_edit_delete'>('view');
  const [customJobs, setCustomJobs] = useState<'view' | 'create_edit' | 'create_edit_delete'>('create_edit');
  const [customInvoices, setCustomInvoices] = useState<'view' | 'create_edit' | 'create_edit_delete'>('view');
  const [customPayments, setCustomPayments] = useState(false);
  const [customClientCommunications, setCustomClientCommunications] = useState(false);
  const [customReports, setCustomReports] = useState(false);

  // Communications & Language
  const [subSurveys, setSubSurveys] = useState(true);
  const [subMarketingReminders, setSubMarketingReminders] = useState(true);
  const [invitationLanguage, setInvitationLanguage] = useState<'English' | 'Spanish'>('English');

  const [saving, setSaving] = useState(false);

  // Dependency enforcement for Custom Payments
  const handlePaymentsToggle = (checked: boolean) => {
    setCustomPayments(checked);
    if (checked) {
      setCustomShowPricing(true);
      if (customClients === 'name_only' || customClients === 'view_full') {
        setCustomClients('edit_full');
      }
      if (customInvoices === 'view') {
        setCustomInvoices('create_edit');
      }
      if (customQuotes === 'view') {
        setCustomQuotes('create_edit');
      }
    }
  };

  // Dependency enforcement for Custom Client Communications
  const handleClientCommunicationsToggle = (checked: boolean) => {
    setCustomClientCommunications(checked);
    if (checked && customClients === 'name_only') {
      setCustomClients('view_full');
    }
  };

  // Preset switch handler
  const handlePresetSelect = (newPreset: PermissionPreset) => {
    setPreset(newPreset);
    if (newPreset === 'field_crew') {
      setCustomSchedule('complete_own');
      setCustomTimeTracking('start_stop_own');
      setCustomNotes('jobs_visits_only');
      setCustomFilesMedia(false);
      setCustomExpenses('own');
      setCustomShowPricing(false);
      setCustomJobCosting(false);
      setCustomClients('name_only');
      setCustomRequests('view');
      setCustomQuotes('view');
      setCustomJobs('view');
      setCustomInvoices('view');
      setCustomPayments(false);
      setCustomClientCommunications(false);
      setCustomReports(false);
    } else if (newPreset === 'senior_field_crew') {
      setCustomSchedule('complete_own');
      setCustomTimeTracking('start_stop_own');
      setCustomNotes('view_all');
      setCustomFilesMedia(true);
      setCustomExpenses('own');
      setCustomShowPricing(true);
      setCustomJobCosting(false);
      setCustomClients('edit_full');
      setCustomRequests('create_edit');
      setCustomQuotes('create_edit');
      setCustomJobs('create_edit');
      setCustomInvoices('create_edit');
      setCustomPayments(true);
      setCustomClientCommunications(false);
      setCustomReports(false);
    } else if (newPreset === 'crew_lead') {
      setCustomSchedule('edit_everyone');
      setCustomTimeTracking('edit_everyone');
      setCustomNotes('edit_all');
      setCustomFilesMedia(true);
      setCustomExpenses('everyone');
      setCustomShowPricing(true);
      setCustomJobCosting(false);
      setCustomClients('edit_full');
      setCustomRequests('create_edit');
      setCustomQuotes('create_edit');
      setCustomJobs('create_edit');
      setCustomInvoices('create_edit');
      setCustomPayments(true);
      setCustomClientCommunications(true);
      setCustomReports(false);
    } else if (newPreset === 'manager') {
      setCustomSchedule('edit_delete_everyone');
      setCustomTimeTracking('edit_everyone');
      setCustomNotes('edit_delete_all');
      setCustomFilesMedia(true);
      setCustomExpenses('everyone');
      setCustomShowPricing(true);
      setCustomJobCosting(true);
      setCustomClients('edit_delete_full');
      setCustomRequests('create_edit_delete');
      setCustomQuotes('create_edit_delete');
      setCustomJobs('create_edit_delete');
      setCustomInvoices('create_edit_delete');
      setCustomPayments(true);
      setCustomClientCommunications(true);
      setCustomReports(true);
    }
  };

  const mapPresetToRole = (p: PermissionPreset): string => {
    switch (p) {
      case 'manager':
        return 'manager';
      case 'crew_lead':
        return 'supervisor';
      case 'senior_field_crew':
      case 'field_crew':
      default:
        return 'technician';
    }
  };

  const handleSaveAndInvite = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!email.trim()) {
      toast.error('Email address is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!phone.trim()) {
      toast.error('Mobile phone number is required');
      return;
    }

    setSaving(true);
    try {
      const addressObj = {
        street: street.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
        country,
      };

      const permissionsPayload = {
        preset,
        schedule: customSchedule,
        timeTracking: customTimeTracking,
        notes: customNotes,
        filesMedia: customFilesMedia,
        expenses: customExpenses,
        showPricing: customShowPricing,
        jobCosting: customJobCosting,
        clients: customClients,
        requests: customRequests,
        quotes: customQuotes,
        jobs: customJobs,
        invoices: customInvoices,
        payments: customPayments,
        clientCommunications: customClientCommunications,
        reports: customReports,
      };

      const communicationsPayload = {
        emailSurveys: subSurveys,
        weeklyMarketingReminders: subMarketingReminders,
      };

      const metadataJson = JSON.stringify({
        address: addressObj,
        permissions: permissionsPayload,
        communications: communicationsPayload,
        invitationLanguage,
        invitedAt: new Date().toISOString(),
      });

      // 1. Create the employee record
      const res = await authFetch(apiUrl('/api/employees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: mapPresetToRole(preset),
          status: 'available',
          hourlyRate: parseFloat(hourlyRate) || 0,
          location: city.trim() ? `${city.trim()}${province ? `, ${province.trim()}` : ''}` : undefined,
          metadataJson,
          workspaceId: currentWorkspaceId || auth?.user?.workspaceId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee record');
      }

      const createdEmpId = data.id;

      // 2. Trigger invitation email/link if employee was created
      if (createdEmpId) {
        try {
          const inviteRes = await authFetch(apiUrl(`/api/employees/${createdEmpId}/invite`), {
            method: 'POST',
          });
          const inviteData = await inviteRes.json();
          if (inviteRes.ok) {
            toast.success(`Invitation sent to ${email.trim()}!`);
          } else {
            toast.info(`Team member added. (Invitation notice: ${inviteData.error || 'link ready in profile'})`);
          }
        } catch {
          toast.success('Team member added successfully.');
        }
      } else {
        toast.success('Team member added successfully.');
      }

      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ─── Sticky Header / Back Bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-md z-20 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 gap-1.5 font-medium border-border hover:bg-muted text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Employees</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Invite a new member
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Set personal details, labour costs, and configure Jobber-grade role permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={saving}
            className="h-9 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndInvite}
            disabled={saving}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span>Save &amp; Send Invitation</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Section 1: Personal Info ────────────────────────────────────── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Personal info</CardTitle>
              <CardDescription className="text-xs">
                Basic contact information and home address for your team member.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-semibold">
                Full name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="full_name"
                placeholder="e.g. Alex Henderson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email_address" className="text-xs font-semibold">
                Email address <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email_address"
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="phone_number" className="text-xs font-semibold">
                Mobile phone number (if applicable) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="phone_number"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5" />
              <span>Residential Address</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="street" className="text-xs">Street address</Label>
              <Input
                id="street"
                placeholder="123 Main St, Apt 4B"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs">City</Label>
                <Input
                  id="city"
                  placeholder="Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="province" className="text-xs">Province / State</Label>
                <Input
                  id="province"
                  placeholder="Texas"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postal_code" className="text-xs">Postal code</Label>
                <Input
                  id="postal_code"
                  placeholder="78701"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" className="h-9 text-xs">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {CUSTOMER_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2: Labour Cost ──────────────────────────────────────── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Labour cost</CardTitle>
              <CardDescription className="text-xs">
                Track job profitability and cost of workforce hours.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-1">
          <Label htmlFor="hourly_rate" className="text-xs font-semibold">
            Employee cost
          </Label>
          <div className="flex items-center gap-2 max-w-xs">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="pl-8 h-9 text-sm font-semibold"
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">per hour</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Used for job costing reports to compare billed revenue against labour expenses.
          </p>
        </CardContent>
      </Card>

      {/* ─── Section 3: Permissions ──────────────────────────────────────── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Shield className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Permissions</CardTitle>
                <CardDescription className="text-xs">
                  Preset permission levels. Start with a preset permission level, and customize further as needed.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-1">
          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'field_crew', label: 'Field crew' },
              { id: 'senior_field_crew', label: 'Senior field crew' },
              { id: 'crew_lead', label: 'Crew lead' },
              { id: 'manager', label: 'Manager' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id as PermissionPreset)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer',
                    active
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-xs font-bold">{p.label}</span>
                  {active && (
                    <Badge variant="outline" className="mt-1.5 text-[9px] py-0 px-1 bg-emerald-600 text-white border-transparent">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Preset Can Do / Can't Do Breakdown Card */}
          {preset !== 'custom' && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold capitalize text-foreground">
                  {preset.replace('_', ' ')} permission profile
                </span>
                <span className="text-xs text-muted-foreground">Standard Jobber-grade policy</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* CAN DO */}
                <div className="space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg p-3.5 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Check className="size-4 text-emerald-600" />
                    <span>Can do</span>
                  </div>
                  <ul className="text-xs space-y-2 text-stone-700 dark:text-stone-300">
                    {preset === 'field_crew' && (
                      <>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>See their own schedule and mark work complete</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Start and stop timers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Add notes and photos on their jobs</span>
                        </li>
                      </>
                    )}

                    {preset === 'senior_field_crew' && (
                      <>
                        <li className="flex items-start gap-2 font-medium text-emerald-900 dark:text-emerald-200">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Everything Field crew can do, plus:</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>View client files and attachments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>See prices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Create and edit clients, quotes, jobs and invoices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Collect payments</span>
                        </li>
                      </>
                    )}

                    {preset === 'crew_lead' && (
                      <>
                        <li className="flex items-start gap-2 font-medium text-emerald-900 dark:text-emerald-200">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Everything Senior field crew can do, plus:</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>View and change everyone&apos;s schedule</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Add and edit everyone&apos;s timesheets manually</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Create and edit jobs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>View client communications</span>
                        </li>
                      </>
                    )}

                    {preset === 'manager' && (
                      <>
                        <li className="flex items-start gap-2 font-medium text-emerald-900 dark:text-emerald-200">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Everything Crew lead can do, plus:</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>View reports</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Use marketing tools (if available)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>Use sales pipeline (if available)</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* CAN'T DO */}
                <div className="space-y-2 bg-stone-50 dark:bg-stone-900/50 rounded-lg p-3.5 border border-stone-200/70 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-400">
                    <X className="size-4 text-stone-400" />
                    <span>Can&apos;t do</span>
                  </div>
                  <ul className="text-xs space-y-2 text-stone-600 dark:text-stone-400">
                    {preset === 'field_crew' && (
                      <>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>See anyone else&apos;s schedule</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Change their schedule</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Create or edit timesheets manually</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>See prices or costs</span>
                        </li>
                      </>
                    )}

                    {preset === 'senior_field_crew' && (
                      <>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Change anyone else&apos;s schedule</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Add or edit everyone&apos;s timesheets</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>View reports</span>
                        </li>
                      </>
                    )}

                    {preset === 'crew_lead' && (
                      <>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Use marketing tools</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>View reports</span>
                        </li>
                      </>
                    )}

                    {preset === 'manager' && (
                      <>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Add or remove team members</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <X className="size-3.5 text-stone-400 mt-0.5 shrink-0" />
                          <span>Change account settings</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Granular Custom Permissions Toggles (Shown when Custom is selected) */}
          {preset === 'custom' && (
            <div className="space-y-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 p-4 sm:p-5 bg-indigo-50/20 dark:bg-indigo-950/10">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600 text-white text-[10px]">Custom Configuration</Badge>
                <span className="text-xs text-muted-foreground">Adjust granular permissions below.</span>
              </div>

              {/* 1. Schedule */}
              <div className="space-y-2 border-b border-border/60 pb-3.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5 text-indigo-600" />
                  <span>Schedule</span>
                </Label>
                <Select value={customSchedule} onValueChange={(val: any) => setCustomSchedule(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view_own" className="text-xs">View their own schedule</SelectItem>
                    <SelectItem value="complete_own" className="text-xs">View and complete their own schedule</SelectItem>
                    <SelectItem value="edit_own" className="text-xs">Edit their own schedule</SelectItem>
                    <SelectItem value="edit_everyone" className="text-xs">Edit everyone&apos;s schedule</SelectItem>
                    <SelectItem value="edit_delete_everyone" className="text-xs">Edit and delete everyone&apos;s schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Time tracking & Timesheets */}
              <div className="space-y-2 border-b border-border/60 pb-3.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="size-3.5 text-indigo-600" />
                  <span>Time tracking and timesheets</span>
                </Label>
                <Select value={customTimeTracking} onValueChange={(val: any) => setCustomTimeTracking(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_stop_own" className="text-xs">Start and stop their own timers</SelectItem>
                    <SelectItem value="edit_own" className="text-xs">Track, manually enter, and edit their own time</SelectItem>
                    <SelectItem value="edit_everyone" className="text-xs">Track, manually enter, and edit everyone&apos;s time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Notes */}
              <div className="space-y-2 border-b border-border/60 pb-3.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <FileText className="size-3.5 text-indigo-600" />
                  <span>Notes</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Includes all notes across jobs. You can hide notes for a feature by turning off permissions for that feature.
                </p>
                <Select value={customNotes} onValueChange={(val: any) => setCustomNotes(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jobs_visits_only" className="text-xs">View notes on jobs and visits only</SelectItem>
                    <SelectItem value="view_all" className="text-xs">View all notes</SelectItem>
                    <SelectItem value="edit_all" className="text-xs">View and edit all</SelectItem>
                    <SelectItem value="edit_delete_all" className="text-xs">View, edit, and delete all</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Files & Media */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div>
                  <Label className="text-xs font-bold">Files and media</Label>
                  <p className="text-[11px] text-muted-foreground">Allows viewing of all client files and attachments</p>
                </div>
                <Switch checked={customFilesMedia} onCheckedChange={setCustomFilesMedia} />
              </div>

              {/* 5. Expenses */}
              <div className="space-y-2 border-b border-border/60 pb-3.5">
                <Label className="text-xs font-bold">Expenses</Label>
                <Select value={customExpenses} onValueChange={(val: any) => setCustomExpenses(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own" className="text-xs">View, record, and edit their own</SelectItem>
                    <SelectItem value="everyone" className="text-xs">View, record, and edit everyone&apos;s</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 6. Pricing & Job Costing */}
              <div className="space-y-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Show pricing</Label>
                    <p className="text-[11px] text-muted-foreground">Allows editing of quotes, invoices, and line items on jobs</p>
                  </div>
                  <Switch checked={customShowPricing} onCheckedChange={setCustomShowPricing} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="text-xs font-bold">Job costing</Label>
                    <p className="text-[11px] text-muted-foreground">Show job profit by tracking revenue and costs from line items, labor, and expenses</p>
                  </div>
                  <Switch checked={customJobCosting} onCheckedChange={setCustomJobCosting} />
                </div>
              </div>

              {/* 7. Clients & Properties */}
              <div className="space-y-2 border-b border-border/60 pb-3.5">
                <Label className="text-xs font-bold">Clients and properties</Label>
                <p className="text-[11px] text-muted-foreground">Includes access to all client custom fields and profiles</p>
                <Select value={customClients} onValueChange={(val: any) => setCustomClients(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_only" className="text-xs">View client name and address only</SelectItem>
                    <SelectItem value="view_full" className="text-xs">View full client and property info</SelectItem>
                    <SelectItem value="edit_full" className="text-xs">View and edit full client and property info</SelectItem>
                    <SelectItem value="edit_delete_full" className="text-xs">View, edit, and delete full client and property info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 8. Requests, Quotes, Jobs, Invoices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-border/60 pb-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Requests</Label>
                  <Select value={customRequests} onValueChange={(val: any) => setCustomRequests(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">View only</SelectItem>
                      <SelectItem value="create_edit" className="text-xs">View, create, and edit</SelectItem>
                      <SelectItem value="create_edit_delete" className="text-xs">View, create, edit, and delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Quotes</Label>
                  <Select value={customQuotes} onValueChange={(val: any) => setCustomQuotes(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">View only</SelectItem>
                      <SelectItem value="create_edit" className="text-xs">View, create, and edit</SelectItem>
                      <SelectItem value="create_edit_delete" className="text-xs">View, create, edit, and delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Jobs</Label>
                  <Select value={customJobs} onValueChange={(val: any) => setCustomJobs(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">View only</SelectItem>
                      <SelectItem value="create_edit" className="text-xs">View, create, and edit</SelectItem>
                      <SelectItem value="create_edit_delete" className="text-xs">View, create, edit, and delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Invoices</Label>
                  <Select value={customInvoices} onValueChange={(val: any) => setCustomInvoices(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">View only</SelectItem>
                      <SelectItem value="create_edit" className="text-xs">View, create, and edit</SelectItem>
                      <SelectItem value="create_edit_delete" className="text-xs">View, create, edit, and delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 9. Payments (with auto-dependencies) */}
              <div className="rounded-lg border border-border/80 p-3 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-emerald-600" />
                    <div>
                      <Label className="text-xs font-bold">Payments</Label>
                      <p className="text-[11px] text-muted-foreground">Allow payment collection on quotes and invoices</p>
                    </div>
                  </div>
                  <Switch checked={customPayments} onCheckedChange={handlePaymentsToggle} />
                </div>
                {customPayments && (
                  <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-1.5">
                    <Info className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      Required permissions applied: <strong>Show pricing</strong>, <strong>Clients and Properties: Edit access</strong>, and <strong>Quotes and/or Invoices: Edit access</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* 10. Client communications */}
              <div className="rounded-lg border border-border/80 p-3 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-sky-600" />
                    <div>
                      <Label className="text-xs font-bold">Client communications</Label>
                      <p className="text-[11px] text-muted-foreground">Information this user doesn&apos;t have permission to access will be hidden</p>
                    </div>
                  </div>
                  <Switch checked={customClientCommunications} onCheckedChange={handleClientCommunicationsToggle} />
                </div>
                {customClientCommunications && (
                  <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-1.5">
                    <Info className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>Required permissions applied: <strong>Clients and Properties: View access</strong>.</span>
                  </div>
                )}
              </div>

              {/* 11. Reports */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <Label className="text-xs font-bold">Reports</Label>
                  <p className="text-[11px] text-muted-foreground">Users will only be able to see reports available based on their permissions</p>
                </div>
                <Switch checked={customReports} onCheckedChange={setCustomReports} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 4: Communications & Language ────────────────────────── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Mail className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Communications &amp; Language</CardTitle>
              <CardDescription className="text-xs">
                Email preferences and invitation delivery language.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-1">
          <div className="space-y-3">
            <Label className="text-xs font-bold">Email subscriptions</Label>
            
            <div className="flex items-start gap-2.5">
              <input
                id="sub_surveys"
                type="checkbox"
                checked={subSurveys}
                onChange={(e) => setSubSurveys(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="sub_surveys" className="text-xs font-normal text-muted-foreground cursor-pointer">
                Receive occasional surveys to tell us how we’re doing
              </Label>
            </div>

            <div className="flex items-start gap-2.5">
              <input
                id="sub_marketing"
                type="checkbox"
                checked={subMarketingReminders}
                onChange={(e) => setSubMarketingReminders(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="sub_marketing" className="text-xs font-normal text-muted-foreground cursor-pointer">
                Receive weekly email reminders about upcoming marketing opportunities
              </Label>
            </div>
          </div>

          <Separator className="my-2" />

          <div className="space-y-2 max-w-sm">
            <Label htmlFor="inv_lang" className="text-xs font-bold">Invitation language</Label>
            <Select value={invitationLanguage} onValueChange={(val: any) => setInvitationLanguage(val)}>
              <SelectTrigger id="inv_lang" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English" className="text-xs">English</SelectItem>
                <SelectItem value="Spanish" className="text-xs">Spanish</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The chosen language only applies to the invitation and cannot be changed once sent. The mobile app is available in Spanish only to non-admin users who have their phone language set to Spanish.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Bottom Actions Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={saving}
          className="h-10 px-4 text-xs font-semibold"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSaveAndInvite}
          disabled={saving}
          className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Sending invitation...</span>
            </>
          ) : (
            <>
              <Send className="size-4" />
              <span>Send Invitation</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
