'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Layers,
  MessageSquare,
  ShieldCheck,
  Zap,
  Globe,
  Smartphone,
  Phone,
  Send,
  User,
  Clock,
  ChevronDown,
  Check,
  X,
  FileText,
  Star,
  Users,
  Building2,
  DollarSign,
  Workflow,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ChatbotLandingClient() {
  const router = useRouter();
  const [promptInput, setPromptInput] = useState('');
  const [activeTab, setActiveTab] = useState<'booking' | 'quote' | 'support'>('booking');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const query = promptInput.trim();
    if (query) {
      router.push(`/dashboard/chatbot-builder?prompt=${encodeURIComponent(query)}`);
    } else {
      router.push('/dashboard/chatbot-builder');
    }
  };

  const samplePrompts = [
    'HVAC booking bot with emergency dispatch & diagnostic pricing',
    'Dental clinic receptionist that books cleanings & answers insurance FAQs',
    'Plumber quote bot that estimates pipe repairs & takes deposits',
    'E-commerce order assistant with refund & tracking actions',
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="size-3.5 animate-pulse" />
            Next-Gen Autonomous Chatbot Engine • 0% Transaction Fees
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Build an AI Chatbot That{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Actually Does Something
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Most chatbots just regurgitate canned text. Fieseros AI Chatbots qualify leads, book appointments into your live calendar, calculate exact price quotes, and collect payments directly in conversation.
          </p>

          {/* Interactive AI Prompt Box */}
          <form onSubmit={handleGenerate} className="mt-8 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-background rounded-2xl border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/10 hover:border-emerald-500/60 transition-all">
              <div className="flex items-center gap-2.5 px-3 w-full">
                <Bot className="size-5 text-emerald-600 shrink-0" />
                <Input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Describe your chatbot: e.g. 24/7 HVAC booking bot with pricing..."
                  className="border-none shadow-none focus-visible:ring-0 text-sm md:text-base px-0 h-10 placeholder:text-muted-foreground/70"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shrink-0 cursor-pointer shadow-md shadow-emerald-600/30"
              >
                <Sparkles className="size-4 mr-2" />
                Build Free
              </Button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Try:</span>
              {samplePrompts.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPromptInput(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition text-left cursor-pointer border border-border/50 text-[11px]"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </form>

          {/* Metrics Social Proof */}
          <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">3.8x</p>
              <p className="text-xs text-muted-foreground mt-0.5">Higher Lead Conversion</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">60 Sec</p>
              <p className="text-xs text-muted-foreground mt-0.5">Website &amp; PDF Training</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Platform Transaction Fees</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">16 Channels</p>
              <p className="text-xs text-muted-foreground mt-0.5">Web, WhatsApp, Voice, SMS</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE CHATBOT SIMULATION ─── */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 mb-3">
              Interactive Preview
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Watch an AI Agent Execute Real Work in Real-Time
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Switch use-cases below to see how our autonomous engine transitions smoothly from conversation to business action.
            </p>

            {/* Use case tabs */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant={activeTab === 'booking' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('booking')}
                className={cn('rounded-xl font-semibold text-xs', activeTab === 'booking' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                <Calendar className="size-3.5 mr-1.5" />
                Service Booking
              </Button>
              <Button
                variant={activeTab === 'quote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('quote')}
                className={cn('rounded-xl font-semibold text-xs', activeTab === 'quote' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                <DollarSign className="size-3.5 mr-1.5" />
                Instant Price Quote
              </Button>
              <Button
                variant={activeTab === 'support' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('support')}
                className={cn('rounded-xl font-semibold text-xs', activeTab === 'support' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                <ShieldCheck className="size-3.5 mr-1.5" />
                Support &amp; Knowledge
              </Button>
            </div>
          </div>

          {/* Interactive Chat Window */}
          <div className="max-w-3xl mx-auto bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
            {/* Window Chrome Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="size-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    <Bot className="size-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight">Apex Climate AI Assistant</h4>
                  <p className="text-[11px] text-emerald-400 font-medium">Online • Books Jobs &amp; Collects Deposits</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[11px] font-mono border-slate-700">
                  ⚡ Autonomous
                </Badge>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="p-6 space-y-4 min-h-[380px] bg-slate-50/60 dark:bg-slate-950/40">
              {activeTab === 'booking' && (
                <>
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground">
                      Hello! Welcome to Apex Climate. My name is Alex. Are you experiencing an AC emergency or looking to schedule a seasonal tune-up?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%] ml-auto justify-end">
                    <div className="bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tr-sm shadow-xs text-sm">
                      My AC stopped blowing cold air this afternoon. Can someone come out tomorrow morning?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="space-y-2 bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground">
                      <p>I can help you with that right away! We have 2 certified technicians available in your area tomorrow:</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                          <span>Tomorrow 8:00 AM - 10:00 AM</span>
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        </div>
                        <div className="p-2.5 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground flex items-center justify-between">
                          <span>Tomorrow 11:00 AM - 1:00 PM</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Diagnostic visit is $89 (applied directly toward any repair). Shall I lock in the 8:00 AM slot for you?
                      </p>
                    </div>
                  </div>

                  {/* Inline Action Card */}
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 max-w-[90%] mx-auto">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white">
                        <Calendar className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Action Triggered: Live CRM Dispatch</p>
                        <p className="text-[11px] text-muted-foreground">Technician Marc D. scheduled for 8:00 AM • SMS reminder armed</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Confirmed</Badge>
                  </div>
                </>
              )}

              {activeTab === 'quote' && (
                <>
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground">
                      Hi there! I can calculate an instant ballpark estimate for your heat pump or AC replacement. What is the approximate square footage of your home?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%] ml-auto justify-end">
                    <div className="bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tr-sm shadow-xs text-sm">
                      Around 2,200 sq ft, 2-story home in Austin, TX.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="space-y-2 bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground">
                      <p>Based on 2,200 sq ft in Austin, your home requires a <strong>3.5 to 4.0 Ton High-Efficiency System</strong> (16+ SEER2).</p>
                      <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Standard 16 SEER2 System:</span>
                          <span className="font-bold">$6,400 - $7,200</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Local Utility &amp; IRA Federal Rebate:</span>
                          <span>-$1,200</span>
                        </div>
                        <div className="border-t border-border pt-1 flex justify-between font-bold text-foreground">
                          <span>Estimated Net Cost:</span>
                          <span>$5,200 - $6,000</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Includes full permit, new digital thermostat, and 10-year parts warranty. Would you like me to dispatch an estimator for an exact ductwork inspection?
                      </p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'support' && (
                <>
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground">
                      I have indexed your warranty terms, parts manuals, and service history. How can I assist you with your equipment today?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%] ml-auto justify-end">
                    <div className="bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tr-sm shadow-xs text-sm">
                      My furnace error code is blinking 3 red lights. What does that mean?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                    <div className="bg-background p-3.5 rounded-2xl rounded-tl-sm border border-border shadow-xs text-sm text-foreground space-y-2">
                      <p>
                        According to Carrier &amp; Trane manuals, <strong>3 red flashes indicates a Pressure Switch Open with Inducer On</strong>.
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                        <li>Common cause: Blocked condensate drain or exhaust vent pipe</li>
                        <li>Quick check: Verify your air filter isn&apos;t completely clogged</li>
                      </ul>
                      <p className="text-xs font-semibold text-foreground">
                        If the filter is clean, this requires a technician to inspect the inducer motor to prevent furnace overheating. Would you like to book a priority service visit?
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 bg-background border-t border-border flex items-center gap-2">
              <Input
                readOnly
                placeholder="Ask Alex a question or book an appointment..."
                className="text-xs h-9 bg-muted/40"
              />
              <Button size="sm" className="h-9 px-3 bg-emerald-600 text-white rounded-xl">
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ORDINARY CHATBOT VS FIESEROS (COMPARISON GRID) ─── */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 mb-3">
              Direct Comparison
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Why Ordinary Chatbots Fail Businesses
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Traditional chatbots hit a brick wall the moment a customer wants to buy, book, or schedule. Fieseros connects directly to your operations.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-background rounded-3xl border border-border shadow-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/60 p-4 border-b border-border font-bold text-xs sm:text-sm">
              <div className="text-muted-foreground">Capabilities</div>
              <div className="text-muted-foreground text-center">Ordinary Chatbots</div>
              <div className="text-emerald-600 text-center font-extrabold flex items-center justify-center gap-1.5">
                <Sparkles className="size-4" /> Fieseros AI Studio
              </div>
            </div>

            <div className="divide-y divide-border text-xs sm:text-sm">
              <div className="grid grid-cols-3 p-4 items-center">
                <span className="font-semibold text-foreground">Action Execution</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  <X className="size-4 text-red-500" /> Canned text only
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> Real CRM, booking &amp; dispatch
                </span>
              </div>

              <div className="grid grid-cols-3 p-4 items-center bg-muted/20">
                <span className="font-semibold text-foreground">Forms Integration</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  <X className="size-4 text-red-500" /> Disconnected 3rd-party
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> 1-Click Form to Chatbot
                </span>
              </div>

              <div className="grid grid-cols-3 p-4 items-center">
                <span className="font-semibold text-foreground">Payment Collection</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  <X className="size-4 text-red-500" /> External links or 2% fee
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> Native in-chat (0% fee)
                </span>
              </div>

              <div className="grid grid-cols-3 p-4 items-center bg-muted/20">
                <span className="font-semibold text-foreground">Multichannel Reach</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  Web widget only
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> 16 Channels (Voice, WhatsApp, SMS)
                </span>
              </div>

              <div className="grid grid-cols-3 p-4 items-center">
                <span className="font-semibold text-foreground">Knowledge Training</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  Manual FAQ entry
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> Instant URL crawl + PDFs in 60s
                </span>
              </div>

              <div className="grid grid-cols-3 p-4 items-center bg-muted/20">
                <span className="font-semibold text-foreground">Human Handoff</span>
                <span className="text-center text-muted-foreground flex items-center justify-center gap-1">
                  Leaves email ticket
                </span>
                <span className="text-center text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Check className="size-4 text-emerald-600" /> Live transfer with full transcript
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 16 MULTI-CHANNEL DEPLOYMENT ─── */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="border-teal-500/30 text-teal-600 bg-teal-500/10 mb-3">
              Deploy Anywhere
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              One Brain. Deployed Across 16 Channels.
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Build your AI assistant once. It automatically synchronizes knowledge, pricing, and bookings across your website, phone line, social channels, and team workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-500/40 transition-all space-y-3">
              <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Globe className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Website Embed &amp; Widget</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add a 1-line script to any WordPress, Shopify, Webflow, or custom site. Supports popups, sidebars, and full-screen modes.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-500/40 transition-all space-y-3">
              <div className="size-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">AI Voice Phone Receptionist</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Answers incoming phone calls 24/7 with ultra-natural voice synthesis, quotes prices, and books jobs directly into your dispatch board.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-500/40 transition-all space-y-3">
              <div className="size-11 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                <Smartphone className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">WhatsApp Business &amp; SMS</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chat with customers on WhatsApp and two-way SMS text. Send appointment confirmations, intake questionnaires, and reminders.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-500/40 transition-all space-y-3">
              <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Workflow className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">CRM &amp; Dispatch Engine</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Instantly generates customer records, jobs, invoices, and payment receipts without manual data re-entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ACCORDION ─── */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 mb-3">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">
              Everything You Need to Know About Fieseros AI Chatbots
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How is Fieseros different from ChatBot.com or ordinary chatbots?',
                a: 'Traditional chatbots only answer canned questions with generic text snippets. Fieseros AI Chatbots are autonomous agents connected directly to your business logic: they qualify leads, check live calendars, schedule technicians, generate binding quotes, and process credit card payments with 0% platform transaction fees.',
              },
              {
                q: 'Can I turn my existing Fieseros GPTForm into a chatbot?',
                a: 'Yes! In 1 click, any form you build in GPTForm can be paired with an AI Chatbot. The chatbot uses your form fields to guide customers through a conversational slot-filling intake flow.',
              },
              {
                q: 'How long does it take to train the chatbot on my business?',
                a: 'Under 60 seconds. Simply paste your website URL, upload your service pricing PDF or customer FAQ document, and our indexing engine will ingest your materials and prepare your agent.',
              },
              {
                q: 'Does Fieseros take a percentage of payments collected through the chatbot?',
                a: 'No. Fieseros charges 0% platform transaction fees. You only pay standard Stripe or PayPal merchant processing fees.',
              },
              {
                q: 'What happens when the chatbot does not know the answer?',
                a: 'Strict guardrails prevent hallucinations. When an inquiry falls outside the indexed knowledge or requires human judgment, the chatbot gracefully initiates a transfer to your team via live chat, email, or SMS with the full conversation transcript.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer transition hover:border-emerald-500/40"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-bold text-sm sm:text-base text-foreground">{faq.q}</h4>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', expandedFaq === index && 'rotate-180 text-emerald-600')} />
                </div>
                {expandedFaq === index && (
                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA BANNER ─── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Build Your Autonomous AI Chatbot Today
          </h2>
          <p className="mt-4 text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto">
            Join thousands of modern businesses using Fieseros AI Chatbots to turn website visitors into booked jobs and paid invoices 24/7.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-white text-emerald-800 hover:bg-slate-100 font-bold text-base shadow-xl rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder">
                Start Building Free <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/conversational-forms">
                Explore Conversational Forms
              </Link>
            </Button>
          </div>
          <p className="text-xs text-emerald-200 mt-4">
            No credit card required • Instant setup • 0% platform transaction fees
          </p>
        </div>
      </section>
    </div>
  );
}
