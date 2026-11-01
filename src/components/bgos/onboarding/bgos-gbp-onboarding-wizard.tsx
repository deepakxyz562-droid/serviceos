'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  Upload,
  Plus,
  X,
  Store,
  CheckCircle2,
  Phone,
  MessageCircle,
  HelpCircle,
  AlertCircle,
  Layers,
  Star,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface DiscoveredLocation {
  id: string;
  name: string;
  address: string;
  category: string;
  placeId: string | null;
  phone?: string;
  website?: string;
  googleEmail?: string;
  isVerified: boolean;
}

interface OnboardingResponse {
  onboardingCompleted: boolean;
  onboardingStep: number;
  hasConnectedGbp: boolean;
  activeLocation: DiscoveredLocation | null;
  discoveredLocations: DiscoveredLocation[];
  offerings: string[];
  aboutText: string;
  keywords: string[];
  hours: Record<string, { open: boolean; openTime: string; closeTime: string }> | null;
  automations: {
    autoReplyReviews: boolean;
    autoGeneratePosts: boolean;
    autoPublishPhotos: boolean;
  };
  businessName: string;
  industry: string;
}

interface BgosGbpOnboardingWizardProps {
  tenant?: any;
  user?: any;
  onComplete: () => void;
}

const STEPS = [
  { n: 1, label: 'Connect' },
  { n: 2, label: 'Location' },
  { n: 3, label: 'About' },
  { n: 4, label: 'GBP Info' },
  { n: 5, label: 'Others' },
];

export function BgosGbpOnboardingWizard({
  tenant,
  user,
  onComplete,
}: BgosGbpOnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingResponse | null>(null);

  // Step 3 Sub-tabs
  const [aboutTab, setAboutTab] = useState<'offerings' | 'about'>('offerings');
  const [offerings, setOfferings] = useState<string[]>([]);
  const [newOfferingInput, setNewOfferingInput] = useState('');
  const [aboutText, setAboutText] = useState('');

  // Step 4 Sub-tabs
  const [gbpTab, setGbpTab] = useState<'keywords' | 'hours' | 'attributes'>('keywords');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Step 5 Automations
  const [autoReplyReviews, setAutoReplyReviews] = useState(true);
  const [autoGeneratePosts, setAutoGeneratePosts] = useState(true);
  const [autoPublishPhotos, setAutoPublishPhotos] = useState(true);

  // Multi-location modal
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // Load state
  const loadOnboardingState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bgos/onboarding', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load onboarding');
      const json: OnboardingResponse = await res.json();
      setData(json);

      if (json.offerings && json.offerings.length > 0) {
        setOfferings(json.offerings);
      }
      if (json.aboutText) {
        setAboutText(json.aboutText);
      } else if (json.businessName) {
        setAboutText(
          `${json.businessName} is a top-rated ${json.industry || 'service'} provider dedicated to delivering premium quality, attentive customer service, and reliable local solutions.`
        );
      }
      if (json.keywords && json.keywords.length > 0) {
        setKeywords(json.keywords);
      } else {
        setKeywords([
          `${json.businessName || 'best service'} near me`,
          `${json.industry || 'local service'} near me`,
          `top rated in city`,
        ]);
      }
      if (json.automations) {
        setAutoReplyReviews(json.automations.autoReplyReviews ?? true);
        setAutoGeneratePosts(json.automations.autoGeneratePosts ?? true);
        setAutoPublishPhotos(json.automations.autoPublishPhotos ?? true);
      }

      if (json.hasConnectedGbp && json.onboardingStep > 1) {
        setStep(Math.min(json.onboardingStep, 5));
      } else {
        setStep(1);
      }
    } catch (err) {
      console.warn('[BgosWizard] Fetch error:', err);
      toast.error('Could not load onboarding progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const saveStepProgress = async (nextStep: number, complete = false) => {
    try {
      setSaving(true);
      const res = await fetch('/api/bgos/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: nextStep,
          complete,
          offerings,
          aboutText,
          keywords,
          automations: {
            autoReplyReviews,
            autoGeneratePosts,
            autoPublishPhotos,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save progress');
      if (complete) {
        toast.success('BGOS Onboarding Complete! Launching your AI Growth Employee…');
        onComplete();
      } else {
        setStep(nextStep);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error saving step');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectLocation = async (locationId: string) => {
    try {
      setSaving(true);
      await fetch('/api/bgos/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeLocationId: locationId }),
      });
      setLocationPickerOpen(false);
      toast.success('Active Google Business location updated');
      await loadOnboardingState();
    } catch (err) {
      toast.error('Could not select location');
    } finally {
      setSaving(false);
    }
  };

  // AI suggestions for offerings
  const aiOfferings = useMemo(() => {
    const ind = (data?.industry || '').toLowerCase();
    if (ind.includes('cafe') || ind.includes('restaurant') || ind.includes('food')) {
      return ['Specialty Coffee', 'Artisan Sandwiches', 'Cold Brew', 'Breakfast Combos', 'Desserts & Pastries', 'Dine-in Experience'];
    }
    if (ind.includes('dental') || ind.includes('health') || ind.includes('clinic')) {
      return ['General Consultation', 'Teeth Cleaning', 'Emergency Care', 'Cosmetic Treatment', 'Specialist Consultation'];
    }
    return ['Signature Service', 'Emergency Support', 'Annual Maintenance', 'Express Service', 'Home Visit Consultation'];
  }, [data]);

  // AI suggestions for keywords
  const aiKeywords = useMemo(() => {
    const name = data?.businessName || 'best cafe';
    const ind = data?.industry || 'vashi';
    return [
      `${name} near me`,
      `${ind} near me`,
      `best ${ind} in city`,
      `top rated ${name}`,
      `affordable ${ind}`,
      `fast ${ind} near me`,
      `${ind} for couples`,
      `best ${ind} near station`,
      `family ${ind} near me`,
      `${name} opening hours`,
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-600">Loading BGOS Onboarding…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top brand & help bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="font-bold text-slate-900 text-lg">BGOS Growth Setup</span>
          </div>

          <a
            href="https://wa.me/916127967087?text=Hi%20BGOS%20Support%2C%20I%20need%20help%20with%20onboarding"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            Need help?
          </a>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between relative">
            {STEPS.map((s, idx) => {
              const isCompleted = s.n < step;
              const isActive = s.n === step;
              return (
                <div key={s.n} className="flex-1 flex flex-col items-center relative z-10">
                  <div className="flex items-center w-full">
                    <div
                      className={`h-0.5 flex-1 border-t-2 border-dashed ${
                        idx === 0 ? 'invisible' : s.n <= step ? 'border-emerald-600' : 'border-slate-200'
                      }`}
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'border-2 border-emerald-600 text-emerald-700 bg-emerald-50'
                          : 'border border-slate-200 text-slate-400 bg-white'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.n}
                    </div>
                    <div
                      className={`h-0.5 flex-1 border-t-2 border-dashed ${
                        idx === STEPS.length - 1 ? 'invisible' : s.n < step ? 'border-emerald-600' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <span
                    className={`mt-2 text-xs ${
                      isActive || isCompleted ? 'font-bold text-emerald-700' : 'font-medium text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            STEP 1 · CONNECT
           ══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-6">
              {!data?.hasConnectedGbp ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mx-auto flex items-center justify-center text-3xl font-extrabold text-blue-500">
                    G
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      Connect your Google Business Profile
                    </h2>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Put your business on Google Maps — BGOS AI handles reviews, posts, photos, and rank optimization after a one-time sign-in.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                    {[
                      { icon: MessageCircle, title: 'AI Review Replies', desc: 'Instantly answered with SEO keywords' },
                      { icon: Sparkles, title: 'Auto Post Generation', desc: '1–2 weekly rank-boosting posts' },
                      { icon: Layers, title: 'Photo Drip-Publishing', desc: 'Keeps your listing active on Maps' },
                      { icon: Star, title: 'Local Search Telemetry', desc: 'Track views, calls, and directions' },
                    ].map((feat) => (
                      <div key={feat.title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <feat.icon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{feat.title}</div>
                          <div className="text-[11px] text-slate-500">{feat.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      window.location.href = `/api/oauth/googlebusiness/connect?product=bgos&returnView=dashboard`;
                    }}
                    className="w-full max-w-sm mx-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base"
                  >
                    Connect with Google
                  </Button>
                  <p className="text-xs text-slate-400">
                    Secure Google OAuth · We never modify your profile without your consent.
                  </p>
                </div>
              ) : (
                /* Verified Business Profile Card (Screenshots 2 & 4) */
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Google Business Profile Connected!
                    </h2>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified
                        </Badge>
                        <Badge variant="outline" className="text-slate-600 font-medium">
                          GBP Connected
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {data.activeLocation?.name || data.businessName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-sm text-slate-900">5.0</span>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">(Verified Listing)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {data.activeLocation?.address || 'Verified Google Maps Location'}
                    </p>

                    {data.activeLocation?.category && (
                      <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                        {data.activeLocation.category}
                      </span>
                    )}

                    {data.discoveredLocations.length > 1 && (
                      <div className="pt-2 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocationPickerOpen(true)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 p-0 h-auto font-bold"
                        >
                          Switch Location ({data.discoveredLocations.length} locations available) →
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 text-base"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 2 · LOCATION
           ══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Confirm Your Business Location</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verify how your store or service coordinates appear on Google Maps.
                </p>
              </div>

              {/* Map simulation card */}
              <div className="h-32 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center p-4 text-center">
                <MapPin className="w-8 h-8 text-red-500 mb-1" />
                <span className="font-bold text-sm text-slate-900">
                  {data?.activeLocation?.name || 'Verified Location'}
                </span>
                <span className="text-xs text-slate-500 max-w-sm truncate mt-0.5">
                  {data?.activeLocation?.address}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Full Business Address</label>
                  <Input value={data?.activeLocation?.address || ''} readOnly className="bg-slate-50 text-xs mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Primary Category</label>
                    <Input value={data?.activeLocation?.category || data?.industry || ''} readOnly className="bg-slate-50 text-xs mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Pincode</label>
                    <Input value={data?.activeLocation?.address?.match(/\b\d{6}\b/)?.[0] || '400703'} readOnly className="bg-slate-50 text-xs mt-1" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => saveStepProgress(3)}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Location & Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 3 · ABOUT (Screenshot 3)
           ══════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-6">
              {/* Sub tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setAboutTab('offerings')}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                    aboutTab === 'offerings'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Offerings
                </button>
                <button
                  type="button"
                  onClick={() => setAboutTab('about')}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                    aboutTab === 'about'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  About Business
                </button>
              </div>

              {aboutTab === 'offerings' ? (
                <div className="space-y-5">
                  {/* Brochure upload tile (Screenshot 3) */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900">Upload PDF/Brochure (Optional)</div>
                      <div className="text-[11px] text-slate-500">
                        Our AI will extract all the services & products you offer.
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOfferings((prev) => [
                          ...prev,
                          'Specialty Cappuccino',
                          'Fresh Sandwiches',
                          'Cold Brew Coffee',
                        ]);
                        toast.success('Extracted 3 offerings from brochure');
                      }}
                      className="border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                    </Button>
                  </div>

                  {/* Add Offerings Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-900">Add Offerings</label>
                    <div className="flex gap-2">
                      <Input
                        value={newOfferingInput}
                        onChange={(e) => setNewOfferingInput(e.target.value)}
                        placeholder="e.g. Cold Coffee, Sandwich, Hair Spa"
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const val = newOfferingInput.trim();
                          if (val && !offerings.includes(val)) {
                            setOfferings([...offerings, val]);
                            setNewOfferingInput('');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        + Add
                      </Button>
                    </div>
                  </div>

                  {/* Active chips */}
                  {offerings.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-600">
                        Offerings ({offerings.length} Added)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {offerings.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => setOfferings(offerings.filter((x) => x !== item))}
                              className="text-emerald-600 hover:text-emerald-900"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600">
                      <Sparkles className="w-3.5 h-3.5" /> AI Suggested
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiOfferings.map((item) => {
                        const added = offerings.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              if (!added) setOfferings([...offerings, item]);
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-colors ${
                              added
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                            }`}
                          >
                            {item}
                            {added ? <Check className="w-3 h-3 text-slate-400" /> : <Plus className="w-3 h-3 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* About Business Sub-tab */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-900">Business Description</label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Used by our AI Growth Employee to personalize reviews and generate weekly local posts.
                    </p>
                  </div>
                  <Textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    rows={5}
                    className="text-xs leading-relaxed"
                    placeholder="Describe what makes your business unique..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const bName = data?.businessName || 'Our business';
                      const off = offerings.slice(0, 3).join(', ') || 'quality services';
                      setAboutText(
                        `${bName} offers ${off} with a strong commitment to local customer satisfaction, verified service excellence, and dependable results.`
                      );
                      toast.success('Description generated with AI');
                    }}
                    className="text-xs text-purple-600 font-bold hover:bg-purple-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Auto-Generate with AI
                  </Button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => saveStepProgress(4)}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Info & Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 4 · GBP INFO (Screenshot 4 · Keywords)
           ══════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-6">
              {/* Sub tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setGbpTab('keywords')}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                    gbpTab === 'keywords'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Keywords
                </button>
                <button
                  type="button"
                  onClick={() => setGbpTab('hours')}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                    gbpTab === 'hours'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Hours
                </button>
                <button
                  type="button"
                  onClick={() => setGbpTab('attributes')}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                    gbpTab === 'attributes'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Attributes
                </button>
              </div>

              {gbpTab === 'keywords' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Add Keywords</span>
                    <span className="text-xs font-bold text-blue-600">
                      {keywords.length} of 10 Added
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Select the most appropriate keywords for your business. Keywords help your profile rank higher in local search.
                  </p>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-600">Not happy with AI's keyword suggestions?</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Suggest Your Own
                    </button>
                  </div>

                  {showCustomInput && (
                    <div className="flex gap-2">
                      <Input
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        placeholder="Enter custom local keyword"
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const kw = customKeyword.trim();
                          if (kw && !keywords.includes(kw) && keywords.length < 10) {
                            setKeywords([...keywords, kw]);
                            setCustomKeyword('');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        Add
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600">
                      <Sparkles className="w-3.5 h-3.5" /> AI Suggested
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiKeywords.map((kw) => {
                        const isSelected = keywords.includes(kw);
                        return (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setKeywords(keywords.filter((k) => k !== kw));
                              } else if (keywords.length < 10) {
                                setKeywords([...keywords, kw]);
                              } else {
                                toast.error('You can select up to 10 keywords');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {kw}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : gbpTab === 'hours' ? (
                /* Hours */
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900">Operating Schedule</h3>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                      <span className="font-semibold text-slate-700 w-24">{day}</span>
                      <span className="text-slate-500 font-mono">09:00 AM - 08:00 PM</span>
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold">
                        Open
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                /* Attributes */
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900">Popular Amenities & Highlights</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Wheelchair accessible',
                      'Free Wi-Fi',
                      'Credit Cards Accepted',
                      'Air Conditioned',
                      'Dine-in',
                      'Takeaway',
                      'Home Delivery',
                    ].map((attr) => (
                      <Badge key={attr} variant="secondary" className="px-3 py-1 text-xs">
                        ✓ {attr}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => saveStepProgress(5)}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save keywords & Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 5 · OTHERS & OPTIMIZATION (Screenshot 5)
           ══════════════════════════════════════════════════════════ */}
        {step === 5 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Activate Your AI Growth Employee</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select the autonomous marketing automations you want BGOS to run.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="text-xs font-bold text-slate-900">Auto-Reply to Google Reviews</div>
                    <div className="text-[11px] text-slate-500">
                      AI drafts polite, keyword-rich replies within 5 minutes of each new review.
                    </div>
                  </div>
                  <Switch checked={autoReplyReviews} onCheckedChange={setAutoReplyReviews} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="text-xs font-bold text-slate-900">Auto-Generate Weekly Google Posts</div>
                    <div className="text-[11px] text-slate-500">
                      1–2 ranking posts published weekly targeting your selected keywords.
                    </div>
                  </div>
                  <Switch checked={autoGeneratePosts} onCheckedChange={setAutoGeneratePosts} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="text-xs font-bold text-slate-900">Photo Drip-Publishing Schedule</div>
                    <div className="text-[11px] text-slate-500">
                      Maintains continuous fresh activity to rank your listing in Google 3-Pack.
                    </div>
                  </div>
                  <Switch checked={autoPublishPhotos} onCheckedChange={setAutoPublishPhotos} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <Rocket className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">Setup 100% Complete!</div>
                  <div className="text-[11px] text-emerald-700">
                    Launching will activate the profile optimization timeline immediately.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(4)} className="font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => saveStepProgress(5, true)}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-sm"
                >
                  <Rocket className="w-4 h-4 mr-2" /> Launch AI Employee & Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Multi-Location Selection Modal */}
      {locationPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Select Business Location</h3>
              <button
                type="button"
                onClick={() => setLocationPickerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Your Google account manages multiple locations. Pick the one for this workspace:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data?.discoveredLocations.map((loc) => {
                const isSelected = loc.id === data.activeLocation?.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocation(loc.id)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{loc.name}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-xs">{loc.address}</div>
                      {loc.category && (
                        <div className="text-emerald-700 font-semibold text-[10px] mt-0.5">
                          {loc.category}
                        </div>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
