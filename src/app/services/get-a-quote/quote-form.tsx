'use client';

/**
 * QuoteForm
 * ---------
 *
 * Multi-step quote-request form for /services/get-a-quote.
 *
 * CONTEXT-AWARE PRESELECTION (per review direction):
 *   The form reads URL params to preselect the service + industry, so CTAs
 *   from different pages can pass context:
 *     /services/get-a-quote?service=website              → "Website Development" preselected
 *     /services/get-a-quote?service=seo                  → "SEO" preselected
 *     /services/get-a-quote?service=google_ads           → "Google Ads" preselected
 *     /services/get-a-quote?service=website&industry=plumbing → both preselected
 *
 * STEPS:
 *   1. Your business (contact info + business name)
 *   2. Project details (service, industry, budget, timeline, current website, requirements)
 *   3. Review + submit
 *
 * On success → redirect to /services/get-a-quote/thank-you?leadId=xxx
 *
 * UTM ATTRIBUTION:
 *   Reads utm_source, utm_medium, utm_campaign from the URL (if present)
 *   and includes them in the submission for lead-source tracking.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Building2, User, Mail, Phone, Globe, DollarSign, Calendar, MessageSquare, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const SERVICES = [
  { value: 'website', label: 'Website Development' },
  { value: 'seo', label: 'SEO & Local Search' },
  { value: 'google_ads', label: 'Google Ads Management' },
];

const INDUSTRIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Cleaning', 'Landscaping', 'Lawn Care',
  'Painting', 'Handyman', 'Tree Care', 'Snow Removal', 'Pest Control',
  'Roofing', 'Pool Service', 'Window Cleaning', 'Concrete', 'Garage Door',
  'Solar', 'Pet Services', 'Other',
];

const BUDGETS = [
  { value: 'under-1000', label: 'Under $1,000' },
  { value: '1000-2500', label: '$1,000 – $2,500' },
  { value: '2500-5000', label: '$2,500 – $5,000' },
  { value: '5000-10000', label: '$5,000 – $10,000' },
  { value: '10000+', label: '$10,000+' },
];

const TIMELINES = [
  { value: 'asap', label: 'ASAP (within 2 weeks)' },
  { value: '1-month', label: 'Within 1 month' },
  { value: '2-3-months', label: 'Within 2–3 months' },
  { value: 'just-exploring', label: 'Just exploring options' },
];

function QuoteFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Preselect service + industry from URL params (context-aware).
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    service: '',
    industry: '',
    budget: '',
    timeline: '',
    currentWebsite: '',
    requirements: '',
  });

  // UTM params (for attribution — sent to the API but not shown in the form).
  const [utm, setUtm] = useState<{ source?: string; medium?: string; campaign?: string }>({});

  useEffect(() => {
    const service = searchParams.get('service') || '';
    const industry = searchParams.get('industry') || '';
    const utmSource = searchParams.get('utm_source') || undefined;
    const utmMedium = searchParams.get('utm_medium') || undefined;
    const utmCampaign = searchParams.get('utm_campaign') || undefined;

    setForm((prev) => ({
      ...prev,
      service: SERVICES.some((s) => s.value === service) ? service : prev.service,
      industry: INDUSTRIES.some((i) => i.toLowerCase() === industry?.replace(/-/g, ' ').toLowerCase())
        ? INDUSTRIES.find((i) => i.toLowerCase() === industry!.replace(/-/g, ' ').toLowerCase())
        : prev.industry,
    }));

    if (utmSource || utmMedium || utmCampaign) {
      setUtm({ source: utmSource, medium: utmMedium, campaign: utmCampaign });
    }
  }, [searchParams]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canProceedToStep2() {
    return form.name.trim() && form.email.trim() && form.phone.trim() && form.businessName.trim();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/services/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, utm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit. Please try again.');
        return;
      }
      // Redirect to thank-you page with the lead ID.
      router.push(`/services/get-a-quote/thank-you?leadId=${data.leadId}`);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step >= s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle2 className="size-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 flex-1 mx-2 transition-colors ${
                  step > s ? 'bg-emerald-600' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-muted-foreground -mt-3">
        <span className={step >= 1 ? 'text-emerald-600 font-medium' : ''}>Your Business</span>
        <span className={step >= 2 ? 'text-emerald-600 font-medium' : ''}>Project Details</span>
        <span className={step >= 3 ? 'text-emerald-600 font-medium' : ''}>Review</span>
      </div>

      {/* Step 1: Your Business */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Tell us about your business</h2>
            <p className="text-sm text-muted-foreground">We'll use this to contact you about your project.</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-1.5 mb-1.5">
                <User className="size-3.5" /> Your Name *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessName" className="flex items-center gap-1.5 mb-1.5">
                <Building2 className="size-3.5" /> Business Name *
              </Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="Smith Plumbing Inc."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-1.5 mb-1.5">
                  <Mail className="size-3.5" /> Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="john@smithplumbing.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1.5 mb-1.5">
                  <Phone className="size-3.5" /> Phone *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Project Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">What do you need?</h2>
            <p className="text-sm text-muted-foreground">Tell us about your project so we can prepare a tailored quote.</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="service" className="flex items-center gap-1.5 mb-1.5">
                <Briefcase className="size-3.5" /> Service *
              </Label>
              <select
                id="service"
                value={form.service}
                onChange={(e) => update('service', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Select a service…</option>
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="industry" className="mb-1.5 block">Your Industry</Label>
              <select
                id="industry"
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select an industry…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget" className="flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="size-3.5" /> Budget Range
                </Label>
                <select
                  id="budget"
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a range…</option>
                  {BUDGETS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="timeline" className="flex items-center gap-1.5 mb-1.5">
                  <Calendar className="size-3.5" /> Timeline
                </Label>
                <select
                  id="timeline"
                  value={form.timeline}
                  onChange={(e) => update('timeline', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a timeline…</option>
                  {TIMELINES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="currentWebsite" className="flex items-center gap-1.5 mb-1.5">
                <Globe className="size-3.5" /> Current Website (if any)
              </Label>
              <Input
                id="currentWebsite"
                type="url"
                value={form.currentWebsite}
                onChange={(e) => update('currentWebsite', e.target.value)}
                placeholder="https://smithplumbing.com"
              />
            </div>

            <div>
              <Label htmlFor="requirements" className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="size-3.5" /> Project Requirements
              </Label>
              <Textarea
                id="requirements"
                value={form.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                placeholder="Tell us about your goals, what you're looking for, any specific features you need…"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!form.service}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              Review <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Review your request</h2>
            <p className="text-sm text-muted-foreground">Make sure everything looks right, then submit.</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium text-foreground">{form.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Business:</span>
                <p className="font-medium text-foreground">{form.businessName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium text-foreground">{form.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium text-foreground">{form.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Service:</span>
                <p className="font-medium text-foreground">
                  {SERVICES.find((s) => s.value === form.service)?.label || form.service}
                </p>
              </div>
              {form.industry && (
                <div>
                  <span className="text-muted-foreground">Industry:</span>
                  <p className="font-medium text-foreground">{form.industry}</p>
                </div>
              )}
              {form.budget && (
                <div>
                  <span className="text-muted-foreground">Budget:</span>
                  <p className="font-medium text-foreground">
                    {BUDGETS.find((b) => b.value === form.budget)?.label || form.budget}
                  </p>
                </div>
              )}
              {form.timeline && (
                <div>
                  <span className="text-muted-foreground">Timeline:</span>
                  <p className="font-medium text-foreground">
                    {TIMELINES.find((t) => t.value === form.timeline)?.label || form.timeline}
                  </p>
                </div>
              )}
            </div>
            {form.currentWebsite && (
              <div>
                <span className="text-muted-foreground">Current website:</span>
                <p className="font-medium text-foreground break-all">{form.currentWebsite}</p>
              </div>
            )}
            {form.requirements && (
              <div>
                <span className="text-muted-foreground">Requirements:</span>
                <p className="font-medium text-foreground whitespace-pre-wrap">{form.requirements}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> Submitting…</>
              ) : (
                <>Submit Request <ArrowRight className="size-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams (Next.js 14+ requirement).
export function QuoteForm() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <QuoteFormInner />
    </Suspense>
  );
}
