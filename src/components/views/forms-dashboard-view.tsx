'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import {
  FileInput,
  Inbox,
  TrendingUp,
  PhoneCall,
  BookOpen,
  ArrowRight,
  Plus,
  LayoutGrid,
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  CalendarClock,
  UserCircle,
  Sparkles,
  ExternalLink,
  Bot,
  CreditCard,
  Wand2,
  Loader2,
  Send,
  Mic,
  MicOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TemplatePickerDialog } from '@/features/forms/components/builder/template-picker-dialog';
import type { FormTemplate } from '@/lib/forms/templates';

interface FormsDashboardStats {
  totalForms: number;
  totalSubmissions: number;
  totalBookings?: number;
  waitingChatsCount?: number;
  activeChatsCount?: number;
  upcomingBookings?: Array<{
    id: string;
    title: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    scheduledAt: string | null;
    status: string;
    source: string;
  }>;
  conversionRate: number;
  activeForms: number;
  aiAgentStatus: 'none' | 'draft' | 'active' | 'paused';
  kbDocuments: number;
  recentSubmissions: Array<{
    id: string;
    respondent: string | null;
    formName: string;
    source: string;
    createdAt: string;
    hasLead: boolean;
  }>;
}

/**
 * FormsDashboardView — dedicated dashboard for the standalone AI Forms product.
 *
 * Shows Forms-specific KPIs (total forms, submissions, conversion rate),
 * AI agent status, knowledge base status, and recent submissions.
 * This is the landing view for users with workspace.productType='forms'.
 */

const DASHBOARD_QUICK_STARTERS = [
  {
    id: 'cleaning',
    label: '🧹 Home Cleaning',
    text: 'We are a home cleaning company serving London. We offer regular cleaning, deep cleaning and end-of-tenancy cleaning.',
  },
  {
    id: 'plumbing',
    label: '🔧 Emergency Plumbing',
    text: 'We are a 24/7 emergency plumbing service in Manchester. We fix burst pipes, clogged drains, leaking faucets, and install hot water systems.',
  },
  {
    id: 'hvac',
    label: '❄️ HVAC Dispatch',
    text: 'We provide heating, air conditioning repair, furnace maintenance, and new heat pump installations across Austin, Texas.',
  },
  {
    id: 'dental',
    label: '🩺 Dental Clinic',
    text: 'We are a modern family dental clinic offering routine checkups, emergency toothache care, teeth whitening, and hygiene appointments.',
  },
  {
    id: 'roofing',
    label: '🏠 Roofing Estimate',
    text: 'We are a licensed roofing contractor in Dallas specializing in storm damage inspection, roof replacement, shingle repair, and gutter systems.',
  },
  {
    id: 'legal',
    label: '⚖️ Legal Consultation',
    text: 'We are a boutique law firm offering confidential case reviews, personal injury consultations, contract drafts, and corporate advice.',
  },
  {
    id: 'real_estate',
    label: '🏢 Real Estate & Tours',
    text: 'We are a premier real estate agency helping buyers and tenants book private property viewings and request comprehensive home market valuations.',
  },
  {
    id: 'auto',
    label: '🚗 Auto Repair',
    text: 'We operate a full-service auto repair and diagnostic garage in Birmingham, offering brakes, engine diagnostics, oil changes, and towing.',
  },
];

export function FormsDashboardView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [stats, setStats] = useState<FormsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (isListening) {
      if ((window as any).__formVoiceRecognizer) {
        try {
          (window as any).__formVoiceRecognizer.stop();
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
        toast.info('🎙️ Listening... Speak your prompt naturally.');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setAiPrompt((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permissions in your browser settings.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      (window as any).__formVoiceRecognizer = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
      toast.error('Could not start microphone.');
    }
  };

  const handleGenerateWithAi = async (customPrompt?: string) => {
    const text = (customPrompt || aiPrompt).trim();
    if (!text) {
      toast.error('Please describe what you want to build');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await authFetch('/api/forms/ai-agent-wizard-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDescription: text,
          capabilities: ['answer_questions', 'capture_leads', 'generate_quotes', 'book_appointments', 'collect_files'],
          save: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.savedFormId) {
        toast.success('🎉 AI Form and Agent generated successfully!');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('fieseros_active_edit_form_id', data.savedFormId);
          try {
            sessionStorage.removeItem('pendingTemplateId');
            localStorage.removeItem('fieseros_pending_template_id');
          } catch {}
        }
        setCurrentView('formBuilder');
      } else {
        toast.error(data.error || 'Failed to generate form');
      }
    } catch {
      toast.error('Could not generate form. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePickTemplate = (_template: FormTemplate) => {
    // The picked template id is stashed in sessionStorage; form-builder-view
    // reads it on mount and pre-populates formData before opening the studio.
    // (We use sessionStorage instead of a store to avoid coupling the
    // dashboard to the builder's form-state shape.)
    try {
      sessionStorage.setItem('pendingTemplateId', _template.id);
    } catch {
      // sessionStorage may be unavailable (SSR / private mode) — non-fatal.
    }
    setCurrentView('formBuilder');
  };

  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/forms/dashboard-stats');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }

      authFetch('/api/creator/profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d?.profile) {
            setCreatorProfile(d.profile);
          }
        })
        .catch(() => {});
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Forms',
      value: stats?.totalForms ?? 0,
      icon: FileInput,
      color: 'text-emerald-600',
      onClick: () => setCurrentView('formBuilder'),
    },
    {
      label: 'Submissions',
      value: stats?.totalSubmissions ?? 0,
      icon: Inbox,
      color: 'text-blue-600',
      onClick: () => setCurrentView('formSubmissions'),
    },
    {
      label: 'Appointments',
      value: stats?.totalBookings ?? 0,
      icon: Calendar,
      color: 'text-purple-600',
      badge: 'Calendly Engine',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      onClick: () => setCurrentView('formAppointments'),
    },
    {
      label: 'Live Chat',
      value: stats?.activeChatsCount ?? 0,
      icon: MessageSquare,
      color: 'text-emerald-600',
      badge: (stats?.waitingChatsCount ?? 0) > 0 ? `${stats?.waitingChatsCount} Waiting` : 'Text.com',
      badgeClass:
        (stats?.waitingChatsCount ?? 0) > 0
          ? 'bg-amber-500 text-white font-bold animate-pulse'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      onClick: () => setCurrentView('liveChat'),
    },
    {
      label: 'Conversion Rate',
      value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
    },
    {
      label: 'Active Forms',
      value: stats?.activeForms ?? 0,
      icon: FileInput,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 w-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Forms Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build intelligent forms, train your AI agent, and capture leads — all in one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs h-9 rounded-xl shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.setItem('open_agent_setup_wizard', 'true');
              setCurrentView('formBuilder');
            }}
          >
            <Sparkles className="size-4" />
            <span>AI Agent Wizard</span>
          </Button>
          <Button variant="outline" onClick={() => setTemplatePickerOpen(true)}>
            <LayoutGrid className="w-4 h-4 mr-2" />
            Browse Templates
          </Button>
          <Button onClick={() => setCurrentView('formBuilder')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Form
          </Button>
        </div>
      </div>

      {/* ── INTENT-FIRST AI HERO: DESCRIBE WHAT YOU WANT TO CREATE ── */}
      <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900/40 dark:to-transparent p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                What do you want to create today?
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  GPTForm 2026
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Describe your goal in plain English — AI will generate your form, booking calendar, Stripe payment, and conversational agent.
              </p>
            </div>
          </div>
        </div>

        {/* Big Natural Language Input */}
        <div className="relative rounded-2xl border border-border/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-2 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerateWithAi();
              }
            }}
            placeholder="e.g. Create a dental clinic booking form with treatment selection, 30-min calendar appointment slot, and £50 deposit..."
            rows={3}
            className="w-full text-xs sm:text-sm border-0 focus-visible:ring-0 resize-none bg-transparent p-2 text-foreground font-sans placeholder:text-muted-foreground/70"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border/50 px-2 pb-1">
            {/* Quick Starters */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Quick Starters:</span>
              {DASHBOARD_QUICK_STARTERS.slice(0, 4).map((qs) => (
                <button
                  key={qs.id}
                  type="button"
                  onClick={() => {
                    setAiPrompt(qs.text);
                    handleGenerateWithAi(qs.text);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 border border-border/70 transition-all cursor-pointer text-foreground shrink-0"
                >
                  {qs.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Dictate prompt with voice"}
                className={cn(
                  "h-9 px-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all cursor-pointer",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse shadow-md shadow-red-500/20"
                    : "border-border/80 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="size-3.5" />
                    <span className="text-[11px] font-bold">Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-medium hidden sm:inline">Voice Dictation</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                disabled={aiGenerating}
                onClick={() => handleGenerateWithAi()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer shrink-0"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating Project...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Build with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Start directly with Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground">Or start directly with:</span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.setItem('open_agent_setup_wizard', 'true');
              setCurrentView('formBuilder');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="size-3.5 text-white" />
            <span>AI Agent Wizard</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.setItem('open_agent_studio', 'true');
              setCurrentView('agentStudio');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shadow-2xs"
          >
            <Bot className="size-3.5 text-blue-600" />
            <span>AI Agent Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('formBuilder')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shadow-2xs"
          >
            <FileInput className="size-3.5 text-emerald-600" />
            <span>Blank Form</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.setItem('pendingFormStudioTab', 'scheduling');
              setCurrentView('formBuilder');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shadow-2xs"
          >
            <Calendar className="size-3.5 text-purple-600" />
            <span>Booking &amp; Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.setItem('pendingFormStudioTab', 'offers');
              setCurrentView('formBuilder');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shadow-2xs"
          >
            <CreditCard className="size-3.5 text-amber-600" />
            <span>Payment &amp; Offers</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 border border-border/80 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer shadow-2xs"
          >
            <LayoutGrid className="size-3.5 text-slate-600" />
            <span>50+ Templates</span>
          </button>
        </div>
      </div>

      {/* ── HUMAN OPERATOR ESCALATION ALERT BANNER ── */}
      {(stats?.waitingChatsCount ?? 0) > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {stats?.waitingChatsCount} visitor(s) waiting for a live human specialist!
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                A customer on your website chat requested live operator assistance. Join the conversation now.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCurrentView('liveChat')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-8 font-medium shrink-0 shadow-2xs"
          >
            Open Live Chat Console
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ── TOPMATE-STYLE PUBLIC STOREFRONT CARD ── */}
      {creatorProfile?.isEnabled ? (
        <div className="p-5 rounded-2xl border bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <UserCircle className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Your Creator Storefront &amp; Public Page</h3>
                <Badge className="bg-emerald-500 text-white text-[10px] font-bold">Live</Badge>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Live at /p/{creatorProfile.handle || 'creator'} for 1:1 call bookings, priority Q&amp;A, and digital product downloads.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentView('creatorProfile')}
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs font-bold rounded-xl h-8 gap-1.5"
            >
              <UserCircle className="size-3.5" />
              Edit Profile
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                sessionStorage.setItem('pendingFormStudioTab', 'offers');
                setCurrentView('formBuilder');
              }}
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs font-bold rounded-xl h-8 gap-1.5"
            >
              <Sparkles className="size-3.5" />
              Special Offers
            </Button>

            <Button
              size="sm"
              onClick={() => window.open(`/p/${creatorProfile.handle || 'creator'}`, '_blank')}
              className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl h-8 gap-1.5 shadow-xs"
            >
              <span>View Live Page</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-foreground shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <UserCircle className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Personal Creator Storefront (@page)</h3>
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-slate-300 dark:border-slate-700">Optional</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Want a personalized link-in-bio page to monetize 1:1 consultations and digital resources? Your primary CRM marketplace listing remains separate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setCurrentView('creatorProfile')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-8 gap-1.5 shadow-xs"
            >
              <Sparkles className="size-3.5" />
              Set Up &amp; Publish
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn('cursor-pointer transition-shadow hover:shadow-md', kpi.onClick ? '' : 'cursor-default')}
            onClick={kpi.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                {kpi.badge && (
                  <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded', kpi.badgeClass || 'bg-purple-500/10 text-purple-600 dark:text-purple-400')}>
                    {kpi.badge}
                  </span>
                )}
              </div>
              <kpi.icon className={cn('w-4 h-4', kpi.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Agent + Knowledge Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              AI Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  stats?.aiAgentStatus === 'active' ? 'default' :
                  stats?.aiAgentStatus === 'draft' ? 'secondary' :
                  stats?.aiAgentStatus === 'paused' ? 'secondary' :
                  'outline'
                }
              >
                {stats?.aiAgentStatus === 'none' ? 'Not configured' :
                 stats?.aiAgentStatus === 'draft' ? 'Draft' :
                 stats?.aiAgentStatus === 'active' ? 'Active' :
                 stats?.aiAgentStatus === 'paused' ? 'Paused' : 'Unknown'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCurrentView('aiReceptionist')}
            >
              {stats?.aiAgentStatus === 'none' ? 'Set up AI Agent' : 'Manage Agent'}
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Documents indexed</span>
              <span className="text-lg font-semibold">{stats?.kbDocuments ?? 0}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCurrentView('aiAssistant')}
            >
              Manage Knowledge
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submissions & Calendly Appointments Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-emerald-600" />
                Recent Inquiries &amp; Leads
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('formSubmissions')}>
                View all
                <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Inbox className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sub.respondent || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sub.formName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.hasLead && (
                        <Badge variant="default" className="text-xs">Lead</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{sub.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No submissions yet. Create a form and share it to start collecting leads.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments (Calendly Engine) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Appointments &amp; Bookings
                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded ml-1">
                  Calendly Engine
                </span>
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1 font-semibold" onClick={() => setCurrentView('scheduling')}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Event Types
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('formAppointments')}>
                  Manage
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.upcomingBookings && stats.upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {b.customerName || 'Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {b.title || 'Scheduled Appointment'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs capitalize border-purple-500/30 text-purple-600 dark:text-purple-400">
                        {b.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50 text-purple-500" />
                <p className="text-sm font-medium">No upcoming appointments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add an Appointment field to any form to let customers book directly into your calendar.
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    onClick={() => setCurrentView('formAppointments')}
                  >
                    <Calendar className="size-3.5" /> Bookings Console
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => setCurrentView('scheduling')}
                  >
                    <CalendarClock className="size-3.5" /> Event Types &amp; Availability
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Picker Dialog (T1.6) */}
      <TemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onPick={handlePickTemplate}
      />
    </div>
  );
}
