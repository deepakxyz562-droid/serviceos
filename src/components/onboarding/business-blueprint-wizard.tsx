'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  Wrench,
  Scissors,
  Package,
  Laptop,
  Globe,
  Factory,
  Building2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import type { BusinessType, CountryCode, BusinessCapabilities, SalesChannel } from '@/lib/blueprint';
import {
  BUSINESS_TYPE_LABELS,
  COUNTRY_PACKS,
  SALES_CHANNEL_INFO,
  DEFAULT_CHANNELS_FOR_BUSINESS_TYPE,
  resolveBlueprintCapabilities,
  getCapabilitiesForBusinessType,
  getCountryPack,
} from '@/lib/blueprint';

interface BusinessBlueprintWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const BUSINESS_TYPES: BusinessType[] = [
  'retail',
  'restaurant',
  'grocery',
  'services',
  'salon',
  'wholesale',
  'freelancer',
  'online_store',
  'manufacturing',
  'other',
];

const ALL_SALES_CHANNELS: SalesChannel[] = [
  'in_store',
  'online',
  'whatsapp',
  'dine_in',
  'delivery',
  'at_location',
  'b2b',
];

const COUNTRIES: CountryCode[] = ['US', 'CA', 'AU', 'IN', 'GB', 'GLOBAL'];

export function BusinessBlueprintWizard({
  open,
  onOpenChange,
  onComplete,
}: BusinessBlueprintWizardProps) {
  const { auth, blueprint, setBlueprint } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<BusinessType>(
    blueprint?.businessType || 'retail'
  );
  const [selectedChannels, setSelectedChannels] = useState<SalesChannel[]>(
    blueprint?.salesChannels && blueprint.salesChannels.length > 0
      ? blueprint.salesChannels
      : (DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[blueprint?.businessType || 'retail'] || ['in_store'])
  );
  const [businessName, setBusinessName] = useState<string>(
    blueprint?.businessName || auth?.tenant?.name || auth?.tenant?.companyName || ''
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    blueprint?.country || 'US'
  );
  const [capabilities, setCapabilities] = useState<BusinessCapabilities>(
    blueprint?.capabilities || resolveBlueprintCapabilities('retail', ['in_store', 'whatsapp'])
  );
  const [saving, setSaving] = useState(false);

  const countryPack = getCountryPack(selectedCountry);

  const handleSelectType = (type: BusinessType) => {
    setSelectedType(type);
    const channels = DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[type] || ['in_store'];
    setSelectedChannels(channels);
    setCapabilities(resolveBlueprintCapabilities(type, channels));
  };

  const toggleChannel = (channel: SalesChannel) => {
    const updated = selectedChannels.includes(channel)
      ? selectedChannels.filter((c) => c !== channel)
      : [...selectedChannels, channel];
    const finalChannels = updated.length > 0 ? updated : [channel];
    setSelectedChannels(finalChannels);
    setCapabilities(resolveBlueprintCapabilities(selectedType, finalChannels, capabilities));
  };

  const toggleCapability = (key: keyof BusinessCapabilities) => {
    setCapabilities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/blueprint', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: selectedType,
          salesChannels: selectedChannels,
          businessName: businessName.trim() || undefined,
          country: selectedCountry,
          capabilities,
        }),
      });

      if (!res.ok) throw new Error('Failed to save business profile');
      const data = await res.json();

      if (data?.blueprint) {
        setBlueprint(data.blueprint);
        toast.success('Your business workspace is configured!', {
          description: `Active modules updated for ${BUSINESS_TYPE_LABELS[selectedType].label}.`,
        });
        onOpenChange(false);
        if (onComplete) onComplete();
      }
    } catch (err) {
      toast.error('Could not save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl">
        {/* Wizard Header */}
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-xs px-2.5 py-0.5">
              Step {step} of 3
            </Badge>
            <span className="text-xs text-muted-foreground font-semibold">
              Nuvora Business Architecture
            </span>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {step === 1 && 'Step 1 — What is your business?'}
            {step === 2 && 'Step 2 — How do you sell?'}
            {step === 3 && 'Step 3 — Location & Active Modules'}
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {step === 1 &&
              'Choose your industry. Nuvora will tailor the vocabulary and default tools.'}
            {step === 2 &&
              'Select all the channels you use to sell. This configures your POS, catalog, and ordering.'}
            {step === 3 &&
              'Review your operating country, tax pack, and toggle active workspace modules.'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: BUSINESS TYPE */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4">
            {BUSINESS_TYPES.map((type) => {
              const meta = BUSINESS_TYPE_LABELS[type];
              const isSelected = selectedType === type;
              return (
                <div
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-border/70 hover:border-slate-300 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground truncate">
                        {meta.label}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 2: HOW DO YOU SELL (SALES CHANNELS) */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_SALES_CHANNELS.map((ch) => {
                const info = SALES_CHANNEL_INFO[ch];
                const isSelected = selectedChannels.includes(ch);
                return (
                  <div
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-border/70 hover:border-slate-300 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">
                          {info.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {info.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & CAPABILITIES CHECKLIST */}
        {step === 3 && (
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Business Name
                </Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Blue River Bakery, Peak Plumbing"
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Country &amp; Tax Model
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COUNTRIES.map((c) => {
                    const pack = COUNTRY_PACKS[c];
                    const isSelected = selectedCountry === c;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-border/80 bg-card hover:bg-muted text-xs'
                        }`}
                      >
                        <span className="text-base mr-1">{pack.flag}</span>
                        <span className="text-xs">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {/* Commerce & Sales */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Sell &amp; Transact
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.posRegister}
                      onCheckedChange={() => toggleCapability('posRegister')}
                    />
                    <span>Walk-in POS Cashier Register</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.onlineStore}
                      onCheckedChange={() => toggleCapability('onlineStore')}
                    />
                    <span>Online Catalog &amp; Storefront</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.orders}
                      onCheckedChange={() => toggleCapability('orders')}
                    />
                    <span>Order Stream &amp; Kitchen Queue</span>
                  </label>
                </div>
              </div>

              {/* Products & Inventory */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Products &amp; Stock
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.catalog}
                      onCheckedChange={() => toggleCapability('catalog')}
                    />
                    <span>Product &amp; Service Catalog</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.inventory}
                      onCheckedChange={() => toggleCapability('inventory')}
                    />
                    <span>Inventory &amp; Low-Stock Alerts</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.suppliers}
                      onCheckedChange={() => toggleCapability('suppliers')}
                    />
                    <span>Suppliers &amp; Purchase Orders</span>
                  </label>
                </div>
              </div>

              {/* Restaurant / Dining Specific */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Hospitality &amp; Dining
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.dining}
                      onCheckedChange={() => toggleCapability('dining')}
                    />
                    <span>Dine-In Management</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.tables}
                      onCheckedChange={() => toggleCapability('tables')}
                    />
                    <span>Table QR &amp; Floor Plan</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.kitchenKot}
                      onCheckedChange={() => toggleCapability('kitchenKot')}
                    />
                    <span>Kitchen KOT Display</span>
                  </label>
                </div>
              </div>

              {/* Invoicing & Ledger */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Billing &amp; Finance
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.invoicing}
                      onCheckedChange={() => toggleCapability('invoicing')}
                    />
                    <span>Invoices &amp; Receipts</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.quotes}
                      onCheckedChange={() => toggleCapability('quotes')}
                    />
                    <span>Estimates &amp; Quotations</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.customerCredit}
                      onCheckedChange={() => toggleCapability('customerCredit')}
                    />
                    <span>{countryPack.vocabulary.customerCredit}</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.expenses}
                      onCheckedChange={() => toggleCapability('expenses')}
                    />
                    <span>Day Book &amp; Expenses</span>
                  </label>
                </div>
              </div>

              {/* Service & Jobs */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Field Service &amp; Booking
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.leads}
                      onCheckedChange={() => toggleCapability('leads')}
                    />
                    <span>Lead Intake &amp; Qualification</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.jobs}
                      onCheckedChange={() => toggleCapability('jobs')}
                    />
                    <span>Job Management &amp; Dispatch</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.calendarBooking}
                      onCheckedChange={() => toggleCapability('calendarBooking')}
                    />
                    <span>Online Appointments &amp; Calendar</span>
                  </label>
                </div>
              </div>

              {/* Customers & Marketing */}
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Customers &amp; Growth
                </span>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.customers}
                      onCheckedChange={() => toggleCapability('customers')}
                    />
                    <span>Customer CRM &amp; Contact History</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.loyalty}
                      onCheckedChange={() => toggleCapability('loyalty')}
                    />
                    <span>Loyalty &amp; Repeat Reward Points</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <Checkbox
                      checked={capabilities.aiReceptionist}
                      onCheckedChange={() => toggleCapability('aiReceptionist')}
                    />
                    <span>24/7 AI Voice &amp; Chat Receptionist</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 px-4"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 px-5 shadow-md shadow-emerald-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Launch Workspace
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
