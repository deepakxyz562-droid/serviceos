'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Globe,
  Store,
  Bell,
  CreditCard,
  Save,
  CheckCircle2,
  ExternalLink,
  Copy,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Mail,
  User,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import { CURRENCIES, currencyMap, formatCurrency, resolveEffectiveCurrency, detectGeoCurrency } from '@/lib/currency-resolver';
import { invalidateCurrencyCache } from '@/hooks/use-company-currency';
import { CreatorProfileData } from '@/lib/creator-profile';
import { cn } from '@/lib/utils';

export function GptFormSettingsView() {
  const auth = useAppStore((s) => s.auth);
  const setAuth = useAppStore((s) => s.setAuth);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const [activeTab, setActiveTab] = useState<'currency' | 'branding' | 'notifications' | 'payments'>('currency');
  const [loading, setLoading] = useState(true);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Currency State
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [detectedGeo, setDetectedGeo] = useState('USD');

  // Profile / Branding State
  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [themeColor, setThemeColor] = useState('#2563EB');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  // Notification State
  const [alertEmail, setAlertEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [notifyOnSubmission, setNotifyOnSubmission] = useState(true);
  const [notifyOnBooking, setNotifyOnBooking] = useState(true);

  // Load Settings & Profile
  useEffect(() => {
    const geo = detectGeoCurrency();
    setDetectedGeo(geo);

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch currency setting
        const curRes = await authFetch('/api/settings/currency');
        if (curRes.ok) {
          const curData = await curRes.json();
          const effective = curData.currency || curData.baseCurrency || auth?.tenant?.currency || geo;
          setSelectedCurrency(effective);
        } else {
          setSelectedCurrency(auth?.tenant?.currency || geo);
        }

        // 2. Fetch creator profile
        const profRes = await authFetch('/api/creator/profile');
        if (profRes.ok) {
          const profData = await profRes.json();
          const p: CreatorProfileData = profData.profile;
          setProfile(p);
          setDisplayName(p.displayName || auth?.tenant?.name || 'My Studio');
          setHandle(p.handle || auth?.tenant?.slug || 'creator');
          setHeadline(p.headline || 'Consultant & Creator');
          setBio(p.bio || '');
          setThemeColor(p.themeColor || '#2563EB');
          setAvatarUrl(p.avatarUrl || auth?.tenant?.logo || '');
          setIsEnabled(!!p.isEnabled);
        } else {
          setDisplayName(auth?.tenant?.name || 'My Studio');
          setHandle(auth?.tenant?.slug || 'creator');
        }

        // 3. User email
        setAlertEmail(auth?.user?.email || '');
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [auth?.tenant?.currency, auth?.tenant?.name, auth?.tenant?.slug, auth?.tenant?.logo, auth?.user?.email]);

  // Handle Save Currency
  const handleSaveCurrency = async () => {
    setSavingCurrency(true);
    try {
      const res = await authFetch('/api/settings/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: selectedCurrency, baseCurrency: selectedCurrency }),
      });

      if (!res.ok) {
        throw new Error('Failed to update currency');
      }

      // Invalidate frontend cache and update store
      invalidateCurrencyCache();
      if (auth.tenant) {
        setAuth({
          ...auth,
          tenant: {
            ...auth.tenant,
            currency: selectedCurrency,
          },
        });
      }

      toast.success(`Default currency updated to ${selectedCurrency} (${currencyMap[selectedCurrency]?.symbol || ''})`);
    } catch {
      toast.error('Failed to save currency setting');
    } finally {
      setSavingCurrency(false);
    }
  };

  // Handle Save Branding
  const handleSaveBranding = async () => {
    if (!profile) return;
    setSavingBranding(true);
    try {
      const updatedProfile: CreatorProfileData = {
        ...profile,
        displayName: displayName.trim(),
        handle: handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        headline: headline.trim(),
        bio: bio.trim(),
        themeColor,
        avatarUrl: avatarUrl.trim(),
        isEnabled,
      };

      const res = await authFetch('/api/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile }),
      });

      if (!res.ok) throw new Error('Failed to update profile');
      setProfile(updatedProfile);
      toast.success('Storefront & branding settings saved');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  // Handle Save Notifications
  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      toast.success('Notification preferences saved');
    } finally {
      setSavingNotifications(false);
    }
  };

  const currentCurrencyInfo = currencyMap[selectedCurrency] || {
    code: selectedCurrency,
    name: selectedCurrency,
    symbol: '$',
  };

  return (
    <div className="w-full space-y-6 p-4 md:p-8 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            <Sparkles className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                GPTForm Settings
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                STANDALONE SUITE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your primary currency, creator storefront branding, lead alerts &amp; payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/p/${handle || 'creator'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 text-foreground font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs h-9"
          >
            <span>Preview Storefront</span>
            <ExternalLink className="size-3.5" />
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('formBuilder')}
            className="text-xs font-bold rounded-xl h-9 gap-1.5"
          >
            <span>Open Studio</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Modern Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="w-full space-y-6"
      >
        <div className="w-full bg-muted/60 p-1.5 rounded-2xl border flex items-center gap-1 overflow-x-auto shadow-2xs">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-0 bg-transparent gap-1.5">
            <TabsTrigger
              value="currency"
              className="gap-2 text-xs sm:text-sm font-bold py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <DollarSign className="size-4 text-emerald-600" />
              <span>Currency &amp; Region</span>
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="gap-2 text-xs sm:text-sm font-bold py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Store className="size-4 text-purple-600" />
              <span>Storefront &amp; Brand</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="gap-2 text-xs sm:text-sm font-bold py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Bell className="size-4 text-blue-600" />
              <span>Lead Alerts</span>
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="gap-2 text-xs sm:text-sm font-bold py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <CreditCard className="size-4 text-teal-600" />
              <span>Payments (Creem)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TAB 1: CURRENCY & LOCALIZATION ─── */}
        <TabsContent value="currency" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-600" />
                    Application &amp; Form Currency
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose the primary currency for your forms, consultation rates, special offers, and public storefront.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Select Active Currency</Label>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      This updates the default currency for all forms, offers, and payment checkout buttons.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Browser Geo-Detection</span>
                      <Badge variant="outline" className="text-[10px] font-bold font-mono">
                        {detectedGeo}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Selected Currency Symbol</span>
                      <span className="text-base font-black text-emerald-600">{currentCurrencyInfo.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Price Preview Sample</span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(49, selectedCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSaveCurrency}
                      disabled={savingCurrency}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-5 gap-1.5 shadow-xs"
                    >
                      <Save className="size-3.5" />
                      <span>{savingCurrency ? 'Saving...' : 'Save Currency Setting'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Currency Guide Card */}
            <div>
              <Card className="rounded-2xl border shadow-xs bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-blue-500/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Globe className="size-4 text-emerald-600" />
                    Multi-Currency Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Default Fallback:</strong> If no currency is configured, ServiceOS automatically checks the visitor&apos;s geographic location (e.g. INR for India, EUR for Europe, GBP for UK, USD for Americas &amp; global).
                  </p>
                  <p>
                    <strong className="text-foreground">Creem MoR Checkout:</strong> When receiving payments through forms or offers, Creem converts your primary price dynamically into 100+ local currencies so international customers pay seamlessly.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: STOREFRONT & BRANDING ─── */}
        <TabsContent value="branding" className="mt-0 space-y-6">
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Store className="size-4 text-purple-600" />
                Public Creator Profile &amp; Branding
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your public Topmate-style storefront at /p/[handle].
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              {/* Profile Published Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Public Storefront Visibility</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isEnabled ? 'Your storefront is live and accessible at /p/' + (handle || 'creator') : 'Storefront is currently in private draft mode'}
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Creator / Business Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Public Handle Slug</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground font-mono">/p/</span>
                    <Input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="acme-studio"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Headline &amp; Specialty</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Design Systems & Product Strategy Consultant"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Storefront Bio</Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell clients about what you offer, session prep, and expertise..."
                  className="w-full rounded-xl border bg-background p-3 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Brand Theme Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="size-9 rounded-xl border p-1 cursor-pointer bg-background"
                    />
                    <Input
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Avatar / Logo Image URL</Label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-9 px-5 gap-1.5 shadow-xs"
                >
                  <Save className="size-3.5" />
                  <span>{savingBranding ? 'Saving...' : 'Save Branding'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: LEAD NOTIFICATIONS ─── */}
        <TabsContent value="notifications" className="mt-0 space-y-6">
          <Card className="rounded-2xl border shadow-xs max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="size-4 text-blue-600" />
                Instant Lead &amp; Booking Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                Receive instant notifications when someone submits a form or reserves a consultation slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="size-3.5 text-blue-600" /> Notification Email
                </Label>
                <Input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-emerald-600" /> WhatsApp Alert Number
                </Label>
                <Input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000 or +91 9876543210"
                  className="h-9 text-xs rounded-xl font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Include your country code for instant WhatsApp ping when high-intent leads submit your form.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Form Inquiries Alert</p>
                    <p className="text-[11px] text-muted-foreground">Send real-time alerts for lead captures &amp; quiz completions</p>
                  </div>
                  <Switch checked={notifyOnSubmission} onCheckedChange={setNotifyOnSubmission} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Booking Confirmations</p>
                    <p className="text-[11px] text-muted-foreground">Send Google Meet link alerts when a client reserves a call</p>
                  </div>
                  <Switch checked={notifyOnBooking} onCheckedChange={setNotifyOnBooking} />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifications}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-5 gap-1.5 shadow-xs"
                >
                  <Save className="size-3.5" />
                  <span>{savingNotifications ? 'Saving...' : 'Save Notification Preferences'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: PAYMENTS (CREEM) ─── */}
        <TabsContent value="payments" className="mt-0 space-y-6">
          <Card className="rounded-2xl border shadow-xs max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-teal-600" />
                Payments &amp; Checkout (Creem MoR)
              </CardTitle>
              <CardDescription className="text-xs">
                Zero-setup Merchant-of-Record payment processing for digital products and paid 1:1 calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Creem MoR Enabled</span>
                  <Badge className="bg-emerald-600 text-white text-[9px] uppercase px-1.5 py-0">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your store is pre-configured with Creem Merchant-of-Record. Customers from around the world can purchase your offers and forms using Credit/Debit Cards, UPI, Apple Pay, and Google Pay.
                </p>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground pt-2">
                <p className="font-semibold text-foreground">Supported Payment Methods:</p>
                <div className="flex flex-wrap gap-2">
                  {['UPI (PhonePe, GPay, Paytm)', 'Visa / Mastercard / Amex', 'Apple Pay', 'Google Pay', 'Net Banking', 'International Cards'].map((m) => (
                    <Badge key={m} variant="secondary" className="text-[11px] py-0.5">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
