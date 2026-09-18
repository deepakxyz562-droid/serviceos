'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Flame,
  Zap,
  Hammer,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  MapPin,
  Lock,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  Check,
  ChevronRight,
  Loader2,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TriageResult {
  category: string;
  categoryLabel: string;
  urgency: 'emergency' | 'same_day' | 'this_week' | 'flexible';
  isEmergency: boolean;
  confidence: string;
  typicalCostRange: { min: number; max: number };
  commonIssues: Array<{
    title: string;
    description: string;
    likelihood: 'High' | 'Medium' | 'Low';
    estimatedRange: string;
  }>;
  diagnosticQuestions: string[];
  summary: string;
}

const CATEGORIES = [
  { id: 'hvac', label: 'Heating & AC', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'plumbing', label: 'Plumbing', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'roofing', label: 'Roofing & Gutters', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'handyman', label: 'Handyman & Repairs', icon: Hammer, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

export function RequestWizard({ initialCategory }: { initialCategory?: string }) {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTriaging, setIsTriaging] = useState(false);

  // Form Data
  const [category, setCategory] = useState(initialCategory || 'hvac');
  const [problemDescription, setProblemDescription] = useState('');
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [urgency, setUrgency] = useState<'emergency' | 'same_day' | 'this_week' | 'flexible'>('same_day');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>('morning');
  const [preferredDate, setPreferredDate] = useState('');
  const [budgetMin, setBudgetMin] = useState<number | ''>('');
  const [budgetMax, setBudgetMax] = useState<number | ''>('');

  // Contact & Location
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [unit, setUnit] = useState('');
  const [city, setCity] = useState('Chicago');
  const [state, setState] = useState('IL');
  const [postalCode, setPostalCode] = useState('60601');

  // Trigger AI Triage when user finishes typing problem description
  useEffect(() => {
    if (problemDescription.trim().length >= 10) {
      const timer = setTimeout(async () => {
        setIsTriaging(true);
        try {
          const res = await fetch('/api/marketplace/ai-triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemDescription, category }),
          });
          const data = await res.json();
          if (data.success && data.triage) {
            setTriageResult(data.triage);
            if (!category || category === 'hvac') {
              setCategory(data.triage.category);
            }
            if (data.triage.urgency && urgency === 'same_day') {
              setUrgency(data.triage.urgency);
            }
            if (!title) {
              setTitle(problemDescription.slice(0, 60));
            }
            if (budgetMin === '' && budgetMax === '') {
              setBudgetMin(data.triage.typicalCostRange.min);
              setBudgetMax(data.triage.typicalCostRange.max);
            }
          }
        } catch (err) {
          console.error('Triage error:', err);
        } finally {
          setIsTriaging(false);
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [problemDescription, category]);

  const handleNextStep = () => {
    if (step < 4) setStep((s) => (s + 1) as any);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => (s - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !streetAddress || !city || !state) {
      alert('Please fill in your contact and location details to receive matched quotes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `${category.toUpperCase()} Service Request`,
          description: problemDescription,
          categorySlug: category,
          serviceType: triageResult?.categoryLabel || 'General Service',
          customerName,
          customerPhone,
          customerEmail,
          streetAddress,
          unit,
          city,
          state,
          postalCode,
          urgency,
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          preferredDate: preferredDate || new Date().toISOString().split('T')[0],
          preferredTimeSlot,
        }),
      });

      const data = await res.json();
      if (data.success && data.request) {
        router.push(`/request/track/${data.request.publicSlug || 'req-sample'}`);
      } else {
        alert(data.error || 'Failed to submit request');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Step Header & Progress */}
      <div className="mb-8 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <Badge variant="outline" className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              ⚡ Free Customer Service Request
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Get Matched with Top Verified Pros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare upfront pricing, reviews, and availability in minutes. Zero spam.
            </p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Step {step} of 4
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2 bg-slate-100 dark:bg-slate-800" />
      </div>

      <Card className="border-slate-200/80 shadow-md">
        <CardContent className="p-6">
          {/* STEP 1: Category & Problem with AI Triage */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  1. Select your service category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-card'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${cat.bg}`}>
                          <Icon className={`size-5 ${cat.color}`} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-foreground">
                    2. Describe the issue or service needed
                  </label>
                  {isTriaging && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 animate-pulse">
                      <Sparkles className="size-3.5" /> AI Diagnosing...
                    </span>
                  )}
                </div>
                <Textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="e.g. My central AC unit is humming loudly and blowing warm air since yesterday afternoon..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  💡 Tip: The more details you provide, the more accurate the initial quotes will be.
                </p>
              </div>

              {/* AI Triage Diagnosis Card */}
              {triageResult && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                        <Sparkles className="size-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        AI Smart Triage Analysis
                      </span>
                    </div>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[11px]">
                      Est. Range: ${triageResult.typicalCostRange.min} – ${triageResult.typicalCostRange.max}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {triageResult.summary}
                  </p>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                      Common Suspected Issues:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {triageResult.commonIssues.map((issue, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 text-xs">
                          <div className="flex items-center justify-between font-medium text-foreground">
                            <span>{issue.title}</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">{issue.estimatedRange}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNextStep}
                  disabled={!problemDescription.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                >
                  Continue to Details <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Job Details & Photos */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Request Headline / Short Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Central AC humming & blowing warm air"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Property Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPropertyType('residential')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium text-sm transition-all ${
                      propertyType === 'residential'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 dark:text-emerald-100 font-semibold'
                        : 'border-slate-200 text-muted-foreground hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="size-4 text-emerald-600" /> Residential Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropertyType('commercial')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium text-sm transition-all ${
                      propertyType === 'commercial'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 dark:text-emerald-100 font-semibold'
                        : 'border-slate-200 text-muted-foreground hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="size-4 text-emerald-600" /> Commercial Building
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Attach Photos or Videos (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer">
                  <Camera className="size-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs font-semibold text-foreground">Click to upload photos of the unit, leak, or electrical panel</p>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG, MP4 up to 25MB. Visuals speed up proposals by 3x.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button onClick={handleNextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6">
                  Next: Urgency & Budget <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Urgency, Timing & Budget */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  How urgently do you need this completed?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'emergency', label: '🚨 Emergency', sub: 'Need arrival within 2–4 hours' },
                    { id: 'same_day', label: '⚡ Same Day', sub: 'Need service today' },
                    { id: 'this_week', label: '📅 This Week', sub: 'Flexible within next 2–5 days' },
                    { id: 'flexible', label: '🕒 Flexible Timing', sub: 'Planning ahead / comparing quotes' },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUrgency(u.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        urgency === u.id
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{u.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Preferred Time of Day
                  </label>
                  <select
                    value={preferredTimeSlot}
                    onChange={(e) => setPreferredTimeSlot(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="morning">Morning (8:00 AM – 12:00 PM)</option>
                    <option value="afternoon">Afternoon (12:00 PM – 4:00 PM)</option>
                    <option value="evening">Evening (4:00 PM – 8:00 PM)</option>
                    <option value="flexible">Any time / Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Preferred Date
                  </label>
                  <Input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Expected Budget Range (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Min (e.g. 200)"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : '')}
                      className="pl-7"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Max (e.g. 600)"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : '')}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button onClick={handleNextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6">
                  Next: Contact & Location <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Contact & Location with Privacy Guarantee */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Privacy Guarantee Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-start gap-3 shadow-sm">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <Lock className="size-4" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-emerald-400">100% Privacy Protected</p>
                  <p className="text-slate-300 mt-0.5">
                    Pros will only see your general city and approx distance. Your street address and phone number are
                    strictly confidential until you accept a quote.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Jane Doe"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      required
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(312) 555-0199"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address (for proposal notifications)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Street Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="123 Michigan Ave"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Apt / Suite
                  </label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">City *</label>
                  <Input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chicago" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">State *</label>
                  <Input required value={state} onChange={(e) => setState(e.target.value)} placeholder="IL" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ZIP Code *</label>
                  <Input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="60601" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 font-semibold shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Request & Find Pros <CheckCircle2 className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
