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
  FileText,
  Lock,
  Headphones,
  Award,
  BarChart3,
  Sliders,
  Sparkle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AiAgentLandingClient() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'dispatch' | 'sales' | 'support'>('dispatch');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const roleDetails = {
    dispatch: {
      title: 'Dispatch & Booking Specialist',
      avatar: 'Sarah — Operations Lead',
      description: 'Verifies technician route density, locks in calendar slots, sends customer SMS confirmation, and creates CRM jobs.',
      stats: '1,420 appointments booked • 99.4% schedule accuracy',
      sampleChat: [
        { sender: 'user', text: 'I have a water leak under my kitchen sink. Can someone come out today?' },
        {
          sender: 'agent',
          text: 'I can get a licensed plumber to your home today between 2:00 PM and 4:00 PM. Would you like me to reserve that emergency slot?',
          action: 'Technician Route Checked: Dave K. assigned in Northwest Zone',
        },
      ],
    },
    sales: {
      title: 'Sales & Quote Advisor',
      avatar: 'Marcus — Senior Estimator',
      description: 'Collects project specs, calculates live material + labor pricing from your formula tables, and collects card deposits.',
      stats: '$340k revenue quoted • 3.2x faster proposal close',
      sampleChat: [
        { sender: 'user', text: 'Looking to replace our 3-ton heat pump. What are my financing options?' },
        {
          sender: 'agent',
          text: 'We offer 0% APR for 18 months through Synchrony on 16 SEER2 heat pumps ($128/mo). Would you like to review an instant pre-qualification?',
          action: 'Live Quote Generated: #EST-8921 • $6,450 (or $128/mo)',
        },
      ],
    },
    support: {
      title: 'Tier-1 Technical Support Specialist',
      avatar: 'Elena — Technical Knowledge',
      description: 'Ingests product manuals, warranty terms, and FAQs. Resolves tier-1 questions and escalates complex issues with full summaries.',
      stats: '84% first-contact resolution • 45s avg handling time',
      sampleChat: [
        { sender: 'user', text: 'Does my parts warranty cover capacitor replacement after 3 years?' },
        {
          sender: 'agent',
          text: 'Yes! Your 5-year manufacturer parts warranty covers capacitors, contactors, and blower motors. Labor is covered if under annual maintenance.',
          action: 'Warranty Document Verified: Page 4, Section B',
        },
      ],
    },
  };

  const currentRole = roleDetails[selectedRole];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-purple-500/5 via-indigo-500/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Bot className="size-3.5" />
            Autonomous AI Workforce • 24/7/365 Coverage
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Your Website&apos;s{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              24/7 AI Employee
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Never lose another late-night customer or miss a weekend booking. Fieseros AI Employees answer questions, verify schedule availability, generate binding price quotes, and take payments with zero human delay.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-xl shadow-purple-600/25 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder">
                Deploy Your AI Employee <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 font-semibold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/chatbot">
                See Chatbot Builder
              </Link>
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">24/7</p>
              <p className="text-xs text-muted-foreground mt-0.5">Zero Missed Leads</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">&lt; 2s</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average Response Time</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-purple-600">95+</p>
              <p className="text-xs text-muted-foreground mt-0.5">Languages Supported</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">100%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enterprise Guardrails</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROLE SELECTOR & LIVE TRANSCRIPT ─── */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-500/10 mb-3">
              Specialized Roles
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Configure Specialized Employees for Every Department
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Each AI Employee possesses dedicated tools, customized guardrails, and industry-calibrated workflows.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <Button
                variant={selectedRole === 'dispatch' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('dispatch')}
                className={cn('rounded-xl font-semibold text-xs', selectedRole === 'dispatch' && 'bg-purple-600 hover:bg-purple-700 text-white')}
              >
                <Calendar className="size-3.5 mr-1.5" />
                Dispatch &amp; Booking
              </Button>
              <Button
                variant={selectedRole === 'sales' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('sales')}
                className={cn('rounded-xl font-semibold text-xs', selectedRole === 'sales' && 'bg-purple-600 hover:bg-purple-700 text-white')}
              >
                <Zap className="size-3.5 mr-1.5" />
                Sales &amp; Estimating
              </Button>
              <Button
                variant={selectedRole === 'support' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('support')}
                className={cn('rounded-xl font-semibold text-xs', selectedRole === 'support' && 'bg-purple-600 hover:bg-purple-700 text-white')}
              >
                <Headphones className="size-3.5 mr-1.5" />
                Tier-1 Support
              </Button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto bg-background rounded-3xl border border-border shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{currentRole.title}</h3>
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px]">
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{currentRole.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {currentRole.stats}
                </span>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4">
              {currentRole.sampleChat.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div className={cn('flex items-start gap-2.5 max-w-[85%]', msg.sender === 'user' ? 'ml-auto justify-end' : '')}>
                    {msg.sender === 'agent' && (
                      <div className="size-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-3.5" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'p-3.5 rounded-2xl text-sm leading-relaxed',
                        msg.sender === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-sm shadow-xs'
                          : 'bg-muted/50 text-foreground border border-border rounded-tl-sm'
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {msg.action && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-300 max-w-[85%] mx-auto font-medium">
                      <CheckCircle2 className="size-4 text-purple-600 shrink-0" />
                      <span>{msg.action}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 PILLARS: TRAINING, ACTIONS, GUARDRAILS ─── */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/10 mb-3">
              Core Architecture
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Engineered for Real Business Operations
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Unlike fragile chatbots built on basic prompts, Fieseros AI Employees run on a battle-tested three-tier enterprise architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-background p-6 rounded-3xl border border-border shadow-sm hover:border-purple-500/40 transition space-y-4">
              <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <FileText className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">1. 60-Second Training</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Point your AI Employee to your website, upload your price list PDF, or sync your Notion FAQ doc. In seconds, vector embeddings index your exact business knowledge.
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-purple-600" /> Web page crawler with auto-resync
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-purple-600" /> PDF, Word, and text file parsing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-purple-600" /> Connected Form schemas for slot-filling
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="bg-background p-6 rounded-3xl border border-border shadow-sm hover:border-indigo-500/40 transition space-y-4">
              <div className="size-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Zap className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">2. Autonomous Actions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empower your agent to actually perform work. Integrated directly with your calendar dispatch, customer CRM records, quote calculators, and payment gateways.
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-indigo-600" /> Real-time calendar slot reservation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-indigo-600" /> Instant CRM contact &amp; job creation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-indigo-600" /> 0% fee credit card processing
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="bg-background p-6 rounded-3xl border border-border shadow-sm hover:border-emerald-500/40 transition space-y-4">
              <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">3. Enterprise Guardrails</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Zero hallucinations. Enforced knowledge boundaries guarantee your agent never invents unauthorized discounts or promises services you don&apos;t offer.
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Anti-hallucination verification
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> 95+ language auto-translation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" /> Human live transfer with transcript
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ACCORDION ─── */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-500/10 mb-3">
              FAQ
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">
              Frequently Asked Questions About AI Employees
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'What is the difference between a chatbot and an AI Employee?',
                a: 'A chatbot replies with conversational text. An AI Employee performs real operational actions: scheduling jobs into your calendar, calculating price quotes from formulas, writing records into your CRM, and taking credit card payments.',
              },
              {
                q: 'Can our human staff step in during a conversation?',
                a: 'Yes. At any point, the AI Employee can notify your team via SMS, email, or Slack. You can take over live with the full conversation history preserved.',
              },
              {
                q: 'How does the AI Employee handle phone calls?',
                a: 'Every AI Employee can be assigned a dedicated phone number. When customers call, the agent speaks with human-grade natural voice synthesis and books appointments directly into your system.',
              },
              {
                q: 'What if a customer speaks Spanish, French, or another language?',
                a: 'The agent automatically detects the language spoken by the customer and responds fluently in over 95 languages, translating intake details into English for your team.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer transition hover:border-purple-500/40"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-bold text-sm sm:text-base text-foreground">{faq.q}</h4>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', expandedFaq === index && 'rotate-180 text-purple-600')} />
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
      <section className="py-20 bg-gradient-to-br from-purple-700 via-indigo-700 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Hire Your 24/7 AI Employee in Minutes
          </h2>
          <p className="mt-4 text-base sm:text-lg text-purple-200 max-w-2xl mx-auto">
            Zero payroll taxes, zero sick leave, and zero missed opportunities. Start with our free tier today.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-white text-purple-900 hover:bg-slate-100 font-bold text-base shadow-xl rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder">
                Build Your AI Employee Free <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/gptform">
                Explore GPTForm Builder
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
