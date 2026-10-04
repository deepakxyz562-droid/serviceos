'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
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
  Loader2,
  Users,
  Eye,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import {
  searchTemplates,
  TEMPLATE_CATEGORIES,
  type FormTemplate,
  type TemplateCategoryId,
} from '@/lib/forms/templates';

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

const QUICK_PROMPTS = [
  {
    label: '🚰 Emergency Plumbing',
    text: 'Emergency plumbing quote and dispatch form. Collect customer address, issue type (pipe burst, drain clog, water heater leak), urgency level, and preferred arrival window.',
    title: 'Emergency Plumbing Request & Quote',
    goal: 'quote',
  },
  {
    label: '🦷 Dental Intake & Booking',
    text: 'New patient intake and appointment booking form. Collect personal details, dental insurance provider, reason for visit (cleaning, toothache, cosmetic), and appointment calendar selection.',
    title: 'Patient Intake & Consultation Booking',
    goal: 'booking',
  },
  {
    label: '🏠 Roofing Inspection',
    text: 'Residential roofing quote and damage inspection request. Collect roof square footage, roof age, storm damage assessment, photo uploads of roof, and contact details for on-site estimate.',
    title: 'Roof Inspection & Estimate Request',
    goal: 'quote',
  },
  {
    label: '❄️ HVAC Repair & Quote',
    text: 'HVAC repair and maintenance diagnostic form. Collect system type (AC, heat pump, furnace), problem description (not cooling, strange noise, frozen coils), address, and service timing.',
    title: 'HVAC Diagnostic & Service Booking',
    goal: 'booking',
  },
  {
    label: '🧹 Commercial Cleaning',
    text: 'Commercial cleaning proposal generator. Collect facility type (office, clinic, retail), square footage, cleaning frequency (daily, weekly, bi-weekly), special sanitation needs, and budget.',
    title: 'Commercial Cleaning Quote Calculator',
    goal: 'quote',
  },
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
  onSuccess,
}: CreateFormOrAgentModalProps) {
  // 3 Streamlined Steps:
  // Step 1: Prompt & Crawl Input
  // Step 2: Form Details & Goal Setup
  // Step 3: Live Generation & Ready
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Creation type is strictly form
  const creationType: WizardCreationType = 'form';

  // Step 1: Input (AI Prompt + URL Crawl)
  const [method, setMethod] = useState<WizardMethod>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanningUrl, setIsScanningUrl] = useState(false);
  const [crawledData, setCrawledData] = useState<any | null>(null);

  // Optional Template & Manual Switchers
  const [showAlternativeModes, setShowAlternativeModes] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryId | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [templateResults, setTemplateResults] = useState<FormTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Step 2: Configuration details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formGoal, setFormGoal] = useState('lead_capture');
  const [isMultiStep, setIsMultiStep] = useState(true);

  // Step 3: Generation & Results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string>('');

  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setMethod('ai');
      setShowAlternativeModes(false);
      setCreatedFormId(null);
      setCreatedSlug('');
      setGenerationProgress(0);
      setIsGenerating(false);
    }
  }, [open]);

  // Handle URL scanning
  const handleScanWebsiteModal = async (targetUrl?: string) => {
    const target = (targetUrl || websiteUrl).trim();
    if (!target) {
      toast.error('Please enter a website URL to scan (e.g. https://integrityroofingandrepair.com)');
      return;
    }
    setIsScanningUrl(true);
    toast.info(`🔍 Scanning ${target}...`);
    try {
      const res = await fetch('/api/forms/ai-agent-wizard-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crawl', url: target }),
      });
      const data = await res.json();
      if (res.ok && data.crawled) {
        setCrawledData(data.crawled);
        setName(data.crawled.businessName || '');
        setDescription(data.crawled.description || '');
        setAiPrompt(`${data.crawled.businessName} - ${data.crawled.description}`);
        toast.success(`✨ Extracted ${data.crawled.businessName} details and services!`);
      } else {
        toast.error(data.error || 'Could not scan website.');
      }
    } catch (e) {
      console.error('Scan error:', e);
      toast.error('Network error during scan.');
    } finally {
      setIsScanningUrl(false);
    }
  };

  // Load templates when alternative template mode is chosen
  useEffect(() => {
    if (method === 'template') {
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
  }, [method, templateSearch, selectedCategory]);

  const handleSelectTemplate = (tpl: FormTemplate) => {
    setSelectedTemplate(tpl);
    setName(tpl.title);
    setDescription(tpl.description);
    setIsMultiStep(tpl.schema?.isMultiStep ?? true);
    toast.success(`Selected template: "${tpl.title}"`);
  };

  const handleApplyQuickPrompt = (qp: (typeof QUICK_PROMPTS)[number]) => {
    setAiPrompt(qp.text);
    setName(qp.title);
    setFormGoal(qp.goal);
    toast.info(`Applied "${qp.label}" preset!`);
  };

  // Step 3 Generation Logic
  const handleGenerate = async () => {
    setStep(3);
    setIsGenerating(true);
    setGenerationProgress(15);
    setGenerationStatus('Ingesting requirements and knowledge context...');

    try {
      if (method === 'ai') {
        setGenerationProgress(40);
        setGenerationStatus('Formulating questions, logic, and validation schema...');

        const promptText =
          aiPrompt.trim() ||
          (crawledData ? `${crawledData.businessName} - ${crawledData.description}` : '') ||
          websiteUrl.trim() ||
          `${name || 'Business Services'}: provide consultations, quote estimates, and appointments.`;

        const res = await fetch('/api/forms/ai-agent-wizard-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessDescription: promptText,
            businessName: name.trim() || crawledData?.businessName || undefined,
            capabilities: ['capture_leads', formGoal === 'booking' ? 'book_appointments' : 'generate_quotes'],
            knowledgeUrl: websiteUrl.trim() || undefined,
            crawledContext: crawledData || undefined,
            save: true,
          }),
        });

        const data = await res.json();
        setGenerationProgress(80);
        setGenerationStatus('Publishing live endpoints and linking CRM sync...');

        if (res.ok && data.success) {
          const effectiveFormId = data.savedFormId || data.form?.id || null;
          const effectiveSlug =
            data.savedFormSlug || data.form?.slug || data.savedAgentSlug || 'new-intake';
          setCreatedFormId(effectiveFormId);
          setCreatedSlug(effectiveSlug);
          setGenerationProgress(100);
          setGenerationStatus('Complete!');
          setIsGenerating(false);
          toast.success('🎉 Smart Form created successfully!');
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
          setIsGenerating(false);
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
          setIsGenerating(false);
          toast.success('🎉 Form initialized successfully!');
        } else {
          throw new Error(data.error || 'Failed to create form');
        }
      }
    } catch (err) {
      console.error('Wizard error:', err);
      toast.error(err instanceof Error ? err.message : 'Creation failed. Please try again.');
      setIsGenerating(false);
      setStep(2);
    }
  };

  const handleGoToEditor = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess({
        formId: createdFormId || undefined,
        slug: createdSlug,
        type: creationType,
        mode: 'editor',
      });
    } else {
      if (createdFormId) {
        sessionStorage.setItem('fieseros_active_edit_form_id', createdFormId);
        try {
          sessionStorage.removeItem('pendingTemplateId');
          localStorage.removeItem('fieseros_pending_template_id');
        } catch {}
      }
      setCurrentView('formBuilder');
    }
  };

  const handleViewListing = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess({
        formId: createdFormId || undefined,
        slug: createdSlug,
        type: creationType,
        mode: 'listing',
      });
    } else {
      setCurrentView('formBuilder');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${label} copied to clipboard!`);
      })
      .catch(() => {
        toast.error('Could not copy to clipboard.');
      });
  };

  if (!open) return null;

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';
  const targetFormRef = createdSlug || createdFormId || 'new-intake';
  const liveFormUrl = `${siteOrigin}/f/${targetFormRef}`;
  const embedCode = `<script src="${siteOrigin}/embed.js" data-form="${targetFormRef}" async></script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* ─── Backdrop ─── */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={() => {
          if (!isGenerating) onOpenChange(false);
        }}
      />

      {/* ─── Modal Content ─── */}
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
                  AI Form Wizard
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                >
                  Step {step} of 3
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {step === 1 && 'Describe your form or enter your website to auto-generate questions'}
                {step === 2 && 'Review title, primary goal, and layout structure'}
                {step === 3 &&
                  (isGenerating
                    ? 'Generating smart form, pricing logic, and live endpoints...'
                    : 'Your smart form is live and connected')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 3 Step Pill Indicators */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
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

        {/* ─── Scrollable Body ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: Describe Form & Optional Website URL Crawl                  */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">
                  What kind of form do you want to create?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tell our AI what questions to ask, or paste your website URL to auto-extract services and pricing.
                </p>
              </div>

              {/* Primary AI Prompt Box */}
              <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Wand2 className="size-3.5 text-emerald-600" />
                      Describe Your Form &amp; Questions
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Natural language prompt
                    </span>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="e.g. We are a residential roofing and gutter company. We need to collect customer contact info, property address, roof age, issue type (storm damage, leak, replacement), and preferred date for an on-site inspection."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="bg-card text-xs rounded-xl focus-visible:ring-emerald-500/30"
                  />
                </div>

                {/* Quick starter suggestion chips */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    Quick Industry Starters:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.label}
                        type="button"
                        onClick={() => handleApplyQuickPrompt(qp)}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 border border-border/80 transition-all cursor-pointer text-foreground"
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Integrated Website Scanner */}
                <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="size-3.5 text-emerald-600" />
                      Website URL to Scan (Optional Auto-Fill)
                    </label>
                    {crawledData && (
                      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                        ✓ {crawledData.businessName} Indexed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://yourbusiness.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanWebsiteModal(websiteUrl)}
                      className="bg-card text-xs h-10 rounded-xl"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isScanningUrl || !websiteUrl.trim()}
                      onClick={() => handleScanWebsiteModal(websiteUrl)}
                      className="h-10 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer shadow-xs gap-1.5"
                    >
                      {isScanningUrl ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Scanning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" /> Scan &amp; Auto-Fill
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Our scanner indexes your services, FAQs, and pricing to create ready-to-use form fields automatically.
                  </p>
                </div>
              </div>

              {/* Template / Manual Alternative Switcher (Optional Drawer) */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAlternativeModes(!showAlternativeModes)}
                  className="text-xs font-medium text-muted-foreground hover:text-emerald-600 underline underline-offset-4 cursor-pointer transition-colors"
                >
                  {showAlternativeModes
                    ? 'Hide template & manual options'
                    : 'Or browse 20,000+ templates / start blank canvas'}
                </button>
              </div>

              {showAlternativeModes && (
                <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <button
                      type="button"
                      onClick={() => setMethod('ai')}
                      className={cn(
                        'text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                        method === 'ai'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      AI Generator (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('template')}
                      className={cn(
                        'text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                        method === 'template'
                          ? 'bg-blue-600 text-white'
                          : 'bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Templates Library
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('manual')}
                      className={cn(
                        'text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                        method === 'manual'
                          ? 'bg-slate-700 text-white'
                          : 'bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Blank Canvas
                    </button>
                  </div>

                  {method === 'template' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search 20,000+ templates (e.g. quote calculator, dental, plumbing)..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="pl-9 h-10 text-xs rounded-xl bg-card"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                        {templatesLoading ? (
                          <div className="col-span-2 py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin text-emerald-600" /> Loading templates...
                          </div>
                        ) : (
                          templateResults.slice(0, 8).map((tpl) => (
                            <div
                              key={tpl.id}
                              onClick={() => handleSelectTemplate(tpl)}
                              className={cn(
                                'p-3 rounded-xl border text-left cursor-pointer transition-all',
                                selectedTemplate?.id === tpl.id
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : 'border-border bg-card hover:border-emerald-500/40'
                              )}
                            >
                              <div className="font-bold text-xs text-foreground flex items-center justify-between">
                                <span className="truncate">{tpl.title}</span>
                                {selectedTemplate?.id === tpl.id && <Check className="size-3.5 text-emerald-600" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{tpl.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {method === 'manual' && (
                    <div className="p-3 bg-card rounded-xl text-xs text-muted-foreground">
                      You will begin with an empty workspace pre-populated with standard contact fields (Name, Email, Phone) and customize every field freely in Form Studio.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: Configure Details & Goal                                  */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">Configure Details &amp; Goal</h3>
                <p className="text-xs text-muted-foreground">
                  Customize your form title, primary objective, and layout structure.
                </p>
              </div>

              {/* Title & Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Form Title</label>
                  <Input
                    placeholder="e.g. Instant Quote & Service Request"
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
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Goal Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {FORM_GOALS.slice(0, 3).map((g) => {
                  const Icon = g.icon;
                  const isSelected = formGoal === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setFormGoal(g.id)}
                      className={cn(
                        'p-3.5 rounded-2xl border text-left cursor-pointer transition-all',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                          : 'border-border/80 bg-card hover:border-emerald-500/40'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn('size-4', isSelected ? 'text-emerald-600' : 'text-muted-foreground')} />
                        <span className="text-xs font-bold text-foreground">{g.label.split('&')[0]}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{g.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Step Layout Toggle */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">Multi-Step Form Layout</div>
                    <div className="text-[11px] text-muted-foreground">
                      One question or category per screen with interactive progress bar
                    </div>
                  </div>
                  <Switch checked={isMultiStep} onCheckedChange={setIsMultiStep} />
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: Generation Status or Live Success Screen                   */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            isGenerating ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
                <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 animate-pulse">
                  <Sparkles className="size-10" />
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-black text-foreground">Creating Your Smart Form</h3>
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
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Structured Schema
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Real-time Validation
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> CRM Sync
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-2 max-w-lg mx-auto">
                  <div className="size-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/10">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight">
                    Your Smart Form is Live!
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

                {/* ─── Two Decision Choices ─── */}
                <div className="pt-4 border-t border-border/60 max-w-xl mx-auto space-y-3">
                  <div className="text-center text-xs font-semibold text-foreground/80 mb-2">
                    What would you like to do next?
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: Go to Advanced Form Studio */}
                    <Button
                      size="lg"
                      onClick={handleGoToEditor}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs h-12 rounded-2xl shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer"
                    >
                      <Sliders className="size-4" />
                      <span>Open in Form Studio</span>
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
            )
          )}
        </div>

        {/* ─── Footer Navigation Buttons (Steps 1 & 2) ─── */}
        {step < 3 && !isGenerating && (
          <div className="border-t border-border/80 bg-muted/20 px-6 py-4 flex items-center justify-between shrink-0">
            {step === 2 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
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

              {step === 1 ? (
                <Button
                  size="sm"
                  onClick={() => setStep(2)}
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
