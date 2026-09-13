'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  CalendarCheck,
  CreditCard,
  Users,
  Smartphone,
  Zap,
  Bot,
  FileText,
  Globe,
  Search,
  Megaphone,
  Scale,
  Briefcase,
  ArrowRight,
  Sparkles,
  Store,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { GooglePlayBadge } from '@/components/brand/google-play-badge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Solutions link catalog ─────────────────────────────────────────────────
// Single source of truth for every marketing page. Shared by the navbar
// mega-menus, mobile menu, and footers.

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function externalProps(href: string): { target?: string; rel?: string } {
  return isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

export const solutionsLinks = {
  industries: [
    { label: 'Field Service Software', href: '/field-service-software' },
    { label: 'Plumbing Software', href: '/plumbing-software' },
    { label: 'HVAC Software', href: '/hvac-software' },
    { label: 'Cleaning Business Software', href: '/cleaning-business-software' },
    { label: 'Electrical Contractor Software', href: '/electrical-contractor-software' },
    { label: 'Landscaping Software', href: '/landscaping-software' },
    { label: 'Lawn Care Software', href: '/lawn-care-software' },
    { label: 'Painting Software', href: '/painting-software' },
    { label: 'Handyman Software', href: '/handyman-software' },
    { label: 'Tree Care Software', href: '/tree-care-software' },
    { label: 'Snow Removal Software', href: '/snow-removal-software' },
    { label: 'Pest Control Software', href: '/pest-control-software' },
    { label: 'Roofing Software', href: '/roofing-software' },
    { label: 'Pool Service Software', href: '/pool-service-software' },
    { label: 'Window Cleaning Software', href: '/window-cleaning-software' },
    { label: 'Concrete Software', href: '/concrete-software' },
    { label: 'Garage Door Software', href: '/garage-door-software' },
    { label: 'Solar Software', href: '/solar-software' },
    { label: 'Pet Services Software', href: '/pet-services-software' },
  ],
  features: [
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
      label: 'Download Mobile App',
      desc: 'Get the Android app on Google Play',
      href: 'https://play.google.com/store/apps/details?id=com.fieseros.app',
      icon: Smartphone,
    },
  ],
  aiAndTools: [
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
  ],
  services: [
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
  ],
  compare: [
    { label: 'Jobber Alternatives', desc: 'Modern features, zero per-seat fees', href: '/jobber-alternatives' },
    { label: 'Housecall Pro Alternatives', desc: 'Simpler dispatch & built-in AI', href: '/housecall-pro-alternatives' },
    { label: 'ServiceTitan Alternatives', desc: 'Enterprise power without lock-in', href: '/servicetitan-alternatives' },
    { label: 'Best Field Service Software', desc: 'Full 2026 contractor software review', href: '/best-field-service-software' },
  ],
  marketplace: [
    { label: 'Browse Verified Pros', desc: 'Search top-rated local trade contractors', href: '/marketplace', icon: Store },
    { label: 'List Your Business', desc: 'Create a free listing & get discovered', href: '/?auth=register', icon: Sparkles },
    { label: 'Claim Existing Profile', desc: 'Take ownership of your business page', href: '/marketplace', icon: ShieldCheck },
  ],
  freeTools: [
    { label: 'Free Invoice Generator', href: '/invoice-generator' },
  ],
};

// Footer link groups
export const footerLinks = {
  product: [
    { label: 'CRM Overview', href: '/#crm-features' },
    { label: 'Scheduling & Dispatch', href: '/scheduling-and-dispatch' },
    { label: 'Invoicing & Payments', href: '/invoicing-and-payments' },
    { label: 'Customer CRM', href: '/customer-crm' },
    { label: 'Technician Mobile App', href: '/technician-app' },
    { label: 'Workflow Automations', href: '/automations' },
    { label: 'AI Receptionist', href: '/#ai-receptionist' },
    { label: 'Pricing Plans', href: '/#pricing' },
  ],
  marketplace: [
    { label: 'Browse Local Directory', href: '/marketplace' },
    { label: 'Find Verified Contractors', href: '/marketplace' },
    { label: 'List Your Business (Free)', href: '/?auth=register' },
    { label: 'Claim Business Profile', href: '/marketplace' },
    { label: 'Top Trade Categories', href: '/marketplace' },
  ],
  company: [
    { label: 'About Us', href: '/contact-us' },
    { label: 'Contractor Blog', href: '/blog' },
    { label: 'Notification Setup', href: '/docs/notifications-setup' },
    { label: 'Contact Support', href: '/contact-us' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Data Deletion Request', href: '/data-deletion' },
  ],
};

// ─── Product Mega-Menu (Desktop Navbar Hover Dropdown) ───────────────────────

export function ProductMegaMenu({ onAnchorClick }: { onAnchorClick?: (href: string, e?: React.MouseEvent) => void }) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, []);
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-1 text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg',
          open
            ? 'text-foreground bg-muted/70'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        )}
      >
        Product
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="w-[580px] rounded-2xl border border-border/80 bg-background shadow-2xl overflow-hidden">
            <div className="p-4 grid grid-cols-12 gap-3">
              {/* Left Column: Core CRM Features */}
              <div className="col-span-7 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2.5 mb-1.5">
                  Core Platform
                </p>
                {solutionsLinks.features.slice(0, 5).map((item) => {
                  const Icon = item.icon;
                  const isAnchor = item.href.startsWith('/#');
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        setOpen(false);
                        if (isAnchor && onAnchorClick) onAnchorClick(item.href.replace('/', ''), e);
                      }}
                      className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted/70 transition-colors group"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block truncate">
                          {item.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Right Column: AI & Free Tools */}
              <div className="col-span-5 flex flex-col justify-between border-l border-border/60 pl-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1 mb-1.5">
                    AI &amp; Tools
                  </p>
                  {solutionsLinks.aiAndTools.map((item) => {
                    const Icon = item.icon;
                    const isAnchor = item.href.startsWith('/#');
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(e) => {
                          setOpen(false);
                          if (isAnchor && onAnchorClick) onAnchorClick(item.href.replace('/', ''), e);
                        }}
                        className="block p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-emerald-500/30 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.label}
                            </span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 uppercase tracking-tight">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-muted-foreground leading-tight">
                          {item.desc}
                        </p>
                      </a>
                    );
                  })}
                </div>

                {/* Mobile app pill card */}
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-center">
                  <p className="text-[10.5px] font-medium text-emerald-900 dark:text-emerald-200 mb-1.5">
                    Field app for crews
                  </p>
                  <div className="flex justify-center">
                    <GooglePlayBadge size="sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Strip */}
            <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Looking for software by industry?</span>
              <a
                href="/field-service-software"
                onClick={() => setOpen(false)}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                Browse all trades <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Solutions Mega-Menu (Desktop Navbar Hover Dropdown) ─────────────────────

export function SolutionsMegaMenu() {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, []);
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-1 text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg',
          open
            ? 'text-foreground bg-muted/70'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        )}
      >
        Solutions
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="w-[min(58rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-background shadow-2xl overflow-hidden">
            <div className="grid grid-cols-12">
              {/* Industries — 5/12 cols, split into two sub-columns */}
              <div className="col-span-5 p-5 border-r border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Industries Served
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                    18+ Trades
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {solutionsLinks.industries.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-1 transition-colors truncate block"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Growth Services — 4/12 cols */}
              <div className="col-span-4 p-5 border-r border-border/60">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Agency Growth Services
                </h4>
                <div className="space-y-1.5">
                  {solutionsLinks.services.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/60 transition-colors group"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block truncate">
                            {link.label}
                          </span>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-tight">
                            {link.desc}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Compare — 3/12 cols */}
              <div className="col-span-3 p-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Compare
                  </h4>
                  <ul className="space-y-1">
                    {solutionsLinks.compare.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="block p-1.5 rounded-lg hover:bg-muted/60 transition-colors group"
                        >
                          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors block">
                            {link.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 block truncate">
                            {link.desc}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Free Tools mini link */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <a
                    href="/invoice-generator"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between text-xs text-muted-foreground hover:text-emerald-600 font-medium group"
                  >
                    <span>Free Invoice Tool</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom CTA Strip */}
            <div className="border-t border-border/60 bg-muted/30 px-5 py-2.5 flex items-center justify-between text-xs">
              <p className="text-muted-foreground">Need verified local service pros or want to list your business?</p>
              <a
                href="/marketplace"
                onClick={() => setOpen(false)}
                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 whitespace-nowrap"
              >
                Browse Marketplace <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Landing Footer (Mega-Footer with Dedicated Marketplace Column) ─────────

export function LandingFooter() {
  const half = Math.ceil(solutionsLinks.industries.length / 2);
  const industriesA = solutionsLinks.industries.slice(0, half);
  const industriesB = solutionsLinks.industries.slice(half);

  return (
    <footer className="bg-foreground text-background mt-auto pb-[env(safe-area-inset-bottom,0px)] border-t border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        {/* Top 6-column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          {/* Brand Column (3/12 cols) */}
          <div className="col-span-2 md:col-span-3">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark size={32} className="shadow-black/20" />
              <span className="text-xl font-bold text-background tracking-tight">Fieseros</span>
            </div>
            <p className="text-background/70 text-sm max-w-xs leading-relaxed">
              The AI Operating System for Local Services. Run your business with the CRM. Find trusted pros on the marketplace. Automate everything.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="border-background/20 text-background/80 text-[11px]">25 industries</Badge>
              <Badge variant="outline" className="border-background/20 text-background/80 text-[11px]">Verified Pros</Badge>
              <Badge variant="outline" className="border-background/20 text-background/80 text-[11px]">24/7 AI Voice</Badge>
            </div>
            {/* Google Play Download */}
            <div className="mt-5">
              <p className="text-background/60 text-xs mb-2 font-medium">
                For technicians &amp; customers
              </p>
              <GooglePlayBadge size="sm" />
            </div>
            {/* Company + Legal on Desktop under brand */}
            <div className="hidden md:grid grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-background font-semibold text-xs mb-3 uppercase tracking-wide">Company</h4>
                <ul className="space-y-2">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-background font-semibold text-xs mb-3 uppercase tracking-wide">Legal</h4>
                <ul className="space-y-2">
                  {footerLinks.legal.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Product Column (2/12 cols) */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="text-background font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketplace Column (2/12 cols) — DEDICATED FIRST-CLASS COLUMN */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-1.5 mb-4">
              <h4 className="text-background font-semibold text-sm">Marketplace</h4>
              <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Directory
              </span>
            </div>
            <ul className="space-y-2.5">
              {footerLinks.marketplace.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>

            <h4 className="text-background font-semibold text-sm mb-3 mt-6">Services</h4>
            <ul className="space-y-2">
              {solutionsLinks.services.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors truncate block">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries Column (3/12 cols) — Split in 2 sub-columns */}
          <div className="col-span-2 md:col-span-3">
            <h4 className="text-background font-semibold text-sm mb-4">Industries Served</h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
              <ul className="space-y-2">
                {industriesA.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors truncate block">{link.label}</a>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2">
                {industriesB.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors truncate block">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Compare & Free Tools (2/12 cols) */}
          <div className="col-span-2 md:col-span-2">
            <h4 className="text-background font-semibold text-sm mb-4">Compare</h4>
            <ul className="space-y-2.5">
              {solutionsLinks.compare.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
            <h4 className="text-background font-semibold text-sm mb-3 mt-6">Free Tools</h4>
            <ul className="space-y-2">
              {solutionsLinks.freeTools.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile-only Company + Legal */}
        <div className="md:hidden grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-background/10">
          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-xs hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-background/10 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/50">
          <p>© {new Date().getFullYear()} Fieseros. All rights reserved.</p>
          <p>AI Operating System for Local Service Businesses &amp; Verified Pro Marketplace</p>
        </div>
      </div>
    </footer>
  );
}
