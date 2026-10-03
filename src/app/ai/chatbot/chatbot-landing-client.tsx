'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Globe,
  MessageCircle,
  Instagram,
  CheckCircle2,
  Calendar,
  Zap,
  Phone,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  Share2,
  Smartphone,
  Check,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const PRESET_PROMPTS = [
  {
    icon: '🦷',
    label: 'Dental & Clinic Intake',
    prompt: '24/7 receptionist for dental clinic: answers service FAQs, accepts insurance questions, and books new patient appointments.',
  },
  {
    icon: '🔧',
    label: 'Plumbing & HVAC Dispatch',
    prompt: 'Emergency dispatch assistant for plumbing company: diagnoses pipe leaks, calculates price estimates, and schedules technicians.',
  },
  {
    icon: '⚖️',
    label: 'Legal Consultation Intake',
    prompt: 'Confidential legal assistant: pre-qualifies case details for personal injury, gathers contact info, and schedules attorney consultations.',
  },
  {
    icon: '🛍️',
    label: 'E-Commerce & Orders',
    prompt: '24/7 customer care agent for online store: answers return policies, order tracking FAQs, and offers personalized product recommendations.',
  },
  {
    icon: '🏠',
    label: 'Real Estate Viewing Agent',
    prompt: 'Property agent assistant: answers pricing & floor plan inquiries, qualifies buyer budgets, and books private showing tours.',
  },
];

const CHANNELS = [
  { name: 'Website Chat Widget', icon: MessageCircle, color: 'text-blue-500 bg-blue-500/10' },
  { name: 'WhatsApp Business', icon: Send, color: 'text-emerald-500 bg-emerald-500/10' },
  { name: 'Instagram DMs', icon: Instagram, color: 'text-pink-500 bg-pink-500/10' },
  { name: 'AI Voice Receptionist', icon: Phone, color: 'text-purple-500 bg-purple-500/10' },
  { name: 'Standalone Direct Link', icon: Globe, color: 'text-cyan-500 bg-cyan-500/10' },
  { name: 'Facebook Messenger', icon: Share2, color: 'text-indigo-500 bg-indigo-500/10' },
];

export function ChatbotLandingClient() {
  const router = useRouter();
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = (customPrompt?: string) => {
    const text = (customPrompt || userInput).trim();
    if (!text) {
      toast.error('Please enter a website URL or describe what your chatbot should do.');
      return;
    }

    setLoading(true);

    const isUrl = text.startsWith('http://') || text.startsWith('https://') || text.includes('.com') || text.includes('.co') || text.includes('.io');
    const paramKey = isUrl ? 'url' : 'prompt';
    const targetUrl = `/?view=agentStudio&${paramKey}=${encodeURIComponent(text)}&agentStudio=1`;

    toast.success('✨ Initializing your AI Chatbot Studio...');
    setTimeout(() => {
      router.push(targetUrl);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-blue-600/20">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="size-5" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">GPTForm <span className="text-blue-600">AI</span></span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs">
              Chatbot Builder
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/?view=agentStudio" className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:block">
              Open Studio
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 h-9 px-4 gap-1.5"
              onClick={() => handleGenerate('General business AI assistant')}
            >
              <Sparkles className="size-3.5" /> Build Free Chatbot
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Jotform style live generator) ── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="absolute inset-0 bg-radial-at-c from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold animate-fade-in">
            <Sparkles className="size-3.5" />
            <span>Next-Gen Autonomous AI Chatbot Builder</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Build an AI Chatbot for <br className="hidden sm:inline" />
            Your Business in <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Seconds</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Train your custom AI employee on your website URL, PDFs, and FAQs. Qualifies leads, answers customer inquiries 24/7, and books appointments across Web, WhatsApp, and Instagram.
          </p>

          {/* ── Interactive Live Generator Box (Jotform style) ── */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-card border-2 border-blue-500/30 shadow-2xl shadow-blue-500/10 focus-within:border-blue-500 transition-all">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerate();
                }}
                className="flex flex-col sm:flex-row items-stretch gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter website URL (e.g. myclinic.com) or describe your business..."
                    className="h-13 text-sm sm:text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm h-13 px-6 shadow-md shadow-blue-600/25 shrink-0 gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Generating Agent...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Create AI Chatbot</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Try a template:</span>
              {PRESET_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(item.prompt);
                    handleGenerate(item.prompt);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 border border-border/80 transition-all cursor-pointer"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trust proof */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> Deploys in 1 click
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> Real 2-way Google Calendar booking
            </span>
          </div>
        </div>
      </section>

      {/* ── Multi-Channel Ecosystem ── */}
      <section className="py-16 border-t border-border/60 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-blue-600 border-blue-500/30">
              One AI Brain • All Your Channels
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Your AI Employee Works Everywhere Your Customers Are
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Don’t build 5 different bots. Train your business knowledge once, and let your AI assistant interact across web, messaging, and voice.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CHANNELS.map((ch, idx) => {
              const Icon = ch.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-card border border-border/70 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col items-center text-center gap-2.5"
                >
                  <div className={`size-12 rounded-xl flex items-center justify-center ${ch.color}`}>
                    <Icon className="size-6" />
                  </div>
                  <span className="text-xs font-bold text-foreground">{ch.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3 Core Pillars ── */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="rounded-3xl border-border/70 shadow-xs hover:shadow-lg transition-all p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Zap className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Zero-Hallucination Knowledge</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paste your website URL or upload PDF price sheets, policies, and service menus. The agent cites verified answers with 100% accuracy.
            </p>
            <ul className="text-xs space-y-2 text-foreground/80 font-medium">
              <li className="flex items-center gap-2"><Check className="size-3.5 text-blue-600" /> Real-time website auto-sync</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-blue-600" /> PDF, DOCX &amp; Spreadsheet ingestion</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-blue-600" /> Custom FAQ training list</li>
            </ul>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-xs hover:shadow-lg transition-all p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">2-Way Appointment Booking</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect Google Calendar or Microsoft Outlook. The chatbot verifies live availability, prevents double bookings, and sends confirmation emails.
            </p>
            <ul className="text-xs space-y-2 text-foreground/80 font-medium">
              <li className="flex items-center gap-2"><Check className="size-3.5 text-indigo-600" /> Google Calendar &amp; Outlook 2-way sync</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-indigo-600" /> Buffer times &amp; service duration rules</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-indigo-600" /> Automated reminder notifications</li>
            </ul>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-xs hover:shadow-lg transition-all p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
              <Smartphone className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Mobile App &amp; Live Takeover</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Manage your chatbot on the go with the native iOS &amp; Android app. Receive instant push notifications and tap once to take over conversations.
            </p>
            <ul className="text-xs space-y-2 text-foreground/80 font-medium">
              <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> 1-tap Human Takeover in mobile inbox</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> Retrain FAQs &amp; URLs from your phone</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" /> Instant hot lead notifications</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ── AI Voice Receptionist Add-on Banner ($29/mo) ── */}
      <section className="py-12 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 border-y border-purple-500/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Badge className="bg-purple-600 text-white font-bold text-[10px]">NEW ADD-ON</Badge>
              <h3 className="text-xl font-bold text-foreground">AI Voice Receptionist ($29/month)</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Turn your chatbot into a 24/7 live phone receptionist. Never miss another phone call — answers customer inquiries, books appointments, and sends audio recordings &amp; transcripts straight to your phone.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 h-11 px-6 gap-2 shrink-0 cursor-pointer"
            onClick={() => handleGenerate('AI Voice Phone Receptionist for incoming customer calls')}
          >
            <Phone className="size-4" /> Activate Voice Agent
          </Button>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <footer className="py-16 border-t border-border/60 bg-muted/20 text-center space-y-4">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            Ready to deploy your 24/7 AI employee?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Takes less than 60 seconds to train and launch on your website or WhatsApp.
          </p>
          <div className="pt-2">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm h-12 px-8 shadow-lg shadow-blue-600/25 gap-2 cursor-pointer"
              onClick={() => handleGenerate('General business assistant')}
            >
              <Sparkles className="size-4" /> Start Building Free
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
