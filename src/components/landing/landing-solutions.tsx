'use client';

import * as React from 'react';
import { Wrench, ChevronDown, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Solutions link catalog ─────────────────────────────────────────────────
// Single source of truth for every marketing page. Shared by the navbar
// mega-menu, the mobile menu, and the footer so no page is ever orphaned.
// 19 industries + 5 features + 4 comparisons + 1 free tool = 29 indexable pages.
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
    { label: 'Scheduling & Dispatch', href: '/scheduling-and-dispatch' },
    { label: 'Invoicing & Payments', href: '/invoicing-and-payments' },
    { label: 'Customer CRM', href: '/customer-crm' },
    { label: 'Technician App', href: '/technician-app' },
    { label: 'Automations', href: '/automations' },
  ],
  compare: [
    { label: 'Jobber Alternatives', href: '/jobber-alternatives' },
    { label: 'Housecall Pro Alternatives', href: '/housecall-pro-alternatives' },
    { label: 'ServiceTitan Alternatives', href: '/servicetitan-alternatives' },
    { label: 'Best Field Service Software', href: '/best-field-service-software' },
  ],
  freeTools: [
    { label: 'Free Invoice Generator', href: '/invoice-generator' },
  ],
};

// Footer-only link groups (on-page anchors + external routes that don't belong
// in the "Solutions" marketing catalog).
export const footerLinks = {
  product: [
    { label: 'CRM Features', href: '#crm-features' },
    { label: 'AI Receptionist', href: '#ai-receptionist' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'For Providers', href: '#for-providers' },
  ],
  company: [
    { label: 'About', href: '/contact-us' },
    { label: 'Blog', href: '/contact-us' },
    { label: 'Careers', href: '/contact-us' },
    { label: 'Contact', href: '/contact-us' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Data Deletion', href: '/data-deletion' },
  ],
};

// ─── Solutions mega-menu (desktop navbar hover dropdown) ─────────────────────
// Self-contained trigger + panel. The panel is positioned absolutely relative
// to the trigger wrapper; the 120ms close delay bridges the pointer gap so the
// menu stays open while the cursor travels from trigger to panel.

export function SolutionsMegaMenu() {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
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
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        Solutions
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="w-[min(44rem,calc(100vw-2rem))] rounded-xl border bg-background shadow-xl overflow-hidden">
            <div className="grid grid-cols-12">
              {/* Industries — 6/12 cols, split into two sub-columns */}
              <div className="col-span-6 p-5 border-r">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Industries</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {solutionsLinks.industries.map((link) => (
                    <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-1 transition-colors">
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
              {/* Features + Free Tools — 3/12 cols */}
              <div className="col-span-3 p-5 border-r">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Features</h4>
                <ul className="space-y-0.5">
                  {solutionsLinks.features.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-1 transition-colors block">{link.label}</a>
                    </li>
                  ))}
                </ul>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-4">Free Tools</h4>
                <ul className="space-y-0.5">
                  {solutionsLinks.freeTools.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-1 transition-colors block">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Compare — 3/12 cols */}
              <div className="col-span-3 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Compare</h4>
                <ul className="space-y-0.5">
                  {solutionsLinks.compare.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-1 transition-colors block">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* CTA strip */}
            <div className="border-t bg-muted/30 px-5 py-2.5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Run your whole business — lead to invoice — in one place.</p>
              <a href="/marketplace" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">Browse Marketplace →</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Landing footer (mega-footer with all marketing page categories) ─────────

export function LandingFooter() {
  // Split industries into two sub-columns so the 19-link list isn't a tall wall.
  const half = Math.ceil(solutionsLinks.industries.length / 2);
  const industriesA = solutionsLinks.industries.slice(0, half);
  const industriesB = solutionsLinks.industries.slice(half);

  return (
    <footer className="bg-foreground text-background mt-auto pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          {/* Brand + nested Company & Legal (desktop) */}
          <div className="col-span-2 md:col-span-3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm bg-emerald-600 shadow-emerald-500/20">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-background tracking-tight">Fieseros</span>
            </div>
            <p className="text-background/70 text-sm max-w-xs leading-relaxed">
              The AI Operating System for Local Services. Run your business with the CRM. Find trusted pros on the marketplace. Automate everything.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="border-background/20 text-background/80">25 industries</Badge>
              <Badge variant="outline" className="border-background/20 text-background/80">9 verticals</Badge>
              <Badge variant="outline" className="border-background/20 text-background/80">150+ services</Badge>
            </div>
            {/* Company + Legal under the brand block on desktop */}
            <div className="hidden md:grid grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-background font-semibold text-xs mb-3 uppercase tracking-wide">Company</h4>
                <ul className="space-y-2">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-background font-semibold text-xs mb-3 uppercase tracking-wide">Legal</h4>
                <ul className="space-y-2">
                  {footerLinks.legal.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="col-span-2 md:col-span-2">
            <h4 className="text-background font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries — split into two sub-columns */}
          <div className="col-span-2 md:col-span-4">
            <h4 className="text-background font-semibold text-sm mb-4">Industries</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <ul className="space-y-2.5">
                {industriesA.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2.5">
                {industriesB.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Compare + Features + Free Tools (stacked) */}
          <div className="col-span-2 md:col-span-3">
            <h4 className="text-background font-semibold text-sm mb-4">Compare</h4>
            <ul className="space-y-2.5">
              {solutionsLinks.compare.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
            <h4 className="text-background font-semibold text-sm mb-4 mt-6">Features</h4>
            <ul className="space-y-2.5">
              {solutionsLinks.features.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
            <h4 className="text-background font-semibold text-sm mb-4 mt-6">Free Tools</h4>
            <ul className="space-y-2.5">
              {solutionsLinks.freeTools.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile-only Company + Legal (hidden on desktop where they sit under the brand) */}
        <div className="md:hidden grid grid-cols-2 gap-8 mt-8">
          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-background/10 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-background/50 text-xs">© {new Date().getFullYear()} Fieseros. All rights reserved.</p>
          <p className="text-background/50 text-xs">AI Operating System for Local Service Businesses</p>
        </div>
      </div>
    </footer>
  );
}
