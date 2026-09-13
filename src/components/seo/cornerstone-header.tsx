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
  Store,
  FileText,
  Sparkles,
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
    label: 'Free Invoice Generator',
    desc: 'Instant professional invoice creation tool',
    href: '/invoice-generator',
    icon: FileText,
    badge: 'Free Tool',
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
  { label: 'ServiceTitan Alternatives', desc: 'Enterprise power without lock-in', href: '/servicetitan-alternatives' },
  { label: '2026 Best Software Guide', desc: 'Full contractor software review', href: '/best-field-service-software' },
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
    }, 140);
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

        {/* ── Desktop Navigation (4 Streamlined Items) ── */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {/* Dropdown 1: Product */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('product')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'product' ? null : 'product'))}
              aria-expanded={openDropdown === 'product'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                productLinks.some((p) => p.href === activePath) || openDropdown === 'product'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              Product <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'product' && 'rotate-180')} />
            </button>

            {openDropdown === 'product' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[560px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-2 gap-2">
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
                  <div className="col-span-2 mt-1 pt-2 border-t border-border flex items-center justify-between text-xs px-2">
                    <span className="text-muted-foreground">Looking for industry setups?</span>
                    <Link
                      href="/field-service-software"
                      onClick={() => setOpenDropdown(null)}
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Explore trade workflows <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 2: Solutions (Industries + Services + Compare) */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'solutions' ? null : 'solutions'))}
              aria-expanded={openDropdown === 'solutions'}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                industryList.some((i) => i.href === activePath) || serviceLinks.some((s) => s.href === activePath) || openDropdown === 'solutions'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
              )}
            >
              Solutions <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', openDropdown === 'solutions' && 'rotate-180')} />
            </button>

            {openDropdown === 'solutions' && (
              <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-[620px] rounded-2xl border border-border/80 bg-background p-4 shadow-2xl grid grid-cols-12 gap-4">
                  {/* Industries (6/12 cols) */}
                  <div className="col-span-6 border-r border-border/60 pr-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Industries
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                        18+ Trades
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <div>
                        {industriesCol1.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded transition-colors truncate"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div>
                        {industriesCol2.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded transition-colors truncate"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Services & Compare (6/12 cols) */}
                  <div className="col-span-6 space-y-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                        Growth Services
                      </span>
                      <div className="space-y-1">
                        {serviceLinks.map((item) => {
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
                                <p className="text-[10.5px] text-muted-foreground line-clamp-1 leading-tight">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Compare
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {compareList.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="p-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded truncate block"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Item 3: Marketplace (First-Class Top Nav Link) */}
          <Link
            href="/marketplace"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              activePath === '/marketplace' || activePath?.startsWith('/marketplace/')
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
            )}
          >
            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Marketplace</span>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
              Pros
            </span>
          </Link>

          {/* Item 4: Pricing */}
          <Link
            href="/#pricing"
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              activePath === '/#pricing'
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
            )}
          >
            Pricing
          </Link>
        </nav>

        {/* ── Right Action CTAs ── */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>

          <Link
            href="/#signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20"
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
            {/* Mobile Section 1: Products */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('products')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  <span>Platform &amp; Features</span>
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

            {/* Mobile Section 2: Solutions */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileSection('solutions')}
                className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-foreground text-left"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <span>Solutions &amp; Trades</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'solutions' && 'rotate-180')} />
              </button>
              {mobileSection === 'solutions' && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-3 bg-muted/20">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 mb-1">
                      18+ Trades
                    </p>
                    <div className="grid grid-cols-2 gap-1">
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
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Growth Services
                    </p>
                    {serviceLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block p-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Mobile Links */}
            <div className="rounded-xl border border-border bg-card p-2 space-y-1">
              <Link
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  <span>Verified Pro Marketplace</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
                  Browse
                </span>
              </Link>
              <Link
                href="/#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Pricing Plans</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/invoice-generator"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Free Invoice Generator</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span>Contractor Resource Blog</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>

            {/* Mobile CTAs & App Store */}
            <div className="pt-2 space-y-2.5">
              <Link
                href="/#signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700"
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

              <div className="pt-2 text-center">
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
