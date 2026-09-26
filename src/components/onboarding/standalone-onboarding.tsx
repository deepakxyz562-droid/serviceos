'use client';

/**
 * StandaloneOnboarding
 * =====================
 * A focused 2-step onboarding wizard for "standalone AI Forms & Chatbot" users
 * (signupMode = 'standalone', plan = 'standalone_starter'). Collects the
 * minimum information needed to activate the product:
 *
 *   Step 1 — Website Details
 *     - Business name (prefilled from registration)
 *     - Website URL (required — powers the AI Website Employee crawler)
 *     - Use-case picker (chatbot / forms / both)
 *
 *   Step 2 — Choose Your Plan
 *     - standalone_starter ($7/mo) vs standalone_business ($19/mo)
 *     - Both start as 14-day free trials (no card required)
 *     - "Start free trial" finalises the plan choice + marks onboarding done
 *
 * On complete, PATCHes the tenant via /api/tenants/[id] with:
 *   website, useCase, plan (if changed to business), onboardingCompleted=true
 * then calls onComplete() which lands the user in the formBuilder view.
 *
 * Deep-link note: Users arriving via ?plan=standalone_starter or
 * ?plan=standalone_business also land here (register/route.ts sets
 * onboardingCompleted=false for all standalone signups so this wizard runs).
 */

import { useState } from 'react';
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
// Types & constants
// ---------------------------------------------------------------------------

type UseCase = 'chatbot' | 'forms' | 'both';

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
  /** Called once onboardingCompleted = true and tenant is updated. */
  onComplete: () => void;
}

const USE_CASE_OPTIONS: { id: UseCase; label: string; description: string; icon: typeof Bot }[] = [
  {
    id: 'chatbot',
    label: 'AI Chatbot',
    description: 'Answer visitor questions 24/7 and capture leads automatically.',
    icon: Bot,
  },
  {
    id: 'forms',
    label: 'Smart Forms',
    description: 'Build beautiful AI-powered lead capture and booking forms.',
    icon: FileText,
  },
  {
    id: 'both',
    label: 'Both',
    description: 'Full AI website employee: chatbot + smart forms working together.',
    icon: Sparkles,
  },
];

const PLANS = [
  {
    id: 'standalone_starter',
    name: 'Starter',
    monthlyPrice: 7,
    icon: Zap,
    color: 'violet',
    features: [
      '1 AI Website Employee (chatbot)',
      '5 Smart Forms',
      'Lead capture & notifications',
      'Embed on any website',
      'Email support',
    ],
  },
  {
    id: 'standalone_business',
    name: 'Business',
    monthlyPrice: 19,
    icon: Crown,
    color: 'violet',
    popular: true,
    features: [
      '3 AI Website Employees',
      'Unlimited Smart Forms',
      'WhatsApp & email notifications',
      'WordPress & Shopify plugins',
      'Advanced analytics',
      'Priority support',
    ],
  },
] as const;

const STEPS = [
  { id: 1, label: 'Website Details' },
  { id: 2, label: 'Choose Your Plan' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StandaloneOnboarding({
  tenant,
  user,
  onComplete,
}: StandaloneOnboardingProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);

  // Step 1 state
  const [businessName, setBusinessName] = useState(tenant?.name || '');
  const [website, setWebsite] = useState(tenant?.website || '');
  const [useCase, setUseCase] = useState<UseCase>('both');
  const [websiteError, setWebsiteError] = useState('');

  // Step 2 state — default to whatever plan was set at registration
  const [selectedPlan, setSelectedPlan] = useState<'standalone_starter' | 'standalone_business'>(
    tenant?.plan === 'standalone_business' ? 'standalone_business' : 'standalone_starter'
  );

  const firstName = user?.name?.split(' ')[0] || 'there';

  // ── URL validation ───────────────────────────────────────────────────────
  function validateWebsite(url: string): string {
    if (!url.trim()) return 'Website URL is required';
    try {
      // Allow URLs without protocol — normalise them first.
      const normalised = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(normalised);
      if (!parsed.hostname.includes('.')) return 'Please enter a valid domain (e.g. mysite.com)';
      return '';
    } catch {
      return 'Please enter a valid URL (e.g. https://mysite.com)';
    }
  }

  // Normalise website URL before saving (ensure https:// prefix).
  function normaliseUrl(url: string): string {
    if (!url.trim()) return '';
    return url.startsWith('http') ? url.trim() : `https://${url.trim()}`;
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  function handleNextStep() {
    const err = validateWebsite(website);
    if (err) {
      setWebsiteError(err);
      return;
    }
    setWebsiteError('');
    setStep(2);
  }

  // ── Final submit (Step 2) ─────────────────────────────────────────────────
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
          onboardingStep: 2,
          // Store the use-case choice in settingsJson so the formBuilder and
          // AI Employee setup can pre-configure themselves accordingly.
          settingsJson: {
            standaloneUseCase: useCase,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save. Please try again.');
        setSaving(false);
        return;
      }

      // Update auth store with the latest tenant data so the dashboard and
      // billing views reflect the chosen plan immediately.
      if (data.tenant || data) {
        const updatedTenant = { ...(tenant as any), ...(data.tenant || data) };
        const authStore = useAppStore.getState();
        authStore.setAuth({
          isAuthenticated: true,
          user: user as any,
          tenant: updatedTenant as any,
        });
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('fieseros_auth');
            const parsed = stored ? JSON.parse(stored) : {};
            localStorage.setItem('fieseros_auth', JSON.stringify({
              ...parsed,
              tenant: updatedTenant,
            }));
          } catch {
            // localStorage unavailable — not critical
          }
        }
      }

      toast.success('You\'re all set! Let\'s build your first form 🎉');
      // Small delay so the toast is visible before the app view switches.
      setTimeout(() => {
        onComplete();
      }, 700);
    } catch {
      toast.error('Network error. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-violet-600 text-white mb-3 shadow-lg shadow-violet-600/20">
            <Bot className="size-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {step === 1 ? `Let's set up your AI Forms & Chatbot, ${firstName}` : 'Choose your plan'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
            {step === 1
              ? 'Tell us about your website so we can configure your AI employee.'
              : 'Start your 14-day free trial — no credit card required.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={cn(
                'flex items-center justify-center size-7 rounded-full text-xs font-semibold transition-colors',
                step === s.id
                  ? 'bg-violet-600 text-white'
                  : step > s.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground',
              )}>
                {step > s.id ? <Check className="size-3.5" /> : s.id}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                step === s.id ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'w-8 h-px',
                  step > s.id ? 'bg-emerald-500' : 'bg-border',
                )} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Website Details ── */}
        {step === 1 && (
          <Card className="shadow-md border-violet-100 dark:border-violet-900">
            <CardContent className="p-5 sm:p-6 space-y-5">

              {/* Business name */}
              <div className="space-y-1.5">
                <Label htmlFor="so-name">
                  Business name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="so-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Plumbing Services"
                  required
                />
              </div>

              {/* Website URL */}
              <div className="space-y-1.5">
                <Label htmlFor="so-website" className="flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  Website URL <span className="text-destructive">*</span>
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
                  placeholder="https://mywebsite.com"
                  className={websiteError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  required
                />
                {websiteError ? (
                  <p className="text-xs text-destructive">{websiteError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    We use this to configure your AI employee for your domain.
                  </p>
                )}
              </div>

              {/* Use case */}
              <div className="space-y-2">
                <Label>What would you like to add to your website?</Label>
                <div className="grid gap-2">
                  {USE_CASE_OPTIONS.map((uc) => {
                    const Icon = uc.icon;
                    return (
                      <button
                        key={uc.id}
                        type="button"
                        onClick={() => setUseCase(uc.id)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all',
                          useCase === uc.id
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                            : 'border-border hover:border-violet-300 dark:hover:border-violet-700',
                        )}
                      >
                        <div className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                          useCase === uc.id
                            ? 'bg-violet-600 text-white'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{uc.label}</p>
                          <p className="text-xs text-muted-foreground">{uc.description}</p>
                        </div>
                        {useCase === uc.id && (
                          <Check className="ml-auto mt-1 size-4 shrink-0 text-violet-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Plan Selection ── */}
        {step === 2 && (
          <div className="space-y-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'relative w-full rounded-xl border-2 p-5 text-left transition-all',
                    isSelected
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-md'
                      : 'border-border hover:border-violet-300 dark:hover:border-violet-700 bg-card',
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
                    )}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="text-xl font-bold">${plan.monthlyPrice}</span>
                        <span className="text-sm text-muted-foreground">/mo after trial</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <Check className={cn(
                              'size-3.5 shrink-0 mt-0.5',
                              isSelected ? 'text-violet-600' : 'text-muted-foreground',
                            )} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            <p className="text-center text-xs text-muted-foreground pt-1">
              <ShieldCheck className="inline size-3.5 text-violet-600 mr-1" />
              14-day free trial on all plans · No credit card required · Cancel anytime
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className={cn(
          'mt-5 flex gap-3',
          step === 1 ? 'justify-end' : 'justify-between',
        )}>
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={saving}
            >
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          )}

          {step === 1 ? (
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={handleNextStep}
              disabled={!businessName.trim() || !website.trim()}
            >
              Next: Choose plan <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-violet-600 hover:bg-violet-700 flex-1 sm:flex-none"
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Setting up…</>
              ) : (
                <>Start free trial <ArrowRight className="size-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StandaloneOnboarding;
