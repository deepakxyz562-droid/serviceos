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
  RefreshCw,
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

// ─── Step 4: Review & Activate ──────────────────────────────────────────────
//
// Phase 9.8: The user explicitly clicks "Deploy & Activate" — deployment does
// NOT happen automatically. This gives a safer state machine:
//
//   Review checklist → Click Deploy & Activate →
//   Validate (backend enforces subscription + entitlement + receptionist + phone) →
//   Create/update Vapi assistant + 13 tools →
//   Bind assistant to phone number →
//   Publish version →
//   ACTIVE → Test call

type DeployState = 'idle' | 'deploying' | 'deployed' | 'error';
type TestState = 'idle' | 'calling' | 'success' | 'error';

function Step4Activate({ phoneNumberId, onBack }: { phoneNumberId: string | null; onBack: () => void }) {
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ action: string; phoneBound: boolean; message: string; phoneNumber?: string } | null>(null);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testNumber, setTestNumber] = useState('');

  // No auto-deploy — the user must explicitly click "Deploy & Activate".

  const handleDeploy = async () => {
    setDeployState('deploying');
    setDeployError(null);
    setDeployResult(null);
    try {
      const res = await fetch('/api/addons/receptionist/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDeployState('deployed');
        setDeployResult({
          action: data.action,
          phoneBound: data.phoneBound,
          message: data.message,
          phoneNumber: data.phoneNumber,
        });
        toast.success('AI Receptionist deployed to Vapi!');
      } else {
        setDeployState('error');
        setDeployError(data.error || data.detail || 'Deployment failed');
        // Provide actionable guidance based on the error code
        const code = data.code;
        if (code === 'SUBSCRIPTION_REQUIRED' || code === 'ENTITLEMENT_REQUIRED') {
          toast.error('Subscription issue — go back to Step 1');
        } else if (code === 'RECEPTIONIST_REQUIRED' || code === 'VERSION_REQUIRED') {
          toast.error('Configuration missing — go back to Step 2');
        } else if (code === 'PHONE_REQUIRED' || code === 'PHONE_INACTIVE' || code === 'VAPI_BINDING_MISSING') {
          toast.error('Phone issue — go back to Step 3');
        } else {
          toast.error(data.error || 'Deployment failed');
        }
      }
    } catch {
      setDeployState('error');
      setDeployError('Network error during deployment');
      toast.error('Network error');
    }
  };

  const handleTestCall = async () => {
    setTestState('calling');
    try {
      const res = await fetch('/api/addons/receptionist/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNumber: testNumber }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestState('success');
        toast.success(`Calling ${data.customerNumber}...`);
      } else {
        setTestState('error');
        toast.error(data.error || 'Test call failed');
      }
    } catch {
      setTestState('error');
      toast.error('Network error');
    }
  };

  const isDeployed = deployState === 'deployed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-5 text-emerald-600" />
          Review & Activate
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review your setup, then click Deploy &amp; Activate to deploy your AI Receptionist to Vapi.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pre-deploy checklist */}
        {!isDeployed && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Before you activate, verify:</p>
            <div className="rounded-lg border p-4 space-y-2.5">
              <ChecklistItem label="AI Receptionist subscription active" />
              <ChecklistItem label="Receptionist configured (name, greeting, transfers)" />
              <ChecklistItem label="Phone number purchased" />
              <ChecklistItem
                label="Vapi assistant deployment"
                state={deployState === 'deploying' ? 'pending' : 'pending'}
              />
              <ChecklistItem
                label="Assistant bound to phone number"
                state={deployState === 'deploying' ? 'pending' : 'pending'}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clicking <strong>Deploy &amp; Activate</strong> will deploy your receptionist to Vapi with 13 CRM tools
              (create_lead, schedule_job, transfer_to_human, etc.) and bind it to your phone number.
            </p>
          </div>
        )}

        {/* Deployment status */}
        {deployState === 'deploying' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <Loader2 className="size-6 text-blue-600 animate-spin shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-300">Deploying your AI Receptionist...</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Creating Vapi assistant with 13 CRM tools → binding to phone number → publishing version
              </p>
            </div>
          </div>
        )}

        {isDeployed && deployResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="size-6 text-emerald-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-900 dark:text-emerald-300">{deployResult.message}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Assistant deployed · Phone bound ({deployResult.phoneNumber}) · Version published
                </p>
              </div>
            </div>

            {/* Completed checklist */}
            <div className="rounded-lg border p-4 space-y-2.5">
              <ChecklistItem label="AI Receptionist subscription active" state="done" />
              <ChecklistItem label="Receptionist configured (name, greeting, transfers)" state="done" />
              <ChecklistItem label="Phone number purchased" state="done" />
              <ChecklistItem label="Vapi assistant deployment" state="done" />
              <ChecklistItem label="Assistant bound to phone number" state="done" />
              <ChecklistItem label="Call routing active (AI + voicemail fallback)" state="done" />
            </div>
          </div>
        )}

        {deployState === 'error' && deployError && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-900 dark:text-red-300">Deployment failed</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1 break-words">{deployError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDeploy} className="gap-2">
              <RefreshCw className="size-3.5" />
              Retry Deployment
            </Button>
          </div>
        )}

        {/* Deploy button — explicit, not automatic */}
        {!isDeployed && deployState !== 'deploying' && (
          <Button
            onClick={handleDeploy}
            disabled={deployState === 'deploying'}
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            size="lg"
          >
            <Rocket className="size-4" />
            Deploy &amp; Activate
          </Button>
        )}

        {/* Test call section — only after deployment succeeds */}
        {isDeployed && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">
              {testState === 'success' ? '✓ Test call started' :
               testState === 'calling' ? 'Calling...' :
               testState === 'error' ? '✕ Test call failed' :
               'Test your receptionist (optional)'}
            </p>
            <p className="text-xs text-muted-foreground">
              Enter your phone number — we&apos;ll call you and connect you to your AI Receptionist.
              This proves the full pipeline works: number → Twilio → Vapi → AI → CRM tools.
            </p>

            {testState === 'idle' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="test-number">Your phone number</Label>
                  <Input
                    id="test-number"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="+1 415 555 0123"
                    autoComplete="tel"
                  />
                </div>
                <Button
                  onClick={handleTestCall}
                  disabled={!testNumber.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Phone className="size-4" />
                  Start Test Call
                </Button>
              </div>
            )}

            {testState === 'calling' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Loader2 className="size-5 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Calling {testNumber}... Answer your phone.
                </p>
              </div>
            )}

            {testState === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <div className="text-sm">
                    <p className="font-medium text-emerald-900 dark:text-emerald-300">Test call started!</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Answer your phone — your AI Receptionist will be on the line.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  After the call, view it in the Calls tab with full transcript and outcome.
                </p>
              </div>
            )}

            {testState === 'error' && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-300">
                    Test call failed — you can skip this and test later from the workspace.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleTestCall} className="gap-2">
                  Retry Test Call
                </Button>
              </div>
            )}
          </div>
        )}

        {/* What happens next */}
        {isDeployed && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">What happens next?</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Incoming calls are answered by your AI Receptionist</li>
              <li>The AI captures leads, books appointments, and answers FAQs</li>
              <li>Calls that need human help transfer to your number</li>
              <li>You can view call history and usage in the AI Receptionist workspace</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={deployState === 'deploying'}>
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>
          {isDeployed && (
            <Button onClick={() => window.location.reload()} className="gap-2">
              Go to Workspace <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({
  label,
  state = 'pending',
}: {
  label: string;
  state?: 'pending' | 'done' | 'failed';
}) {
  const isDone = state === 'done';
  const isPending = state === 'pending';
  const isFailed = state === 'failed';
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {isDone ? (
        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
      ) : isFailed ? (
        <AlertCircle className="size-4 text-red-500 shrink-0" />
      ) : (
        <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}
      <span className={isDone ? 'text-foreground' : isPending ? 'text-muted-foreground' : 'text-red-600'}>
        {label}
      </span>
    </div>
  );
}
