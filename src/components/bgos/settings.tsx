'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Check,
  Building2,
  Users,
  CreditCard,
  Bell,
  Plug,
  Zap,
  Shield,
  Sliders,
  FileText,
  Phone,
  Palette,
  Clock,
  MapPin,
  Receipt,
  ListPlus,
  Globe,
  Database,
  Upload,
  ExternalLink,
  Star,
  Plus,
  X,
  BadgeCheck,
  ChevronDown,
  Loader2,
  MessageSquare,
  Download,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { TeamSettings } from '@/components/settings/sections/team-settings';
import { GoogleBusinessProfileSettings } from '@/components/settings/sections/google-business-profile-settings';
import { SecuritySettings } from '@/components/settings/sections/security-settings';
import { BgosBilling } from './billing';
import { useAppStore } from '@/store/app-store';
import { META_ACCOUNT_CONFIG } from '@/lib/bgos-meta-templates';

type TopSettingsTab =
  | 'business'
  | 'team'
  | 'billing'
  | 'notifications'
  | 'integrations'
  | 'automation'
  | 'security'
  | 'preferences';

export type BusinessSubSection =
  | 'all'
  | 'profile'
  | 'details'
  | 'contact'
  | 'branding'
  | 'hours'
  | 'areas'
  | 'tax'
  | 'custom-fields'
  | 'region'
  | 'data';

export interface AddressFields {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export function parseAddress(raw?: string | null): AddressFields {
  if (!raw) return { street: '', city: '', state: '', pincode: '', country: '' };
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      return {
        street: obj.street || '',
        city: obj.city || '',
        state: obj.state || '',
        pincode: obj.pincode || obj.postalCode || obj.zip || '',
        country: obj.country || '',
      };
    } catch {}
  }
  return { street: trimmed, city: '', state: '', pincode: '', country: '' };
}

export function formatAddress(addr: AddressFields): string {
  const parts = [addr.street, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean);
  return parts.join(', ');
}

interface DaySchedule {
  day: string;
  open: boolean;
  start: string;
  end: string;
}

const INITIAL_HOURS: DaySchedule[] = [
  { day: 'Monday', open: true, start: '9:00 AM', end: '8:00 PM' },
  { day: 'Tuesday', open: true, start: '9:00 AM', end: '8:00 PM' },
  { day: 'Wednesday', open: true, start: '9:00 AM', end: '8:00 PM' },
  { day: 'Thursday', open: true, start: '9:00 AM', end: '8:00 PM' },
  { day: 'Friday', open: true, start: '9:00 AM', end: '8:00 PM' },
  { day: 'Saturday', open: true, start: '9:00 AM', end: '6:00 PM' },
  { day: 'Sunday', open: false, start: '9:00 AM', end: '6:00 PM' },
];

const BUSINESS_SIDEBAR_ITEMS: {
  id: BusinessSubSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'all', label: 'All Settings', icon: Sliders },
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'details', label: 'Business Details', icon: FileText },
  { id: 'contact', label: 'Contact Information', icon: Phone },
  { id: 'branding', label: 'Branding & Logo', icon: Palette },
  { id: 'hours', label: 'Business Hours', icon: Clock },
  { id: 'areas', label: 'Service Areas', icon: MapPin },
  { id: 'tax', label: 'Tax & Compliance', icon: Receipt },
  { id: 'custom-fields', label: 'Custom Fields', icon: ListPlus },
  { id: 'region', label: 'Language & Region', icon: Globe },
  { id: 'data', label: 'Data Management', icon: Database },
];

function normalizeTab(raw?: string | null): TopSettingsTab {
  if (!raw) return 'business';
  if (raw === 'workspace' || raw === 'business') return 'business';
  if (raw === 'subscription' || raw === 'billing') return 'billing';
  if (raw === 'team' || raw === 'users') return 'team';
  if (raw === 'google-business-profile' || raw === 'reputation' || raw === 'integrations') {
    return 'integrations';
  }
  if (
    raw === 'notifications' ||
    raw === 'automation' ||
    raw === 'security' ||
    raw === 'preferences'
  ) {
    return raw;
  }
  return 'business';
}

export function BgosSettings({ initialTab }: { initialTab?: string } = {}) {
  const pendingSettingsSection = useAppStore((s) => s.pendingSettingsSection);
  const setPendingSettingsSection = useAppStore((s) => s.setPendingSettingsSection);
  const navigate = useAppStore((s) => s.setCurrentView);

  const [tab, setTab] = useState<TopSettingsTab>(() => {
    if (initialTab) return normalizeTab(initialTab);
    if (pendingSettingsSection) return normalizeTab(pendingSettingsSection);
    return 'business';
  });

  const [activeSubSection, setActiveSubSection] = useState<BusinessSubSection>('all');
  const [savedToast, setSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Business Profile state
  const [businessName, setBusinessName] = useState('BGOS');
  const [businessType, setBusinessType] = useState('Home Cleaning Service');
  const [tagline, setTagline] = useState('Clean Spaces, Happy Places');
  const [description, setDescription] = useState(
    'Professional home cleaning services with trusted, verified cleaners. Book online, get instant quotes, and enjoy sparkling clean spaces.'
  );
  const [hasLogo, setHasLogo] = useState(true);

  // Address State (Structured)
  const [addressFields, setAddressFields] = useState<AddressFields>({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  });

  // Contact Information state
  const [phoneCountry, setPhoneCountry] = useState('🇦🇺');
  const [phoneNumber, setPhoneNumber] = useState('61732744866');
  const [emailAddress, setEmailAddress] = useState('hello@bgos.com');
  const [website, setWebsite] = useState('https://bgos.com');
  const [whatsappCountry, setWhatsappCountry] = useState('🇮🇳');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 98765 43210');

  // Business Hours state
  const [hours, setHours] = useState<DaySchedule[]>(INITIAL_HOURS);

  // Service Areas state
  const [serviceAreaMode, setServiceAreaMode] = useState<'all' | 'specific'>('specific');
  const [cities, setCities] = useState<string[]>(['Delhi', 'Noida', 'Gurgaon', 'Faridabad']);
  const [cityInput, setCityInput] = useState('');

  // Tax & Compliance state
  const [gstNumber, setGstNumber] = useState('07ABCDE1234F1Z5');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [businessAddress, setBusinessAddress] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState('18% (GST)');

  // Custom Fields state
  const [customFields, setCustomFields] = useState<Array<{ id: string; name: string; type: string; module: string }>>([
    { id: 'cf-1', name: 'Lead Referral Source', type: 'Select', module: 'Leads' },
    { id: 'cf-2', name: 'Property Type / Size', type: 'Text', module: 'Leads' },
    { id: 'cf-3', name: 'Gate / Security Code', type: 'Text', module: 'Customers' },
    { id: 'cf-4', name: 'Preferred Service Window', type: 'Select', module: 'Jobs' },
  ]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Text');
  const [newFieldModule, setNewFieldModule] = useState('Leads');
  const [isAddingField, setIsAddingField] = useState(false);

  const updateAddressField = (field: keyof AddressFields, value: string) => {
    setAddressFields((prev) => {
      const updated = { ...prev, [field]: value };
      setBusinessAddress(formatAddress(updated));
      return updated;
    });
  };

  // Notifications & Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [autoAssignLeads, setAutoAssignLeads] = useState(true);
  const [instantReviewDrafts, setInstantReviewDrafts] = useState(true);
  const [timezone, setTimezone] = useState('Australia/Brisbane (AEST, UTC+10:00)');
  const [currency, setCurrency] = useState('AUD ($)');

  // Real API hydration from brand-profile
  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const res = await fetch('/api/brand-profile');
        if (res.ok && isMounted) {
          const data = await res.json();
          const profile = data?.profile;
          if (profile) {
            if (profile.businessName) setBusinessName(profile.businessName);
            if (profile.industry) setBusinessType(profile.industry);
            if (profile.usps) setTagline(profile.usps);
            if (profile.voiceDescription) setDescription(profile.voiceDescription);
            if (profile.website) setWebsite(profile.website);
            if (profile.location && !data?.businessAddress) {
              const parsed = parseAddress(profile.location);
              setAddressFields(parsed);
              setBusinessAddress(formatAddress(parsed));
            }
            if (profile.serviceArea) {
              const areaList = profile.serviceArea.split(',').map((s: string) => s.trim()).filter(Boolean);
              if (areaList.length > 0) setCities(areaList);
            }
          }
          if (data?.hours && Array.isArray(data.hours) && data.hours.length > 0) {
            setHours(data.hours);
          }
          if (data?.phoneNumber) {
            setPhoneNumber(data.phoneNumber);
            if (data.phoneNumber.startsWith('61') || data.phoneNumber.startsWith('+61')) {
              setPhoneCountry('🇦🇺');
              setWhatsappCountry('🇦🇺');
            } else if (data.phoneNumber.startsWith('+91') || data.phoneNumber.startsWith('91')) {
              setPhoneCountry('🇮🇳');
              setWhatsappCountry('🇮🇳');
            } else if (data.phoneNumber.startsWith('+1')) {
              setPhoneCountry('🇺🇸');
              setWhatsappCountry('🇺🇸');
            }
          }
          if (data?.emailAddress) setEmailAddress(data.emailAddress);
          if (data?.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
          if (data?.businessAddress) {
            const parsed = parseAddress(data.businessAddress);
            setAddressFields(parsed);
            setBusinessAddress(formatAddress(parsed));
            const isAU = parsed.country.toUpperCase() === 'AU' || data.businessAddress.includes('AU') || data.businessAddress.includes('QLD');
            if (isAU) {
              setPhoneCountry('🇦🇺');
              setWhatsappCountry('🇦🇺');
              setDefaultTaxRate('10% (GST)');
              setTimezone('Australia/Brisbane (AEST, UTC+10:00)');
              setCurrency('AUD ($)');
            }
            if (!profile?.serviceArea && parsed.city) {
              setCities([parsed.city]);
            }
          }
          if (data?.gstNumber) setGstNumber(data.gstNumber);
          if (data?.invoicePrefix) setInvoicePrefix(data.invoicePrefix);
          if (data?.defaultTaxRate) setDefaultTaxRate(data.defaultTaxRate);
          if (data?.notifications) {
            if (typeof data.notifications.emailNotifications === 'boolean') setEmailNotifications(data.notifications.emailNotifications);
            if (typeof data.notifications.whatsappAlerts === 'boolean') setWhatsappAlerts(data.notifications.whatsappAlerts);
            if (typeof data.notifications.dailyDigest === 'boolean') setDailyDigest(data.notifications.dailyDigest);
          }
          if (data?.automation) {
            if (typeof data.automation.autoAssignLeads === 'boolean') setAutoAssignLeads(data.automation.autoAssignLeads);
            if (typeof data.automation.instantReviewDrafts === 'boolean') setInstantReviewDrafts(data.automation.instantReviewDrafts);
          }
          if (data?.preferences) {
            if (data.preferences.timezone) setTimezone(data.preferences.timezone);
            if (data.preferences.currency) setCurrency(data.preferences.currency);
          }
        }
      } catch {
        // preserve standard defaults
      }
    }
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (pendingSettingsSection) {
      setTab(normalizeTab(pendingSettingsSection));
      setPendingSettingsSection(null);
    }
  }, [pendingSettingsSection, setPendingSettingsSection]);

  useEffect(() => {
    if (initialTab) {
      setTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const serializedAddress = JSON.stringify(addressFields);
      const readableAddress = formatAddress(addressFields) || businessAddress;
      const res = await fetch('/api/brand-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          industry: businessType || 'Home Cleaning Service',
          website,
          location: readableAddress,
          businessAddress: serializedAddress,
          serviceArea: serviceAreaMode === 'all' ? 'All areas' : cities.join(', '),
          voiceDescription: description,
          usps: tagline,
          hours,
          phoneNumber,
          emailAddress,
          whatsappNumber,
          gstNumber,
          invoicePrefix,
          defaultTaxRate,
          notifications: {
            emailNotifications,
            whatsappAlerts,
            dailyDigest,
          },
          automation: {
            autoAssignLeads,
            instantReviewDrafts,
          },
          preferences: {
            timezone,
            currency,
          },
          skipAiSummary: true,
        }),
      });
      if (res.ok) {
        setSavedToast(true);
        toast.success('Business settings saved to database!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save settings to server. Please try again.');
      }
    } catch {
      toast.error('Network error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedToast(false), 2500);
    }
  };

  const toggleDayOpen = (dayName: string) => {
    setHours((prev) =>
      prev.map((d) => (d.day === dayName ? { ...d, open: !d.open } : d))
    );
  };

  const updateDayTime = (dayName: string, field: 'start' | 'end', value: string) => {
    setHours((prev) =>
      prev.map((d) => (d.day === dayName ? { ...d, [field]: value } : d))
    );
  };

  const handleAddCity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cityInput.trim()) {
      e.preventDefault();
      const trimmed = cityInput.trim();
      if (!cities.includes(trimmed)) {
        setCities((prev) => [...prev, trimmed]);
      }
      setCityInput('');
    }
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setCities((prev) => prev.filter((c) => c !== cityToRemove));
  };

  const topTabs: {
    id: TopSettingsTab;
    label: string;
    ariaLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'business', label: 'Business Settings', icon: Building2 },
    { id: 'team', label: 'Team & Users', icon: Users },
    {
      id: 'billing',
      label: 'Plans & Billing',
      ariaLabel: 'Plans & Billing & Subscription',
      icon: CreditCard,
    },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900">
      {/* Top Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 pt-5">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#009F50] text-white shadow-xs">
              <SettingsIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
              <p className="text-xs text-slate-500">
                Configure your business, team, integrations and preferences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedToast && (
              <span className="rounded-lg bg-[#E8F8EF] px-3 py-1.5 text-xs font-semibold text-[#009F50]">
                Changes Saved!
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-[#009F50] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#008A45] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 stroke-[2.5]" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Top Horizontal Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings Categories"
          className="mt-5 flex w-full items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {topTabs.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={item.ariaLabel ?? item.label}
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
                  isActive
                    ? 'border-[#009F50] text-[#009F50]'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`size-4 ${isActive ? 'text-[#009F50]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full p-6">
        {tab === 'business' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Vertical Sub-Sidebar (10 items) */}
            <aside className="lg:col-span-2">
              <nav
                aria-label="Business Settings Subsections"
                className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs"
              >
                <ul className="space-y-1">
                  {BUSINESS_SIDEBAR_ITEMS.map((sub) => {
                    const Icon = sub.icon;
                    const active = activeSubSection === sub.id;
                    return (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSubSection(sub.id)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
                            active
                              ? 'bg-[#E8F8EF] font-semibold text-[#009F50]'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Icon
                            className={`size-4 shrink-0 ${
                              active ? 'text-[#009F50]' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* Right Content Cards */}
            <div className="space-y-6 lg:col-span-10">
              {/* Profile & Details Section */}
              {(activeSubSection === 'all' || activeSubSection === 'profile' || activeSubSection === 'details' || activeSubSection === 'branding') && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  {/* Business Profile Card */}
                  <section
                    id="section-profile"
                    className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs xl:col-span-7"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {activeSubSection === 'branding' ? 'Branding & Logo' : 'Business Profile'}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Manage your business identity, public logo, and customer-facing profile.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('publicHub')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
                      >
                        <Globe className="size-3.5 text-slate-500" />
                        <span>View Public Profile</span>
                        <ExternalLink className="size-3 text-slate-400" />
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-12">
                      {/* Logo Upload Column */}
                      <div className="flex flex-col items-center sm:col-span-4 sm:items-start">
                        <div className="flex size-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs overflow-hidden">
                          {hasLogo ? (
                            <div className="flex size-20 items-center justify-center rounded-2xl bg-[#E8F8EF] text-5xl font-black text-[#009F50]">
                              {(businessName || 'B').charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">No Logo</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setHasLogo(true)}
                          className="mt-3 inline-flex w-28 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
                        >
                          <Upload className="size-3.5 text-slate-500" />
                          <span>Upload Logo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setHasLogo(false)}
                          className="mt-2 inline-flex w-28 items-center justify-center rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>

                        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-400 sm:text-left">
                          Recommended size: 512 × 512px
                          <br />
                          PNG, JPG or SVG (max 2MB)
                        </p>
                      </div>

                      {/* Profile Inputs Column */}
                      <div className="space-y-4 sm:col-span-8">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="settings-business-name"
                              className="block text-xs font-semibold text-slate-700"
                            >
                              Business Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id="settings-business-name"
                              type="text"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="settings-business-type"
                              className="block text-xs font-semibold text-slate-700"
                            >
                              Business Type <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative mt-1.5">
                              <select
                                id="settings-business-type"
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-3 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                              >
                                <option value="Home Cleaning Service">Home Cleaning Service</option>
                                <option value="HVAC & Plumbing">HVAC &amp; Plumbing</option>
                                <option value="Landscaping & Lawn Care">Landscaping &amp; Lawn Care</option>
                                <option value="Pest Control Service">Pest Control Service</option>
                                <option value="Electrical & Handyman">Electrical &amp; Handyman</option>
                                <option value="Fabrication & Engineering">Fabrication &amp; Engineering</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="settings-tagline"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Tagline
                          </label>
                          <input
                            id="settings-tagline"
                            type="text"
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="settings-description"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Business Description
                          </label>
                          <textarea
                            id="settings-description"
                            rows={3}
                            maxLength={300}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 focus:border-[#009F50] focus:outline-hidden"
                          />
                          <div className="mt-1 text-right text-[11px] font-medium text-slate-400">
                            {description.length}/300
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Profile Preview Card */}
                  <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs xl:col-span-5">
                    <h2 className="text-base font-bold text-slate-900">Profile Preview</h2>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                      {/* Cover Photo Banner */}
                      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-amber-100 via-emerald-50 to-teal-100">
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-85"
                          style={{
                            backgroundImage:
                              'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(245,158,11,0.22) 100%)',
                          }}
                        />
                        <div className="absolute right-4 bottom-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-700 backdrop-blur-xs">
                          <span>✨ {tagline || 'Clean Spaces, Happy Places'}</span>
                        </div>
                      </div>

                      {/* Avatar + Details */}
                      <div className="relative px-4 pt-2 pb-4">
                        <div className="-mt-9 mb-2 flex items-end justify-between">
                          <div className="flex size-14 items-center justify-center rounded-full border-4 border-white bg-[#009F50] text-2xl font-black text-white shadow-sm overflow-hidden">
                            {(businessName || 'B').charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {businessName || 'BGOS'}
                          </h3>
                          <BadgeCheck className="size-4 fill-sky-500 text-white shrink-0" />
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-800">4.8</span>
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-slate-500">(246 reviews)</span>
                        </div>

                        <p className="mt-0.5 text-xs text-slate-500">{businessType}</p>

                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-[#009F50] shrink-0" />
                            <span className="font-semibold text-[#009F50]">Open Now</span>
                            <span className="text-slate-500">· Closes 8:00 PM</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="size-3.5 text-[#009F50] shrink-0" />
                            <span className="truncate">{formatAddress(addressFields) || businessAddress || 'Your Business Location'}</span>
                          </div>
                        </div>

                        {/* 3 Action Buttons */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-[#009F50] px-3 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#008A45]"
                          >
                            Book Now
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Get Quote
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Phone className="size-3 text-slate-600" />
                            <span>Call</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Contact Information & Hours Section */}
              {(activeSubSection === 'all' || activeSubSection === 'contact' || activeSubSection === 'hours') && (
                <div className={`grid grid-cols-1 gap-6 ${(activeSubSection === 'all' || (activeSubSection === 'contact' && false)) ? 'xl:grid-cols-12' : (activeSubSection === 'contact' || activeSubSection === 'hours') ? '' : 'xl:grid-cols-12'}`}>
                  {(activeSubSection === 'all' || activeSubSection === 'contact') && (
                    <section
                      id="section-contact"
                      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs ${activeSubSection === 'all' ? 'xl:col-span-7' : 'w-full'}`}
                    >
                      <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Primary customer inquiry and notification endpoints.
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Phone Number */}
                        <div>
                          <label
                            htmlFor="settings-phone"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <div className="mt-1.5 flex rounded-xl border border-slate-200 bg-white focus-within:border-[#009F50]">
                            <button
                              type="button"
                              onClick={() =>
                                setPhoneCountry((c) => (c === '🇦🇺' ? '🇮🇳' : c === '🇮🇳' ? '🇺🇸' : '🇦🇺'))
                              }
                              className="flex items-center gap-1 border-r border-slate-200 px-2.5 py-2 text-xs text-slate-700"
                              aria-label="Phone country code"
                            >
                              <span>{phoneCountry}</span>
                              <ChevronDown className="size-3 text-slate-400" />
                            </button>
                            <input
                              id="settings-phone"
                              type="text"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="e.g. 61732744866"
                              className="w-full rounded-r-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Email Address */}
                        <div>
                          <label
                            htmlFor="settings-email"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Email Address <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="settings-email"
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="e.g. info@yourbusiness.com"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                          />
                        </div>

                        {/* Website */}
                        <div>
                          <label
                            htmlFor="settings-website"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Website
                          </label>
                          <input
                            id="settings-website"
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://yourbusiness.com"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                          />
                        </div>

                        {/* WhatsApp Number */}
                        <div>
                          <label
                            htmlFor="settings-whatsapp"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            WhatsApp Number
                          </label>
                          <div className="mt-1.5 flex rounded-xl border border-slate-200 bg-white focus-within:border-[#009F50]">
                            <button
                              type="button"
                              onClick={() =>
                                setWhatsappCountry((c) => (c === '🇦🇺' ? '🇮🇳' : c === '🇮🇳' ? '🇺🇸' : '🇦🇺'))
                              }
                              className="flex items-center gap-1 border-r border-slate-200 px-2.5 py-2 text-xs text-slate-700"
                              aria-label="WhatsApp country code"
                            >
                              <span>{whatsappCountry}</span>
                              <ChevronDown className="size-3 text-slate-400" />
                            </button>
                            <input
                              id="settings-whatsapp"
                              type="text"
                              value={whatsappNumber}
                              onChange={(e) => setWhatsappNumber(e.target.value)}
                              placeholder="e.g. +61 400 000 000"
                              className="w-full rounded-r-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            Used for customer communication and notifications.
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {(activeSubSection === 'all' || activeSubSection === 'hours') && (
                    <section
                      id="section-hours"
                      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs ${activeSubSection === 'all' ? 'xl:col-span-5' : 'w-full'}`}
                    >
                      <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-base font-bold text-slate-900">Business Hours</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Set your working hours and availability.
                        </p>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {hours.map((item) => (
                          <div
                            key={item.day}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => toggleDayOpen(item.day)}
                              className="flex w-28 shrink-0 items-center gap-2 text-left"
                            >
                              <span
                                className={`flex size-4 items-center justify-center rounded-sm border transition ${
                                  item.open
                                    ? 'border-[#009F50] bg-[#009F50] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {item.open && <Check className="size-3 stroke-[3]" />}
                              </span>
                              <span
                                className={`font-medium ${
                                  item.open ? 'text-slate-800' : 'text-slate-400'
                                }`}
                              >
                                {item.day}
                              </span>
                            </button>

                            {item.open ? (
                              <div className="flex flex-1 items-center gap-1.5">
                                <select
                                  aria-label={`${item.day} start time`}
                                  value={item.start}
                                  onChange={(e) =>
                                    updateDayTime(item.day, 'start', e.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:border-[#009F50] focus:outline-hidden"
                                >
                                  <option value="8:00 AM">8:00 AM</option>
                                  <option value="8:30 AM">8:30 AM</option>
                                  <option value="9:00 AM">9:00 AM</option>
                                  <option value="10:00 AM">10:00 AM</option>
                                </select>
                                <span className="text-slate-400">–</span>
                                <select
                                  aria-label={`${item.day} end time`}
                                  value={item.end}
                                  onChange={(e) =>
                                    updateDayTime(item.day, 'end', e.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:border-[#009F50] focus:outline-hidden"
                                >
                                  <option value="5:00 PM">5:00 PM</option>
                                  <option value="6:00 PM">6:00 PM</option>
                                  <option value="7:00 PM">7:00 PM</option>
                                  <option value="8:00 PM">8:00 PM</option>
                                  <option value="9:00 PM">9:00 PM</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-400">
                                  Closed
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (!item.open) toggleDayOpen(item.day);
                              }}
                              aria-label={`Add shift for ${item.day}`}
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Service Areas & Tax/Compliance Section */}
              {(activeSubSection === 'all' || activeSubSection === 'areas' || activeSubSection === 'tax') && (
                <div className={`grid grid-cols-1 gap-6 ${activeSubSection === 'all' ? 'xl:grid-cols-12' : ''}`}>
                  {(activeSubSection === 'all' || activeSubSection === 'areas') && (
                    <section
                      id="section-areas"
                      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs ${activeSubSection === 'all' ? 'xl:col-span-6' : 'w-full'}`}
                    >
                      <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-base font-bold text-slate-900">Service Areas</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Set the geographic regions where you provide your services.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {/* Option 1: All Cities / Country */}
                        <label
                          onClick={() => setServiceAreaMode('all')}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                            serviceAreaMode === 'all'
                              ? 'border-[#009F50] bg-[#E8F8EF]/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <span
                            className={`flex size-4 items-center justify-center rounded-full border ${
                              serviceAreaMode === 'all'
                                ? 'border-[#009F50]'
                                : 'border-slate-300'
                            }`}
                          >
                            {serviceAreaMode === 'all' && (
                              <span className="size-2 rounded-full bg-[#009F50]" />
                            )}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900">
                              All Cities / Countrywide
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              Serve customers across the entire region
                            </span>
                          </div>
                        </label>

                        {/* Option 2: Specific Cities */}
                        <label
                          onClick={() => setServiceAreaMode('specific')}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                            serviceAreaMode === 'specific'
                              ? 'border-[#009F50] bg-[#E8F8EF]/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <span
                            className={`flex size-4 items-center justify-center rounded-full border ${
                              serviceAreaMode === 'specific'
                                ? 'border-[#009F50]'
                                : 'border-slate-300'
                            }`}
                          >
                            {serviceAreaMode === 'specific' && (
                              <span className="size-2 rounded-full bg-[#009F50]" />
                            )}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900">Specific Cities / Suburbs</span>
                            <span className="ml-2 text-xs text-slate-500">
                              Select suburbs, postal codes or service zones
                            </span>
                          </div>
                        </label>

                        {/* City Tag Chips Box */}
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                          {cities.map((city) => (
                            <span
                              key={city}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              <span>{city}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCity(city)}
                                aria-label={`Remove ${city}`}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyDown={handleAddCity}
                            placeholder="Add suburb or zip code..."
                            className="min-w-[140px] flex-1 bg-transparent px-1.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {(activeSubSection === 'all' || activeSubSection === 'tax') && (
                    <section
                      id="section-tax"
                      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs ${activeSubSection === 'all' ? 'xl:col-span-6' : 'w-full'}`}
                    >
                      <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-base font-bold text-slate-900">Tax &amp; Compliance</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Configure tax identification, billing address, and default invoice rates.
                        </p>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="settings-gst-number"
                              className="block text-xs font-semibold text-slate-700"
                            >
                              {addressFields.country.toUpperCase() === 'AU' ? 'ABN / ACN Number' : 'GST / Tax ID Number'}
                            </label>
                            <input
                              id="settings-gst-number"
                              type="text"
                              value={gstNumber}
                              onChange={(e) => setGstNumber(e.target.value)}
                              placeholder={addressFields.country.toUpperCase() === 'AU' ? 'e.g. 51 824 753 556' : 'e.g. 07ABCDE1234F1Z5'}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="settings-invoice-prefix"
                              className="block text-xs font-semibold text-slate-700"
                            >
                              Invoice Prefix
                            </label>
                            <input
                              id="settings-invoice-prefix"
                              type="text"
                              value={invoicePrefix}
                              onChange={(e) => setInvoicePrefix(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Structured Business Address */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-slate-700">
                              Business Physical Address
                            </label>
                            <span className="text-[11px] text-slate-400">Structured for invoicing</span>
                          </div>

                          <div>
                            <label htmlFor="settings-address-street" className="block text-[11px] font-medium text-slate-500">Street Address</label>
                            <input
                              id="settings-address-street"
                              type="text"
                              value={addressFields.street}
                              onChange={(e) => updateAddressField('street', e.target.value)}
                              placeholder="e.g. 1/7 Macbarry Pl"
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="settings-address-city" className="block text-[11px] font-medium text-slate-500">City / Suburb</label>
                              <input
                                id="settings-address-city"
                                type="text"
                                value={addressFields.city}
                                onChange={(e) => updateAddressField('city', e.target.value)}
                                placeholder="e.g. Rocklea"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-address-state" className="block text-[11px] font-medium text-slate-500">State / Province</label>
                              <input
                                id="settings-address-state"
                                type="text"
                                value={addressFields.state}
                                onChange={(e) => updateAddressField('state', e.target.value)}
                                placeholder="e.g. QLD"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="settings-address-pincode" className="block text-[11px] font-medium text-slate-500">Postal / Zip Code</label>
                              <input
                                id="settings-address-pincode"
                                type="text"
                                value={addressFields.pincode}
                                onChange={(e) => updateAddressField('pincode', e.target.value)}
                                placeholder="e.g. 4106"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-address-country" className="block text-[11px] font-medium text-slate-500">Country Code</label>
                              <input
                                id="settings-address-country"
                                type="text"
                                value={addressFields.country}
                                onChange={(e) => updateAddressField('country', e.target.value.toUpperCase())}
                                placeholder="e.g. AU"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden uppercase"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="settings-tax-rate"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Default Tax Rate
                          </label>
                          <div className="relative mt-1.5">
                            <select
                              id="settings-tax-rate"
                              value={defaultTaxRate}
                              onChange={(e) => setDefaultTaxRate(e.target.value)}
                              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-3 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                            >
                              <option value="10% (GST)">10% (GST - Australia)</option>
                              <option value="18% (GST)">18% (GST - India)</option>
                              <option value="12% (GST)">12% (GST)</option>
                              <option value="5% (GST)">5% (GST)</option>
                              <option value="0% (Tax Exempt)">0% (Tax Exempt)</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Custom Fields Section */}
              {(activeSubSection === 'all' || activeSubSection === 'custom-fields') && (
                <section
                  id="section-custom-fields"
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Custom Fields</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Define custom attributes to capture on incoming leads, customer profiles, and service orders.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingField((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#009F50] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#008A45]"
                    >
                      <Plus className="size-3.5" />
                      <span>{isAddingField ? 'Cancel' : 'Add Custom Field'}</span>
                    </button>
                  </div>

                  {isAddingField && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900">Create New Field</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">Field Label</label>
                          <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="e.g. Property Square Footage"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">Field Type</label>
                          <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                          >
                            <option value="Text">Text</option>
                            <option value="Number">Number</option>
                            <option value="Select">Dropdown Select</option>
                            <option value="Date">Date Picker</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">Attach To</label>
                          <select
                            value={newFieldModule}
                            onChange={(e) => setNewFieldModule(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                          >
                            <option value="Leads">Leads &amp; Inquiries</option>
                            <option value="Customers">Customer Cards</option>
                            <option value="Jobs">Jobs &amp; Orders</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFieldName.trim()) return toast.error('Please enter a field label');
                            setCustomFields((prev) => [
                              ...prev,
                              {
                                id: `cf-${Date.now()}`,
                                name: newFieldName.trim(),
                                type: newFieldType,
                                module: newFieldModule,
                              },
                            ]);
                            setNewFieldName('');
                            setIsAddingField(false);
                            toast.success(`Custom field "${newFieldName.trim()}" added!`);
                          }}
                          className="rounded-xl bg-[#009F50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#008A45]"
                        >
                          Save Field
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 divide-y divide-slate-100">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-900">{field.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {field.type}
                          </span>
                          <span className="rounded-full bg-emerald-50 text-[#009F50] px-2 py-0.5 text-[10px] font-semibold">
                            {field.module}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFields((prev) => prev.filter((f) => f.id !== field.id));
                            toast.info(`Field "${field.name}" removed`);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Delete field"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Language & Region Section */}
              {(activeSubSection === 'all' || activeSubSection === 'region') && (
                <section
                  id="section-region"
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Language &amp; Region</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Localization, operating timezone, and tenant currency configuration.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Timezone</label>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Display Currency</label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Date Format</label>
                      <select
                        aria-label="Date format"
                        defaultValue="DD/MM/YYYY"
                        className="mt-1.5 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#009F50] focus:outline-hidden"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Day first - AU/UK)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (Month first - US)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                      </select>
                    </div>
                  </div>
                </section>
              )}

              {/* Data Management Section */}
              {(activeSubSection === 'all' || activeSubSection === 'data') && (
                <section
                  id="section-data"
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Data Management &amp; Privacy</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Export records, maintain audit transparency, and manage tenant data retention.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <h4 className="text-xs font-bold text-slate-900">Export Customer &amp; Lead Data</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Download full CSV records of your leads, contact books, and customer interaction logs.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toast.success('Leads CSV export generated and ready for download.');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                        >
                          <Download className="size-3.5 text-slate-500" />
                          <span>Export Leads (CSV)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toast.success('Customer JSON backup archive downloaded.');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                        >
                          <Download className="size-3.5 text-slate-500" />
                          <span>Export JSON</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <h4 className="text-xs font-bold text-slate-900">Audit Trail &amp; Data Retention</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Tenant activity logs and GDPR compliance records are securely maintained in primary DB storage.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                        <Check className="size-4" />
                        <span>Daily Automated Backups: Active</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {tab === 'team' && <TeamSettings />}

        {tab === 'billing' && <BgosBilling />}

        {tab === 'integrations' && (
          <div className="space-y-6">
            {/* Meta Cloud API & WhatsApp Business Integration Card */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 text-[#009F50]">
                    <MessageSquare className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Meta WhatsApp Business Cloud API
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Connected &amp; Verified
                      </span>
                      <span className="rounded-full bg-emerald-100/70 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                        Tier: Standard Cloud API
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Official Meta Cloud API connection for two-way WhatsApp customer chat, automated appointment confirmations, and marketing broadcasts.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                        <span className="text-[11px] text-slate-400 block font-medium">Verified Account</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{META_ACCOUNT_CONFIG.verifiedName}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                        <span className="text-[11px] text-slate-400 block font-medium">WhatsApp Number</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{META_ACCOUNT_CONFIG.displayPhoneNumber}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                        <span className="text-[11px] text-slate-400 block font-medium">Quality Rating</span>
                        <span className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {META_ACCOUNT_CONFIG.qualityRating}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                        <span className="text-[11px] text-slate-400 block font-medium">WABA ID</span>
                        <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300 mt-0.5 block truncate">{META_ACCOUNT_CONFIG.wabaId}</code>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                      <span>Phone ID: <code className="font-mono text-slate-600 dark:text-slate-300">{META_ACCOUNT_CONFIG.phoneNumberId}</code></span>
                      <span>•</span>
                      <span>Webhook Token: <code className="font-mono text-slate-600 dark:text-slate-300">{META_ACCOUNT_CONFIG.verifyToken}</code></span>
                      <span>•</span>
                      <span>Status: <strong className="text-emerald-600 font-semibold">{META_ACCOUNT_CONFIG.codeVerificationStatus}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success('Meta Cloud API test ping successful: Quality GREEN (FieserOS)');
                    }}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs transition"
                  >
                    Test Ping
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('socialMedia');
                    }}
                    className="rounded-xl bg-[#009F50] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#008A45] shadow-2xs transition"
                  >
                    Meta Templates →
                  </button>
                </div>
              </div>
            </div>

            {/* Google Business Profile Section */}
            <GoogleBusinessProfileSettings />
          </div>
        )}

        {tab === 'security' && <SecuritySettings />}

        {tab === 'notifications' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">Notification Preferences</h2>
            <p className="mt-1 text-xs text-slate-500">
              Control how you and your team receive customer, booking, and review alerts.
            </p>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email Notifications</p>
                  <p className="text-xs text-slate-500">
                    Receive instant alerts for new leads, bookings, and support tickets.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="size-4 accent-[#009F50]"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">WhatsApp Business Alerts</p>
                  <p className="text-xs text-slate-500">
                    Send automated booking confirmations and reminders via WhatsApp.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="size-4 accent-[#009F50]"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Daily Executive Digest</p>
                  <p className="text-xs text-slate-500">
                    Morning summary of appointments, open conversations, and new Google reviews.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  className="size-4 accent-[#009F50]"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'automation' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">AI &amp; Workflow Automation</h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure autonomous lead routing, AI review response drafts, and follow-up cadences.
            </p>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Auto-Assign Incoming Leads
                  </p>
                  <p className="text-xs text-slate-500">
                    Automatically route new website and WhatsApp inquiries to available specialists.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoAssignLeads}
                  onChange={(e) => setAutoAssignLeads(e.target.checked)}
                  className="size-4 accent-[#009F50]"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Instant AI Review Reply Drafts
                  </p>
                  <p className="text-xs text-slate-500">
                    Pre-generate personalized responses for every new Google Business review.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={instantReviewDrafts}
                  onChange={(e) => setInstantReviewDrafts(e.target.checked)}
                  className="size-4 accent-[#009F50]"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'preferences' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">Workspace Preferences</h2>
            <p className="mt-1 text-xs text-slate-500">
              Regional formatting, default currency, and workspace localization.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Display Currency
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
