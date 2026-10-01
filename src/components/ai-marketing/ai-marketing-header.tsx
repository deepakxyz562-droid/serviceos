'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  PhoneCall,
  MessageSquare,
  Bot,
  LayoutTemplate,
  Calculator,
  Target,
  CalendarCheck,
  FileText,
  CreditCard,
  Star,
  Mail,
  Route,
  Code,
  Store,
  Globe,
  Layers,
  Briefcase,
  Calendar,
  Zap,
  BookOpen,
  Building2,
  Users,
  Megaphone,
  Scale,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

// ─── 1. Flagship AI & Smart Forms Catalog ────────────────────────────────────
export const aiFormLinks: NavItem[] = [
  {
    label: '24/7 AI Voice Receptionist',
    desc: 'Autonomous voice agent answers calls, triages emergencies & live books slots',
    href: '/ai-employee',
    icon: PhoneCall,
    badge: 'Voice AI',
  },
  {
    label: 'AI Chatbot Builder',
    desc: 'Custom trained knowledge-base chatbot to qualify leads & answer FAQs 24/7',
    href: '/chatbot',
    icon: MessageSquare,
    badge: 'Lead Gen',
  },
  {
    label: 'IntakeAI™ Autonomous Agent',
    desc: 'Autonomous customer intake, lead scoring, live booking & triage across Voice, Chat & SMS',
    href: '/intakeai',
    icon: Sparkles,
    badge: 'New AI',
  },
  {
    label: 'GPTForm™ AI Platform',
    desc: 'Visual form builder, formula calculator pad, 200+ widgets & 33 gateways',
    href: '/gptform',
    icon: LayoutTemplate,
    badge: 'Core Builder',
  },
  {
    label: '24/7 AI Employee & Agent',
    desc: 'Autonomous conversational employee across WhatsApp, SMS, Web & Email',
    href: '/ai-agent',
    icon: Bot,
    badge: 'Autonomous',
  },
  {
    label: '20,000+ Form Templates',
    desc: 'Jotform-parity template library with 1-click clone across 20+ industries',
    href: '/templates',
    icon: LayoutTemplate,
    badge: '20K+ Templates',
  },
  {
    label: 'Quote Calculators',
    desc: 'Interactive 2-column estimators, date difference math & instant pricing',
    href: '/templates/quote',
    icon: Calculator,
    badge: 'Calculators',
  },
];

// ─── 2. Use Cases Catalog ──────────────────────────────────────────────────
export const useCaseNavLinks: NavItem[] = [
  {
    label: 'AI Lead Capture & Qualification',
    desc: '24/7 intelligent qualification of incoming website visitors',
    href: '/use-cases/lead-capture',
    icon: Target,
  },
  {
    label: 'Self-Service Appointment Booking',
    desc: 'Real-time calendar slot booking with buffer & travel math',
    href: '/use-cases/appointment-booking',
    icon: CalendarCheck,
  },
  {
    label: 'Instant Estimate & Quote Generation',
    desc: 'Live dynamic line-item estimation & formula quotes',
    href: '/use-cases/quote-generation',
    icon: FileText,
  },
  {
    label: 'On-site & In-chat Payment Collection',
    desc: '0% platform fee credit card, Apple Pay & ACH checkout',
    href: '/use-cases/payment-collection',
    icon: CreditCard,
  },
  {
    label: 'Automated 5-Star Review Requests',
    desc: 'Trigger automated post-job Google review campaigns',
    href: '/use-cases/review-collection',
    icon: Star,
  },
  {
    label: 'Automated Follow-ups & Lead Nurturing',
    desc: 'Re-engage cold inquiries via multi-channel SMS & email',
    href: '/use-cases/lead-nurturing',
    icon: Mail,
  },
  {
    label: '24/7 AI Customer Support & FAQ Agent',
    desc: 'Instant answers to service questions and business policies',
    href: '/use-cases/customer-support',
    icon: MessageSquare,
  },
  {
    label: 'Smart Route Optimization & Job Dispatch',
    desc: 'Assign field jobs by crew proximity & live status',
    href: '/use-cases/job-dispatch',
    icon: Route,
  },
];

// ─── 3. Platforms (CMS Embeds) Catalog ─────────────────────────────────────
export const platformNavLinks: NavItem[] = [
  {
    label: 'WordPress Embed & Plugin Alternative',
    desc: '1-click shortcode or script injection without speed drops',
    href: '/platform/wordpress',
    icon: Code,
  },
  {
    label: 'Shopify Service Booking & Forms Embed',
    desc: 'Sell appointments and custom quotes on Shopify stores',
    href: '/platform/shopify',
    icon: Store,
  },
  {
    label: 'Wix Website AI Chat & Booking',
    desc: 'Floating bubble or inline smart widget on every Wix page',
    href: '/platform/wix',
    icon: Globe,
  },
  {
    label: 'Webflow Custom Embed & Webhooks',
    desc: 'Custom code embed with instant webhook synchronization',
    href: '/platform/webflow',
    icon: Layers,
  },
  {
    label: 'Squarespace Code Injection Embed',
    desc: 'Universal code block & header injection for Squarespace',
    href: '/platform/squarespace',
    icon: Briefcase,
  },
  {
    label: 'Pure HTML / Custom Stack Snippet',
    desc: 'One script tag compatible with Next.js, React, or static sites',
    href: '/platform/html',
    icon: Code,
  },
];

// ─── 4. Integrations (App Sync) Catalog ────────────────────────────────────
export const integrationNavLinks: NavItem[] = [
  {
    label: 'Two-Way Google Calendar Sync',
    desc: 'Real-time calendar slot booking with bi-directional sync',
    href: '/integrations/google-calendar',
    icon: Calendar,
  },
  {
    label: 'Cards, Apple Pay, ACH & Stripe',
    desc: 'Direct payment processing with 0% platform transaction fees',
    href: '/integrations/stripe',
    icon: CreditCard,
  },
  {
    label: '6,000+ App Zapier Automations',
    desc: 'Automate customer data across any external CRM or tool',
    href: '/integrations/zapier',
    icon: Zap,
  },
  {
    label: 'QuickBooks Online Invoicing Sync',
    desc: 'Automated invoice generation, payment sync & reconciliation',
    href: '/integrations/quickbooks',
    icon: BookOpen,
  },
];

// ─── 5. Competitor Comparisons Catalog ─────────────────────────────────────
export const comparisonNavLinks: NavItem[] = [
  {
    label: 'Fieseros vs Typeform',
    desc: 'Forms + CRM + AI automation (Beyond pretty forms)',
    href: '/fieseros-vs-typeform',
    icon: Scale,
  },
  {
    label: 'Fieseros vs Chatbase',
    desc: 'Chatbot → Business Action (Bookings & Invoicing)',
    href: '/fieseros-vs-chatbase',
    icon: Scale,
  },
  {
    label: 'Fieseros vs Tidio',
    desc: 'Contractor-grade live chat with multi-calendar booking',
    href: '/fieseros-vs-tidio',
    icon: Scale,
  },
  {
    label: 'Fieseros vs Jotform',
    desc: 'Full CRM & AI Employee vs form-only builder',
    href: '/fieseros-vs-jotform',
    icon: Scale,
  },
  {
    label: 'Fieseros vs ElfChatbot',
    desc: 'Autonomous AI vs basic FAQ widget (Bookings & 0% Payments)',
    href: '/fieseros-vs-elfchatbot',
    icon: Scale,
  },
  {
    label: '2026 AI Chatbot Alternatives Guide',

    desc: 'In-depth comparison of top AI chatbots for businesses',
    href: '/ai-chatbot-alternatives',
    icon: Scale,
  },
  {
    label: 'Conversational Forms Alternatives Guide',
    desc: 'Multi-step conversational form builders compared',
    href: '/conversational-forms-alternatives',
    icon: Scale,
  },
  {
    label: 'Jobber Alternative (0 Per-Seat Fees)',
    desc: 'Complete field service software without per-user licensing',
    href: '/jobber-alternatives',
    icon: Scale,
  },
  {
    label: 'Housecall Pro Alternative',
    desc: 'Simpler dispatching, modern web forms & built-in AI',
    href: '/housecall-pro-alternatives',
    icon: Scale,
  },
  {
    label: 'ServiceTitan Alternative (No Lock-In)',
    desc: 'Enterprise capabilities without restrictive annual contracts',
    href: '/servicetitan-alternatives',
    icon: Scale,
  },
];

// ─── 6. Company & Social Proof Catalog ─────────────────────────────────────
export const companyNavLinks: NavItem[] = [
  {
    label: 'Mission, Leadership, Story & Values',
    desc: 'Why we are building the AI operating system for services',
    href: '/about',
    icon: Building2,
  },
  {
    label: 'Open Positions, Benefits & Culture',
    desc: 'Join our remote-first engineering and product team',
    href: '/careers',
    icon: Briefcase,
  },
  {
    label: 'Agency, Reseller & Affiliate Programs',
    desc: 'Partner with us and earn 30% recurring monthly rev-share',
    href: '/partners',
    icon: Users,
  },
  {
    label: 'Media Kit, Brand Assets & Press Contact',
    desc: 'Logos, press releases, company facts & media inquiries',
    href: '/press',
    icon: Megaphone,
  },
  {
    label: 'Contractor Guides, Blog & Whitepapers',
    desc: 'In-depth articles to help streamline and scale your trade',
    href: '/resources',
    icon: FileText,
  },
  {
    label: 'Customer Success Stories & ROI Proof',
    desc: 'Verified case studies and revenue results from active users',
    href: '/case-studies',
    icon: Sparkles,
  },
];

export function AiMarketingHeader({ activePath }: { activePath?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [mobileSection, setMobileSection] = React.useState<string | null>(null);

  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (name: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(name);
  };

  const handleMouseLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 140);
  };

  const toggleMobileSection = (name: string) => {
    setMobileSection((prev) => (prev === name ? null : name));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Brand Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Fieseros AI home">
          <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 leading-none">
              Fieseros <span className="text-emerald-600 font-extrabold">AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              GPTForm™ &amp; Service OS
            </span>
          </div>
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {/* Dropdown 1: AI & Smart Forms */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('aiforms')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'aiforms' ? null : 'aiforms'))}
              aria-expanded={openDropdown === 'aiforms'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer',
                aiFormLinks.some((a) => a.href === activePath) || openDropdown === 'aiforms'
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15'
                  : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-500/10'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI &amp; Forms</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'aiforms' && 'rotate-180')} />
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase tracking-wide">
                New
              </span>
            </button>

            {openDropdown === 'aiforms' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[600px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-2 gap-2">
                  {aiFormLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-start gap-3 p-2.5 rounded-xl transition-all',
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="col-span-2 mt-1 pt-2.5 border-t border-border flex items-center justify-between text-xs px-2 bg-emerald-50/40 dark:bg-emerald-950/20 -mx-4 -mb-4 p-3 rounded-b-2xl">
                    <span className="text-muted-foreground font-medium">Ready to build or train your custom agent?</span>
                    <Link
                      href="/gptform"
                      onClick={() => setOpenDropdown(null)}
                      className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Open GPTForm Studio <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 2: Use Cases */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('usecases')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'usecases' ? null : 'usecases'))}
              aria-expanded={openDropdown === 'usecases'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer',
                useCaseNavLinks.some((u) => u.href === activePath) || openDropdown === 'usecases'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              <span>Use Cases</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'usecases' && 'rotate-180')} />
            </button>

            {openDropdown === 'usecases' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[580px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-2 gap-1.5">
                  {useCaseNavLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-start gap-2.5 p-2 rounded-xl transition-all',
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{item.label}</span>
                          <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="col-span-2 mt-1 pt-2 border-t border-border flex items-center justify-between text-xs px-2">
                    <span className="text-muted-foreground">Explore all workflow templates</span>
                    <Link
                      href="/use-cases"
                      onClick={() => setOpenDropdown(null)}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      All Use Cases Hub <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 3: Platform & Integrations */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('platform')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'platform' ? null : 'platform'))}
              aria-expanded={openDropdown === 'platform'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer',
                platformNavLinks.some((p) => p.href === activePath) || integrationNavLinks.some((i) => i.href === activePath) || openDropdown === 'platform'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              <span>Platforms &amp; Sync</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'platform' && 'rotate-180')} />
            </button>

            {openDropdown === 'platform' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[640px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-12 gap-4">
                  {/* Platforms (7/12) */}
                  <div className="col-span-7 border-r border-border/60 pr-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Website Platforms (CMS)
                      </span>
                      <Link href="/platform" onClick={() => setOpenDropdown(null)} className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                        All Hub →
                      </Link>
                    </div>
                    <div className="space-y-1">
                      {platformNavLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/70 transition-colors group"
                          >
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 block truncate">
                                {item.label}
                              </span>
                              <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Integrations (5/12) */}
                  <div className="col-span-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        App Sync
                      </span>
                      <Link href="/integrations" onClick={() => setOpenDropdown(null)} className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                        All Hub →
                      </Link>
                    </div>
                    <div className="space-y-1">
                      {integrationNavLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/70 transition-colors group"
                          >
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 block truncate">
                                {item.label}
                              </span>
                              <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 4: Compare */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('compare')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'compare' ? null : 'compare'))}
              aria-expanded={openDropdown === 'compare'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer',
                comparisonNavLinks.some((c) => c.href === activePath) || openDropdown === 'compare'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              <span>Compare</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'compare' && 'rotate-180')} />
            </button>

            {openDropdown === 'compare' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[580px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-2 gap-1.5">
                  {comparisonNavLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/70 transition-all text-foreground"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{item.label}</span>
                          <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 5: Company */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('company')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'company' ? null : 'company'))}
              aria-expanded={openDropdown === 'company'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer',
                companyNavLinks.some((c) => c.href === activePath) || openDropdown === 'company'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              <span>Company</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'company' && 'rotate-180')} />
            </button>

            {openDropdown === 'company' && (
              <div className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[420px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-2 gap-1.5">
                  {companyNavLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/70 transition-all text-foreground"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{item.label}</span>
                          <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Direct Link: Templates Gallery */}
          <Link
            href="/templates"
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
          >
            <span>Templates</span>
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
              20K+
            </span>
          </Link>

          {/* Direct Link: Pricing */}
          <Link
            href="/pricing"
            className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* ── Right Action CTAs ── */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>

          <Link
            href="/#signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex lg:hidden items-center justify-center p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Slide-over Drawer ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-background/98 backdrop-blur-xl border-t border-border overflow-y-auto px-4 py-6 pb-20 animate-in fade-in duration-200">
          <div className="max-w-md mx-auto space-y-3">
            {/* Section 1: AI & Smart Forms */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('aiforms')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-emerald-800 dark:text-emerald-300 text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>AI &amp; Smart Forms</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                    New
                  </span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'aiforms' && 'rotate-180')} />
              </button>
              {mobileSection === 'aiforms' && (
                <div className="p-3 pt-0 border-t border-emerald-500/20 space-y-1 bg-background/50">
                  {aiFormLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Use Cases */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('usecases')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <span>Use Cases</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'usecases' && 'rotate-180')} />
              </button>
              {mobileSection === 'usecases' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  <Link
                    href="/use-cases"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block p-1.5 rounded-md text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-muted transition-colors"
                  >
                    All Use Cases Hub →
                  </Link>
                  {useCaseNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Platforms & Integrations */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('platforms')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-emerald-600" />
                  <span>Platforms &amp; Integrations</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'platforms' && 'rotate-180')} />
              </button>
              {mobileSection === 'platforms' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-3 bg-muted/20">
                  <div>
                    <div className="flex items-center justify-between px-1.5 pt-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Website Platforms</span>
                      <Link href="/platform" onClick={() => setMobileMenuOpen(false)} className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">All →</Link>
                    </div>
                    {platformNavLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between px-1.5 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">App Sync</span>
                      <Link href="/integrations" onClick={() => setMobileMenuOpen(false)} className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">All →</Link>
                    </div>
                    {integrationNavLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Comparisons */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('compare')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  <span>Competitor Comparisons</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'compare' && 'rotate-180')} />
              </button>
              {mobileSection === 'compare' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  {comparisonNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Company */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('company')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span>Company &amp; Social Proof</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'company' && 'rotate-180')} />
              </button>
              {mobileSection === 'company' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  {companyNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Mobile Links */}
            <div className="rounded-xl border border-border bg-card p-2 space-y-1">
              <Link
                href="/templates"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>20,000+ Form Templates</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                  Clone
                </span>
              </Link>
              <Link
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Verified Pro Marketplace</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Pricing Plans</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>

            {/* Mobile CTAs */}
            <div className="pt-2 space-y-2.5">
              <Link
                href="/#signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Sign In to Your Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
