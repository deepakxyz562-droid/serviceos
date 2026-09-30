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
  Mic,
  MicOff,
  Copy,
  ExternalLink,
  Wrench,
  Search,
  Activity,
  Briefcase,
  Car,
  Clock,
  MapPin,
  Mail,
  ShieldCheck,
  Code,
  Flame,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  parseBusinessText,
  generateAgentAndFormFromWizard,
} from '@/lib/forms/generators/ai-agent-wizard-service';
import type { CrawledWebsiteResult } from '@/lib/forms/generators/website-crawler-service';

export interface AgentSetupWizardProps {
  onComplete: (agent: FormAgentData, formId?: string) => void;
  onCancel?: () => void;
  siteOrigin?: string;
  initialAgent?: FormAgentData;
}

// ─── 4 Core Contractor & Field-Service Trades ────────────────────────────────
const VERTICAL_PRESETS = [
  {
    id: 'plumbing',
    label: 'Plumbing & Drain Care',
    icon: Wrench,
    desc: 'Burst pipes, active leaks, water heaters, clogged drains, emergency triage',
    prompt: 'We are a 24/7 licensed emergency plumbing service. We repair leaks, clear drains, install water heaters, and provide fast on-site dispatch.',
    defaultCapabilities: ['capture_leads', 'generate_quotes', 'book_appointments', 'collect_files', 'answer_questions'],
    defaultCustomerInfo: ['name', 'phone', 'address', 'urgency', 'photos', 'notes'],
  },
  {
    id: 'hvac',
    label: 'HVAC, Heating & Cooling',
    icon: Flame,
    desc: 'AC repair, furnace diagnostics, heat pumps, seasonal tune-ups, no-heat calls',
    prompt: 'We provide residential and commercial HVAC services including emergency AC repair, furnace diagnostics, heat pump maintenance, and seasonal tune-ups.',
    defaultCapabilities: ['capture_leads', 'generate_quotes', 'book_appointments', 'answer_questions'],
    defaultCustomerInfo: ['name', 'phone', 'address', 'urgency', 'notes'],
  },
  {
    id: 'roofing',
    label: 'Roofing & Storm Repairs',
    icon: Home,
    desc: 'Missing shingles, active roof leaks, gutter repair, free inspection estimates',
    prompt: 'We are a licensed roofing contractor specializing in roof leak repair, storm damage insurance claims, shingle replacement, and gutter installations.',
    defaultCapabilities: ['capture_leads', 'generate_quotes', 'book_appointments', 'collect_files', 'answer_questions'],
    defaultCustomerInfo: ['name', 'phone', 'address', 'urgency', 'photos', 'notes'],
  },
  {
    id: 'cleaning',
    label: 'Cleaning & Maid Services',
    icon: Sparkles,
    desc: 'Move-out deep cleans, recurring house cleaning, carpet sanitation & offices',
    prompt: 'We are a premier home and commercial cleaning company offering recurring maid visits, move-out deep cleaning, and post-construction sanitation.',
    defaultCapabilities: ['capture_leads', 'generate_quotes', 'book_appointments', 'answer_questions'],
    defaultCustomerInfo: ['name', 'phone', 'email', 'address', 'photos', 'notes'],
  },
];

// ─── 6 Core Mission Tasks ───────────────────────────────────────────────────
const CAPABILITY_OPTIONS = [
  {
    id: 'capture_leads',
    title: 'Qualify Leads & Emergencies',
    desc: 'Collect customer name, phone, address, and categorize urgent requests.',
    icon: Zap,
    badge: 'CRM',
  },
  {
    id: 'generate_quotes',
    title: 'Instant Scope & Price Estimates',
    desc: 'Calculate estimated project prices based on property size and choices.',
    icon: FileText,
    badge: 'ESTIMATOR',
  },
  {
    id: 'book_appointments',
    title: 'Book Appointments & Consultations',
    desc: 'Let customers choose preferred dates and times directly in conversation.',
    icon: Calendar,
    badge: 'SCHEDULING',
  },
  {
    id: 'collect_files',
    title: 'Collect Photos & Project Files',
    desc: 'Prompt visitors to upload pictures of damaged areas or documents.',
    icon: ImageIcon,
    badge: 'MEDIA',
  },
  {
    id: 'answer_questions',
    title: 'Answer Questions & FAQs 24/7',
    desc: 'Respond to business hours, service areas, licenses, and pricing inquiries.',
    icon: MessageSquare,
    badge: 'KNOWLEDGE',
  },
  {
    id: 'take_payments',
    title: 'Accept Upfront Deposits',
    desc: 'Request preliminary deposits or booking fees via Stripe or PayPal.',
    icon: CreditCard,
    badge: 'PAYMENTS',
  },
];

// ─── Customer Info Checklist Options ─────────────────────────────────────────
const CUSTOMER_INFO_OPTIONS = [
  { id: 'name', label: 'Full Name', desc: 'Customer legal or contact name', requiredAlways: true },
  { id: 'phone', label: 'Phone Number', desc: 'SMS updates and callback confirmation', requiredAlways: true },
  { id: 'email', label: 'Email Address', desc: 'Calendar invite and email confirmation' },
  { id: 'address', label: 'Service / Property Address', desc: 'Where the work or consultation will take place' },
  { id: 'photos', label: 'Problem / Property Photos', desc: 'Customer uploads photos of issue or area' },
  { id: 'urgency', label: 'Urgency Level', desc: 'Emergency 24hr vs. Scheduled vs. Gathering quotes' },
  { id: 'notes', label: 'Project Description / Notes', desc: 'Customer explains details in their own words' },
];

export function AgentSetupWizard({
  onComplete,
  onCancel,
  siteOrigin,
  initialAgent,
}: AgentSetupWizardProps) {
  // 6-Step Guided Flow
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1: Business Profile & Vertical
  const [selectedVertical, setSelectedVertical] = useState<string>('contractors');
  const [businessDescription, setBusinessDescription] = useState(VERTICAL_PRESETS[0].prompt);
  const [websiteScanUrl, setWebsiteScanUrl] = useState('');
  const [isScanningUrl, setIsScanningUrl] = useState(false);
  const [crawledData, setCrawledData] = useState<CrawledWebsiteResult | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Step 2: Capabilities & Tasks
  const [capabilities, setCapabilities] = useState<string[]>(VERTICAL_PRESETS[0].defaultCapabilities);

  // Step 3: Knowledge & Website Context
  const [knowledgeUrl, setKnowledgeUrl] = useState('');
  const [customFaqs, setCustomFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic'>('friendly');

  // Step 4: Required Customer Information
  const [requiredCustomerInfo, setRequiredCustomerInfo] = useState<string[]>(VERTICAL_PRESETS[0].defaultCustomerInfo);
  const [activeFields, setActiveFields] = useState<FormField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  // Step 5: Booking & Follow-up
  const [bookingDuration, setBookingDuration] = useState<number>(30);
  const [businessHours, setBusinessHours] = useState('Mon - Fri: 8:00 AM – 6:00 PM, Sat: 9:00 AM – 3:00 PM');
  const [autoConfirmMsg, setAutoConfirmMsg] = useState('Your appointment request has been scheduled! Our team will contact you shortly.');

  // Step 6: Preview & Launch
  const [previewTab, setPreviewTab] = useState<'agent' | 'form'>('agent');
  const [isSaving, setIsSaving] = useState(false);
  const [publishedAgent, setPublishedAgent] = useState<FormAgentData | null>(null);
  const [publishedFormId, setPublishedFormId] = useState<string | null>(null);

  // Voice dictation helper
  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (isListening) {
      if ((window as any).__wizardVoiceRecognizer) {
        try {
          (window as any).__wizardVoiceRecognizer.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('🎙️ Listening... Describe your business.');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setBusinessDescription((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permissions in browser.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      (window as any).__wizardVoiceRecognizer = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
      toast.error('Could not start microphone.');
    }
  };

  // Real-time generated artifacts
  const [generatedResult, setGeneratedResult] = useState(() =>
    generateAgentAndFormFromWizard({
      businessDescription: VERTICAL_PRESETS[0].prompt,
      capabilities: VERTICAL_PRESETS[0].defaultCapabilities,
      requiredCustomerInfo: VERTICAL_PRESETS[0].defaultCustomerInfo,
      bookingConfig: {
        durationMinutes: 30,
        businessHours: 'Mon - Fri: 8:00 AM – 6:00 PM, Sat: 9:00 AM – 3:00 PM',
        autoConfirmMessage: 'Your appointment request has been scheduled! Our team will contact you shortly.',
      },
      tone: 'friendly',
    })
  );

  // Synchronize generated state
  const updateGeneratedState = useCallback((overrideCrawled?: CrawledWebsiteResult) => {
    try {
      const activeCrawled = overrideCrawled !== undefined ? overrideCrawled : (crawledData || undefined);
      const res = generateAgentAndFormFromWizard({
        businessDescription: businessDescription.trim() || activeCrawled?.description || VERTICAL_PRESETS[0].prompt,
        capabilities,
        knowledgeUrl: knowledgeUrl || websiteScanUrl || activeCrawled?.url,
        tone,
        crawledContext: activeCrawled,
        requiredCustomerInfo,
        bookingConfig: {
          durationMinutes: bookingDuration,
          businessHours,
          autoConfirmMessage: autoConfirmMsg,
        },
      });
      setGeneratedResult(res);
      setActiveFields(res.form.fields);
      if (res.agent.knowledge?.faqPairs) {
        setCustomFaqs(res.agent.knowledge.faqPairs);
      }
    } catch (e) {
      console.error('Wizard generator error:', e);
    }
  }, [businessDescription, capabilities, knowledgeUrl, websiteScanUrl, tone, crawledData, requiredCustomerInfo, bookingDuration, businessHours, autoConfirmMsg]);

  // Initial populate
  useEffect(() => {
    updateGeneratedState();
  }, [updateGeneratedState]);

  // Select Vertical Preset
  const handleSelectVertical = (vertical: typeof VERTICAL_PRESETS[0]) => {
    setSelectedVertical(vertical.id);
    setBusinessDescription(vertical.prompt);
    setCapabilities(vertical.defaultCapabilities);
    setRequiredCustomerInfo(vertical.defaultCustomerInfo);
    toast.success(`Loaded preset: ${vertical.label}`);
  };

  // Fast-track website crawler
  const handleScanWebsite = async (urlToScan?: string) => {
    const target = (urlToScan || websiteScanUrl || knowledgeUrl).trim();
    if (!target) {
      toast.error('Please enter a website URL to scan (e.g. https://mybusiness.com)');
      return;
    }

    setIsScanningUrl(true);
    toast.info(`🔍 Scanning ${target}...`);
    try {
      const res = await fetch('/api/forms/ai-agent-wizard-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crawl',
          url: target,
        }),
      });
      const data = await res.json();
      if (res.ok && data.crawled) {
        const crawled: CrawledWebsiteResult = data.crawled;
        setCrawledData(crawled);
        setWebsiteScanUrl(target);
        setKnowledgeUrl(target);
        const autoDesc = `${crawled.businessName} - ${crawled.description}`;
        setBusinessDescription(autoDesc);
        if (crawled.faqPairs && crawled.faqPairs.length > 0) {
          setCustomFaqs(crawled.faqPairs);
        }
        updateGeneratedState(crawled);
        toast.success(`✨ Successfully scanned ${crawled.businessName}! Extracted ${crawled.services.length} services & FAQs.`);
      } else {
        toast.error(data.error || 'Could not scan website. You can continue by entering business details manually.');
      }
    } catch (err: any) {
      console.error('Failed to scan website:', err);
      toast.error('Network error scanning website. Continuing with manual mode.');
    } finally {
      setIsScanningUrl(false);
    }
  };

  // Toggle tasks / capabilities
  const toggleCapability = (capId: string) => {
    setCapabilities((prev) =>
      prev.includes(capId) ? prev.filter((id) => id !== capId) : [...prev, capId]
    );
  };

  // Toggle required customer info
  const toggleCustomerInfo = (infoId: string) => {
    if (infoId === 'name' || infoId === 'phone') return; // Mandatory
    setRequiredCustomerInfo((prev) =>
      prev.includes(infoId) ? prev.filter((id) => id !== infoId) : [...prev, infoId]
    );
  };

  // Add custom form field
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
    toast.success(`Added question: "${newField.label}"`);
  };

  // Remove field
  const handleRemoveField = (fieldId: string) => {
    setActiveFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  // Save & Deploy
  const handleFinalLaunch = async (mode: 'direct' | 'studio') => {
    setIsSaving(true);
    try {
      const targetKnowledgeUrl = knowledgeUrl || websiteScanUrl || crawledData?.url;

      const finalAgent: FormAgentData = {
        ...generatedResult.agent,
        voiceTone: tone,
        knowledge: {
          ...generatedResult.agent.knowledge,
          crawledUrls: targetKnowledgeUrl ? [targetKnowledgeUrl] : [],
          faqPairs: customFaqs.length > 0 ? customFaqs : generatedResult.agent.knowledge?.faqPairs || [],
        },
      };

      const res = await fetch('/api/forms/ai-agent-wizard-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDescription: businessDescription.trim() || crawledData?.description || 'Service Pro',
          businessName: crawledData?.businessName || undefined,
          capabilities,
          knowledgeUrl: targetKnowledgeUrl || undefined,
          tone,
          crawledContext: crawledData || undefined,
          requiredCustomerInfo,
          bookingConfig: {
            durationMinutes: bookingDuration,
            businessHours,
            autoConfirmMessage: autoConfirmMsg,
          },
          save: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('🎉 AI Intake Employee deployed successfully!');
        const savedAgent: FormAgentData = {
          ...finalAgent,
          id: data.savedAgentId || finalAgent.id,
          slug: data.agent?.slug || finalAgent.slug,
          connectedForms: data.savedFormId
            ? [
                {
                  id: data.savedFormId,
                  name: data.form?.name || generatedResult.form.name,
                  description: data.form?.description || generatedResult.form.description,
                  submissionCount: 0,
                },
              ]
            : [],
        };
        setPublishedAgent(savedAgent);
        setPublishedFormId(data.savedFormId || null);
        onComplete(savedAgent, data.savedFormId);
      } else {
        toast.success('🎉 AI Employee generated!');
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

  const parsedBusiness = useMemo(() => {
    if (crawledData) {
      return {
        businessName: crawledData.businessName,
        industry: crawledData.industry,
        location: crawledData.location,
        services: crawledData.services,
        summary: crawledData.description,
      };
    }
    return parseBusinessText(businessDescription);
  }, [businessDescription, crawledData]);

  // Origin for links
  const origin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
  const agentSlug = publishedAgent?.slug || generatedResult.agent.slug || 'intake-agent';
  const hostedIntakeUrl = `${origin}/chat/${publishedAgent?.id || 'preview'}`;
  const embedCodeSnippet = `<script src="${origin}/embed.js" data-agent-id="${publishedAgent?.id || 'ai_agent_id'}" async></script>`;

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
              AI Employee &amp; Intake Setup
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                2026 AI-Native
              </Badge>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Configure your 24/7 AI employee to interview visitors, collect project photos, qualify leads, and book appointments.
            </p>
          </div>
        </div>

        {/* Step Indicator Badges (6 Steps) */}
        <div className="hidden lg:flex items-center gap-1.5">
          {[
            { num: 1, label: '1. Business' },
            { num: 2, label: '2. Tasks' },
            { num: 3, label: '3. Website & Info' },
            { num: 4, label: '4. Intake Info' },
            { num: 5, label: '5. Booking' },
            { num: 6, label: '6. Publish' },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num as any)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
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

        {/* Skip / Exit */}
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Exit Setup
            </Button>
          )}
        </div>
      </header>

      {/* ─── SPLIT VIEW BODY (Left: Stepper Controls | Right: Live Simulator) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: GUIDED STEPPER CONTROLS */}
        <div className="w-full lg:w-[55%] xl:w-[50%] h-full flex flex-col justify-between overflow-y-auto p-6 md:p-8 border-r border-border/70 bg-white dark:bg-slate-900/60">
          <div className="space-y-6 max-w-xl mx-auto w-full">
            {/* ─── STEP 1: BUSINESS TYPE & VERTICAL ─── */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 1 of 6 · Business Type
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    What business do you run?
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select your vertical below or describe your business. Your AI Employee will automatically adopt the vocabulary, urgency thresholds, and workflows for your profession.
                  </p>
                </div>

                {/* Vertical Presets Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {VERTICAL_PRESETS.map((vp) => {
                    const isSelected = selectedVertical === vp.id;
                    const Icon = vp.icon;
                    return (
                      <button
                        key={vp.id}
                        type="button"
                        onClick={() => handleSelectVertical(vp)}
                        className={cn(
                          'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5',
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-950 border-border/80 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            'size-7 rounded-lg flex items-center justify-center',
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                          )}>
                            <Icon className="size-3.5" />
                          </div>
                          {isSelected && <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0 h-4">Selected</Badge>}
                        </div>
                        <p className="text-xs font-black text-foreground">{vp.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{vp.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Description & Voice Dictation */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Fine-tune your business services:
                    </label>
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        isListening
                          ? "bg-red-500 text-white border-red-500 animate-pulse shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-foreground border-border/80"
                      )}
                    >
                      {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5 text-emerald-600" />}
                      <span>{isListening ? 'Listening...' : 'Voice Dictate'}</span>
                    </button>
                  </div>
                  <Textarea
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    rows={3}
                    className="text-xs leading-relaxed resize-none rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border-border/90"
                    placeholder="Describe your services, location, or emergency response policy..."
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 2: AGENT TASKS & MISSIONS ─── */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 2 of 6 · Tasks &amp; Actions
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    What should your AI employee do?
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose the specific jobs you want automated. Rather than just chatting, your agent will execute these real business actions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <div className={cn(
                            'size-8 rounded-xl flex items-center justify-center shrink-0',
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                          )}>
                            <Icon className="size-4" />
                          </div>
                          <div className={cn(
                            'size-4 rounded-md border flex items-center justify-center transition-all',
                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                          )}>
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
              </div>
            )}

            {/* ─── STEP 3: WEBSITE & KNOWLEDGE BASE ─── */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 3 of 6 · Website &amp; Knowledge
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Connect your website &amp; knowledge
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste your website URL. Our crawler will extract your services, FAQs, service area, and brand colors so your AI speaks with complete accuracy.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/90 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Globe className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                      Scan Website
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Input
                      value={websiteScanUrl}
                      onChange={(e) => setWebsiteScanUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanWebsite()}
                      placeholder="https://mybusiness.com"
                      className="text-xs h-9 rounded-xl font-sans bg-white dark:bg-slate-900 border-border/80"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isScanningUrl}
                      onClick={() => handleScanWebsite()}
                      className="h-9 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer shadow-xs gap-1.5"
                    >
                      {isScanningUrl ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Scanning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" /> Scan Website
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Owner Knowledge Review & Verification Card */}
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      Verify Extracted Business Knowledge
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                      Owner Review
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Review and adjust these key facts before publishing. Your AI Employee strictly uses this data to qualify visitors and dispatch emergency technicians.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Business Name
                      </label>
                      <Input
                        value={crawledData?.businessName || parsedBusiness.businessName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (crawledData) {
                            const updated = { ...crawledData, businessName: val };
                            setCrawledData(updated);
                            updateGeneratedState(updated);
                          } else {
                            setBusinessDescription(val);
                            updateGeneratedState();
                          }
                        }}
                        placeholder="e.g. Apex Plumbing & HVAC"
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-border/80"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Dispatch Phone (Callbacks)
                      </label>
                      <Input
                        value={crawledData?.phone || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = crawledData ? { ...crawledData, phone: val } : {
                            url: websiteScanUrl,
                            businessName: parsedBusiness.businessName || 'Business',
                            industry: 'Contractors',
                            description: businessDescription,
                            services: parsedBusiness.services,
                            phone: val,
                            faqPairs: customFaqs,
                            primaryColor: '#059669',
                          };
                          setCrawledData(updated);
                          updateGeneratedState(updated);
                        }}
                        placeholder="e.g. (555) 234-5678"
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-border/80"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Service Area / Location
                      </label>
                      <Input
                        value={crawledData?.location || parsedBusiness.location || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = crawledData ? { ...crawledData, location: val } : {
                            url: websiteScanUrl,
                            businessName: parsedBusiness.businessName || 'Business',
                            industry: 'Contractors',
                            description: businessDescription,
                            services: parsedBusiness.services,
                            location: val,
                            faqPairs: customFaqs,
                            primaryColor: '#059669',
                          };
                          setCrawledData(updated);
                          updateGeneratedState(updated);
                        }}
                        placeholder="e.g. Austin & Travis County"
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-border/80"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Operating Hours
                      </label>
                      <Input
                        value={businessHours}
                        onChange={(e) => {
                          setBusinessHours(e.target.value);
                          updateGeneratedState();
                        }}
                        placeholder="Mon - Fri: 8am - 6pm"
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-border/80"
                      />
                    </div>
                  </div>
                </div>

                {/* FAQs Preview */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Extracted Business FAQs ({customFaqs.length})
                  </label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {customFaqs.slice(0, 4).map((faq, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-border/70 bg-white dark:bg-slate-900/50 text-xs space-y-1">
                        <p className="font-bold text-foreground">Q: {faq.question}</p>
                        <p className="text-[11px] text-muted-foreground">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tone of Voice */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Conversation Tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'friendly', label: 'Friendly & Warm' },
                      { id: 'professional', label: 'Professional & Direct' },
                      { id: 'medical', label: 'Clinical / Empathetic' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id as any)}
                        className={cn(
                          'py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          tone === t.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-border/80 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 4: REQUIRED CUSTOMER INFORMATION ─── */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 4 of 6 · Intake Checklist
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Required customer information
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Check the details your AI employee must collect before booking an appointment or providing an estimate.
                  </p>
                </div>

                <div className="space-y-2">
                  {CUSTOMER_INFO_OPTIONS.map((opt) => {
                    const isChecked = requiredCustomerInfo.includes(opt.id);
                    const isLocked = opt.requiredAlways;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleCustomerInfo(opt.id)}
                        className={cn(
                          'p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer',
                          isChecked
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/40 shadow-2xs'
                            : 'bg-white dark:bg-slate-950 border-border/70 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            'size-4 rounded border flex items-center justify-center transition-all shrink-0',
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                          )}>
                            {isChecked && <Check className="size-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground">{opt.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{opt.desc}</p>
                          </div>
                        </div>
                        {isLocked && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                            Always Required
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Question */}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomField()}
                    placeholder="Add custom question (e.g. Gate code, Pet in house?)..."
                    className="text-xs h-9 rounded-xl font-sans"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustomField}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 5: BOOKING & FOLLOW-UP ─── */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 5 of 6 · Booking &amp; Follow-Up
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Configure scheduling rules
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Set up appointment windows, working hours, and the automatic confirmation message your AI delivers immediately upon booking.
                  </p>
                </div>

                {/* Appointment Duration */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="size-3.5 text-emerald-600" /> Default Appointment Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setBookingDuration(dur)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                          bookingDuration === dur
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-border/80 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {dur} Mins
                      </button>
                    ))}
                  </div>
                </div>

                {/* Business Operating Hours */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Operating Schedule
                  </label>
                  <Input
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    className="text-xs h-9 rounded-xl font-sans"
                    placeholder="e.g. Mon-Fri 8:00 AM - 6:00 PM, Sat 9:00 AM - 3:00 PM"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The agent references these hours when scheduling visits and informing customers.
                  </p>
                </div>

                {/* Auto-Confirmation Message */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Mail className="size-3.5 text-blue-600" /> Instant Confirmation Message
                  </label>
                  <Textarea
                    value={autoConfirmMsg}
                    onChange={(e) => setAutoConfirmMsg(e.target.value)}
                    rows={3}
                    className="text-xs leading-relaxed resize-none rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 6: PREVIEW, TEST & PUBLISH ─── */}
            {step === 6 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Step 6 of 6 · Ready to Deploy
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Test and publish your AI Employee
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Test the conversation live on the simulator on the right. Once you're ready, deploy with one click to get your embed snippet and hosted link.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border/80 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground">{generatedResult.agent.name}</h4>
                      <p className="text-xs text-muted-foreground">{generatedResult.agent.roleTitle}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tasks Enabled</span>
                      <span className="font-semibold text-foreground">{capabilities.length} autonomous tasks</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Intake Fields</span>
                      <span className="font-semibold text-foreground">{requiredCustomerInfo.length} data points</span>
                    </div>
                  </div>
                </div>

                {/* Publish & Embed Snippet Box */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Code className="size-3.5" /> 1-Line Website Embed
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(embedCodeSnippet);
                        toast.success('Embed snippet copied!');
                      }}
                      className="text-xs h-7 px-2 text-slate-300 hover:text-white"
                    >
                      <Copy className="size-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono bg-black/40 p-2.5 rounded-lg overflow-x-auto text-emerald-300">
                    {embedCodeSnippet}
                  </pre>
                  <p className="text-[10px] text-slate-400">
                    Paste this snippet before <code>&lt;/body&gt;</code> on your website, WordPress, Squarespace, or Webflow.
                  </p>
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

            {step < 6 ? (
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
                  Open in Studio
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={() => handleFinalLaunch('direct')}
                  className="text-xs font-bold h-9 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Deploying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Deploy AI Employee
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SIDE-BY-SIDE SIMULATOR & PREVIEW */}
        <div className="w-full lg:w-[45%] xl:w-[50%] h-full bg-slate-100/70 dark:bg-slate-950 flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden">
          {/* Header Switcher: 💬 Agent vs 📄 Intake Form */}
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
                <MessageSquare className="size-3" /> AI Employee
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
                      ) : f.type === 'dropdown' || f.type === 'radio' ? (
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
