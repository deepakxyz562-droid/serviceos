import Link from "next/link";
import { Twitter, Linkedin, Github, ShieldCheck, Mail, MapPin, Calculator, Sparkles, FileText, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { GooglePlayBadge } from "@/components/brand/google-play-badge";

/**
 * Shared rich footer for all SEO cornerstone, marketing, and public pages.
 * Includes comprehensive internal linking mesh between cornerstone pages for SEO,
 * brand trust signals, Google Play badge, and compliance links.
 * Server component — zero client JS.
 */
export function CornerstoneFooter() {
  const aiFormLinks = [
    { href: "/ai-employee", label: "24/7 AI Voice Receptionist" },
    { href: "/chatbot", label: "AI Chatbot Builder" },
    { href: "/gptform", label: "GPTForm™ AI Platform" },
    { href: "/ai-agent", label: "24/7 AI Employee & Agent" },
    { href: "/templates", label: "20,000+ Form Templates" },
    { href: "/templates/quote", label: "Quote Calculators & Math" },
  ];

  const productLinks = [
    { href: "/features", label: "Features Hub" },
    { href: "/field-service-software", label: "Field Service Software" },
    { href: "/scheduling-and-dispatch", label: "Scheduling & Dispatch" },
    { href: "/invoicing-and-payments", label: "Invoicing & Payments" },
    { href: "/customer-crm", label: "Customer CRM" },
    { href: "/technician-app", label: "Technician App" },
    { href: "/automations", label: "Automations" },
    { href: "/pricing", label: "Pricing Plans" },
  ];

  const useCaseLinks = [
    { href: "/use-cases", label: "All Use Cases" },
    { href: "/use-cases/lead-capture", label: "AI Lead Capture" },
    { href: "/use-cases/appointment-booking", label: "Appointment Booking" },
    { href: "/use-cases/quote-generation", label: "Quote Generation" },
    { href: "/use-cases/payment-collection", label: "Payment Collection" },
    { href: "/use-cases/review-collection", label: "Review Collection" },
    { href: "/use-cases/lead-nurturing", label: "Lead Nurturing" },
    { href: "/use-cases/customer-support", label: "AI Customer Support" },
    { href: "/use-cases/job-dispatch", label: "Job Dispatch" },
  ];

  const platformIntegrationLinks = [
    { href: "/platform", label: "All Platforms" },
    { href: "/platform/wordpress", label: "WordPress" },
    { href: "/platform/shopify", label: "Shopify" },
    { href: "/platform/wix", label: "Wix" },
    { href: "/platform/webflow", label: "Webflow" },
    { href: "/platform/squarespace", label: "Squarespace" },
    { href: "/platform/html", label: "Custom HTML" },
    { href: "/integrations", label: "All Integrations" },
    { href: "/integrations/google-calendar", label: "Google Calendar" },
    { href: "/integrations/stripe", label: "Stripe Payments" },
    { href: "/integrations/zapier", label: "Zapier" },
    { href: "/integrations/quickbooks", label: "QuickBooks" },
  ];

  const marketplaceLinks = [
    { href: "/marketplace", label: "Browse Pro Directory" },
    { href: "/marketplace", label: "Find Verified Contractors" },
    { href: "/?auth=register", label: "List Your Business (Free)" },
    { href: "/marketplace", label: "Claim Business Listing" },
    { href: "/marketplace", label: "Top Service Categories" },
  ];

  const freeToolsLinks = [
    { href: "/invoice-generator", label: "Free Invoice Generator" },
    { href: "/estimate-generator", label: "Free Estimate Generator" },
    { href: "/proposal-generator", label: "Free Proposal Generator" },
    { href: "/contract-drafting-generator", label: "Free Contract Generator" },
    { href: "/job-cost-calculator", label: "Free Job Cost Calculator" },
    { href: "/material-cost-estimator", label: "Free Material Cost Estimator" },
    { href: "/home-maintenance-planner", label: "Home Maintenance Planner" },
    { href: "/renovation-roi-calculator", label: "Renovation ROI Calculator" },
    { href: "/free-home-value-enhancer", label: "Home Value Enhancer" },
    { href: "/tools", label: "Browse All Free Tools →" },
  ];

  const servicesLinks = [
    { href: "/services/website-development", label: "Website Development" },
    { href: "/services/seo", label: "SEO & Local Search" },
    { href: "/services/google-ads", label: "Google Ads" },
    { href: "/services", label: "All Trade Services" },
  ];

  const industryLinks = [
    { href: "/plumbing-software", label: "Plumbing Software" },
    { href: "/hvac-software", label: "HVAC Software" },
    { href: "/cleaning-business-software", label: "Cleaning Business Software" },
    { href: "/electrical-contractor-software", label: "Electrical Contractor Software" },
    { href: "/landscaping-software", label: "Landscaping Software" },
    { href: "/lawn-care-software", label: "Lawn Care Software" },
    { href: "/painting-software", label: "Painting Software" },
    { href: "/handyman-software", label: "Handyman Software" },
    { href: "/tree-care-software", label: "Tree Care Software" },
    { href: "/snow-removal-software", label: "Snow Removal Software" },
    { href: "/pest-control-software", label: "Pest Control Software" },
    { href: "/roofing-software", label: "Roofing Software" },
    { href: "/pool-service-software", label: "Pool Service Software" },
    { href: "/window-cleaning-software", label: "Window Cleaning Software" },
    { href: "/concrete-software", label: "Concrete Software" },
    { href: "/garage-door-software", label: "Garage Door Software" },
    { href: "/solar-software", label: "Solar Software" },
    { href: "/pet-services-software", label: "Pet Services Software" },
  ];

  const compareLinks = [
    { href: "/jobber-alternatives", label: "Jobber Alternatives" },
    { href: "/housecall-pro-alternatives", label: "Housecall Pro Alternatives" },
    { href: "/servicetitan-alternatives", label: "ServiceTitan Alternatives" },
    { href: "/best-field-service-software", label: "Best Field Service Software" },
    { href: "/fieseros-vs-jotform", label: "Fieseros vs Jotform" },
    { href: "/fieseros-vs-typeform", label: "Fieseros vs Typeform" },
    { href: "/fieseros-vs-chatbase", label: "Fieseros vs Chatbase" },
    { href: "/fieseros-vs-tidio", label: "Fieseros vs Tidio" },
    { href: "/ai-chatbot-alternatives", label: "AI Chatbot Alternatives" },
    { href: "/conversational-forms-alternatives", label: "Conversational Forms Alternatives" },
  ];

  const companyLinks = [
    { href: "/about", label: "About Fieseros" },
    { href: "/careers", label: "Careers" },
    { href: "/partners", label: "Partners" },
    { href: "/press", label: "Press & Media" },
    { href: "/why-fieseros", label: "Why Fieseros" },
    { href: "/contact-us", label: "Contact Us" },
  ];

  const resourcesLinks = [
    { href: "/resources", label: "Resources Hub" },
    { href: "/case-studies", label: "Case Studies" },
    { href: "/blog", label: "Contractor Blog" },
    { href: "/docs/notifications-setup", label: "Notification Setup Guide" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/cookie-policy", label: "Cookie Policy" },
    { href: "/data-deletion", label: "Data Deletion Request" },
  ];

  return (
    <footer className="mt-auto border-t border-border/80 bg-muted/40 text-foreground">
      {/* ── Top Brand & Value Proposition Strip ── */}
      <div className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Link href="/" className="flex items-center gap-2.5 group">
                <BrandMark size={36} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
                <span className="text-xl font-extrabold tracking-tight text-foreground">
                  Fieseros
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An all-in-one software platform and local marketplace designed to help field service companies and trade businesses run their operations, build websites, and find customers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="size-3.5" /> 100% Direct Payouts (0% Commission)
              </span>
              <div className="flex items-center">
                <GooglePlayBadge size="sm" />
              </div>
              <a
                href="mailto:support@fieseros.com"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                <Mail className="h-3.5 w-3.5 text-emerald-600" />
                <span>support@fieseros.com</span>
              </a>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Wilmington, DE, USA</span>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <a
                  href="https://twitter.com/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="Twitter / X"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com/company/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI & Smart Forms Spotlight Strip ── */}
      <div className="border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-blue-500/10 dark:from-emerald-950/30 dark:via-purple-950/30 dark:to-blue-950/30 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 shadow-2xs uppercase tracking-wide">
                <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" /> AI Suite
              </span>
              <span className="text-xs font-bold text-foreground">
                Autonomous AI Voice, Multichannel Agents &amp; Formula Calculation Forms
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/ai-employee"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                24/7 AI Voice Receptionist
              </Link>
              <Link
                href="/chatbot"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                AI Chatbot Builder
              </Link>
              <Link
                href="/gptform"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                GPTForm™ AI Platform
              </Link>
              <Link
                href="/ai-agent"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                24/7 AI Employee &amp; Agent
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                20,000+ Templates
              </Link>
              <Link
                href="/templates/quote"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                Quote Calculators →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Free Tools Spotlight Strip ── */}
      <div className="border-b border-border/60 bg-emerald-50/30 dark:bg-emerald-950/20 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                <Calculator className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Free Tools
              </span>
              <span className="text-xs font-bold text-foreground">
                100% Free Contractor Generators &amp; Estimators (No Sign Up Needed)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/invoice-generator"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/50 transition-colors shadow-2xs"
              >
                <FileText className="size-3 text-emerald-600" /> Free Invoice Generator
              </Link>
              <Link
                href="/estimate-generator"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/50 transition-colors shadow-2xs"
              >
                Free Estimate Generator
              </Link>
              <Link
                href="/proposal-generator"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/50 transition-colors shadow-2xs"
              >
                Free Proposal Generator
              </Link>
              <Link
                href="/job-cost-calculator"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/50 transition-colors shadow-2xs"
              >
                Job Cost Calculator
              </Link>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-2xs"
              >
                All 9 Free Tools <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Links Columns ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {/* Column 1: AI & Smart Forms (NEW) */}
          <div>
            <div className="flex items-center gap-1.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                AI &amp; Smart Forms
              </h3>
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded-full uppercase">
                Core
              </span>
            </div>
            <ul className="space-y-2 text-xs">
              {aiFormLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Product (Field Service OS) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Field Service OS
            </h3>
            <ul className="space-y-2 text-xs">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Use Cases (NEW) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Use Cases
            </h3>
            <ul className="space-y-2 text-xs">
              {useCaseLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform & Integrations (NEW) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Platform &amp; Integrations
            </h3>
            <ul className="space-y-2 text-xs">
              {platformIntegrationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Free Tools */}
          <div>
            <div className="flex items-center gap-1.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Free Tools
              </h3>
              <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full uppercase">
                Free
              </span>
            </div>
            <ul className="space-y-2 text-xs">
              {freeToolsLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`transition-colors block ${
                      link.href === '/tools'
                        ? 'font-bold text-emerald-600 dark:text-emerald-400 hover:underline'
                        : 'text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Marketplace + Services */}
          <div>
            <div className="flex items-center gap-1.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Marketplace
              </h3>
              <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded-full uppercase">
                Directory
              </span>
            </div>
            <ul className="space-y-2 text-xs">
              {marketplaceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 mt-5">
              Services
            </h4>
            <ul className="space-y-2 text-xs">
              {servicesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 6: Compare + Company + Resources */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Compare
            </h3>
            <ul className="space-y-2 text-xs">
              {compareLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 mt-4">
              Company
            </h4>
            <ul className="space-y-2 text-xs">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 mt-4">
              Resources
            </h4>
            <ul className="space-y-2 text-xs">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Industries full-width row ── */}
        <div className="mt-10 pt-8 border-t border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
            Industries Served
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
            {industryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom Sub-footer ── */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} Fieseros, Inc. All rights reserved.</span>
          </div>
          <p className="text-center sm:text-right">
            The Operating System for Trade &amp; Field Service Businesses &amp; Verified Pro Marketplace.
          </p>
        </div>
      </div>
    </footer>
  );
}
