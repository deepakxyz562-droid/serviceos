'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  Bot,
  FileInput,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Globe,
  Sliders,
  Calendar,
  CreditCard,
  MessageSquare,
  FileText,
  Search,
  ExternalLink,
  Copy,
  Wand2,
  Layers,
  ChevronRight,
  Loader2,
  Users,
  Eye,
  ShieldCheck,
  Palette,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import {
  searchTemplates,
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  type FormTemplate,
  type TemplateCategoryId,
} from '@/lib/forms/templates';
import {
  generateAgentAndFormFromWizard,
  parseBusinessText,
} from '@/lib/forms/generators/ai-agent-wizard-service';
import { AVATAR_CATALOG, DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export type WizardCreationType = 'form' | 'agent' | 'hybrid';
export type WizardMethod = 'ai' | 'template' | 'manual';

export interface CreateFormOrAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: WizardCreationType | null;
  onSuccess?: (result: {
    formId?: string;
    agentId?: string;
    slug?: string;
    type: WizardCreationType;
    mode: 'editor' | 'listing';
  }) => void;
}

const TONES = [
  { id: 'friendly' as const, label: 'Friendly & Welcoming', desc: 'Approachable, cheerful, conversational' },
  { id: 'professional' as const, label: 'Strictly Professional', desc: 'Crisp, polite, corporate-grade' },
  { id: 'sales' as const, label: 'High-Converting Sales', desc: 'Persuasive, action-oriented, focused on booking' },
  { id: 'medical' as const, label: 'Clinical & Confidential', desc: 'Discreet, empathetic, clear intake' },
  { id: 'empathetic' as const, label: 'Warm & Supportive', desc: 'Gentle, understanding, reassuring' },
];

const CAPABILITIES = [
  { id: 'answer_questions', title: 'Answer FAQs from Website', desc: 'Zero-hallucination answers from your content', icon: MessageSquare },
  { id: 'capture_leads', title: 'Qualify & Capture Leads', desc: 'Extract contact details & score readiness', icon: Zap },
  { id: 'generate_quotes', title: 'Dynamic Formula Quotes', desc: 'Calculate instant mathematical estimates', icon: Calculator },
  { id: 'book_appointments', title: '2-Way Calendar Booking', desc: 'Direct slot reservation on Google Calendar', icon: Calendar },
  { id: 'take_payments', title: 'In-Chat Payments (0% Fee)', desc: 'Stripe deposits, retainers & Apple Pay', icon: CreditCard },
];

const FORM_GOALS = [
  { id: 'lead_capture', label: 'Lead Capture & Qualification', desc: 'Convert visitors into verified CRM leads', icon: Users },
  { id: 'booking', label: 'Appointment & Consultation Booking', desc: 'Live calendar slot reservation', icon: Calendar },
  { id: 'quote', label: 'Dynamic Price Calculator / Quote', desc: 'Real-time mathematical estimation', icon: Calculator },
  { id: 'payment', label: 'Order & Payment Collection', desc: 'Stripe checkout with 0% platform fee', icon: CreditCard },
  { id: 'support', label: 'Customer Inquiry / Ticket Intake', desc: 'Support triage with file attachments', icon: MessageSquare },
];

export function CreateFormOrAgentModal({
  open,
  onOpenChange,
  initialType = 'form',
  onSuccess,
}: CreateFormOrAgentModalProps) {
  // Stepper: 1: Type -> 2: Method -> 3: Details -> 4: Review/Generating -> 5: Success Choice
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Type
  const [creationType, setCreationType] = useState<WizardCreationType>(initialType || 'form');

  // Step 2: Method
  const [method, setMethod] = useState<WizardMethod>('ai');

  // Method = AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Method = Template State
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryId | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [templateResults, setTemplateResults] = useState<FormTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Step 3: Configuration details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formGoal, setFormGoal] = useState('lead_capture');
  const [isMultiStep, setIsMultiStep] = useState(true);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    'answer_questions',
    'capture_leads',
    'book_appointments',
  ]);
  const [agentTone, setAgentTone] = useState<'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic'>('friendly');
  const [agentAvatar, setAgentAvatar] = useState(AVATAR_CATALOG[0].url);

  // Step 4 & 5: Generation & Results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string>('');

  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Initialize type when initialType changes
  useEffect(() => {
    if (open) {
      if (initialType) setCreationType(initialType);
      setStep(1);
      setCreatedFormId(null);
      setCreatedAgentId(null);
      setCreatedSlug('');
      setGenerationProgress(0);
    }
  }, [open, initialType]);

  // Load templates when Step 2 with Template method is active
  useEffect(() => {
    if (step === 2 && method === 'template') {
      let isSubscribed = true;
      setTemplatesLoading(true);
      searchTemplates({
        query: templateSearch || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        limit: 40,
      }).then((res) => {
        if (isSubscribed) {
          setTemplateResults(res.map((r) => r.template));
          setTemplatesLoading(false);
        }
      });
      return () => {
        isSubscribed = false;
      };
    }
  }, [step, method, templateSearch, selectedCategory]);

  // Auto-fill details when template is picked
  const handleSelectTemplate = (tpl: FormTemplate) => {
    setSelectedTemplate(tpl);
    setName(tpl.title);
    setDescription(tpl.description);
    setIsMultiStep(tpl.schema?.isMultiStep ?? true);
    toast.success(`Selected template: "${tpl.title}"`);
  };

  // Toggle capabilities for agent/hybrid
  const toggleCapability = (id: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Handle final generation
  const handleGenerate = async () => {
    setStep(4);
    setIsGenerating(true);
    setGenerationProgress(15);
    setGenerationStatus('Ingesting requirements and knowledge sources...');

    try {
      if (method === 'ai') {
        setGenerationProgress(40);
        setGenerationStatus('Formulating questions, logic and persona...');

        const promptText = aiPrompt.trim() || websiteUrl.trim() || `${name || 'Business Services'}: provide consultations, quote estimates, and appointments.`;
        const res = await fetch('/api/forms/ai-agent-wizard-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessDescription: promptText,
            capabilities: selectedCapabilities,
            knowledgeUrl: websiteUrl.trim() || undefined,
            tone: agentTone,
            save: true,
          }),
        });

        const data = await res.json();
        setGenerationProgress(80);
        setGenerationStatus('Publishing live endpoints and linking workflows...');

        if (res.ok && data.success) {
          setCreatedFormId(data.savedFormId || null);
          setCreatedAgentId(data.savedAgentId || null);
          setCreatedSlug(data.form?.slug || data.agent?.slug || 'new-intake');
          setGenerationProgress(100);
          setGenerationStatus('Complete!');
          setStep(5);
          toast.success('🎉 Form & AI Agent created successfully!');
        } else {
          throw new Error(data.error || 'Server could not save generated asset');
        }
      } else if (method === 'template' && selectedTemplate) {
        setGenerationProgress(50);
        setGenerationStatus(`Applying template "${selectedTemplate.title}"...`);

        const tplSchema = selectedTemplate.schema;
        const res = await authFetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || selectedTemplate.title,
            description: description || selectedTemplate.description,
            type: formGoal,
            fieldsJson: JSON.stringify(tplSchema?.fields || []),
            schemaJson: JSON.stringify(tplSchema || {}),
            submissionActions: {
              primary: formGoal === 'booking' ? 'create_booking' : 'create_lead',
              additional: { sendEmail: true, notifySalesTeam: true },
            },
          }),
        });

        const data = await res.json();
        setGenerationProgress(90);
        setGenerationStatus('Finalizing database records...');

        if (res.ok && data.form) {
          setCreatedFormId(data.form.id);
          setCreatedSlug(data.form.slug);
          setGenerationProgress(100);
          setStep(5);
          toast.success('🎉 Template initialized successfully!');
        } else {
          throw new Error(data.error || 'Failed to create form from template');
        }
      } else {
        // Manual Scratch Build
        setGenerationProgress(50);
        setGenerationStatus('Initializing blank canvas...');

        const defaultFields = [
          { id: `f_${Date.now()}_1`, type: 'short_answer', label: 'Full Name', required: true, placeholder: 'Enter your name' },
          { id: `f_${Date.now()}_2`, type: 'email', label: 'Email Address', required: true, placeholder: 'name@example.com' },
          { id: `f_${Date.now()}_3`, type: 'phone', label: 'Phone Number', required: false, placeholder: '+1 (555) 000-0000' },
          { id: `f_${Date.now()}_4`, type: 'paragraph', label: 'How can we help you?', required: false, placeholder: 'Tell us about your project or request...' },
        ];

        const res = await authFetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || 'New Customer Intake Form',
            description: description.trim() || 'Please fill out the details below.',
            type: formGoal,
            fieldsJson: JSON.stringify(defaultFields),
            schemaJson: JSON.stringify({
              fields: defaultFields,
              isMultiStep,
              theme: { primaryColor: '#10b981', layout: 'classic' },
            }),
            submissionActions: {
              primary: 'create_lead',
              additional: { sendEmail: true, notifySalesTeam: true },
            },
          }),
        });

        const data = await res.json();
        setGenerationProgress(90);
        setGenerationStatus('Finalizing database records...');

        if (res.ok && data.form) {
          setCreatedFormId(data.form.id);
          setCreatedSlug(data.form.slug);
          setGenerationProgress(100);
          setStep(5);
          toast.success('🎉 Form initialized successfully!');
        } else {
          throw new Error(data.error || 'Failed to create form');
        }
      }
    } catch (err) {
      console.error('Wizard error:', err);
      toast.error(err instanceof Error ? err.message : 'Creation failed. Please try again.');
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 5: Post-Creation Decisions
  const handleGoToEditor = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess({
        formId: createdFormId || undefined,
        agentId: createdAgentId || undefined,
        slug: createdSlug,
        type: creationType,
        mode: 'editor',
      });
    } else {
      if (createdFormId) {
        sessionStorage.setItem('fieseros_active_edit_form_id', createdFormId);
      }
      setCurrentView('formBuilder');
    }
  };

  const handleViewListing = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess({
        formId: createdFormId || undefined,
        agentId: createdAgentId || undefined,
        slug: createdSlug,
        type: creationType,
        mode: 'listing',
      });
    } else {
      setCurrentView('formBuilder');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`);
    }).catch(() => {
      toast.error('Could not copy to clipboard.');
    });
  };

  if (!open) return null;

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';
  const liveFormUrl = `${siteOrigin}/f/${createdSlug}`;
  const embedCode = `<script src="${siteOrigin}/embed.js" data-form="${createdSlug}" async></script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* ─── Blacked-out Backdrop ─── */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={() => {
          if (!isGenerating) onOpenChange(false);
        }}
      />

      {/* ─── Modal Content Box ─── */}
      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden font-sans">
        {/* ─── Header & Stepper Bar ─── */}
        <div className="border-b border-border/80 bg-muted/40 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  Create Form or AI Agent
                </h2>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  Step {step} of 4
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {step === 1 && 'Choose the type of digital intake asset you want to launch'}
                {step === 2 && 'Select your preferred creation method'}
                {step === 3 && 'Configure goals, capabilities, and key questions'}
                {step === 4 && 'Generating your asset with verified parameters'}
                {step === 5 && 'Your asset is live — choose where to proceed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'size-2.5 rounded-full transition-all duration-200',
                    step === s
                      ? 'bg-emerald-600 scale-125'
                      : step > s
                      ? 'bg-emerald-600/50'
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={isGenerating}
              onClick={() => onOpenChange(false)}
              className="rounded-full size-8 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ─── Modal Scrollable Body ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: What do you want to create?                                 */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">What do you want to build?</h3>
                <p className="text-xs text-muted-foreground">
                  Select the intake experience that best matches your customer interaction goal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Smart Form */}
                <div
                  onClick={() => setCreationType('form')}
                  className={cn(
                    'group relative rounded-2xl border-2 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1',
                    creationType === 'form'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
                      : 'border-border/80 bg-card hover:border-emerald-500/40'
                  )}
                >
                  {creationType === 'form' && (
                    <div className="absolute top-3 right-3 size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileInput className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">Interactive Smart Form</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Step-by-step multi-page forms, dynamic formula price calculators, file uploads, and in-form Stripe payments.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-[11px] font-semibold text-emerald-600">
                    <span>Forms, Quoting &amp; Payments</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. Conversational AI Agent */}
                <div
                  onClick={() => setCreationType('agent')}
                  className={cn(
                    'group relative rounded-2xl border-2 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1',
                    creationType === 'agent'
                      ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10'
                      : 'border-border/80 bg-card hover:border-blue-500/40'
                  )}
                >
                  {creationType === 'agent' && (
                    <div className="absolute top-3 right-3 size-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Bot className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">Conversational AI Agent</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        24/7 website chat assistant grounded in your site content. Answers questions, qualifies leads, and books Google Calendar slots.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                    <span>Website Chatbot &amp; Booking</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 3. Hybrid Form + Agent */}
                <div
                  onClick={() => setCreationType('hybrid')}
                  className={cn(
                    'group relative rounded-2xl border-2 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1',
                    creationType === 'hybrid'
                      ? 'border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10'
                      : 'border-border/80 bg-card hover:border-purple-500/40'
                  )}
                >
                  {creationType === 'hybrid' && (
                    <div className="absolute top-3 right-3 size-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="size-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Zap className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-foreground">Hybrid (Form + Agent)</h4>
                        <Badge className="bg-purple-600 text-white text-[9px] px-1 py-0 uppercase">Recommended</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        The ultimate combination: an autonomous conversational AI chatbot synchronized with a structured customer intake form.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-[11px] font-semibold text-purple-600">
                    <span>Dual Chat &amp; Structured Form</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: Choose Method (AI Crawl vs. 20K+ Template vs. Manual)      */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">How would you like to build it?</h3>
                <p className="text-xs text-muted-foreground">
                  Pick how you want to generate your {creationType === 'form' ? 'form' : creationType === 'agent' ? 'AI agent' : 'hybrid solution'}.
                </p>
              </div>

              {/* Method Toggle Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('ai')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer',
                    method === 'ai'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-border/80 bg-card hover:border-emerald-500/40'
                  )}
                >
                  <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">AI Prompt &amp; Crawl</div>
                    <div className="text-[11px] text-muted-foreground">URL crawl or prompt</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('template')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer',
                    method === 'template'
                      ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                      : 'border-border/80 bg-card hover:border-blue-500/40'
                  )}
                >
                  <div className="size-9 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">20,000+ Templates</div>
                    <div className="text-[11px] text-muted-foreground">Pre-built industry setups</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('manual')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer',
                    method === 'manual'
                      ? 'border-slate-500 bg-slate-500/10 shadow-xs'
                      : 'border-border/80 bg-card hover:border-slate-500/40'
                  )}
                >
                  <div className="size-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Sliders className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Manual Scratch</div>
                    <div className="text-[11px] text-muted-foreground">Start from blank slate</div>
                  </div>
                </button>
              </div>

              {/* Sub-view for Method = AI */}
              {method === 'ai' && (
                <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="size-3.5 text-emerald-600" />
                      Website URL to Crawl (Optional)
                    </label>
                    <Input
                      placeholder="https://yourcompany.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="bg-card text-xs h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Our crawler indexes your pages, services, FAQs, and pricing in 30 seconds.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Wand2 className="size-3.5 text-emerald-600" />
                      Describe What You Need
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="e.g. We are a family clinic in Austin offering routine checkups, teeth whitening, and emergency care. We need to collect patient contact info, insurance details, and preferred appointment slots."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="bg-card text-xs rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Sub-view for Method = Template */}
              {method === 'template' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search 20,000+ templates (e.g. quote calculator, booking, patient intake)..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="pl-9 h-10 text-xs rounded-xl bg-card"
                      />
                    </div>
                  </div>

                  {/* Category Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer',
                        selectedCategory === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      All
                    </button>
                    {TEMPLATE_CATEGORIES.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer',
                          selectedCategory === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {templatesLoading ? (
                      <div className="col-span-2 py-8 flex items-center justify-center text-xs text-muted-foreground gap-2">
                        <Loader2 className="size-4 animate-spin text-emerald-600" />
                        Loading templates...
                      </div>
                    ) : templateResults.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                        No templates found. Try a different keyword or start from scratch.
                      </div>
                    ) : (
                      templateResults.map((tpl) => {
                        const isPicked = selectedTemplate?.id === tpl.id;
                        return (
                          <div
                            key={tpl.id}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={cn(
                              'p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2',
                              isPicked
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                : 'border-border/80 bg-card hover:border-emerald-500/40'
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground line-clamp-1">{tpl.title}</span>
                                {isPicked && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                                {tpl.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                {tpl.categories[0]}
                              </Badge>
                              <span>{tpl.schema?.fields?.length || 5} fields</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Sub-view for Method = Manual */}
              {method === 'manual' && (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Clean Blank Canvas</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You will begin with an empty workspace pre-populated with standard contact fields (Name, Email, Phone). In Step 3, you will configure your goal and steps, then customize every field freely.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: Contextual Questions & Customization                       */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">Configure Details &amp; Capabilities</h3>
                <p className="text-xs text-muted-foreground">
                  Tailor your asset title, goals, and behavioral settings.
                </p>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Asset Name / Title</label>
                  <Input
                    placeholder="e.g. Instant Quote & Appointment Booking"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Primary Purpose</label>
                  <select
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {FORM_GOALS.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Options (if form or hybrid) */}
              {(creationType === 'form' || creationType === 'hybrid') && (
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Multi-Step Form Layout</div>
                      <div className="text-[11px] text-muted-foreground">One question or category per page with visual progress bar</div>
                    </div>
                    <Switch checked={isMultiStep} onCheckedChange={setIsMultiStep} />
                  </div>
                </div>
              )}

              {/* Agent Options (if agent or hybrid) */}
              {(creationType === 'agent' || creationType === 'hybrid') && (
                <div className="space-y-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">AI Voice Tone &amp; Style</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAgentTone(t.id)}
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                            agentTone === t.id
                              ? 'border-blue-500 bg-blue-500/10 font-bold'
                              : 'border-border/70 bg-card hover:border-blue-500/30'
                          )}
                        >
                          <div className="text-xs text-foreground">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities Toggles */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Autonomous Capabilities</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CAPABILITIES.map((cap) => {
                        const Icon = cap.icon;
                        const isChecked = selectedCapabilities.includes(cap.id);
                        return (
                          <div
                            key={cap.id}
                            onClick={() => toggleCapability(cap.id)}
                            className={cn(
                              'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                              isChecked
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-border/70 bg-card hover:border-emerald-500/30'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                                <Icon className="size-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-foreground">{cap.title}</div>
                                <div className="text-[10px] text-muted-foreground">{cap.desc}</div>
                              </div>
                            </div>
                            <div className={cn(
                              'size-4 rounded-full flex items-center justify-center border transition-all',
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-muted-foreground/40'
                            )}>
                              {isChecked && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: Generation Status / Progress Bar                           */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
              <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 animate-pulse">
                <Sparkles className="size-10" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-black text-foreground">Creating Your Digital Asset</h3>
                <p className="text-xs text-muted-foreground">{generationStatus}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm bg-muted rounded-full h-3 overflow-hidden border">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-600" /> Structured Schema</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-600" /> Real-time Validation</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-600" /> CRM Sync</span>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 5: Post-Creation Choice Screen (Advanced Edit vs. View List)   */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <div className="size-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/10">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-2xl font-black text-foreground tracking-tight">
                  Your {creationType === 'form' ? 'Smart Form' : creationType === 'agent' ? 'AI Agent' : 'Hybrid Solution'} is Live!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  &quot;{name || 'New Customer Intake'}&quot; has been generated and connected to your CRM.
                </p>
              </div>

              {/* Public Link & Embed preview box */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3 max-w-xl mx-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-emerald-600" /> Public Hosted Link:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(liveFormUrl, 'Public link')}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="size-3" /> Copy
                    </button>
                    <a
                      href={liveFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-foreground hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" /> Test
                    </a>
                  </div>
                </div>
                <div className="bg-card p-2.5 rounded-xl border font-mono text-[11px] text-muted-foreground truncate select-all">
                  {liveFormUrl}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-blue-600" /> Website Embed Snippet:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(embedCode, 'Embed code')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" /> Copy Snippet
                  </button>
                </div>
                <div className="bg-card p-2.5 rounded-xl border font-mono text-[11px] text-muted-foreground truncate select-all">
                  {embedCode}
                </div>
              </div>

              {/* ─── Two User Decision Choices (Requested by User) ─── */}
              <div className="pt-4 border-t border-border/60 max-w-xl mx-auto space-y-3">
                <div className="text-center text-xs font-semibold text-foreground/80 mb-2">
                  What would you like to do next?
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Go to Advanced Edit Mode */}
                  <Button
                    size="lg"
                    onClick={handleGoToEditor}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs h-12 rounded-2xl shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer"
                  >
                    <Sliders className="size-4" />
                    <span>Go to Advanced Editor</span>
                  </Button>

                  {/* Option B: Done, View Form Listing */}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleViewListing}
                    className="w-full border-border hover:bg-muted font-bold text-xs h-12 rounded-2xl gap-2 cursor-pointer"
                  >
                    <Eye className="size-4" />
                    <span>Done, View Form Listing</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Navigation Buttons (Steps 1 to 3) ─── */}
        {step < 4 && (
          <div className="border-t border-border/80 bg-muted/20 px-6 py-4 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="gap-1.5 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>

              {step < 3 ? (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => (s + 1) as any)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold px-5 h-9 rounded-xl shadow-xs cursor-pointer"
                >
                  Continue <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1.5 text-xs font-bold px-6 h-9 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Sparkles className="size-3.5" /> Generate &amp; Launch
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
