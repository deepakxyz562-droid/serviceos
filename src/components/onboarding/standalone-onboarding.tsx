'use client';

/**
 * StandaloneOnboarding
 * =====================
 * Chatley.ai & Enterprise Benchmark 6-Step Onboarding Flow for Standalone AI Agents & Forms.
 *
 * Steps:
 *   Step 1 — Role Selection (Owner, Operations, Sales, Practice Manager, Agency, Support, Tech)
 *   Step 2 — Primary Goal (Book Appointments, 24/7 Answering, Qualify Leads, Customer Service, Sales Recovery)
 *   Step 3 — Industry Category (Home Services, Healthcare, Legal, Automotive, Real Estate, E-Commerce, etc.)
 *   Step 4 — Weekly Volume (<50, 50-200, 200-500, 500-1000, 1000+)
 *   Step 5 — Launch Timeline (Today, This Week, This Month, Exploring)
 *   Step 6 — Website Crawl & Instant AI Employee Generation
 */

import React, { useState } from 'react';
import {
  Bot,
  Globe,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  ShieldCheck,
  Calendar,
  PhoneCall,
  UserCheck,
  Headphones,
  TrendingUp,
  Briefcase,
  Building,
  HeartPulse,
  Scale,
  Car,
  ShoppingBag,
  Clock,
  Rocket,
  Flame,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

// ---------------------------------------------------------------------------
// Onboarding Step Definitions & Options
// ---------------------------------------------------------------------------

const ROLES = [
  { id: 'owner', label: 'Business Owner / Founder', desc: 'Managing whole business operations', icon: Briefcase },
  { id: 'operations', label: 'Operations / General Manager', desc: 'Streamlining intake & staffing', icon: Building },
  { id: 'sales', label: 'Sales Director / Lead', desc: 'Maximizing qualified pipeline & bookings', icon: TrendingUp },
  { id: 'practice', label: 'Practice / Clinic Manager', desc: 'Managing appointments & patient intake', icon: HeartPulse },
  { id: 'agency', label: 'Agency / MSP / Partner', desc: 'Deploying AI for clients', icon: Zap },
  { id: 'support', label: 'Customer Support Lead', desc: 'Automating FAQs & 24/7 coverage', icon: Headphones },
];

const GOALS = [
  { id: 'appointment_setting', label: 'Smart Appointment Scheduling', desc: 'Automate calendar booking, time slots & reminders', icon: Calendar },
  { id: 'answering_service', label: '24/7 After-Hours Answering', desc: 'Never miss an emergency call or night inquiry', icon: PhoneCall },
  { id: 'lead_qualification', label: 'Lead Qualification & Intake', desc: 'Score urgent leads (Hot/Warm/Cold) & capture details', icon: UserCheck },
  { id: 'customer_service', label: 'Customer Service & Concierge', desc: 'Instant company answers, FAQs & live escalation', icon: Headphones },
  { id: 'sales_outreach', label: 'Sales Outreach & Cart/Form Recovery', desc: 'Re-engage dropped off visitors via SMS & email', icon: Rocket },
];

const INDUSTRIES = [
  { id: 'home_services', label: 'Home Services (Plumbing, HVAC, Roofing)', icon: Wrench },
  { id: 'healthcare', label: 'Healthcare & Medical / Dental', icon: HeartPulse },
  { id: 'legal_finance', label: 'Legal, Accounting & Finance', icon: Scale },
  { id: 'real_estate', label: 'Real Estate & Property Management', icon: Building },
  { id: 'automotive', label: 'Automotive & Dealerships', icon: Car },
  { id: 'retail_ecommerce', label: 'Retail & E-Commerce', icon: ShoppingBag },
  { id: 'other', label: 'Professional Services / Other', icon: Briefcase },
];

const VOLUMES = [
  { id: 'under_50', label: 'Under 50 inquiries / week', desc: 'Growing small business' },
  { id: '50_200', label: '50 – 200 inquiries / week', desc: 'Active local business' },
  { id: '200_500', label: '200 – 500 inquiries / week', desc: 'Established multi-location brand' },
  { id: '500_1000', label: '500 – 1,000 inquiries / week', desc: 'High-volume operations' },
  { id: '1000_plus', label: '1,000+ inquiries / week', desc: 'Enterprise & multi-brand' },
];

const TIMELINES = [
  { id: 'today', label: 'Immediately (Today)', icon: Flame },
  { id: 'this_week', label: 'This Week', icon: Clock },
  { id: 'this_month', label: 'Within 30 Days', icon: Calendar },
  { id: 'exploring', label: 'Just Exploring Options', icon: Sparkles },
];

const PLANS = [
  {
    id: 'standalone_free',
    name: 'Free Forever',
    monthlyPrice: 0,
    priceLabel: 'Free',
    priceSubtext: 'forever',
    icon: Sparkles,
    features: [
      '1 AI Website Employee (chatbot)',
      '3 Smart Forms & Appointment Booking',
      '100 monthly submissions (0% fee)',
      'Lead capture & email alerts',
      'Embed widget on any website',
    ],
  },
  {
    id: 'standalone_starter',
    name: 'Starter',
    monthlyPrice: 7,
    priceLabel: '$7',
    priceSubtext: '/mo after 14-day trial',
    icon: Zap,
    popular: true,
    features: [
      '1 AI Website Employee (chatbot)',
      '10 Smart Forms & Dynamic Scheduling',
      '1,000 monthly submissions',
      'Instant SMS & email lead notifications',
      'Custom website & sitemap crawling',
      'Knowledge grounding & zero-hallucination guard',
    ],
  },
  {
    id: 'standalone_business',
    name: 'Business',
    monthlyPrice: 19,
    priceLabel: '$19',
    priceSubtext: '/mo after 14-day trial',
    icon: Crown,
    features: [
      '3 AI Website Employees',
      'Unlimited Smart Forms',
      '10,000 monthly submissions',
      'WhatsApp, SMS & voice routing',
      'Abandoned lead re-engagement recovery',
      'Priority AI model & SLA support',
    ],
  },
] as const;

type StandalonePlanId = (typeof PLANS)[number]['id'];

const TOTAL_STEPS = 6;

interface StandaloneOnboardingProps {
  tenant: {
    id: string;
    name?: string;
    website?: string | null;
    plan?: string | null;
  } | null;
  user: {
    name?: string;
    email?: string;
  } | null;
  onComplete: () => void;
}

export function StandaloneOnboarding({
  tenant,
  user,
  onComplete,
}: StandaloneOnboardingProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Selections
  const [role, setRole] = useState('owner');
  const [goal, setGoal] = useState('appointment_setting');
  const [industry, setIndustry] = useState('home_services');
  const [volume, setVolume] = useState('50_200');
  const [timeline, setTimeline] = useState('today');

  // Step 6 Details
  const [businessName, setBusinessName] = useState(tenant?.name || '');
  const [website, setWebsite] = useState(tenant?.website || '');
  const [websiteError, setWebsiteError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<StandalonePlanId>(
    tenant?.plan === 'standalone_business'
      ? 'standalone_business'
      : (tenant?.plan === 'standalone_starter' ? 'standalone_starter' : 'standalone_starter')
  );

  const firstName = user?.name?.split(' ')[0] || 'there';

  function validateWebsite(url: string): string {
    if (!url.trim()) return 'Website URL is required for AI training';
    try {
      const normalised = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(normalised);
      if (!parsed.hostname.includes('.')) return 'Please enter a valid domain (e.g. yourbusiness.com)';
      return '';
    } catch {
      return 'Please enter a valid URL (e.g. https://yourbusiness.com)';
    }
  }

  function normaliseUrl(url: string): string {
    if (!url.trim()) return '';
    return url.startsWith('http') ? url.trim() : `https://${url.trim()}`;
  }

  const handleNext = () => {
    if (step === 6) {
      const err = validateWebsite(website);
      if (err) {
        setWebsiteError(err);
        return;
      }
      setWebsiteError('');
      handleComplete();
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  async function handleComplete() {
    if (!tenant?.id) {
      toast.error('No tenant found. Please refresh and try again.');
      return;
    }
    setSaving(true);
    const normalisedUrl = normaliseUrl(website);

    try {
      const res = await authFetch(`/api/tenants/${tenant.id}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName.trim() || undefined,
          website: normalisedUrl || undefined,
          plan: selectedPlan,
          onboardingCompleted: true,
          onboardingStep: TOTAL_STEPS,
          settingsJson: {
            role,
            primaryGoal: goal,
            industry,
            weeklyVolume: volume,
            launchTimeline: timeline,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings.');
        setSaving(false);
        return;
      }

      // Update store
      const authStore = useAppStore.getState();
      if (data.tenant || data) {
        const updatedTenant = { ...(tenant as any), ...(data.tenant || data) };
        authStore.setAuth({
          isAuthenticated: true,
          user: user as any,
          tenant: updatedTenant as any,
        });
      }

      toast.success('Your AI Employee workspace is ready! Launching your AI Studio… 🎉');

      // Auto trigger agent setup wizard with selected goal and industry
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('open_agent_setup_wizard', 'true');
        sessionStorage.setItem('onboarding_goal', goal);
        sessionStorage.setItem('onboarding_industry', industry);
        sessionStorage.setItem('onboarding_website', normalisedUrl);
      }

      setTimeout(() => {
        authStore.setCurrentView('agentStudio');
        onComplete();
      }, 700);
    } catch {
      toast.error('Network error. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-auto bg-card rounded-2xl border border-border shadow-2xl p-6 sm:p-8">

        {/* Progress Bar & Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <Bot className="size-4" /> Step {step} of {TOTAL_STEPS}
            </span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}% Completed</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          <div className="pt-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {step === 1 && `Welcome, ${firstName}! What is your role?`}
              {step === 2 && 'What is your primary automation goal?'}
              {step === 3 && 'Which industry best describes your business?'}
              {step === 4 && 'What is your expected weekly conversation volume?'}
              {step === 5 && 'When do you want your AI Agent live?'}
              {step === 6 && 'Connect your website & launch your AI Agent'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {step === 1 && 'Help us tailor the AI engine and workflows to your exact operational scope.'}
              {step === 2 && 'Choose the core specialty of your first AI Website Employee.'}
              {step === 3 && 'We will pre-train terminology, service catalogs, and intake protocols for your sector.'}
              {step === 4 && 'This allows us to calibrate response speeds and high-concurrency routing.'}
              {step === 5 && 'Select your deployment timeline.'}
              {step === 6 && 'We will crawl your pages, extract verified facts, and generate your ready-to-use agent.'}
            </p>
          </div>
        </div>

        {/* ── STEP 1: ROLE ── */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-foreground'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0 mt-0.5',
                    isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight">{r.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                  {isSelected && <Check className="size-4 text-violet-600 shrink-0 ml-auto" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 2: PRIMARY GOAL ── */}
        {step === 2 && (
          <div className="space-y-2.5">
            {GOALS.map((g) => {
              const Icon = g.icon;
              const isSelected = goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-foreground'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                  )}
                >
                  <div className={cn(
                    'p-2.5 rounded-lg shrink-0',
                    isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold">{g.label}</p>
                    <p className="text-[11px] text-muted-foreground">{g.desc}</p>
                  </div>
                  {isSelected && <Check className="size-4 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 3: INDUSTRY ── */}
        {step === 3 && (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {INDUSTRIES.map((ind) => {
              const Icon = ind.icon;
              const isSelected = industry === ind.id;
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setIndustry(ind.id)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-foreground'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-xs font-bold leading-tight flex-1">{ind.label}</p>
                  {isSelected && <Check className="size-4 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 4: VOLUME ── */}
        {step === 4 && (
          <div className="space-y-2.5">
            {VOLUMES.map((v) => {
              const isSelected = volume === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVolume(v.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-foreground'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                  )}
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold">{v.label}</p>
                    <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                  </div>
                  {isSelected && <Check className="size-4 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 5: TIMELINE ── */}
        {step === 5 && (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {TIMELINES.map((t) => {
              const Icon = t.icon;
              const isSelected = timeline === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeline(t.id)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-foreground'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold flex-1">{t.label}</p>
                  {isSelected && <Check className="size-4 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 6: WEBSITE & GENERATION ── */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="so-name" className="text-xs font-bold">
                Company / Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="so-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Plumbing & Drain Care"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="so-website" className="text-xs font-bold flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                Website URL to Crawl & Train AI <span className="text-destructive">*</span>
              </Label>
              <Input
                id="so-website"
                type="url"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (websiteError) setWebsiteError('');
                }}
                onBlur={() => setWebsiteError(validateWebsite(website))}
                placeholder="https://example.com"
                className={cn('h-9 text-xs', websiteError && 'border-destructive focus-visible:ring-destructive')}
                required
              />
              {websiteError ? (
                <p className="text-[11px] text-destructive">{websiteError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Our deep crawler will index your services, operating hours, emergency policies & service areas.
                </p>
              )}
            </div>

            {/* Plan Picker */}
            <div className="pt-2 space-y-2">
              <Label className="text-xs font-bold">Select Workspace Tier</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map((p) => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all relative flex flex-col items-center justify-center',
                        isSelected
                          ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 shadow-xs'
                          : 'border-border hover:border-violet-300 dark:hover:border-violet-800'
                      )}
                    >
                      {p.popular && (
                        <span className="absolute -top-2 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                          Best Value
                        </span>
                      )}
                      <p className="text-xs font-bold">{p.name}</p>
                      <p className="text-sm font-extrabold text-violet-600 dark:text-violet-400 mt-0.5">{p.priceLabel}</p>
                      <p className="text-[10px] text-muted-foreground">{p.priceSubtext}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-center text-muted-foreground pt-1">
                <ShieldCheck className="inline size-3.5 text-emerald-500 mr-1" />
                14-day free trial on paid plans · No credit card required to start
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={saving}
              className="text-xs"
            >
              <ArrowLeft className="size-3.5 mr-1.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleNext}
            disabled={saving || (step === 6 && (!businessName.trim() || !website.trim()))}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" /> Initializing Agent…
              </>
            ) : step === TOTAL_STEPS ? (
              <>
                Crawl & Launch AI Agent <Rocket className="size-3.5 ml-1.5" />
              </>
            ) : (
              <>
                Continue <ArrowRight className="size-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default StandaloneOnboarding;
