'use client';

import React, { useState } from 'react';
import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  HelpCircle,
  MessageSquare,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Zap,
  Check,
  ChevronRight,
  CreditCard,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PersonaKey = 'consultant' | 'designer' | 'coach';

interface PersonaData {
  name: string;
  handle: string;
  role: string;
  bio: string;
  avatarBg: string;
  avatarInitials: string;
  rating: string;
  reviewsCount: string;
  services: {
    id: string;
    title: string;
    type: 'call' | 'qa' | 'product';
    tag: string;
    usd: string;
    inr: string;
    description: string;
    duration?: string;
  }[];
  aiPrompts: {
    q: string;
    a: string;
  }[];
}

const PERSONAS: Record<PersonaKey, PersonaData> = {
  consultant: {
    name: 'Alex Rivera',
    handle: 'alex-rivera',
    role: 'B2B Growth & AI Architecture Advisor',
    bio: 'Ex-Stripe VP of Growth. Helping seed-to-Series B founders scale GTM pipelines & autonomous AI workflows.',
    avatarBg: 'bg-emerald-600',
    avatarInitials: 'AR',
    rating: '4.98',
    reviewsCount: '184',
    services: [
      {
        id: 'call-1',
        title: '1:1 Growth Strategy Deep Dive',
        type: 'call',
        tag: 'MOST POPULAR',
        usd: '$99',
        inr: '₹1,999',
        duration: '45 mins',
        description: 'Direct roadmap audit, unit economics review, and step-by-step scaling plan.',
      },
      {
        id: 'qa-1',
        title: 'Priority Architecture Q&A',
        type: 'qa',
        tag: '24H RESPONSE',
        usd: '$39',
        inr: '₹799',
        duration: '24-hour reply',
        description: 'Submit your tech stack or GTM question. Receive an in-depth Loom & written critique.',
      },
      {
        id: 'prod-1',
        title: 'Series-A Ready Financial & GTM Model',
        type: 'product',
        tag: 'INSTANT DOWNLOAD',
        usd: '$49',
        inr: '₹999',
        description: 'The exact Notion & Sheets models used to close $24M in venture capital.',
      },
    ],
    aiPrompts: [
      {
        q: 'What is your typical consulting rate & availability?',
        a: "Alex offers 45-minute deep dives for $99 (or ₹1,999). He usually has 3-4 open slots per week on Tuesdays and Thursdays.",
      },
      {
        q: 'Do you work with early-stage pre-seed startups?',
        a: "Yes! Alex specializes in early-stage founder mentoring, MVP scoping, and initial customer discovery funnels.",
      },
      {
        q: 'What should I prepare before our 1:1 call?',
        a: "Bring your current MRR metrics, CAC/LTV estimates, and your #1 bottleneck. Alex will review them live on screen.",
      },
    ],
  },
  designer: {
    name: 'Elena Rostova',
    handle: 'elena-design',
    role: 'Principal UX & Conversion Designer',
    bio: 'Designed products for 4M+ users at Linear & Loom. Specializing in high-converting SaaS landing pages.',
    avatarBg: 'bg-teal-600',
    avatarInitials: 'ER',
    rating: '5.0',
    reviewsCount: '92',
    services: [
      {
        id: 'call-2',
        title: 'Live 30-Min UX / Landing Page Teardown',
        type: 'call',
        tag: 'HIGH CONVERSION',
        usd: '$89',
        inr: '₹1,799',
        duration: '30 mins',
        description: 'Live screen-share session diagnosing your conversion friction, typography, and copy.',
      },
      {
        id: 'qa-2',
        title: 'Figma Component & System Review',
        type: 'qa',
        tag: 'QUICK AUDIT',
        usd: '$45',
        inr: '₹899',
        duration: 'Same day',
        description: 'Send your Figma link for expert layout, auto-layout, and token feedback.',
      },
      {
        id: 'prod-2',
        title: 'SaaS High-Converting Design System',
        type: 'product',
        tag: 'FIGMA KIT',
        usd: '$59',
        inr: '₹1,199',
        description: '600+ handcrafted components, dark-mode tokens, and tested checkout templates.',
      },
    ],
    aiPrompts: [
      {
        q: 'What tools do you design in?',
        a: 'Elena designs exclusively in Figma and exports production-ready tokens for Tailwind CSS and React.',
      },
      {
        q: 'Can you redesign our entire web app?',
        a: 'Yes, Elena takes 1 full redesign client per month. Book a 30-minute discovery call to discuss scope.',
      },
      {
        q: 'How fast will I get my Figma audit?',
        a: 'Priority Figma reviews are delivered via Loom video within 24 hours of submission.',
      },
    ],
  },
  coach: {
    name: 'Marcus Vance',
    handle: 'marcus-coach',
    role: 'Executive & Career Transition Coach',
    bio: 'Guided 300+ professionals into senior leadership and VP roles at FAANG, OpenAI, and unicorn startups.',
    avatarBg: 'bg-emerald-700',
    avatarInitials: 'MV',
    rating: '4.95',
    reviewsCount: '210',
    services: [
      {
        id: 'call-3',
        title: 'Executive Career Transition Strategy',
        type: 'call',
        tag: 'TRANSFORMATIVE',
        usd: '$120',
        inr: '₹2,499',
        duration: '60 mins',
        description: 'Clarify target executive roles, negotiate higher compensation, and position your brand.',
      },
      {
        id: 'qa-3',
        title: 'Resume & LinkedIn Headline Overhaul',
        type: 'qa',
        tag: 'FAST TRACK',
        usd: '$49',
        inr: '₹999',
        duration: '24-hour turnaround',
        description: 'Detailed line-by-line rewrite of your resume and LinkedIn summary.',
      },
      {
        id: 'prod-3',
        title: 'The VP Interview & Negotiation Bible',
        type: 'product',
        tag: 'BESTSELLER',
        usd: '$35',
        inr: '₹699',
        description: '14 scripts for 6-figure salary negotiations and behavioral executive rounds.',
      },
    ],
    aiPrompts: [
      {
        q: 'How does Marcus conduct coaching sessions?',
        a: 'All sessions are held privately over Google Meet with recording and structured action items provided after.',
      },
      {
        q: 'Who is this coaching program best suited for?',
        a: 'Mid-to-senior engineers, product managers, and directors targeting Staff, Principal, or VP positions.',
      },
      {
        q: 'What is the refund or rescheduling policy?',
        a: 'Rescheduling is free up to 12 hours prior. Full money-back satisfaction guarantee on all 1:1 sessions.',
      },
    ],
  },
};

export function BusinessPageDemo() {
  const [activePersona, setActivePersona] = useState<PersonaKey>('consultant');
  const [currency, setCurrency] = useState<'usd' | 'inr'>('usd');
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'products' | 'ask'>('all');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [bookedService, setBookedService] = useState<string | null>(null);

  const persona = PERSONAS[activePersona];

  const handleAskQuestion = (promptObj: { q: string; a: string }) => {
    setIsTyping(true);
    setChatAnswer(null);
    setTimeout(() => {
      setIsTyping(false);
      setChatAnswer(promptObj.a);
    }, 400);
  };

  const handleBook = (id: string) => {
    setBookedService(id);
    setTimeout(() => {
      setBookedService(null);
    }, 2800);
  };

  return (
    <div className="w-full rounded-2xl border-2 border-emerald-500/20 bg-background/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">
      {/* ── Top Simulator Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/60 px-4 py-3">
        {/* Persona Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-background rounded-xl border border-border shadow-xs">
          {(['consultant', 'designer', 'coach'] as PersonaKey[]).map((pKey) => (
            <button
              key={pKey}
              onClick={() => {
                setActivePersona(pKey);
                setChatAnswer(null);
              }}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition capitalize cursor-pointer',
                activePersona === pKey
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {pKey === 'consultant' ? '💼 Advisor' : pKey === 'designer' ? '🎨 Designer' : '🎓 Coach'}
            </button>
          ))}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">Currency:</span>
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs font-bold">
            <button
              onClick={() => setCurrency('usd')}
              className={cn(
                'px-2 py-0.5 rounded cursor-pointer transition',
                currency === 'usd' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'
              )}
            >
              $ USD
            </button>
            <button
              onClick={() => setCurrency('inr')}
              className={cn(
                'px-2 py-0.5 rounded cursor-pointer transition',
                currency === 'inr' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'
              )}
            >
              ₹ INR
            </button>
          </div>
        </div>
      </div>

      {/* ── Browser Mockup URL Bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 mx-2 flex items-center gap-2 px-3 py-1 bg-background border border-border/60 rounded-md text-[11px] font-mono text-foreground/80">
          <Globe className="size-3 text-emerald-600 shrink-0" />
          <span>fieseros.com/p/{persona.handle}</span>
          <Badge variant="outline" className="ml-auto text-[9px] text-emerald-600 border-emerald-500/30 font-sans">
            LIVE PREVIEW
          </Badge>
        </div>
      </div>

      {/* ── Live Business Page Body ── */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-h-[640px] overflow-y-auto">
        {/* Creator Hero Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border/80">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'size-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0',
                persona.avatarBg
              )}
            >
              {persona.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                  {persona.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  VERIFIED PRO
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{persona.role}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="size-3 fill-amber-500" /> {persona.rating}
                </span>
                <span>•</span>
                <span>{persona.reviewsCount} happy clients</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 gap-1.5 rounded-lg border-border w-full sm:w-auto font-medium"
              onClick={() => {
                navigator.clipboard?.writeText?.(`https://fieseros.com/p/${persona.handle}`);
              }}
            >
              <Share2 className="size-3.5 text-muted-foreground" />
              Copy Link
            </Button>
          </div>
        </div>

        {/* Short Bio */}
        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-normal bg-muted/40 p-3 rounded-xl border border-border/60">
          {persona.bio}
        </p>

        {/* ── AI Conversational Assistant Widget ── */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Ask {persona.name.split(' ')[0]}&apos;s AI Assistant
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">Online 24/7 • Instant responses</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5">
              Knowledge Grounded
            </Badge>
          </div>

          {/* Quick Question Chips */}
          <div className="flex flex-wrap gap-1.5">
            {persona.aiPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(item)}
                className="text-left text-[11px] font-medium px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-background/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-foreground transition cursor-pointer"
              >
                &ldquo;{item.q}&rdquo;
              </button>
            ))}
          </div>

          {/* AI Response Output */}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic pt-1 animate-pulse">
              <Sparkles className="size-3 text-emerald-600" />
              Generating answer grounded in {persona.name}&apos;s knowledge base...
            </div>
          )}

          {chatAnswer && (
            <div className="p-3 bg-background border border-emerald-500/30 rounded-xl text-xs text-foreground/90 leading-relaxed space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <CheckCircle2 className="size-3.5" /> Verified AI Answer:
              </div>
              <p>{chatAnswer}</p>
            </div>
          )}
        </div>

        {/* ── Services & Monetization Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="size-3.5 text-emerald-600" />
              Services, Consultations &amp; Downloads
            </h4>
            <span className="text-[11px] font-semibold text-emerald-600">0% Platform Transaction Fee</span>
          </div>

          <div className="grid gap-3">
            {persona.services.map((svc) => (
              <div
                key={svc.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/40 hover:shadow-md transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        {svc.tag}
                      </span>
                      {svc.duration && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-2.5" /> {svc.duration}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-sm text-foreground mt-1">{svc.title}</h5>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-foreground">
                      {currency === 'usd' ? svc.usd : svc.inr}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">one-time</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{svc.description}</p>

                <div className="pt-1 flex items-center justify-between gap-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Google Calendar &amp; Stripe Sync
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBook(svc.id)}
                    className={cn(
                      'h-8 px-3.5 text-xs font-semibold rounded-lg cursor-pointer transition',
                      bookedService === svc.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                  >
                    {bookedService === svc.id ? (
                      <>
                        <Check className="size-3.5 mr-1" /> Reserved &amp; Redirecting
                      </>
                    ) : svc.type === 'call' ? (
                      <>
                        <Calendar className="size-3.5 mr-1" /> Book Slot
                      </>
                    ) : svc.type === 'qa' ? (
                      <>
                        <MessageSquare className="size-3.5 mr-1" /> Ask Question
                      </>
                    ) : (
                      <>
                        <Download className="size-3.5 mr-1" /> Get Instant Access
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Direct Intake / Project Scope Form ── */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="size-3.5 text-emerald-600" /> Need Custom Project Work? Send an Inquiry
            </h5>
            <span className="text-[10px] text-muted-foreground">Syncs directly to CRM</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              readOnly
              value="e.g. John Doe"
              className="h-8 px-3 text-xs rounded-lg border border-border bg-background text-muted-foreground cursor-default"
            />
            <input
              type="email"
              readOnly
              value="john@acme-ventures.com"
              className="h-8 px-3 text-xs rounded-lg border border-border bg-background text-muted-foreground cursor-default"
            />
          </div>

          <textarea
            readOnly
            rows={2}
            value="Hi Alex, we need a 4-week growth sprint starting next month for our B2B SaaS platform..."
            className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-muted-foreground resize-none cursor-default"
          />

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs font-semibold h-8 rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 cursor-pointer"
          >
            Submit Project Brief &amp; Sync to Calendar
          </Button>
        </div>
      </div>

      {/* Simulator Footer Trust Note */}
      <div className="border-t border-border bg-muted/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Supports Stripe, Creem MoR, Apple Pay &amp; UPI
        </span>
        <span className="font-bold text-emerald-600">Zero Code Required • Live in 30 Seconds</span>
      </div>
    </div>
  );
}
