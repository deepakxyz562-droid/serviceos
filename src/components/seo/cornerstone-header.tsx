'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Wrench,
  CalendarCheck,
  CreditCard,
  Users,
  Smartphone,
  Zap,
  Bot,
  Layers,
  Globe,
  Search,
  Megaphone,
  Briefcase,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { GooglePlayBadge } from '@/components/brand/google-play-badge';
import { cn } from '@/lib/utils';

// ─── Products Catalog ────────────────────────────────────────────────────────
interface NavProductItem {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const productLinks: NavProductItem[] = [
  {
    label: 'Field Service Software',
    desc: 'All-in-one operating system for trade contractors',
    href: '/field-service-software',
    icon: Wrench,
  },
  {
    label: 'Scheduling & Dispatch',
    desc: 'Smart calendar, route optimization & crew tracking',
    href: '/scheduling-and-dispatch',
    icon: CalendarCheck,
  },
  {
    label: 'Invoicing & Payments',
    desc: 'Instant estimates, invoice generation & online pay',
    href: '/invoicing-and-payments',
    icon: CreditCard,
  },
  {
    label: 'Customer CRM',
    desc: 'Complete client history, property notes & messages',
    href: '/customer-crm',
    icon: Users,
  },
  {
    label: 'Technician Mobile App',
    desc: 'Field crew app for iOS & Android with offline sync',
    href: '/technician-app',
    icon: Smartphone,
  },
  {
    label: 'Workflow Automations',
    desc: 'Automated SMS, follow-ups & appointment reminders',
    href: '/automations',
    icon: Zap,
  },
  {
    label: '24/7 AI Receptionist',
    desc: 'Autonomous voice agent answers calls & books jobs',
    href: '/#ai-receptionist',
    icon: Bot,
    badge: 'AI Powered',
  },
  {
    label: 'All Features Overview',
    desc: 'Explore the complete Fieseros capability stack',
    href: '/features',
    icon: Layers,
  },
];

// ─── Industries Catalog ──────────────────────────────────────────────────────
const industryList = [
  { label: 'Plumbing', href: '/plumbing-software' },
  { label: 'HVAC', href: '/hvac-software' },
  { label: 'Cleaning', href: '/cleaning-business-software' },
  { label: 'Electrical', href: '/electrical-contractor-software' },
  { label: 'Landscaping', href: '/landscaping-software' },
  { label: 'Lawn Care', href: '/lawn-care-software' },
  { label: 'Painting', href: '/painting-software' },
  { label: 'Handyman', href: '/handyman-software' },
  { label: 'Tree Care', href: '/tree-care-software' },
  { label: 'Snow Removal', href: '/snow-removal-software' },
  { label: 'Pest Control', href: '/pest-control-software' },
  { label: 'Roofing', href: '/roofing-software' },
  { label: 'Pool Service', href: '/pool-service-software' },
  { label: 'Window Cleaning', href: '/window-cleaning-software' },
  { label: 'Concrete', href: '/concrete-software' },
  { label: 'Garage Door', href: '/garage-door-software' },
  { label: 'Solar', href: '/solar-software' },
  { label: 'Pet Services', href: '/pet-services-software' },
];

const halfIndustry = Math.ceil(industryList.length / 2);
const industriesCol1 = industryList.slice(0, halfIndustry);
const industriesCol2 = industryList.slice(halfIndustry);

// ─── Services Catalog (Agency Solutions) ────────────────────────────────────
interface NavServiceItem {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
}

const serviceLinks: NavServiceItem[] = [
  {
    label: 'Contractor Website Development',
    desc: 'High-converting, lightning-fast sites built to generate leads',
    href: '/services/website-development',
    icon: Globe,
  },
  {
    label: 'Local SEO & Google Business Profile',
    desc: 'Rank #1 in Google Maps and local search for your trade',
    href: '/services/seo',
    icon: Search,
  },
  {
    label: 'Google Search & Local Ads',
    desc: 'High-intent lead generation campaigns tailored for contractors',
    href: '/services/google-ads',
    icon: Megaphone,
  },
  {
    label: 'All Growth Services',
    desc: 'Full digital marketing agency suite designed for trades',
    href: '/services',
    icon: Briefcase,
  },
];

// ─── Compare Catalog ────────────────────────────────────────────────────────
const compareList = [
  { label: 'Jobber Alternatives', desc: 'Modern features, zero per-seat fees', href: '/jobber-alternatives' },
  { label: 'Housecall Pro Alternatives', desc: 'Simpler dispatch & built-in AI', href: '/housecall-pro-alternatives' },
  { label: 'ServiceTitan Alternatives', desc: 'Enterprise power without $500/mo lock-in', href: '/servicetitan-alternatives' },
  { label: '2026 Best Software Guide', desc: 'Full side-by-side contractor software review', href: '/best-field-service-software' },
];

/**
 * Shared, mobile-responsive global navigation header for all SEO, cornerstone,
 * marketing, and standalone pages (excluding marketplace directory hub).
 */
export function CornerstoneHeader({ activePath }: { activePath?: string }) {
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
    }, 150);
  };

  const toggleMobileSection = (name: string) => {
    setMobileSection((prev) => (prev === name ? null : name));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Brand Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Fieseros
          </span>
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Dropdown 1: Products */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('products')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'products' ? null : 'products'))}
              aria-expanded={openDropdown === 'products'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                productLinks.some((p) => p.href === activePath)
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Products <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'products' && 'rotate-180')} />
            </button>

            {openDropdown === 'products' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[520px] rounded-2xl border border-border bg-background p-4 shadow-xl grid grid-cols-2 gap-2">
                  {productLinks.map((item) => {
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
                              <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
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
                  <div className="col-span-2 mt-1 pt-2 border-t border-border flex items-center justify-between text-xs px-2">
                    <span className="text-muted-foreground">Looking for industry-specific setups?</span>
                    <Link
                      href="/industries"
                      onClick={() => setOpenDropdown(null)}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Browse all trades <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 2: Industries (2-column mega-menu) */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('industries')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'industries' ? null : 'industries'))}
              aria-expanded={openDropdown === 'industries'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                industryList.some((i) => i.href === activePath)
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Industries <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'industries' && 'rotate-180')} />
            </button>

            {openDropdown === 'industries' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[420px] rounded-2xl border border-border bg-background p-4 shadow-xl">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <div>
                      {industriesCol1.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenDropdown(null)}
                          className={cn(
                            'block px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                            activePath === item.href
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                          )}
                        >
                          {item.label} Software
                        </Link>
                      ))}
                    </div>
                    <div>
                      {industriesCol2.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenDropdown(null)}
                          className={cn(
                            'block px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                            activePath === item.href
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                          )}
                        >
                          {item.label} Software
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between text-xs px-2">
                    <span className="text-muted-foreground">18+ specialized trade workflows</span>
                    <Link
                      href="/industries"
                      onClick={() => setOpenDropdown(null)}
                      className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      All industries →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 3: Services (Agency Solutions) */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('services')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'services' ? null : 'services'))}
              aria-expanded={openDropdown === 'services'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                serviceLinks.some((s) => s.href === activePath)
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Services <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'services' && 'rotate-180')} />
            </button>

            {openDropdown === 'services' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[380px] rounded-2xl border border-border bg-background p-3 shadow-xl space-y-1">
                  {serviceLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-start gap-3 p-2 rounded-xl transition-all',
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{item.label}</span>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
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
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                compareList.some((c) => c.href === activePath)
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Compare <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'compare' && 'rotate-180')} />
            </button>

            {openDropdown === 'compare' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[360px] rounded-2xl border border-border bg-background p-3 shadow-xl space-y-1">
                  {compareList.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpenDropdown(null)}
                      className={cn(
                        'block p-2.5 rounded-xl transition-all',
                        activePath === item.href
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'hover:bg-muted/70 text-foreground'
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground block">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Direct Navigation Links */}
          <Link
            href="/#pricing"
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activePath === '/#pricing'
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            Pricing
          </Link>

          <Link
            href="/invoice-generator"
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activePath === '/invoice-generator'
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            Free Tools
          </Link>

          <Link
            href="/blog"
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activePath === '/blog' || activePath?.startsWith('/blog/')
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            Blog
          </Link>

          <Link
            href="/contact-us"
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              activePath === '/contact-us'
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            Contact
          </Link>
        </nav>

        {/* ── Right Action CTAs ── */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>

          <Link
            href="/#signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-emerald-700/25"
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
          <div className="max-w-md mx-auto space-y-4">
            {/* Mobile Section 1: Products */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('products')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  <span>Products &amp; Features</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'products' && 'rotate-180')} />
              </button>
              {mobileSection === 'products' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  {productLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Section 2: Industries */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('industries')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <span>Industries (18 Trades)</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'industries' && 'rotate-180')} />
              </button>
              {mobileSection === 'industries' && (
                <div className="p-3 pt-0 border-t border-border/60 grid grid-cols-2 gap-1 bg-muted/20">
                  {industryList.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted truncate transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/industries"
                    onClick={() => setMobileMenuOpen(false)}
                    className="col-span-2 p-2 mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-t border-border"
                  >
                    View all industries →
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Section 3: Services */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('services')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  <span>Agency Growth Services</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'services' && 'rotate-180')} />
              </button>
              {mobileSection === 'services' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  {serviceLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="block font-semibold">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Section 4: Compare */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('compare')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  <span>Software Comparisons</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'compare' && 'rotate-180')} />
              </button>
              {mobileSection === 'compare' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-1 bg-muted/20">
                  {compareList.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="block font-semibold">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Mobile Links */}
            <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
              <Link
                href="/#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Pricing Plans</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
              <Link
                href="/invoice-generator"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Free Invoice Generator</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Contractor Resource Blog</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
              <Link
                href="/contact-us"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Contact &amp; Support</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            </div>

            {/* Mobile CTAs & App Store */}
            <div className="pt-2 space-y-2.5">
              <Link
                href="/#signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-800"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Sign In to Your Account
              </Link>

              <div className="pt-3 text-center">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Get the Mobile Field App</p>
                <div className="flex justify-center">
                  <GooglePlayBadge size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
