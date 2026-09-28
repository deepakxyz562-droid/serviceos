'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  AVATAR_CATALOG,
} from '@/features/forms/types/agent-types';
import { FormField } from '@/lib/forms/form-schema-types';
import { AgentDeviceSimulator } from './agent-device-simulator';
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Zap,
  FileText,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Phone,
  Image as ImageIcon,
  CreditCard,
  Globe,
  Plus,
  Trash2,
  Loader2,
  Sliders,
  Send,
  HelpCircle,
  X,
  Smartphone,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  parseBusinessText,
  generateAgentAndFormFromWizard,
} from '@/lib/forms/generators/ai-agent-wizard-service';

export interface AgentSetupWizardProps {
  onComplete: (agent: FormAgentData, formId?: string) => void;
  onCancel?: () => void;
  siteOrigin?: string;
  initialAgent?: FormAgentData;
}

const QUICK_STARTERS = [
  {
    id: 'cleaning',
    label: '🧹 Cleaning & Maid',
    text: 'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning, end-of-tenancy cleaning, and carpet sanitation.',
  },
  {
    id: 'plumbing',
    label: '🔧 Plumbing & Drains',
    text: 'We are a 24/7 emergency plumbing service in Manchester. We fix burst pipes, clogged drains, leaking faucets, and install hot water systems.',
  },
  {
    id: 'hvac',
    label: '❄️ HVAC & Heating',
    text: 'We provide heating, air conditioning repair, furnace maintenance, and new heat pump installations across Austin, Texas.',
  },
  {
    id: 'roofing',
    label: '🏠 Roofing & Repairs',
    text: 'We are a licensed roofing contractor in Dallas specializing in storm damage inspection, roof replacement, shingle repair, and gutter systems.',
  },
  {
    id: 'clinic',
    label: '🩺 Clinic & Dental',
    text: 'We are a modern family dental clinic offering routine checkups, emergency toothache care, teeth whitening, and hygiene appointments.',
  },
  {
    id: 'auto',
    label: '🚗 Auto Repair',
    text: 'We operate a full-service auto repair and diagnostic garage in Birmingham, offering brakes, engine diagnostics, oil changes, and towing.',
  },
];

const CAPABILITY_OPTIONS = [
  {
    id: 'answer_questions',
    title: 'Answer Questions & FAQs',
    desc: 'Respond to business hours, pricing inquiries, policies, and service questions 24/7.',
    icon: MessageSquare,
    badge: 'KNOWLEDGE',
  },
  {
    id: 'capture_leads',
    title: 'Capture & Qualify Leads',
    desc: 'Collect customer name, phone number, email, and project scope instantly.',
    icon: Zap,
    badge: 'CRM',
  },
  {
    id: 'generate_quotes',
    title: 'Provide Instant Estimates',
    desc: 'Calculate preliminary price quotes based on customer property details and choices.',
    icon: FileText,
    badge: 'ESTIMATOR',
  },
  {
    id: 'book_appointments',
    title: 'Book Appointments & Visits',
    desc: 'Let customers choose preferred dates and time windows directly in chat.',
    icon: Calendar,
    badge: 'SCHEDULING',
  },
  {
    id: 'collect_files',
    title: 'Collect Photos & Files',
    desc: 'Prompt customers to upload pictures of their property, repair issue, or documents.',
    icon: ImageIcon,
    badge: 'MEDIA',
  },
  {
    id: 'take_payments',
    title: 'Accept Payments & Deposits',
    desc: 'Request upfront deposits or service booking fees via Stripe or PayPal.',
    icon: CreditCard,
    badge: 'PAYMENTS',
  },
];

export function AgentSetupWizard({
  onComplete,
  onCancel,
  siteOrigin,
  initialAgent,
}: AgentSetupWizardProps) {
  // Wizard Stepper (1: Business -> 2: Goals -> 3: Form -> 4: Launch)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Business Profile
  const [businessDescription, setBusinessDescription] = useState(
    'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning.'
  );

  // Step 2: Capabilities & Goals
  const [capabilities, setCapabilities] = useState<string[]>([
    'answer_questions',
    'capture_leads',
    'generate_quotes',
    'book_appointments',
    'collect_files',
  ]);
  const [audience, setAudience] = useState<'new_customers' | 'existing_customers' | 'both'>('both');

  // Step 3: Form Fields Customization
  const [activeFields, setActiveFields] = useState<FormField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  // Step 4: Knowledge & Personality
  const [knowledgeUrl, setKnowledgeUrl] = useState('');
  const [tone, setTone] = useState<'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic'>('friendly');

  // Preview State
  const [previewTab, setPreviewTab] = useState<'agent' | 'form'>('agent');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time generated artifacts
  const [generatedResult, setGeneratedResult] = useState(() =>
    generateAgentAndFormFromWizard({
      businessDescription: 'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning.',
      capabilities: ['answer_questions', 'capture_leads', 'generate_quotes', 'book_appointments', 'collect_files'],
      tone: 'friendly',
    })
  );

  // Real-time regeneration whenever businessDescription, capabilities, or tone changes
  const updateGeneratedState = useCallback(() => {
    try {
      const res = generateAgentAndFormFromWizard({
        businessDescription,
        capabilities,
        knowledgeUrl,
        tone,
      });
      setGeneratedResult(res);
      setActiveFields(res.form.fields);
    } catch (e) {
      console.error('Wizard generator error:', e);
    }
  }, [businessDescription, capabilities, knowledgeUrl, tone]);

  // Initial populate
  useEffect(() => {
    updateGeneratedState();
  }, [updateGeneratedState]);

  // Handle quick starter selection
  const handleSelectQuickStarter = (starterText: string) => {
    setBusinessDescription(starterText);
    toast.success('✨ Business description updated!');
  };

  // Toggle capabilities
  const toggleCapability = (capId: string) => {
    setCapabilities((prev) =>
      prev.includes(capId) ? prev.filter((id) => id !== capId) : [...prev, capId]
    );
  };

  // Add custom form field in Step 3
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const customId = `f_custom_${Date.now()}`;
    const newField: FormField = {
      id: customId,
      type: 'short_answer',
      label: newFieldLabel.trim(),
      placeholder: `Enter ${newFieldLabel.trim()}...`,
      required: false,
      layoutWidth: 'full',
    };
    setActiveFields((prev) => [...prev, newField]);
    setNewFieldLabel('');
    toast.success(`Added field "${newField.label}"`);
  };

  // Remove field in Step 3
  const handleRemoveField = (fieldId: string) => {
    setActiveFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  // Toggle field required state
  const handleToggleRequired = (fieldId: string) => {
    setActiveFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, required: !f.required } : f))
    );
  };

  // Save & Launch
  const handleFinalLaunch = async (mode: 'direct' | 'studio') => {
    setIsSaving(true);
    try {
      // Build final agent and form payload
      const finalAgent = {
        ...generatedResult.agent,
        voiceTone: tone,
        knowledge: {
          ...generatedResult.agent.knowledge,
          crawledUrls: knowledgeUrl ? [knowledgeUrl] : [],
        },
      };

      const res = await fetch('/api/forms/ai-agent-wizard-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDescription,
          capabilities,
          knowledgeUrl,
          tone,
          save: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('🎉 AI Agent and Customer Intake Form created successfully!');
        const savedAgent: FormAgentData = {
          ...finalAgent,
          id: data.savedAgentId || finalAgent.id,
          slug: data.agent?.slug || finalAgent.slug,
          connectedForms: data.savedFormId
            ? [
                {
                  id: data.savedFormId,
                  name: generatedResult.form.name,
                  description: generatedResult.form.description,
                  submissionCount: 0,
                },
              ]
            : [],
        };
        onComplete(savedAgent, data.savedFormId);
      } else {
        // Fallback: save locally
        toast.success('🎉 AI Agent generated!');
        onComplete(finalAgent);
      }
    } catch (e) {
      console.error('Failed to save wizard agent:', e);
      toast.error('Could not complete server save, proceeding in visual builder.');
      onComplete(generatedResult.agent);
    } finally {
      setIsSaving(false);
    }
  };

  const parsedBusiness = useMemo(
    () => parseBusinessText(businessDescription),
    [businessDescription]
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans select-none">
      {/* ─── TOP WIZARD NAVIGATION BAR ─── */}
      <header className="h-16 border-b border-border/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground flex items-center gap-2">
              AI Agent &amp; Intake Form Setup Wizard
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                GPTForm 2026
              </Badge>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Answer 4 simple questions — AI creates your agent, intake form, and CRM workflow automatically.
            </p>
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { num: 1, label: 'Business Profile' },
            { num: 2, label: 'Capabilities' },
            { num: 3, label: 'Intake Form' },
            { num: 4, label: 'Launch & Test' },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num as any)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : isDone
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted opacity-70'
                )}
              >
                <span
                  className={cn(
                    'size-4 rounded-full text-[10px] flex items-center justify-center font-extrabold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted-foreground/30 text-foreground'
                  )}
                >
                  {isDone ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Exit / Skip */}
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Skip Wizard (Manual Mode)
            </Button>
          )}
        </div>
      </header>

      {/* ─── SPLIT VIEW BODY (Left: Wizard Stepper | Right: Live Simulator) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: GUIDED STEPPER CONTROLS */}
        <div className="w-full lg:w-[55%] xl:w-[50%] h-full flex flex-col justify-between overflow-y-auto p-6 md:p-8 border-r border-border/70 bg-white dark:bg-slate-900/60">
          <div className="space-y-6 max-w-xl mx-auto w-full">
            {/* ─── STEP 1: BUSINESS PROFILE ─── */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    Step 1 of 4 · Business Profile
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    What does your business do?
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Describe your services and location in a sentence or two. Our AI will automatically infer your industry, customer inquiries, and required intake fields.
                  </p>
                </div>

                {/* Quick Starters */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Or pick a fast-starter:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_STARTERS.map((qs) => (
                      <button
                        key={qs.id}
                        type="button"
                        onClick={() => handleSelectQuickStarter(qs.text)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 border border-border/80 transition-all cursor-pointer text-foreground"
                      >
                        {qs.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <Textarea
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="e.g. We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning."
                    rows={4}
                    className="text-xs leading-relaxed resize-none rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border-border/90 focus-visible:ring-emerald-500 font-sans p-3.5"
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>💡 Tip: Mentioning your city or services helps the agent personalize responses.</span>
                  </div>
                </div>

                {/* AI Understood Card */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      AI Understood
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Business Name</p>
                      <p className="font-extrabold text-foreground truncate">{parsedBusiness.businessName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Industry</p>
                      <p className="font-extrabold text-foreground truncate">{parsedBusiness.industry}</p>
                    </div>
                    {parsedBusiness.location && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Service Location</p>
                        <p className="font-extrabold text-foreground">{parsedBusiness.location}</p>
                      </div>
                    )}
                  </div>
                  {parsedBusiness.services.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Detected Services</p>
                      <div className="flex flex-wrap gap-1">
                        {parsedBusiness.services.map((srv, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          >
                            ✓ {srv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP 2: CAPABILITIES & GOALS ─── */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    Step 2 of 4 · Capabilities &amp; Goals
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    What should your AI Agent help with?
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select all functions you want the agent to handle automatically for your website visitors.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CAPABILITY_OPTIONS.map((cap) => {
                    const isSelected = capabilities.includes(cap.id);
                    const Icon = cap.icon;
                    return (
                      <div
                        key={cap.id}
                        onClick={() => toggleCapability(cap.id)}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-left',
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-950 border-border/80 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              'size-8 rounded-xl flex items-center justify-center shrink-0',
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div
                            className={cn(
                              'size-4 rounded-md border flex items-center justify-center transition-all',
                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                            )}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground">{cap.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cap.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audience Selection */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-border/80 space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'new_customers', label: 'New Leads' },
                      { id: 'existing_customers', label: 'Existing Clients' },
                      { id: 'both', label: 'Both' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudience(opt.id as any)}
                        className={cn(
                          'py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          audience === opt.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-border/80 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: INTAKE FORM FIELDS ─── */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    Step 3 of 4 · Auto-Generated Intake Form
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    We built your customer intake form
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Based on your business type, the agent will present this form when customers request quotes or bookings. Toggle or add fields as needed.
                  </p>
                </div>

                {/* Fields List */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {activeFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-border/80 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-bold text-muted-foreground/60 w-4 text-center">
                          0{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{field.label}</p>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            {field.type.replace('_', ' ')} · {field.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRequired(field.id)}
                          className={cn(
                            'text-[10px] font-bold h-7 px-2 rounded-lg cursor-pointer',
                            field.required
                              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
                              : 'text-muted-foreground bg-muted/60'
                          )}
                        >
                          {field.required ? 'Required' : 'Optional'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveField(field.id)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Field */}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomField()}
                    placeholder="e.g. Number of pets, Gate code, Referral source..."
                    className="text-xs h-9 rounded-xl font-sans"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustomField}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add Field
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: KNOWLEDGE, PERSONALITY & LAUNCH ─── */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    Step 4 of 4 · Personality &amp; Launch
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Fine-tune personality and review
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose how your AI communicates and link your website for automatic FAQ learning.
                  </p>
                </div>

                {/* Personality Tone */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                    Communication Tone
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'friendly', label: '😊 Friendly' },
                      { id: 'professional', label: '💼 Professional' },
                      { id: 'empathetic', label: '🤝 Empathetic' },
                      { id: 'sales', label: '🚀 Direct & Sales' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id as any)}
                        className={cn(
                          'py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          tone === t.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-border/80 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Website Knowledge URL */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-blue-500" />
                    Website Knowledge Source (Optional)
                  </label>
                  <Input
                    value={knowledgeUrl}
                    onChange={(e) => setKnowledgeUrl(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="text-xs h-9 rounded-xl font-sans"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    We will extract your services, pricing, and FAQ answers to train your agent automatically.
                  </p>
                </div>

                {/* Everything Ready Summary Box */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="size-4" /> Ready to Deploy
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
                      Unified System
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{generatedResult.agent.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{activeFields.length} Custom Intake Fields</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                      <span>Automatic CRM Lead Sync</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                      <span>1-Line Website Embed Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Buttons */}
          <div className="pt-6 border-t border-border/80 flex items-center justify-between gap-3 max-w-xl mx-auto w-full mt-6">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="text-xs font-bold h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="text-xs font-bold h-9 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md cursor-pointer ml-auto"
              >
                Continue <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={() => handleFinalLaunch('studio')}
                  variant="outline"
                  className="text-xs font-bold h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
                >
                  Open in Visual Studio
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={() => handleFinalLaunch('direct')}
                  className="text-xs font-bold h-9 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Creating Agent...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Launch My AI Agent
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SIDE-BY-SIDE SIMULATOR & PREVIEW */}
        <div className="w-full lg:w-[45%] xl:w-[50%] h-full bg-slate-100/70 dark:bg-slate-950 flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden">
          {/* Header Switcher: 💬 Agent vs 📄 Form */}
          <div className="w-full max-w-sm flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Live Simulator
              </span>
            </div>
            <div className="flex items-center bg-white dark:bg-slate-900 border border-border/80 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewTab('agent')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  previewTab === 'agent'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageSquare className="size-3" /> Agent
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('form')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  previewTab === 'form'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className="size-3" /> Intake Form
              </button>
            </div>
          </div>

          {/* Simulator Content Area */}
          <div className="flex-1 w-full max-w-md h-full flex items-center justify-center overflow-hidden">
            {previewTab === 'agent' ? (
              <div className="w-full h-full max-h-[640px] shadow-2xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800">
                <AgentDeviceSimulator
                  agent={{
                    ...generatedResult.agent,
                    voiceTone: tone,
                  }}
                  previewPage="conversation"
                  isTestMode={true}
                />
              </div>
            ) : (
              /* Live Connected Form Preview Card */
              <div className="w-full max-h-[640px] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="space-y-1 border-b border-border/40 pb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                    Connected Intake Form
                  </span>
                  <h3 className="text-lg font-black text-foreground">{generatedResult.form.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {generatedResult.form.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {activeFields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>{f.label}</span>
                        {f.required && <span className="text-[10px] text-rose-500 font-bold">*</span>}
                      </label>
                      {f.type === 'long_answer' ? (
                        <Textarea
                          disabled
                          placeholder={f.placeholder || 'Your response...'}
                          rows={2}
                          className="text-xs rounded-xl bg-slate-50 dark:bg-slate-950/50"
                        />
                      ) : f.type === 'dropdown' ? (
                        <div className="h-9 rounded-xl border border-border/80 bg-slate-50 dark:bg-slate-950/50 px-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{f.placeholder || 'Select option...'}</span>
                          <span className="text-[10px]">▼</span>
                        </div>
                      ) : f.type === 'photo' || f.type === 'file' ? (
                        <div className="h-16 rounded-xl border border-dashed border-border/80 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                          <ImageIcon className="size-4 text-slate-400" />
                          <span className="text-[10px]">Click or drag to upload photos</span>
                        </div>
                      ) : (
                        <Input
                          disabled
                          placeholder={f.placeholder || ''}
                          className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/50"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  disabled
                  className="w-full text-xs font-bold h-10 rounded-xl bg-emerald-600 text-white shadow-md cursor-not-allowed"
                >
                  {generatedResult.form.submitButtonText}
                </Button>
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            ✨ Interactive Live Preview · Updates in real time as you adjust settings.
          </p>
        </div>
      </div>
    </div>
  );
}
