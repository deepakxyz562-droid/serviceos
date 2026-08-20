'use client';

/**
 * AI Receptionist Onboarding Wizard
 * =================================
 *
 * 4-step activation flow:
 *   Step 1 — Subscribe ($29/mo plan selection + Creem checkout)
 *   Step 2 — Configure Receptionist (name, greeting, voice, handoff)
 *   Step 3 — Get Phone Number (search → select → purchase)
 *   Step 4 — Activate (test + go live)
 *
 * The tenant never sees Twilio/Vapi credentials or internal IDs.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Phone,
  Settings,
  Sparkles,
  Rocket,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4;

interface OnboardingState {
  step: Step;
  subscriptionActive: boolean;
  receptionistCreated: boolean;
  phoneNumberId: string | null;
  loading: boolean;
}

export function AiReceptionistOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    subscriptionActive: false,
    receptionistCreated: false,
    phoneNumberId: null,
    loading: false,
  });

  // Check existing state on mount
  const checkState = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      // Check subscription
      const subRes = await fetch('/api/addons/subscriptions');
      if (subRes.ok) {
        const subData = await subRes.json();
        const aiSub = subData.subscriptions?.find(
          (s: { addonProduct: { code: string } }) => s.addonProduct?.code === 'AI_RECEPTIONIST'
        );
        if (aiSub && ['ACTIVE', 'PAST_DUE'].includes(aiSub.status)) {
          setState(s => ({ ...s, subscriptionActive: true, step: s.step < 2 ? 2 : s.step }));
        }
      }

      // Check receptionist
      const recvRes = await fetch('/api/addons/receptionist');
      if (recvRes.ok) {
        const recvData = await recvRes.json();
        if (recvData.receptionist) {
          setState(s => ({ ...s, receptionistCreated: true, step: s.step < 3 ? 3 : s.step }));
        }
      }

      // Check phone numbers
      const phoneRes = await fetch('/api/addons/phones/connections');
      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        if (phoneData.connections?.length > 0) {
          setState(s => ({
            ...s,
            phoneNumberId: phoneData.connections[0].phoneNumberId,
            step: s.step < 4 ? 4 : s.step,
          }));
        }
      }
    } catch {
      // silent
    } finally {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkState();
  }, [checkState]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center size-8 rounded-full text-sm font-medium shrink-0 ${
                state.step >= stepNum
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {state.step > stepNum ? <CheckCircle2 className="size-4" /> : stepNum}
            </div>
            {stepNum < 4 && (
              <div className={`h-0.5 flex-1 mx-2 ${state.step > stepNum ? 'bg-emerald-600' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {state.step === 1 && <Step1Subscribe onComplete={() => setState(s => ({ ...s, step: 2, subscriptionActive: true }))} />}
      {state.step === 2 && <Step2ConfigureReceptionist onComplete={() => setState(s => ({ ...s, step: 3, receptionistCreated: true }))} onBack={() => setState(s => ({ ...s, step: 1 }))} />}
      {state.step === 3 && <Step3GetPhoneNumber onComplete={(phoneId) => setState(s => ({ ...s, step: 4, phoneNumberId: phoneId }))} onBack={() => setState(s => ({ ...s, step: 2 }))} />}
      {state.step === 4 && <Step4Activate phoneNumberId={state.phoneNumberId} onBack={() => setState(s => ({ ...s, step: 3 }))} />}
    </div>
  );
}

// ─── Step 1: Subscribe ─────────────────────────────────────────────────────

function Step1Subscribe({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planCode: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/addons/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonPlanCode: planCode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          // No checkout URL — might be a free/trial plan or already subscribed
          toast.success('AI Receptionist activated!');
          onComplete();
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to start checkout');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-600" />
          AI Receptionist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your 24/7 AI receptionist for calls, chats, and bookings. Never miss a customer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PlanCard
            name="Starter"
            price="$29"
            minutes="50 min"
            features={['1 phone number', '1 concurrent call', '10-min max call', 'Lead capture', 'Appointment booking']}
            onSubscribe={() => handleSubscribe('AI_RECEPTIONIST_STARTER')}
            loading={loading}
          />
          <PlanCard
            name="Pro"
            price="$59"
            minutes="200 min"
            features={['1 phone number', '3 concurrent calls', '10-min max call', 'All Starter features', 'Advanced analytics']}
            onSubscribe={() => handleSubscribe('AI_RECEPTIONIST_PRO')}
            loading={loading}
            highlighted
          />
          <PlanCard
            name="Business"
            price="$129"
            minutes="500 min"
            features={['1 phone number', '10 concurrent calls', '10-min max call', 'All Pro features', 'Priority support']}
            onSubscribe={() => handleSubscribe('AI_RECEPTIONIST_BUSINESS')}
            loading={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  name,
  price,
  minutes,
  features,
  onSubscribe,
  loading,
  highlighted,
}: {
  name: string;
  price: string;
  minutes: string;
  features: string[];
  onSubscribe: () => void;
  loading: boolean;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${highlighted ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-2xl font-bold text-emerald-600">{price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
        <p className="text-xs text-muted-foreground">{minutes} AI minutes</p>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button
        className="w-full"
        size="sm"
        onClick={onSubscribe}
        disabled={loading}
        variant={highlighted ? 'default' : 'outline'}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : `Choose ${name}`}
      </Button>
    </div>
  );
}

// ─── Step 2: Configure Receptionist ────────────────────────────────────────

function Step2ConfigureReceptionist({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('Sarah');
  const [greeting, setGreeting] = useState('');
  const [handoffTarget, setHandoffTarget] = useState('');
  const [personality, setPersonality] = useState('friendly');

  const handleCreate = async () => {
    setLoading(true);
    try {
      // Create receptionist
      const res = await fetch('/api/addons/receptionist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          greeting: greeting || undefined,
          handoffEnabled: !!handoffTarget,
          handoffTransferTarget: handoffTarget || undefined,
          handoffFallbackMode: 'VOICEMAIL',
        }),
      });

      if (res.ok) {
        // Create initial agent version
        const recvData = await res.json();
        const versionRes = await fetch('/api/addons/receptionist/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are ${name}, an AI receptionist for a service business. Be ${personality}, helpful, and concise. Help callers with bookings, questions, and service requests. If you can't help, transfer to a human.`,
            greeting: greeting || `Hi, thanks for calling! How can I help you today?`,
            voice: 'rachel',
            model: 'gpt-4o-mini',
            personality,
            responseStyle: 'concise',
            maxDurationSeconds: 600,
            silenceTimeoutSeconds: 120,
          }),
        });

        if (versionRes.ok) {
          toast.success('AI Receptionist configured!');
          onComplete();
        } else {
          toast.error('Receptionist created but version failed — you can configure later');
          onComplete();
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create receptionist');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="size-5 text-emerald-600" />
          Configure Your Receptionist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Receptionist Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" />
          <p className="text-xs text-muted-foreground">The name callers hear when they call.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="greeting">Greeting (optional)</Label>
          <Textarea
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hi, thanks for calling! How can I help you today?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Personality</Label>
          <Select value={personality} onValueChange={setPersonality}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="handoff">Human Transfer Number (optional)</Label>
          <Input
            id="handoff"
            value={handoffTarget}
            onChange={(e) => setHandoffTarget(e.target.value)}
            placeholder="+1 555-123-4567"
          />
          <p className="text-xs text-muted-foreground">Calls will transfer here when the AI can't help. Leave empty for voicemail fallback.</p>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name}>
            {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Continue <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Get Phone Number ──────────────────────────────────────────────

function Step3GetPhoneNumber({ onComplete, onBack }: { onComplete: (phoneId: string) => void; onBack: () => void }) {
  const [step, setStep] = useState<'search' | 'results' | 'purchasing'>('search');
  const [loading, setLoading] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [numbers, setNumbers] = useState<Array<{ phoneNumber: string; friendlyName: string; locality: string | null; region: string | null }>>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        countryCode: 'US',
        capabilities: 'voice,sms',
      });
      if (areaCode) params.set('areaCode', areaCode);

      const res = await fetch(`/api/addons/phones/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
        setStep('results');
      } else {
        toast.error('Failed to search numbers');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (phoneNumber: string) => {
    setStep('purchasing');
    setSelectedNumber(phoneNumber);
    setLoading(true);

    try {
      // Generate idempotency key
      const idempotencyKey = `buy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch('/api/addons/phones/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          phoneNumber,
          friendlyName: `Fieseros Number`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Phone number ${phoneNumber} purchased!`);
        onComplete(data.phoneNumber.id);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to purchase number');
        setStep('results');
      }
    } catch {
      toast.error('Network error');
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="size-5 text-emerald-600" />
          Get a Phone Number
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'search' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="areaCode">Area Code (optional)</Label>
              <Input
                id="areaCode"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="312"
              />
              <p className="text-xs text-muted-foreground">Leave empty to search nationwide.</p>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
              Search Numbers
            </Button>
          </>
        )}

        {step === 'results' && (
          <>
            <div className="space-y-2">
              {numbers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No numbers found. Try a different area code.</p>
              ) : (
                numbers.map((n) => (
                  <div key={n.phoneNumber} className="flex items-center justify-between p-3 rounded-lg border hover:border-emerald-300 transition-colors">
                    <div>
                      <p className="font-medium">{n.friendlyName}</p>
                      <p className="text-xs text-muted-foreground">{n.locality ? `${n.locality}, ${n.region}` : n.region || 'United States'}</p>
                    </div>
                    <Button size="sm" onClick={() => handlePurchase(n.phoneNumber)}>
                      Select
                    </Button>
                  </div>
                ))
              )}
            </div>
            <Button variant="outline" onClick={() => setStep('search')} className="w-full">
              Search Again
            </Button>
          </>
        )}

        {step === 'purchasing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Purchasing {selectedNumber}...</p>
              <p className="text-xs text-muted-foreground">Provisioning on Twilio + Vapi + Fieseros</p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Activate ──────────────────────────────────────────────────────

function Step4Activate({ phoneNumberId, onBack }: { phoneNumberId: string | null; onBack: () => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-5 text-emerald-600" />
          Your AI Receptionist is Ready!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div className="flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold">All set!</p>
            <p className="text-sm text-muted-foreground">
              Your AI Receptionist is active and ready to receive calls.
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>AI Receptionist configured</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Phone number purchased & connected</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Call routing active (AI + voicemail fallback)</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">What happens next?</p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Incoming calls are answered by your AI Receptionist</li>
            <li>The AI captures leads, books appointments, and answers FAQs</li>
            <li>Calls that need human help transfer to your number</li>
            <li>You can view call history and usage in Settings → AI</li>
          </ul>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>
          <Button onClick={() => window.location.reload()}>
            Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
